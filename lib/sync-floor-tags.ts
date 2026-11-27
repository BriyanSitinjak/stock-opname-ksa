// Keep master gudang / lokasi / tags aligned with lib/floor-plan.
// Creates missing floor places (padded labels, transit, U/V, Pretelan, G16 slots)
// and renames unpadded rack nomor (A-1-A → A-01-A) when the tag is not pinned.

import { prisma } from "@/lib/db";
import { floorAisles, floors } from "@/lib/floor-plan";

export type FloorTagSyncResult = {
  gudang_created: number;
  lokasi_created: number;
  tags_created: number;
  tags_renamed: number;
  tags_skipped: number;
};

function gudangKode(gudang: number): string {
  return `G${String(gudang).padStart(2, "0")}`;
}

/** A-1-A → A-01-A; returns null if already padded or not a rack label. */
export function paddedRackNomor(nomor: string): string | null {
  const match = nomor.match(/^([A-Za-z]+)-(\d+)-([ABab])$/);
  if (!match) {
    return null;
  }
  const padded = `${match[1]!.toUpperCase()}-${match[2]!.padStart(2, "0")}-${match[3]!.toUpperCase()}`;
  return padded === nomor ? null : padded;
}

type WantedTag = {
  gudang: number;
  gudangNama: string;
  lokasiNama: string;
  nomor: string;
  urutan: number;
};

export function catalogWantedFloorTags(): WantedTag[] {
  const wanted: WantedTag[] = [];
  let urutan = 0;
  for (const aisle of floorAisles()) {
    for (const nomor of aisle.placeLabels) {
      urutan += 1;
      wanted.push({
        gudang: aisle.gudang,
        gudangNama: aisle.gudangNama,
        lokasiNama: aisle.aisle,
        nomor,
        urutan,
      });
    }
  }
  return wanted;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Ensure every assignable floor place exists as a live tag.
 * Safe to run repeatedly. Does not touch session_tags pins.
 */
export async function syncFloorTags(): Promise<FloorTagSyncResult> {
  const wanted = catalogWantedFloorTags();
  const result: FloorTagSyncResult = {
    gudang_created: 0,
    lokasi_created: 0,
    tags_created: 0,
    tags_renamed: 0,
    tags_skipped: 0,
  };

  await prisma.$transaction(
    async (tx) => {
      const gudangRows = await tx.gudang.findMany({
        where: { retiredAt: null },
        select: { id: true, kode: true, nama: true, urutan: true },
      });
      const gudangByNumber = new Map<number, { id: string; kode: string }>();
      for (const row of gudangRows) {
        const fromKode = row.kode.match(/^G(\d+)$/i);
        const fromNama = row.nama.match(/(\d+)/);
        const n = fromKode ? Number(fromKode[1]) : fromNama ? Number(fromNama[1]) : NaN;
        if (!Number.isNaN(n)) {
          gudangByNumber.set(n, { id: row.id, kode: row.kode });
        }
      }

      for (const floor of floors) {
        let current = gudangByNumber.get(floor.gudang);
        if (!current) {
          const created = await tx.gudang.create({
            data: {
              kode: gudangKode(floor.gudang),
              nama: floor.nama,
              urutan: floor.gudang,
            },
            select: { id: true, kode: true },
          });
          current = created;
          gudangByNumber.set(floor.gudang, current);
          result.gudang_created += 1;
        } else {
          await tx.gudang.updateMany({
            where: { id: current.id, nama: { not: floor.nama } },
            data: { nama: floor.nama },
          });
        }
      }

      const lokasiRows = await tx.lokasi.findMany({
        where: { retiredAt: null },
        select: { id: true, gudangId: true, nama: true },
      });
      const lokasiKey = (gudangId: string, nama: string) => `${gudangId}\0${nama}`;
      const lokasiByKey = new Map(lokasiRows.map((row) => [lokasiKey(row.gudangId, row.nama), row.id]));

      const lokasiToCreate: { gudangId: string; nama: string; urutan: number }[] = [];
      const seenLokasi = new Set<string>();
      let lokasiUrutan = 0;
      for (const want of wanted) {
        const gudang = gudangByNumber.get(want.gudang);
        if (!gudang) {
          continue;
        }
        const key = lokasiKey(gudang.id, want.lokasiNama);
        if (lokasiByKey.has(key) || seenLokasi.has(key)) {
          continue;
        }
        seenLokasi.add(key);
        lokasiUrutan += 1;
        lokasiToCreate.push({ gudangId: gudang.id, nama: want.lokasiNama, urutan: lokasiUrutan });
      }
      if (lokasiToCreate.length > 0) {
        await tx.lokasi.createMany({ data: lokasiToCreate });
        result.lokasi_created += lokasiToCreate.length;
        const refreshed = await tx.lokasi.findMany({
          where: { retiredAt: null },
          select: { id: true, gudangId: true, nama: true },
        });
        lokasiByKey.clear();
        for (const row of refreshed) {
          lokasiByKey.set(lokasiKey(row.gudangId, row.nama), row.id);
        }
      }

      const liveTags = await tx.tag.findMany({
        where: { retiredAt: null },
        select: { id: true, lokasiId: true, nomor: true },
      });
      const tagByNomor = new Map(liveTags.map((row) => [row.nomor, row]));
      const pinned = new Set(
        (
          await tx.sessionTag.findMany({
            select: { tagId: true },
            distinct: ["tagId"],
          })
        ).map((row) => row.tagId),
      );

      for (const tag of liveTags) {
        const padded = paddedRackNomor(tag.nomor);
        if (!padded) {
          continue;
        }
        if (pinned.has(tag.id) || tagByNomor.has(padded)) {
          result.tags_skipped += 1;
          continue;
        }
        await tx.tag.update({ where: { id: tag.id }, data: { nomor: padded } });
        tagByNomor.delete(tag.nomor);
        tagByNomor.set(padded, { ...tag, nomor: padded });
        result.tags_renamed += 1;
      }

      const tagsToCreate: { lokasiId: string; nomor: string; weight: number; urutan: number }[] = [];
      for (const want of wanted) {
        const gudang = gudangByNumber.get(want.gudang);
        if (!gudang) {
          continue;
        }
        const lokasiId = lokasiByKey.get(lokasiKey(gudang.id, want.lokasiNama));
        if (!lokasiId || tagByNomor.has(want.nomor)) {
          continue;
        }
        tagsToCreate.push({
          lokasiId,
          nomor: want.nomor,
          weight: 1,
          urutan: want.urutan,
        });
        tagByNomor.set(want.nomor, { id: "pending", lokasiId, nomor: want.nomor });
      }
      for (const batch of chunk(tagsToCreate, 500)) {
        await tx.tag.createMany({ data: batch });
      }
      result.tags_created += tagsToCreate.length;
    },
    { timeout: 120_000, maxWait: 20_000 },
  );

  return result;
}
