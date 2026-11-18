import { desktopApi, desktopValue, type HttpResponse, type RedmineCertificate } from "./desktop";
export type { HttpResponse } from "./desktop";

/** All Redmine traffic is sent by the Electron main process. */
export async function redmineRequest(method: string, url: URL, settings: { redmineUrl: string; apiKey: string; certificate?: RedmineCertificate | null }, body?: string): Promise<HttpResponse> {
  const target = new URL(url);
  if (target.origin !== new URL(settings.redmineUrl).origin) throw new Error("Запрос должен быть направлен на настроенный Redmine");
  return desktopValue(await desktopApi().request({ method, url: target.toString(), redmineUrl: settings.redmineUrl, apiKey: settings.apiKey, certificatePem: settings.certificate?.pem, body }));
}
