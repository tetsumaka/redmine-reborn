// Notification click handling only. No polling, API response caching, or push backend.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = event.notification.data?.url;
    if (target) {
      const url = new URL(target);
      if (url.protocol === "https:" || url.protocol === "http:") await self.clients.openWindow(url.href);
      return;
    }
    const windows = await self.clients.matchAll({ type: "window" });
    const app = windows.find((client) => client.url.startsWith(self.registration.scope));
    if (app) await app.focus();
    else await self.clients.openWindow(self.registration.scope);
  })());
});
