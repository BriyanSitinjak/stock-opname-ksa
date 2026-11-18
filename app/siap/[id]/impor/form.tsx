"use client";

import { useState } from "react";
import { IMPORT_ACCEPT, importFileList } from "@/lib/import-kinds";
import { BackLink, Card, ErrorText, OutlineButton, TealButton } from "@/app/siap/ui";

type Preview = {
  rowCount: number;
  filteredCount: number;
  items: number;
  gudangBreakdown: Record<string, number>;
  emptyHargaCount: number;
  missingBarcodeCount: number;
  addedBrands?: string[];
  addedGroups?: string[];
  error?: string;
  ok?: boolean;
};

export function ImporForm({ id }: { id: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [progressLabel, setProgressLabel] = useState("");

  async function post(confirm: boolean) {
    if (!file) {
      setError(`Pilih berkas ${importFileList("atau")}.`);
      return;
    }
    setBusy(true);
    setError("");
    setSaved(false);
    setProgress(4);
    setProgressLabel(confirm ? "Menyimpan snapshot…" : "Mengunggah berkas…");
    const creep = window.setInterval(() => {
      setProgress((current) => (current == null || current >= 92 ? current : current + 1));
    }, 350);
    const body = new FormData();
    body.append("file", file);
    try {
      const { ok, data } = await uploadImport(`/api/sessions/${id}/import${confirm ? "?confirm=1" : ""}`, body, (ratio) => {
        const uploaded = Math.round(ratio * 70);
        setProgress((current) => Math.max(current ?? 0, uploaded));
        if (ratio >= 1) {
          setProgressLabel(confirm ? "Menyimpan snapshot…" : "Mengolah berkas…");
        }
      });
      if (!ok) {
        setError(data.error ?? "Impor ditolak.");
        setPreview(null);
        setProgress(null);
        return;
      }
      setProgress(100);
      setProgressLabel("Selesai");
      if (confirm) {
        setSaved(true);
        setPreview(null);
      } else {
        setPreview(data);
      }
    } catch {
      setError("Tidak ada koneksi. Impor harus dilakukan di area bersinyal.");
      setPreview(null);
      setProgress(null);
    } finally {
      window.clearInterval(creep);
      setBusy(false);
    }
  }

  return (
    <>
      <BackLink href={`/siap/${id}`} />
      <h1 className="mt-3 text-2xl font-semibold">Impor snapshot</h1>
      <p className="mt-1 text-sm text-[#6b6b6b]">Hasil pembacaan muncul dulu. Snapshot belum ditulis sebelum Simpan Snapshot.</p>
      <Card className="mt-6 max-w-xl">
        <input
          type="file"
          accept={IMPORT_ACCEPT}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setPreview(null);
            setSaved(false);
            setProgress(null);
          }}
        />
        <TealButton disabled={busy} className="mt-4 px-5 py-2.5 text-sm" onClick={() => void post(false)}>
          Baca berkas
        </TealButton>
        <ImportProgress progress={progress} label={progressLabel} />
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
          <AddedNames label="Merek baru" names={preview.addedBrands} />
          <AddedNames label="Group baru" names={preview.addedGroups} />
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

function AddedNames({ label, names }: { label: string; names?: string[] }) {
  if (!names?.length) {
    return null;
  }
  return (
    <p className="mt-3 text-sm">
      {label}: {names.join(", ")}. Masuk ke lingkup sesi saat Simpan Snapshot.
    </p>
  );
}

function ImportProgress({ progress, label }: { progress: number | null; label: string }) {
  if (progress == null) {
    return null;
  }
  return (
    <div className="mt-4">
      <div
        className="h-2 overflow-hidden rounded-full bg-[#efe8dc]"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="h-full rounded-full bg-ksa-teal transition-[width] duration-200" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-sm text-[#6b6b6b]">
        {label} {progress}%
      </p>
    </div>
  );
}

function uploadImport(url: string, body: FormData, onRatio: (ratio: number) => void) {
  return new Promise<{ ok: boolean; data: Preview }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onRatio(event.loaded / event.total);
      }
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.onload = () => {
      try {
        resolve({ ok: xhr.status >= 200 && xhr.status < 300, data: JSON.parse(xhr.responseText) as Preview });
      } catch {
        reject(new Error("parse"));
      }
    };
    xhr.send(body);
  });
}
