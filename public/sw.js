self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || data.alert || "",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    vibrate: [100, 50, 100],
    data: { url: data.url || "/admin" },
    actions: [
      { action: "open", title: "Ver agora" },
      { action: "close", title: "Fechar" }
    ],
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "SimulaPool",
      options
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/admin";

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
