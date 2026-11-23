import { FloorBoard } from "@/app/siap/denah/board";
import { SiapSubpage } from "@/app/siap/pantau-shell";

export default function Page() {
  return (
    <SiapSubpage
      backHref="/siap"
      title="Denah gudang"
      subtitle="Gambar ini dibaca dari daftar posisi di lantai. Sel kosong di dalam rak bukan posisi. Sesi yang sedang berjalan tetap memakai tag yang sudah dipin. Nomor pada kartu diketik petugas saat menghitung."
    >
      <FloorBoard />
    </SiapSubpage>
  );
}
