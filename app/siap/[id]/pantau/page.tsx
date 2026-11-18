import Link from "next/link";
import { SiapSubpage } from "@/app/siap/pantau-shell";
import { SessionIdPage } from "@/app/siap/session-id";
import { SAMPLE_DENAH_NOTE, coordinatorDenah, pantauHref, selesaiCaption } from "@/lib/monitor";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SessionIdPage params={params}>{(id) => <PantauHome id={id} />}</SessionIdPage>;
}

async function PantauHome({ id }: { id: string }) {
  const { gudang, pinned } = await coordinatorDenah(id);
  return (
    <SiapSubpage
      backHref={`/siap/${id}`}
      title="Pantau gudang"
      subtitle="Status tag dihitung dari pengumpulan dan hitungan, tidak disimpan di denah."
      legend
    >
      {gudang.length === 0 ? <p className="mt-6 text-sm">Sesi ini belum punya pin denah.</p> : null}
      {gudang.length > 0 && !pinned ? <p className="mt-6 text-sm text-[#6b6b6b]">{SAMPLE_DENAH_NOTE}</p> : null}
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {gudang.map((row) => (
          <li key={row.nama}>
            <Link href={pantauHref(id, row.nama)} className="block rounded-2xl bg-white p-5 shadow-sm">
              <p className="font-medium">{row.nama}</p>
              <p className="mt-1 text-sm text-[#6b6b6b]">{selesaiCaption(row)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </SiapSubpage>
  );
}
