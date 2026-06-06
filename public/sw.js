// Service Worker: handles Web Push notifications for Habit Tracker

self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Habit Tracker';
  const options = {
    body: data.body || '',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'habit-reminder',
    renotify: true,
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const targetUrl = event.notification.data?.url || '/';
      for (const client of clientList) {
        if (client.url.includes(targetUrl.replace('/', '')) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
