"use client";

import { useState } from "react";
import { confirm } from "@/app/confirm";
import { EmptyState } from "@/app/empty-state";
import { fetchJson } from "@/app/siap/api";
import { scrollListClass } from "@/app/siap/report-table";
import { TealButton } from "@/app/siap/ui";
import { toast } from "@/app/toast";

type Device = {
  device_id: string;
  nama: string;
  last_sync_at: string | null;
  pending_reported: number;
  stale: boolean;
  age: string;
};

export function PetugasList({ id, devices }: { id: string; devices: Device[] }) {
  const [rows, setRows] = useState(devices);

  async function release(row: Device) {
    const ok = await confirm({
      title: "Lepas device?",
      message: `HP ${row.nama} akan dilepas. Nama yang sama bisa dipilih lagi di HP lain.`,
      confirmLabel: "Lepas device",
      tone: "danger",
    });
    if (!ok) {
      return;
    }
    const { ok: released, data } = await fetchJson<{ error?: string }>(`/api/sessions/${id}/devices/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: row.device_id }),
    });
    if (!released) {
      toast(data.error ?? "Gagal melepas device.");
      return;
    }
    setRows((current) => current.filter((item) => item.device_id !== row.device_id));
    toast("Device dilepas. Petugas bisa di-bind ke HP lain.");
  }

  if (rows.length === 0) {
    return <EmptyState menu="petugas" />;
  }

  return (
    <ul className={`mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${scrollListClass}`}>
      {rows.map((row) => (
        <li
          key={row.device_id}
          className={`flex h-full flex-col justify-between gap-4 rounded-2xl p-5 shadow-sm ${row.stale ? "bg-[#f3d4a0]" : "bg-white"}`}
        >
          <div className="space-y-2">
            <p className="text-lg font-semibold leading-snug">{row.nama}</p>
            <p className="text-sm leading-snug break-all text-[#1c1c1c]">Device {row.device_id}</p>
          </div>
          <div className="space-y-2">
            <p className={`text-sm leading-snug font-semibold ${row.stale ? "" : "text-[#1c1c1c]"}`}>Sync {row.age}</p>
            <p className="text-sm leading-snug font-semibold">Belum terkirim: {row.pending_reported}</p>
            <TealButton className="w-full px-3 py-2.5 text-sm" onClick={() => void release(row)}>
              Lepas device
            </TealButton>
          </div>
        </li>
      ))}
    </ul>
  );
}
