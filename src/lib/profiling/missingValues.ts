import type { ColumnMetadata, MissingValuePolicy } from "@/types/dataset.types";
import { DEFAULT_MISSING_VALUE_POLICY } from "@/types/dataset.types";
import { classifyMissing } from "./typeInference";

export interface MissingValueStats {
  missingCount: number;
  missingPercentage: number;
  physicallyEmptyCount: number;
  whitespaceOnlyCount: number;
  markerCount: number;
}

/**
 * Counts missing cells using the same rules as type inference (see `classifyMissing`),
 * so every part of the app agrees on what "missing" means.
 */
export function calculateMissingValues(
  values: string[],
  _columnName: string,
  policy: MissingValuePolicy = DEFAULT_MISSING_VALUE_POLICY
): MissingValueStats {
  let physicallyEmpty = 0;
  let whitespaceOnly = 0;
  let markerCount = 0;

  for (const value of values) {
    switch (classifyMissing(value, policy)) {
      case "empty":
        physicallyEmpty++;
        break;
      case "whitespace":
        whitespaceOnly++;
        break;
      case "marker":
        markerCount++;
        break;
      default:
        break;
    }
  }

  const missingCount = physicallyEmpty + whitespaceOnly + markerCount;
  const missingPercentage =
    values.length > 0 ? (missingCount / values.length) * 100 : 0;

  return {
    missingCount,
    missingPercentage,
    physicallyEmptyCount: physicallyEmpty,
    whitespaceOnlyCount: whitespaceOnly,
    markerCount,
  };
}

export function applyMissingPolicyToMetadata(
  column: ColumnMetadata,
  stats: MissingValueStats
): ColumnMetadata {
  return {
    ...column,
    missingCount: stats.missingCount,
    missingPercentage: stats.missingPercentage,
  };
}

export function calculateDatasetCompleteness(
  columns: ColumnMetadata[],
  totalRecords: number
): {
  totalCells: number;
  emptyCells: number;
  nonEmptyCells: number;
  completenessPercentage: number;
} {
  const totalColumns = columns.length;
  const totalCells = totalRecords * totalColumns;
  let emptyCells = 0;

  for (const col of columns) {
    emptyCells += col.missingCount;
  }

  const nonEmptyCells = totalCells - emptyCells;
  const completenessPercentage =
    totalCells > 0 ? (nonEmptyCells / totalCells) * 100 : 0;

  return {
    totalCells,
    emptyCells,
    nonEmptyCells,
    completenessPercentage,
  };
}
