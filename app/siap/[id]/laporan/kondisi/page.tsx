import { LaporanPage } from "@/app/siap/laporan-shell";
import { KondisiView } from "./view";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <LaporanPage
      params={params}
      title="Kondisi"
      subtitle="Ringkasan kondisi yang dicatat petugas: baik, rusak, atau kadaluarsa. Angka selisih tidak berubah karena catatan ini."
    >
      {(id) => <KondisiView id={id} />}
    </LaporanPage>
  );
}
