"use client";

import { EmptyState } from "@/app/empty-state";
import { QueryView } from "@/app/siap/query";
import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";
import { SearchForm } from "@/app/siap/ui";

type Item = { gudang_nama: string; lokasi_nama: string; nomor: string; qty: string };

export function PetaBarangView({ id, kode }: { id: string; kode: string }) {
  return (
    <>
      <SearchForm action={`/siap/${id}/laporan/peta-barang`} name="kode" defaultValue={kode} placeholder="Barcode 4 digit" />
      {!kode ? <p className="mt-6 text-sm">Cari barcode untuk lihat lokasi setelah pass 1 selesai.</p> : null}
      {kode ? (
        <QueryView<{ items: Item[] }> path={`/api/sessions/${id}/peta-barang`} props={{ kode }}>
          {(data) =>
            data.items.length === 0 ? (
              <EmptyState menu={`barang untuk kode ${kode}`} />
            ) : (
              <ReportTable title="Lokasi pin" headers={["Gudang", "Lokasi", "Tag", "Qty"]}>
                {data.items.map((row) => (
                  <ReportRow key={`${row.gudang_nama}-${row.lokasi_nama}-${row.nomor}`}>
                    <Td>{row.gudang_nama}</Td>
                    <Td>{row.lokasi_nama}</Td>
                    <Td>{row.nomor}</Td>
                    <Td>{row.qty}</Td>
                  </ReportRow>
                ))}
              </ReportTable>
            )
          }
        </QueryView>
      ) : null}
    </>
  );
}
