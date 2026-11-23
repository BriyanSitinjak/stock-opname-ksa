import { LaporanPage } from "@/app/siap/laporan-shell";
import { TidakDikenalView } from "./view";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <LaporanPage
      params={params}
      title="Barang tidak dikenal"
      subtitle="Barang yang diketik petugas di HP karena tidak ketemu di daftar snapshot. Qty dan kondisi tetap tercatat, tetapi tidak masuk perhitungan selisih sistem."
    >
      {(id) => <TidakDikenalView id={id} />}
    </LaporanPage>
  );
}
