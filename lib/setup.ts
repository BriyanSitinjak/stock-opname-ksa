import { prisma } from "@/lib/db";
import { floorAisles, isFloorPlace } from "@/lib/floor-plan";
import { missingAisleTasks } from "@/lib/aisle-rules";
import { aisleBoard } from "@/lib/aisles";

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

function missingTagPasses(
  tags: Array<{ id: string; nomor: string; lokasi: { nama: string; gudang: { nama: string } } }>,
  have: Set<string>,
): string[] {
  const missing: string[] = [];
  for (const tag of tags) {
    const where = `${tag.lokasi.gudang.nama} / ${tag.lokasi.nama}`;
    if (!have.has(`${tag.id}:1`)) {
      missing.push(`Tag ${tag.nomor} (${where}) belum ada pass 1`);
    }
    if (!have.has(`${tag.id}:2`)) {
      missing.push(`Tag ${tag.nomor} (${where}) belum ada pass 2`);
    }
  }
  return missing;
}

export async function missingAssignments(sessionId: string): Promise<string[]> {
  const tags = await liveTags();
  const floorTags = tags.filter((tag) => isFloorPlace(tag.nomor));
  const otherTags = tags.filter((tag) => !isFloorPlace(tag.nomor));
  const rows = await prisma.tagAssignment.findMany({ where: { sessionId } });
  const have = new Set(rows.map((row) => `${row.tagId}:${row.pass}`));
  const tagList = floorTags.length > 0 ? otherTags : tags;
  const missing = missingTagPasses(tagList, have);
  if (floorTags.length === 0) {
    return missing;
  }
  const board = await aisleBoard(sessionId);
  if (!board.ready) {
    missing.push(...missingTagPasses(floorTags, have));
    return missing;
  }
  const slots = floorAisles().map((aisle) => ({ gudang: aisle.gudang, aisle: aisle.aisle, label: aisle.label }));
  const tasks = board.aisles.flatMap((aisle) => {
    const out: { gudang: number; aisle: string; pass: 1 | 2; userId: string }[] = [];
    if (aisle.pass1) {
      out.push({ gudang: aisle.gudang, aisle: aisle.aisle, pass: 1, userId: aisle.pass1 });
    }
    if (aisle.pass2) {
      out.push({ gudang: aisle.gudang, aisle: aisle.aisle, pass: 2, userId: aisle.pass2 });
    }
    return out;
  });
  const crosses = board.aisles
    .filter((aisle) => aisle.crossed)
    .map((aisle) => ({ gudang: aisle.gudang, aisle: aisle.aisle, note: aisle.note }));
  missing.push(...missingAisleTasks(slots, tasks, crosses));
  return missing;
}
