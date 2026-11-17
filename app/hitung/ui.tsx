"use client";

import type { ReactNode } from "react";

export function Phone({
  tone = "cream",
  children,
}: {
  tone?: "cream" | "ink" | "sync";
  children: ReactNode;
}) {
  const bg =
    tone === "ink"
      ? "bg-ksa-ink text-white"
      : tone === "sync"
        ? "bg-[#f7f1e3] text-[#1c1c1c]"
        : "bg-ksa-cream text-[#1c1c1c]";
  return (
    <div className={`min-h-dvh w-full ${bg}`}>
      <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col px-5 pb-8 pt-6">{children}</main>
    </div>
  );
}

export function TopBar({
  name,
  pending,
  onSync,
  onHome,
  dark = false,
}: {
  name: string;
  pending: number;
  onSync: () => void;
  onHome?: () => void;
  dark?: boolean;
}) {
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <button type="button" className="flex min-w-0 items-center gap-2 text-left" onClick={onHome}>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${dark ? "bg-white/15" : "bg-white"}`}
        >
          ⌂
        </span>
        <span className="truncate font-medium">{name}</span>
      </button>
      <button
        type="button"
        onClick={onSync}
        className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${
          pending > 0
            ? "bg-ksa-amber text-[#1c1c1c]"
            : dark
              ? "bg-white/15 text-white"
              : "bg-ksa-sage text-ksa-teal-deep"
        }`}
        aria-label={pending > 0 ? `${pending} belum terkirim` : "Semua terkirim"}
      >
        {pending > 0 ? pending : "✓"}
      </button>
    </header>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  tone = "teal",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "teal" | "light";
}) {
  const colors = tone === "light" ? "bg-white text-ksa-teal-deep" : "bg-ksa-teal text-white";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-full py-3.5 text-center text-base font-medium disabled:opacity-40 ${colors}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-full border border-ksa-teal py-3.5 text-center text-base font-medium text-ksa-teal-deep disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/45 p-5 sm:items-center">
      <div className="w-full max-w-[340px] rounded-[28px] bg-[#f3eee4] p-5 text-[#1c1c1c] shadow-lg">{children}</div>
    </div>
  );
}
