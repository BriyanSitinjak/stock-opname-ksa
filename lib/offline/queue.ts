import { openDB, type DBSchema, type IDBPDatabase } from "idb";

type CountRow = {
  client_row_id: string;
  tag_id: string;
  pass: number;
  snapshot_item_id: string;
  qty: string;
  qty_note: string | null;
  kondisi: "baik" | "rusak" | "kadaluarsa";
  client_created_at: string;
};

interface QueueSchema extends DBSchema {
  counts: {
    key: string;
    value: CountRow;
  };
}

let dbPromise: Promise<IDBPDatabase<QueueSchema>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<QueueSchema>("stock-opname-queue", 1, {
      upgrade(database) {
        database.createObjectStore("counts", { keyPath: "client_row_id" });
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
  const database = await db();
  await database.put("counts", row);
}

export async function listQueue(): Promise<CountRow[]> {
  const database = await db();
  return database.getAll("counts");
}

export async function removeAccepted(ids: string[]): Promise<void> {
  const database = await db();
  const tx = database.transaction("counts", "readwrite");
  for (const id of ids) {
    await tx.store.delete(id);
  }
  await tx.done;
}
