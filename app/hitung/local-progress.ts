// Progress stays on the phone so Denah can show finished lorong even after
// queue rows are cleared by sync. Koordinator Pantau reads the same facts from
// the server once Sinkronisasi succeeds.

export type LocalProgress = {
  tag_id: string;
  pass: number;
  nomor_kartu: string | null;
  is_empty: boolean;
  /** Counter who marked the lorong selesai/kosong on this device. */
  user_id?: string;
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
