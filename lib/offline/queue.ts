import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type Kondisi = "baik" | "rusak" | "kadaluarsa";

export type CountRow = {
  client_row_id: string;
  tag_id: string;
  pass: number;
  snapshot_item_id: string;
  qty: string;
  qty_note: string | null;
  kondisi: Kondisi;
  client_created_at: string;
};

export type SubmissionRow = {
  client_row_id: string;
  tag_id: string;
  pass: number;
  is_empty: boolean;
  client_created_at: string;
};

export type UnknownRow = {
  client_row_id: string;
  tag_id: string;
  pass: number;
  kode_input: string | null;
  nama_input: string | null;
  qty: string;
  kondisi: Kondisi;
  client_created_at: string;
};

export type PreparePayload = {
  session: { id: string; nama: string; periode: string; status: string };
  counter: { id: string; nama: string };
  scope: { brands: string[]; groups: string[] };
  items: {
    id: string;
    kode_barang: string;
    barcode_4: string | null;
    nama_barang: string;
    nama_brand: string | null;
    nama_group: string | null;
    uom: string | null;
  }[];
  denah: { lokasi: string; tags: { id: string; nomor: string; weight: number }[] }[];
  assignments: {
    tag_id: string;
    pass: number;
    compare?: {
      snapshot_item_id: string;
      barcode_4: string | null;
      nama_barang: string;
      qty_1: string | null;
      qty_2: string | null;
    }[];
  }[];
};

export type LocalLine = {
  key: string;
  tag_id: string;
  pass: number;
  snapshot_item_id: string;
  barcode_4: string | null;
  nama_barang: string;
  qty: string;
  kondisi: Kondisi;
  qty_note: string | null;
};

interface QueueSchema extends DBSchema {
  counts: { key: string; value: CountRow };
  submissions: { key: string; value: SubmissionRow };
  unknowns: { key: string; value: UnknownRow };
  prepare: { key: string; value: PreparePayload };
  lines: { key: string; value: LocalLine };
}

let dbPromise: Promise<IDBPDatabase<QueueSchema>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<QueueSchema>("stock-opname-queue", 2, {
      upgrade(database) {
        if (!database.objectStoreNames.contains("counts")) {
          database.createObjectStore("counts", { keyPath: "client_row_id" });
        }
        if (!database.objectStoreNames.contains("submissions")) {
          database.createObjectStore("submissions", { keyPath: "client_row_id" });
        }
        if (!database.objectStoreNames.contains("unknowns")) {
          database.createObjectStore("unknowns", { keyPath: "client_row_id" });
        }
        if (!database.objectStoreNames.contains("prepare")) {
          database.createObjectStore("prepare");
        }
        if (!database.objectStoreNames.contains("lines")) {
          database.createObjectStore("lines", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export function newClientRowId(): string {
  return crypto.randomUUID();
}

export function newDeviceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function enqueueCount(row: CountRow): Promise<void> {
  await (await db()).put("counts", row);
}

export async function enqueueSubmission(row: SubmissionRow): Promise<void> {
  await (await db()).put("submissions", row);
}

export async function enqueueUnknown(row: UnknownRow): Promise<void> {
  await (await db()).put("unknowns", row);
}

export async function snapshotQueue() {
  const database = await db();
  return {
    counts: await database.getAll("counts"),
    submissions: await database.getAll("submissions"),
    unknowns: await database.getAll("unknowns"),
  };
}

export function queueSize(queue: Awaited<ReturnType<typeof snapshotQueue>>): number {
  return queue.counts.length + queue.submissions.length + queue.unknowns.length;
}

export async function pendingCount(): Promise<number> {
  const database = await db();
  const counts = await database.count("counts");
  const submissions = await database.count("submissions");
  const unknowns = await database.count("unknowns");
  return counts + submissions + unknowns;
}

export async function removeAccepted(ids: string[]): Promise<void> {
  const database = await db();
  const tx = database.transaction(["counts", "submissions", "unknowns"], "readwrite");
  for (const id of ids) {
    await tx.objectStore("counts").delete(id);
    await tx.objectStore("submissions").delete(id);
    await tx.objectStore("unknowns").delete(id);
  }
  await tx.done;
}

export async function savePrepare(payload: PreparePayload): Promise<void> {
  await (await db()).put("prepare", payload, "current");
}

export async function loadPrepare(): Promise<PreparePayload | undefined> {
  return (await db()).get("prepare", "current");
}

export async function clearPrepare(): Promise<void> {
  await (await db()).delete("prepare", "current");
}

export function lineKey(tagId: string, pass: number, itemId: string, kondisi: Kondisi): string {
  return `${tagId}|${pass}|${itemId}|${kondisi}`;
}

export async function upsertLine(line: LocalLine): Promise<void> {
  await (await db()).put("lines", line);
}

export async function linesForTag(tagId: string, pass: number): Promise<LocalLine[]> {
  const all = await (await db()).getAll("lines");
  return all.filter((line) => line.tag_id === tagId && line.pass === pass);
}

export async function getLine(key: string): Promise<LocalLine | undefined> {
  return (await db()).get("lines", key);
}
