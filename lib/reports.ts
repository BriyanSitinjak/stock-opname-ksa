import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseId } from "@/lib/ids";
import { sessionDenah } from "@/lib/monitor";
import { decString } from "@/lib/qty-display";

export type PassCompareRow = {
  snapshot_item_id: string;
  barcode_4: string | null;
  nama_barang: string;
  qty_1: string | null;
  qty_2: string | null;
};

type HitRow = {
  tag_id: string;
  snapshot_item_id: string;
  qty_1: unknown;
  qty_2: unknown;
  nomor: string;
  lokasi_nama: string;
  gudang_nama: string;
  barcode_4: string | null;
  kode_barang: string;
  nama_barang: string;
  pass_1_nama: string | null;
  pass_2_nama: string | null;
  pass_3_user_id: string | null;
};

export async function selisihHitung(sessionId: string) {
  const rows = await prisma.$queryRaw<HitRow[]>`
    SELECT sh.tag_id, sh.snapshot_item_id, sh.qty_1, sh.qty_2,
           st.nomor, st.lokasi_nama, st.gudang_nama,
           si.barcode_4, si.kode_barang, si.nama_barang,
           u1.nama AS pass_1_nama,
           u2.nama AS pass_2_nama,
           a3.user_id AS pass_3_user_id
    FROM v_selisih_hitung sh
    JOIN session_tags st
      ON st.session_id = sh.session_id AND st.tag_id = sh.tag_id
    JOIN snapshot_items si ON si.id = sh.snapshot_item_id
    LEFT JOIN tag_assignments a1
      ON a1.session_id = sh.session_id AND a1.tag_id = sh.tag_id AND a1.pass = 1
    LEFT JOIN users u1 ON u1.id = a1.user_id
    LEFT JOIN tag_assignments a2
      ON a2.session_id = sh.session_id AND a2.tag_id = sh.tag_id AND a2.pass = 2
    LEFT JOIN users u2 ON u2.id = a2.user_id
    LEFT JOIN tag_assignments a3
      ON a3.session_id = sh.session_id AND a3.tag_id = sh.tag_id AND a3.pass = 3
    WHERE sh.session_id = ${sessionId}
    ORDER BY st.gudang_nama, st.lokasi_nama, st.urutan, si.nama_barang
  `;
  return rows.map((row) => ({
    tag_id: row.tag_id,
    snapshot_item_id: row.snapshot_item_id,
    nomor: row.nomor,
    lokasi_nama: row.lokasi_nama,
    gudang_nama: row.gudang_nama,
    barcode_4: row.barcode_4,
    kode_barang: row.kode_barang,
    nama_barang: row.nama_barang,
    qty_1: decString(row.qty_1),
    qty_2: decString(row.qty_2),
    pass_1_nama: row.pass_1_nama,
    pass_2_nama: row.pass_2_nama,
    pass_3_user_id: row.pass_3_user_id,
  }));
}

type CompareRaw = {
  tag_id: string;
  snapshot_item_id: string;
  barcode_4: string | null;
  nama_barang: string;
  qty_1: unknown;
  qty_2: unknown;
};

function toCompare(row: CompareRaw): PassCompareRow {
  return {
    snapshot_item_id: row.snapshot_item_id,
    barcode_4: row.barcode_4,
    nama_barang: row.nama_barang,
    qty_1: decString(row.qty_1),
    qty_2: decString(row.qty_2),
  };
}

export async function pass3Compare(sessionId: string, tagIds: string[]): Promise<Map<string, PassCompareRow[]>> {
  const map = new Map<string, PassCompareRow[]>();
  if (tagIds.length === 0) {
    return map;
  }
  const all = await prisma.$queryRaw<CompareRaw[]>`
    SELECT sh.tag_id, sh.snapshot_item_id, si.barcode_4, si.nama_barang, sh.qty_1, sh.qty_2
    FROM v_selisih_hitung sh
    JOIN snapshot_items si ON si.id = sh.snapshot_item_id
    WHERE sh.session_id = ${sessionId}
    ORDER BY si.nama_barang
  `;
  const wanted = new Set(tagIds);
  for (const row of all) {
    if (!wanted.has(row.tag_id)) {
      continue;
    }
    const list = map.get(row.tag_id) ?? [];
    list.push(toCompare(row));
    map.set(row.tag_id, list);
  }
  return map;
}

export async function tagCompare(sessionId: string, tagId: string): Promise<PassCompareRow[]> {
  return (await pass3Compare(sessionId, [tagId])).get(tagId) ?? [];
}

