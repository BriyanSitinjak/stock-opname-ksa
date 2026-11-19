import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { app } from "@/lib/api/app";
import { prisma } from "@/lib/db";
import { ADMIN_ID, BUDI_ID, GUDANG_01, SESSION_ID } from "@/lib/fixture";
import { newDeviceId } from "@/lib/offline/queue";
import { jsonOf } from "@/tests/json";

describe("Phase 9 verification", () => {
  it("AC-1.1 counter login endpoint does not exist", async () => {
    const response = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "budi", password: "x" }),
    });
    expect(response.status).toBe(404);
  });

  it("a coordinator change without a staff cookie is refused", async () => {
    const response = await app.request("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-staff-test": "anon" },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(401);
  });

  it("AC-1.5 second live binding is refused by the unique index", async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO user_devices (session_id, device_id, user_id, bound_by)
        VALUES (${SESSION_ID}, ${`DUP-${randomUUID()}`}, ${BUDI_ID}, ${ADMIN_ID})
      `,
    ).rejects.toThrow(/23505|already exists/i);
  });

  it("AC-1.6 release then rebind on a new device", async () => {
    const session = await prisma.opnameSession.create({
      data: {
        nama: "Uji lepas",
        periode: "2026-12",
        snapshotAt: new Date("2026-12-15T11:00:00Z"),
        scopeFilter: { brands: ["Asia"], groups: ["Material"] },
        status: "counting",
        createdById: ADMIN_ID,
      },
    });
    const first = `REL-A-${String(session.id)}`;
    const second = `REL-B-${String(session.id)}`;
    await prisma.userDevice.create({
      data: { sessionId: session.id, deviceId: first, userId: BUDI_ID, boundById: ADMIN_ID, lastReportedPending: 4 },
    });
    const released = await app.request(`/api/sessions/${session.id}/devices/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: first }),
    });
    expect(released.status).toBe(200);
    const bind = await app.request(`/api/sessions/${session.id}/bind`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: BUDI_ID, device_id: second }),
    });
    expect(bind.status).toBe(200);
    const old = await prisma.userDevice.findUniqueOrThrow({
      where: { sessionId_deviceId: { sessionId: session.id, deviceId: first } },
    });
    const live = await prisma.userDevice.findUniqueOrThrow({
      where: { sessionId_deviceId: { sessionId: session.id, deviceId: second } },
    });
    expect(old.releasedAt).not.toBeNull();
    expect(live.releasedAt).toBeNull();
  });

  it("AC-1.12 generated device ids are 128-bit random", () => {
    const ids = new Set(Array.from({ length: 100 }, () => newDeviceId()));
    expect(ids.size).toBe(100);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{32}$/);
      expect(id.includes("iphone")).toBe(false);
    }
  });

  it("AC-1.14 a bound device cannot approve or export", async () => {
    const approve = await app.request(`/api/sessions/${SESSION_ID}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-device-id": "DEV-A" },
      body: JSON.stringify({ step: 1, actor_id: ADMIN_ID }),
    });
    const exported = await app.request(`/api/sessions/${SESSION_ID}/export.xlsx`, {
      headers: { "x-device-id": "DEV-A" },
    });
    expect(approve.status).toBe(403);
    expect(exported.status).toBe(403);
  });

  it("AC-12.6 status marks are unique without relying on colour", async () => {
    const { TAG_STATUS_MARK, TAG_STATUSES } = await import("@/lib/monitor");
    const marks = TAG_STATUSES.map((status) => TAG_STATUS_MARK[status]);
    expect(new Set(marks).size).toBe(TAG_STATUSES.length);
  });

  it("AC-12.10 committed files do not contain database URLs", () => {
    const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" });
    expect(tracked.split("\n").some((row) => row === ".env" || row.endsWith("/.env"))).toBe(false);
    let hits = "";
    try {
      hits = execFileSync("git", ["grep", "-I", "-l", "postgresql://", "--", "."], { encoding: "utf8" }).trim();
    } catch (error) {
      const result = error as { status?: number; stdout?: string };
      if (result.status !== 1) {
        throw error;
      }
      hits = (result.stdout ?? "").trim();
    }
    expect(hits).toBe("");
  });

  it(
    "AC-12.9 15 devices flush 100 counts each with no loss or duplicate",
    async () => {
      const lokasi = await prisma.lokasi.findFirstOrThrow({ where: { gudangId: GUDANG_01 } });
      const session = await prisma.opnameSession.create({
        data: {
          nama: "Uji beban sinkron",
          periode: "2026-12",
          snapshotAt: new Date("2026-12-15T11:00:00Z"),
          scopeFilter: { brands: ["Asia"], groups: ["Material"] },
          status: "counting",
          createdById: ADMIN_ID,
        },
      });
      const item = await prisma.snapshotItem.create({
        data: {
          sessionId: session.id,
          gudangId: GUDANG_01,
          kodeBarang: `LOAD-${String(session.id)}`,
          barcode4: "9999",
          namaBarang: "BEBAN SINKRON",
          qtyOnhand: "0",
        },
      });
      const users = await Promise.all(
        Array.from({ length: 15 }, (_, i) =>
          prisma.user.create({
            data: { nama: `Beban ${i + 1}`, role: "counter" },
          }),
        ),
      );
      const tags = await Promise.all(
        users.map((user, i) =>
          prisma.tag.create({
            data: {
              lokasiId: lokasi.id,
              nomor: `L${session.id}-${i + 1}`,
              weight: 1,
              urutan: 80 + i,
              retiredAt: new Date(),
            },
          }),
        ),
      );
      await prisma.sessionTag.createMany({
        data: tags.map((tag, i) => ({
          sessionId: session.id,
          tagId: tag.id,
          nomor: tag.nomor,
          lokasiNama: "Lokasi I",
          gudangNama: "GUDANG 01",
          weight: 1,
          urutan: i + 1,
        })),
      });
      await prisma.tagAssignment.createMany({
        data: tags.map((tag, i) => ({
          sessionId: session.id,
          tagId: tag.id,
          pass: 1,
          userId: users[i]!.id,
        })),
      });
      const devices = users.map((user, i) => `LOAD-${i}-${String(session.id)}`);
      await prisma.userDevice.createMany({
        data: devices.map((deviceId, i) => ({
          sessionId: session.id,
          deviceId,
          userId: users[i]!.id,
          boundById: ADMIN_ID,
        })),
      });
      const ids = Array.from({ length: 1500 }, () => randomUUID());
      const responses = await Promise.all(
        devices.map((deviceId, deviceIndex) => {
          const slice = ids.slice(deviceIndex * 100, deviceIndex * 100 + 100);
          const tag = tags[deviceIndex]!;
          return app.request("/api/counts/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              device_id: deviceId,
              pending_after: 0,
              counts: slice.map((client_row_id, n) => ({
                client_row_id,
                tag_id: tag.id,
                pass: 1,
                snapshot_item_id: item.id,
                qty: String(n + 1),
                qty_note: null,
                kondisi: "baik",
                client_created_at: new Date(Date.UTC(2026, 11, 1, 8, 0, n)).toISOString(),
              })),
              submissions: [],
              unknowns: [],
            }),
          });
        }),
      );
      expect(responses.every((row) => row.status === 200)).toBe(true);
      const bodies = await Promise.all(responses.map((row) => jsonOf(row)));
      const accepted = bodies.flatMap((body) => body.accepted as string[]);
      const rejected = bodies.flatMap((body) => body.rejected as unknown[]);
      expect(rejected).toEqual([]);
      expect(new Set(accepted).size).toBe(1500);
      const stored = await prisma.count.count({ where: { clientRowId: { in: ids } } });
      expect(stored).toBe(1500);
    },
    180_000,
  );
});
