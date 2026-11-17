import { prisma } from "@/lib/db";

export const DEFAULT_BRANDS = ["Asia", "Platinum", "Infinity", "Renovo", "Sherwin", "Sayer Lack", "Waroon"];
export const DEFAULT_GROUPS = ["Material"];

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
