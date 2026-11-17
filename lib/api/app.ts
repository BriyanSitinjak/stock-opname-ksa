import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { samePersonOnBothPasses, type AssignmentInput } from "@/lib/assignment-rules";
import { prisma } from "@/lib/db";
import { releaseDevice } from "@/lib/devices";
import { ADMIN_ID } from "@/lib/fixture";
import { commitImport, parseImportFile, validateAndAggregate } from "@/lib/import";
import { devicesForSession, sessionDenah } from "@/lib/monitor";
import { buildPdf, buildWorkbook } from "@/lib/export-workbook";
import {
  anotherLiveSession,
  approveSession,
  closeSession,
  reopenSession,
  sendToReview,
  sessionPayload,
} from "@/lib/lifecycle";
import {
  assignPass3,
  daftarBarang,
  kondisiReport,
  pass3Compare,
  petaBarang,
  rekapTag,
  selisihHitung,
  selisihSistem,
  tagCompare,
  unknownItems,
} from "@/lib/reports";
import { DEFAULT_BRANDS, DEFAULT_GROUPS, liveTags, missingAssignments } from "@/lib/setup";
import { syncCounts } from "@/lib/sync";

const KondisiSchema = z.enum(["baik", "rusak", "kadaluarsa"]);

export const app = new OpenAPIHono().basePath("/api");

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Kesalahan server." }, 500);
});

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  responses: {
    200: {
      description: "Database reachable",
      content: { "application/json": { schema: z.object({ ok: z.boolean() }) } },
    },
  },
});

app.openapi(healthRoute, async (c) => {
  await prisma.$queryRaw`SELECT 1`;
  return c.json({ ok: true }, 200);
});

app.get("/setup/catalog", async (c) => {
  const gudang = await prisma.gudang.findMany({
    where: { retiredAt: null },
    orderBy: { urutan: "asc" },
    select: { id: true, kode: true, nama: true },
  });
  const counters = await prisma.user.findMany({
    where: { role: "counter", retiredAt: null },
    orderBy: { nama: "asc" },
    select: { id: true, nama: true, role: true },
  });
  return c.json({ brands: DEFAULT_BRANDS, groups: DEFAULT_GROUPS, gudang, counters });
});

app.get("/sessions", async (c) => {
  const sessions = await prisma.opnameSession.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, nama: true, periode: true, status: true, snapshotAt: true, scopeFilter: true },
  });
  return c.json(sessions);
});

app.post("/sessions", async (c) => {
  const body = await c.req.json<{
    nama?: string;
    periode?: string;
    snapshot_at?: string;
    brands?: string[];
    groups?: string[];
  }>();
  if (!body.nama?.trim() || !body.periode?.trim() || !body.snapshot_at) {
    return c.json({ error: "Nama, periode, dan waktu cut off wajib." }, 400);
  }
  if (!body.brands?.length || !body.groups?.length) {
    return c.json({ error: "Centang paling tidak satu brand dan satu group." }, 400);
  }
  const session = await prisma.opnameSession.create({
    data: {
      nama: body.nama.trim(),
      periode: body.periode.trim(),
      snapshotAt: new Date(body.snapshot_at),
      scopeFilter: { brands: body.brands, groups: body.groups },
      status: "draft",
      createdById: ADMIN_ID,
    },
  });
  return c.json({
    id: session.id,
    nama: session.nama,
    periode: session.periode,
    status: session.status,
    scope_filter: session.scopeFilter,
  });
});

app.get("/sessions/:id", async (c) => {
  const payload = await sessionPayload(c.req.param("id"));
  if (!payload) {
    return c.json({ error: "Sesi tidak ditemukan." }, 404);
  }
  return c.json(payload);
});

function refuseDevice(c: { req: { header: (name: string) => string | undefined } }) {
  if (c.req.header("x-device-id")) {
    return true;
  }
  return false;
}

