import type { RedmineHttpRequest, RequestLogEntry } from "../src/shared/api/desktop";

let enabled = false;
let sequence = 0;
let forward: ((entry: RequestLogEntry) => void) | undefined;
const secretFields = new Set(["key", "apikey", "xredmineapikey", "authorization", "password", "secret", "token", "accesstoken", "refreshtoken"]);
const hidden = "[REDACTED]";

export function configureRequestLogging(options: { enabled: boolean; forward?: (entry: RequestLogEntry) => void }): void {
  enabled = options.enabled;
  forward = options.forward;
}

function secretField(name: string): boolean {
  return name.split(/[\[\].]+/).some((part) => secretFields.has(part.replace(/[^a-z0-9]/gi, "").toLowerCase()));
}

function collectSecrets(value: unknown, secrets: Set<string>, sensitive = false): void {
  if (typeof value === "string" && sensitive && value) secrets.add(value);
  else if (Array.isArray(value)) value.forEach((item) => collectSecrets(item, secrets, sensitive));
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) collectSecrets(item, secrets, sensitive || secretField(key));
  }
}

function redact(value: unknown, secrets: Set<string>): unknown {
  if (typeof value === "string") {
    const variants = [...secrets].flatMap((secret) => [secret, encodeURIComponent(secret), encodeURIComponent(secret).replace(/%20/g, "+")]);
    return [...new Set(variants)].filter(Boolean).sort((a, b) => b.length - a.length).reduce((text, secret) => text.split(secret).join(hidden), value);
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, secrets));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, secretField(key) ? hidden : redact(item, secrets)]));
  }
  return value;
}

function bodyValue(text: string, secrets: Set<string>): unknown {
  try {
    const value: unknown = JSON.parse(text);
    collectSecrets(value, secrets);
    return redact(value, secrets);
  } catch { return redact(text, secrets); }
}

function write(entry: RequestLogEntry): void {
  const method = entry.phase === "error" ? "error" : entry.phase === "response" && !entry.ok ? "warn" : "info";
  // Logging must never change the result of a network operation.
  try { console[method](`[Redmine] ${JSON.stringify(entry)}`); } catch { /* Console unavailable. */ }
  try { forward?.(entry); } catch { /* The renderer may be reloading or closing. */ }
}

export function beginRequestLog(input: RedmineHttpRequest, target: URL): (result: { status?: number; text?: string; error?: unknown }) => void {
  if (!enabled) return () => {};
  const id = ++sequence;
  const started = performance.now();
  const secrets = new Set([input.apiKey]);
  const safeUrl = new URL(target);
  for (const name of [...safeUrl.searchParams.keys()]) {
    if (secretField(name)) {
      collectSecrets(safeUrl.searchParams.getAll(name), secrets, true);
      safeUrl.searchParams.set(name, hidden);
    }
  }
  const body = input.body === undefined ? undefined : bodyValue(input.body, secrets);
  const url = redact(safeUrl.toString(), secrets) as string;
  const query = Object.fromEntries([...new Set(safeUrl.searchParams.keys())].map((name) => {
    const values = safeUrl.searchParams.getAll(name);
    return [name, values.length === 1 ? values[0] : values];
  }));
  write({
    id, time: new Date().toISOString(), phase: "request", method: input.method, url,
    query: redact(query, secrets) as Record<string, unknown>,
    ...(input.body === undefined ? {} : { body }),
  });
  let finished = false;
  return (result) => {
    if (finished) return;
    finished = true;
    const common = { id, time: new Date().toISOString(), method: input.method, url, durationMs: Math.round(performance.now() - started), status: result.status };
    if (result.error !== undefined) {
      const error = result.error;
      const details = error instanceof Error
        ? { name: error.name, message: error.message, ...(typeof (error as NodeJS.ErrnoException).code === "string" ? { code: (error as NodeJS.ErrnoException).code } : {}) }
        : { name: "Error", message: String(error) };
      write({ ...common, phase: "error", ok: false, error: redact(details, secrets) as RequestLogEntry["error"] });
    } else {
      const ok = result.status !== undefined && result.status >= 200 && result.status < 300;
      write({ ...common, phase: "response", ok, ...(!ok && result.text ? { responseBody: bodyValue(result.text, secrets) } : {}) });
    }
  };
}
