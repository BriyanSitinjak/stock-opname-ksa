import { progressForSameUser, type LocalProgress } from "@/app/hitung/local-progress";
import { locatePrepareTagById, locatePrepareTagByNomor } from "@/lib/prepare-locate";
import type { LocalLine, PreparePayload } from "@/lib/offline/queue";

type AisleRecord = {
  tag_id: string;
  nomor: string;
  lokasi: string;
  pass: number;
  nomor_kartu: string | null;
  items: number;
  is_empty: boolean;
};

export function buildAisleRecords(
  prepare: PreparePayload,
  doneLines: LocalLine[],
  progress: LocalProgress[],
): AisleRecord[] {
  const byKey = new Map<string, AisleRecord>();

  function touch(tagId: string, pass: number, nomorKartu: string | null, patch: Partial<AisleRecord>) {
    const key = `${tagId}:${pass}`;
    const place = locatePrepareTagById(prepare, tagId);
    const current = byKey.get(key) ?? {
      tag_id: tagId,
      nomor: place?.nomor ?? tagId,
      lokasi: place?.lokasi ?? "—",
      pass,
      nomor_kartu: nomorKartu,
      items: 0,
      is_empty: false,
    };
    if (!current.nomor_kartu && nomorKartu) {
      current.nomor_kartu = nomorKartu;
    }
    Object.assign(current, patch);
    byKey.set(key, current);
    return current;
  }

  for (const line of doneLines) {
    const current = touch(line.tag_id, line.pass, line.nomor_kartu ?? null, {});
    current.items += 1;
  }
  for (const row of progress) {
    touch(row.tag_id, row.pass, row.nomor_kartu, { is_empty: row.is_empty });
  }

  return [...byKey.values()].sort((left, right) => left.nomor.localeCompare(right.nomor) || left.pass - right.pass);
}

/** Same counter who finished this lorong may reopen without typing a new paper number. */
export function sameUserProgressForNomor(
  prepare: PreparePayload,
  progress: LocalProgress[],
  nomor: string,
  pass: number,
): LocalProgress | null {
  const tag = locatePrepareTagByNomor(prepare, nomor);
  if (!tag) {
    return null;
  }
  return progressForSameUser(progress, tag.id, pass, prepare.counter.id);
}
