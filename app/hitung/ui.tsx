"use client";

import Image from "next/image";
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
    <div ref={rootRef} className={`flex min-h-dvh w-full flex-1 flex-col ${bg}`}>
      <main className="mx-auto flex w-full max-w-[390px] flex-1 flex-col overflow-x-hidden px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
        {children}
      </main>
    </div>
  );
}

export function TopBar({
  name,
  pending,
  onSync,
  onHome,
  dark = false,
  locked = false,
}: {
  name: string;
  pending: number;
  onSync: () => void;
  onHome?: () => void;
  dark?: boolean;
  locked?: boolean;
}) {
  const chip = dark
    ? "border border-ksa-sage bg-ksa-sage text-ksa-teal-deep"
    : "border border-ksa-teal bg-transparent text-ksa-teal-deep";
  const dataLabel = pending > 0 ? `Data ${pending}` : "Data";
  if (locked) {
    return (
      <header className="mb-5">
        <p className={`text-[11px] leading-4 ${dark ? "text-white/60" : "text-[#8a8a8a]"}`}>Petugas</p>
        <p className="truncate text-sm font-medium">{name}</p>
      </header>
    );
  }
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

export function PassBadge({ pass }: { pass: number }) {
  const tone =
    pass === 1
      ? "border-2 border-solid border-[#1c1c1c] bg-white text-[#1c1c1c]"
      : pass === 2
        ? "border-2 border-dashed border-ksa-teal-deep bg-ksa-sage text-ksa-teal-deep"
        : "border-2 border-[#1c1c1c] bg-[#f3d4a0] text-[#6a5210]";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
      Hitung ke-{pass}
    </span>
  );
}

export function AisleMeta({
  nomor,
  lokasi,
  pass,
  tone = "cream",
}: {
  nomor: string;
  lokasi?: string;
  pass?: number;
  tone?: "cream" | "ink";
}) {
  const title = tone === "ink" ? "text-xl font-bold leading-tight text-white" : "text-lg font-semibold";
  const sub = tone === "ink" ? "text-base font-semibold text-white/80" : "text-xs text-[#8a8a8a]";
  return (
    <div className="min-w-0">
      <p className={title}>Lorong {nomor}</p>
      {lokasi || pass != null ? (
        <div className={`mt-1 flex flex-wrap items-center gap-2 ${sub}`}>
          {lokasi ? <span>{lokasi}</span> : null}
          {pass != null ? <PassBadge pass={pass} /> : null}
        </div>
      ) : null}
    </div>
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

export function MessageOverlay({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <Overlay>
      <p className="text-sm font-medium">{message}</p>
      <TextLink className="mt-4" onClick={onClose}>
        Tutup
      </TextLink>
    </Overlay>
  );
}

export function DeveloperCredit({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      className="mt-auto flex items-center justify-center gap-2 pt-10 text-xs text-[#8a8a8a]"
      onClick={onOpen}
    >
      <span>developed by</span>
      <Image src="/brand/briyan-sitinjak.webp" alt="BS" width={28} height={28} className="rounded-md" />
    </button>
  );
}

export function DeveloperCreditDialog({ onClose }: { onClose: () => void }) {
  return (
    <Overlay>
      <div className="flex flex-col items-center text-center">
        <Image src="/brand/briyan-sitinjak.webp" alt="" width={64} height={64} className="rounded-xl" />
        <p className="mt-4 text-lg font-semibold">Briyan Sitinjak</p>
        <TextLink className="mt-4" onClick={onClose}>
          Tutup
        </TextLink>
      </div>
    </Overlay>
  );
}

export function PaperNumberField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className="mt-6 w-full rounded-2xl bg-white px-4 py-4 text-center text-2xl font-semibold tracking-widest shadow-sm outline-none"
      inputMode="numeric"
      enterKeyHint="done"
      autoFocus
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="—"
      aria-label="Nomor kertas"
    />
  );
}
