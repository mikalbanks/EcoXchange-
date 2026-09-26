// Retire the service worker installed by the previous EcoXchange website.
// A returning visitor's browser fetches this script during its normal update
// check, then discards the old offline pages and returns to the live site.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) await client.navigate(client.url);
  })());
});
