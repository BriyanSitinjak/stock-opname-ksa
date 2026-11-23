import { LaporanPage } from "@/app/siap/laporan-shell";
import { RekapTagView } from "./view";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <LaporanPage
      params={params}
      title="Rekap tag"
      subtitle="Jumlah tag pada tiap status. Status dihitung dari submission yang sudah masuk, bukan dari kolom yang disimpan di denah."
    >
      {(id) => <RekapTagView id={id} />}
    </LaporanPage>
  );
}
