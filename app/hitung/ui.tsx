"use client";

import type { ReactNode, Ref } from "react";
import { LuClipboardList, LuHouse } from "react-icons/lu";
import { BackMark, backControlClass } from "@/app/back-icon";

export function BackButton({ onClick, light = false, className = "" }: { onClick: () => void; light?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${backControlClass} ${light ? "text-white/80" : "text-ksa-teal-deep"} ${className}`}
    >
      <BackMark />
    </button>
  );
}

export function Phone({
  tone = "cream",
  children,
  rootRef,
}: {
  tone?: "cream" | "ink" | "sync";
  children: ReactNode;
  rootRef?: Ref<HTMLDivElement>;
}) {
  const bg =
    tone === "ink"
      ? "bg-ksa-ink text-white"
      : tone === "sync"
        ? "bg-[#f7f1e3] text-[#1c1c1c]"
        : "bg-ksa-cream text-[#1c1c1c]";
  return (
    <div ref={rootRef} className={`min-h-dvh w-full ${bg}`}>
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
  const chip = dark
    ? "border border-ksa-sage bg-ksa-sage text-ksa-teal-deep"
    : "border border-ksa-teal bg-transparent text-ksa-teal-deep";
  const dataLabel = pending > 0 ? `Data ${pending}` : "Data";
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <button type="button" className="flex min-w-0 items-center gap-2 text-left" onClick={onHome} aria-label="Beranda">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${chip}`}>
          <LuHouse size={20} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className={`block text-[11px] leading-4 ${dark ? "text-white/60" : "text-[#8a8a8a]"}`}>Beranda</span>
          <span className="block truncate text-sm font-medium">{name}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onSync}
        className={`flex h-11 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-medium ${chip}`}
        aria-label={pending > 0 ? `${pending} data belum terkirim` : "Data hitung"}
      >
        <LuClipboardList size={18} aria-hidden />
        <span>{dataLabel}</span>
      </button>
    </header>
  );
}

export function PrimaryButton({
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
      className="w-full rounded-full bg-ksa-teal py-3.5 text-center text-base font-medium text-white disabled:opacity-40"
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

export function TextLink({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button type="button" className={`text-sm text-ksa-teal-deep ${className}`} onClick={onClick}>
      {children}
    </button>
  );
}

export function ActionColumn({ children }: { children: ReactNode }) {
  return <div className="mt-auto flex flex-col gap-3 pt-6">{children}</div>;
}

export function WaitNote({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 text-center ${compact ? "py-6" : "flex-1"}`}>
      <span
        className={`animate-spin rounded-full border-[#e7dfd2] border-t-ksa-teal ${compact ? "h-10 w-10 border-2" : "h-12 w-12 border-[3px]"}`}
        aria-hidden
      />
      <p className="text-sm">Tunggu yaa rekan-rekan KSA</p>
    </div>
  );
}

export function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/45 p-5 sm:items-center">
      <div className="w-full max-w-[340px] rounded-[28px] bg-[#f3eee4] p-5 text-[#1c1c1c] shadow-lg">{children}</div>
    </div>
  );
}
