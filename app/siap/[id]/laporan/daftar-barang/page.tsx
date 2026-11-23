import { LaporanShell } from "@/app/siap/laporan-shell";
import { AwaitParams } from "@/app/siap/session-id";
import { DaftarLoad } from "./load";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string; gudang?: string; brand?: string }>;
}) {
  return (
    <AwaitParams params={Promise.all([params, searchParams])}>
      {([route, query]) => (
        <Body id={route.id} q={query.q ?? ""} page={query.page} gudang={query.gudang ?? ""} brand={query.brand ?? ""} />
      )}
    </AwaitParams>
  );
}

function Body({ id, q, page, gudang, brand }: { id: string; q: string; page?: string; gudang: string; brand: string }) {
  return (
    <LaporanShell
      id={id}
      title="Daftar barang"
      subtitle="Isi snapshot sesi ini. Pilih gudang dan brand dari daftar, lalu cari nama, kode, atau barcode. Tabel di bawah bergulir di tinggi tetap supaya halaman tidak memanjang."
    >
      <DaftarLoad id={id} q={q} page={page} gudang={gudang} brand={brand} />
    </LaporanShell>
  );
}
