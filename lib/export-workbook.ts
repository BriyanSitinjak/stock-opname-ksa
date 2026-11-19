import { Prisma } from "@prisma/client";
import ExcelJS from "exceljs";
import { asExcelText } from "@/lib/excel-text";
import { kondisiReport, selisihHitung, selisihSistem, unknownItems } from "@/lib/reports";
import { displayedScope } from "@/lib/scope-display";
import { prisma } from "@/lib/db";
import { textPdf } from "@/lib/text-pdf";
import { qtyOrDash } from "@/lib/qty-display";

function applyPrint(sheet: ExcelJS.Worksheet) {
  sheet.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: "1:1",
  };
}

function header(sheet: ExcelJS.Worksheet, labels: string[]) {
  const row = sheet.addRow(labels);
  row.font = { bold: true };
}

function text(row: ExcelJS.Row, index: number, value: unknown) {
  const cell = row.getCell(index);
  cell.value = asExcelText(value);
  cell.numFmt = "@";
}

export async function exportSummary(sessionId: string) {
  const session = await prisma.opnameSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return null;
  }
  const scope = await displayedScope(session);
  const sistem = (await selisihSistem(sessionId)).filter((row) => !row.ada_selisih_hitung);
  const hitung = await selisihHitung(sessionId);
  const zero = sistem.filter((row) => row.zero_found);
  const kondisi = await kondisiReport(sessionId);
  const unknown = await unknownItems(sessionId);
  const notes = await prisma.$queryRaw<Array<{ qty_note: string | null }>>`
    SELECT qty_note FROM v_current_counts
    WHERE session_id = ${sessionId} AND qty_note IS NOT NULL
    ORDER BY qty_note
  `;
  const approvals = await prisma.approval.findMany({
    where: { sessionId },
    include: { approvedBy: { select: { nama: true } } },
    orderBy: { step: "asc" },
  });
  const totalNilai = sistem.reduce((acc, row) => acc.add(new Prisma.Decimal(row.selisih_nilai)), new Prisma.Decimal(0));
  return {
    session,
    scope,
    sistem,
    hitung,
    zero,
    kondisi,
    unknown,
    notes: notes.map((row) => row.qty_note).filter((row): row is string => Boolean(row)),
    approvals,
    total_selisih_nilai: totalNilai.toFixed(2),
  };
}

