"use client";

import { useState } from "react";
import { fetchJson } from "@/app/siap/api";
import { BackLink, Card, ErrorText, OutlineButton, TealButton } from "@/app/siap/ui";

type Preview = {
  rowCount: number;
  filteredCount: number;
  items: number;
  gudangBreakdown: Record<string, number>;
  emptyHargaCount: number;
  missingBarcodeCount: number;
  error?: string;
  ok?: boolean;
};

export function ImporForm({ id }: { id: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function post(confirm: boolean) {
    if (!file) {
      setError("Pilih berkas .csv atau .xlsx.");
      return;
    }
    setBusy(true);
    setError("");
    const body = new FormData();
    body.append("file", file);
    const { ok, data } = await fetchJson<Preview>(`/api/sessions/${id}/import${confirm ? "?confirm=1" : ""}`, {
      method: "POST",
      body,
    });
    setBusy(false);
    if (!ok) {
      setError(data.error ?? "Impor ditolak.");
      setPreview(null);
      return;
    }
    if (confirm) {
      setSaved(true);
      setPreview(null);
      return;
    }
    setPreview(data);
  }

  return (
    <>
      <BackLink href={`/siap/${id}`} />
      <h1 className="mt-3 text-2xl font-semibold">Impor snapshot</h1>
      <p className="mt-1 text-sm text-[#6b6b6b]">Hasil pembacaan muncul dulu. Snapshot belum ditulis sebelum Simpan Snapshot.</p>
      <Card className="mt-6 max-w-xl">
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setPreview(null);
            setSaved(false);
          }}
        />
        <TealButton disabled={busy} className="mt-4 px-5 py-2.5 text-sm" onClick={() => void post(false)}>
          Baca berkas
        </TealButton>
      </Card>
      <ErrorText>{error}</ErrorText>
      {saved ? <p className="mt-4 text-sm text-ksa-teal-deep">Snapshot tersimpan.</p> : null}
      {preview ? (
        <Card className="mt-6 max-w-xl">
          <h2 className="font-medium">Hasil pembacaan file</h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li>Baris dibaca {preview.rowCount}</li>
            <li>Disaring (di luar lingkup) {preview.filteredCount}</li>
            <li>Barang unik {preview.items}</li>
          </ul>
          <ul className="mt-3 space-y-1 text-sm">
            {Object.entries(preview.gudangBreakdown).map(([nama, count]) => (
              <li key={nama}>
                {nama} {count} barang
              </li>
            ))}
          </ul>
          {preview.emptyHargaCount > 0 ? (
            <p className="mt-3 text-sm">⚠ Harga satuan kosong pada {preview.emptyHargaCount} barang</p>
          ) : null}
          {preview.missingBarcodeCount > 0 ? (
            <p className="mt-1 text-sm">⚠ Kolom barcode belum ada di {preview.missingBarcodeCount} baris</p>
          ) : null}
          <div className="mt-6 flex gap-3">
            <OutlineButton className="px-5 py-2.5" onClick={() => setPreview(null)}>
              Batal
            </OutlineButton>
            <TealButton disabled={busy} className="px-5 py-2.5 text-sm" onClick={() => void post(true)}>
              Simpan Snapshot
            </TealButton>
          </div>
        </Card>
      ) : null}
    </>
  );
}
