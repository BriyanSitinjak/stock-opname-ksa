import { LaporanShell } from "@/app/siap/laporan-shell";
import { AwaitParams } from "@/app/siap/session-id";
import { daftarBarang } from "@/lib/reports";
import { DaftarBrowse } from "./browse";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  return (
    <AwaitParams params={Promise.all([params, searchParams])}>
      {([route, query]) => <Body id={route.id} q={query.q ?? ""} page={query.page} />}
    </AwaitParams>
  );
}

async function Body({ id, q, page }: { id: string; q: string; page?: string }) {
  const parsed = Number.parseInt(page ?? "1", 10);
  const data = await daftarBarang(id, { q: q || undefined, page: Number.isFinite(parsed) ? parsed : 1 });
  return (
    <LaporanShell id={id} title="Daftar barang">
      <DaftarBrowse id={id} items={data.items} total={data.total} page={data.page} take={data.take} q={q} />
    </LaporanShell>
  );
}
