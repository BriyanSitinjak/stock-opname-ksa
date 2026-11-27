/**
 * One-shot: sync floor tags, then assign every denah lorong/slot on the latest
 * draft session to two different random counters (Hitung ke-1 / ke-2).
 *
 *   npx tsx scripts/assign-floor-spread.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/lib/db";
import { floorAisles } from "@/lib/floor-plan";
import { saveAisles } from "@/lib/aisles";
import { syncFloorTags } from "@/lib/sync-floor-tags";

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), name);
    if (!existsSync(path)) {
      continue;
    }
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const eq = trimmed.indexOf("=");
      if (eq < 0) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

async function main() {
  loadEnv();

  const recent = await prisma.opnameSession.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, nama: true, periode: true, status: true, createdAt: true },
  });
  console.log(
    "Sesi terbaru:",
    recent.map((row) => `${row.id} ${row.status} ${row.nama}`).join(" | ") || "(kosong)",
  );

  const session =
    recent.find((row) => row.status === "draft") ??
    recent.find((row) => row.status === "counting") ??
    recent[0];
  if (!session) {
    throw new Error("Tidak ada sesi di database.");
  }
  if (session.status !== "draft") {
    console.warn(
      `Peringatan: status sesi adalah "${session.status}" (bukan draft). Tetap mengisi tugas lorong.`,
    );
  }

  console.log(`Sesi dipilih: ${session.id} · ${session.nama} (${session.status})`);

  const sync = await syncFloorTags();
  console.log("Sinkron denah:", sync);

  const counters = await prisma.user.findMany({
    where: { role: "counter", retiredAt: null },
    select: { id: true, nama: true },
    orderBy: { nama: "asc" },
  });
  if (counters.length < 2) {
    throw new Error("Butuh minimal 2 petugas (counter) aktif.");
  }
  console.log(`Petugas: ${counters.map((row) => row.nama).join(", ")}`);

  const aisles = floorAisles();
  const deck = shuffle(counters);
  let cursor = 0;
  function nextCounter(exclude?: string) {
    for (let attempt = 0; attempt < deck.length; attempt += 1) {
      const person = deck[cursor % deck.length]!;
      cursor += 1;
      if (!exclude || person.id !== exclude) {
        return person;
      }
    }
    return counters.find((row) => row.id !== exclude) ?? counters[0]!;
  }

  const rows = aisles.map((aisle) => {
    const pass1 = nextCounter();
    const pass2 = nextCounter(pass1.id);
    return {
      gudang: aisle.gudang,
      aisle: aisle.aisle,
      pass1: pass1.id,
      pass2: pass2.id,
      crossed: false,
      note: "",
    };
  });

  const result = await saveAisles(session.id, rows);
  if ("error" in result) {
    throw new Error(result.error);
  }

  const tagCount = await prisma.tagAssignment.count({ where: { sessionId: session.id } });
  const aisleCount = await prisma.aisleAssignment.count({ where: { sessionId: session.id } });
  console.log(
    `Selesai: ${aisles.length} lorong/slot × 2 pass → ${aisleCount} aisle_assignments, ${tagCount} tag_assignments.`,
  );
  if (result.missing.length > 0) {
    console.log(`Peringatan missing (${result.missing.length}), contoh:`, result.missing.slice(0, 5));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