function fileBody(buffer: Buffer, type: string, filename: string) {
  return new Response(Uint8Array.from(buffer), {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

async function requireSession(id: string) {
  return prisma.opnameSession.findUnique({ where: { id }, select: { id: true } });
}

app.get("/sessions/:id/denah", async (c) => {
  const id = c.req.param("id");
  if (!(await requireSession(id))) {
    return c.json({ error: "Sesi tidak ditemukan." }, 404);
  }
  return c.json({ gudang: await sessionDenah(id) });
});

app.get("/sessions/:id/devices", async (c) => {
  const id = c.req.param("id");
  if (!(await requireSession(id))) {
    return c.json({ error: "Sesi tidak ditemukan." }, 404);
  }
  return c.json({ devices: await devicesForSession(id) });
});

app.post("/users", async (c) => {
  const body = await c.req.json<{ nama?: string }>();
  if (!body.nama?.trim()) {
    return c.json({ error: "Nama wajib." }, 400);
  }
  const user = await prisma.user.create({
    data: { nama: body.nama.trim(), role: "counter" },
    select: { id: true, nama: true, role: true },
  });
  return c.json(user);
});

app.get("/sessions/:id/assignments", async (c) => {
  const id = c.req.param("id");
  const tags = await liveTags();
  const rows = await prisma.tagAssignment.findMany({ where: { sessionId: id } });
  const byKey = new Map(rows.map((row) => [`${row.tagId}:${row.pass}`, row.userId]));
  return c.json(
    tags.map((tag) => ({
      tag_id: tag.id,
      nomor: tag.nomor,
      lokasi: tag.lokasi.nama,
      gudang: tag.lokasi.gudang.nama,
      gudang_id: tag.lokasi.gudangId,
      pass_1: byKey.get(`${tag.id}:1`) ?? null,
      pass_2: byKey.get(`${tag.id}:2`) ?? null,
    })),
  );
});

app.put("/sessions/:id/assignments", async (c) => {
  const id = c.req.param("id");
  const session = await prisma.opnameSession.findUnique({ where: { id } });
  if (!session) {
    return c.json({ error: "Sesi tidak ditemukan." }, 404);
  }
  if (session.status !== "draft") {
    return c.json({ error: "Tugas hanya bisa diubah saat sesi masih draft." }, 409);
  }
  const body = await c.req.json<{ assignments?: AssignmentInput[] }>();
  const assignments = body.assignments ?? [];
  const same = samePersonOnBothPasses(assignments);
  if (same) {
    return c.json({ error: same }, 409);
  }
  const counters = await prisma.user.findMany({
    where: { role: "counter", retiredAt: null },
    select: { id: true },
  });
  const counterIds = new Set(counters.map((row) => row.id));
  const tags = await liveTags();
  const tagIds = new Set(tags.map((row) => row.id));
  for (const row of assignments) {
    if (!tagIds.has(row.tag_id)) {
      return c.json({ error: "Ada tag yang tidak ada di denah." }, 400);
    }
    if (!counterIds.has(row.user_id)) {
      return c.json({ error: "Hanya petugas hitung yang bisa ditugaskan." }, 400);
    }
  }
  await prisma.$transaction(async (tx) => {
    await tx.tagAssignment.deleteMany({ where: { sessionId: id } });
    if (assignments.length > 0) {
      await tx.tagAssignment.createMany({
        data: assignments.map((row) => ({
          sessionId: id,
          tagId: row.tag_id,
          pass: row.pass,
          userId: row.user_id,
        })),
      });
    }
  });
  const missing = await missingAssignments(id);
  return c.json({ ok: true, missing_assignments: missing });
});

const countersRoute = createRoute({
  method: "get",
  path: "/sessions/{id}/counters",
  request: {
    params: z.object({ id: z.string().min(8) }),
  },
  responses: {
    200: {
      description: "Counters assigned to this session",
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              user_id: z.string(),
              nama: z.string(),
              already_bound: z.boolean(),
            }),
          ),
        },
      },
    },
  },
});

app.openapi(countersRoute, async (c) => {
  const { id } = c.req.valid("param");
  const assigned = await prisma.tagAssignment.findMany({
    where: { sessionId: id },
    distinct: ["userId"],
    include: { user: true },
  });
  const live = await prisma.userDevice.findMany({
    where: { sessionId: id, releasedAt: null },
  });
  const liveUsers = new Set(live.map((row) => row.userId));
  return c.json(
    assigned.map((row) => ({
      user_id: row.userId,
      nama: row.user.nama,
      already_bound: liveUsers.has(row.userId),
    })),
    200,
  );
});

