import { LaporanShell } from "@/app/siap/laporan-shell";
import { AwaitParams } from "@/app/siap/session-id";
import { PetaBarangView } from "./view";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kode?: string }>;
}) {
  return (
    <AwaitParams params={Promise.all([params, searchParams])}>
      {([route, query]) => (
        <LaporanShell
          id={route.id}
          title="Peta barang"
          subtitle="Mencari di pin sesi, bukan di master denah. Lokasi muncul setelah pass 1 selesai dan qty pada tag itu sudah disepakati."
        >
          <PetaBarangView id={route.id} kode={(query.kode ?? "").trim()} />
        </LaporanShell>
      )}
    </AwaitParams>
  );
}
