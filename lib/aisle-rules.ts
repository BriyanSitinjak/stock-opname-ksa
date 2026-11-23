export type AisleSlot = {
  gudang: number;
  aisle: string;
  label: string;
};

export type AisleTask = {
  gudang: number;
  aisle: string;
  pass: 1 | 2;
  userId: string;
};

export type AisleCross = {
  gudang: number;
  aisle: string;
  note: string;
};

export function aisleKey(gudang: number, aisle: string): string {
  return `${gudang}:${aisle}`;
}

export function aislePassKey(gudang: number, aisle: string, pass: number): string {
  return `${aisleKey(gudang, aisle)}:${pass}`;
}

export function missingAisleTasks(aisles: AisleSlot[], tasks: AisleTask[], crosses: AisleCross[]): string[] {
  const crossed = new Set(crosses.map((row) => aisleKey(row.gudang, row.aisle)));
  const have = new Set(tasks.map((row) => aislePassKey(row.gudang, row.aisle, row.pass)));
  const missing: string[] = [];
  for (const aisle of aisles) {
    if (crossed.has(aisleKey(aisle.gudang, aisle.aisle))) {
      continue;
    }
    if (!have.has(aislePassKey(aisle.gudang, aisle.aisle, 1))) {
      missing.push(`${aisle.label} di Gudang ${aisle.gudang} belum ada hitung ke-1`);
    }
    if (!have.has(aislePassKey(aisle.gudang, aisle.aisle, 2))) {
      missing.push(`${aisle.label} di Gudang ${aisle.gudang} belum ada hitung ke-2`);
    }
  }
  return missing;
}

export function samePersonOnAisle(tasks: AisleTask[]): string | null {
  const byAisle = new Map<string, { pass1?: string; pass2?: string }>();
  for (const task of tasks) {
    const key = aisleKey(task.gudang, task.aisle);
    const slot = byAisle.get(key) ?? {};
    if (task.pass === 1) {
      slot.pass1 = task.userId;
    } else {
      slot.pass2 = task.userId;
    }
    byAisle.set(key, slot);
    if (slot.pass1 && slot.pass2 && slot.pass1 === slot.pass2) {
      return "Orang yang sama tidak boleh menghitung lorong yang sama dua kali.";
    }
  }
  return null;
}

export function cardAlreadyUsed(existing: string[], incoming: string): boolean {
  const value = incoming.trim().toLocaleLowerCase("id");
  if (!value) {
    return false;
  }
  return existing.some((row) => row.trim().toLocaleLowerCase("id") === value);
}
