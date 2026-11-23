"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/app/empty-state";
import { PassSelect, type CounterOption } from "@/app/siap/pass-select";
import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";
import { useSiapInvalidate } from "@/app/siap/query";
import { toast } from "@/app/toast";
import { groupBy } from "@/lib/group";
import { qtyOrDash } from "@/lib/qty-display";

export type SelisihHitungRow = {
  tag_id: string;
  snapshot_item_id: string;
  nomor: string;
  lokasi_nama: string;
  gudang_nama: string;
  kode_barang: string;
  nama_barang: string;
  qty_1: string | null;
  qty_2: string | null;
  pass_1_nama: string | null;
  pass_2_nama: string | null;
  pass_3_user_id: string | null;
};

export function SelisihHitungBoard({
  id,
  rows,
  counters,
}: {
  id: string;
  rows: SelisihHitungRow[];
  counters: CounterOption[];
}) {
  const invalidate = useSiapInvalidate();
  const [assigned, setAssigned] = useState<Record<string, string>>(() => {
    const start: Record<string, string> = {};
    for (const row of rows) {
      if (row.pass_3_user_id) {
        start[row.tag_id] = row.pass_3_user_id;
      }
    }
    return start;
  });

  const tags = useMemo(() => [...groupBy(rows, (row) => row.tag_id)], [rows]);

  async function assign(tagId: string, userId: string) {
    if (!userId) {
      return;
    }
    const response = await fetch(`/api/sessions/${id}/pass-3`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag_id: tagId, user_id: userId }),
    });
    const json = (await response.json()) as { error?: string; nama?: string };
    if (!response.ok) {
      toast(json.error ?? "Gagal menugaskan.");
      return;
    }
    setAssigned((current) => ({ ...current, [tagId]: userId }));
    invalidate([`/api/sessions/${id}/selisih-hitung`, `/api/sessions/${id}`]);
    toast(`Pass 3 ditugaskan${json.nama ? ` ke ${json.nama}` : ""}.`);
  }

  if (rows.length === 0) {
    return <EmptyState menu="selisih hitung" kind="tidak" />;
  }

  return (
    <>
      <p className="mt-2 text-sm text-[#6b6b6b]">{tags.length} tag</p>
      {tags.map(([tagId, items]) => {
        const head = items[0];
        if (!head) {
          return null;
        }
        return (
          <section key={tagId} className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-medium">
                  Tag {head.nomor} · {head.gudang_nama} / {head.lokasi_nama}
                </h2>
                <p className="text-sm text-[#6b6b6b]">
                  {head.pass_1_nama ?? "—"} / {head.pass_2_nama ?? "—"}
                </p>
              </div>
              <label className="text-sm">
                Tugaskan pass 3
                <PassSelect
                  className="mt-1 min-w-44"
                  counters={counters}
                  value={assigned[tagId] ?? null}
                  onChange={(userId) => void assign(tagId, userId)}
                />
              </label>
            </div>
            <ReportTable title={`Perbandingan tag ${head.nomor}`} headers={["Kode", "Nama", "Hitung 1", "Hitung 2"]}>
              {items.map((row) => (
                <ReportRow key={row.snapshot_item_id}>
                  <Td>{row.kode_barang}</Td>
                  <Td>{row.nama_barang}</Td>
                  <Td>{qtyOrDash(row.qty_1)}</Td>
                  <Td>{qtyOrDash(row.qty_2)}</Td>
                </ReportRow>
              ))}
            </ReportTable>
          </section>
        );
      })}
    </>
  );
}
