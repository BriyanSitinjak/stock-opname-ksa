import { Prisma, type Kondisi, type SessionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { whenColumnMissing } from "@/lib/db-errors";
import { cardAlreadyUsed } from "@/lib/aisle-rules";

export type SyncCountIn = {
  client_row_id: string;
  tag_id: string;
  pass: number;
  snapshot_item_id: string;
  qty: string;
  qty_note: string | null;
  kondisi: Kondisi;
  nomor_kartu?: string | null;
  client_created_at: string;
};

export type SyncSubmissionIn = {
  client_row_id: string;
  tag_id: string;
  pass: number;
  is_empty: boolean;
  nomor_kartu?: string | null;
  client_created_at: string;
};

export type SyncUnknownIn = {
  client_row_id: string;
  tag_id: string;
  pass: number;
  kode_input: string | null;
  nama_input: string | null;
  qty: string;
  kondisi: Kondisi;
  client_created_at: string;
};

export type SyncResult = {
  accepted: string[];
  rejected: { client_row_id: string; reason: string }[];
};

export async function syncCounts(input: {
  deviceId: string;
  pendingAfter: number;
  counts: SyncCountIn[];
  submissions: SyncSubmissionIn[];
  unknowns: SyncUnknownIn[];
}): Promise<{ error: string; status: 401 | 403 | 409 } | SyncResult> {
  const binding = await prisma.userDevice.findFirst({
    where: { deviceId: input.deviceId },
    orderBy: { boundAt: "desc" },
  });
  if (!binding) {
    return { error: "Perangkat tidak terikat pada sesi ini.", status: 401 };
  }

  const session = await prisma.opnameSession.findUnique({
    where: { id: binding.sessionId },
  });
  if (!session) {
    return { error: "Sesi tidak ditemukan.", status: 403 };
  }
  const writable: SessionStatus[] = ["counting", "review"];
  if (!writable.includes(session.status)) {
    return { error: "Unggah ditolak. Sesi sudah disetujui atau ditutup.", status: 409 };
  }

  const accepted: string[] = [];
  const rejected: { client_row_id: string; reason: string }[] = [];

  for (const row of input.counts) {
    const reason = await validateCount(binding.sessionId, binding.userId, input.deviceId, row);
    if (reason) {
      rejected.push({ client_row_id: row.client_row_id, reason });
      continue;
    }
    await insertCount(binding.sessionId, binding.userId, input.deviceId, row);
    accepted.push(row.client_row_id);
  }

  for (const row of input.submissions) {
    const reason = await validateSubmission(binding.sessionId, binding.userId, input.deviceId, row);
    if (reason) {
      rejected.push({ client_row_id: row.client_row_id, reason });
      continue;
    }
    await insertSubmission(binding.sessionId, binding.userId, input.deviceId, row);
    accepted.push(row.client_row_id);
  }

  for (const row of input.unknowns) {
    const reason = await validateUnknown(binding.sessionId, binding.userId, row);
    if (reason) {
      rejected.push({ client_row_id: row.client_row_id, reason });
      continue;
    }
    await prisma.$executeRaw`
      INSERT INTO unknown_items (
        client_row_id, session_id, tag_id, pass, counted_by, device_id,
        kode_input, nama_input, qty, kondisi, client_created_at
      ) VALUES (
        ${row.client_row_id}::uuid,
        ${binding.sessionId},
        ${row.tag_id},
        ${row.pass},
        ${binding.userId},
        ${input.deviceId},
        ${row.kode_input},
        ${row.nama_input},
        ${row.qty}::numeric,
        ${row.kondisi}::"Kondisi",
        ${row.client_created_at}::timestamptz
      )
      ON CONFLICT (client_row_id) DO NOTHING
    `;
    accepted.push(row.client_row_id);
  }

  await prisma.userDevice.update({
    where: {
      sessionId_deviceId: { sessionId: binding.sessionId, deviceId: input.deviceId },
    },
    data: {
      lastSyncAt: new Date(),
      lastReportedPending: input.pendingAfter,
    },
  });

  return { accepted, rejected };
}

async function validateCount(
  sessionId: string,
  userId: string,
  deviceId: string,
  row: SyncCountIn,
): Promise<string | null> {
  if (row.pass < 1 || row.pass > 3) {
    return "Pass tidak sah.";
  }
  try {
    const qty = new Prisma.Decimal(row.qty);
    if (qty.isNegative()) {
      return "Jumlah tidak boleh negatif.";
    }
  } catch {
    return "Jumlah tidak sah.";
  }

  const pin = await prisma.sessionTag.findUnique({
    where: { sessionId_tagId: { sessionId, tagId: row.tag_id } },
  });
  if (!pin) {
    return "Tag tidak ada pada sesi ini.";
  }

  const assignment = await prisma.tagAssignment.findUnique({
    where: {
      sessionId_tagId_pass: { sessionId, tagId: row.tag_id, pass: row.pass },
    },
  });
  if (!assignment || assignment.userId !== userId) {
    return "Tag ini tidak ditugaskan kepada Anda.";
  }

  const item = await prisma.snapshotItem.findFirst({
    where: { id: row.snapshot_item_id, sessionId },
  });
  if (!item) {
    return "Barang tidak termasuk sesi ini.";
  }

  const pair = await pass2DeviceConflict(sessionId, row.tag_id, row.pass, deviceId, userId);
  if (pair) {
    return pair;
  }
  return ownCardRepeat(sessionId, deviceId, row.tag_id, row.nomor_kartu);
}

async function validateSubmission(
  sessionId: string,
  userId: string,
  deviceId: string,
  row: SyncSubmissionIn,
): Promise<string | null> {
  const pin = await prisma.sessionTag.findUnique({
    where: { sessionId_tagId: { sessionId, tagId: row.tag_id } },
  });
  if (!pin) {
    return "Tag tidak ada pada sesi ini.";
  }
  const assignment = await prisma.tagAssignment.findUnique({
    where: {
      sessionId_tagId_pass: { sessionId, tagId: row.tag_id, pass: row.pass },
    },
  });
  if (!assignment || assignment.userId !== userId) {
    return "Tag ini tidak ditugaskan kepada Anda.";
  }
  const pair = await pass2DeviceConflict(sessionId, row.tag_id, row.pass, deviceId, userId);
  if (pair) {
    return pair;
  }
  return ownCardRepeat(sessionId, deviceId, row.tag_id, row.nomor_kartu);
}

async function validateUnknown(
  sessionId: string,
  userId: string,
  row: SyncUnknownIn,
): Promise<string | null> {
  const assignment = await prisma.tagAssignment.findUnique({
    where: {
      sessionId_tagId_pass: { sessionId, tagId: row.tag_id, pass: row.pass },
    },
  });
  if (!assignment || assignment.userId !== userId) {
    return "Tag ini tidak ditugaskan kepada Anda.";
  }
  try {
    if (new Prisma.Decimal(row.qty).isNegative()) {
      return "Jumlah tidak boleh negatif.";
    }
  } catch {
    return "Jumlah tidak sah.";
  }
  return null;
}

async function pass2DeviceConflict(
  sessionId: string,
  tagId: string,
  pass: number,
  deviceId: string,
  userId: string,
): Promise<string | null> {
  if (pass !== 2) {
    return null;
  }
  const pass1 = await prisma.tagAssignment.findUnique({
    where: { sessionId_tagId_pass: { sessionId, tagId, pass: 1 } },
  });
  if (pass1 && pass1.userId === userId) {
    return "Hitung ke-2 tidak boleh orang yang sama.";
  }
  const pass1Sub = await prisma.tagSubmission.findFirst({
    where: { sessionId, tagId, pass: 1 },
    orderBy: { clientCreatedAt: "desc" },
  });
  if (pass1Sub && pass1Sub.deviceId === deviceId) {
    return "Hitung ke-2 harus dari HP berbeda";
  }
  return null;
}

async function insertCount(sessionId: string, userId: string, deviceId: string, row: SyncCountIn) {
  const nomor = row.nomor_kartu?.trim() || null;
  await whenColumnMissing(
    () => prisma.$executeRaw`
      INSERT INTO counts (
        client_row_id, session_id, tag_id, pass, snapshot_item_id,
        counted_by, qty, qty_note, kondisi, nomor_kartu, device_id, client_created_at
      ) VALUES (
        ${row.client_row_id}::uuid,
        ${sessionId},
        ${row.tag_id},
        ${row.pass},
        ${row.snapshot_item_id},
        ${userId},
        ${row.qty}::numeric,
        ${row.qty_note},
        ${row.kondisi}::"Kondisi",
        ${nomor},
        ${deviceId},
        ${row.client_created_at}::timestamptz
      )
      ON CONFLICT (client_row_id) DO NOTHING
    `,
    () => prisma.$executeRaw`
      INSERT INTO counts (
        client_row_id, session_id, tag_id, pass, snapshot_item_id,
        counted_by, qty, qty_note, kondisi, device_id, client_created_at
      ) VALUES (
        ${row.client_row_id}::uuid,
        ${sessionId},
        ${row.tag_id},
        ${row.pass},
        ${row.snapshot_item_id},
        ${userId},
        ${row.qty}::numeric,
        ${row.qty_note},
        ${row.kondisi}::"Kondisi",
        ${deviceId},
        ${row.client_created_at}::timestamptz
      )
      ON CONFLICT (client_row_id) DO NOTHING
    `,
  );
}

async function insertSubmission(sessionId: string, userId: string, deviceId: string, row: SyncSubmissionIn) {
  const nomor = row.nomor_kartu?.trim() || null;
  await whenColumnMissing(
    () => prisma.$executeRaw`
      INSERT INTO tag_submissions (
        client_row_id, session_id, tag_id, pass, submitted_by,
        is_empty, nomor_kartu, device_id, client_created_at
      ) VALUES (
        ${row.client_row_id}::uuid,
        ${sessionId},
        ${row.tag_id},
        ${row.pass},
        ${userId},
        ${row.is_empty},
        ${nomor},
        ${deviceId},
        ${row.client_created_at}::timestamptz
      )
      ON CONFLICT (client_row_id) DO NOTHING
    `,
    () => prisma.$executeRaw`
      INSERT INTO tag_submissions (
        client_row_id, session_id, tag_id, pass, submitted_by,
        is_empty, device_id, client_created_at
      ) VALUES (
        ${row.client_row_id}::uuid,
        ${sessionId},
        ${row.tag_id},
        ${row.pass},
        ${userId},
        ${row.is_empty},
        ${deviceId},
        ${row.client_created_at}::timestamptz
      )
      ON CONFLICT (client_row_id) DO NOTHING
    `,
  );
}

async function ownCardRepeat(
  sessionId: string,
  deviceId: string,
  tagId: string,
  nomorKartu: string | null | undefined,
): Promise<string | null> {
  const nomor = nomorKartu?.trim() ?? "";
  if (!nomor) {
    return null;
  }
  return whenColumnMissing(async () => {
    const prior = await prisma.$queryRaw<Array<{ nomor_kartu: string }>>`
      SELECT nomor_kartu FROM counts
      WHERE session_id = ${sessionId}
        AND device_id = ${deviceId}
        AND tag_id <> ${tagId}
        AND nomor_kartu IS NOT NULL
    `;
    return cardAlreadyUsed(prior.map((row) => row.nomor_kartu), nomor)
      ? "Nomor kartu ini sudah Anda pakai di HP ini."
      : null;
  }, async () => null);
}

export async function cardClashes(sessionId: string): Promise<Array<{ nomor_kartu: string; pemakaian: number }>> {
  return whenColumnMissing(
    () => prisma.$queryRaw<Array<{ nomor_kartu: string; pemakaian: number }>>`
      SELECT min(nomor_kartu) AS nomor_kartu, COUNT(DISTINCT device_id)::int AS pemakaian
      FROM counts
      WHERE session_id = ${sessionId}
        AND nomor_kartu IS NOT NULL
        AND btrim(nomor_kartu) <> ''
      GROUP BY lower(nomor_kartu)
      HAVING COUNT(DISTINCT device_id) > 1 OR COUNT(DISTINCT pass) > 1
      ORDER BY min(nomor_kartu)
    `,
    async () => [],
  );
}
