"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/app/siap/api";
import { BackLink, PageLead } from "@/app/siap/ui";
import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";

export function KartuBoard({ id }: { id: string }) {
  const [rows, setRows] = useState<Array<{ nomor_kartu: string; pemakaian: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchJson<Array<{ nomor_kartu: string; pemakaian: number }>>(`/api/sessions/${id}/kartu-bentrok`).then(
      ({ ok, data }) => {
        if (!cancelled && ok) {
          setRows(data);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <BackLink href={`/siap/${id}/tugas`} />
      <h1 className="mt-3 text-2xl font-semibold">Nomor kartu bentrok</h1>
      <PageLead>
        Nomor yang sama pada dua HP, atau pada hitung ke-1 dan hitung ke-2, tetap tersimpan. Daftar ini hanya
        menunjukkannya.
      </PageLead>
      {rows.length === 0 ? <p className="mt-6 text-sm">Belum ada nomor yang bentrok.</p> : null}
      {rows.length > 0 ? (
        <ReportTable title="Bentrok" headers={["Nomor kartu", "HP yang memakai"]}>
          {rows.map((row) => (
            <ReportRow key={row.nomor_kartu}>
              <Td className="font-medium">{row.nomor_kartu}</Td>
              <Td>{row.pemakaian}</Td>
            </ReportRow>
          ))}
        </ReportTable>
      ) : null}
    </>
  );
}
