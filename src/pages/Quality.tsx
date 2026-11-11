import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useDataset } from "@hooks/useDataset";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@components/ui/Card";
import { Badge } from "@components/ui/Badge";
import { Progress } from "@components/ui/Progress";
import { PageHeader } from "@components/common/PageHeader";
import { StatCard } from "@components/common/StatCard";
import { LoadingState } from "@components/common/LoadingState";
import { DatasetEmptyState } from "@components/datasets/DatasetEmptyState";
import { formatPercent } from "@/lib/format";
import type { DataQualityIssue } from "@/types/dataset.types";

const HEADER_DESCRIPTION = "Assess and monitor your dataset quality metrics";

type Severity = DataQualityIssue["severity"];

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const SEVERITY_STYLE: Record<
  Severity,
  { label: string; badge: "destructive" | "warning" | "info"; box: string; Icon: typeof AlertCircle }
> = {
  critical: { label: "Critical", badge: "destructive", box: "border-destructive/30 bg-destructive/5", Icon: AlertCircle },
  high: { label: "High", badge: "destructive", box: "border-destructive/20 bg-destructive/5", Icon: AlertCircle },
  medium: { label: "Medium", badge: "warning", box: "border-warning/30 bg-warning/5", Icon: AlertTriangle },
  low: { label: "Low", badge: "info", box: "border-info/30 bg-info/5", Icon: Info },
};

function scoreVariant(score: number): "success" | "warning" | "destructive" {
  return score >= 80 ? "success" : score >= 60 ? "warning" : "destructive";
}

export function Quality() {
  const navigate = useNavigate();
  const { dataset, isLoading, error } = useDataset();
  const profile = dataset?.profile;
  const report = dataset?.qualityReport;

  const issues = useMemo(
    () =>
      [...(report?.issues ?? [])].sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.affectedRecordCount - a.affectedRecordCount
      ),
    [report]
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Data Quality" description={HEADER_DESCRIPTION} />
        <LoadingState text="Loading dataset…" />
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="space-y-8">
        <PageHeader title="Data Quality" description={HEADER_DESCRIPTION} />
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

  const overall = report?.overallScore;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Data Quality"
        description={`${dataset.filename} — ${dataset.recordCount.toLocaleString()} records × ${dataset.columnCount} columns`}
        badge={issues.length === 0 ? "No issues" : `${issues.length} issue${issues.length === 1 ? "" : "s"}`}
        badgeVariant={issues.length === 0 ? "success" : issues.some((i) => i.severity === "critical" || i.severity === "high") ? "destructive" : "warning"}
      />

      {profile && report ? (
        <>
          <Card>
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
              <div className="shrink-0">
                <p className="text-sm font-medium text-muted-foreground">Overall quality score</p>
                <p className="text-4xl font-bold text-foreground">{formatPercent(overall)}</p>
              </div>
              <div className="flex-1">
                <Progress value={overall ?? 0} variant={scoreVariant(overall ?? 0)} label="Overall quality score" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Weighted from completeness, uniqueness, type validity and parsing validity.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Completeness"
              value={formatPercent(report.completenessScore)}
              description={`${profile.emptyCells.toLocaleString()} missing of ${profile.totalCells.toLocaleString()} cells`}
              progress={{ value: report.completenessScore, variant: scoreVariant(report.completenessScore) }}
            />
            <StatCard
              title="Uniqueness"
              value={formatPercent(report.uniquenessScore)}
              description={`${profile.uniqueRecords.toLocaleString()} unique of ${profile.totalRecords.toLocaleString()} records`}
              progress={{ value: report.uniquenessScore, variant: scoreVariant(report.uniquenessScore) }}
            />
            <StatCard
              title="Type validity"
              value={formatPercent(report.validityScore ?? 100)}
              description="Values that match their column type"
              progress={{ value: report.validityScore ?? 100, variant: scoreVariant(report.validityScore ?? 100) }}
            />
            <StatCard
              title="Parsing validity"
              value={formatPercent(report.parsingValidityScore)}
              description={`${profile.parsingErrorCount} error(s), ${profile.parsingWarningCount} warning(s)`}
              progress={{ value: report.parsingValidityScore, variant: scoreVariant(report.parsingValidityScore) }}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Issues</CardTitle>
              <CardDescription>Sorted by severity</CardDescription>
            </CardHeader>
            <CardContent>
              {issues.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle className="h-5 w-5" aria-hidden="true" />
                  No data quality issues were detected.
                </div>
              ) : (
                <ul className="space-y-3">
                  {issues.map((issue, i) => {
                    const style = SEVERITY_STYLE[issue.severity];
                    return (
                      <li
                        key={`${issue.type}-${issue.columnId ?? "all"}-${i}`}
                        className={`flex items-start gap-3 rounded-lg border p-3 ${style.box}`}
                      >
                        <style.Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground">{issue.description}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {issue.affectedRecordCount.toLocaleString()} affected
                          </p>
                        </div>
                        <Badge variant={style.badge}>{style.label}</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Column quality</CardTitle>
              <CardDescription>Missing and invalid values per column</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Column quality">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th scope="col" className="px-3 py-2">Column</th>
                      <th scope="col" className="px-3 py-2">Type</th>
                      <th scope="col" className="px-3 py-2 text-right">Missing</th>
                      <th scope="col" className="px-3 py-2 text-right">Invalid</th>
                      <th scope="col" className="px-3 py-2 text-right">Unique</th>
                      <th scope="col" className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.columnMetadata.map((col) => {
                      const invalid = col.invalidCount ?? 0;
                      const bad = col.dataType === "empty" || col.missingPercentage > 50;
                      const warn = col.missingPercentage > 5 || invalid > 0;
                      return (
                        <tr key={col.id} className="border-b border-border">
                          <td dir="auto" className="max-w-[16rem] truncate px-3 py-2 font-medium text-foreground" title={col.name}>
                            {col.name}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{col.dataType}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatPercent(col.missingPercentage)}</td>
                          <td className="px-3 py-2 text-right font-mono">{invalid.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-mono">{col.uniqueCount.toLocaleString()}</td>
                          <td className="px-3 py-2">
                            <Badge variant={bad ? "destructive" : warn ? "warning" : "success"}>
                              {bad ? "Poor" : warn ? "Review" : "Good"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <DatasetEmptyState
          variant="error"
          message="This dataset has no profiling data. Upload the file again to analyse it."
          onRetry={() => navigate("/upload")}
          onUpload={() => navigate("/upload")}
        />
      )}
    </div>
  );
}
