import { LaporanPage } from "@/app/siap/laporan-shell";
import { SelisihHitungView } from "./view";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <LaporanPage params={params} title="Selisih hitung">
      {(id) => <SelisihHitungView id={id} />}
    </LaporanPage>
  );
}
