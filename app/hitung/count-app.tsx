"use client";

import { useEffect, useMemo, useState } from "react";
import {
  enqueueCount,
  listQueue,
  newClientRowId,
  newDeviceId,
  removeAccepted,
} from "@/lib/offline/queue";

type PrepareItem = {
  id: string;
  barcode_4: string | null;
  nama_barang: string;
  kode_barang: string;
};

type PreparePayload = {
  counter: { nama: string };
  items: PrepareItem[];
  assignments: { tag_id: string; pass: number }[];
};

const DEFAULT_SESSION = "55555555-5555-5555-5555-000000000001";

export function CountApp() {
  const [sessionId, setSessionId] = useState(DEFAULT_SESSION);
  const [deviceId, setDeviceId] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    const stored = localStorage.getItem("device_id");
    if (stored) {
      return stored;
    }
    const generated = newDeviceId();
    localStorage.setItem("device_id", generated);
    return generated;
  });
  const [userId, setUserId] = useState("11111111-1111-1111-1111-000000000003");
  const [prepare, setPrepare] = useState<PreparePayload | null>(null);
  const [tagId, setTagId] = useState("");
  const [pass, setPass] = useState(1);
  const [code, setCode] = useState("");
  const [qty, setQty] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(0);

  useEffect(() => {
    void refreshPending();
  }, []);

  const matched = useMemo(() => {
    if (!prepare || !code) {
      return null;
    }
    return prepare.items.find((item) => item.barcode_4 === code) ?? null;
  }, [prepare, code]);

  async function refreshPending() {
    const rows = await listQueue();
    setPending(rows.length);
  }

  async function bind() {
    const response = await fetch(`/api/sessions/${sessionId}/bind`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, device_id: deviceId }),
    });
    const json = (await response.json()) as { error?: string };
    setMessage(response.ok ? "Perangkat terikat." : (json.error ?? "Gagal mengikat."));
  }

  async function download() {
    const response = await fetch(`/api/sessions/${sessionId}/prepare`, {
      headers: { "x-device-id": deviceId },
    });
    const json = (await response.json()) as PreparePayload & { error?: string };
    if (!response.ok) {
      setMessage(json.error ?? "Gagal mengunduh.");
      return;
    }
    setPrepare(json);
    const first = json.assignments[0];
    if (first) {
      setTagId(first.tag_id);
      setPass(first.pass);
    }
    setMessage(`Siap. ${json.items.length} barang. Petugas: ${json.counter.nama}.`);
  }

  async function save() {
    if (!matched) {
      setMessage("Kode tidak dikenali.");
      return;
    }
    if (!qty || Number.isNaN(Number(qty))) {
      setMessage("Isi jumlah.");
      return;
    }
    const row = {
      client_row_id: newClientRowId(),
      tag_id: tagId,
      pass,
      snapshot_item_id: matched.id,
      qty,
      qty_note: null,
      kondisi: "baik" as const,
      client_created_at: new Date().toISOString(),
    };
    await enqueueCount(row);
    await refreshPending();
    setQty("");
    setCode("");
    setMessage("Tersimpan di antrian (offline).");
  }

  async function syncNow() {
    const counts = await listQueue();
    const response = await fetch("/api/counts/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: deviceId,
        pending_after: 0,
        counts,
        submissions: [],
        unknowns: [],
      }),
    });
    const json = (await response.json()) as {
      accepted?: string[];
      rejected?: { client_row_id: string; reason: string }[];
      error?: string;
    };
    if (!response.ok) {
      setMessage(json.error ?? "Sinkron gagal.");
      return;
    }
    await removeAccepted(json.accepted ?? []);
    await refreshPending();
    const rejected = json.rejected ?? [];
    setMessage(
      rejected.length === 0
        ? `Terkirim ${json.accepted?.length ?? 0}.`
        : `Ditolak: ${rejected.map((row) => row.reason).join("; ")}`,
    );
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-3 p-4">
      <h1 className="text-xl font-semibold">Hitung (uji)</h1>
      <label className="flex flex-col gap-1 text-sm">
        Sesi
        <input
          className="border px-2 py-1"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Device id
        <input
          className="border px-2 py-1 font-mono text-xs"
          value={deviceId}
          onChange={(e) => {
            setDeviceId(e.target.value);
            localStorage.setItem("device_id", e.target.value);
          }}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        User id
        <input className="border px-2 py-1" value={userId} onChange={(e) => setUserId(e.target.value)} />
      </label>
      <div className="flex gap-2">
        <button type="button" className="border px-3 py-1" onClick={() => void bind()}>
          Ikat
        </button>
        <button type="button" className="border px-3 py-1" onClick={() => void download()}>
          Unduh
        </button>
        <button type="button" className="border px-3 py-1" onClick={() => void syncNow()}>
          Kirim
        </button>
      </div>
      <p className="text-sm">Antrian: {pending}</p>
      <label className="flex flex-col gap-1 text-sm">
        Tag id
        <input className="border px-2 py-1" value={tagId} onChange={(e) => setTagId(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Pass
        <input
          className="border px-2 py-1"
          type="number"
          value={pass}
          onChange={(e) => setPass(Number(e.target.value))}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Kode
        <input
          className="border px-2 py-1 text-2xl"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      <p className="min-h-10 text-2xl font-medium">{matched ? matched.nama_barang : " "}</p>
      <label className="flex flex-col gap-1 text-sm">
        Jumlah
        <input
          className="border px-2 py-1"
          inputMode="decimal"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          disabled={!matched}
        />
      </label>
      <button type="button" className="border bg-black px-3 py-2 text-white" onClick={() => void save()}>
        Simpan
      </button>
      <p className="text-sm">{message}</p>
    </main>
  );
}
