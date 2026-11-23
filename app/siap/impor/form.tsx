"use client";

import { useRef, useState } from "react";
import { IMPORT_ACCEPT, importFileList } from "@/lib/import-kinds";
import { useSiapInvalidate } from "@/app/siap/query";
import { BackLink, Card, ErrorText, OutlineButton, PageLead, TealButton } from "@/app/siap/ui";
import { toast } from "@/app/toast";

type Preview = {
  rowCount: number;
  filteredCount: number;
  items: number;
  gudangBreakdown: Record<string, number>;
  emptyHargaCount: number;
  missingBarcodeCount: number;
  addedBrands?: string[];
  addedGroups?: string[];
  addedGudang?: string[];
  error?: string;
  ok?: boolean;
};

export function ImporForm() {
  const invalidate = useSiapInvalidate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [progressLabel, setProgressLabel] = useState("");

  function resetForm() {
    setFile(null);
    setPreview(null);
    setError("");
    setProgress(null);
    setProgressLabel("");
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  async function post(confirm: boolean) {
    if (!file) {
      toast(`Pilih file ${importFileList("atau")}.`, setError);
      return;
    }
    setBusy(true);
    setError("");
    setProgress(4);
    setProgressLabel(confirm ? "Menyimpan stok…" : "Mengunggah file…");
    const creep = window.setInterval(() => {
      setProgress((current) => (current == null || current >= 92 ? current : current + 1));
    }, 350);
    const body = new FormData();
    body.append("file", file);
    try {
      const { ok, data } = await uploadImport(`/api/master/import${confirm ? "?confirm=1" : ""}`, body, (ratio) => {
        const uploaded = Math.round(ratio * 70);
        setProgress((current) => Math.max(current ?? 0, uploaded));
        if (ratio >= 1) {
          setProgressLabel(confirm ? "Menyimpan stok…" : "Mengolah file…");
        }
      });
      if (!ok) {
        toast(data.error ?? "Impor ditolak.", setError);
        setPreview(null);
        setProgress(null);
        return;
      }
      setProgress(100);
      setProgressLabel("Selesai");
      if (confirm) {
        resetForm();
        invalidate(["/api/master/items", "/api/master/item-choices", "/api/setup/catalog"]);
        toast("Stok tersimpan.");
      } else {
        setPreview(data);
        toast("File selesai dibaca.");
      }
    } catch {
      toast("Tidak ada koneksi. Impor harus dilakukan di area bersinyal.", setError);
      setPreview(null);
      setProgress(null);
    } finally {
      window.clearInterval(creep);
      setBusy(false);
    }
  }

  return (
    <>
      <BackLink href="/siap" />
      <h1 className="mt-3 text-2xl font-semibold">Impor stok</h1>
      <PageLead>
        File ini untuk seluruh gudang, bukan untuk satu sesi. Baca dulu sebagai preview. Stok tersimpan setelah Simpan stok, dan sesi menyalinnya saat dibuka.
      </PageLead>
      <Card className="mt-6 max-w-xl">
        <input
          ref={fileRef}
          type="file"
          accept={IMPORT_ACCEPT}
          className="sr-only"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setPreview(null);
            setProgress(null);
          }}
        />
        <div className="flex items-center gap-3 rounded-2xl border border-[#e7dfd2] bg-[#faf7f1] px-4 py-3">
          <TealButton className="px-4 py-2 text-sm" onClick={() => fileRef.current?.click()}>
            Cari file
          </TealButton>
          <span className={`min-w-0 truncate text-sm ${file ? "text-[#1c1c1c]" : "text-[#8a8a8a]"}`}>
            {file ? file.name : importFileList("atau")}
          </span>
        </div>
        <TealButton disabled={busy} className="mt-4 px-5 py-2.5 text-sm" onClick={() => void post(false)}>
          Baca file
        </TealButton>
        <ImportProgress progress={progress} label={progressLabel} />
      </Card>
      <ErrorText>{error}</ErrorText>
      {preview ? (
        <Card className="mt-6 max-w-xl">
          <h2 className="font-medium">Preview file</h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li>Baris terbaca {preview.rowCount}</li>
            <li>Di luar scope {preview.filteredCount}</li>
            <li>Item unik {preview.items}</li>
          </ul>
          <ul className="mt-3 space-y-1 text-sm">
            {Object.entries(preview.gudangBreakdown).map(([nama, count]) => (
              <li key={nama}>
                {nama} {count} item
              </li>
            ))}
          </ul>
          {preview.emptyHargaCount > 0 ? (
            <p className="mt-3 text-sm">⚠ Harga satuan kosong pada {preview.emptyHargaCount} item</p>
          ) : null}
          {preview.missingBarcodeCount > 0 ? (
            <p className="mt-1 text-sm">⚠ Kolom barcode belum ada di {preview.missingBarcodeCount} baris</p>
          ) : null}
          <AddedNames label="Gudang baru" names={preview.addedGudang} detail="Ditambahkan saat Simpan stok." />
          <AddedNames label="Brand baru" names={preview.addedBrands} detail="Ikut tersimpan bersama stok." />
          <AddedNames label="Group baru" names={preview.addedGroups} detail="Ikut tersimpan bersama stok." />
          <div className="mt-6 flex gap-3">
            <OutlineButton className="px-5 py-2.5" onClick={() => setPreview(null)}>
              Batal
            </OutlineButton>
            <TealButton disabled={busy} className="px-5 py-2.5 text-sm" onClick={() => void post(true)}>
              Simpan stok
            </TealButton>
          </div>
        </Card>
      ) : null}
    </>
  );
}

function AddedNames({ label, names, detail }: { label: string; names?: string[]; detail: string }) {
  if (!names?.length) {
    return null;
  }
  return (
    <p className="mt-3 text-sm">
      {label}: {names.join(", ")}. {detail}
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
