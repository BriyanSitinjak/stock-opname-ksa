export type AssignmentInput = { tag_id: string; pass: number; user_id: string };

export function samePersonOnBothPasses(rows: AssignmentInput[]): string | null {
  const byTag = new Map<string, { pass1?: string; pass2?: string }>();
  for (const row of rows) {
    if (row.pass !== 1 && row.pass !== 2) {
      return "Pass hanya boleh 1 atau 2.";
    }
    const slot = byTag.get(row.tag_id) ?? {};
    if (row.pass === 1) {
      slot.pass1 = row.user_id;
    } else {
      slot.pass2 = row.user_id;
    }
    byTag.set(row.tag_id, slot);
    if (slot.pass1 && slot.pass2 && slot.pass1 === slot.pass2) {
      return "Orang yang sama tidak boleh mengisi hitung ke-1 dan ke-2 pada tag yang sama.";
    }
  }
  return null;
}