const bindRoute = createRoute({
  method: "post",
  path: "/sessions/{id}/bind",
  request: {
    params: z.object({ id: z.string().min(8) }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            user_id: z.string().min(8),
            device_id: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Bound",
      content: {
        "application/json": {
          schema: z.object({ ok: z.boolean(), device_id: z.string() }),
        },
      },
    },
    409: {
      description: "Already bound",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
  },
});

app.openapi(bindRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const user = await prisma.user.findUnique({ where: { id: body.user_id } });
  if (!user || user.role !== "counter") {
    return c.json({ error: "Pengguna bukan petugas hitung." }, 409);
  }
  const existing = await prisma.userDevice.findFirst({
    where: { sessionId: id, userId: body.user_id, releasedAt: null },
  });
  if (existing && existing.deviceId !== body.device_id) {
    return c.json(
      {
        error: `Petugas masih terikat pada ${existing.deviceId}. Pending terakhir yang dilaporkan: ${existing.lastReportedPending}.`,
      },
      409,
    );
  }
  if (!existing) {
    await prisma.userDevice.create({
      data: {
        sessionId: id,
        deviceId: body.device_id,
        userId: body.user_id,
        boundById: ADMIN_ID,
      },
    });
  }
  return c.json({ ok: true, device_id: body.device_id }, 200);
});

app.post("/sessions/:id/devices/release", async (c) => {
  if (c.req.header("x-device-id")) {
    return c.json({ error: "Perangkat hitung tidak boleh mengakses ini." }, 403);
  }
  const id = c.req.param("id");
  const body = await c.req.json<{ device_id?: string }>();
  if (!body.device_id) {
    return c.json({ error: "device_id wajib." }, 400);
  }
  const result = await releaseDevice(id, body.device_id);
  if ("error" in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result);
});

app.get("/sessions/:id/prepare", async (c) => {
  const id = c.req.param("id");
  const deviceId = c.req.header("x-device-id");
  if (!deviceId) {
    return c.json({ error: "x-device-id wajib." }, 401);
  }
  const binding = await prisma.userDevice.findFirst({
    where: { sessionId: id, deviceId, releasedAt: null },
    include: { user: true },
  });
  if (!binding) {
    return c.json({ error: "Perangkat tidak terikat." }, 401);
  }
  const session = await prisma.opnameSession.findUnique({ where: { id } });
  if (!session) {
    return c.json({ error: "Sesi tidak ditemukan." }, 404);
  }
  const scope = session.scopeFilter as { brands?: string[]; groups?: string[] };
  const items = await prisma.snapshotItem.findMany({
    where: { sessionId: id },
    select: {
      id: true,
      kodeBarang: true,
      barcode4: true,
      namaBarang: true,
      namaBrand: true,
      namaGroup: true,
      uom: true,
    },
    orderBy: { namaBarang: "asc" },
  });
  const sessionTags = await prisma.sessionTag.findMany({
    where: { sessionId: id },
    orderBy: [{ lokasiNama: "asc" }, { urutan: "asc" }],
  });
  const denahMap = new Map<string, { lokasi: string; tags: { id: string; nomor: string; weight: number }[] }>();
  for (const tag of sessionTags) {
    const group = denahMap.get(tag.lokasiNama) ?? { lokasi: tag.lokasiNama, tags: [] };
    group.tags.push({ id: tag.tagId, nomor: tag.nomor, weight: tag.weight });
    denahMap.set(tag.lokasiNama, group);
  }
  const assignments = await prisma.tagAssignment.findMany({
    where: { sessionId: id, userId: binding.userId },
    select: { tagId: true, pass: true },
  });
  const pass3Ids = assignments.filter((row) => row.pass === 3).map((row) => row.tagId);
  const compareByTag = await pass3Compare(id, pass3Ids);
  const payload = {
    session: {
      id: session.id,
      nama: session.nama,
      periode: session.periode,
      status: session.status,
    },
    counter: { id: binding.user.id, nama: binding.user.nama },
    scope: { brands: scope.brands ?? [], groups: scope.groups ?? [] },
    items: items.map((item) => ({
      id: item.id,
      kode_barang: item.kodeBarang,
      barcode_4: item.barcode4,
      nama_barang: item.namaBarang,
      nama_brand: item.namaBrand,
      nama_group: item.namaGroup,
      uom: item.uom,
    })),
    denah: [...denahMap.values()],
    assignments: assignments.map((row) => ({
      tag_id: row.tagId,
      pass: row.pass,
      ...(row.pass === 3 ? { compare: compareByTag.get(row.tagId) ?? [] } : {}),
    })),
  };
  return c.json(payload);
});

