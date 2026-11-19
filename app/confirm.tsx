"use client";

import { useEffect, useState } from "react";

type Ask = {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "teal" | "danger";
  resolve: (ok: boolean) => void;
};

const EVENT = "ksa-confirm";

export function confirm(input: { title: string; message: string; confirmLabel: string; tone?: "teal" | "danger" }) {
  return new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    const detail: Ask = { tone: "teal", ...input, resolve };
    window.dispatchEvent(new CustomEvent<Ask>(EVENT, { detail }));
  });
}

export function ConfirmHost() {
  const [ask, setAsk] = useState<Ask | null>(null);

  useEffect(() => {
    function onAsk(event: Event) {
      setAsk((event as CustomEvent<Ask>).detail);
    }
    window.addEventListener(EVENT, onAsk);
    return () => window.removeEventListener(EVENT, onAsk);
  }, []);

  useEffect(() => {
    if (!ask) {
      return;
    }
    const current = ask;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        current.resolve(false);
        setAsk(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ask]);

  function close(ok: boolean) {
    ask?.resolve(ok);
    setAsk(null);
  }

  if (!ask) {
    return null;
  }

  const confirmClass =
    ask.tone === "danger"
      ? "rounded-full bg-red-800 px-5 py-2.5 text-sm font-medium text-white"
      : "rounded-full bg-ksa-teal px-5 py-2.5 text-sm font-medium text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => close(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-lg font-semibold">
          {ask.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6b6b6b]">{ask.message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-full border border-[#e7dfd2] px-5 py-2.5 text-sm" onClick={() => close(false)}>
            Batal
          </button>
          <button type="button" className={confirmClass} onClick={() => close(true)}>
            {ask.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
