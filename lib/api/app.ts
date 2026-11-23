import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { samePersonOnBothPasses, type AssignmentInput } from "@/lib/assignment-rules";
import { prisma } from "@/lib/db";
import { releaseDevice } from "@/lib/devices";
import { ADMIN_ID } from "@/lib/fixture";
import { idPattern, parseId } from "@/lib/ids";
import { ROLE_LABEL, parseRole } from "@/lib/roles";
import { commitImport, commitMaster, parseImportFile, validateAndAggregate } from "@/lib/import";
import { coordinatorDenah, devicesForSession } from "@/lib/monitor";
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
  daftarBarangChoices,
  masterBarang,
  masterBarangChoices,
  kondisiReport,
  pass3Compare,
  petaBarang,
  rekapTag,
  selisihHitung,
  selisihSistem,
  tagCompare,
  unknownItems,
} from "@/lib/reports";
import { readScope } from "@/lib/scope-display";
import { catalogNames, liveTags, missingAssignments } from "@/lib/setup";
import { listStaffActions, recordSessionAction, recordStaffAction } from "@/lib/staff-log";
import {
  checkPassword,
  clearLoginFailures,
  clearStaffCookie,
  hashPassword,
  isOpenRoute,
  loadStaff,
  loginLimited,
  recordLoginFailure,
  staffForRequest,
  writeStaffCookie,
  type StaffSession,
} from "@/lib/staff-auth";
import { aisleBoard, aisleCrosses, saveAisles } from "@/lib/aisles";
import { SHARE_CURRENT_SESSION } from "@/lib/testing";
import { copyMasterToSnapshot, replaceMasterFromSnapshot } from "@/lib/master-stock";
import { cardClashes, syncCounts } from "@/lib/sync";

const KondisiSchema = z.enum(["baik", "rusak", "kadaluarsa"]);

export const app = new OpenAPIHono().basePath("/api");

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Kesalahan server." }, 500);
});

const staffRequired = { error: "Masuk dulu sebagai Admin atau Reviewer." } as const;

app.use("*", async (c, next) => {
  if (isOpenRoute(c.req.method, c.req.path)) {
    return next();
  }
  const staff = await staffForRequest(c);
  if (!staff) {
    return c.json(staffRequired, 401);
  }
  c.set("staff", staff);
  return next();
});

app.get("/auth/staff", async (c) => {
  const users = await prisma.user.findMany({
    where: { retiredAt: null, role: { in: ["admin", "reviewer"] } },
    orderBy: { nama: "asc" },
    select: { id: true, nama: true, role: true },
  });
  return c.json({ users });
});

app.post("/auth/login", async (c) => {
  let body: { user_id?: string; username?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Pengguna tidak ditemukan." }, 404);
  }
  const user = body.user_id
    ? await prisma.user.findFirst({ where: { id: body.user_id, retiredAt: null } })
    : body.username
      ? await prisma.user.findFirst({ where: { username: body.username, retiredAt: null } })
      : null;
  if (!user || user.role === "counter" || !user.passwordHash) {
    return c.json({ error: "Pengguna tidak ditemukan." }, 404);
  }
  if (loginLimited(user.id)) {
    return c.json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, 429);
  }
  const matches = await checkPassword(body.password ?? "", user.passwordHash);
  if (!matches) {
    recordLoginFailure(user.id);
    return c.json({ error: "Password salah." }, 401);
  }
  const staff = await loadStaff(user.id);
  if (!staff) {
    return c.json({ error: "Pengguna tidak ditemukan." }, 404);
  }
  clearLoginFailures(user.id);
  writeStaffCookie(c, staff.id);
  await recordStaffAction({ actorId: staff.id, action: "login", summary: "Masuk ke Layar koordinator" });
  return c.json(staff);
});

app.post("/auth/logout", async (c) => {
  try {
    const staff = await staffForRequest(c);
    if (staff) {
      await recordStaffAction({ actorId: staff.id, action: "logout", summary: "Keluar dari Layar koordinator" });
    }
  } finally {
    clearStaffCookie(c);
  }
  return c.json({ ok: true });
});

