import { prisma } from "@/lib/db";

export function uniqueNames(values: Array<string | null | undefined>, blocked: readonly string[] = []) {
  const seen = new Set<string>(blocked);
  const names: string[] = [];
  for (const name of values) {
    const value = name?.trim() ?? "";
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    names.push(value);
  }
  return names;
}

export async function catalogNames() {
  const [brandRows, groupRows] = await Promise.all([
    prisma.snapshotItem.findMany({
      where: { namaBrand: { not: null } },
      distinct: ["namaBrand"],
      select: { namaBrand: true },
    }),
    prisma.snapshotItem.findMany({
      where: { namaGroup: { not: null } },
      distinct: ["namaGroup"],
      select: { namaGroup: true },
    }),
  ]);
  return {
    brands: uniqueNames(brandRows.map((row) => row.namaBrand)),
    groups: uniqueNames(groupRows.map((row) => row.namaGroup)),
  };
}

export async function liveTags() {
  return prisma.tag.findMany({
    where: { retiredAt: null, lokasi: { retiredAt: null, gudang: { retiredAt: null } } },
    include: { lokasi: { include: { gudang: true } } },
    orderBy: [{ lokasi: { gudang: { urutan: "asc" } } }, { lokasi: { urutan: "asc" } }, { urutan: "asc" }],
  });
}

export async function missingAssignments(sessionId: string): Promise<string[]> {
  const tags = await liveTags();
  const rows = await prisma.tagAssignment.findMany({ where: { sessionId } });
  const have = new Set(rows.map((row) => `${row.tagId}:${row.pass}`));
  const missing: string[] = [];
  for (const tag of tags) {
    if (!have.has(`${tag.id}:1`)) {
      missing.push(`Tag ${tag.nomor} (${tag.lokasi.gudang.nama} / ${tag.lokasi.nama}) belum ada hitung ke-1`);
    }
    if (!have.has(`${tag.id}:2`)) {
      missing.push(`Tag ${tag.nomor} (${tag.lokasi.gudang.nama} / ${tag.lokasi.nama}) belum ada hitung ke-2`);
    }
  }
  return missing;
}
