import { AwaitParams } from "@/app/siap/session-id";
import { PageLead } from "@/app/siap/ui";
import { DaftarLoad } from "./load";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; gudang?: string; brand?: string }>;
}) {
  return (
    <AwaitParams params={searchParams}>
      {(query) => (
        <>
          <h1 className="text-2xl font-semibold">Daftar barang</h1>
          <PageLead>Stok master untuk seluruh gudang. Sesi menyalin daftar ini saat dibuka.</PageLead>
          <DaftarLoad q={query.q ?? ""} page={query.page} gudang={query.gudang ?? ""} brand={query.brand ?? ""} />
        </>
      )}
    </AwaitParams>
  );
}
