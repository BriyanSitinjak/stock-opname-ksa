"use client";

import { EmptyState } from "@/app/empty-state";
import { QueryView } from "@/app/siap/query";
import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";

type Row = {
  gudang_id: string;
  gudang_nama: string;
  kode_barang: string;
  nama_barang: string;
  qty_onhand: string;
  qty_hitung: string;
  selisih_qty: string;
  selisih_nilai: string;
  ada_selisih_hitung: boolean;
  zero_found: boolean;
};

export function SelisihSistemView({ id }: { id: string }) {
  return (
    <QueryView<Row[]> path={`/api/sessions/${id}/selisih-sistem`}>
      {(data) => {
        const rows = data.filter((row) => !row.ada_selisih_hitung);
        if (rows.length === 0) {
          return <EmptyState menu="selisih sistem" kind="tidak" />;
        }
        return (
          <ReportTable title="Selisih terhadap sistem" headers={["Gudang", "Kode", "Nama", "On hand", "Hitung", "Selisih qty", "Selisih nilai"]}>
            {rows.map((row) => (
              <ReportRow key={`${row.gudang_id}-${row.kode_barang}`} className={row.zero_found ? "bg-[#f3d4a0]" : ""}>
                <Td>{row.gudang_nama}</Td>
                <Td>{row.kode_barang}</Td>
                <Td>
                  {row.nama_barang}
                  {row.zero_found ? " · tidak ditemukan" : ""}
                </Td>
                <Td>{row.qty_onhand}</Td>
                <Td>{row.qty_hitung}</Td>
                <Td>{row.selisih_qty}</Td>
                <Td>{row.selisih_nilai}</Td>
              </ReportRow>
            ))}
          </ReportTable>
        );
      }}
    </QueryView>
  );
}
