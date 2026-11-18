import Link from "next/link";
import { MissingPin, SiapSubpage } from "@/app/siap/pantau-shell";
import { AwaitParams } from "@/app/siap/session-id";
import { coordinatorGudang, pantauHref, selesaiCaption } from "@/lib/monitor";

export default function Page({ params }: { params: Promise<{ id: string; gudang: string }> }) {
  return <AwaitParams params={params}>{(value) => <PantauGudang id={value.id} gudang={value.gudang} />}</AwaitParams>;
}

async function PantauGudang({ id, gudang }: { id: string; gudang: string }) {
  const nama = decodeURIComponent(gudang);
  const match = await coordinatorGudang(id, nama);
  if (!match) {
    return <MissingPin href={pantauHref(id)}>Gudang tidak ada di pin sesi ini.</MissingPin>;
  }
  return (
    <SiapSubpage backHref={pantauHref(id)} title={match.nama} subtitle={selesaiCaption(match)} legend>
      <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {match.lokasi.map((lokasi) => {
          const pct = lokasi.total === 0 ? 0 : Math.round((lokasi.selesai / lokasi.total) * 100);
          return (
            <li key={lokasi.nama} className="min-h-[140px]">
              <Link
                href={pantauHref(id, match.nama, lokasi.nama)}
                className="flex h-full flex-col rounded-2xl bg-white p-4 shadow-sm"
              >
                <p className="font-medium">{lokasi.nama}</p>
                <p className="mt-1 text-sm text-[#6b6b6b]">
                  {lokasi.selesai}/{lokasi.total}
                </p>
                <div className="mt-3 h-2 w-full bg-[#ece7dc]" aria-hidden>
                  <div className="h-2 bg-ksa-teal" style={{ width: `${pct}%` }} />
                </div>
                {lokasi.selisih_hitung > 0 ? (
                  <p className="mt-auto pt-3 text-sm font-medium">≠ {lokasi.selisih_hitung} selisih hitung</p>
                ) : (
                  <p className="mt-auto pt-3 text-sm text-[#6b6b6b]">Tidak ada selisih hitung</p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </SiapSubpage>
  );
}
