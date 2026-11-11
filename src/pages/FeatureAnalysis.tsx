import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDataset } from "@hooks/useDataset";
import { PageHeader } from "@components/common/PageHeader";
import { LoadingState } from "@components/common/LoadingState";
import { DatasetEmptyState } from "@components/datasets/DatasetEmptyState";
import { ColumnAnalysisCard } from "@components/analysis/ColumnAnalysisCard";
import { Input } from "@components/ui/Input";
import { Button } from "@components/ui/Button";
import type { ColumnDataType } from "@/types/dataset.types";

const HEADER_DESCRIPTION = "Per-column statistics, distributions and outliers";

const TYPE_FILTERS: Array<{ value: "all" | ColumnDataType; label: string }> = [
  { value: "all", label: "All" },
  { value: "integer", label: "Integer" },
  { value: "decimal", label: "Decimal" },
  { value: "string", label: "Text" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date & time" },
  { value: "empty", label: "Empty" },
];

export function FeatureAnalysis() {
  const navigate = useNavigate();
  const { dataset, isLoading, error } = useDataset();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ColumnDataType>("all");

  const columns = useMemo(() => dataset?.profile?.columnMetadata ?? dataset?.columns ?? [], [dataset]);

  const presentTypes = useMemo(() => new Set(columns.map((c) => c.dataType)), [columns]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return columns.filter(
      (c) =>
        (typeFilter === "all" || c.dataType === typeFilter) &&
        (!q || c.name.toLowerCase().includes(q))
    );
  }, [columns, query, typeFilter]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Feature Analysis" description={HEADER_DESCRIPTION} />
        <LoadingState text="Loading dataset…" />
      </div>
    );
  }

  if (!dataset || columns.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader title="Feature Analysis" description={HEADER_DESCRIPTION} />
        {error && !dataset ? (
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Feature Analysis"
        description={`${dataset.filename} — ${columns.length} columns, ${dataset.recordCount.toLocaleString()} records`}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by data type">
          {TYPE_FILTERS.filter((f) => f.value === "all" || presentTypes.has(f.value)).map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={typeFilter === f.value ? "primary" : "outline"}
              aria-pressed={typeFilter === f.value}
              onClick={() => setTypeFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Input
          placeholder="Search columns…"
          aria-label="Search columns"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-64"
        />
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No columns match your filters.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((column) => (
            <ColumnAnalysisCard key={column.id} column={column} />
          ))}
        </div>
      )}
    </div>
  );
}
