import type {
  DataQualityReport,
  DataQualityIssue,
  DatasetProfile,
} from "@/types/dataset.types";

const pct = (part: number, whole: number): number => (whole > 0 ? (part / whole) * 100 : 0);

export function generateQualityReport(
  profile: DatasetProfile
): DataQualityReport {
  const {
    columnMetadata,
    completenessPercentage,
    duplicateRecords,
    totalRecords,
    parsingWarningCount,
    parsingErrorCount,
  } = profile;
  const inconsistentRows = profile.inconsistentRowCount ?? 0;
  const headerIssues = profile.headerIssueCount ?? 0;

  const issues: DataQualityIssue[] = [];
  let typedCells = 0;
  let invalidCells = 0;

  for (const col of columnMetadata) {
    if (col.dataType === "empty") {
      issues.push({
        type: "empty_column",
        columnId: col.id,
        columnName: col.name,
        affectedRecordCount: totalRecords,
        severity: "medium",
        description: `Column "${col.name}" contains no usable data`,
      });
      continue;
    }

    if (col.missingCount > 0) {
      const severity =
        col.missingPercentage > 50 ? "high" : col.missingPercentage > 20 ? "medium" : "low";
      issues.push({
        type: "missing_values",
        columnId: col.id,
        columnName: col.name,
        affectedRecordCount: col.missingCount,
        severity,
        description: `${col.missingCount} missing value(s) in column "${col.name}" (${col.missingPercentage.toFixed(1)}%)`,
      });
    }

    const nonMissing = col.nonEmptyCount;
    const invalid = col.invalidCount ?? 0;
    if (col.dataType !== "string") {
      typedCells += nonMissing;
      invalidCells += invalid;
    }
    if (invalid > 0) {
      const share = pct(invalid, nonMissing);
      issues.push({
        type: "invalid_values",
        columnId: col.id,
        columnName: col.name,
        affectedRecordCount: invalid,
        severity: share > 20 ? "high" : share > 5 ? "medium" : "low",
        description: `${invalid} value(s) in column "${col.name}" do not match its ${col.dataType} type (${share.toFixed(1)}%)`,
      });
    }

    if (nonMissing > 1 && col.uniqueCount === 1) {
      issues.push({
        type: "constant_column",
        columnId: col.id,
        columnName: col.name,
        affectedRecordCount: nonMissing,
        severity: "low",
        description: `Column "${col.name}" has a single distinct value and carries no information`,
      });
    }

    const outliers = col.statistics?.outlierCount ?? 0;
    if (outliers > 0) {
      const share = pct(outliers, nonMissing);
      issues.push({
        type: "outliers",
        columnId: col.id,
        columnName: col.name,
        affectedRecordCount: outliers,
        severity: share > 10 ? "medium" : "low",
        description: `${outliers} potential outlier(s) in column "${col.name}" (outside 1.5 x IQR, ${share.toFixed(1)}%)`,
      });
    }
  }

  if (duplicateRecords > 0) {
    const severity = duplicateRecords > totalRecords * 0.1 ? "high" : "medium";
    issues.push({
      type: "duplicate_records",
      affectedRecordCount: duplicateRecords,
      severity,
      description: `${duplicateRecords} duplicate record(s) found (${pct(duplicateRecords, totalRecords).toFixed(1)}% of records)`,
    });
  }

  if (inconsistentRows > 0) {
    issues.push({
      type: "inconsistent_row_length",
      affectedRecordCount: inconsistentRows,
      severity: pct(inconsistentRows, totalRecords) > 5 ? "high" : "medium",
      description: `${inconsistentRows} row(s) have a different number of fields than the header`,
    });
  }

  if (headerIssues > 0) {
    issues.push({
      type: "duplicate_column_name",
      affectedRecordCount: headerIssues,
      severity: "medium",
      description: `${headerIssues} column name problem(s): empty or duplicate names were renamed automatically`,
    });
  }

  const otherWarnings = Math.max(0, parsingWarningCount - inconsistentRows - headerIssues);
  if (otherWarnings > 0) {
    issues.push({
      type: "parsing_warning",
      affectedRecordCount: otherWarnings,
      severity: "medium",
      description: `${otherWarnings} parsing warning(s) detected during file processing`,
    });
  }

  if (parsingErrorCount > 0) {
    issues.push({
      type: "parsing_error",
      affectedRecordCount: parsingErrorCount,
      severity: "critical",
      description: `${parsingErrorCount} parsing error(s) detected during file processing`,
    });
  }

  if (profile.truncated) {
    issues.push({
      type: "truncated_data",
      affectedRecordCount: totalRecords,
      severity: "medium",
      description: `The file is larger than the processing limit, so only the first ${totalRecords.toLocaleString()} rows were analysed`,
    });
  }

  const completenessScore = completenessPercentage;
  const uniquenessScore = totalRecords > 0 ? 100 - pct(duplicateRecords, totalRecords) : 100;
  const badRows = parsingErrorCount + inconsistentRows;
  const parsingValidityScore =
    badRows === 0 ? 100 : Math.max(0, 100 - pct(badRows, Math.max(totalRecords, badRows)));
  const validityScore = typedCells > 0 ? 100 - pct(invalidCells, typedCells) : 100;

  const overallScore =
    completenessScore * 0.4 +
    uniquenessScore * 0.25 +
    validityScore * 0.2 +
    parsingValidityScore * 0.15;

  return {
    datasetId: profile.datasetId,
    completenessScore,
    uniquenessScore,
    parsingValidityScore,
    validityScore,
    overallScore,
    issues,
  };
}