app.post("/sessions/:id/import", async (c) => {
  const id = c.req.param("id");
  const confirm = c.req.query("confirm") === "1";
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) {
    return c.json({ error: "Berkas wajib diunggah." }, 400);
  }
  const session = await prisma.opnameSession.findUnique({ where: { id } });
  if (!session) {
    return c.json({ error: "Sesi tidak ditemukan." }, 404);
  }
  if (session.status === "approved" || session.status === "closed") {
    return c.json({ error: "Sesi disetujui tidak bisa diubah." }, 409);
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const parsed = await parseImportFile(file.name, bytes);
  if ("error" in parsed) {
    return c.json({ error: parsed.error.message, code: parsed.error.code }, 400);
  }
  const gudang = await prisma.gudang.findMany();
  const gudangByNama = new Map(gudang.map((row) => [row.nama, { id: row.id, nama: row.nama }]));
  const scope = session.scopeFilter as { brands?: string[]; groups?: string[] };
  const result = validateAndAggregate(parsed.rows, gudangByNama, scope);
  if ("error" in result) {
    return c.json({ error: result.error.message, code: result.error.code }, 400);
  }
  if (!confirm) {
    const existing = await prisma.snapshotItem.count({ where: { sessionId: id } });
    return c.json({ ...result.preview, snapshot_items: existing, confirm_required: true });
  }
  try {
    await commitImport(id, result.raw, result.items);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Impor gagal. Tidak ada perubahan." }, 500);
  }
  return c.json({ ok: true, items: result.preview.items, source_row_count_check: result.items });
});

app.post("/sessions/:id/open", async (c) => {
  const id = c.req.param("id");
  const session = await prisma.opnameSession.findUnique({ where: { id } });
  if (!session) {
    return c.json({ error: "Sesi tidak ditemukan." }, 404);
  }
  if (session.status !== "draft") {
    return c.json({ error: "Sesi bukan draft." }, 409);
  }
  const snapshotCount = await prisma.snapshotItem.count({ where: { sessionId: id } });
  if (snapshotCount === 0) {
    return c.json({ error: "Snapshot belum diimpor." }, 409);
  }
  const tagCount = await prisma.tag.count({ where: { retiredAt: null } });
  if (tagCount === 0) {
    return c.json({ error: "Denah belum ada." }, 409);
  }
  const missing = await missingAssignments(id);
  if (missing.length > 0) {
    return c.json({ error: "Belum bisa dibuka.", missing_assignments: missing }, 409);
  }
  const live = await anotherLiveSession(id);
  if (live) {
    return c.json({ error: `Sesi ${live.nama} masih berjalan.` }, 409);
  }
  await prisma.$transaction(async (tx) => {
    await tx.sessionTag.createMany({
      data: (
        await tx.tag.findMany({
          where: { retiredAt: null, lokasi: { retiredAt: null, gudang: { retiredAt: null } } },
          include: { lokasi: { include: { gudang: true } } },
        })
      ).map((tag) => ({
        sessionId: id,
        tagId: tag.id,
        nomor: tag.nomor,
        lokasiNama: tag.lokasi.nama,
        gudangNama: tag.lokasi.gudang.nama,
        weight: tag.weight,
        urutan: tag.urutan,
      })),
    });
    await tx.opnameSession.update({
      where: { id },
      data: { status: "counting" },
    });
  });
  const written = await prisma.sessionTag.count({ where: { sessionId: id } });
  return c.json({ ok: true, session_tags: written });
});

