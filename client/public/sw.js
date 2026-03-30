const CACHE_NAME = "bimi-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: "Bimì", body: event.data.text() };
  }

  const title = data.title || "Bimì — Promemoria";
  const options = {
    body: data.body || "Hai un promemoria!",
    icon: "/favicon.png",
    badge: "/favicon.png",
    tag: data.tag || "bimi-reminder",
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: [500, 200, 500, 200, 500],
    data: {
      url: data.url || "/promemoria",
      reminderId: data.reminderId,
    },
    actions: [
      { action: "snooze", title: "⏰ Ricordamelo fra 5 min" },
      { action: "done", title: "✅ OK, fatto!" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "snooze") {
    const reminderId = event.notification.data?.reminderId;
    if (reminderId) {
      event.waitUntil(
        fetch("/api/reminders/" + reminderId + "/snooze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }).catch(() => {})
      );
    }
    return;
  }

  if (event.action === "done") {
    const reminderId = event.notification.data?.reminderId;
    if (reminderId) {
      event.waitUntil(
        fetch("/api/reminders/" + reminderId, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: true }),
        }).catch(() => {})
      );
    }
    return;
  }

  const url = event.notification.data?.url || "/promemoria";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