app.get("/auth/me", (c) => c.json(c.get("staff")));

function actingId(c: { req: { header: (name: string) => string | undefined }; get: (key: "staff") => StaffSession }, bodyId?: string) {
  if (process.env.VITEST === "true") {
    const fromTest = parseId(c.req.header("x-actor-id") ?? bodyId, "usr");
    if (fromTest) {
      return fromTest;
    }
  }
  return c.get("staff").id;
}

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

async function passwordForRole(role: string, password: string | undefined, existing: string | null) {
  if (role === "counter") {
    return null;
  }
  const trimmed = password?.trim() ?? "";
  if (trimmed.length > 0) {
    if (trimmed.length < 8) {
      return "missing" as const;
    }
    return hashPassword(trimmed);
  }
  if (existing) {
    return undefined;
  }
  return "missing" as const;
}

function userChangeSummary(
  nama: string,
  changes: { role?: "admin" | "reviewer" | "counter"; password: boolean; retired: boolean },
): string | null {
  if (changes.retired) {
    return `Nonaktifkan ${nama}`;
  }
  const parts: string[] = [];
  if (changes.role) {
    parts.push(`role menjadi ${ROLE_LABEL[changes.role]}`);
  }
  if (changes.password) {
    parts.push("password diganti");
  }
  return parts.length > 0 ? `${nama}: ${parts.join(", ")}` : null;
}

function activeStaff() {
  return prisma.user.findMany({
    where: { retiredAt: null },
    orderBy: { nama: "asc" },
    select: { id: true, nama: true, role: true },
  });
}

app.get("/setup/catalog", async (c) => {
  const gudang = await prisma.gudang.findMany({
    where: { retiredAt: null },
    orderBy: { urutan: "asc" },
    select: { id: true, kode: true, nama: true },
  });
  const counters = await activeStaff();
  const names = await catalogNames();
  return c.json({ brands: names.brands, groups: names.groups, gudang, counters });
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
  const session = await prisma.opnameSession.create({
    data: {
      nama: body.nama.trim(),
      periode: body.periode.trim(),
      snapshotAt: new Date(body.snapshot_at),
      scopeFilter: { brands: body.brands ?? [], groups: body.groups ?? [] },
      status: "draft",
      createdById: c.get("staff").id,
    },
  });
  await recordStaffAction({
    actorId: c.get("staff").id,
    action: "session-create",
    sessionId: session.id,
    summary: `Buat sesi ${session.nama}`,
  });
  return c.json({
    id: session.id,
    nama: session.nama,
    periode: session.periode,
    status: session.status,
    scope_filter: session.scopeFilter,
  });
});

const sessionMissing = { error: "Sesi tidak ditemukan." } as const;

function sessionId(c: { req: { param: (name: string) => string } }) {
  return parseId(c.req.param("id"), "ses");
}

