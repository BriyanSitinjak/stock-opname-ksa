const CACHE = "stock-opname-shell-v1";
const SHELL = ["/", "/hitung", "/manifest.webmanifest", "/brand/icon-192.png", "/brand/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => undefined),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "SKIP_WAITING") {
    return;
  }
  event.waitUntil(
    queuedRows().then((pending) => {
      if (pending === 0) {
        return self.skipWaiting();
      }
      return undefined;
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    return;
  }
  const isDevHost = self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";
  if (isDevHost && url.pathname.startsWith("/_next/")) {
    return;
  }
  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    if (request.mode === "navigate") {
      const hitung = await cache.match("/hitung");
      if (hitung) {
        return hitung;
      }
    }
    throw new Error("offline");
  }
}

function countStore(db, name) {
  if (!db.objectStoreNames.contains(name)) {
    return Promise.resolve(0);
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, "readonly");
    const req = tx.objectStore(name).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function queuedRows() {
  return new Promise((resolve) => {
    const open = indexedDB.open("stock-opname-queue");
    open.onerror = () => resolve(0);
    open.onsuccess = () => {
      const db = open.result;
      Promise.all([countStore(db, "counts"), countStore(db, "submissions"), countStore(db, "unknowns")])
        .then((parts) => resolve(parts.reduce((sum, n) => sum + n, 0)))
        .catch(() => resolve(0))
        .finally(() => db.close());
    };
  });
}
