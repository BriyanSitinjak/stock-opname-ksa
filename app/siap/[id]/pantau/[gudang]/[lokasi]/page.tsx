import { MissingPin, SiapSubpage } from "@/app/siap/pantau-shell";
import { AwaitParams } from "@/app/siap/session-id";
import { pantauHref, selesaiCaption, sessionDenah } from "@/lib/monitor";
import { LokasiDenah } from "./denah";

export default function Page({
  params,
}: {
  params: Promise<{ id: string; gudang: string; lokasi: string }>;
}) {
  return (
    <AwaitParams params={params}>
      {(value) => <PantauLokasi id={value.id} gudang={value.gudang} lokasi={value.lokasi} />}
    </AwaitParams>
  );
}

async function PantauLokasi({ id, gudang, lokasi }: { id: string; gudang: string; lokasi: string }) {
  const gudangNama = decodeURIComponent(gudang);
  const lokasiNama = decodeURIComponent(lokasi);
  const match = (await sessionDenah(id)).find((row) => row.nama === gudangNama)?.lokasi.find((row) => row.nama === lokasiNama);
  if (!match) {
    return <MissingPin href={pantauHref(id, gudangNama)}>Lokasi tidak ada di pin sesi ini.</MissingPin>;
  }
  return (
    <SiapSubpage backHref={pantauHref(id, gudangNama)} title={`${gudangNama} · ${match.nama}`} subtitle={selesaiCaption(match)} legend>
      <LokasiDenah tags={match.tags} />
    </SiapSubpage>
  );
}
