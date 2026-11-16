export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";
type NotificationMessage = { title: string; body: string; tag: string; url?: string };
let registration: Promise<ServiceWorkerRegistration> | undefined;
const worker = () => registration ??= navigator.serviceWorker.register(
  `${import.meta.env.BASE_URL}notifications-sw.js`, { scope: import.meta.env.BASE_URL },
).then(() => navigator.serviceWorker.ready);

export function notificationPermission(): NotificationPermissionState {
  return !window.isSecureContext || !("Notification" in window) ? "unsupported" : Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (notificationPermission() === "unsupported") return "unsupported";
  return Notification.permission === "default" ? Notification.requestPermission() : Notification.permission;
}

export async function showNotification(message: NotificationMessage): Promise<void> {
  if (notificationPermission() !== "granted") throw new Error("Браузерные уведомления не разрешены");
  const options: NotificationOptions = { body: message.body, tag: message.tag,
    icon: new URL(`${import.meta.env.BASE_URL}redmine-reborn.png`, location.href).href, data: { url: message.url } };
  if ("serviceWorker" in navigator) await (await worker()).showNotification(message.title, options);
  else {
    const notification = new Notification(message.title, options);
    notification.onclick = () => {
      if (message.url && ["https:", "http:"].includes(new URL(message.url).protocol)) window.open(message.url, "_blank", "noopener,noreferrer");
      else window.focus();
      notification.close();
    };
  }
}

export async function testNotification(): Promise<void> {
  if (await requestNotificationPermission() !== "granted") throw new Error("Разрешите уведомления в настройках браузера для этого сайта");
  await showNotification({ title: "Redmine Reborn", body: "Браузерные уведомления включены", tag: "test" });
}
