import { Prisma } from "@prisma/client";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { parseCsv, type RawRow } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { importFileList } from "@/lib/import-kinds";

const MAX_BYTES = 10 * 1024 * 1024;
const REQUIRED = ["Nama_Gudang", "Kode_Barang", "Nama_Barang", "Qty_OnHand", "Harga_Satuan"] as const;

export type ImportError = { code: string; message: string };
export type ImportPreview = {
  rowCount: number;
  filteredCount: number;
  gudangBreakdown: Record<string, number>;
  items: number;
  emptyHargaCount: number;
  missingBarcodeCount: number;
};

type ScopeFilter = { brands?: string[]; groups?: string[] };

export async function parseImportFile(
  filename: string,
  bytes: Buffer,
): Promise<{ rows: RawRow[] } | { error: ImportError }> {
  if (bytes.length > MAX_BYTES) {
    return { error: { code: "file_too_large", message: "Berkas terlalu besar (maksimum 10 MB)." } };
  }
  const lower = filename.trim().toLowerCase();
  const head = bytes.subarray(0, 4);
  const magic = head.toString("binary");
  if (lower.endsWith(".exe") || magic.startsWith("MZ")) {
    return fileTypeError();
  }
  if (lower.endsWith(".xls")) {
    try {
      return { rows: parseXls(bytes) };
    } catch {
      return fileTypeError();
    }
  }
  if (lower.endsWith(".xlsx") || magic.startsWith("PK")) {
    if (!lower.endsWith(".xlsx")) {
      return fileTypeError();
    }
    return { rows: await parseXlsx(bytes) };
  }
  if (!lower.endsWith(".csv")) {
    return fileTypeError();
  }
  return { rows: parseCsv(bytes.toString("utf8")) };
}

function fileTypeError(): { error: ImportError } {
  return { error: { code: "file_type", message: `Hanya ${importFileList("dan")} yang diterima.` } };
}

function parseXls(bytes: Buffer): RawRow[] {
  const workbook = XLSX.read(bytes, { type: "buffer", cellDates: false });
  let fallback: RawRow[] = [];
  for (const name of workbook.SheetNames) {
    const rows = rowsFromMatrix(workbook.Sheets[name]);
    if (rows.some((row) => hasRequiredColumns(Object.keys(row)))) {
      return rows;
    }
    if (fallback.length === 0) {
      fallback = rows;
    }
  }
  return fallback;
}

function rowsFromMatrix(sheet: XLSX.WorkSheet | undefined): RawRow[] {
  if (!sheet) {
    return [];
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: false,
  });
  const found = matrix.findIndex((row) =>
    hasRequiredColumns((row ?? []).map((cell) => String(cell ?? "").trim())),
  );
  const headerIndex = found >= 0 ? found : 0;
  const headers = (matrix[headerIndex] ?? []).map((cell) => String(cell ?? ""));
  const rows: RawRow[] = [];
  for (const line of matrix.slice(headerIndex + 1)) {
    const raw = rawRow(headers, (column) => line?.[column]);
    if (Object.keys(raw).length > 0) {
      rows.push(raw);
    }
  }
  return rows;
}

function hasRequiredColumns(names: Iterable<string>): boolean {
  const present = new Set(names);
  return REQUIRED.every((column) => present.has(column));
}

async function parseXlsx(bytes: Buffer): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return [];
  }
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = String(cell.value ?? "").trim();
  });
  const rows: RawRow[] = [];
  sheet.eachRow((row, number) => {
    if (number === 1) {
      return;
    }
    rows.push(rawRow(headers, (index) => row.getCell(index + 1).value));
  });
  return rows;
}

function rawRow(headers: string[], valueAt: (index: number) => unknown): RawRow {
  const raw: RawRow = {};
  headers.forEach((header, index) => {
    const key = header.trim();
    if (!key) {
      return;
    }
    raw[key] = cellToText(valueAt(index));
  });
  return raw;
}

function cellToText(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text;
  }
  if (typeof value === "object" && "result" in value) {
    return cellToText((value as { result: unknown }).result);
  }
  return String(value);
}

