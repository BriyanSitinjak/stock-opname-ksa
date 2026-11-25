"use client";

import Image from "next/image";
import type { ReactNode, Ref } from "react";
import { LuClipboardList, LuHouse } from "react-icons/lu";
import { BackMark, backControlClass } from "@/app/back-icon";
import type { UnknownRow } from "@/lib/offline/queue";

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

export function PassAckNote({ pass }: { pass: number }) {
  const copy =
    pass === 1
      ? {
          title: "Hitung ke-1",
          body: "Satu lorong satu nomor tag. Setelah selesai, petugas Hitung ke-2 akan cek ulang.",
        }
      : pass === 2
        ? {
            title: "Hitung ke-2",
            body: "Tandai Sesuai atau Tidak Sesuai. Data petugas 1 tetap tersimpan.",
          }
        : null;
  if (!copy) {
    return null;
  }
  return (
    <p className="mt-3 border-l-2 border-ksa-amber/80 pl-3 text-sm leading-5 text-white/65">
      <span className="font-semibold text-white/90">{copy.title}. </span>
      {copy.body}
    </p>
  );
}

/** Struck Hitung ke-1 value kept visible after Sesuai / revisi / ubah nomor tag. */
export function StruckText({ children }: { children: ReactNode }) {
  return <span className="text-white/45 line-through decoration-white/50">{children}</span>;
}

export function QtyRow({
  tone = "cream",
  label,
  detail,
  qty,
  onEdit,
}: {
  tone?: "cream" | "ink";
  label: string;
  detail?: string | null;
  qty: string;
  onEdit?: () => void;
}) {
  const item =
    tone === "ink"
      ? "flex items-center justify-between gap-3 rounded-xl bg-ksa-panel px-3 py-2"
      : "flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3";
  return (
    <li className={item}>
      <span className="min-w-0">
        <span className={`block text-sm leading-5 ${tone === "ink" ? "text-white" : ""}`}>{label}</span>
        {detail ? (
          <span className={`text-xs ${tone === "ink" ? "text-white/50" : "text-[#8a8a8a]"}`}>{detail}</span>
        ) : null}
      </span>
      <span className="flex items-center gap-3">
        <span className="text-xl font-semibold">{qty}</span>
        {onEdit ? (
          <button type="button" className="text-sm text-ksa-amber" onClick={onEdit}>
            ubah
          </button>
        ) : null}
      </span>
    </li>
  );
}

export function UnknownRowsList({
  rows,
  tone = "cream",
  emptyLabel = "Belum ada barang tidak dikenal.",
  onEdit,
}: {
  rows: UnknownRow[];
  tone?: "cream" | "ink";
  emptyLabel?: string;
  onEdit?: (row: UnknownRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <ul className="mt-2 flex flex-col gap-2">
        <li className={tone === "ink" ? "text-sm text-white/50" : "rounded-2xl bg-white px-4 py-3 text-sm text-[#6b6b6b]"}>
          {emptyLabel}
        </li>
      </ul>
    );
  }
  return (
    <ul className={`${tone === "ink" ? "" : "mt-2"} flex flex-col gap-2`}>
      {rows.map((row) => (
        <QtyRow
          key={row.client_row_id}
          tone={tone}
          label={row.nama_input || "Tanpa nama"}
          detail={row.kode_input ? `Kode ${row.kode_input}` : null}
          qty={row.qty}
          onEdit={onEdit ? () => onEdit(row) : undefined}
        />
      ))}
    </ul>
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

/** Full-screen blocker while Kirim Sekarang syncs and builds the Excel backup. */
export function SyncBusyOverlay({ label, percent }: { label: string; percent: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-5" role="alertdialog" aria-busy="true">
      <div className="w-full max-w-[320px] rounded-[28px] bg-[#f3eee4] p-6 text-center text-[#1c1c1c] shadow-lg">
        <span
          className="mx-auto block h-12 w-12 animate-spin rounded-full border-[3px] border-[#e7dfd2] border-t-ksa-teal"
          aria-hidden
        />
        <p className="mt-4 text-lg font-semibold">{label}</p>
        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-ksa-teal transition-[width] duration-300" style={{ width: `${clamped}%` }} />
        </div>
        <p className="mt-2 text-sm text-[#6b6b6b]">{clamped}%</p>
        <p className="mt-3 text-xs text-[#8a8a8a]">Jangan tutup atau keluar dari layar ini.</p>
      </div>
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

export function ConfirmOverlay({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Overlay>
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-2 text-sm text-[#5c5c5c]">{body}</p>
      <div className="mt-5 flex gap-3">
        <GhostButton onClick={onCancel}>Batal</GhostButton>
        <PrimaryButton onClick={onConfirm}>{confirmLabel}</PrimaryButton>
      </div>
    </Overlay>
  );
}

export function UnknownItemOverlay({
  nama,
  qty,
  onNama,
  onQty,
  onSave,
  onCancel,
}: {
  nama: string;
  qty: string;
  onNama: (value: string) => void;
  onQty: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <Overlay>
      <p className="text-lg font-semibold">Barang tidak dikenal</p>
      <label className="mt-4 block text-sm">
        Nama
        <input
          className="mt-1 w-full rounded-2xl bg-white px-4 py-3 uppercase"
          autoCapitalize="characters"
          value={nama}
          onChange={(e) => onNama(e.target.value.toUpperCase())}
        />
      </label>
      <label className="mt-3 block text-sm">
        Jumlah
        <input
          className="mt-1 w-full rounded-2xl bg-white px-4 py-3"
          inputMode="decimal"
          value={qty}
          onChange={(e) => onQty(e.target.value)}
        />
      </label>
      <div className="mt-5 flex flex-col gap-3">
        <PrimaryButton onClick={onSave}>Simpan</PrimaryButton>
        <TextLink onClick={onCancel}>Batal</TextLink>
      </div>
    </Overlay>
  );
}

const CREDIT_SRC = "/brand/briyan-sitinjak.webp";

function CreditPortrait({
  size,
  alt = "",
  className,
  priority = false,
}: {
  size: number;
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  return <Image src={CREDIT_SRC} alt={alt} width={size} height={size} className={className} priority={priority} />;
}

/** Warm the credit portrait so Tentang does not wait on first paint. */
export function PrefetchDeveloperCredit() {
  return (
    <CreditPortrait
      size={1}
      priority
      className="pointer-events-none absolute h-px w-px opacity-0"
    />
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
      <CreditPortrait size={28} alt="BS" className="rounded-md" />
    </button>
  );
}

export function DeveloperCreditDialog({ onClose }: { onClose: () => void }) {
  return (
    <Overlay>
      <div className="flex flex-col items-center text-center">
        <CreditPortrait size={64} className="rounded-xl" />
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
  tone = "cream",
  autoFocus = true,
}: {
  value: string;
  onChange: (value: string) => void;
  tone?: "cream" | "ink";
  autoFocus?: boolean;
}) {
  const field =
    tone === "ink"
      ? "mt-1 w-full rounded-2xl bg-ksa-panel px-4 py-3 text-white outline-none"
      : "mt-6 w-full rounded-2xl bg-white px-4 py-4 text-center text-2xl font-semibold tracking-wide shadow-sm outline-none";
  return (
    <input
      className={field}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="done"
      autoFocus={autoFocus}
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
      placeholder="—"
      aria-label="Nomor tag"
    />
  );
}
