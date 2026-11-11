import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/Card";
import { Badge } from "@components/ui/Badge";
import { cn } from "@lib/utils";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import type { ColumnMetadata } from "@/types/dataset.types";

const TYPE_LABELS: Record<string, string> = {
  integer: "Integer",
  decimal: "Decimal",
  string: "Text",
  boolean: "Boolean",
  date: "Date",
  datetime: "Date & time",
  empty: "Empty",
  unknown: "Unknown",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Histogram({ bins }: { bins: Array<{ start: number; end: number; count: number }> }) {
  const max = Math.max(...bins.map((b) => b.count), 1);
  return (
    <div>
      <div className="flex h-16 items-end gap-0.5" role="img" aria-label="Value distribution histogram">
        {bins.map((bin, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-primary/70"
            style={{ height: `${Math.max(4, (bin.count / max) * 100)}%` }}
            title={`${formatNumber(bin.start)} – ${formatNumber(bin.end)}: ${bin.count.toLocaleString()}`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>{formatNumber(bins[0].start)}</span>
        <span>{formatNumber(bins[bins.length - 1].end)}</span>
      </div>
    </div>
  );
}

export function ColumnAnalysisCard({ column }: { column: ColumnMetadata }) {
  const s = column.statistics;
  const nonMissing = column.nonEmptyCount;
  const invalid = column.invalidCount ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0 truncate text-base" title={column.name}>
            {column.name}
          </CardTitle>
          <Badge variant={column.dataType === "empty" ? "destructive" : "info"}>
            {TYPE_LABELS[column.dataType] ?? column.dataType}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-2">
          <Stat
            label="Missing"
            value={`${column.missingCount.toLocaleString()} (${formatPercent(column.missingPercentage)})`}
          />
          <Stat label="Unique" value={column.uniqueCount.toLocaleString()} />
          {invalid > 0 && (
            <Stat label="Invalid for type" value={invalid.toLocaleString()} />
          )}
          {nonMissing > 0 && column.duplicateCount > 0 && (
            <Stat label="Repeated values" value={column.duplicateCount.toLocaleString()} />
          )}
        </dl>

        {(column.dataType === "integer" || column.dataType === "decimal") && s && (
          <>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat label="Min" value={formatNumber(s.min as number | undefined)} />
              <Stat label="Max" value={formatNumber(s.max as number | undefined)} />
              <Stat label="Mean" value={formatNumber(s.mean)} />
              <Stat label="Median" value={formatNumber(s.median)} />
              <Stat label="Std dev" value={formatNumber(s.stdDev)} />
              <Stat label="Skewness" value={formatNumber(s.skewness)} />
              <Stat label="Q1" value={formatNumber(s.q1)} />
              <Stat label="Q3" value={formatNumber(s.q3)} />
              <Stat
                label="Outliers"
                value={
                  s.outlierCount !== undefined
                    ? `${s.outlierCount.toLocaleString()}`
                    : "—"
                }
              />
            </dl>
            {s.histogram && s.histogram.length > 0 && <Histogram bins={s.histogram} />}
          </>
        )}

        {column.dataType === "string" && s && (
          <>
            <dl className="grid grid-cols-3 gap-2">
              <Stat label="Min length" value={formatNumber(s.minLength)} />
              <Stat label="Avg length" value={formatNumber(s.avgLength)} />
              <Stat label="Max length" value={formatNumber(s.maxLength)} />
            </dl>
            {s.topValues && s.topValues.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Most frequent values</p>
                <ul className="space-y-1">
                  {s.topValues.map((tv) => {
                    const share = nonMissing > 0 ? (tv.count / nonMissing) * 100 : 0;
                    return (
                      <li key={tv.value} className="flex items-center gap-2 text-sm">
                        <span dir="auto" className="min-w-0 flex-1 truncate" title={tv.value}>
                          {tv.value}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {tv.count.toLocaleString()} ({formatPercent(share, 0)})
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}

        {column.dataType === "boolean" && s && (
          <dl className="grid grid-cols-2 gap-2">
            <Stat label="True" value={(s.trueCount ?? 0).toLocaleString()} />
            <Stat label="False" value={(s.falseCount ?? 0).toLocaleString()} />
          </dl>
        )}

        {(column.dataType === "date" || column.dataType === "datetime") && s && (
          <dl className="grid grid-cols-2 gap-2">
            <Stat label="Earliest" value={formatDate(s.earliestDate)} />
            <Stat label="Latest" value={formatDate(s.latestDate)} />
            <Stat
              label="Span"
              value={s.spanDays !== undefined ? `${formatNumber(Math.round(s.spanDays))} days` : "—"}
            />
          </dl>
        )}

        {column.dataType === "empty" && (
          <p className={cn("text-sm text-muted-foreground")}>This column has no usable values.</p>
        )}
      </CardContent>
    </Card>
  );
}
