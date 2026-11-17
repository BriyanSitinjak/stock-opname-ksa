import { prisma } from "@/lib/db";

export const TAG_STATUSES = ["belum", "menunggu_hitung_2", "selisih_hitung", "selesai", "kosong"] as const;
export type TagStatus = (typeof TAG_STATUSES)[number];

export const TAG_STATUS_LABEL: Record<TagStatus, string> = {
  belum: "Belum dihitung",
  menunggu_hitung_2: "Menunggu hitung ke-2",
  selisih_hitung: "Selisih hitung",
  selesai: "Selesai",
  kosong: "Kosong",
};

export const TAG_STATUS_MARK: Record<TagStatus, string> = {
  belum: "B",
  menunggu_hitung_2: "2",
  selisih_hitung: "≠",
  selesai: "S",
  kosong: "K",
};

const STALE_AFTER_MS = 3 * 60 * 60 * 1000;

export const PENDING_CAPTION =
  "Laporan HP saat sinkron terakhir, bukan antrian yang terlihat server.";

export function statusCaption(status: TagStatus) {
  return `${TAG_STATUS_MARK[status]} ${TAG_STATUS_LABEL[status]}`;
}

export function selesaiCaption(row: { selesai: number; total: number; selisih_hitung: number }) {
  const base = `${row.selesai} / ${row.total} tag selesai`;
  return row.selisih_hitung > 0 ? `${base} · ≠ ${row.selisih_hitung} selisih hitung` : base;
}

export function pantauHref(sessionId: string, gudang?: string, lokasi?: string) {
  const parts = ["/siap", sessionId, "pantau"];
  if (gudang) {
    parts.push(encodeURIComponent(gudang));
  }
  if (lokasi) {
    parts.push(encodeURIComponent(lokasi));
  }
  return parts.join("/");
}

export function formatSyncAge(iso: string | null, now = Date.now()) {
  if (!iso) {
    return "Belum pernah sinkron";
  }
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) {
    return "Baru saja";
  }
  if (minutes < 60) {
    return `${minutes} menit lalu`;
  }
  return `${Math.floor(minutes / 60)} jam lalu`;
}

export type DenahTag = {
  tag_id: string;
  nomor: string;
  lokasi_nama: string;
  gudang_nama: string;
  weight: number;
  urutan: number;
  status: TagStatus;
  pass_1_nama: string | null;
  pass_2_nama: string | null;
};

export type DenahLokasi = {
  nama: string;
  selesai: number;
  total: number;
  selisih_hitung: number;
  tags: DenahTag[];
};

export type DenahGudang = {
  nama: string;
  selesai: number;
  total: number;
  selisih_hitung: number;
  lokasi: DenahLokasi[];
};

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
  const gudangMap = new Map<string, Map<string, DenahTag[]>>();
  for (const tag of tags) {
    let lokasiMap = gudangMap.get(tag.gudang_nama);
    if (!lokasiMap) {
      lokasiMap = new Map();
      gudangMap.set(tag.gudang_nama, lokasiMap);
    }
    const list = lokasiMap.get(tag.lokasi_nama) ?? [];
    list.push(tag);
    lokasiMap.set(tag.lokasi_nama, list);
  }
  return [...gudangMap.entries()].map(([nama, lokasiMap]) => {
    const lokasi = [...lokasiMap.entries()].map(([lokasiNama, lokasiTags]) => ({
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

async function denahForSession(sessionId: string): Promise<DenahTag[]> {
  const rows = await prisma.$queryRaw<StatusRow[]>`
    SELECT tag_id, nomor, lokasi_nama, gudang_nama, weight, urutan, status
    FROM v_tag_status
    WHERE session_id = ${sessionId}::uuid
    ORDER BY gudang_nama ASC, lokasi_nama ASC, urutan ASC
  `;
  const assignments = await prisma.tagAssignment.findMany({
    where: { sessionId, pass: { in: [1, 2] } },
    include: { user: { select: { nama: true } } },
  });
  const names = new Map<string, string>();
  for (const row of assignments) {
    names.set(`${row.tagId}:${row.pass}`, row.user.nama);
  }
  return rows.map((row) => {
    const status = isTagStatus(row.status) ? row.status : "belum";
    return {
      tag_id: row.tag_id,
      nomor: row.nomor,
      lokasi_nama: row.lokasi_nama,
      gudang_nama: row.gudang_nama,
      weight: Number(row.weight),
      urutan: Number(row.urutan),
      status,
      pass_1_nama: names.get(`${row.tag_id}:1`) ?? null,
      pass_2_nama: names.get(`${row.tag_id}:2`) ?? null,
    };
  });
}

export async function sessionDenah(sessionId: string) {
  return groupDenah(await denahForSession(sessionId));
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
