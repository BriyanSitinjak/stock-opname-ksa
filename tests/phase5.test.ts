import { describe, expect, it } from "vitest";
import { app } from "@/lib/api/app";
import { prisma } from "@/lib/db";
import { ADMIN_ID, BUDI_ID, SARI_ID } from "@/lib/fixture";
import { liveTags } from "@/lib/setup";
import { jsonOf } from "@/tests/json";

describe("Phase 5 session setup", () => {
  it("AC-4.14 create session stores the ticked scope", async () => {
    const response = await app.request("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nama: "Uji scope",
        periode: "2026-12",
        snapshot_at: "2026-12-15T18:00:00+07:00",
        brands: ["Asia", "Platinum", "Infinity", "Renovo"],
        groups: ["Material"],
      }),
    });
    expect(response.status).toBe(200);
    const body = await jsonOf(response);
    const stored = await prisma.opnameSession.findUnique({ where: { id: String(body.id) } });
    expect(stored?.scopeFilter).toEqual({
      brands: ["Asia", "Platinum", "Infinity", "Renovo"],
      groups: ["Material"],
    });
    expect(stored?.createdById).toBe(ADMIN_ID);
  });

  it("refuses the same person on both passes of one tag", async () => {
    const session = await prisma.opnameSession.create({
      data: {
        nama: "Uji tugas",
        periode: "2026-12",
        snapshotAt: new Date("2026-12-15T11:00:00Z"),
        scopeFilter: { brands: ["Asia"], groups: ["Material"] },
        status: "draft",
      },
    });
    const tags = await liveTags();
    const tagId = tags[0]?.id;
    expect(tagId).toBeTruthy();
    const response = await app.request(`/api/sessions/${session.id}/assignments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignments: [
          { tag_id: tagId, pass: 1, user_id: BUDI_ID },
          { tag_id: tagId, pass: 2, user_id: BUDI_ID },
        ],
      }),
    });
    expect(response.status).toBe(409);
    const body = await jsonOf(response);
    expect(String(body.error)).toMatch(/sama/i);
  });

  it("AC-3.3 open is blocked until both passes are assigned, then pins 6 session_tags", async () => {
    const session = await prisma.opnameSession.create({
      data: {
        nama: "Uji buka sesi",
        periode: "2026-12",
        snapshotAt: new Date("2026-12-15T11:00:00Z"),
        scopeFilter: { brands: ["Asia"], groups: ["Material"] },
        status: "draft",
        createdById: ADMIN_ID,
      },
    });
    const csv = [
      "Nama_Gudang,Kode_Barang,Nama_Barang,Nama_Brand,Nama_Group,barcode_4,Qty_OnHand,Harga_Satuan",
      "GUDANG 01,AS-TH-5L,THINNER ASIA 5L,Asia,Material,1234,10,85000",
    ].join("\n");
    const form = new FormData();
    form.append("file", new File([csv], "stock.csv", { type: "text/csv" }));
    const commit = await app.request(`/api/sessions/${session.id}/import?confirm=1`, {
      method: "POST",
      body: form,
    });
    expect(commit.status).toBe(200);

    const blocked = await app.request(`/api/sessions/${session.id}/open`, { method: "POST" });
    expect(blocked.status).toBe(409);
    const blockedBody = await jsonOf(blocked);
    expect(Array.isArray(blockedBody.missing_assignments)).toBe(true);
    expect((blockedBody.missing_assignments as string[]).length).toBeGreaterThan(0);

    const tags = await liveTags();
    const assignments = tags.flatMap((tag) => [
      { tag_id: tag.id, pass: 1, user_id: BUDI_ID },
      { tag_id: tag.id, pass: 2, user_id: SARI_ID },
    ]);
    const saved = await app.request(`/api/sessions/${session.id}/assignments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments }),
    });
    expect(saved.status).toBe(200);

    const opened = await app.request(`/api/sessions/${session.id}/open`, { method: "POST" });
    expect(opened.status).toBe(200);
    const openedBody = await jsonOf(opened);
    expect(openedBody.session_tags).toBe(6);
    const stored = await prisma.opnameSession.findUnique({ where: { id: session.id } });
    expect(stored?.status).toBe("counting");
  });
});
