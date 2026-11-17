import { SiapSubpage } from "@/app/siap/pantau-shell";
import { SessionIdPage } from "@/app/siap/session-id";
import { devicesForSession, formatSyncAge, PENDING_CAPTION } from "@/lib/monitor";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SessionIdPage params={params}>{(id) => <PetugasBody id={id} />}</SessionIdPage>;
}

async function PetugasBody({ id }: { id: string }) {
  const devices = await devicesForSession(id);
  return (
    <SiapSubpage backHref={`/siap/${id}`} title="Status petugas" subtitle={PENDING_CAPTION}>
      <ul className="mt-6 flex flex-col gap-3">
        {devices.map((row) => (
          <li key={row.device_id} className={`rounded-2xl p-5 shadow-sm ${row.stale ? "bg-[#f3d4a0]" : "bg-white"}`}>
            <p className={row.stale ? "text-xl font-semibold" : "font-medium"}>{row.nama}</p>
            <p className="mt-1 text-sm">Perangkat {row.device_id}</p>
            <p className={`mt-2 ${row.stale ? "text-base font-medium" : "text-sm text-[#6b6b6b]"}`}>
              Sinkron terakhir: {formatSyncAge(row.last_sync_at)}
            </p>
            <p className="mt-1 text-sm">Belum terkirim (laporan HP): {row.pending_reported}</p>
          </li>
        ))}
      </ul>
    </SiapSubpage>
  );
}
