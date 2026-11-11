import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  DatasetRecord,
  DatasetProcessingStatus,
  ParsingResult,
  ProcessingLimits,
  StoredDataset,
} from "@/types/dataset.types";
import { DEFAULT_PROCESSING_LIMITS, STORAGE_VERSION } from "@/types/dataset.types";
import {
  validateFile,
  parseCsvFile,
  DEFAULT_VALIDATION_OPTIONS,
  type FileValidationOptions,
} from "@/lib/csv/csvParser";
import { profileDatasetAsync, type ProfileInput } from "@/lib/profiling/profilingEngine";
import { generateQualityReport } from "@/lib/profiling/dataQuality";
import { datasetRepository, describeStorageError } from "@/lib/storage/datasetRepository";
import { addToast } from "@/lib/toast-state";
import { DatasetContext, type DatasetContextValue } from "./DatasetContext";

function generateId(): string {
  return `ds-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

class CancelledError extends Error {
  constructor() {
    super("Processing cancelled");
    this.name = "CancelledError";
  }
}

interface DatasetProviderProps {
  children: ReactNode;
  limits?: ProcessingLimits;
  validationOptions?: FileValidationOptions;
}

/**
 * Single source of truth for the active dataset. Every page reads the same state, the stored
 * dataset is recovered once, and row data is only loaded when a page asks for it.
 */
export function DatasetProvider({
  children,
  limits = DEFAULT_PROCESSING_LIMITS,
  validationOptions = DEFAULT_VALIDATION_OPTIONS,
}: DatasetProviderProps) {
  const [dataset, setDataset] = useState<DatasetRecord | null>(null);
  const [records, setRecords] = useState<Array<Record<string, string>> | null>(null);
  const [status, setStatus] = useState<DatasetProcessingStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [parsingResult, setParsingResult] = useState<ParsingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);

  const datasetRef = useRef<DatasetRecord | null>(null);
  const recordsRef = useRef<Array<Record<string, string>> | null>(null);
  const processingRef = useRef(false);
  const cancelRef = useRef(false);
  const recordsRequestRef = useRef<string | null>(null);

  useEffect(() => {
    datasetRef.current = dataset;
  }, [dataset]);
  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  const isProcessing =
    status === "validating" ||
    status === "parsing" ||
    status === "profiling" ||
    status === "saving";

  // Recover the stored dataset (metadata only) once, when the app starts.
  useEffect(() => {
    let cancelled = false;
    const recover = async () => {
      try {
        const active = await datasetRepository.getActiveMeta();
        if (cancelled || !active || processingRef.current) return;
        setDataset(active.dataset);
        setStatus(active.dataset.status);
        setProgress(100);
      } catch {
        // Recovery is best-effort: without stored data the app simply starts empty.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void recover();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadRecords = useCallback(async () => {
    const current = datasetRef.current;
    if (!current) return;
    if (recordsRef.current || recordsRequestRef.current === current.id) return;
    recordsRequestRef.current = current.id;
    setIsRecordsLoading(true);
    try {
      const rows = await datasetRepository.getRecords(current.id);
      if (datasetRef.current?.id === current.id) {
        setRecords(rows ?? []);
      }
    } catch (err) {
      addToast({
        title: "Could not load rows",
        description: describeStorageError(err),
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      recordsRequestRef.current = null;
      setIsRecordsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const cancelProcessing = useCallback(() => {
    if (processingRef.current) cancelRef.current = true;
  }, []);

  const processFile = useCallback(
    async (file: File): Promise<boolean> => {
      if (processingRef.current) return false;

      const validation = validateFile(file, validationOptions);
      if (!validation.valid) {
        setError(validation.error ?? "Invalid file");
        setStatus("error");
        addToast({
          title: "Validation failed",
          description: validation.error,
          variant: "destructive",
          duration: 5000,
        });
        return false;
      }

      processingRef.current = true;
      cancelRef.current = false;
      const checkCancelled = () => {
        if (cancelRef.current) throw new CancelledError();
      };

      setError(null);
      setStatus("validating");
      setProgress(10);

      try {
        setStatus("parsing");
        setProgress(25);

        const result = await parseCsvFile(file, {
          skipEmptyLines: true,
          maxRecords: limits.maxRecords,
          maxColumns: limits.maxColumns,
          chunkSize: limits.chunkSize,
        });
        checkCancelled();

        const fatal = result.errors.find((e) => e.severity === "error");
        if (result.rowCount === 0 || result.headers.length > limits.maxColumns) {
          throw new Error(fatal?.message ?? "The file could not be parsed");
        }

        setParsingResult(result);
        setProgress(40);
        setStatus("profiling");

        const id = generateId();
        const profileInput: ProfileInput = {
          headers: result.headers,
          rows: result.rows,
          rowCount: result.rowCount,
          columnCount: result.columnCount,
          parsingErrors: result.errors,
          parsingWarnings: result.warnings,
          truncated: result.truncated,
        };

        const profile = await profileDatasetAsync(profileInput, id, (fraction) => {
          setProgress(40 + Math.round(fraction * 45));
        });
        checkCancelled();
        const qualityReport = generateQualityReport(profile);

        setStatus("saving");
        setProgress(90);

        const hasIssues =
          result.errors.length > 0 || result.warnings.length > 0 || result.truncated;
        const now = new Date().toISOString();
        const record: DatasetRecord = {
          id,
          filename: file.name,
          fileSize: file.size,
          fileType: file.type || "text/csv",
          createdAt: now,
          lastProcessedAt: now,
          recordCount: result.rowCount,
          columnCount: result.columnCount,
          columns: profile.columnMetadata,
          status: hasIssues ? "warning" : "ready",
          parsingWarnings: result.warnings,
          parsingErrors: result.errors,
          profile,
          qualityReport,
          truncated: result.truncated,
          delimiter: result.delimiter,
          encoding: result.encoding,
          storageStatus: "saved",
        };

        const stored: StoredDataset = {
          id,
          version: STORAGE_VERSION,
          dataset: record,
          records: result.rows,
          savedAt: now,
        };

        let finalRecord = record;
        try {
          await datasetRepository.save(stored);
          await datasetRepository.pruneExcept(id);
        } catch (saveError) {
          // The data is still usable in memory; tell the user it will not survive a reload.
          const message = describeStorageError(saveError);
          finalRecord = {
            ...record,
            status: "warning",
            storageStatus: "failed",
            storageError: message,
          };
          addToast({
            title: "Dataset not saved",
            description: `${message} You can keep working, but the data will be lost when you close this tab.`,
            variant: "destructive",
            duration: 8000,
          });
        }

        setDataset(finalRecord);
        setRecords(result.rows);
        setStatus(finalRecord.status);
        setProgress(100);

        if (finalRecord.storageStatus === "saved") {
          addToast({
            title: "Dataset processed",
            description: `${result.rowCount.toLocaleString()} rows, ${result.columnCount} columns`,
            variant: "success",
            duration: 4000,
          });
        }
        return true;
      } catch (err) {
        if (err instanceof CancelledError) {
          setStatus(datasetRef.current?.status ?? "idle");
          setProgress(datasetRef.current ? 100 : 0);
          addToast({ title: "Processing cancelled", variant: "info", duration: 3000 });
        } else {
          const message = err instanceof Error ? err.message : "Processing failed";
          setStatus("error");
          setError(message);
          addToast({
            title: "Processing failed",
            description: message,
            variant: "destructive",
            duration: 5000,
          });
        }
        return false;
      } finally {
        processingRef.current = false;
        cancelRef.current = false;
      }
    },
    [validationOptions, limits]
  );

  const clearDataset = useCallback(async () => {
    const current = datasetRef.current;
    if (current) {
      try {
        await datasetRepository.delete(current.id);
      } catch (err) {
        addToast({
          title: "Could not remove stored data",
          description: describeStorageError(err),
          variant: "destructive",
          duration: 5000,
        });
      }
    }
    setDataset(null);
    setRecords(null);
    setStatus("idle");
    setProgress(0);
    setParsingResult(null);
    setError(null);
  }, []);

  const value = useMemo<DatasetContextValue>(
    () => ({
      dataset,
      records,
      status,
      progress,
      parsingResult,
      isProcessing,
      isLoading,
      isRecordsLoading,
      error,
      processFile,
      cancelProcessing,
      clearDataset,
      loadRecords,
      clearError,
    }),
    [
      dataset,
      records,
      status,
      progress,
      parsingResult,
      isProcessing,
      isLoading,
      isRecordsLoading,
      error,
      processFile,
      cancelProcessing,
      clearDataset,
      loadRecords,
      clearError,
    ]
  );

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}
