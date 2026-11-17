import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { app } from "@/lib/api/app";
import { prisma } from "@/lib/db";
import { ADMIN_ID, BUDI_ID, GUDANG_01, RINA_ID, SARI_ID, TAG_11, TAG_13 } from "@/lib/fixture";
import { jsonOf } from "@/tests/json";

async function seedDisputedSession() {
  const session = await prisma.opnameSession.create({
    data: {
      nama: "Uji laporan",
      periode: "2026-12",
      snapshotAt: new Date("2026-12-15T11:00:00Z"),
      scopeFilter: { brands: ["Asia"], groups: ["Material"] },
      status: "counting",
      createdById: ADMIN_ID,
    },
  });
  const tagAgree = await prisma.tag.findFirstOrThrow({ where: { id: TAG_11 } });
  const tagDispute = await prisma.tag.findFirstOrThrow({ where: { id: TAG_13 } });
  await prisma.sessionTag.createMany({
    data: [
      {
        sessionId: session.id,
        tagId: tagAgree.id,
        nomor: "1.1",
        lokasiNama: "Lokasi I",
        gudangNama: "GUDANG 01",
        weight: 3,
        urutan: 1,
      },
      {
        sessionId: session.id,
        tagId: tagDispute.id,
        nomor: "1.3",
        lokasiNama: "Lokasi I",
        gudangNama: "GUDANG 01",
        weight: 1,
        urutan: 3,
      },
    ],
  });
  await prisma.tagAssignment.createMany({
    data: [
      { sessionId: session.id, tagId: tagAgree.id, pass: 1, userId: BUDI_ID },
      { sessionId: session.id, tagId: tagAgree.id, pass: 2, userId: SARI_ID },
      { sessionId: session.id, tagId: tagDispute.id, pass: 1, userId: BUDI_ID },
      { sessionId: session.id, tagId: tagDispute.id, pass: 2, userId: SARI_ID },
    ],
  });
  await prisma.userDevice.createMany({
    data: [
      { sessionId: session.id, deviceId: `P7-A-${session.id.slice(0, 8)}`, userId: BUDI_ID, boundById: ADMIN_ID },
      { sessionId: session.id, deviceId: `P7-B-${session.id.slice(0, 8)}`, userId: SARI_ID, boundById: ADMIN_ID },
      { sessionId: session.id, deviceId: `P7-D-${session.id.slice(0, 8)}`, userId: RINA_ID, boundById: ADMIN_ID },
    ],
  });
  const item = await prisma.snapshotItem.create({
    data: {
      sessionId: session.id,
      gudangId: GUDANG_01,
      kodeBarang: "AS-TH-5L",
      barcode4: "1234",
      namaBarang: "THINNER ASIA 5L",
      qtyOnhand: "10",
      hargaSatuan: "85000",
    },
  });
  async function line(tagId: string, pass: number, userId: string, deviceId: string, qty: string) {
    await prisma.count.create({
      data: {
        clientRowId: randomUUID(),
        sessionId: session.id,
        tagId,
        pass,
        snapshotItemId: item.id,
        countedById: userId,
        qty,
        kondisi: "baik",
        deviceId,
        clientCreatedAt: new Date(),
      },
    });
    await prisma.tagSubmission.create({
      data: {
        clientRowId: randomUUID(),
        sessionId: session.id,
        tagId,
        pass,
        submittedById: userId,
        isEmpty: false,
        deviceId,
        clientCreatedAt: new Date(),
      },
    });
  }
  const deviceBudi = `P7-A-${session.id.slice(0, 8)}`;
  const deviceSari = `P7-B-${session.id.slice(0, 8)}`;
  await line(tagAgree.id, 1, BUDI_ID, deviceBudi, "10");
  await line(tagAgree.id, 2, SARI_ID, deviceSari, "10");
  await line(tagDispute.id, 1, BUDI_ID, deviceBudi, "12");
  await line(tagDispute.id, 2, SARI_ID, deviceSari, "10");
  return { session, tagAgree, tagDispute, item, deviceBudi, deviceRina: `P7-D-${session.id.slice(0, 8)}` };
}

