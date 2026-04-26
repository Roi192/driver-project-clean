const SERVICE_WORKER_PATH = "/sw-push.js";
const UPDATE_RELOAD_STORAGE_KEY = "serviceWorkerUpdateReloadedAt";

const shouldReloadForUpdate = () => {
  try {
    const lastReload = Number(sessionStorage.getItem(UPDATE_RELOAD_STORAGE_KEY) || 0);
    return Date.now() - lastReload > 30_000;
  } catch {
    return true;
  }
};

const markReloadForUpdate = () => {
  try {
    sessionStorage.setItem(UPDATE_RELOAD_STORAGE_KEY, String(Date.now()));
  } catch {
    // Ignore storage failures; the update still applies on next navigation.
  }
};

export const registerAppServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) return null;

  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
    updateViaCache: "none",
  });

  registration.update().catch(() => {});

  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }

  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    if (!worker) return;

    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) {
        worker.postMessage({ type: "SKIP_WAITING" });
      }
    });
  });

  return registration;
};

export const listenForServiceWorkerUpdates = () => {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!shouldReloadForUpdate()) return;
    markReloadForUpdate();
    window.location.reload();
  });
};

export const getAppServiceWorkerRegistration = async () => {
  if (!("serviceWorker" in navigator)) return null;

  const registration =
    (await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH)) ||
    (await navigator.serviceWorker.getRegistration("/"));

  if (registration) {
    registration.update().catch(() => {});
  }

  return registration;
};