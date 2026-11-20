import { RiwayatBoard } from "@/app/siap/riwayat/board";
import { SiapSubpage } from "@/app/siap/pantau-shell";

export default function Page() {
  return (
    <SiapSubpage
      backHref="/siap"
      title="Riwayat"
      subtitle="Setiap tindakan yang berhasil di Layar koordinator tercatat di sini, beserta akun dan waktunya. Password tidak pernah ditulis."
    >
      <RiwayatBoard />
    </SiapSubpage>
  );
}
