import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { pantauHref } from "@/lib/monitor";
import { selisihHitung } from "@/lib/reports";
import { displayedScope } from "@/lib/scope-display";
import { missingAssignments } from "@/lib/setup";

export type OpenTag = {
  tag_id: string;
  nomor: string;
  gudang_nama: string;
  lokasi_nama: string;
  status: string;
  href: string;
};

export async function reviewBlockers(sessionId: string) {
  const tags = await prisma.$queryRaw<
    Array<{ tag_id: string; nomor: string; gudang_nama: string; lokasi_nama: string; status: string }>
  >`
    SELECT tag_id, nomor, gudang_nama, lokasi_nama, status
    FROM v_tag_status
    WHERE session_id = ${sessionId}
      AND status IN ('belum', 'menunggu_hitung_2', 'selisih_hitung')
    ORDER BY gudang_nama, lokasi_nama, urutan
  `;
  const disputes = await selisihHitung(sessionId);
  const open_tags: OpenTag[] = tags
    .filter((row) => row.status === "belum" || row.status === "menunggu_hitung_2")
    .map((row) => ({
      tag_id: row.tag_id,
      nomor: row.nomor,
      gudang_nama: row.gudang_nama,
      lokasi_nama: row.lokasi_nama,
      status: row.status,
      href: pantauHref(sessionId, row.gudang_nama, row.lokasi_nama),
    }));
  return {
    open_tags,
    selisih_hitung: disputes.length,
    ready: open_tags.length === 0 && disputes.length === 0,
  };
}

export async function sendToReview(sessionId: string) {
  const session = await prisma.opnameSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return { error: "Sesi tidak ditemukan.", status: 404 as const };
  }
  if (session.status !== "counting") {
    return { error: "Hanya sesi counting yang bisa dikirim ke penelaahan.", status: 409 as const };
  }
  const blockers = await reviewBlockers(sessionId);
  if (blockers.open_tags.length > 0) {
    return {
      error: "Masih ada tag yang belum selesai dihitung.",
      status: 409 as const,
      open_tags: blockers.open_tags,
    };
  }
  if (blockers.selisih_hitung > 0) {
    return {
      error: `Masih ada ${blockers.selisih_hitung} selisih hitung.`,
      status: 409 as const,
      selisih_hitung: blockers.selisih_hitung,
    };
  }
  await prisma.opnameSession.update({ where: { id: sessionId }, data: { status: "review" } });
  return { ok: true as const, session_status: "review" as const };
}

function stepRole(step: number): Role {
  return step === 1 ? "admin" : "reviewer";
}

export async function approveSession(sessionId: string, actorId: string, step: number, catatan: string | null) {
  if (step !== 1 && step !== 2) {
    return { error: "Langkah persetujuan hanya 1 atau 2.", status: 400 as const };
  }
  const session = await prisma.opnameSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return { error: "Sesi tidak ditemukan.", status: 404 as const };
  }
  if (session.status !== "review") {
    return { error: "Persetujuan hanya saat sesi penelaahan.", status: 409 as const };
  }
  const actor = await prisma.user.findFirst({ where: { id: actorId, retiredAt: null } });
  if (!actor || actor.role !== stepRole(step)) {
    return { error: "Petugas ini tidak berwenang pada langkah itu.", status: 403 as const };
  }
  if (step === 2) {
    const first = await prisma.approval.findUnique({
      where: { sessionId_step: { sessionId, step: 1 } },
    });
    if (!first) {
      return { error: "Langkah 1 belum dicatat.", status: 409 as const };
    }
  }
  try {
    await prisma.approval.create({
      data: { sessionId, step, approvedById: actorId, catatan },
    });
  } catch {
    return { error: "Langkah ini sudah disetujui.", status: 409 as const };
  }
  if (step === 2) {
    await prisma.opnameSession.update({ where: { id: sessionId }, data: { status: "approved" } });
  }
  const next = await prisma.opnameSession.findUniqueOrThrow({ where: { id: sessionId } });
  return { ok: true as const, session_status: next.status, step, nama: actor.nama };
}

export async function reopenSession(sessionId: string, actorId: string, reason: string) {
  const trimmed = reason.trim();
  if (!trimmed) {
    return { error: "Alasan buka ulang wajib.", status: 400 as const };
  }
  const session = await prisma.opnameSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return { error: "Sesi tidak ditemukan.", status: 404 as const };
  }
  if (session.status !== "approved" && session.status !== "closed") {
    return { error: "Hanya sesi disetujui atau ditutup yang bisa dibuka ulang.", status: 409 as const };
  }
  const actor = await prisma.user.findFirst({ where: { id: actorId, role: "admin", retiredAt: null } });
  if (!actor) {
    return { error: "Hanya admin yang bisa membuka ulang.", status: 403 as const };
  }
  await prisma.$transaction([
    prisma.sessionReopen.create({
      data: { sessionId, reason: trimmed, reopenedById: actorId },
    }),
    prisma.opnameSession.update({ where: { id: sessionId }, data: { status: "counting" } }),
  ]);
  return { ok: true as const, session_status: "counting" as const };
}

export async function closeSession(sessionId: string) {
  const session = await prisma.opnameSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return { error: "Sesi tidak ditemukan.", status: 404 as const };
  }
  if (session.status !== "approved") {
    return { error: "Hanya sesi disetujui yang bisa ditutup.", status: 409 as const };
  }
  await prisma.opnameSession.update({ where: { id: sessionId }, data: { status: "closed" } });
  return { ok: true as const, session_status: "closed" as const };
}

export async function anotherLiveSession(exceptId: string) {
  return prisma.opnameSession.findFirst({
    where: { id: { not: exceptId }, status: { in: ["counting", "review"] } },
    select: { id: true, nama: true },
  });
}

export async function sessionPayload(sessionId: string) {
  const session = await prisma.opnameSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return null;
  }
  const [snapshotItems, sessionTags, missing, blockers, approvals, actors, scope] = await Promise.all([
    prisma.snapshotItem.count({ where: { sessionId } }),
    prisma.sessionTag.count({ where: { sessionId } }),
    missingAssignments(sessionId),
    reviewBlockers(sessionId),
    prisma.approval.findMany({
      where: { sessionId },
      include: { approvedBy: { select: { nama: true } } },
      orderBy: { step: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["admin", "reviewer"] }, retiredAt: null },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, role: true },
    }),
    displayedScope(session),
  ]);
  return {
    id: session.id,
    nama: session.nama,
    periode: session.periode,
    status: session.status,
    snapshot_at: session.snapshotAt.toISOString(),
    scope_filter: session.scopeFilter,
    scope,
    snapshot_items: snapshotItems,
    session_tags: sessionTags,
    missing_assignments: missing,
    review: blockers,
    approvals: approvals.map((row) => ({
      step: row.step,
      nama: row.approvedBy.nama,
      approved_at: row.approvedAt.toISOString(),
      catatan: row.catatan,
    })),
    actors,
  };
}
