export type HttpResponse = { status: number; text: string };

/** No cookies or custom auth headers: compatible with the existing Redmine CORS policy. */
export async function redmineRequest(method: string, url: URL, settings: { redmineUrl: string; apiKey: string }, body?: string): Promise<HttpResponse> {
    const target = new URL(url);
    if (target.origin !== new URL(settings.redmineUrl).origin) throw new Error("Запрос должен быть направлен на настроенный Redmine");
    target.searchParams.set("key", settings.apiKey);
    try {
      const response = await fetch(target, {
        method,
        mode: "cors",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
        ...(body === undefined ? {} : { body, headers: { "Content-Type": "application/json" } }),
      });
      return { status: response.status, text: await response.text() };
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") throw new Error("Тайм-аут соединения с Redmine");
      // Never log fetch's URL: it contains the API key. Never retry a write automatically.
      throw new Error(`Не удалось выполнить ${method} в Redmine. Проверьте сеть/VPN, сертификат, разрешение локальной сети и CORS для метода ${method}. Если это отправка времени, перед повтором загрузите день из Redmine: сервер мог принять запись.`);
    }
}
