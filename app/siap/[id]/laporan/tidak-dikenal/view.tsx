"use client";

import { EmptyState } from "@/app/empty-state";
import { QueryView } from "@/app/siap/query";
import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";

type Row = {
  id: string;
  nomor: string;
  pass: number;
  kode_input: string | null;
  nama_input: string | null;
  qty: string;
  kondisi: string;
};

export function TidakDikenalView({ id }: { id: string }) {
  return (
    <QueryView<Row[]> path={`/api/sessions/${id}/unknown-items`}>
      {(rows) =>
        rows.length === 0 ? (
          <EmptyState menu="barang tidak dikenal" />
        ) : (
          <ReportTable title="Barang tidak dikenal" headers={["Tag", "Pass", "Kode", "Nama", "Qty", "Kondisi"]}>
            {rows.map((row) => (
              <ReportRow key={row.id}>
                <Td>{row.nomor}</Td>
                <Td>{row.pass}</Td>
                <Td>{row.kode_input}</Td>
                <Td>{row.nama_input}</Td>
                <Td>{row.qty}</Td>
                <Td>{row.kondisi}</Td>
              </ReportRow>
            ))}
          </ReportTable>
        )
      }
    </QueryView>
  );
}
