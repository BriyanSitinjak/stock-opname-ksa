import { prisma } from "@/lib/db";
import { groupBy } from "@/lib/group";
import { liveTags } from "@/lib/setup";
import { PENDING_CAPTION } from "@/lib/sync-age";
import { TAG_STATUSES, type DenahGudang, type DenahTag, type TagStatus } from "@/lib/tag-status";

export {
  SAMPLE_DENAH_NOTE,
  TAG_STATUS_LABEL,
  TAG_STATUS_MARK,
  TAG_STATUSES,
  pantauHref,
  selesaiCaption,
  statusCaption,
  type DenahGudang,
  type DenahLokasi,
  type DenahTag,
  type TagStatus,
} from "@/lib/tag-status";

const STALE_AFTER_MS = 3 * 60 * 60 * 1000;

type StatusRow = {
  tag_id: string;
  nomor: string;
  lokasi_nama: string;
  gudang_nama: string;
  weight: number | bigint;
  urutan: number | bigint;
  status: string;
};

function isTagStatus(value: string): value is TagStatus {
  return (TAG_STATUSES as readonly string[]).includes(value);
}

function isDone(status: TagStatus) {
  return status === "selesai" || status === "kosong";
}

function groupDenah(tags: DenahTag[]): DenahGudang[] {
  return [...groupBy(tags, (tag) => tag.gudang_nama)].map(([nama, gudangTags]) => {
    const lokasi = [...groupBy(gudangTags, (tag) => tag.lokasi_nama)].map(([lokasiNama, lokasiTags]) => ({
      nama: lokasiNama,
      selesai: lokasiTags.filter((tag) => isDone(tag.status)).length,
      total: lokasiTags.length,
      selisih_hitung: lokasiTags.filter((tag) => tag.status === "selisih_hitung").length,
      tags: lokasiTags,
    }));
    return {
      nama,
      selesai: lokasi.reduce((sum, row) => sum + row.selesai, 0),
      total: lokasi.reduce((sum, row) => sum + row.total, 0),
      selisih_hitung: lokasi.reduce((sum, row) => sum + row.selisih_hitung, 0),
      lokasi,
    };
  });
}

async function passNames(sessionId: string) {
  const assignments = await prisma.tagAssignment.findMany({
    where: { sessionId, pass: { in: [1, 2] } },
    include: { user: { select: { nama: true } } },
  });
  const names = new Map<string, string>();
  for (const row of assignments) {
    names.set(`${row.tagId}:${row.pass}`, row.user.nama);
  }
  return names;
}

function withPassNames(tag: Omit<DenahTag, "pass_1_nama" | "pass_2_nama">, names: Map<string, string>): DenahTag {
  return {
    ...tag,
    pass_1_nama: names.get(`${tag.tag_id}:1`) ?? null,
    pass_2_nama: names.get(`${tag.tag_id}:2`) ?? null,
  };
}

async function denahForSession(sessionId: string): Promise<DenahTag[]> {
  const rows = await prisma.$queryRaw<StatusRow[]>`
    SELECT tag_id, nomor, lokasi_nama, gudang_nama, weight, urutan, status
    FROM v_tag_status
    WHERE session_id = ${sessionId}
    ORDER BY gudang_nama ASC, lokasi_nama ASC, urutan ASC
  `;
  const names = await passNames(sessionId);
  return rows.map((row) =>
    withPassNames(
      {
        tag_id: row.tag_id,
        nomor: row.nomor,
        lokasi_nama: row.lokasi_nama,
        gudang_nama: row.gudang_nama,
        weight: Number(row.weight),
        urutan: Number(row.urutan),
        status: isTagStatus(row.status) ? row.status : "belum",
      },
      names,
    ),
  );
}

export async function sessionDenah(sessionId: string) {
  return groupDenah(await denahForSession(sessionId));
}

async function masterPreview(sessionId: string): Promise<DenahTag[]> {
  const tags = await liveTags();
  const names = await passNames(sessionId);
  return tags.map((tag) =>
    withPassNames(
      {
        tag_id: tag.id,
        nomor: tag.nomor,
        lokasi_nama: tag.lokasi.nama,
        gudang_nama: tag.lokasi.gudang.nama,
        weight: tag.weight,
        urutan: tag.urutan,
        status: "belum",
      },
      names,
    ),
  );
}

// Draft sessions have no pin yet. The board may show the current master
// layout so the sample denah can be walked and replaced before open.
// Reports keep sessionDenah, which reads session_tags only.
export async function coordinatorDenah(sessionId: string) {
  const pinnedCount = await prisma.sessionTag.count({ where: { sessionId } });
  if (pinnedCount > 0) {
    return { gudang: await sessionDenah(sessionId), pinned: true };
  }
  const session = await prisma.opnameSession.findUnique({
    where: { id: sessionId },
    select: { status: true },
  });
  if (session?.status !== "draft") {
    return { gudang: [], pinned: false };
  }
  return { gudang: groupDenah(await masterPreview(sessionId)), pinned: false };
}

export async function coordinatorGudang(sessionId: string, nama: string) {
  const { gudang } = await coordinatorDenah(sessionId);
  return gudang.find((row) => row.nama === nama) ?? null;
}

export async function devicesForSession(sessionId: string) {
  const rows = await prisma.userDevice.findMany({
    where: { sessionId, releasedAt: null },
    include: { user: { select: { id: true, nama: true } } },
    orderBy: [{ lastSyncAt: "asc" }, { boundAt: "asc" }],
  });
  const now = Date.now();
  return rows.map((row) => {
    const lastSyncMs = row.lastSyncAt?.getTime() ?? null;
    const stale = lastSyncMs === null || now - lastSyncMs >= STALE_AFTER_MS;
    return {
      user_id: row.user.id,
      nama: row.user.nama,
      device_id: row.deviceId,
      last_sync_at: row.lastSyncAt?.toISOString() ?? null,
      pending_reported: row.lastReportedPending,
      pending_caption: PENDING_CAPTION,
      stale,
    };
  });
}
