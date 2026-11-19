import { LaporanPage } from "@/app/siap/laporan-shell";
import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";
import { selisihSistem } from "@/lib/reports";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <LaporanPage
      params={params}
      title="Selisih sistem"
      subtitle="Baris yang masih selisih hitung belum masuk. Qty hitung 0 vs stok sistem ditandai."
    >
      {(id) => <Body id={id} />}
    </LaporanPage>
  );
}

async function Body({ id }: { id: string }) {
  const rows = (await selisihSistem(id)).filter((row) => !row.ada_selisih_hitung);
  return (
    <ReportTable headers={["Gudang", "Kode", "Nama", "On hand", "Hitung", "Selisih qty", "Selisih nilai"]}>
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
}
