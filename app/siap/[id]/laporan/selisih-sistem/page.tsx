import { LaporanPage } from "@/app/siap/laporan-shell";
import { SelisihSistemView } from "./view";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <LaporanPage
      params={params}
      title="Selisih sistem"
      subtitle="Membandingkan qty hitung yang sudah disepakati dengan qty on hand di snapshot. Baris yang masih selisih hitung tidak masuk. Qty hitung 0 terhadap stok sistem ditandai sebagai tidak ditemukan."
    >
      {(id) => <SelisihSistemView id={id} />}
    </LaporanPage>
  );
}
