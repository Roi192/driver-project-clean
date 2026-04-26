// Service Worker for Push Notifications + basic PWA support
const CACHE_NAME = "bvt-driving-v2";
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
];

// Install
self.addEventListener("install", (event) => {
  console.log("Push Service Worker installed");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn("Failed to cache app shell:", err);
      });
    })
  );

  self.skipWaiting();
});

// Activate
self.addEventListener("activate", (event) => {
  console.log("Push Service Worker activated");

  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        )
      ),
    ])
  );
});

// Fetch
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // רק GET
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // לא מתערבים בקריאות של תוספים / כרום פנימי
  if (!url.protocol.startsWith("http")) return;

  // Supabase / API - עדיף רשת קודם
  if (url.hostname.includes("supabase.co")) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // ניווטי דפים - network first, fallback ל-cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;

          // fallback לדף הבית
          const home = await caches.match("/");
          return home || Response.error();
        })
    );
    return;
  }

  // שאר הקבצים - cache first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request)
        .then((response) => {
          // שומרים רק תגובות תקינות
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });

          return response;
        })
        .catch(() => {
          // fallback לתמונות/אייקונים אם צריך
          if (request.destination === "image") {
            return caches.match("/pwa-192x192.png");
          }
          return Response.error();
        });
    })
  );
});

// Push notifications
self.addEventListener("push", (event) => {
  console.log("Push notification received:", event);

  let data = {
    title: "התראה",
    body: "יש לך עדכון חדש",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    vibrate: [200, 100, 200],
    tag: "default-notification",
    renotify: true,
    requireInteraction: true,
    dir: "rtl",
    lang: "he",
    data: { url: "/" },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: data.vibrate || [200, 100, 200],
      tag: data.tag,
      renotify: data.renotify !== false,
      requireInteraction: data.requireInteraction !== false,
      dir: data.dir || "rtl",
      lang: data.lang || "he",
      data: data.data || { url: "/" },
    })
  );
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);
  event.notification.close();

  const targetUrl = event.notification?.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          try {
            client.navigate(targetUrl);
          } catch (e) {
            console.warn("Navigation failed:", e);
          }
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});