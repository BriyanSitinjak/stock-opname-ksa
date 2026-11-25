"use client";

import { useEffect, useState } from "react";

type Note = { id: number; text: string };

export function toast(text: string, set?: (value: string) => void) {
  set?.(text);
  if (!text || typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent("ksa-toast", { detail: text }));
}

export function ToastHost() {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    function onToast(event: Event) {
      const text = (event as CustomEvent<string>).detail;
      if (!text) {
        return;
      }
      const id = Date.now() + Math.random();
      setNotes((current) => [...current, { id, text }]);
      const hold = text.length > 60 ? 5200 : 3200;
      window.setTimeout(() => {
        setNotes((current) => current.filter((note) => note.id !== id));
      }, hold);
    }
    window.addEventListener("ksa-toast", onToast);
    return () => window.removeEventListener("ksa-toast", onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-2">
        {notes.map((note) => (
          <p key={note.id} className="rounded-full bg-ksa-ink px-4 py-2 text-center text-sm text-white shadow-lg">
            {note.text}
          </p>
        ))}
      </div>
    </div>
  );
}
