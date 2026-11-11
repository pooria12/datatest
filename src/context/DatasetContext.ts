import { createContext } from "react";
import type {
  DatasetRecord,
  DatasetProcessingStatus,
  ParsingResult,
} from "@/types/dataset.types";

export interface DatasetContextValue {
  dataset: DatasetRecord | null;
  records: Array<Record<string, string>> | null;
  status: DatasetProcessingStatus;
  /** 0-100 progress of the current processing run. */
  progress: number;
  parsingResult: ParsingResult | null;
  isProcessing: boolean;
  /** True until the stored dataset (if any) has been read from IndexedDB. */
  isLoading: boolean;
  /** True while the rows of the dataset are being read from IndexedDB. */
  isRecordsLoading: boolean;
  error: string | null;
  /** Resolves true when the dataset was processed (even if it could not be saved to storage). */
  processFile: (file: File) => Promise<boolean>;
  cancelProcessing: () => void;
  clearDataset: () => Promise<void>;
  loadRecords: () => Promise<void>;
  clearError: () => void;
}

export const DatasetContext = createContext<DatasetContextValue | null>(null);
