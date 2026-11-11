import type { StoredDataset, StoredDatasetMeta } from "@/types/dataset.types";
import {
  getDatabase,
  isIndexedDBAvailable,
  META_STORE,
  RECORDS_STORE,
} from "./database";

type Rows = Array<Record<string, string>>;

export interface DatasetRepository {
  save(dataset: StoredDataset): Promise<void>;
  get(id: string): Promise<StoredDataset | null>;
  getMeta(id: string): Promise<StoredDatasetMeta | null>;
  getRecords(id: string): Promise<Rows | null>;
  /** Metadata of the most recently saved dataset (no rows are read). */
  getActiveMeta(): Promise<StoredDatasetMeta | null>;
  setActive(id: string): Promise<void>;
  delete(id: string): Promise<void>;
  deleteActive(): Promise<void>;
  /** Removes every dataset except the given one. The app works on a single active dataset. */
  pruneExcept(keepId: string): Promise<void>;
}

/** Turns IndexedDB failures (especially quota errors) into a readable message. */
export function describeStorageError(error: unknown): string {
  const name = error instanceof DOMException || error instanceof Error ? error.name : "";
  if (name === "QuotaExceededError") {
    return "Not enough browser storage space to save this dataset.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "The dataset could not be saved to browser storage.";
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Resolves only when the transaction has really committed (not merely when a request succeeded). */
function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new DOMException("Transaction aborted", "AbortError"));
  });
}

class IndexedDBDatasetRepository implements DatasetRepository {
  private async transaction(
    stores: string | string[],
    mode: IDBTransactionMode
  ): Promise<IDBTransaction> {
    const db = await getDatabase();
    return db.transaction(stores, mode);
  }

  async save(dataset: StoredDataset): Promise<void> {
    if (!isIndexedDBAvailable()) {
      throw new Error("IndexedDB is not available in this browser");
    }
    const { records, ...meta } = dataset;
    const tx = await this.transaction([META_STORE, RECORDS_STORE], "readwrite");
    const done = transactionDone(tx);
    tx.objectStore(META_STORE).put(meta);
    tx.objectStore(RECORDS_STORE).put({ id: dataset.id, records });
    await done;
  }

  async getMeta(id: string): Promise<StoredDatasetMeta | null> {
    if (!isIndexedDBAvailable()) return null;
    const tx = await this.transaction(META_STORE, "readonly");
    const result = await requestToPromise(tx.objectStore(META_STORE).get(id));
    return (result as StoredDatasetMeta | undefined) ?? null;
  }

  async getRecords(id: string): Promise<Rows | null> {
    if (!isIndexedDBAvailable()) return null;
    const tx = await this.transaction(RECORDS_STORE, "readonly");
    const result = await requestToPromise(tx.objectStore(RECORDS_STORE).get(id));
    return (result as { records: Rows } | undefined)?.records ?? null;
  }

  async get(id: string): Promise<StoredDataset | null> {
    const meta = await this.getMeta(id);
    if (!meta) return null;
    const records = (await this.getRecords(id)) ?? [];
    return { ...meta, records };
  }

  async getActiveMeta(): Promise<StoredDatasetMeta | null> {
    if (!isIndexedDBAvailable()) return null;
    const tx = await this.transaction(META_STORE, "readonly");
    const cursorRequest = tx.objectStore(META_STORE).index("savedAt").openCursor(null, "prev");
    const cursor = await requestToPromise(cursorRequest);
    return cursor ? (cursor.value as StoredDatasetMeta) : null;
  }

  async setActive(id: string): Promise<void> {
    const meta = await this.getMeta(id);
    if (!meta) return;
    const tx = await this.transaction(META_STORE, "readwrite");
    const done = transactionDone(tx);
    tx.objectStore(META_STORE).put({ ...meta, savedAt: new Date().toISOString() });
    await done;
  }

  async delete(id: string): Promise<void> {
    if (!isIndexedDBAvailable()) return;
    const tx = await this.transaction([META_STORE, RECORDS_STORE], "readwrite");
    const done = transactionDone(tx);
    tx.objectStore(META_STORE).delete(id);
    tx.objectStore(RECORDS_STORE).delete(id);
    await done;
  }

  async deleteActive(): Promise<void> {
    const active = await this.getActiveMeta();
    if (active) await this.delete(active.id);
  }

  async pruneExcept(keepId: string): Promise<void> {
    if (!isIndexedDBAvailable()) return;
    const tx = await this.transaction([META_STORE, RECORDS_STORE], "readwrite");
    const done = transactionDone(tx);
    const keys = await requestToPromise(tx.objectStore(META_STORE).getAllKeys());
    for (const key of keys) {
      if (key === keepId) continue;
      tx.objectStore(META_STORE).delete(key);
      tx.objectStore(RECORDS_STORE).delete(key);
    }
    await done;
  }
}

export const datasetRepository = new IndexedDBDatasetRepository();
