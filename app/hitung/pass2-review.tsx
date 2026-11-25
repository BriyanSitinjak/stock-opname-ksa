"use client";

import { PrimaryButton, TextLink } from "@/app/hitung/ui";
import { qtyOrDash } from "@/lib/qty-display";

export type Pass2Item = {
  snapshot_item_id: string;
  barcode_4: string | null;
  nama_barang: string;
  qty_1: string;
  review_status?: "sesuai" | "revisi";
  qty_2?: string;
  nama_revisi?: string | null;
};

export function Pass2ReviewList({
  items,
  editingId,
  editQty,
  editNama,
  onEditQty,
  onEditNama,
  onStartRevisi,
  onCancelRevisi,
  onSesuai,
  onSaveRevisi,
  onGantiBarang,
}: {
  items: Pass2Item[];
  editingId: string | null;
  editQty: string;
  editNama: string;
  onEditQty: (value: string) => void;
  onEditNama: (value: string) => void;
  onStartRevisi: (item: Pass2Item) => void;
  onCancelRevisi: () => void;
  onSesuai: (item: Pass2Item) => void;
  onSaveRevisi: (item: Pass2Item) => void;
  onGantiBarang: (item: Pass2Item) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="mt-4 rounded-2xl bg-ksa-panel px-4 py-3 text-sm text-white/60">
        Belum ada data Hitung ke-1 untuk lorong ini. Pastikan petugas 1 sudah sinkron, lalu unduh ulang
        persiapan.
      </p>
    );
  }
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {items.map((item) => {
        const editing = editingId === item.snapshot_item_id;
        return (
          <li key={item.snapshot_item_id} className="rounded-2xl bg-ksa-panel px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium leading-5 text-white">
                  {item.nama_revisi || item.nama_barang}
                </p>
                {item.barcode_4 ? <p className="mt-0.5 text-xs text-white/45">Kode {item.barcode_4}</p> : null}
                <p className="mt-1 text-xs text-white/50">
                  Hitung 1: {qtyOrDash(item.qty_1)}
                  {item.review_status === "revisi" && item.qty_2
                    ? ` · Revisi: ${item.qty_2}`
                    : null}
                </p>
              </div>
              {item.review_status === "sesuai" ? (
                <span className="shrink-0 rounded-full bg-ksa-sage px-2.5 py-1 text-xs font-semibold text-ksa-teal-deep">
                  Stock Sesuai
                </span>
              ) : item.review_status === "revisi" && !editing ? (
                <span className="shrink-0 rounded-full bg-ksa-amber/25 px-2.5 py-1 text-xs font-semibold text-ksa-amber">
                  Direvisi
                </span>
              ) : null}
            </div>
            {editing ? (
              <div className="mt-3 space-y-3">
                <label className="block text-xs text-white/50">
                  Nama (revisi, opsional)
                  <input
                    className="mt-1 w-full rounded-xl bg-black/30 px-3 py-2 text-sm text-white outline-none"
                    value={editNama}
                    onChange={(event) => onEditNama(event.target.value.toUpperCase())}
                    autoCapitalize="characters"
                  />
                </label>
                <label className="block text-xs text-white/50">
                  Jumlah revisi
                  <input
                    className="mt-1 w-full rounded-xl bg-black/30 px-3 py-2 text-2xl font-semibold text-white outline-none"
                    inputMode="decimal"
                    value={editQty}
                    onChange={(event) => onEditQty(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="text-sm text-ksa-amber underline"
                  onClick={() => onGantiBarang(item)}
                >
                  Ganti barang dari katalog
                </button>
                <div className="flex flex-col gap-2">
                  <PrimaryButton disabled={!editQty.trim()} onClick={() => onSaveRevisi(item)}>
                    Simpan revisi
                  </PrimaryButton>
                  <TextLink className="text-center text-white/60" onClick={onCancelRevisi}>
                    Batal
                  </TextLink>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-ksa-sage bg-ksa-sage/20 px-3 py-2 text-sm font-medium text-ksa-sage"
                  onClick={() => onSesuai(item)}
                >
                  Sesuai
                </button>
                <button
                  type="button"
                  className="rounded-full border border-ksa-amber/60 px-3 py-2 text-sm font-medium text-ksa-amber"
                  onClick={() => onStartRevisi(item)}
                >
                  Tidak Sesuai
                </button>
                {item.review_status ? (
                  <TextLink className="text-white/50" onClick={() => onStartRevisi(item)}>
                    ubah
                  </TextLink>
                ) : null}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