app.get("/sessions/:id", async (c) => {
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  const payload = await sessionPayload(id);
  if (!payload) {
    return c.json(sessionMissing, 404);
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
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  if (!(await requireSession(id))) {
    return c.json(sessionMissing, 404);
  }
  const denah = await coordinatorDenah(id);
  return c.json(denah);
});

app.get("/sessions/:id/devices", async (c) => {
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  if (!(await requireSession(id))) {
    return c.json(sessionMissing, 404);
  }
  return c.json({ devices: await devicesForSession(id) });
});

const deviceBlocked = { error: "Perangkat hitung tidak boleh mengakses ini." } as const;

app.get("/users", async (c) => {
  return c.json({ users: await activeStaff() });
});

app.get("/staff-actions", async (c) => {
  return c.json({ actions: await listStaffActions() });
});

app.post("/users", async (c) => {
  if (refuseDevice(c)) {
    return c.json(deviceBlocked, 403);
  }
  const body = await c.req.json<{ nama?: string; role?: string; password?: string }>();
  const role = parseRole(body.role);
  if (!body.nama?.trim() || role == null) {
    return c.json({ error: "Nama dan role wajib." }, 400);
  }
  const passwordHash = await passwordForRole(role, body.password, null);
  if (passwordHash === "missing") {
    return c.json({ error: "Password minimal 8 karakter untuk Admin dan Reviewer." }, 400);
  }
  const user = await prisma.user.create({
    data: { nama: body.nama.trim(), role, passwordHash },
    select: { id: true, nama: true, role: true },
  });
  await recordStaffAction({
    actorId: c.get("staff").id,
    action: "user-create",
    summary: `Tambah ${user.nama} sebagai ${ROLE_LABEL[user.role]}`,
  });
  return c.json(user);
});

app.patch("/users/:id", async (c) => {
  if (refuseDevice(c)) {
    return c.json(deviceBlocked, 403);
  }
  const id = parseId(c.req.param("id"), "usr");
  if (id == null) {
    return c.json({ error: "Pengguna tidak ditemukan." }, 404);
  }
  const body = await c.req.json<{ role?: string; retired?: boolean; password?: string }>();
  const role = body.role == null ? undefined : parseRole(body.role);
  if (body.role != null && role == null) {
    return c.json({ error: "Role tidak dikenal." }, 400);
  }
  if (role == null && body.retired !== true && body.password == null) {
    return c.json({ error: "Tidak ada perubahan." }, 400);
  }
  const existing = await prisma.user.findFirst({
    where: { id, retiredAt: null },
    select: { id: true, role: true, passwordHash: true },
  });
  if (!existing) {
    return c.json({ error: "Pengguna tidak ditemukan." }, 404);
  }
  if (id === c.get("staff").id) {
    return c.json({ error: "Akun yang sedang masuk tidak bisa diubah dari sini." }, 403);
  }
  const nextRole = role ?? existing.role;
  const passwordHash = await passwordForRole(nextRole, body.password, existing.passwordHash);
  if (passwordHash === "missing") {
    return c.json({ error: "Password minimal 8 karakter untuk Admin dan Reviewer." }, 400);
  }
  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(role ? { role } : {}),
      ...(passwordHash !== undefined ? { passwordHash } : {}),
      ...(body.retired === true ? { retiredAt: new Date() } : {}),
    },
    select: { id: true, nama: true, role: true, retiredAt: true },
  });
  const summary = userChangeSummary(user.nama, {
    role: role ? user.role : undefined,
    password: passwordHash !== undefined,
    retired: body.retired === true,
  });
  if (summary) {
    await recordStaffAction({ actorId: c.get("staff").id, action: "user-update", summary });
  }
  return c.json({ id: user.id, nama: user.nama, role: user.role, retired: user.retiredAt != null });
});

