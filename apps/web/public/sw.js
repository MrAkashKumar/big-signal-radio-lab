const CACHE =
  "bigsignal-experience-" +
  new URL(self.location.href).searchParams.get("build");
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const root = new URL("./", self.location.href).href;
      const response = await fetch(root, { cache: "reload" });
      if (!response.ok) throw new Error("Cannot cache application");
      const html = await response.clone().text();
      const assets = [
        ...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g),
      ].map((match) => new URL(match[1], root).href);
      const cache = await caches.open(CACHE);
      await cache.addAll(assets);
      await cache.put(root, response);
    })(),
  );
});
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).pathname.startsWith("/api/") ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (event.request.mode === "navigate") {
        try {
          return await fetch(event.request);
        } catch {
          return (
            (await cache.match(new URL("./", self.location.href).href)) ||
            Response.error()
          );
        }
      }
      return (
        (await cache.match(event.request, { ignoreVary: true })) ||
        fetch(event.request)
      );
    })(),
  );
});