const syncRoute = createRoute({
  method: "post",
  path: "/counts/sync",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            device_id: z.string(),
            pending_after: z.number().int().nonnegative().default(0),
            counts: z
              .array(
                z.object({
                  client_row_id: z.string().min(8),
                  tag_id: z.string().min(8),
                  pass: z.number().int(),
                  snapshot_item_id: z.string().min(8),
                  qty: z.string(),
                  qty_note: z.string().nullable().optional(),
                  kondisi: KondisiSchema,
                  client_created_at: z.string(),
                }),
              )
              .default([]),
            submissions: z
              .array(
                z.object({
                  client_row_id: z.string().min(8),
                  tag_id: z.string().min(8),
                  pass: z.number().int(),
                  is_empty: z.boolean(),
                  client_created_at: z.string(),
                }),
              )
              .default([]),
            unknowns: z
              .array(
                z.object({
                  client_row_id: z.string().min(8),
                  tag_id: z.string().min(8),
                  pass: z.number().int(),
                  kode_input: z.string().nullable().optional(),
                  nama_input: z.string().nullable().optional(),
                  qty: z.string(),
                  kondisi: KondisiSchema,
                  client_created_at: z.string(),
                }),
              )
              .default([]),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Sync result",
      content: {
        "application/json": {
          schema: z.object({
            accepted: z.array(z.string()),
            rejected: z.array(z.object({ client_row_id: z.string(), reason: z.string() })),
          }),
        },
      },
    },
    401: {
      description: "Not bound",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
    409: {
      description: "Session closed",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
  },
});

app.openapi(syncRoute, async (c) => {
  const body = c.req.valid("json");
  const result = await syncCounts({
    deviceId: body.device_id,
    pendingAfter: body.pending_after,
    counts: body.counts.map((row) => ({
      ...row,
      qty_note: row.qty_note ?? null,
    })),
    submissions: body.submissions,
    unknowns: body.unknowns.map((row) => ({
      ...row,
      kode_input: row.kode_input ?? null,
      nama_input: row.nama_input ?? null,
    })),
  });
  if ("status" in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result, 200);
});

app.get("/sessions/:id/selisih-hitung", async (c) => {
  return c.json(await selisihHitung(c.req.param("id")));
});

app.get("/sessions/:id/selisih-sistem", async (c) => {
  return c.json(await selisihSistem(c.req.param("id")));
});

app.get("/sessions/:id/compare/:tagId", async (c) => {
  const id = c.req.param("id");
  const tagId = c.req.param("tagId");
  if (!(await requireSession(id))) {
    return c.json({ error: "Sesi tidak ditemukan." }, 404);
  }
  return c.json({ items: await tagCompare(id, tagId) });
});

app.post("/sessions/:id/pass-3", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ tag_id?: string; user_id?: string }>();
  if (!body.tag_id || !body.user_id) {
    return c.json({ error: "Tag dan petugas wajib." }, 400);
  }
  const result = await assignPass3(id, body.tag_id, body.user_id);
  if ("error" in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result);
});

app.get("/sessions/:id/kondisi", async (c) => {
  return c.json(await kondisiReport(c.req.param("id")));
});

app.get("/sessions/:id/unknown-items", async (c) => {
  return c.json(await unknownItems(c.req.param("id")));
});

app.get("/sessions/:id/rekap-tag", async (c) => {
  return c.json(await rekapTag(c.req.param("id")));
});

app.get("/sessions/:id/items", async (c) => {
  const id = c.req.param("id");
  if (!(await requireSession(id))) {
    return c.json({ error: "Sesi tidak ditemukan." }, 404);
  }
  return c.json(
    await daftarBarang(id, {
      q: c.req.query("q") || undefined,
      gudang_id: c.req.query("gudang_id") || undefined,
      brand: c.req.query("brand") || undefined,
      group: c.req.query("group") || undefined,
      page: Number(c.req.query("page") ?? "1") || 1,
    }),
  );
});

app.get("/sessions/:id/peta-barang", async (c) => {
  const id = c.req.param("id");
  if (!(await requireSession(id))) {
    return c.json({ error: "Sesi tidak ditemukan." }, 404);
  }
  const kode = (c.req.query("kode") ?? "").trim();
  if (!kode) {
    return c.json({ items: [] });
  }
  return c.json({ items: await petaBarang(id, kode) });
});

