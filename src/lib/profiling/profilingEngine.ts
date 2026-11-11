import type {
  ColumnMetadata,
  DatasetProfile,
  ParsingError,
  MissingValuePolicy,
} from "@/types/dataset.types";
import { DEFAULT_MISSING_VALUE_POLICY } from "@/types/dataset.types";
import { analyzeColumnType, isMissingValue } from "./typeInference";
import {
  calculateMissingValues,
  calculateDatasetCompleteness,
} from "./missingValues";
import { detectDuplicateRows } from "./duplicates";
import { buildColumnStatistics } from "./statistics";

export interface ProfileInput {
  headers: string[];
  rows: Array<Record<string, string>>;
  rowCount: number;
  columnCount: number;
  parsingErrors: ParsingError[];
  parsingWarnings: ParsingError[];
  policy?: MissingValuePolicy;
  truncated?: boolean;
}

/** Profiles a single column. Unique and duplicate counts only consider non-missing values. */
export function profileColumn(
  header: string,
  index: number,
  values: string[],
  rowCount: number,
  policy: MissingValuePolicy = DEFAULT_MISSING_VALUE_POLICY
): ColumnMetadata {
  const analysis = analyzeColumnType(values, policy);
  const missingStats = calculateMissingValues(values, header, policy);

  const distinct = new Set<string>();
  let nonMissing = 0;
  for (const v of values) {
    if (isMissingValue(v, policy)) continue;
    nonMissing++;
    distinct.add(v);
  }

  return {
    id: `col-${index}`,
    name: header,
    displayName: header,
    dataType: analysis.dataType,
    totalRecords: rowCount,
    nonEmptyCount: rowCount - missingStats.missingCount,
    missingCount: missingStats.missingCount,
    missingPercentage: missingStats.missingPercentage,
    uniqueCount: distinct.size,
    duplicateCount: nonMissing - distinct.size,
    invalidCount: analysis.invalidCount,
    statistics: buildColumnStatistics(analysis.dataType, values),
  };
}

function extractColumn(rows: Array<Record<string, string>>, header: string): string[] {
  const values = new Array<string>(rows.length);
  for (let i = 0; i < rows.length; i++) {
    values[i] = rows[i][header] ?? "";
  }
  return values;
}

function assembleProfile(
  input: ProfileInput,
  datasetId: string,
  columnMetadata: ColumnMetadata[]
): DatasetProfile {
  const { rows, rowCount, columnCount, parsingErrors, parsingWarnings, headers } = input;

  const duplicateStats = detectDuplicateRows(rows, headers);
  const completeness = calculateDatasetCompleteness(columnMetadata, rowCount);

  return {
    datasetId,
    totalRecords: rowCount,
    totalColumns: columnCount,
    totalCells: completeness.totalCells,
    emptyCells: completeness.emptyCells,
    nonEmptyCells: completeness.nonEmptyCells,
    completenessPercentage: completeness.completenessPercentage,
    duplicateRecords: duplicateStats.totalDuplicateRecords,
    uniqueRecords: duplicateStats.uniqueRecords,
    duplicatePercentage: duplicateStats.duplicatePercentage,
    parsingWarningCount: parsingWarnings.length,
    parsingErrorCount: parsingErrors.length,
    inconsistentRowCount: parsingWarnings.filter((w) => w.category === "row").length,
    headerIssueCount: parsingWarnings.filter((w) => w.category === "structure").length,
    truncated: input.truncated ?? false,
    columnMetadata,
    processedAt: new Date().toISOString(),
  };
}

export function profileDataset(
  input: ProfileInput,
  datasetId: string
): DatasetProfile {
  const policy = input.policy ?? DEFAULT_MISSING_VALUE_POLICY;
  const columnMetadata = input.headers.map((header, index) =>
    profileColumn(header, index, extractColumn(input.rows, header), input.rowCount, policy)
  );
  return assembleProfile(input, datasetId, columnMetadata);
}

/**
 * Same result as `profileDataset`, but yields to the event loop between columns so the UI can
 * repaint and report progress while a large dataset is being profiled.
 */
export async function profileDatasetAsync(
  input: ProfileInput,
  datasetId: string,
  onProgress?: (fraction: number) => void
): Promise<DatasetProfile> {
  const policy = input.policy ?? DEFAULT_MISSING_VALUE_POLICY;
  const columnMetadata: ColumnMetadata[] = [];
  const total = input.headers.length;

  for (let i = 0; i < total; i++) {
    const header = input.headers[i];
    columnMetadata.push(
      profileColumn(header, i, extractColumn(input.rows, header), input.rowCount, policy)
    );
    onProgress?.((i + 1) / (total + 1));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  const profile = assembleProfile(input, datasetId, columnMetadata);
  onProgress?.(1);
  return profile;
}
