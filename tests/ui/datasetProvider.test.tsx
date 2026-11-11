import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { DatasetProvider } from "@/context/DatasetProvider";
import { useDataset } from "@/hooks/useDataset";
import { closeDatabase } from "@/lib/storage/database";
import { datasetRepository } from "@/lib/storage/datasetRepository";
import { toasts } from "@/lib/toast-state";

const wrapper = ({ children }: { children: ReactNode }) => <DatasetProvider>{children}</DatasetProvider>;

const csvFile = (name = "data.csv", body = "id,name\n1,a\n2,b\n3,c\n") => new File([body], name, { type: "text/csv" });

beforeEach(async () => {
  await closeDatabase();
  globalThis.indexedDB = new IDBFactory();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DatasetProvider", () => {
  it("processes a file, keeps ids consistent and persists it", async () => {
    const { result } = renderHook(() => useDataset(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.processFile(csvFile());
    });

    expect(ok).toBe(true);
    const ds = result.current.dataset!;
    expect(ds.recordCount).toBe(3);
    expect(ds.profile?.datasetId).toBe(ds.id);
    expect(ds.qualityReport?.datasetId).toBe(ds.id);
    expect(ds.storageStatus).toBe("saved");
    expect(result.current.status).toBe("ready");
    expect(result.current.isProcessing).toBe(false);
    expect(await datasetRepository.getRecords(ds.id)).toHaveLength(3);
  });

  it("recovers the stored dataset after a reload and loads rows lazily", async () => {
    const first = renderHook(() => useDataset(), { wrapper });
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    await act(async () => {
      await first.result.current.processFile(csvFile("kept.csv"));
    });
    first.unmount();

    const second = renderHook(() => useDataset(), { wrapper });
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));
    expect(second.result.current.dataset?.filename).toBe("kept.csv");
    expect(second.result.current.records).toBeNull();
    await act(async () => {
      await second.result.current.loadRecords();
    });
    expect(second.result.current.records).toHaveLength(3);
  });

  it("does not stay locked in 'saving' when storage fails", async () => {
    vi.spyOn(datasetRepository, "save").mockRejectedValue(new DOMException("full", "QuotaExceededError"));
    const { result } = renderHook(() => useDataset(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.processFile(csvFile());
    });

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.status).toBe("warning");
    expect(result.current.dataset?.storageStatus).toBe("failed");
    expect(result.current.dataset?.storageError).toContain("storage space");
    expect(result.current.records).toHaveLength(3);
    expect(toasts.some((t) => t.title === "Dataset not saved")).toBe(true);
  });

  it("reports a file without data rows as an error", async () => {
    const { result } = renderHook(() => useDataset(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let ok = true;
    await act(async () => {
      ok = await result.current.processFile(csvFile("empty.csv", "a,b\n"));
    });
    expect(ok).toBe(false);
    expect(result.current.status).toBe("error");
    expect(result.current.error).toContain("no data rows");
    expect(result.current.dataset).toBeNull();
  });

  it("keeps only one stored dataset when a new file replaces the old one", async () => {
    const { result } = renderHook(() => useDataset(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.processFile(csvFile("one.csv"));
    });
    const firstId = result.current.dataset!.id;
    await act(async () => {
      await result.current.processFile(csvFile("two.csv"));
    });
    expect(result.current.dataset!.id).not.toBe(firstId);
    expect(await datasetRepository.getMeta(firstId)).toBeNull();
  });

  it("clears the dataset from state and storage", async () => {
    const { result } = renderHook(() => useDataset(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.processFile(csvFile());
    });
    const id = result.current.dataset!.id;
    await act(async () => {
      await result.current.clearDataset();
    });
    expect(result.current.dataset).toBeNull();
    expect(result.current.status).toBe("idle");
    expect(await datasetRepository.getMeta(id)).toBeNull();
  });
});
