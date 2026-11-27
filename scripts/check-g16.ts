import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 0) continue;
      const key = t.slice(0, eq).trim();
      let value = t.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

async function main() {
  loadEnv();
  const { prisma } = await import("../lib/db");
  const g16 = await prisma.tag.findMany({
    where: { nomor: { startsWith: "G16-" }, retiredAt: null },
    select: { id: true, nomor: true },
    orderBy: { nomor: "asc" },
  });
  console.log("G16 tags", g16.length, g16.map((t) => t.nomor).join(", "));

  const assigns = await prisma.tagAssignment.findMany({
    where: { sessionId: "ses-3", tag: { nomor: { startsWith: "G16-" } } },
    include: { tag: { select: { nomor: true } }, user: { select: { nama: true } } },
  });
  console.log(
    "G16 tag assigns",
    assigns.map((a) => `${a.tag.nomor} p${a.pass} ${a.user.nama}`),
  );

  const aisle = await prisma.aisleAssignment.findMany({
    where: { sessionId: "ses-3", gudang: 16 },
    include: { user: { select: { nama: true } } },
  });
  console.log(
    "G16 aisle",
    aisle.map((a) => `${a.aisle} p${a.pass} ${a.user.nama}`),
  );

  const pins = await prisma.sessionTag.findMany({
    where: { sessionId: "ses-3", nomor: { startsWith: "G16-" } },
    select: { nomor: true, tagId: true },
  });
  console.log("G16 session_tags pins", pins.length, pins.map((p) => p.nomor).join(", "));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