export type Pass1BaselineRow = {
  snapshot_item_id: string;
  barcode_4: string | null;
  nama_barang: string;
  qty_1: string;
};

type TagProgressRaw = {
  tag_id: string;
  pass: number;
  user_id: string;
  user_nama: string;
  nomor_kartu: string | null;
  is_empty: boolean;
};

/** Latest Hitung ke-1 / ke-2 lorong closures for denah initials after sync. */
export async function sessionTagProgress(sessionId: string): Promise<TagProgressRaw[]> {
  const rows = await prisma.$queryRaw<TagProgressRaw[]>`
    SELECT DISTINCT ON (ts.tag_id, ts.pass)
           ts.tag_id,
           ts.pass,
           ts.submitted_by AS user_id,
           u.nama AS user_nama,
           ts.nomor_kartu,
           ts.is_empty
    FROM tag_submissions ts
    JOIN users u ON u.id = ts.submitted_by
    WHERE ts.session_id = ${sessionId}
      AND ts.pass IN (1, 2)
    ORDER BY ts.tag_id, ts.pass, ts.client_created_at DESC
  `;
  return rows.map((row) => ({ ...row, pass: Number(row.pass) }));
}

/** Pass-1 counts for Hitung ke-2 review. One lorong / one tag; pass 2 checks these rows. */
export async function pass1Baseline(
  sessionId: string,
  tagIds: string[],
  tagProgress?: TagProgressRaw[],
): Promise<Map<string, { items: Pass1BaselineRow[]; nomor_kartu: string | null }>> {
  const map = new Map<string, { items: Pass1BaselineRow[]; nomor_kartu: string | null }>();
  if (tagIds.length === 0) {
    return map;
  }
  const wanted = new Set(tagIds);
  for (const tagId of tagIds) {
    map.set(tagId, { items: [], nomor_kartu: null });
  }
  const items = await prisma.$queryRaw<
    Array<{
      tag_id: string;
      snapshot_item_id: string;
      barcode_4: string | null;
      nama_barang: string;
      qty_1: unknown;
    }>
  >`
    SELECT tip.tag_id, tip.snapshot_item_id, si.barcode_4, si.nama_barang, tip.qty AS qty_1
    FROM v_tag_item_pass tip
    JOIN snapshot_items si ON si.id = tip.snapshot_item_id
    WHERE tip.session_id = ${sessionId}
      AND tip.pass = 1
    ORDER BY si.nama_barang
  `;
  for (const row of items) {
    if (!wanted.has(row.tag_id)) {
      continue;
    }
    const current = map.get(row.tag_id) ?? { items: [], nomor_kartu: null };
    const qty = decString(row.qty_1);
    if (qty) {
      current.items.push({
        snapshot_item_id: row.snapshot_item_id,
        barcode_4: row.barcode_4,
        nama_barang: row.nama_barang,
        qty_1: qty,
      });
    }
    map.set(row.tag_id, current);
  }
  for (const row of tagProgress ?? []) {
    if (row.pass !== 1 || !wanted.has(row.tag_id)) {
      continue;
    }
    const current = map.get(row.tag_id);
    if (current) {
      current.nomor_kartu = row.nomor_kartu;
    }
  }
  return map;
}

export async function selisihSistem(sessionId: string) {
  const rows = await prisma.$queryRaw<
    Array<{
      barcode_4: string | null;
      kode_barang: string;
      nama_barang: string;
      gudang_id: string;
      gudang_nama: string;
      qty_onhand: unknown;
      qty_hitung: unknown;
      selisih_qty: unknown;
      selisih_nilai: unknown;
      ada_selisih_hitung: boolean;
    }>
  >`
    SELECT vs.barcode_4, vs.kode_barang, vs.nama_barang, vs.gudang_id, g.nama AS gudang_nama,
           vs.qty_onhand, vs.qty_hitung, vs.selisih_qty, vs.selisih_nilai, vs.ada_selisih_hitung
    FROM v_selisih_sistem vs
    JOIN gudang g ON g.id = vs.gudang_id
    WHERE vs.session_id = ${sessionId}
    ORDER BY g.urutan, vs.nama_barang
  `;
  return rows.map((row) => ({
    barcode_4: row.barcode_4,
    kode_barang: row.kode_barang,
    nama_barang: row.nama_barang,
    gudang_id: row.gudang_id,
    gudang_nama: row.gudang_nama,
    qty_onhand: String(row.qty_onhand),
    qty_hitung: String(row.qty_hitung),
    selisih_qty: String(row.selisih_qty),
    selisih_nilai: String(row.selisih_nilai),
    ada_selisih_hitung: row.ada_selisih_hitung,
    zero_found: new Prisma.Decimal(String(row.qty_hitung)).isZero() && new Prisma.Decimal(String(row.qty_onhand)).greaterThan(0),
  }));
}

