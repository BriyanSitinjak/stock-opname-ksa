"use client";

import { useState } from "react";
import { fetchJson } from "@/app/siap/api";
import { useDraftRows, useSiapInvalidate, useSiapQuery } from "@/app/siap/query";
import { groupBy } from "@/lib/group";
import { PassSelect, type CounterOption } from "@/app/siap/pass-select";
import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";
import { ErrorText, MissingList, TealButton } from "@/app/siap/ui";
import { toast } from "@/app/toast";
import { aisleKey } from "@/lib/aisle-rules";

type AisleRow = {
  gudang: number;
  gudangNama: string;
  aisle: string;
  label: string;
  pass1: string | null;
  pass2: string | null;
  crossed: boolean;
  note: string;
};

export function AisleTasks({ id, counters }: { id: string; counters: CounterOption[] }) {
  const invalidate = useSiapInvalidate();
  const board = useSiapQuery<{ ready: boolean; aisles: AisleRow[] }>(`/api/sessions/${id}/aisles`);
  const [rows, setRows] = useDraftRows(id, board.data?.aisles);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const ready = board.data?.ready ?? false;
  const list = rows ?? [];

  if (list.length === 0) {
    return null;
  }

  function update(key: string, patch: Partial<AisleRow>) {
    setRows((current) => (current ?? []).map((row) => (aisleKey(row.gudang, row.aisle) === key ? { ...row, ...patch } : row)));
  }

  async function save() {
    setError("");
    const { ok, data } = await fetchJson<{ error?: string; missing_assignments?: string[] }>(`/api/sessions/${id}/aisles`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aisles: list.map((row) => ({
          gudang: row.gudang,
          aisle: row.aisle,
          pass_1: row.crossed ? null : row.pass1,
          pass_2: row.crossed ? null : row.pass2,
          crossed: row.crossed,
          note: row.note,
        })),
      }),
    });
    if (!ok) {
      toast(data.error ?? "Gagal menyimpan lorong.", setError);
      return;
    }
    setMissing(data.missing_assignments ?? []);
    invalidate([`/api/sessions/${id}/aisles`, `/api/sessions/${id}`]);
    toast("Tugas lorong tersimpan.");
  }

  const groups = groupBy(list, (row) => row.gudang);

  return (
    <div className="mt-6">
      {ready ? null : (
        <p className="mb-4 text-sm text-[#6b6b6b]">
          Daftar lorong ini sudah siap. Penyimpanannya menunggu tabel di database.
        </p>
      )}
      {[...groups.entries()].map(([gudang, aisles]) => (
        <section key={gudang}>
          <ReportTable title={`Gudang ${gudang}`} headers={["Lorong", "Hitung ke-1", "Hitung ke-2", "Kosong", "Catatan"]}>
            {aisles.map((row) => {
              const key = aisleKey(row.gudang, row.aisle);
              return (
                <ReportRow key={key}>
                  <Td className="font-medium">{row.label}</Td>
                  <Td>
                    <PassSelect
                      counters={counters}
                      value={row.crossed ? null : row.pass1}
                      disabled={row.crossed}
                      onChange={(userId) => update(key, { pass1: userId || null })}
                    />
                  </Td>
                  <Td>
                    <PassSelect
                      counters={counters}
                      value={row.crossed ? null : row.pass2}
                      disabled={row.crossed}
                      onChange={(userId) => update(key, { pass2: userId || null })}
                    />
                  </Td>
                  <Td>
                    <input
                      type="checkbox"
                      checked={row.crossed}
                      aria-label={`Lorong ${row.label} kosong`}
                      onChange={(event) => update(key, { crossed: event.target.checked })}
                    />
                  </Td>
                  <Td>
                    <input
                      className="w-full rounded-xl border border-[#e7dfd2] px-3 py-2 text-sm"
                      value={row.note}
                      disabled={!row.crossed}
                      onChange={(event) => update(key, { note: event.target.value })}
                    />
                  </Td>
                </ReportRow>
              );
            })}
          </ReportTable>
        </section>
      ))}
      <ErrorText>{error}</ErrorText>
      <MissingList items={missing} />
      <TealButton className="mt-4 px-6 py-3" onClick={() => void save()}>
        Simpan lorong
      </TealButton>
    </div>
  );
}
