export type HttpResponse = { status: number; text: string };
export type RedmineCertificate = { name: string; pem: string };
export const MAX_CERTIFICATE_BYTES = 1024 * 1024;
export type RedmineHttpRequest = {
  method: string;
  url: string;
  redmineUrl: string;
  apiKey: string;
  certificatePem?: string;
  body?: string;
};
export type RequestLogEntry = {
  id: number;
  time: string;
  phase: "request" | "response" | "error";
  method: string;
  url: string;
  query?: Record<string, unknown>;
  body?: unknown;
  status?: number;
  durationMs?: number;
  ok?: boolean;
  responseBody?: unknown;
  error?: { name: string; message: string; code?: string };
};
export type NotificationMessage = { title: string; body: string; tag: string; url?: string; issueId?: number; comment?: string };
export type DesktopNotification = {
  id: string;
  title: string;
  message: string;
  comment?: string;
  issueId?: number;
  issueUrl?: string;
};
export type DesktopNotificationState = { notifications: DesktopNotification[]; position: "bottom-right" };
export type PushNotificationsApi = {
  list: () => Promise<DesktopNotificationState>;
  close: (id: string) => Promise<void>;
  open: (id: string) => Promise<void>;
  setInteractive: (interactive: boolean) => Promise<void>;
  onChanged: (listener: (state: DesktopNotificationState) => void) => () => void;
};
export type DesktopResult<T> = { ok: true; value: T } | { ok: false; error: string };
export const desktopChannels = {
  request: "redmine:request",
  chooseCertificate: "redmine:choose-certificate",
  requestLog: "redmine:request-log",
  notify: "desktop:notify",
  pushList: "push:list",
  pushClose: "push:close",
  pushOpen: "push:open",
  pushInteractive: "push:interactive",
  pushChanged: "push:changed",
} as const;

export type DesktopApi = {
  request: (request: RedmineHttpRequest) => Promise<DesktopResult<HttpResponse>>;
  chooseCertificate: () => Promise<DesktopResult<RedmineCertificate | null>>;
  notify: (message: NotificationMessage) => Promise<DesktopResult<void>>;
};

declare global {
  interface Window { redmineDesktop?: DesktopApi; redminePush?: PushNotificationsApi }
}

export function desktopApi(): DesktopApi {
  if (!window.redmineDesktop) throw new Error("Запустите приложение через Electron: npm run dev");
  return window.redmineDesktop;
}

export function desktopValue<T>(result: DesktopResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

export function pushNotificationsApi(): PushNotificationsApi {
  if (!window.redminePush) throw new Error("Окно PUSH-уведомлений недоступно");
  return window.redminePush;
}
