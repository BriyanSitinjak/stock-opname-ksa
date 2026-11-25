"use client";

import { PaperNumberField, PrimaryButton, StruckText, TextLink } from "@/app/hitung/ui";
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

/** Nomor tag for Hitung ke-2: show H1 value, edit via action button, strike old when changed. */
export function Pass2TagEditor({
  pass1Card,
  cardNo,
  editing,
  onChangeCard,
  onToggleEdit,
}: {
  pass1Card: string;
  cardNo: string;
  editing: boolean;
  onChangeCard: (value: string) => void;
  onToggleEdit: (open: boolean) => void;
}) {
  const current = cardNo.trim();
  const changed = Boolean(pass1Card && current && current !== pass1Card);
  return (
    <div className="mt-4 rounded-2xl bg-ksa-panel px-4 py-3">
      {editing ? (
        <div className="space-y-3">
          {pass1Card ? (
            <p className="text-sm text-white/50">
              Nomor tag Hitung 1: <StruckText>{pass1Card}</StruckText>
            </p>
          ) : null}
          <label className="block text-sm text-white/70">
            Nomor tag koreksi
            <PaperNumberField tone="ink" autoFocus value={cardNo} onChange={onChangeCard} />
          </label>
          <button
            type="button"
            className="text-sm font-medium text-ksa-sage"
            onClick={() => onToggleEdit(false)}
          >
            Selesai ubah nomor tag
          </button>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-white/70">
            Nomor tag:{" "}
            {changed ? (
              <>
                <StruckText>{pass1Card}</StruckText>{" "}
                <span className="font-semibold text-white">{current}</span>
              </>
            ) : (
              <span className="font-semibold text-white">{current || pass1Card || "—"}</span>
            )}
          </p>
          <button
            type="button"
            className="shrink-0 rounded-full border border-ksa-amber/60 px-3 py-1.5 text-xs font-medium text-ksa-amber"
            onClick={() => onToggleEdit(true)}
          >
            Ubah
          </button>
        </div>
      )}
    </div>
  );
}

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
    <ul className="mt-4 flex max-h-[min(52dvh,420px)] flex-col gap-3 overflow-y-auto overscroll-contain pr-1">
      {items.map((item) => {
        const editing = editingId === item.snapshot_item_id;
        const sesuai = item.review_status === "sesuai";
        const revisi = item.review_status === "revisi";
        const showNamaRevisi = Boolean(item.nama_revisi && item.nama_revisi !== item.nama_barang);
        return (
          <li
            key={item.snapshot_item_id}
            className={`rounded-2xl px-4 py-3 ${sesuai ? "bg-ksa-panel/70" : "bg-ksa-panel"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {sesuai ? (
                  <>
                    <p className="text-sm font-medium leading-5">
                      <StruckText>{item.nama_barang}</StruckText>
                    </p>
                    <p className="mt-1 text-xs">
                      <StruckText>Qty {qtyOrDash(item.qty_1)}</StruckText>
                    </p>
                  </>
                ) : revisi && !editing ? (
                  <>
                    <p className="text-sm font-medium leading-5 text-white">
                      {showNamaRevisi ? (
                        <>
                          <StruckText>{item.nama_barang}</StruckText>
                          <span className="ml-2">{item.nama_revisi}</span>
                        </>
                      ) : (
                        item.nama_barang
                      )}
                    </p>
                    {item.barcode_4 ? <p className="mt-0.5 text-xs text-white/45">Kode {item.barcode_4}</p> : null}
                    <p className="mt-1 text-xs text-white/70">
                      <StruckText>Qty {qtyOrDash(item.qty_1)}</StruckText>
                      {item.qty_2 ? <span className="ml-2 font-semibold text-white">{item.qty_2}</span> : null}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium leading-5 text-white">{item.nama_barang}</p>
                    {item.barcode_4 ? <p className="mt-0.5 text-xs text-white/45">Kode {item.barcode_4}</p> : null}
                    <p className="mt-1 text-xs text-white/50">Qty Hitung 1: {qtyOrDash(item.qty_1)}</p>
                  </>
                )}
              </div>
              {sesuai ? (
                <span className="shrink-0 rounded-full bg-ksa-sage px-2.5 py-1 text-xs font-semibold text-ksa-teal-deep">
                  Stock Sesuai
                </span>
              ) : revisi && !editing ? (
                <span className="shrink-0 rounded-full bg-ksa-amber/25 px-2.5 py-1 text-xs font-semibold text-ksa-amber">
                  Direvisi
                </span>
              ) : null}
            </div>
            {editing ? (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-white/50">
                  Nilai Hitung 1 tetap: <StruckText>{item.nama_barang}</StruckText> ·{" "}
                  <StruckText>{qtyOrDash(item.qty_1)}</StruckText>
                </p>
                <label className="block text-xs text-white/50">
                  Nama revisi (opsional)
                  <input
                    className="mt-1 w-full rounded-xl bg-black/30 px-3 py-2 text-sm text-white outline-none"
                    value={editNama}
                    onChange={(event) => onEditNama(event.target.value.toUpperCase())}
                    autoCapitalize="characters"
                    placeholder={item.nama_barang}
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
                {!sesuai ? (
                  <button
                    type="button"
                    className="rounded-full border border-ksa-sage bg-ksa-sage/20 px-3 py-2 text-sm font-medium text-ksa-sage"
                    onClick={() => onSesuai(item)}
                  >
                    Sesuai
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-full border border-ksa-amber/60 px-3 py-2 text-sm font-medium text-ksa-amber"
                  onClick={() => onStartRevisi(item)}
                >
                  {revisi || sesuai ? "Ubah" : "Tidak Sesuai"}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
