"use client";

import { useState } from "react";
import { fetchJson } from "@/app/siap/api";
import { ErrorText, TealButton } from "@/app/siap/ui";
import { toast } from "@/app/toast";

type SyncResult = {
  ok?: boolean;
  error?: string;
  gudang_created?: number;
  lokasi_created?: number;
  tags_created?: number;
  tags_renamed?: number;
  tags_skipped?: number;
};

export function SyncFloorTagsButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [last, setLast] = useState<string>("");

  async function onSync() {
    setBusy(true);
    setError("");
    const { ok, data } = await fetchJson<SyncResult>("/api/setup/floor-tags", { method: "POST" });
    setBusy(false);
    if (!ok) {
      toast(data.error ?? "Gagal sinkron tag denah.", setError);
      return;
    }
    const summary = `Tag dibuat ${data.tags_created ?? 0}, diganti nomor ${data.tags_renamed ?? 0}, lokasi baru ${data.lokasi_created ?? 0}, gudang baru ${data.gudang_created ?? 0}.`;
    setLast(summary);
    toast("Denah master tersinkron.");
  }

  return (
    <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#1c1c1c]">Sinkron tag dari denah</p>
      <p className="mt-1 text-sm text-[#5c5c5c]">
        Membuat tag master untuk posisi lantai (termasuk zero-pad, Transit, U/V, Pretelan, dan slot Gudang
        16). Nomor lama tanpa pad diganti jika tag belum dipin di sesi.
      </p>
      <TealButton className="mt-4 px-6 py-3" disabled={busy} onClick={() => void onSync()}>
        {busy ? "Menyinkron…" : "Sinkronkan tag denah"}
      </TealButton>
      <ErrorText>{error}</ErrorText>
      {last ? <p className="mt-3 text-sm text-[#5c5c5c]">{last}</p> : null}
    </div>
  );
}
