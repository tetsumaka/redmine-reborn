import { net } from "electron";
import { request as httpsRequest, Agent } from "node:https";
import { getCACertificates } from "node:tls";
import type { HttpResponse, RedmineHttpRequest } from "../src/shared/api/desktop";
import { beginRequestLog } from "./request-log";
import { certificatePem } from "./certificates";

// Separate TLS session pools for each uploaded trust configuration. Keep only the latest idle pool.
let customTrust: { pem: string; agent: Agent; active: number } | undefined;
function trustPool(pem: string) {
  if (customTrust?.pem === pem) return customTrust;
  const normalized = certificatePem(pem);
  if (customTrust && customTrust.active === 0) customTrust.agent.destroy();
  customTrust = {
    pem,
    active: 0,
    agent: new Agent({
      keepAlive: true,
      ca: [...new Set([...getCACertificates("default"), ...getCACertificates("system"), normalized])],
      rejectUnauthorized: true,
      allowPartialTrustChain: true,
    }),
  };
  return customTrust;
}

async function requestWithCertificate(input: RedmineHttpRequest, target: URL, headers: Record<string, string>): Promise<HttpResponse> {
  const pool = trustPool(input.certificatePem!);
  pool.active++;
  const signal = AbortSignal.timeout(30_000);
  try {
    return await new Promise<HttpResponse>((resolve, reject) => {
      const request = httpsRequest(target, { method: input.method, headers, agent: pool.agent, signal }, (response) => {
        response.on("error", reject);
        // Do not follow redirects with the API key, even within the same origin.
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
          response.resume();
          reject(new Error("Redmine returned a redirect"));
          return;
        }
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => resolve({ status: response.statusCode!, text: Buffer.concat(chunks).toString("utf8") }));
      });
      request.on("error", reject);
      request.end(input.body);
    });
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    throw error;
  } finally {
    pool.active--;
    if (pool !== customTrust && pool.active === 0) pool.agent.destroy();
  }
}

function validateRequest(value: unknown): { input: RedmineHttpRequest; target: URL } {
  if (!value || typeof value !== "object") throw new Error("Некорректный запрос к Redmine");
  const input = value as RedmineHttpRequest;
  if (!["GET", "POST", "PUT", "DELETE"].includes(input.method) || typeof input.url !== "string"
    || typeof input.redmineUrl !== "string" || typeof input.apiKey !== "string" || !input.apiKey.trim()
    || (input.certificatePem !== undefined && typeof input.certificatePem !== "string")
    || (input.body !== undefined && typeof input.body !== "string") || (input.method === "GET" && input.body !== undefined)) {
    throw new Error("Некорректные параметры запроса к Redmine");
  }
  let base: URL;
  let target: URL;
  try { base = new URL(input.redmineUrl); target = new URL(input.url); }
  catch { throw new Error("Некорректный адрес Redmine"); }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
  const basePath = `${base.pathname.replace(/\/+$/, "")}/`;
  if ((base.protocol !== "https:" && !(base.protocol === "http:" && loopback))
    || base.username || base.password || base.search || base.hash || target.username || target.password || target.hash
    || target.origin !== base.origin || !target.pathname.startsWith(basePath)) {
    throw new Error("Запрос должен быть направлен на настроенный Redmine по HTTPS");
  }
  // Credentials belong in the API header, never in the URL or browser navigation.
  target.searchParams.delete("key");
  return { input, target };
}

export async function requestRedmine(value: unknown): Promise<HttpResponse> {
  const { input, target } = validateRequest(value);
  const completeLog = beginRequestLog(input, target);
  let status: number | undefined;
  try {
    const headers = {
      "X-Redmine-API-Key": input.apiKey,
      Accept: "application/json",
      ...(input.body === undefined ? {} : { "Content-Type": "application/json" }),
    };
    if (input.certificatePem !== undefined && target.protocol === "https:") {
      const result = await requestWithCertificate(input, target, headers);
      status = result.status;
      completeLog(result);
      return result;
    }
    // Electron's main-process network stack exposes HTTP responses without renderer CORS checks.
    const response = await net.fetch(target.toString(), {
      method: input.method,
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
      headers,
      ...(input.body === undefined ? {} : { body: input.body }),
    });
    status = response.status;
    const text = await response.text();
    completeLog({ status, text });
    return { status, text };
  } catch (error) {
    completeLog({ status, error });
    if (error instanceof Error && error.name === "TimeoutError") throw new Error("Тайм-аут соединения с Redmine");
    // Native errors can contain URLs; return only a controlled message and never retry writes.
    throw new Error(`Не удалось выполнить ${input.method} в Redmine. Проверьте сеть/VPN и сертификат в настройках подключения к Redmine. Перед повтором изменения записей загрузите день из Redmine: сервер мог выполнить операцию.`);
  }
}
