import { EmptyState } from "@/app/empty-state";
import { LaporanPage } from "@/app/siap/laporan-shell";
import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";
import { kondisiReport } from "@/lib/reports";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <LaporanPage
      params={params}
      title="Kondisi"
      subtitle="Ringkasan kondisi yang dicatat petugas: baik, rusak, atau kadaluarsa. Angka selisih tidak berubah karena catatan ini."
    >
      {(id) => <Body id={id} />}
    </LaporanPage>
  );
}

async function Body({ id }: { id: string }) {
  const rows = await kondisiReport(id);
  if (rows.length === 0) {
    return <EmptyState menu="kondisi" />;
  }
  return (
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
  );
}
