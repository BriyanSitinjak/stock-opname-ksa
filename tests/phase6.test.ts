import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { app } from "@/lib/api/app";
import { prisma } from "@/lib/db";
import { ADMIN_ID, AGUS_ID, BUDI_ID, GUDANG_01, SARI_ID, SESSION_ID } from "@/lib/fixture";
import { jsonOf } from "@/tests/json";

async function statusOf(sessionId: string, tagId: string) {
  const response = await app.request(`/api/sessions/${sessionId}/denah`);
  expect(response.status).toBe(200);
  const body = await jsonOf(response);
  const gudang = body.gudang as { lokasi: { tags: { tag_id: string; status: string }[] }[] }[];
  const tags = gudang.flatMap((row) => row.lokasi.flatMap((lokasi) => lokasi.tags));
  return tags.find((tag) => tag.tag_id === tagId)?.status;
}

describe("Phase 6 monitoring", () => {
  it("AC-10.1 tags and session_tags have no status column", async () => {
    const rows = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('tags', 'session_tags')
        AND column_name = 'status'
    `;
    expect(rows).toEqual([]);
  });

  it("AC-10.2 derived status follows submissions and counts", async () => {
    const session = await prisma.opnameSession.create({
      data: {
        nama: "Uji pantau",
        periode: "2026-12",
        snapshotAt: new Date("2026-12-15T11:00:00Z"),
        scopeFilter: { brands: ["Asia"], groups: ["Material"] },
        status: "counting",
        createdById: ADMIN_ID,
      },
    });
    const tag = await prisma.tag.findFirst({ orderBy: { nomor: "asc" } });
    expect(tag).toBeTruthy();
    const tagId = tag!.id;
    await prisma.sessionTag.create({
      data: {
        sessionId: session.id,
        tagId,
        nomor: tag!.nomor,
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
        namaBarang: "THINNER ASIA 5L",
        qtyOnhand: 10,
      },
    });

    expect(await statusOf(session.id, tagId)).toBe("belum");

    await prisma.tagSubmission.create({
      data: {
        clientRowId: randomUUID(),
        sessionId: session.id,
        tagId,
        pass: 1,
        submittedById: BUDI_ID,
        isEmpty: false,
        deviceId: "DEV-A",
        clientCreatedAt: new Date("2026-12-16T01:00:00Z"),
      },
    });
    expect(await statusOf(session.id, tagId)).toBe("menunggu_hitung_2");

    await prisma.tagSubmission.create({
      data: {
        clientRowId: randomUUID(),
        sessionId: session.id,
        tagId,
        pass: 2,
        submittedById: SARI_ID,
        isEmpty: false,
        deviceId: "DEV-B",
        clientCreatedAt: new Date("2026-12-16T02:00:00Z"),
      },
    });
    await prisma.count.create({
      data: {
        clientRowId: randomUUID(),
        sessionId: session.id,
        tagId,
        pass: 1,
        snapshotItemId: item.id,
        countedById: BUDI_ID,
        qty: 10,
        kondisi: "baik",
        deviceId: "DEV-A",
        clientCreatedAt: new Date("2026-12-16T01:01:00Z"),
      },
    });
    await prisma.count.create({
      data: {
        clientRowId: randomUUID(),
        sessionId: session.id,
        tagId,
        pass: 2,
        snapshotItemId: item.id,
        countedById: SARI_ID,
        qty: 10,
        kondisi: "baik",
        deviceId: "DEV-B",
        clientCreatedAt: new Date("2026-12-16T02:01:00Z"),
      },
    });
    expect(await statusOf(session.id, tagId)).toBe("selesai");

    await prisma.count.create({
      data: {
        clientRowId: randomUUID(),
        sessionId: session.id,
        tagId,
        pass: 2,
        snapshotItemId: item.id,
        countedById: SARI_ID,
        qty: 8,
        kondisi: "baik",
        deviceId: "DEV-B",
        clientCreatedAt: new Date("2026-12-16T02:10:00Z"),
      },
    });
    expect(await statusOf(session.id, tagId)).toBe("selisih_hitung");

    await prisma.count.create({
      data: {
        clientRowId: randomUUID(),
        sessionId: session.id,
        tagId,
        pass: 3,
        snapshotItemId: item.id,
        countedById: BUDI_ID,
        qty: 9,
        kondisi: "baik",
        deviceId: "DEV-A",
        clientCreatedAt: new Date("2026-12-16T03:00:00Z"),
      },
    });
    expect(await statusOf(session.id, tagId)).toBe("selesai");

    const emptySession = await prisma.opnameSession.create({
      data: {
        nama: "Uji kosong",
        periode: "2026-12",
        snapshotAt: new Date("2026-12-15T11:00:00Z"),
        scopeFilter: { brands: ["Asia"], groups: ["Material"] },
        status: "counting",
        createdById: ADMIN_ID,
      },
    });
    await prisma.sessionTag.create({
      data: {
        sessionId: emptySession.id,
        tagId,
        nomor: tag!.nomor,
        lokasiNama: "Lokasi I",
        gudangNama: "GUDANG 01",
        weight: 1,
        urutan: 1,
      },
    });
    await prisma.tagSubmission.createMany({
      data: [
        {
          clientRowId: randomUUID(),
          sessionId: emptySession.id,
          tagId,
          pass: 1,
          submittedById: BUDI_ID,
          isEmpty: true,
          deviceId: "DEV-A",
          clientCreatedAt: new Date("2026-12-16T04:00:00Z"),
        },
        {
          clientRowId: randomUUID(),
          sessionId: emptySession.id,
          tagId,
          pass: 2,
          submittedById: SARI_ID,
          isEmpty: true,
          deviceId: "DEV-B",
          clientCreatedAt: new Date("2026-12-16T04:01:00Z"),
        },
      ],
    });
    expect(await statusOf(emptySession.id, tagId)).toBe("kosong");
  });

  it("AC-10.4 last pending is labelled as reported and stale after three hours", async () => {
    await prisma.userDevice.update({
      where: { sessionId_deviceId: { sessionId: SESSION_ID, deviceId: "DEV-C" } },
      data: {
        lastSyncAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
        lastReportedPending: 7,
      },
    });
    const response = await app.request(`/api/sessions/${SESSION_ID}/devices`);
    expect(response.status).toBe(200);
    const body = await jsonOf(response);
    const devices = body.devices as {
      user_id: string;
      pending_reported: number;
      pending_caption: string;
      stale: boolean;
    }[];
    const agus = devices.find((row) => row.user_id === AGUS_ID);
    expect(agus?.pending_reported).toBe(7);
    expect(agus?.stale).toBe(true);
    expect(agus?.pending_caption).toMatch(/laporan HP/i);
    expect(JSON.stringify(agus)).not.toMatch(/qty_onhand|harga_satuan/);
  });

  it("denah payload has no qty or price fields", async () => {
    const response = await app.request(`/api/sessions/${SESSION_ID}/denah`);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text.includes("qty_onhand")).toBe(false);
    expect(text.includes("harga_satuan")).toBe(false);
    const body = JSON.parse(text) as { gudang: { nama: string; lokasi: unknown[] }[] };
    expect(body.gudang.some((row) => row.nama === "GUDANG 01")).toBe(true);
  });
});
