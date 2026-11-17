import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { app } from "@/lib/api/app";
import { prisma } from "@/lib/db";
import { ADMIN_ID, ITEM_1234, SESSION_ID, TAG_11 } from "@/lib/fixture";

async function jsonOf(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("Phase 2 gates", () => {
  it("AC-2.1 /prepare JSON has no qty_onhand, harga_satuan, or total_harga", async () => {
    const response = await app.request(`/api/sessions/${SESSION_ID}/prepare`, {
      headers: { "x-device-id": "DEV-A" },
    });
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text.includes("qty_onhand")).toBe(false);
    expect(text.includes("harga_satuan")).toBe(false);
    expect(text.includes("total_harga")).toBe(false);
    const payload = JSON.parse(text) as { items: Record<string, unknown>[] };
    for (const item of payload.items) {
      expect(item).not.toHaveProperty("qty_onhand");
      expect(item).not.toHaveProperty("harga_satuan");
      expect(item).not.toHaveProperty("total_harga");
      expect(item).not.toHaveProperty("qtyOnhand");
      expect(item).not.toHaveProperty("hargaSatuan");
    }
  });

  it("AC-7.5 posting the same batch three times does not add rows", async () => {
    const batch = Array.from({ length: 7 }, (_, i) => ({
      client_row_id: `aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee0${i + 1}`,
      tag_id: TAG_11,
      pass: 1,
      snapshot_item_id: ITEM_1234,
      qty: String(i + 1),
      qty_note: null,
      kondisi: "baik" as const,
      client_created_at: new Date(Date.UTC(2026, 11, 1, 8, i)).toISOString(),
    }));
    const post = () =>
      app.request("/api/counts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: "DEV-A",
          pending_after: 0,
          counts: batch,
          submissions: [],
          unknowns: [],
        }),
      });
    const first = await post();
    expect(first.status).toBe(200);
    const afterFirst = await prisma.count.count({
      where: { clientRowId: { in: batch.map((row) => row.client_row_id) } },
    });
    const second = await post();
    const third = await post();
    expect(second.status).toBe(200);
    expect(third.status).toBe(200);
    const afterThird = await prisma.count.count({
      where: { clientRowId: { in: batch.map((row) => row.client_row_id) } },
    });
    expect(afterThird).toBe(afterFirst);
    expect(afterThird).toBe(7);
  });

  it("AC-4.3 three source rows aggregate to one item with source_row_count = 3", async () => {
    const session = await prisma.opnameSession.create({
      data: {
        nama: "Uji impor AC-4.3",
        periode: "2026-12",
        snapshotAt: new Date("2026-12-15T18:00:00+07:00"),
        scopeFilter: {
          brands: ["Asia", "Platinum", "Infinity", "Renovo"],
          groups: ["Material"],
        },
        status: "draft",
        createdById: ADMIN_ID,
      },
    });
    const csv = [
      "Nama_Gudang,Kode_Barang,Nama_Barang,Nama_Brand,Nama_Group,barcode_4,Tag_No,Qty_OnHand,Harga_Satuan",
      "GUDANG 01,AS-TH-5L,THINNER ASIA 5L,Asia,Material,1234,1,10,85000",
      "GUDANG 01,AS-TH-5L,THINNER ASIA 5L,Asia,Material,1234,2,20,85000",
      "GUDANG 01,AS-TH-5L,THINNER ASIA 5L,Asia,Material,1234,3,10,85000",
    ].join("\n");
    const previewForm = new FormData();
    previewForm.append("file", new File([csv], "stock.csv", { type: "text/csv" }));
    const preview = await app.request(`/api/sessions/${session.id}/import`, {
      method: "POST",
      body: previewForm,
    });
    expect(preview.status).toBe(200);
    const before = await prisma.snapshotItem.count({ where: { sessionId: session.id } });
    expect(before).toBe(0);
    const commitForm = new FormData();
    commitForm.append("file", new File([csv], "stock.csv", { type: "text/csv" }));
    const commit = await app.request(`/api/sessions/${session.id}/import?confirm=1`, {
      method: "POST",
      body: commitForm,
    });
    expect(commit.status).toBe(200);
    const item = await prisma.snapshotItem.findFirst({
      where: { sessionId: session.id, kodeBarang: "AS-TH-5L" },
    });
    expect(item).not.toBeNull();
    expect(item?.sourceRowCount).toBe(3);
    expect(Number(item?.qtyOnhand.toString())).toBe(40);
  });

  it("AC-8.1 through AC-8.7 against hand-built counts on a throwaway session", async () => {
    const session = await prisma.opnameSession.create({
      data: {
        nama: "Uji AC-8",
        periode: "2026-12",
        snapshotAt: new Date("2026-12-15T18:00:00+07:00"),
        scopeFilter: { brands: ["Asia"], groups: ["Material"] },
        status: "counting",
        createdById: ADMIN_ID,
      },
    });
    const gudang = await prisma.gudang.findFirstOrThrow({ where: { kode: "G01" } });
    const tag = await prisma.tag.findFirstOrThrow({ where: { nomor: "1.1" } });
    const budi = await prisma.user.findFirstOrThrow({ where: { nama: "Budi Santoso" } });
    const sari = await prisma.user.findFirstOrThrow({ where: { nama: "Sari Wulandari" } });
    await prisma.sessionTag.create({
      data: {
        sessionId: session.id,
        tagId: tag.id,
        nomor: "1.1",
        lokasiNama: "Lokasi I",
        gudangNama: "GUDANG 01",
        weight: 3,
        urutan: 1,
      },
    });
    await prisma.tagAssignment.createMany({
      data: [
        { sessionId: session.id, tagId: tag.id, pass: 1, userId: budi.id },
        { sessionId: session.id, tagId: tag.id, pass: 2, userId: sari.id },
      ],
    });
    const deviceBudi = `TEST-B-${session.id.slice(0, 8)}`;
    const deviceSari = `TEST-S-${session.id.slice(0, 8)}`;
    await prisma.userDevice.createMany({
      data: [
        { sessionId: session.id, deviceId: deviceBudi, userId: budi.id, boundById: ADMIN_ID },
        { sessionId: session.id, deviceId: deviceSari, userId: sari.id, boundById: ADMIN_ID },
      ],
    });
    const itemAgree = await prisma.snapshotItem.create({
      data: {
        sessionId: session.id,
        gudangId: gudang.id,
        kodeBarang: "AS-TH-5L",
        barcode4: "1234",
        namaBarang: "THINNER ASIA 5L",
        namaBrand: "Asia",
        namaGroup: "Material",
        qtyOnhand: "10",
        hargaSatuan: "85000",
        sourceRowCount: 1,
      },
    });
    await prisma.snapshotItem.create({
      data: {
        sessionId: session.id,
        gudangId: gudang.id,
        kodeBarang: "IN-SL-20L",
        barcode4: "9001",
        namaBarang: "INFINITY SEALER 20L",
        namaBrand: "Infinity",
        namaGroup: "Material",
        qtyOnhand: "38",
        hargaSatuan: "410000",
        sourceRowCount: 1,
      },
    });

    async function syncPass(
      device: string,
      pass: number,
      lines: { itemId: string; qty: string; kondisi: "baik" | "rusak" }[],
    ) {
      const counts = lines.map((line) => ({
        client_row_id: randomUUID(),
        tag_id: tag.id,
        pass,
        snapshot_item_id: line.itemId,
        qty: line.qty,
        qty_note: null,
        kondisi: line.kondisi,
        client_created_at: new Date().toISOString(),
      }));
      const submissions = [
        {
          client_row_id: randomUUID(),
          tag_id: tag.id,
          pass,
          is_empty: false,
          client_created_at: new Date().toISOString(),
        },
      ];
      const response = await app.request("/api/counts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: device,
          pending_after: 0,
          counts,
          submissions,
          unknowns: [],
        }),
      });
      expect(response.status).toBe(200);
    }

    await syncPass(deviceBudi, 1, [
      { itemId: itemAgree.id, qty: "8", kondisi: "baik" },
      { itemId: itemAgree.id, qty: "2", kondisi: "rusak" },
    ]);
    await syncPass(deviceSari, 2, [{ itemId: itemAgree.id, qty: "10", kondisi: "baik" }]);

    const hitung = (await jsonOf(
      await app.request(`/api/sessions/${session.id}/selisih-hitung`),
    )) as unknown as Array<{ snapshot_item_id: string }>;
    expect(hitung.some((row) => row.snapshot_item_id === itemAgree.id)).toBe(false);

    const sistem = (await jsonOf(
      await app.request(`/api/sessions/${session.id}/selisih-sistem`),
    )) as unknown as Array<{
      barcode_4: string;
      qty_hitung: string;
      selisih_qty: string;
      ada_selisih_hitung: boolean;
    }>;
    const agreeRow = sistem.find((row) => row.barcode_4 === "1234");
    const zeroRow = sistem.find((row) => row.barcode_4 === "9001");
    expect(Number(agreeRow?.qty_hitung)).toBe(10);
    expect(Number(agreeRow?.selisih_qty)).toBe(0);
    expect(agreeRow?.ada_selisih_hitung).toBe(false);
    expect(Number(zeroRow?.qty_hitung)).toBe(0);
    expect(Number(zeroRow?.selisih_qty)).toBe(-38);
    expect(zeroRow?.ada_selisih_hitung).toBe(false);

    const zeroFound = (await jsonOf(
      await app.request(`/api/sessions/${session.id}/zero-found`),
    )) as unknown as Array<{ barcode_4: string }>;
    expect(zeroFound.some((row) => row.barcode_4 === "9001")).toBe(true);

    const extraItem = await prisma.snapshotItem.create({
      data: {
        sessionId: session.id,
        gudangId: gudang.id,
        kodeBarang: "AS-TH-1L",
        barcode4: "1243",
        namaBarang: "THINNER ASIA 1L",
        namaBrand: "Asia",
        namaGroup: "Material",
        qtyOnhand: "12",
        hargaSatuan: "22000",
        sourceRowCount: 1,
      },
    });
    await prisma.count.create({
      data: {
        clientRowId: randomUUID(),
        sessionId: session.id,
        tagId: tag.id,
        pass: 1,
        snapshotItemId: extraItem.id,
        countedById: budi.id,
        qty: "10",
        kondisi: "baik",
        deviceId: deviceBudi,
        clientCreatedAt: new Date(),
      },
    });
    await prisma.tagSubmission.create({
      data: {
        clientRowId: randomUUID(),
        sessionId: session.id,
        tagId: tag.id,
        pass: 2,
        submittedById: sari.id,
        isEmpty: false,
        deviceId: deviceSari,
        clientCreatedAt: new Date(),
      },
    });
    const coalesce = await prisma.$queryRaw<Array<{ snapshot_item_id: string; qty_2: unknown }>>`
      SELECT snapshot_item_id, qty_2
      FROM v_selisih_hitung
      WHERE session_id = ${session.id}::uuid
        AND snapshot_item_id = ${extraItem.id}::uuid
    `;
    expect(coalesce.length).toBe(1);
    expect(coalesce[0]?.qty_2).toBeNull();
  });
});
