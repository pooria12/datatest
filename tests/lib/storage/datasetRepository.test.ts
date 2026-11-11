import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach } from "vitest";
import { closeDatabase } from "@/lib/storage/database";
import { datasetRepository, describeStorageError } from "@/lib/storage/datasetRepository";
import type { DatasetRecord, StoredDataset } from "@/types/dataset.types";

function makeDataset(id: string, savedAt: string, rows = 3): StoredDataset {
  const dataset: DatasetRecord = {
    id,
    filename: `${id}.csv`,
    fileSize: 10,
    fileType: "text/csv",
    createdAt: savedAt,
    recordCount: rows,
    columnCount: 1,
    columns: [],
    status: "ready",
    parsingWarnings: [],
    parsingErrors: [],
    storageStatus: "saved",
  };
  return {
    id,
    version: 2,
    dataset,
    records: Array.from({ length: rows }, (_, i) => ({ a: String(i) })),
    savedAt,
  };
}

beforeEach(async () => {
  await closeDatabase();
  globalThis.indexedDB = new IDBFactory();
});

describe("datasetRepository", () => {
  it("saves and reads metadata and rows separately", async () => {
    await datasetRepository.save(makeDataset("a", "2026-01-01T00:00:00Z"));
    const meta = await datasetRepository.getMeta("a");
    expect(meta?.dataset.filename).toBe("a.csv");
    expect("records" in (meta ?? {})).toBe(false);
    expect(await datasetRepository.getRecords("a")).toHaveLength(3);
    expect((await datasetRepository.get("a"))?.records).toHaveLength(3);
  });

  it("returns the most recently saved dataset as active without reading rows", async () => {
    await datasetRepository.save(makeDataset("old", "2026-01-01T00:00:00Z"));
    await datasetRepository.save(makeDataset("new", "2026-02-01T00:00:00Z"));
    const active = await datasetRepository.getActiveMeta();
    expect(active?.id).toBe("new");
    await datasetRepository.setActive("old");
    expect((await datasetRepository.getActiveMeta())?.id).toBe("old");
  });

  it("prunes other datasets and deletes both stores", async () => {
    await datasetRepository.save(makeDataset("a", "2026-01-01T00:00:00Z"));
    await datasetRepository.save(makeDataset("b", "2026-02-01T00:00:00Z"));
    await datasetRepository.pruneExcept("b");
    expect(await datasetRepository.getMeta("a")).toBeNull();
    expect(await datasetRepository.getRecords("a")).toBeNull();
    await datasetRepository.deleteActive();
    expect(await datasetRepository.getActiveMeta()).toBeNull();
  });

  it("migrates v1 data (rows inside the dataset record) to v2", async () => {
    const legacyDb = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("DataMindAI", 1);
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore("datasets", { keyPath: "id" });
        store.createIndex("savedAt", "savedAt", { unique: false });
        store.put(makeDataset("legacy", "2026-01-01T00:00:00Z", 4));
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    legacyDb.close();

    const active = await datasetRepository.getActiveMeta();
    expect(active?.id).toBe("legacy");
    expect("records" in (active ?? {})).toBe(false);
    expect(await datasetRepository.getRecords("legacy")).toHaveLength(4);
  });

  it("describes quota errors in plain language", () => {
    const quota = new DOMException("full", "QuotaExceededError");
    expect(describeStorageError(quota)).toContain("storage space");
  });
});
