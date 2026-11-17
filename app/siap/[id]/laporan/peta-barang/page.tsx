import { LaporanShell } from "@/app/siap/laporan-shell";
import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";
import { AwaitParams } from "@/app/siap/session-id";
import { SearchForm } from "@/app/siap/ui";
import { petaBarang } from "@/lib/reports";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kode?: string }>;
}) {
  return (
    <AwaitParams params={Promise.all([params, searchParams])}>
      {([route, query]) => <Body id={route.id} kode={(query.kode ?? "").trim()} />}
    </AwaitParams>
  );
}

async function Body({ id, kode }: { id: string; kode: string }) {
  const items = kode ? await petaBarang(id, kode) : [];
  return (
    <LaporanShell
      id={id}
      title="Peta barang"
      subtitle="Isi setelah hitungan disepakati. Nama lokasi dari pin sesi, bukan master denah."
    >
      <SearchForm
        action={`/siap/${id}/laporan/peta-barang`}
        name="kode"
        defaultValue={kode}
        placeholder="Barcode 4 digit"
      />
      {!kode ? <p className="mt-6 text-sm">Cari barcode untuk melihat lokasi setelah hitungan pertama selesai.</p> : null}
      {kode && items.length === 0 ? (
        <p className="mt-6 text-sm">Belum ada qty disepakati untuk kode {kode}.</p>
      ) : null}
      {items.length > 0 ? (
        <ReportTable headers={["Gudang", "Lokasi", "Tag", "Qty"]}>
          {items.map((row) => (
            <ReportRow key={`${row.gudang_nama}-${row.lokasi_nama}-${row.nomor}`}>
              <Td>{row.gudang_nama}</Td>
              <Td>{row.lokasi_nama}</Td>
              <Td>{row.nomor}</Td>
              <Td>{row.qty}</Td>
            </ReportRow>
          ))}
        </ReportTable>
      ) : null}
    </LaporanShell>
  );
}
