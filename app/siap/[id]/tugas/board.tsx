"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { samePersonOnBothPasses } from "@/lib/assignment-rules";
import { isFloorPlace } from "@/lib/floor-plan";
import { groupBy } from "@/lib/group";
import { fetchJson } from "@/app/siap/api";
import { useDraftRows, useSiapInvalidate, useSiapQuery } from "@/app/siap/query";
import { AisleTasks } from "./aisles";
import { EmptyState } from "@/app/empty-state";
import { PassSelect, type CounterOption } from "@/app/siap/pass-select";
import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";
import { BackLink, ErrorText, MissingList, PageLead, TealButton } from "@/app/siap/ui";
import { toast } from "@/app/toast";

type Row = {
  tag_id: string;
  nomor: string;
  lokasi: string;
  gudang: string;
  pass_1: string | null;
  pass_2: string | null;
};

export function TugasBoard({ id }: { id: string }) {
  const invalidate = useSiapInvalidate();
  const assignments = useSiapQuery<Row[]>(`/api/sessions/${id}/assignments`);
  const catalog = useSiapQuery<{ counters: CounterOption[] }>("/api/setup/catalog");
  const [rows, setRows] = useDraftRows(id, assignments.data);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const counters = catalog.data?.counters ?? [];
  const list = rows ?? [];

  const grouped = useMemo(() => {
    const kept = (rows ?? []).filter((row) => !isFloorPlace(row.nomor));
    return [...groupBy(kept, (row) => row.gudang)];
  }, [rows]);

  function setPass(tagId: string, pass: 1 | 2, userId: string) {
    setError("");
    setRows((current) =>
      (current ?? []).map((row) => {
        if (row.tag_id !== tagId) {
          return row;
        }
        const next = { ...row, [pass === 1 ? "pass_1" : "pass_2"]: userId || null };
        const clash = samePersonOnBothPasses([
          ...(next.pass_1 ? [{ tag_id: next.tag_id, pass: 1, user_id: next.pass_1 }] : []),
          ...(next.pass_2 ? [{ tag_id: next.tag_id, pass: 2, user_id: next.pass_2 }] : []),
        ]);
        if (clash) {
          toast(`Tag ${row.nomor}: orang yang sama tidak boleh di pass 1 dan pass 2.`, setError);
          return row;
        }
        return next;
      }),
    );
  }

  async function save() {
    setError("");
    const assignments = list.flatMap((row) => {
      const out: { tag_id: string; pass: number; user_id: string }[] = [];
      if (row.pass_1) {
        out.push({ tag_id: row.tag_id, pass: 1, user_id: row.pass_1 });
      }
      if (row.pass_2) {
        out.push({ tag_id: row.tag_id, pass: 2, user_id: row.pass_2 });
      }
      return out;
    });
    const clash = samePersonOnBothPasses(assignments);
    if (clash) {
      toast(clash, setError);
      return;
    }
    const { ok, data } = await fetchJson<{ error?: string; missing_assignments?: string[] }>(`/api/sessions/${id}/assignments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments }),
    });
    if (!ok) {
      toast(data.error ?? "Gagal menyimpan tugas.", setError);
      return;
    }
    setMissing(data.missing_assignments ?? []);
    invalidate([`/api/sessions/${id}/assignments`, `/api/sessions/${id}`]);
    toast("Tugas tersimpan.");
  }

  return (
    <>
      <BackLink href={`/siap/${id}`} />
      <h1 className="mt-3 text-2xl font-semibold">Bagi tugas</h1>
      <PageLead>
        Setiap lorong punya hitung ke-1 dan hitung ke-2, orangnya boleh berganti di lorong berikutnya. Lorong yang ditandai kosong tidak dibagikan. Tag contoh yang masih ada tetap di daftar bawah. Tugas hanya bisa diubah selama sesi masih draft.
      </PageLead>
      {assignments.isPending ? null : list.length === 0 ? <EmptyState menu="tag" /> : null}
      <AisleTasks id={id} counters={counters} />
      <p className="mt-6 text-sm">
        <Link className="text-ksa-teal-deep" href={`/siap/${id}/kartu`}>
          Nomor kartu yang bentrok
        </Link>
      </p>
      {grouped.map(([gudang, tags]) => (
        <section key={gudang}>
          <ReportTable title={gudang} headers={["Tag", "Lokasi", "Pass 1", "Pass 2"]}>
            {tags.map((row) => (
              <ReportRow key={row.tag_id}>
                <Td className="font-medium">{row.nomor}</Td>
                <Td>{row.lokasi}</Td>
                <Td>
                  <PassSelect counters={counters} value={row.pass_1} onChange={(userId) => setPass(row.tag_id, 1, userId)} />
                </Td>
                <Td>
                  <PassSelect counters={counters} value={row.pass_2} onChange={(userId) => setPass(row.tag_id, 2, userId)} />
                </Td>
              </ReportRow>
            ))}
          </ReportTable>
        </section>
      ))}
      <ErrorText>{error}</ErrorText>
      <MissingList items={missing} />
      <TealButton className="mt-6 px-6 py-3" onClick={() => void save()}>
        Simpan tugas
      </TealButton>
    </>
  );
}
