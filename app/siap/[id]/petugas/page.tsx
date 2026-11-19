import { PetugasList } from "@/app/siap/[id]/petugas/list";
import { SiapSubpage } from "@/app/siap/pantau-shell";
import { SessionIdPage } from "@/app/siap/session-id";
import { devicesForSession, formatSyncAge, PENDING_CAPTION } from "@/lib/monitor";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SessionIdPage params={params}>{(id) => <PetugasBody id={id} />}</SessionIdPage>;
}

async function PetugasBody({ id }: { id: string }) {
  const devices = await devicesForSession(id);
  return (
    <SiapSubpage
      backHref={`/siap/${id}`}
      title="Status petugas"
      subtitle={`${PENDING_CAPTION} Kotak menandai HP yang masih terikat. Warna amber berarti sync terakhir sudah lama. Lepas device supaya petugas yang sama bisa memilih nama di HP lain.`}
    >
      <PetugasList
        id={id}
        devices={devices.map((row) => ({
          device_id: row.device_id,
          nama: row.nama,
          last_sync_at: row.last_sync_at,
          pending_reported: row.pending_reported,
          stale: row.stale,
          age: formatSyncAge(row.last_sync_at),
        }))}
      />
    </SiapSubpage>
  );
}
