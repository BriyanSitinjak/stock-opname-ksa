import { ReportRow, ReportTable, Td } from "@/app/siap/report-table";
import { SearchForm } from "@/app/siap/ui";

type Item = {
  id: string;
  barcode_4: string | null;
  nama_barang: string;
  nama_brand: string | null;
  gudang_nama: string;
  qty_onhand: string;
};

export function DaftarBrowse({
  id,
  items,
  total,
  page,
  take,
  q,
}: {
  id: string;
  items: Item[];
  total: number;
  page: number;
  take: number;
  q: string;
}) {
  function href(nextPage: number, query: string) {
    const params = new URLSearchParams();
    if (query) {
      params.set("q", query);
    }
    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }
    const suffix = params.toString();
    return `/siap/${id}/laporan/daftar-barang${suffix ? `?${suffix}` : ""}`;
  }

  return (
    <>
      <SearchForm
        action={`/siap/${id}/laporan/daftar-barang`}
        name="q"
        defaultValue={q}
        placeholder="Nama, kode, atau barcode"
      />
      <p className="mt-3 text-sm text-[#6b6b6b]">{total} barang</p>
      <ReportTable headers={["Gudang", "Kode", "Nama", "Brand", "Qty on hand"]}>
        {items.map((row) => (
          <ReportRow key={row.id}>
            <Td>{row.gudang_nama}</Td>
            <Td>{row.barcode_4}</Td>
            <Td>{row.nama_barang}</Td>
            <Td>{row.nama_brand}</Td>
            <Td>{row.qty_onhand}</Td>
          </ReportRow>
        ))}
      </ReportTable>
      <div className="mt-4 flex gap-3 text-sm">
        {page > 1 ? (
          <a className="text-ksa-teal-deep" href={href(page - 1, q)}>
            Sebelumnya
          </a>
        ) : null}
        {page * take < total ? (
          <a className="text-ksa-teal-deep" href={href(page + 1, q)}>
            Berikutnya
          </a>
        ) : null}
      </div>
    </>
  );
}
