import { PantauHome } from "@/app/siap/[id]/pantau/home";
import { SiapSubpage } from "@/app/siap/pantau-shell";
import { SessionIdPage } from "@/app/siap/session-id";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SessionIdPage params={params}>{(id) => <PantauScreen id={id} />}</SessionIdPage>;
}

function PantauScreen({ id }: { id: string }) {
  return (
    <SiapSubpage
      backHref={`/siap/${id}`}
      title="Pantau gudang"
      subtitle="Status tiap tag dihitung dari submission dan count yang sudah masuk. Angka itu tidak disimpan sebagai kolom di denah, jadi denah tetap mengikuti pin sesi."
      legend
    >
      <PantauHome id={id} />
    </SiapSubpage>
  );
}
