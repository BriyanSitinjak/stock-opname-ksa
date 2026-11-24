import type { PreparePayload } from "@/lib/offline/queue";

export type LocatedPrepareTag = {
  id: string;
  nomor: string;
  weight: number;
  lokasi: string;
};

export function locatePrepareTag(
  prepare: PreparePayload,
  match: (tag: { id: string; nomor: string }) => boolean,
): LocatedPrepareTag | null {
  for (const lokasi of prepare.denah) {
    const tag = lokasi.tags.find(match);
    if (tag) {
      return { ...tag, lokasi: lokasi.lokasi };
    }
  }
  return null;
}

export function locatePrepareTagByNomor(prepare: PreparePayload, nomor: string) {
  return locatePrepareTag(prepare, (tag) => tag.nomor === nomor);
}

export function locatePrepareTagById(prepare: PreparePayload, tagId: string) {
  return locatePrepareTag(prepare, (tag) => tag.id === tagId);
}

export function latestAssignment(prepare: PreparePayload, tagId: string, pass?: number) {
  const mine = prepare.assignments.filter((row) => row.tag_id === tagId);
  if (pass != null) {
    return mine.find((row) => row.pass === pass) ?? null;
  }
  return [...mine].sort((left, right) => right.pass - left.pass)[0] ?? null;
}
