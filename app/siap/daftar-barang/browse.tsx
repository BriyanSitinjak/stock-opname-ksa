"use client";

import { useRouter } from "next/navigation";
import { EmptyState } from "@/app/empty-state";
import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";
import { SearchForm, Select } from "@/app/siap/ui";

export type DaftarItem = {
  id: string;
  kode_barang: string;
  nama_barang: string;
  nama_brand: string | null;
  gudang_nama: string;
  qty_onhand: string;
};

export type GudangChoice = { id: string; nama: string };

export function DaftarBrowse({
  items,
  total,
  page,
  take,
  q,
  gudang,
  brand,
  gudangChoices,
  brandChoices,
}: {
  items: DaftarItem[];
  total: number;
  page: number;
  take: number;
  q: string;
  gudang: string;
  brand: string;
  gudangChoices: GudangChoice[];
  brandChoices: string[];
}) {
  const router = useRouter();

  function href(next: { page?: number; q?: string; gudang?: string; brand?: string }) {
    const params = new URLSearchParams();
    const query = next.q ?? q;
    const gudangId = next.gudang ?? gudang;
    const brandName = next.brand ?? brand;
    const nextPage = next.page ?? 1;
    if (query) {
      params.set("q", query);
    }
    if (gudangId) {
      params.set("gudang", gudangId);
    }
    if (brandName) {
      params.set("brand", brandName);
    }
    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }
    const suffix = params.toString();
    return `/siap/daftar-barang${suffix ? `?${suffix}` : ""}`;
  }

  const filtered = Boolean(q || gudang || brand);

  return (
    <>
      <SearchForm
        action="/siap/daftar-barang"
        name="q"
        defaultValue={q}
        placeholder="Nama, kode, atau barcode"
        hidden={{ gudang, brand }}
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <label className="block min-w-48 text-sm text-[#6b6b6b]">
          Gudang
          <Select className="mt-1 block w-full" value={gudang} onChange={(event) => router.push(href({ page: 1, gudang: event.target.value }))}>
            <option value="">Semua</option>
            {gudangChoices.map((row) => (
              <option key={row.id} value={row.id}>
                {row.nama}
              </option>
            ))}
          </Select>
        </label>
        <label className="block min-w-56 text-sm text-[#6b6b6b]">
          Brand
          <Select className="mt-1 block w-full" value={brand} onChange={(event) => router.push(href({ page: 1, brand: event.target.value }))}>
            <option value="">Semua</option>
            {brandChoices.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <p className="mt-3 text-sm text-[#6b6b6b]">{total} barang</p>
      {items.length === 0 ? <EmptyState menu="barang" kind={filtered ? "tidak" : "belum"} /> : null}
      {items.length > 0 ? (
        <ReportTable title="Stok master" headers={["Gudang", "Kode", "Nama", "Brand", "Qty on hand"]}>
          {items.map((row) => (
            <ReportRow key={row.id}>
              <Td>{row.gudang_nama}</Td>
              <Td>{row.kode_barang}</Td>
              <Td>{row.nama_barang}</Td>
              <Td>{row.nama_brand}</Td>
              <Td>{row.qty_onhand}</Td>
            </ReportRow>
          ))}
        </ReportTable>
      ) : null}
      <div className="mt-4 flex gap-3 text-sm">
        {page > 1 ? (
          <a className="text-ksa-teal-deep" href={href({ page: page - 1 })}>
            Previous
          </a>
        ) : null}
        {page * take < total ? (
          <a className="text-ksa-teal-deep" href={href({ page: page + 1 })}>
            Next
          </a>
        ) : null}
      </div>
    </>
  );
}
