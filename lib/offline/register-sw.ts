"use client";

import { useEffect } from "react";
import { canActivateWorker } from "@/lib/offline/sw-gate";
import { pendingCount } from "@/lib/offline/queue";

export async function registerStockOpnameWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  sessionStorage.removeItem("sw-reloading");
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  registration.addEventListener("updatefound", () => {
    const incoming = registration.installing;
    incoming?.addEventListener("statechange", () => {
      if (incoming.state === "installed") {
        void maybeActivate(registration);
      }
    });
  });
  void maybeActivate(registration);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (sessionStorage.getItem("sw-reloading") === "1") {
      return;
    }
    sessionStorage.setItem("sw-reloading", "1");
    window.location.reload();
  });
}

export async function maybeActivate(registration?: ServiceWorkerRegistration | null): Promise<void> {
  const reg = registration ?? (await navigator.serviceWorker.getRegistration());
  const waiting = reg?.waiting;
  if (!waiting) {
    return;
  }
  const pending = await pendingCount();
  if (!canActivateWorker(pending)) {
    return;
  }
  waiting.postMessage({ type: "SKIP_WAITING" });
}

export function SwRegister() {
  useEffect(() => {
    void registerStockOpnameWorker();
  }, []);
  return null;
}