app.get("/sessions/:id/assignments", async (c) => {
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
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
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  const session = await prisma.opnameSession.findUnique({ where: { id } });
  if (!session) {
    return c.json(sessionMissing, 404);
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
  const counterIds = new Set((await activeStaff()).map((row) => row.id));
  const tags = await liveTags();
  const tagIds = new Set(tags.map((row) => row.id));
  const parsed: { tagId: string; userId: string; pass: number }[] = [];
  for (const row of assignments) {
    const tagId = parseId(row.tag_id, "tag");
    const userId = parseId(row.user_id, "usr");
    if (tagId == null || !tagIds.has(tagId)) {
      return c.json({ error: "Ada tag yang tidak ada di denah." }, 400);
    }
    if (userId == null || !counterIds.has(userId)) {
      return c.json({ error: "Petugas tidak ditemukan." }, 400);
    }
    parsed.push({ tagId, userId, pass: row.pass });
  }
  await prisma.$transaction(async (tx) => {
    await tx.tagAssignment.deleteMany({ where: { sessionId: id } });
    if (parsed.length > 0) {
      await tx.tagAssignment.createMany({
        data: parsed.map((row) => ({
          sessionId: id,
          tagId: row.tagId,
          pass: row.pass,
          userId: row.userId,
        })),
      });
    }
  });
  const missing = await missingAssignments(id);
  await recordStaffAction({
    actorId: c.get("staff").id,
    action: "assignments",
    sessionId: id,
    summary: `Simpan tugas pada ${session.nama}`,
  });
  return c.json({ ok: true, missing_assignments: missing });
});

app.get("/sessions/:id/aisles", async (c) => {
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  return c.json(await aisleBoard(id));
});

app.put("/sessions/:id/aisles", async (c) => {
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  const session = await prisma.opnameSession.findUnique({ where: { id } });
  if (!session) {
    return c.json(sessionMissing, 404);
  }
  if (session.status !== "draft") {
    return c.json({ error: "Tugas hanya bisa diubah saat sesi masih draft." }, 409);
  }
  const body = await c.req.json<{
    aisles?: Array<{
      gudang: number;
      aisle: string;
      pass_1: string | null;
      pass_2: string | null;
      crossed: boolean;
      note: string;
    }>;
  }>();
  const rows = body.aisles ?? [];
  const counterIds = new Set((await activeStaff()).map((row) => row.id));
  for (const row of rows) {
    for (const userId of [row.pass_1, row.pass_2]) {
      if (userId && !counterIds.has(userId)) {
        return c.json({ error: "Petugas tidak ditemukan." }, 400);
      }
    }
  }
  const saved = await saveAisles(
    id,
    rows.map((row) => ({
      gudang: row.gudang,
      aisle: row.aisle,
      pass1: row.pass_1,
      pass2: row.pass_2,
      crossed: row.crossed,
      note: row.note ?? "",
    })),
  );
  if ("error" in saved) {
    return c.json({ error: saved.error }, 409);
  }
  await recordStaffAction({
    actorId: c.get("staff").id,
    action: "assignments",
    sessionId: id,
    summary: `Simpan tugas lorong pada ${session.nama}`,
  });
  return c.json({ ok: true, missing_assignments: saved.missing });
});

app.get("/sessions/:id/kartu-bentrok", async (c) => {
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  return c.json(await cardClashes(id));
});

const countersRoute = createRoute({
  method: "get",
  path: "/sessions/{id}/counters",
  request: {
    params: z.object({ id: z.string().regex(idPattern("ses")) }),
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
  const live = await prisma.userDevice.findMany({
    where: { sessionId: id, releasedAt: null },
  });
  const liveUsers = new Set(live.map((row) => row.userId));
  const people = SHARE_CURRENT_SESSION
    ? await activeStaff()
    : (
        await prisma.tagAssignment.findMany({
          where: { sessionId: id },
          distinct: ["userId"],
          include: { user: true },
        })
      ).map((row) => ({ id: row.userId, nama: row.user.nama }));
  return c.json(
    people.map((person) => ({
      user_id: person.id,
      nama: person.nama,
      already_bound: liveUsers.has(person.id),
    })),
    200,
  );
});

const bindRoute = createRoute({
  method: "post",
  path: "/sessions/{id}/bind",
  request: {
    params: z.object({ id: z.string().regex(idPattern("ses")) }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            user_id: z.string().regex(idPattern("usr")),
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
  const session = await prisma.opnameSession.findUnique({ where: { id }, select: { id: true } });
  if (!session) {
    return c.json({ error: "Sesi tidak ditemukan." }, 409);
  }
  const user = await prisma.user.findUnique({ where: { id: body.user_id } });
  if (!user || user.retiredAt) {
    return c.json({ error: "Petugas tidak ditemukan." }, 409);
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
  if (refuseDevice(c)) {
    return c.json(deviceBlocked, 403);
  }
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  const body = await c.req.json<{ device_id?: string }>();
  if (!body.device_id) {
    return c.json({ error: "device_id wajib." }, 400);
  }
  const bound = await prisma.userDevice.findUnique({
    where: { sessionId_deviceId: { sessionId: id, deviceId: body.device_id } },
    include: { user: { select: { nama: true } } },
  });
  const result = await releaseDevice(id, body.device_id);
  if ("error" in result) {
    return c.json({ error: result.error }, result.status);
  }
  const staff = c.get("staff");
  if (staff) {
    await recordStaffAction({
      actorId: staff.id,
      action: "device-release",
      sessionId: id,
      summary: `Lepas device ${bound?.user.nama ?? body.device_id}`,
    });
  }
  return c.json(result);
});

app.get("/sessions/:id/prepare", async (c) => {
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
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
    return c.json(sessionMissing, 404);
  }
  const scope = readScope(session.scopeFilter);
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
    scope,
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
    crosses: await aisleCrosses(id),
    assignments: assignments.map((row) => ({
      tag_id: row.tagId,
      pass: row.pass,
      ...(row.pass === 3 ? { compare: compareByTag.get(row.tagId) ?? [] } : {}),
    })),
  };
  return c.json(payload);
});

function stockListQuery(c: { req: { query: (name: string) => string | undefined } }) {
  return {
    q: c.req.query("q") || undefined,
    gudang_id: c.req.query("gudang_id") || undefined,
    brand: c.req.query("brand") || undefined,
    group: c.req.query("group") || undefined,
    page: Number(c.req.query("page") ?? "1") || 1,
  };
}

async function readStockFile(file: File, scope: { brands: string[]; groups: string[] }) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const parsed = await parseImportFile(file.name, bytes);
  if ("error" in parsed) {
    return parsed;
  }
  const gudang = await prisma.gudang.findMany();
  const gudangByNama = new Map(gudang.map((row) => [row.nama, { id: row.id, nama: row.nama }]));
  return validateAndAggregate(parsed.rows, gudangByNama, scope, await catalogNames());
}

app.post("/master/import", async (c) => {
  const confirm = c.req.query("confirm") === "1";
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) {
    return c.json({ error: "File wajib di-upload." }, 400);
  }
  const result = await readStockFile(file, { brands: [], groups: [] });
  if ("error" in result) {
    return c.json({ error: result.error.message, code: result.error.code }, 400);
  }
  if (!confirm) {
    const existing = await prisma.masterItem.count();
    return c.json({ ...result.preview, master_items: existing, confirm_required: true });
  }
  try {
    await commitMaster(result.items);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Import gagal. Tidak ada perubahan." }, 500);
  }
  await recordStaffAction({
    actorId: c.get("staff").id,
    action: "import",
    summary: `Impor stok master ${result.preview.items} item`,
  });
  return c.json({ ok: true, items: result.preview.items });
});

app.get("/master/item-choices", async (c) => c.json(await masterBarangChoices()));

app.get("/master/items", async (c) => {
  return c.json(await masterBarang(stockListQuery(c)));
});

app.post("/sessions/:id/import", async (c) => {
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  const confirm = c.req.query("confirm") === "1";
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) {
    return c.json({ error: "File wajib di-upload." }, 400);
  }
  const session = await prisma.opnameSession.findUnique({ where: { id } });
  if (!session) {
    return c.json(sessionMissing, 404);
  }
  if (session.status === "approved" || session.status === "closed") {
    return c.json({ error: "Sesi yang sudah approved tidak bisa diubah." }, 409);
  }
  const result = await readStockFile(file, readScope(session.scopeFilter));
  if ("error" in result) {
    return c.json({ error: result.error.message, code: result.error.code }, 400);
  }
  if (!confirm) {
    const existing = await prisma.snapshotItem.count({ where: { sessionId: id } });
    return c.json({ ...result.preview, snapshot_items: existing, confirm_required: true });
  }
  try {
    const widen =
      result.preview.addedBrands.length > 0 || result.preview.addedGroups.length > 0 ? result.scope : undefined;
    await commitImport(id, result.raw, result.items, widen);
    await replaceMasterFromSnapshot(id);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Import gagal. Tidak ada perubahan." }, 500);
  }
  await recordStaffAction({
    actorId: c.get("staff").id,
    action: "import",
    sessionId: id,
    summary: `Impor snapshot ${result.preview.items} item pada ${session.nama}`,
  });
  return c.json({ ok: true, items: result.preview.items, source_row_count_check: result.items });
});