export function validateAndAggregate(
  rows: RawRow[],
  gudangByNama: Map<string, { id: string; nama: string }>,
  scope: ScopeFilter,
): { error: ImportError } | { preview: ImportPreview; items: AggregatedItem[]; raw: RawRow[] } {
  if (rows.length === 0) {
    return {
      error: {
        code: "zero_rows",
        message: "Tidak ada baris yang lolos filter merek. Periksa nama merek pada berkas.",
      },
    };
  }
  const headers = new Set(Object.keys(rows[0] ?? {}));
  for (const col of REQUIRED) {
    if (!headers.has(col)) {
      return {
        error: { code: "missing_column", message: `Kolom wajib tidak ada: ${col}.` },
      };
    }
  }

  const unknown: { row: number; nama: string }[] = [];
  rows.forEach((row, i) => {
    const nama = row.Nama_Gudang ?? "";
    if (!gudangByNama.has(nama)) {
      unknown.push({ row: i + 2, nama });
    }
  });
  if (unknown.length > 0) {
    return {
      error: {
        code: "unknown_gudang",
        message: `Nama_Gudang tidak dikenal pada baris ${unknown[0]?.row}: ${unknown[0]?.nama}. Jumlah baris bermasalah: ${unknown.length}.`,
      },
    };
  }

  const brands = scope.brands ?? [];
  const groups = scope.groups ?? [];
  const kept = rows.filter((row) => inScope(row, brands, groups));
  const filteredCount = rows.length - kept.length;
  if (kept.length === 0) {
    return {
      error: {
        code: "zero_rows",
        message: `Tidak ada baris yang lolos filter merek (${brands.join(", ")}).`,
      },
    };
  }

  const byBarcode = new Map<string, Set<string>>();
  for (const row of kept) {
    const barcode = barcodeOf(row);
    const kode = row.Kode_Barang ?? "";
    if (!barcode) {
      continue;
    }
    const set = byBarcode.get(barcode) ?? new Set<string>();
    set.add(kode);
    byBarcode.set(barcode, set);
  }
  for (const [barcode, kodes] of byBarcode) {
    if (kodes.size > 1) {
      const names = kept
        .filter((row) => barcodeOf(row) === barcode)
        .map((row) => row.Nama_Barang)
        .filter((name, i, arr) => arr.indexOf(name) === i);
      return {
        error: {
          code: "duplicate_barcode",
          message: `barcode_4 ${barcode} dipakai lebih dari satu Kode_Barang: ${names.join(", ")}.`,
        },
      };
    }
  }

  const aggregated = new Map<string, AggregatedItem>();
  const gudangBreakdown: Record<string, number> = {};
  let emptyHargaCount = 0;
  let missingBarcodeCount = 0;
  for (const row of kept) {
    if (!(row.Harga_Satuan ?? "").trim()) {
      emptyHargaCount += 1;
    }
    if (!barcodeOf(row)) {
      missingBarcodeCount += 1;
    }
    const gudangNama = row.Nama_Gudang ?? "";
    const gudang = gudangByNama.get(gudangNama);
    if (!gudang) {
      continue;
    }
    gudangBreakdown[gudangNama] = (gudangBreakdown[gudangNama] ?? 0) + 1;
    const key = `${gudang.id}\0${row.Kode_Barang}`;
    const qty = new Prisma.Decimal(row.Qty_OnHand || "0");
    const harga = new Prisma.Decimal(row.Harga_Satuan || "0");
    const existing = aggregated.get(key);
    if (!existing) {
      aggregated.set(key, {
        gudangId: gudang.id,
        kodeBarang: row.Kode_Barang ?? "",
        barcode4: barcodeOf(row),
        namaBarang: row.Nama_Barang ?? "",
        kodeBrand: emptyToNull(row.Kode_Brand),
        namaBrand: emptyToNull(row.Nama_Brand),
        kodeGroup: emptyToNull(row.Kode_Group),
        namaGroup: emptyToNull(row.Nama_Group),
        qtyOnhand: qty,
        hargaSatuan: harga,
        sourceRowCount: 1,
      });
    } else {
      existing.qtyOnhand = existing.qtyOnhand.add(qty);
      if (harga.greaterThan(existing.hargaSatuan)) {
        existing.hargaSatuan = harga;
      }
      existing.sourceRowCount += 1;
    }
  }

  return {
    preview: {
      rowCount: rows.length,
      filteredCount,
      gudangBreakdown,
      items: aggregated.size,
      emptyHargaCount,
      missingBarcodeCount,
    },
    items: [...aggregated.values()],
    raw: rows,
  };
}

export async function commitImport(sessionId: string, raw: RawRow[], items: AggregatedItem[]) {
  await prisma.$transaction(async (tx) => {
    await tx.importRow.createMany({
      data: raw.map((row, index) => ({
        sessionId,
        rowNumber: index + 1,
        raw: row as Prisma.InputJsonValue,
      })),
    });
    await tx.snapshotItem.createMany({
      data: items.map((item) => ({
        sessionId,
        gudangId: item.gudangId,
        kodeBarang: item.kodeBarang,
        barcode4: item.barcode4,
        namaBarang: item.namaBarang,
        kodeBrand: item.kodeBrand,
        namaBrand: item.namaBrand,
        kodeGroup: item.kodeGroup,
        namaGroup: item.namaGroup,
        qtyOnhand: item.qtyOnhand,
        hargaSatuan: item.hargaSatuan,
        sourceRowCount: item.sourceRowCount,
      })),
    });
  });
}

export type AggregatedItem = {
  gudangId: string;
  kodeBarang: string;
  barcode4: string;
  namaBarang: string;
  kodeBrand: string | null;
  namaBrand: string | null;
  kodeGroup: string | null;
  namaGroup: string | null;
  qtyOnhand: Prisma.Decimal;
  hargaSatuan: Prisma.Decimal;
  sourceRowCount: number;
};

function inScope(row: RawRow, brands: string[], groups: string[]): boolean {
  const brandOk = brands.length === 0 || brands.includes(row.Nama_Brand ?? "");
  const groupOk = groups.length === 0 || groups.includes(row.Nama_Group ?? "");
  return brandOk && groupOk;
}

function barcodeOf(row: RawRow): string {
  return row.barcode_4 || row.Barcode_4 || row.Barcode || "";
}

function emptyToNull(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  return value;
}