describe("Phase 7 reports", () => {
  it("AC-8.12 comparison exists only when the tag disagrees", async () => {
    const { session, tagAgree, tagDispute } = await seedDisputedSession();
    const agree = await jsonOf(await app.request(`/api/sessions/${session.id}/compare/${tagAgree.id}`));
    const dispute = await jsonOf(await app.request(`/api/sessions/${session.id}/compare/${tagDispute.id}`));
    expect(agree.items).toEqual([]);
    expect(Array.isArray(dispute.items) && (dispute.items as unknown[]).length).toBeGreaterThan(0);
    const first = (dispute.items as { qty_1: string; qty_2: string }[])[0];
    expect(first?.qty_1).toBe("12");
    expect(first?.qty_2).toBe("10");
  });

  it("AC-8.13 Peta Barang reads session_tags names and agreed qty", async () => {
    const { session } = await seedDisputedSession();
    const response = await app.request(`/api/sessions/${session.id}/peta-barang?kode=1234`);
    expect(response.status).toBe(200);
    const body = await jsonOf(response);
    const items = body.items as { gudang_nama: string; lokasi_nama: string; nomor: string; qty: string }[];
    const hit = items.find((row) => row.nomor === "1.1");
    expect(hit).toMatchObject({ gudang_nama: "GUDANG 01", lokasi_nama: "Lokasi I", nomor: "1.1", qty: "10" });
  });

  it("AC-2.4 prepare shows both prior qtys only on pass 3", async () => {
    const { session, tagDispute, deviceBudi, deviceRina } = await seedDisputedSession();
    const assigned = await app.request(`/api/sessions/${session.id}/pass-3`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag_id: tagDispute.id, user_id: RINA_ID }),
    });
    expect(assigned.status).toBe(200);

    const rina = await app.request(`/api/sessions/${session.id}/prepare`, {
      headers: { "x-device-id": deviceRina },
    });
    expect(rina.status).toBe(200);
    const rinaBody = (await rina.json()) as {
      assignments: { tag_id: string; pass: number; compare?: { qty_1: string; qty_2: string }[] }[];
    };
    const pass3 = rinaBody.assignments.find((row) => row.tag_id === tagDispute.id && row.pass === 3);
    expect(pass3?.compare?.[0]?.qty_1).toBe("12");
    expect(pass3?.compare?.[0]?.qty_2).toBe("10");

    const budi = await app.request(`/api/sessions/${session.id}/prepare`, {
      headers: { "x-device-id": deviceBudi },
    });
    const budiText = await budi.text();
    const budiBody = JSON.parse(budiText) as { assignments: { pass: number; compare?: unknown }[] };
    expect(budiBody.assignments.every((row) => row.pass !== 3)).toBe(true);
    expect(budiBody.assignments.every((row) => row.compare == null)).toBe(true);
    expect(budiText.includes("qty_onhand")).toBe(false);
    expect(budiText.includes("harga_satuan")).toBe(false);
  });

  it("AC-8.5 em dash case is a null qty_2 on selisih hitung", async () => {
    const session = await prisma.opnameSession.create({
      data: {
        nama: "Uji em dash",
        periode: "2026-12",
        snapshotAt: new Date("2026-12-15T11:00:00Z"),
        scopeFilter: { brands: ["Asia"], groups: ["Material"] },
        status: "counting",
        createdById: ADMIN_ID,
      },
    });
    await prisma.sessionTag.create({
      data: {
        sessionId: session.id,
        tagId: TAG_11,
        nomor: "1.1",
        lokasiNama: "Lokasi I",
        gudangNama: "GUDANG 01",
        weight: 3,
        urutan: 1,
      },
    });
    const item = await prisma.snapshotItem.create({
      data: {
        sessionId: session.id,
        gudangId: GUDANG_01,
        kodeBarang: "AS-TH-5L",
        barcode4: "1234",
        namaBarang: "THINNER ASIA 5L",
        qtyOnhand: "10",
      },
    });
    await prisma.count.create({
      data: {
        clientRowId: randomUUID(),
        sessionId: session.id,
        tagId: TAG_11,
        pass: 1,
        snapshotItemId: item.id,
        countedById: BUDI_ID,
        qty: "10",
        kondisi: "baik",
        deviceId: "DEV-A",
        clientCreatedAt: new Date(),
      },
    });
    await prisma.tagSubmission.create({
      data: {
        clientRowId: randomUUID(),
        sessionId: session.id,
        tagId: TAG_11,
        pass: 2,
        submittedById: SARI_ID,
        isEmpty: false,
        deviceId: "DEV-B",
        clientCreatedAt: new Date(),
      },
    });
    const rows = (await jsonOf(await app.request(`/api/sessions/${session.id}/selisih-hitung`))) as unknown as {
      qty_1: string | null;
      qty_2: string | null;
    }[];
    const hit = rows.find((row) => row.qty_1 === "10" && row.qty_2 == null);
    expect(hit).toBeTruthy();
  });
});