app.post("/sessions/:id/open", async (c) => {
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  const session = await prisma.opnameSession.findUnique({ where: { id } });
  if (!session) {
    return c.json(sessionMissing, 404);
  }
  if (session.status !== "draft") {
    return c.json({ error: "Sesi bukan draft." }, 409);
  }
  let snapshotCount = await prisma.snapshotItem.count({ where: { sessionId: id } });
  if (snapshotCount === 0) {
    await copyMasterToSnapshot(id);
    snapshotCount = await prisma.snapshotItem.count({ where: { sessionId: id } });
  }
  if (snapshotCount === 0) {
    return c.json({ error: "Stok master belum diimpor." }, 409);
  }
  const tags = await liveTags();
  if (tags.length === 0) {
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
      data: tags.map((tag) => ({
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
  await recordStaffAction({
    actorId: c.get("staff").id,
    action: "session-open",
    sessionId: id,
    summary: `Buka sesi ${session.nama}`,
  });
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
                  tag_id: z.string().regex(idPattern("tag")),
                  pass: z.number().int(),
                  snapshot_item_id: z.string().regex(idPattern("itm")),
                  qty: z.string(),
                  qty_note: z.string().nullable().optional(),
                  nomor_kartu: z.string().nullable().optional(),
                  kondisi: KondisiSchema,
                  client_created_at: z.string(),
                }),
              )
              .default([]),
            submissions: z
              .array(
                z.object({
                  client_row_id: z.string().min(8),
                  tag_id: z.string().regex(idPattern("tag")),
                  pass: z.number().int(),
                  is_empty: z.boolean(),
                  nomor_kartu: z.string().nullable().optional(),
                  client_created_at: z.string(),
                }),
              )
              .default([]),
            unknowns: z
              .array(
                z.object({
                  client_row_id: z.string().min(8),
                  tag_id: z.string().regex(idPattern("tag")),
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
      nomor_kartu: row.nomor_kartu ?? null,
    })),
    submissions: body.submissions.map((row) => ({
      ...row,
      nomor_kartu: row.nomor_kartu ?? null,
    })),
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
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  return c.json(await selisihHitung(id));
});

app.get("/sessions/:id/selisih-sistem", async (c) => {
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  return c.json(await selisihSistem(id));
});

app.get("/sessions/:id/compare/:tagId", async (c) => {
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  const tagId = parseId(c.req.param("tagId"), "tag");
  if (tagId == null || !(await requireSession(id))) {
    return c.json(sessionMissing, 404);
  }
  return c.json({ items: await tagCompare(id, tagId) });
});

app.post("/sessions/:id/pass-3", async (c) => {
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  const body = await c.req.json<{ tag_id?: string; user_id?: string }>();
  const tagId = parseId(body.tag_id, "tag");
  const userId = parseId(body.user_id, "usr");
  if (tagId == null || userId == null) {
    return c.json({ error: "Tag dan petugas wajib." }, 400);
  }
  const result = await assignPass3(id, tagId, userId);
  if ("error" in result) {
    return c.json({ error: result.error }, result.status);
  }
  const pin = await prisma.sessionTag.findUnique({
    where: { sessionId_tagId: { sessionId: id, tagId } },
    select: { nomor: true },
  });
  await recordStaffAction({
    actorId: c.get("staff").id,
    action: "pass-3",
    sessionId: id,
    summary: `Tetapkan pass 3 tag ${pin?.nomor ?? tagId} ke ${result.nama}`,
  });
  return c.json(result);
});

app.get("/sessions/:id/kondisi", async (c) => {
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  return c.json(await kondisiReport(id));
});

app.get("/sessions/:id/unknown-items", async (c) => {
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  return c.json(await unknownItems(id));
});

app.get("/sessions/:id/rekap-tag", async (c) => {
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  return c.json(await rekapTag(id));
});

app.get("/sessions/:id/item-choices", async (c) => {
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  if (!(await requireSession(id))) {
    return c.json(sessionMissing, 404);
  }
  return c.json(await daftarBarangChoices(id));
});

app.get("/sessions/:id/items", async (c) => {
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  if (!(await requireSession(id))) {
    return c.json(sessionMissing, 404);
  }
  return c.json(await daftarBarang(id, stockListQuery(c)));
});

app.get("/sessions/:id/peta-barang", async (c) => {
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  if (!(await requireSession(id))) {
    return c.json(sessionMissing, 404);
  }
  const kode = (c.req.query("kode") ?? "").trim();
  if (!kode) {
    return c.json({ items: [] });
  }
  return c.json({ items: await petaBarang(id, kode) });
});

app.post("/sessions/:id/review", async (c) => {
  if (refuseDevice(c)) {
    return c.json(deviceBlocked, 403);
  }
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  const result = await sendToReview(id);
  if ("error" in result) {
    return c.json(result, result.status);
  }
  await recordSessionAction(c.get("staff").id, "review", id, (nama) => `Kirim ${nama} ke review`);
  return c.json(result);
});

app.post("/sessions/:id/approve", async (c) => {
  if (refuseDevice(c)) {
    return c.json(deviceBlocked, 403);
  }
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  const body = await c.req.json<{ actor_id?: string; step?: number; catatan?: string }>();
  if (body.step !== 1 && body.step !== 2) {
    return c.json({ error: "Step approval hanya 1 atau 2." }, 400);
  }
  const actorId = actingId(c, body.actor_id);
  const result = await approveSession(id, actorId, body.step, body.catatan?.trim() || null);
  if ("error" in result) {
    return c.json({ error: result.error }, result.status);
  }
  await recordSessionAction(actorId, "approve", id, (nama) => `Approve step ${body.step} pada ${nama}`);
  return c.json(result);
});

app.post("/sessions/:id/reopen", async (c) => {
  if (refuseDevice(c)) {
    return c.json(deviceBlocked, 403);
  }
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  const body = await c.req.json<{ actor_id?: string; reason?: string }>();
  const actorId = actingId(c, body.actor_id);
  const result = await reopenSession(id, actorId, body.reason ?? "");
  if ("error" in result) {
    return c.json({ error: result.error }, result.status);
  }
  await recordSessionAction(actorId, "reopen", id, (nama) => `Reopen ${nama}`);
  return c.json(result);
});

app.post("/sessions/:id/close", async (c) => {
  if (refuseDevice(c)) {
    return c.json(deviceBlocked, 403);
  }
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  const result = await closeSession(id);
  if ("error" in result) {
    return c.json({ error: result.error }, result.status);
  }
  await recordSessionAction(c.get("staff").id, "close", id, (nama) => `Tutup ${nama}`);
  return c.json(result);
});

app.get("/sessions/:id/export.xlsx", async (c) => {
  if (refuseDevice(c)) {
    return c.json(deviceBlocked, 403);
  }
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  const session = await prisma.opnameSession.findUnique({ where: { id } });
  if (!session) {
    return c.json(sessionMissing, 404);
  }
  if (session.status !== "approved" && session.status !== "closed") {
    return c.json({ error: "Export akhir hanya setelah approved." }, 409);
  }
  const file = await buildWorkbook(id);
  if (!file) {
    return c.json(sessionMissing, 404);
  }
  await recordStaffAction({
    actorId: c.get("staff").id,
    action: "export-xlsx",
    sessionId: id,
    summary: `Unduh Excel ${session.nama}`,
  });
  return fileBody(file.buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", file.filename);
});

app.get("/sessions/:id/export.pdf", async (c) => {
  if (refuseDevice(c)) {
    return c.json(deviceBlocked, 403);
  }
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  const session = await prisma.opnameSession.findUnique({ where: { id } });
  if (!session) {
    return c.json(sessionMissing, 404);
  }
  if (session.status !== "approved" && session.status !== "closed") {
    return c.json({ error: "Export akhir hanya setelah approved." }, 409);
  }
  const file = await buildPdf(id);
  if (!file) {
    return c.json(sessionMissing, 404);
  }
  await recordStaffAction({
    actorId: c.get("staff").id,
    action: "export-pdf",
    sessionId: id,
    summary: `Unduh PDF ${session.nama}`,
  });
  return fileBody(file.buffer, "application/pdf", file.filename);
});

app.get("/sessions/:id/zero-found", async (c) => {
  const id = sessionId(c);
  if (id == null) return c.json(sessionMissing, 404);
  const rows = await prisma.$queryRaw<Array<{ barcode_4: string | null; nama_barang: string; qty_onhand: unknown }>>`
    SELECT barcode_4, nama_barang, qty_onhand
    FROM v_selisih_sistem
    WHERE session_id = ${id}
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
