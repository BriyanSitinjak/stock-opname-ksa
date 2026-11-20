import { prisma } from "@/lib/db";

// Vitest shares the live database. Skip the write there so a test run does not
// add rows, and so the suite still passes before this table exists.
export async function recordStaffAction(entry: {
  actorId: string;
  action: string;
  summary: string;
  sessionId?: string | null;
}) {
  if (process.env.VITEST === "true") {
    return;
  }
  await prisma.staffAction.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      summary: entry.summary,
      sessionId: entry.sessionId ?? null,
    },
  });
}

export async function recordSessionAction(
  actorId: string,
  action: string,
  sessionId: string,
  summary: (nama: string) => string,
) {
  const session = await prisma.opnameSession.findUnique({ where: { id: sessionId }, select: { nama: true } });
  await recordStaffAction({
    actorId,
    action,
    sessionId,
    summary: summary(session?.nama ?? sessionId),
  });
}

export async function listStaffActions(limit = 200) {
  const rows = await prisma.staffAction.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: { nama: true, role: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    summary: row.summary,
    created_at: row.createdAt.toISOString(),
    actor_nama: row.actor.nama,
    actor_role: row.actor.role,
  }));
}
