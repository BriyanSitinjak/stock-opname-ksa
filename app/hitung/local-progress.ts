// Progress stays on the phone so Denah can show finished lorong even after
// queue rows are cleared by sync. Koordinator Pantau reads the same facts from
// the server once Sinkronisasi succeeds.

import { nameInitials } from "@/lib/name-initials";
import type { TagProgressRow } from "@/lib/offline/queue";

export type LocalProgress = {
  tag_id: string;
  pass: number;
  nomor_kartu: string | null;
  is_empty: boolean;
  /** Counter who marked the lorong selesai/kosong on this device. */
  user_id?: string;
  /** Display name for denah initials (pass 1 / pass 2). */
  user_nama?: string;
};

/** Denah cell mark: initials + nomor tag from Hitung ke-1 when known. */
export type TagPlaceMark = {
  pass1: string;
  pass2: string;
  nomor_kartu: string | null;
};

function key(sessionId: string) {
  return `hitung_progress:${sessionId}`;
}

export function loadProgress(sessionId: string): LocalProgress[] {
  if (typeof window === "undefined" || !sessionId) {
    return [];
  }
  try {
    const raw = localStorage.getItem(key(sessionId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as LocalProgress[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function upsertProgress(sessionId: string, row: LocalProgress) {
  const next = loadProgress(sessionId).filter(
    (item) => !(item.tag_id === row.tag_id && item.pass === row.pass),
  );
  next.push(row);
  localStorage.setItem(key(sessionId), JSON.stringify(next));
}

/** Same counter who finished this lorong on this phone may reopen without a new paper number. */
export function progressForSameUser(
  progress: LocalProgress[],
  tagId: string,
  pass: number,
  userId: string,
): LocalProgress | null {
  return (
    progress.find(
      (row) =>
        row.tag_id === tagId &&
        row.pass === pass &&
        (!row.user_id || row.user_id === userId),
    ) ?? null
  );
}

/**
 * Nomor tag from Hitung ke-1 for a lorong: assignment payload, then server
 * tag_progress, then local progress.
 */
export function pass1NomorKartu(
  tagId: string,
  sources: {
    preferred?: string | null;
    local?: LocalProgress[];
    server?: TagProgressRow[];
  },
): string {
  const preferred = sources.preferred?.trim();
  if (preferred) {
    return preferred;
  }
  const fromServer = sources.server?.find((row) => row.tag_id === tagId && row.pass === 1)?.nomor_kartu?.trim();
  if (fromServer) {
    return fromServer;
  }
  return sources.local?.find((row) => row.tag_id === tagId && row.pass === 1)?.nomor_kartu?.trim() || "";
}

function initialsForRow(
  row: LocalProgress,
  counter: { id: string; nama: string },
  selfInitials: string,
): string {
  return (
    nameInitials(row.user_nama) ||
    (row.user_id && row.user_id === counter.id ? selfInitials : "") ||
    (row.user_id || row.nomor_kartu ? "·" : "")
  );
}

function mergeProgressRows(
  local: LocalProgress[],
  server: TagProgressRow[] | undefined,
): LocalProgress[] {
  const byKey = new Map<string, LocalProgress>();
  for (const row of server ?? []) {
    byKey.set(`${row.tag_id}:${row.pass}`, {
      tag_id: row.tag_id,
      pass: row.pass,
      nomor_kartu: row.nomor_kartu,
      is_empty: row.is_empty,
      user_id: row.user_id,
      user_nama: row.user_nama,
    });
  }
  for (const row of local) {
    byKey.set(`${row.tag_id}:${row.pass}`, row);
  }
  return [...byKey.values()];
}

/**
 * Merge server tag_progress (from unduh ulang after sync) with local progress.
 * Local wins on the same tag+pass so unfinished phone work stays visible.
 */
export function mergedTagPlaceMarks(
  local: LocalProgress[],
  server: TagProgressRow[] | undefined,
  counter: { id: string; nama: string },
): Map<string, TagPlaceMark> {
  const rows = mergeProgressRows(local, server);
  const map = new Map<string, TagPlaceMark>();
  const selfInitials = nameInitials(counter.nama);
  for (const row of rows) {
    const current = map.get(row.tag_id) ?? { pass1: "", pass2: "", nomor_kartu: null };
    const initials = initialsForRow(row, counter, selfInitials);
    if (row.pass === 1) {
      current.pass1 = initials;
      if (row.nomor_kartu) {
        current.nomor_kartu = row.nomor_kartu;
      }
    } else if (row.pass === 2) {
      current.pass2 = initials;
      if (!current.nomor_kartu && row.nomor_kartu) {
        current.nomor_kartu = row.nomor_kartu;
      }
    }
    map.set(row.tag_id, current);
  }
  return map;
}
