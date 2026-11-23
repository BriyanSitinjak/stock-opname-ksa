import { PetugasBody, RefreshStatusButton } from "@/app/siap/[id]/petugas/list";
import { SiapSubpage } from "@/app/siap/pantau-shell";
import { SessionIdPage } from "@/app/siap/session-id";
import { PENDING_CAPTION } from "@/lib/sync-age";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SessionIdPage params={params}>{(id) => <PetugasScreen id={id} />}</SessionIdPage>;
}

function PetugasScreen({ id }: { id: string }) {
  return (
    <SiapSubpage
      backHref={`/siap/${id}`}
      title="Status petugas"
      subtitle={`${PENDING_CAPTION} Kotak menandai HP yang masih terikat. Warna amber berarti sync terakhir sudah lama. Lepas device supaya petugas yang sama bisa memilih nama di HP lain.`}
      action={<RefreshStatusButton id={id} />}
    >
      <PetugasBody id={id} />
    </SiapSubpage>
  );
}
