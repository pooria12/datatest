import {
  Database,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@components/ui/Card";
import { Badge } from "@components/ui/Badge";
import { Progress } from "@components/ui/Progress";
import { Separator } from "@components/ui/Separator";
import { cn } from "@lib/utils";

interface DatasetSummaryProps {
  dataset: {
    filename: string;
    fileSize: number;
    recordCount: number;
    columnCount: number;
    lastProcessedAt?: string;
    status: string;
    completenessPercentage?: number;
    duplicateRecords?: number;
    parsingWarningCount?: number;
    parsingErrorCount?: number;
    columns?: Array<{
      name: string;
      dataType: string;
      missingPercentage: number;
    }>;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "info" }> = {
  idle: { label: "Idle", variant: "default" },
  selected: { label: "Selected", variant: "info" },
  validating: { label: "Validating", variant: "info" },
  parsing: { label: "Parsing", variant: "info" },
  profiling: { label: "Profiling", variant: "info" },
  saving: { label: "Saving", variant: "info" },
  ready: { label: "Ready", variant: "success" },
  warning: { label: "Warnings", variant: "warning" },
  error: { label: "Error", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "default" },
};

export function DatasetSummary({ dataset }: DatasetSummaryProps) {
  if (!dataset) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Dataset</CardTitle>
          <CardDescription>Upload a CSV file to see summary information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-3">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No dataset loaded</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = STATUS_CONFIG[dataset.status] ?? STATUS_CONFIG.idle;
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Dataset Summary</CardTitle>
        <CardDescription>Overview of the active dataset</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="font-medium text-foreground truncate max-w-xs">
                {dataset.filename}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {formatFileSize(dataset.fileSize)}
              </p>
            </div>
          </div>
          <Badge variant={statusConfig.variant}>
            {statusConfig.label}
          </Badge>
        </div>

        <Separator />

        <div className="grid gap-3">
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Records</span>
            <span className="text-sm font-medium text-foreground font-mono">
              {dataset.recordCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Columns</span>
            <span className="text-sm font-medium text-foreground font-mono">
              {dataset.columnCount}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Completeness</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground font-mono">
                {dataset.completenessPercentage != null
                  ? dataset.completenessPercentage.toFixed(1) + "%"
                  : "—"}
              </span>
              {dataset.completenessPercentage != null && (
                <Progress
                  value={dataset.completenessPercentage}
                  size="sm"
                  showLabel={false}
                />
              )}
            </div>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Duplicates</span>
            <span className={cn("text-sm font-medium font-mono", dataset.duplicateRecords != null && dataset.duplicateRecords > 0 ? "text-warning" : "text-foreground")}>
              {dataset.duplicateRecords != null ? dataset.duplicateRecords.toLocaleString() : "—"}
            </span>
          </div>
        </div>

        {dataset.lastProcessedAt && (
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Last processed</span>
            <span className="text-sm font-mono text-muted-foreground">
              {new Date(dataset.lastProcessedAt).toLocaleString()}
            </span>
          </div>
        )}

        {dataset.columns && dataset.columns.length > 0 && (
          <div className="mt-2">
            <CardTitle className="text-sm">Column Types</CardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              {dataset.columns.map((col) => (
                <Badge
                  key={col.name}
                  variant={
                    col.dataType === "empty"
                      ? "destructive"
                      : col.missingPercentage > 50
                        ? "warning"
                        : "default"
                  }
                  className="text-xs"
                >
                  {col.name} ({col.dataType})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
