import { prisma } from "@/lib/db";
import { isMissingRelation } from "@/lib/db-errors";

export async function copyMasterToSnapshot(sessionId: string): Promise<number> {
  try {
    return await prisma.$executeRaw`
      INSERT INTO snapshot_items (
        session_id, gudang_id, kode_barang, barcode_4, nama_barang,
        kode_brand, nama_brand, kode_group, nama_group, uom,
        qty_onhand, harga_satuan, source_row_count
      )
      SELECT
        ${sessionId}, gudang_id, kode_barang, barcode_4, nama_barang,
        kode_brand, nama_brand, kode_group, nama_group, uom,
        qty_onhand, harga_satuan, source_row_count
      FROM master_items
      ON CONFLICT (session_id, gudang_id, kode_barang) DO NOTHING
    `;
  } catch (error) {
    if (isMissingRelation(error)) {
      return 0;
    }
    throw error;
  }
}

export async function replaceMasterFromSnapshot(sessionId: string): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.masterItem.deleteMany();
      await tx.$executeRaw`
        INSERT INTO master_items (
          gudang_id, kode_barang, barcode_4, nama_barang,
          kode_brand, nama_brand, kode_group, nama_group, uom,
          qty_onhand, harga_satuan, source_row_count
        )
        SELECT
          gudang_id, kode_barang, barcode_4, nama_barang,
          kode_brand, nama_brand, kode_group, nama_group, uom,
          qty_onhand, harga_satuan, source_row_count
        FROM snapshot_items
        WHERE session_id = ${sessionId}
      `;
    });
  } catch (error) {
    if (isMissingRelation(error)) {
      return;
    }
    throw error;
  }
}