export async function kondisiReport(sessionId: string) {
  const rows = await prisma.$queryRaw<
    Array<{
      barcode_4: string | null;
      nama_barang: string;
      kondisi: string;
      qty: unknown;
    }>
  >`
    SELECT si.barcode_4, si.nama_barang, cc.kondisi::text AS kondisi, SUM(cc.qty) AS qty
    FROM v_current_counts cc
    JOIN snapshot_items si ON si.id = cc.snapshot_item_id
    WHERE cc.session_id = ${sessionId}
    GROUP BY si.barcode_4, si.nama_barang, cc.kondisi
    ORDER BY si.nama_barang, cc.kondisi
  `;
  return rows.map((row) => ({
    barcode_4: row.barcode_4,
    nama_barang: row.nama_barang,
    kondisi: row.kondisi,
    qty: String(row.qty),
  }));
}

export async function unknownItems(sessionId: string) {
  const rows = await prisma.unknownItem.findMany({
    where: { sessionId },
    orderBy: { clientCreatedAt: "asc" },
    select: {
      id: true,
      tagId: true,
      pass: true,
      kodeInput: true,
      namaInput: true,
      qty: true,
      kondisi: true,
    },
  });
  const pins = await prisma.sessionTag.findMany({
    where: { sessionId },
    select: { tagId: true, nomor: true },
  });
  const nomor = new Map(pins.map((row) => [row.tagId, row.nomor]));
  return rows.map((row) => ({
    id: row.id,
    tag_id: row.tagId,
    nomor: nomor.get(row.tagId) ?? row.tagId,
    pass: row.pass,
    kode_input: row.kodeInput,
    nama_input: row.namaInput,
    qty: String(row.qty),
    kondisi: row.kondisi,
  }));
}

export async function rekapTag(sessionId: string) {
  const gudang = await sessionDenah(sessionId);
  const counts: Record<string, number> = {
    belum: 0,
    menunggu_hitung_2: 0,
    selisih_hitung: 0,
    selesai: 0,
    kosong: 0,
  };
  for (const row of gudang) {
    for (const lokasi of row.lokasi) {
      for (const tag of lokasi.tags) {
        counts[tag.status] = (counts[tag.status] ?? 0) + 1;
      }
    }
  }
  return { counts };
}

type StockQuery = { q?: string; gudang_id?: string; brand?: string; group?: string; page?: number };

function stockWhere(query: StockQuery, sessionId?: string) {
  return {
    ...(sessionId ? { sessionId } : {}),
    ...(parseId(query.gudang_id, "gdg") ? { gudangId: query.gudang_id } : {}),
    ...(query.brand ? { namaBrand: query.brand } : {}),
    ...(query.group ? { namaGroup: query.group } : {}),
    ...(query.q
      ? {
          OR: [
            { namaBarang: { contains: query.q, mode: "insensitive" as const } },
            { kodeBarang: { contains: query.q, mode: "insensitive" as const } },
            { barcode4: { contains: query.q } },
          ],
        }
      : {}),
  };
}

type StockRow = {
  id: string;
  barcode4: string | null;
  kodeBarang: string;
  namaBarang: string;
  namaBrand: string | null;
  namaGroup: string | null;
  qtyOnhand: { toString(): string };
  hargaSatuan: { toString(): string } | null;
  gudang: { nama: string };
};

function presentStock(page: number, take: number, total: number, rows: StockRow[]) {
  return {
    page,
    take,
    total,
    items: rows.map((row) => ({
      id: row.id,
      barcode_4: row.barcode4,
      kode_barang: row.kodeBarang,
      nama_barang: row.namaBarang,
      nama_brand: row.namaBrand,
      nama_group: row.namaGroup,
      gudang_nama: row.gudang.nama,
      qty_onhand: String(row.qtyOnhand),
      harga_satuan: row.hargaSatuan == null ? null : String(row.hargaSatuan),
    })),
  };
}

function presentChoices(
  gudangRows: { gudangId: string; gudang: { nama: string } }[],
  brandRows: { namaBrand: string | null }[],
) {
  return {
    gudang: gudangRows
      .map((row) => ({ id: row.gudangId, nama: row.gudang.nama }))
      .sort((a, b) => a.nama.localeCompare(b.nama)),
    brands: brandRows.flatMap((row) => (row.namaBrand ? [row.namaBrand] : [])).sort((a, b) => a.localeCompare(b)),
  };
}