app.post("/sessions/:id/review", async (c) => {
  if (refuseDevice(c)) {
    return c.json({ error: "Perangkat hitung tidak boleh mengakses ini." }, 403);
  }
  const result = await sendToReview(c.req.param("id"));
  if ("error" in result) {
    return c.json(result, result.status);
  }
  return c.json(result);
});

app.post("/sessions/:id/approve", async (c) => {
  if (refuseDevice(c)) {
    return c.json({ error: "Perangkat hitung tidak boleh mengakses ini." }, 403);
  }
  const id = c.req.param("id");
  const body = await c.req.json<{ actor_id?: string; step?: number; catatan?: string }>();
  const actorId = c.req.header("x-actor-id") ?? body.actor_id;
  if (!actorId || (body.step !== 1 && body.step !== 2)) {
    return c.json({ error: "Petugas dan langkah wajib." }, 400);
  }
  const result = await approveSession(id, actorId, body.step, body.catatan?.trim() || null);
  if ("error" in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result);
});

app.post("/sessions/:id/reopen", async (c) => {
  if (refuseDevice(c)) {
    return c.json({ error: "Perangkat hitung tidak boleh mengakses ini." }, 403);
  }
  const id = c.req.param("id");
  const body = await c.req.json<{ actor_id?: string; reason?: string }>();
  const actorId = c.req.header("x-actor-id") ?? body.actor_id;
  if (!actorId) {
    return c.json({ error: "Petugas wajib." }, 400);
  }
  const result = await reopenSession(id, actorId, body.reason ?? "");
  if ("error" in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result);
});

app.post("/sessions/:id/close", async (c) => {
  if (refuseDevice(c)) {
    return c.json({ error: "Perangkat hitung tidak boleh mengakses ini." }, 403);
  }
  const result = await closeSession(c.req.param("id"));
  if ("error" in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result);
});

app.get("/sessions/:id/export.xlsx", async (c) => {
  if (refuseDevice(c)) {
    return c.json({ error: "Perangkat hitung tidak boleh mengakses ini." }, 403);
  }
  const id = c.req.param("id");
  const session = await prisma.opnameSession.findUnique({ where: { id } });
  if (!session) {
    return c.json({ error: "Sesi tidak ditemukan." }, 404);
  }
  if (session.status !== "approved" && session.status !== "closed") {
    return c.json({ error: "Ekspor akhir hanya setelah disetujui." }, 409);
  }
  const file = await buildWorkbook(id);
  if (!file) {
    return c.json({ error: "Sesi tidak ditemukan." }, 404);
  }
  return fileBody(file.buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", file.filename);
});

app.get("/sessions/:id/export.pdf", async (c) => {
  if (refuseDevice(c)) {
    return c.json({ error: "Perangkat hitung tidak boleh mengakses ini." }, 403);
  }
  const id = c.req.param("id");
  const session = await prisma.opnameSession.findUnique({ where: { id } });
  if (!session) {
    return c.json({ error: "Sesi tidak ditemukan." }, 404);
  }
  if (session.status !== "approved" && session.status !== "closed") {
    return c.json({ error: "Ekspor akhir hanya setelah disetujui." }, 409);
  }
  const file = await buildPdf(id);
  if (!file) {
    return c.json({ error: "Sesi tidak ditemukan." }, 404);
  }
  return fileBody(file.buffer, "application/pdf", file.filename);
});

app.get("/sessions/:id/zero-found", async (c) => {
  const id = c.req.param("id");
  const rows = await prisma.$queryRaw<Array<{ barcode_4: string | null; nama_barang: string; qty_onhand: unknown }>>`
    SELECT barcode_4, nama_barang, qty_onhand
    FROM v_selisih_sistem
    WHERE session_id = ${id}::uuid
      AND qty_hitung = 0
      AND qty_onhand > 0
  `;
  return c.json(
    rows.map((row) => ({
      barcode_4: row.barcode_4,
      nama_barang: row.nama_barang,
      qty_onhand: String(row.qty_onhand),
    })),
  );
});

app.doc("/docs", {
  openapi: "3.0.0",
  info: { title: "stock-opname", version: "0.1.0" },
});

app.get("/docs/ui", (c) =>
  c.html(`<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <title>stock-opname API</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({ url: "/api/docs", dom_id: "#swagger-ui" });
    </script>
  </body>
</html>`),
);
