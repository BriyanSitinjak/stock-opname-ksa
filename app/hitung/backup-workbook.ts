import { asExcelText } from "@/lib/excel-text";
import { locatePrepareTagById } from "@/lib/prepare-locate";
import type {
  CountRow,
  PreparePayload,
  SubmissionRow,
  UnknownRow,
} from "@/lib/offline/queue";

type QueueSnapshot = {
  counts: CountRow[];
  submissions: SubmissionRow[];
  unknowns: UnknownRow[];
};

function stamp() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function safeFilePart(value: string) {
  return value.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "") || "data";
}

function textCell(row: { getCell: (index: number) => { value: unknown; numFmt: string } }, index: number, value: unknown) {
  const cell = row.getCell(index);
  cell.value = asExcelText(value);
  cell.numFmt = "@";
}

/** Offline safety copy of what this phone is about to sync. No harga fields. */
export async function downloadHitungBackup(
  prepare: PreparePayload,
  queue: QueueSnapshot,
): Promise<{ filename: string }> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Stock Opname KSA";
  wb.lastModifiedBy = prepare.counter.nama;

  const ringkasan = wb.addWorksheet("Ringkasan");
  const meta: [string, string][] = [
    ["Sesi", prepare.session.nama],
    ["Periode", prepare.session.periode],
    ["Petugas", prepare.counter.nama],
    ["Dibuat", new Date().toLocaleString("id-ID")],
    ["Barang", String(queue.counts.length)],
    ["Tidak dikenal", String(queue.unknowns.length)],
    ["Penutupan lorong", String(queue.submissions.length)],
  ];
  for (const [label, value] of meta) {
    const row = ringkasan.addRow([]);
    textCell(row, 1, label);
    textCell(row, 2, value);
  }
  ringkasan.getColumn(1).width = 22;
  ringkasan.getColumn(2).width = 36;

  const barang = wb.addWorksheet("Barang");
  const barangHeader = barang.addRow([
    "Lorong",
    "Lokasi",
    "Hitung ke",
    "Nomor tag",
    "Kode",
    "Barcode 4",
    "Nama barang",
    "Qty",
    "Catatan",
    "Waktu HP",
  ]);
  barangHeader.font = { bold: true };
  for (const count of queue.counts) {
    const place = locatePrepareTagById(prepare, count.tag_id);
    const item = prepare.items.find((row) => row.id === count.snapshot_item_id);
    const row = barang.addRow([]);
    textCell(row, 1, place?.nomor ?? count.tag_id);
    textCell(row, 2, place?.lokasi ?? "—");
    textCell(row, 3, String(count.pass));
    textCell(row, 4, count.nomor_kartu ?? "");
    textCell(row, 5, item?.kode_barang ?? "");
    textCell(row, 6, item?.barcode_4 ?? "");
    textCell(row, 7, item?.nama_barang ?? count.snapshot_item_id);
    textCell(row, 8, count.qty);
    textCell(row, 9, count.qty_note ?? "");
    textCell(row, 10, count.client_created_at);
  }

  const unknown = wb.addWorksheet("Tidak Dikenal");
  const unknownHeader = unknown.addRow([
    "Lorong",
    "Lokasi",
    "Hitung ke",
    "Kode input",
    "Nama input",
    "Qty",
    "Waktu HP",
  ]);
  unknownHeader.font = { bold: true };
  for (const rowData of queue.unknowns) {
    const place = locatePrepareTagById(prepare, rowData.tag_id);
    const row = unknown.addRow([]);
    textCell(row, 1, place?.nomor ?? rowData.tag_id);
    textCell(row, 2, place?.lokasi ?? "—");
    textCell(row, 3, String(rowData.pass));
    textCell(row, 4, rowData.kode_input ?? "");
    textCell(row, 5, rowData.nama_input ?? "");
    textCell(row, 6, rowData.qty);
    textCell(row, 7, rowData.client_created_at);
  }

  const tutup = wb.addWorksheet("Penutupan Lorong");
  const tutupHeader = tutup.addRow(["Lorong", "Lokasi", "Hitung ke", "Nomor tag", "Status", "Waktu HP"]);
  tutupHeader.font = { bold: true };
  for (const sub of queue.submissions) {
    const place = locatePrepareTagById(prepare, sub.tag_id);
    const row = tutup.addRow([]);
    textCell(row, 1, place?.nomor ?? sub.tag_id);
    textCell(row, 2, place?.lokasi ?? "—");
    textCell(row, 3, String(sub.pass));
    textCell(row, 4, sub.nomor_kartu ?? "");
    textCell(row, 5, sub.is_empty ? "Kosong" : "Selesai");
    textCell(row, 6, sub.client_created_at);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `cadangan-hitung-${safeFilePart(prepare.session.periode)}-${safeFilePart(prepare.counter.nama)}-${stamp()}.xlsx`;
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return { filename };
}