type StockReader = {
  count(args: { where: object }): Promise<number>;
  findMany(args: object): Promise<never>;
};

function stockReader(model: object) {
  return model as StockReader;
}

async function stockChoices(model: StockReader, where: ReturnType<typeof stockWhere>) {
  const [gudangRows, brandRows] = await Promise.all([
    model.findMany({
      where,
      distinct: ["gudangId"],
      select: { gudangId: true, gudang: { select: { nama: true } } },
    }),
    model.findMany({
      where: { ...where, namaBrand: { not: null } },
      distinct: ["namaBrand"],
      select: { namaBrand: true },
    }),
  ]);
  return presentChoices(gudangRows, brandRows);
}

export function daftarBarangChoices(sessionId: string) {
  return stockChoices(stockReader(prisma.snapshotItem), { sessionId });
}

export function masterBarangChoices() {
  return stockChoices(stockReader(prisma.masterItem), {});
}

async function readStock(
  count: (where: ReturnType<typeof stockWhere>) => Promise<number>,
  find: (where: ReturnType<typeof stockWhere>, skip: number, take: number) => Promise<StockRow[]>,
  where: ReturnType<typeof stockWhere>,
  query: StockQuery,
) {
  const page = Math.max(1, query.page ?? 1);
  const take = 50;
  const [total, rows] = await Promise.all([count(where), find(where, (page - 1) * take, take)]);
  return presentStock(page, take, total, rows);
}

function pageStock(model: StockReader, where: ReturnType<typeof stockWhere>, query: StockQuery) {
  return readStock(
    (filter) => model.count({ where: filter }),
    (filter, skip, take) =>
      model.findMany({
        where: filter,
        include: { gudang: { select: { nama: true } } },
        orderBy: [{ namaBarang: "asc" }],
        skip,
        take,
      }),
    where,
    query,
  );
}

export function daftarBarang(sessionId: string, query: StockQuery) {
  return pageStock(stockReader(prisma.snapshotItem), stockWhere(query, sessionId), query);
}

export function masterBarang(query: StockQuery) {
  return pageStock(stockReader(prisma.masterItem), stockWhere(query), query);
}

export async function petaBarang(sessionId: string, kode: string) {
  const rows = await prisma.$queryRaw<
    Array<{ gudang_nama: string; lokasi_nama: string; nomor: string; qty: unknown }>
  >`
    SELECT st.gudang_nama, st.lokasi_nama, st.nomor, SUM(a.qty_agreed) AS qty
    FROM v_agreed a
    JOIN session_tags st ON st.session_id = a.session_id AND st.tag_id = a.tag_id
    JOIN snapshot_items si ON si.id = a.snapshot_item_id
    WHERE a.session_id = ${sessionId}
      AND si.barcode_4 = ${kode}
      AND a.qty_agreed IS NOT NULL
    GROUP BY st.gudang_nama, st.lokasi_nama, st.nomor
    ORDER BY st.gudang_nama, st.lokasi_nama, st.nomor
  `;
  return rows.map((row) => ({
    gudang_nama: row.gudang_nama,
    lokasi_nama: row.lokasi_nama,
    nomor: row.nomor,
    qty: String(row.qty),
  }));
}

export async function assignPass3(sessionId: string, tagId: string, userId: string) {
  const session = await prisma.opnameSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return { error: "Sesi tidak ditemukan.", status: 404 as const };
  }
  if (session.status !== "counting") {
    return { error: "Pass 3 hanya saat sesi counting.", status: 409 as const };
  }
  const disputes = await tagCompare(sessionId, tagId);
  if (disputes.length === 0) {
    return { error: "Tag ini tidak punya selisih hitung.", status: 409 as const };
  }
  const user = await prisma.user.findFirst({ where: { id: userId, role: "counter", retiredAt: null } });
  if (!user) {
    return { error: "Hanya petugas hitung yang bisa ditugaskan.", status: 400 as const };
  }
  const pin = await prisma.sessionTag.findUnique({
    where: { sessionId_tagId: { sessionId, tagId } },
  });
  if (!pin) {
    return { error: "Tag tidak ada pada sesi ini.", status: 400 as const };
  }
  await prisma.tagAssignment.upsert({
    where: { sessionId_tagId_pass: { sessionId, tagId, pass: 3 } },
    create: { sessionId, tagId, pass: 3, userId },
    update: { userId },
  });
  return { ok: true as const, tag_id: tagId, user_id: userId, nama: user.nama };
}
