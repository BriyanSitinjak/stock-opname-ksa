import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { app } from "@/lib/api/app";
import { prisma } from "@/lib/db";
import { ADMIN_ID, BUDI_ID, DEWI_ID, GUDANG_01, SARI_ID, TAG_11, TAG_13 } from "@/lib/fixture";
import { jsonOf } from "@/tests/json";

const FORMULA = "=cmd|'/c calc'!A1";

async function seedSession(status: "draft" | "counting" = "counting") {
  const session = await prisma.opnameSession.create({
    data: {
      nama: "Uji siklus",
      periode: "2026-12",
      snapshotAt: new Date("2026-12-15T11:00:00Z"),
      scopeFilter: { brands: ["Asia", "Platinum"], groups: ["Material"] },
      status,
      createdById: ADMIN_ID,
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
      hargaSatuan: "85000",
    },
  });
  await prisma.sessionTag.createMany({
    data: [
      {
        sessionId: session.id,
        tagId: TAG_11,
        nomor: "1.1",
        lokasiNama: "Lokasi I",
        gudangNama: "GUDANG 01",
        weight: 3,
        urutan: 1,
      },
      {
        sessionId: session.id,
        tagId: TAG_13,
        nomor: "1.3",
        lokasiNama: "Lokasi I",
        gudangNama: "GUDANG 01",
        weight: 1,
        urutan: 3,
      },
    ],
  });
  return { session, item };
}

async function submit(sessionId: string, tagId: string, pass: number, userId: string, qty: string, note?: string) {
  await prisma.count.create({
    data: {
      clientRowId: randomUUID(),
      sessionId,
      tagId,
      pass,
      snapshotItemId: (await prisma.snapshotItem.findFirstOrThrow({ where: { sessionId } })).id,
      countedById: userId,
      qty,
      qtyNote: note ?? null,
      kondisi: "baik",
      deviceId: `DEV-${pass}-${tagId.slice(0, 4)}`,
      clientCreatedAt: new Date(),
    },
  });
  await prisma.tagSubmission.create({
    data: {
      clientRowId: randomUUID(),
      sessionId,
      tagId,
      pass,
      submittedById: userId,
      isEmpty: false,
      deviceId: `DEV-${pass}-${tagId.slice(0, 4)}`,
      clientCreatedAt: new Date(),
    },
  });
}

async function agreeBothTags(sessionId: string, note?: string) {
  await submit(sessionId, TAG_11, 1, BUDI_ID, "10", note);
  await submit(sessionId, TAG_11, 2, SARI_ID, "10");
  await submit(sessionId, TAG_13, 1, BUDI_ID, "10");
  await submit(sessionId, TAG_13, 2, SARI_ID, "10");
}

describe("Phase 8 lifecycle and export", () => {
  it("AC-9.3 review is refused while a tag lacks pass 2, with a link", async () => {
    const { session } = await seedSession();
    await submit(session.id, TAG_11, 1, BUDI_ID, "10");
    await submit(session.id, TAG_11, 2, SARI_ID, "10");
    await submit(session.id, TAG_13, 1, BUDI_ID, "10");
    const response = await app.request(`/api/sessions/${session.id}/review`, { method: "POST" });
    expect(response.status).toBe(409);
    const body = await jsonOf(response);
    const tags = body.open_tags as { nomor: string; href: string }[];
    expect(tags.some((row) => row.nomor === "1.3" && row.href.includes("/pantau/"))).toBe(true);
  });

  it("AC-9.4 review is refused while selisih hitung remains", async () => {
    const { session } = await seedSession();
    await submit(session.id, TAG_11, 1, BUDI_ID, "12");
    await submit(session.id, TAG_11, 2, SARI_ID, "10");
    await submit(session.id, TAG_13, 1, BUDI_ID, "10");
    await submit(session.id, TAG_13, 2, SARI_ID, "10");
    const response = await app.request(`/api/sessions/${session.id}/review`, { method: "POST" });
    expect(response.status).toBe(409);
    const body = await jsonOf(response);
    expect(String(body.error)).toMatch(/selisih hitung/);
    expect(body.selisih_hitung).toBeGreaterThan(0);
  });

  it("AC-9.5 approve from draft is 409", async () => {
    const { session } = await seedSession("draft");
    const response = await app.request(`/api/sessions/${session.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-actor-id": ADMIN_ID },
      body: JSON.stringify({ step: 1 }),
    });
    expect(response.status).toBe(409);
  });

  it("AC-11.1 and AC-11.2 formula injection is stored as text", async () => {
    const { session } = await seedSession();
    await agreeBothTags(session.id, FORMULA);
    await prisma.unknownItem.create({
      data: {
        clientRowId: randomUUID(),
        sessionId: session.id,
        tagId: TAG_11,
        pass: 1,
        countedById: BUDI_ID,
        deviceId: "DEV-X",
        namaInput: "=1+1",
        qty: "1",
        kondisi: "baik",
        clientCreatedAt: new Date(),
      },
    });
    expect((await app.request(`/api/sessions/${session.id}/export.xlsx`)).status).toBe(409);
    expect((await app.request(`/api/sessions/${session.id}/review`, { method: "POST" })).status).toBe(200);
    const step1 = await app.request(`/api/sessions/${session.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-actor-id": ADMIN_ID },
      body: JSON.stringify({ step: 1, catatan: FORMULA }),
    });
    expect(step1.status).toBe(200);
    const step2 = await app.request(`/api/sessions/${session.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-actor-id": DEWI_ID },
      body: JSON.stringify({ step: 2 }),
    });
    expect(step2.status).toBe(200);

    const counting = await app.request(`/api/sessions/${session.id}/export.xlsx`, {
      headers: { "x-device-id": "DEV-A" },
    });
    expect(counting.status).toBe(403);

    const file = await app.request(`/api/sessions/${session.id}/export.xlsx`);
    expect(file.status).toBe(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    expect(wb.worksheets.map((sheet) => sheet.name)).toEqual([
      "Ringkasan",
      "Selisih Sistem",
      "Selisih Hitung",
      "Barang Tidak Ditemukan",
      "Kondisi",
      "Barang Tidak Dikenal",
    ]);
    const texts: string[] = [];
    wb.eachSheet((sheet) => {
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          const value = cell.value;
          if (value && typeof value === "object" && "formula" in value) {
            texts.push("FORMULA");
            return;
          }
          texts.push(String(value ?? ""));
        });
      });
    });
    expect(texts.some((row) => row.includes("=1+1"))).toBe(true);
    expect(texts.includes("2")).toBe(false);
    expect(texts.some((row) => row.includes("FORMULA"))).toBe(false);
    expect(texts.some((row) => row.includes(FORMULA) || row.includes(`'${FORMULA}`))).toBe(true);

    const pdf = await app.request(`/api/sessions/${session.id}/export.pdf`);
    expect(pdf.status).toBe(200);
    const pdfText = Buffer.from(await pdf.arrayBuffer()).toString("latin1");
    expect(pdfText).toContain("Stock Opname KSA");
    expect(pdfText).toContain("Brand termasuk");
  });
});
