// Service Worker for Push Notifications + PWA caching
// Military fleet management application - planag binyamin
const CACHE_NAME = "bvt-driving-v3";
const APP_SHELL = [
  "/manifest.json",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
];

// Install - cache static assets only
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL).catch((err) => console.warn("Cache failed:", err))
    )
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)))
      ),
    ])
  );
});

// Fetch - cache only static assets (images, icons, fonts)
// Navigation and API requests always go to network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!url.protocol.startsWith("http")) return;

  // API and navigation requests: network only, no caching
  if (
    url.hostname.includes("supabase.co") ||
    request.mode === "navigate"
  ) {
    return; // let browser handle normally
  }

  // Static assets (images, icons, fonts): cache first
  const isStaticAsset =
    request.destination === "image" ||
    request.destination === "font" ||
    url.pathname.startsWith("/pwa-") ||
    url.pathname.startsWith("/apple-") ||
    url.pathname === "/favicon.ico";

  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        })
    )
  );
});

// Push notification received from server
self.addEventListener("push", (event) => {
  let payload = {
    title: "התראה חדשה",
    body: "יש לך עדכון",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: "app-notification",
    dir: "rtl",
    lang: "he",
    data: { url: "/" },
  };

  if (event.data) {
    try {
      Object.assign(payload, event.data.json());
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      dir: payload.dir,
      lang: payload.lang,
      data: payload.data,
      requireInteraction: false,
      renotify: false,
    })
  );
});

// Notification click - open the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(self.location.origin));
        if (existing) return existing.focus();
        return self.clients.openWindow(targetUrl);
      })
  );
});
