import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { whenRelationMissing } from "@/lib/db-errors";

const stockColumns = Prisma.raw(`
  gudang_id, kode_barang, barcode_4, nama_barang,
  kode_brand, nama_brand, kode_group, nama_group, uom,
  qty_onhand, harga_satuan, source_row_count
`);

export async function copyMasterToSnapshot(sessionId: string): Promise<number> {
  return whenRelationMissing(
    () => prisma.$executeRaw`
      INSERT INTO snapshot_items (session_id, ${stockColumns})
      SELECT ${sessionId}, ${stockColumns}
      FROM master_items
      ON CONFLICT (session_id, gudang_id, kode_barang) DO NOTHING
    `,
    0,
  );
}

export async function replaceMasterFromSnapshot(sessionId: string): Promise<void> {
  await whenRelationMissing(async () => {
    await prisma.$transaction(async (tx) => {
      await tx.masterItem.deleteMany();
      await tx.$executeRaw`
        INSERT INTO master_items (${stockColumns})
        SELECT ${stockColumns}
        FROM snapshot_items
        WHERE session_id = ${sessionId}
      `;
    });
  }, undefined);
}
