"use client";

import { EmptyState } from "@/app/empty-state";
import { QueryView } from "@/app/siap/query";
import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";

type Row = { barcode_4: string | null; nama_barang: string; kondisi: string; qty: string };

export function KondisiView({ id }: { id: string }) {
  return (
    <QueryView<Row[]> path={`/api/sessions/${id}/kondisi`}>
      {(rows) =>
        rows.length === 0 ? (
          <EmptyState menu="kondisi" />
        ) : (
          <ReportTable title="Catatan kondisi" headers={["Kode", "Nama", "Kondisi", "Qty"]}>
            {rows.map((row) => (
              <ReportRow key={`${row.barcode_4}-${row.kondisi}`}>
                <Td>{row.barcode_4}</Td>
                <Td>{row.nama_barang}</Td>
                <Td>{row.kondisi}</Td>
                <Td>{row.qty}</Td>
              </ReportRow>
            ))}
          </ReportTable>
        )
      }
    </QueryView>
  );
}
