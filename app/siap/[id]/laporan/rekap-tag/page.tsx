import { LaporanPage } from "@/app/siap/laporan-shell";
import { TAG_STATUS_LABEL, TAG_STATUSES } from "@/lib/monitor";
import { rekapTag } from "@/lib/reports";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <LaporanPage
      params={params}
      title="Rekap tag"
      subtitle="Jumlah tag pada tiap status. Status dihitung dari submission yang sudah masuk, bukan dari kolom yang disimpan di denah."
    >
      {(id) => <Body id={id} />}
    </LaporanPage>
  );
}

async function Body({ id }: { id: string }) {
  const { counts } = await rekapTag(id);
  return (
    <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {TAG_STATUSES.map((status) => (
        <li key={status} className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-[#6b6b6b]">{TAG_STATUS_LABEL[status]}</p>
          <p className="mt-2 text-2xl font-semibold">{counts[status] ?? 0}</p>
        </li>
      ))}
    </ul>
  );
}
