import { EmptyState } from "@/app/empty-state";
import { LaporanPage } from "@/app/siap/laporan-shell";
import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";
import { unknownItems } from "@/lib/reports";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <LaporanPage
      params={params}
      title="Barang tidak dikenal"
      subtitle="Barang yang diketik petugas di HP karena tidak ketemu di daftar snapshot. Qty dan kondisi tetap tercatat, tetapi tidak masuk perhitungan selisih sistem."
    >
      {(id) => <Body id={id} />}
    </LaporanPage>
  );
}

async function Body({ id }: { id: string }) {
  const rows = await unknownItems(id);
  return (
    <>
      {rows.length === 0 ? <EmptyState menu="barang tidak dikenal" /> : null}
      {rows.length > 0 ? (
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
      ) : null}
    </>
  );
}
