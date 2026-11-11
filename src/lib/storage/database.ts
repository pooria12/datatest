import { STORAGE_VERSION } from "@/types/dataset.types";

export const DB_NAME = "DataMindAI";
export const DB_VERSION = STORAGE_VERSION;
/** Dataset metadata (small, listed and sorted without loading any rows). */
export const META_STORE = "datasets";
/** Row data, one record per dataset, loaded only when the rows are needed. */
export const RECORDS_STORE = "records";

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * v1 kept metadata and rows together in a single `datasets` record.
 * v2 keeps metadata in `datasets` and the rows in `records`, so listing or recovering the active
 * dataset never has to read every row. Existing v1 data is migrated in place.
 */
function upgrade(db: IDBDatabase, tx: IDBTransaction, oldVersion: number): void {
  if (oldVersion < 1) {
    const meta = db.createObjectStore(META_STORE, { keyPath: "id" });
    meta.createIndex("savedAt", "savedAt", { unique: false });
  }

  if (oldVersion < 2) {
    if (!db.objectStoreNames.contains(RECORDS_STORE)) {
      db.createObjectStore(RECORDS_STORE, { keyPath: "id" });
    }
    if (oldVersion === 1) {
      const meta = tx.objectStore(META_STORE);
      const records = tx.objectStore(RECORDS_STORE);
      const cursorRequest = meta.openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        const legacy = cursor.value as {
          id: string;
          dataset: unknown;
          records?: Array<Record<string, string>>;
          savedAt: string;
        };
        records.put({ id: legacy.id, records: legacy.records ?? [] });
        cursor.update({
          id: legacy.id,
          version: DB_VERSION,
          dataset: legacy.dataset,
          savedAt: legacy.savedAt,
        });
        cursor.continue();
      };
    }
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open IndexedDB database"));
    };

    request.onblocked = () => {
      reject(
        new Error("The database is blocked by another open tab. Close other DataMind AI tabs and retry.")
      );
    };

    request.onupgradeneeded = (event) => {
      const tx = request.transaction;
      if (!tx) return;
      upgrade(request.result, tx, event.oldVersion);
    };

    request.onsuccess = () => {
      const db = request.result;
      // Let another tab upgrade the schema instead of blocking it forever.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
  });

  dbPromise = promise;
  // Do not cache a failed open: the next call must be able to try again.
  promise.catch(() => {
    if (dbPromise === promise) dbPromise = null;
  });
  return promise;
}

export async function getDatabase(): Promise<IDBDatabase> {
  return openDatabase();
}

export async function closeDatabase(): Promise<void> {
  if (!dbPromise) return;
  const pending = dbPromise;
  dbPromise = null;
  try {
    (await pending).close();
  } catch {
    // Opening failed, so there is nothing to close.
  }
}

export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}
