import { prisma } from "@/lib/db";
import { isMissingRelation } from "@/lib/db-errors";
import { floorAisles, type FloorAisleRef } from "@/lib/floor-plan";
import { missingAisleTasks, samePersonOnAisle, type AisleCross, type AisleTask } from "@/lib/aisle-rules";

export type SavedAisle = FloorAisleRef & {
  pass1: string | null;
  pass2: string | null;
  crossed: boolean;
  note: string;
};

export async function aisleBoard(sessionId: string): Promise<{ ready: boolean; aisles: SavedAisle[] }> {
  const catalog = floorAisles();
  try {
    const [tasks, marks] = await Promise.all([
      prisma.aisleAssignment.findMany({ where: { sessionId } }),
      prisma.aisleMark.findMany({ where: { sessionId } }),
    ]);
    const taskKey = new Map(tasks.map((row) => [`${row.gudang}:${row.aisle}:${row.pass}`, row.userId]));
    const markKey = new Map(marks.map((row) => [`${row.gudang}:${row.aisle}`, row.note]));
    return {
      ready: true,
      aisles: catalog.map((aisle) => ({
        ...aisle,
        pass1: taskKey.get(`${aisle.gudang}:${aisle.aisle}:1`) ?? null,
        pass2: taskKey.get(`${aisle.gudang}:${aisle.aisle}:2`) ?? null,
        crossed: markKey.has(`${aisle.gudang}:${aisle.aisle}`),
        note: markKey.get(`${aisle.gudang}:${aisle.aisle}`) ?? "",
      })),
    };
  } catch (error) {
    if (isMissingRelation(error)) {
      return {
        ready: false,
        aisles: catalog.map((aisle) => ({
          ...aisle,
          pass1: null,
          pass2: null,
          crossed: false,
          note: "",
        })),
      };
    }
    throw error;
  }
}

export async function saveAisles(
  sessionId: string,
  rows: Array<{ gudang: number; aisle: string; pass1: string | null; pass2: string | null; crossed: boolean; note: string }>,
): Promise<{ error: string } | { missing: string[] }> {
  const catalog = new Map(floorAisles().map((aisle) => [`${aisle.gudang}:${aisle.aisle}`, aisle]));
  const tasks: AisleTask[] = [];
  const crosses: AisleCross[] = [];
  for (const row of rows) {
    const known = catalog.get(`${row.gudang}:${row.aisle}`);
    if (!known) {
      return { error: "Ada lorong yang tidak ada di denah." };
    }
    if (row.crossed) {
      crosses.push({ gudang: row.gudang, aisle: row.aisle, note: row.note.trim() });
      continue;
    }
    if (row.pass1) {
      tasks.push({ gudang: row.gudang, aisle: row.aisle, pass: 1, userId: row.pass1 });
    }
    if (row.pass2) {
      tasks.push({ gudang: row.gudang, aisle: row.aisle, pass: 2, userId: row.pass2 });
    }
  }
  const same = samePersonOnAisle(tasks);
  if (same) {
    return { error: same };
  }
  const labels = new Map<string, string>();
  for (const aisle of catalog.values()) {
    for (const label of aisle.placeLabels) {
      labels.set(label, `${aisle.gudang}:${aisle.aisle}`);
    }
  }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.aisleAssignment.deleteMany({ where: { sessionId } });
      await tx.aisleMark.deleteMany({ where: { sessionId } });
      if (tasks.length > 0) {
        await tx.aisleAssignment.createMany({
          data: tasks.map((task) => ({
            sessionId,
            gudang: task.gudang,
            aisle: task.aisle,
            pass: task.pass,
            userId: task.userId,
          })),
        });
      }
      if (crosses.length > 0) {
        await tx.aisleMark.createMany({
          data: crosses.map((mark) => ({
            sessionId,
            gudang: mark.gudang,
            aisle: mark.aisle,
            note: mark.note,
          })),
        });
      }
      const live = await tx.tag.findMany({
        where: { retiredAt: null, lokasi: { retiredAt: null, gudang: { retiredAt: null } } },
        select: { id: true, nomor: true },
      });
      const floorTagIds = live.filter((tag) => labels.has(tag.nomor)).map((tag) => tag.id);
      if (floorTagIds.length > 0) {
        await tx.tagAssignment.deleteMany({ where: { sessionId, tagId: { in: floorTagIds } } });
        const byNomor = new Map(live.map((tag) => [tag.nomor, tag.id]));
        const expanded: { sessionId: string; tagId: string; pass: number; userId: string }[] = [];
        for (const task of tasks) {
          const aisle = catalog.get(`${task.gudang}:${task.aisle}`);
          if (!aisle) {
            continue;
          }
          for (const label of aisle.placeLabels) {
            const tagId = byNomor.get(label);
            if (tagId) {
              expanded.push({ sessionId, tagId, pass: task.pass, userId: task.userId });
            }
          }
        }
        if (expanded.length > 0) {
          await tx.tagAssignment.createMany({ data: expanded });
        }
      }
    });
  } catch (error) {
    if (isMissingRelation(error)) {
      return { error: "Tabel lorong belum ada di database." };
    }
    throw error;
  }
  const slots = [...catalog.values()].map((aisle) => ({
    gudang: aisle.gudang,
    aisle: aisle.aisle,
    label: aisle.label,
  }));
  return { missing: missingAisleTasks(slots, tasks, crosses) };
}

export async function aisleCrosses(sessionId: string): Promise<{ aisle: string; note: string }[]> {
  try {
    const marks = await prisma.aisleMark.findMany({ where: { sessionId } });
    const byAisle = new Map(floorAisles().map((aisle) => [`${aisle.gudang}:${aisle.aisle}`, aisle.label]));
    return marks.map((mark) => ({
      aisle: byAisle.get(`${mark.gudang}:${mark.aisle}`) ?? mark.aisle,
      note: mark.note,
    }));
  } catch (error) {
    if (isMissingRelation(error)) {
      return [];
    }
    throw error;
  }
}
