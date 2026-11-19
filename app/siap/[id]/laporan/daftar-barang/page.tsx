import { LaporanShell } from "@/app/siap/laporan-shell";
import { AwaitParams } from "@/app/siap/session-id";
import { daftarBarang, daftarBarangChoices } from "@/lib/reports";
import { DaftarBrowse } from "./browse";

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

async function Body({ id, q, page, gudang, brand }: { id: string; q: string; page?: string; gudang: string; brand: string }) {
  const parsed = Number.parseInt(page ?? "1", 10);
  const [data, choices] = await Promise.all([
    daftarBarang(id, {
      q: q || undefined,
      gudang_id: gudang || undefined,
      brand: brand || undefined,
      page: Number.isFinite(parsed) ? parsed : 1,
    }),
    daftarBarangChoices(id),
  ]);
  return (
    <LaporanShell
      id={id}
      title="Daftar barang"
      subtitle="Isi snapshot sesi ini. Pilih gudang dan brand dari daftar, lalu cari nama, kode, atau barcode. Tabel di bawah bergulir di tinggi tetap supaya halaman tidak memanjang."
    >
      <DaftarBrowse
        id={id}
        items={data.items}
        total={data.total}
        page={data.page}
        take={data.take}
        q={q}
        gudang={gudang}
        brand={brand}
        gudangChoices={choices.gudang}
        brandChoices={choices.brands}
      />
    </LaporanShell>
  );
}
