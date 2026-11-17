"use client";

import { useState } from "react";
import { fetchJson } from "@/app/siap/api";
import { TealButton } from "@/app/siap/ui";

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
  const [message, setMessage] = useState("");

  async function release(deviceId: string) {
    setMessage("");
    const { ok, data } = await fetchJson<{ error?: string }>(`/api/sessions/${id}/devices/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId }),
    });
    if (!ok) {
      setMessage(data.error ?? "Gagal melepas.");
      return;
    }
    setRows((current) => current.filter((row) => row.device_id !== deviceId));
    setMessage("Perangkat dilepas. Petugas bisa diikat ke HP lain.");
  }

  return (
    <>
      <ul className="mt-6 flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.device_id} className={`rounded-2xl p-5 shadow-sm ${row.stale ? "bg-[#f3d4a0]" : "bg-white"}`}>
            <p className={row.stale ? "text-xl font-semibold" : "font-medium"}>{row.nama}</p>
            <p className="mt-1 text-sm">Perangkat {row.device_id}</p>
            <p className={`mt-2 ${row.stale ? "text-base font-medium" : "text-sm text-[#6b6b6b]"}`}>
              Sinkron terakhir: {row.age}
            </p>
            <p className="mt-1 text-sm">Belum terkirim (laporan HP): {row.pending_reported}</p>
            <TealButton className="mt-4 px-4 py-2 text-sm" onClick={() => void release(row.device_id)}>
              Lepas perangkat
            </TealButton>
          </li>
        ))}
      </ul>
      {message ? <p className="mt-4 text-sm">{message}</p> : null}
    </>
  );
}
