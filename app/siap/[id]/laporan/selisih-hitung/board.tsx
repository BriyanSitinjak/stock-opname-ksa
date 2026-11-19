"use client";

import { useMemo, useState } from "react";
import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";
import { Select } from "@/app/siap/ui";
import { toast } from "@/app/toast";
import { qtyOrDash } from "@/lib/qty-display";

type Row = {
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

type Counter = { id: string; nama: string };

export function SelisihHitungBoard({
  id,
  rows,
  counters,
}: {
  id: string;
  rows: Row[];
  counters: Counter[];
}) {
  const [assigned, setAssigned] = useState<Record<string, string>>(() => {
    const start: Record<string, string> = {};
    for (const row of rows) {
      if (row.pass_3_user_id) {
        start[row.tag_id] = row.pass_3_user_id;
      }
    }
    return start;
  });

  const tags = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of rows) {
      const list = map.get(row.tag_id) ?? [];
      list.push(row);
      map.set(row.tag_id, list);
    }
    return [...map.entries()];
  }, [rows]);

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
    toast(`Pass 3 ditugaskan${json.nama ? ` ke ${json.nama}` : ""}.`);
  }

  if (rows.length === 0) {
    return <p className="mt-6 text-sm">Tidak ada selisih hitung.</p>;
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
                <Select
                  className="ml-2 min-w-44"
                  value={assigned[tagId] ?? ""}
                  onChange={(event) => void assign(tagId, event.target.value)}
                >
                  <option value="">Pilih petugas</option>
                  {counters.map((counter) => (
                    <option key={counter.id} value={counter.id}>
                      {counter.nama}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <ReportTable headers={["Kode", "Nama", "Hitung 1", "Hitung 2"]}>
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