export async function buildWorkbook(sessionId: string) {
  const data = await exportSummary(sessionId);
  if (!data) {
    return null;
  }
  const wb = new ExcelJS.Workbook();
  wb.creator = "Stock Opname KSA";
  wb.lastModifiedBy = "Stock Opname KSA";

  const ringkasan = wb.addWorksheet("Ringkasan");
  applyPrint(ringkasan);
  header(ringkasan, ["Ringkasan"]);
  const lines: [string, string][] = [
    ["Sesi", data.session.nama],
    ["Periode", data.scope.periode],
    ["Cut off", data.scope.snapshot_at],
    ["Brand termasuk", data.scope.included.join(", ")],
    ["Brand tidak termasuk", data.scope.excluded.join(", ")],
    ["Group", data.scope.groups.join(", ")],
    ["Total selisih nilai", data.total_selisih_nilai],
    ["Baris selisih sistem", String(data.sistem.length)],
    ["Barang tidak ditemukan", String(data.zero.length)],
    ["Selisih hitung", String(data.hitung.length)],
  ];
  for (const [label, value] of lines) {
    const row = ringkasan.addRow([]);
    text(row, 1, label);
    text(row, 2, value);
  }
  for (const approval of data.approvals) {
    const row = ringkasan.addRow([]);
    text(row, 1, `Persetujuan ${approval.step}`);
    text(row, 2, `${approval.approvedBy.nama} · ${approval.approvedAt.toISOString()}`);
    text(row, 3, approval.catatan ?? "");
  }
  for (const note of data.notes) {
    const row = ringkasan.addRow([]);
    text(row, 1, "Catatan qty");
    text(row, 2, note);
  }

  const sistemSheet = wb.addWorksheet("Selisih Sistem");
  applyPrint(sistemSheet);
  header(sistemSheet, ["Gudang", "Kode", "Nama", "On hand", "Hitung", "Selisih qty", "Selisih nilai"]);
  for (const row of data.sistem) {
    const line = sistemSheet.addRow([]);
    text(line, 1, row.gudang_nama);
    text(line, 2, row.kode_barang);
    text(line, 3, row.nama_barang);
    line.getCell(4).value = Number(row.qty_onhand);
    line.getCell(5).value = Number(row.qty_hitung);
    line.getCell(6).value = Number(row.selisih_qty);
    line.getCell(7).value = Number(row.selisih_nilai);
  }

  const hitungSheet = wb.addWorksheet("Selisih Hitung");
  applyPrint(hitungSheet);
  header(hitungSheet, ["Tag", "Gudang", "Lokasi", "Kode", "Nama", "Hitung 1", "Hitung 2"]);
  for (const row of data.hitung) {
    const line = hitungSheet.addRow([]);
    text(line, 1, row.nomor);
    text(line, 2, row.gudang_nama);
    text(line, 3, row.lokasi_nama);
    text(line, 4, row.kode_barang);
    text(line, 5, row.nama_barang);
    text(line, 6, qtyOrDash(row.qty_1));
    text(line, 7, qtyOrDash(row.qty_2));
  }

  const zeroSheet = wb.addWorksheet("Barang Tidak Ditemukan");
  applyPrint(zeroSheet);
  header(zeroSheet, ["Gudang", "Kode", "Nama", "On hand"]);
  for (const row of data.zero) {
    const line = zeroSheet.addRow([]);
    text(line, 1, row.gudang_nama);
    text(line, 2, row.kode_barang);
    text(line, 3, row.nama_barang);
    line.getCell(4).value = Number(row.qty_onhand);
  }

  const kondisiSheet = wb.addWorksheet("Kondisi");
  applyPrint(kondisiSheet);
  header(kondisiSheet, ["Kode", "Nama", "Kondisi", "Qty"]);
  for (const row of data.kondisi) {
    const line = kondisiSheet.addRow([]);
    text(line, 1, row.barcode_4);
    text(line, 2, row.nama_barang);
    text(line, 3, row.kondisi);
    line.getCell(4).value = Number(row.qty);
  }

  const unknownSheet = wb.addWorksheet("Barang Tidak Dikenal");
  applyPrint(unknownSheet);
  header(unknownSheet, ["Tag", "Pass", "Kode", "Nama", "Qty", "Kondisi"]);
  for (const row of data.unknown) {
    const line = unknownSheet.addRow([]);
    text(line, 1, row.nomor);
    text(line, 2, String(row.pass));
    text(line, 3, row.kode_input);
    text(line, 4, row.nama_input);
    line.getCell(5).value = Number(row.qty);
    text(line, 6, row.kondisi);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return { buffer: Buffer.from(buffer), filename: `opname-${data.session.periode}.xlsx`, total: data.total_selisih_nilai };
}

export async function buildPdf(sessionId: string) {
  const data = await exportSummary(sessionId);
  if (!data) {
    return null;
  }
  const lines = [
    "Stock Opname KSA",
    data.session.nama,
    `Periode: ${data.scope.periode}`,
    `Cut off: ${data.scope.snapshot_at}`,
    `Brand termasuk: ${data.scope.included.join(", ")}`,
    `Brand tidak termasuk: ${data.scope.excluded.join(", ")}`,
    `Group: ${data.scope.groups.join(", ")}`,
    `Total selisih nilai: ${data.total_selisih_nilai}`,
    `Baris selisih sistem: ${data.sistem.length}`,
    `Barang tidak ditemukan: ${data.zero.length}`,
  ];
  for (const approval of data.approvals) {
    lines.push(`Persetujuan ${approval.step}: ${approval.approvedBy.nama} ${approval.approvedAt.toISOString()}`);
    if (approval.catatan) {
      lines.push(`Catatan ${approval.step}: ${approval.catatan}`);
    }
  }
  return { buffer: textPdf(lines), filename: `opname-${data.session.periode}.pdf` };
}
