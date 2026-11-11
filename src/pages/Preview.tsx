import { useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { useDataset } from "@hooks/useDataset";
import { DatasetTable } from "@components/datasets/DatasetTable";
import { DatasetSummary } from "@components/datasets/DatasetSummary";
import { DatasetEmptyState } from "@components/datasets/DatasetEmptyState";
import { PageHeader } from "@components/common/PageHeader";
import { LoadingState } from "@components/common/LoadingState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@components/ui/Card";
import { Button } from "@components/ui/Button";
import type { ColumnDataType } from "@/types/dataset.types";

const HEADER_DESCRIPTION = "Explore your dataset structure and sample data";

export function Preview() {
  const navigate = useNavigate();
  const { dataset, records, isLoading, isRecordsLoading, error, clearDataset, loadRecords } =
    useDataset();

  const datasetId = dataset?.id;
  useEffect(() => {
    if (datasetId) void loadRecords();
  }, [datasetId, loadRecords]);

  const columns = useMemo(() => dataset?.columns?.map((c) => c.name) ?? [], [dataset]);
  const columnTypes = useMemo(() => {
    const types: Record<string, ColumnDataType> = {};
    for (const c of dataset?.columns ?? []) types[c.name] = c.dataType;
    return types;
  }, [dataset]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Data Preview" description={HEADER_DESCRIPTION} />
        <LoadingState text="Loading dataset…" />
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="space-y-8">
        <PageHeader title="Data Preview" description={HEADER_DESCRIPTION} />
        {error ? (
          <DatasetEmptyState
            variant="error"
            message={error}
            onRetry={() => navigate("/upload")}
            onUpload={() => navigate("/upload")}
          />
        ) : (
          <DatasetEmptyState variant="no-dataset" onUpload={() => navigate("/upload")} />
        )}
      </div>
    );
  }

  const hasWarnings = dataset.status === "warning";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Data Preview"
        description={`Viewing ${dataset.filename} — ${dataset.recordCount.toLocaleString()} records × ${dataset.columnCount} columns`}
        badge={hasWarnings ? "Has warnings" : "Ready"}
        badgeVariant={hasWarnings ? "warning" : "success"}
      />

      {dataset.truncated && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3" role="status">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-sm text-foreground">
            The file was larger than the processing limit, so only the first{" "}
            {dataset.recordCount.toLocaleString()} rows are shown and analysed.
          </p>
        </div>
      )}

      <DatasetSummary
        dataset={{
          filename: dataset.filename,
          fileSize: dataset.fileSize,
          recordCount: dataset.recordCount,
          columnCount: dataset.columnCount,
          lastProcessedAt: dataset.lastProcessedAt,
          status: dataset.status,
          completenessPercentage: dataset.profile?.completenessPercentage,
          duplicateRecords: dataset.profile?.duplicateRecords,
          parsingWarningCount: dataset.profile?.parsingWarningCount,
          parsingErrorCount: dataset.profile?.parsingErrorCount,
          columns: dataset.columns,
        }}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Dataset Records</CardTitle>
            <CardDescription>Real data from your uploaded CSV file</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void clearDataset()}>
            Remove Dataset
          </Button>
        </CardHeader>
        <CardContent>
          {records === null || isRecordsLoading ? (
            <LoadingState text="Loading records…" />
          ) : columns.length > 0 ? (
            <DatasetTable
              columns={columns}
              columnTypes={columnTypes}
              rows={records}
              totalRecords={dataset.recordCount}
              totalColumns={dataset.columnCount}
            />
          ) : (
            <DatasetEmptyState variant="no-results" message="No data available" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
