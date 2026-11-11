import { useState, useCallback, useRef } from "react";
import {
  Upload as UploadIcon,
  FileText,
  Info,
  AlertCircle,
  X,
  CheckCircle,
  File,
  RefreshCw,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@components/ui/Card";
import { Button } from "@components/ui/Button";
import { PageHeader } from "@components/common/PageHeader";
import { Badge } from "@components/ui/Badge";
import { Progress } from "@components/ui/Progress";
import { cn } from "@lib/utils";

interface DatasetUploaderProps {
  onFileSelect: (file: File) => void;
  onProcess: () => void;
  onCancel?: () => void;
  /** Clears the currently selected (not yet processed) file. */
  onRemove: () => void;
  /** Removes the stored dataset from browser storage. */
  onRemoveStored?: () => void;
  selectedFile: { name: string; size: number; type: string } | null;
  storedDataset?: {
    filename: string;
    recordCount: number;
    columnCount: number;
    storageStatus: "pending" | "saved" | "failed";
  } | null;
  /** True once the selected file has been processed successfully. */
  isProcessed?: boolean;
  processingStatus: "idle" | "selected" | "validating" | "parsing" | "profiling" | "saving" | "ready" | "warning" | "error" | "cancelled";
  progress: number;
  error: string | null;
  parsingResult: {
    headers: string[];
    rows: Array<Record<string, string>>;
    rowCount: number;
    columnCount: number;
    errors: Array<{ message: string; severity: string; rowNumber: number }>;
    warnings: Array<{ message: string; severity: string; rowNumber: number }>;
    delimiter: string;
    encoding?: string;
    truncated: boolean;
  } | null;
  disabled: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  idle: "Ready",
  selected: "Ready to process",
  validating: "Validating file",
  parsing: "Parsing CSV",
  profiling: "Profiling data",
  saving: "Saving to storage",
  ready: "Ready",
  warning: "Completed with warnings",
  error: "Error",
  cancelled: "Cancelled",
};

const STATUS_VARIANTS: Record<string, "default" | "success" | "warning" | "destructive" | "info"> = {
  idle: "default",
  selected: "default",
  validating: "info",
  parsing: "info",
  profiling: "info",
  saving: "info",
  ready: "success",
  warning: "warning",
  error: "destructive",
  cancelled: "default",
};

export function DatasetUploader({
  onFileSelect,
  onProcess,
  onCancel,
  onRemove,
  onRemoveStored,
  selectedFile,
  storedDataset,
  isProcessed = false,
  processingStatus,
  progress,
  error,
  parsingResult,
  disabled,
}: DatasetUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // dragenter/dragleave also fire for child elements, so count them instead of toggling a flag.
  const dragDepth = useRef(0);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      dragDepth.current += 1;
      setDragActive(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragActive(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelect(file);
    },
    [disabled, onFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
      // Allow selecting the same file again.
      e.target.value = "";
    },
    [onFileSelect]
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const isBusy =
    processingStatus === "validating" ||
    processingStatus === "parsing" ||
    processingStatus === "profiling" ||
    processingStatus === "saving";
  const canProcess = !!selectedFile && !error && !disabled && !isProcessed;
  // Show the status that matches what the user is looking at.
  const shownStatus = isBusy
    ? processingStatus
    : isProcessed
      ? processingStatus
      : error
        ? "error"
        : "selected";

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Upload Dataset"
        description="Import CSV files to begin analyzing your data"
      />

      {storedDataset && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{storedDataset.filename}</p>
              <p className="text-sm text-muted-foreground">
                {storedDataset.recordCount.toLocaleString()} rows • {storedDataset.columnCount} columns
                {storedDataset.storageStatus === "failed"
                  ? " • not saved (will be lost when this tab closes)"
                  : " • saved in this browser"}
                . Processing a new file replaces it.
              </p>
            </div>
            {onRemoveStored && (
              <Button variant="outline" size="sm" onClick={onRemoveStored} disabled={disabled}>
                <X className="mr-2 h-4 w-4" />
                Remove dataset
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card className={dragActive ? "border-primary bg-primary/5" : ""}>
        <CardHeader>
          <CardTitle>Drag & Drop CSV File</CardTitle>
          <CardDescription>
            Drop your CSV file here or click to browse. Maximum file size: 50MB, up to 100,000 rows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200",
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50",
              selectedFile && !error ? "border-success bg-success/5" : "",
              selectedFile && error ? "border-destructive bg-destructive/5" : ""
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv"
              onChange={handleFileInputChange}
              className="hidden"
              id="file-upload"
              disabled={disabled}
            />

            {!selectedFile ? (
              <>
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <UploadIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="mb-2 text-lg font-medium text-foreground">
                  {dragActive ? "Drop the file here" : "Drop CSV file here"}
                </p>
                <p className="mb-6 text-muted-foreground">or</p>
                <Button
                  variant="outline"
                  className="mb-4"
                  disabled={disabled}
                  onClick={openFilePicker}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Browse Files
                </Button>
                <p className="text-sm text-muted-foreground">
                  CSV or TSV files. Everything is processed locally in your browser.
                </p>
              </>
            ) : (
              <div className="text-left max-w-md mx-auto">
                <div className="flex items-center gap-4 p-4 bg-background border border-border rounded-xl">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                    <CheckCircle className="h-6 w-6 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <File className="h-5 w-5 text-muted-foreground" />
                      <p className="font-medium text-foreground truncate">
                        {selectedFile.name}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onRemove} disabled={disabled} aria-label="Remove file">
                      <X className="h-5 w-5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={openFilePicker} disabled={disabled}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Replace
                    </Button>
                  </div>
                </div>
                {error && (
                  <p className="mt-3 text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
                {!error && !isProcessed && (
                  <p className="mt-3 text-sm text-success">
                    File selected. Ready to process.
                  </p>
                )}
                {isProcessed && (
                  <p className="mt-3 text-sm text-success">
                    This file has been processed.
                  </p>
                )}
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() => onProcess()}
                    disabled={!canProcess}
                    className="flex-1"
                  >
                    {isBusy ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <UploadIcon className="mr-2 h-4 w-4" />
                        {isProcessed ? "Processed" : "Process Dataset"}
                      </>
                    )}
                  </Button>
                  {isBusy && onCancel && (
                    <Button variant="outline" onClick={onCancel}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedFile && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Status</CardTitle>
            <CardDescription>Real-time progress of dataset ingestion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {STATUS_LABELS[shownStatus]}
                </span>
                <Badge variant={STATUS_VARIANTS[shownStatus]}>
                  {STATUS_LABELS[shownStatus]}
                </Badge>
              </div>
              <Progress value={isBusy || isProcessed ? progress : 0} showLabel label="Processing progress" />
              {parsingResult && (
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="p-3 border border-border rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Rows</div>
                    <div className="font-medium text-foreground">
                      {parsingResult.rowCount.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 border border-border rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Columns</div>
                    <div className="font-medium text-foreground">
                      {parsingResult.columnCount}
                    </div>
                  </div>
                  <div className="p-3 border border-border rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Warnings</div>
                    <div className="font-medium text-warning">
                      {parsingResult?.warnings.length ?? 0}
                    </div>
                  </div>
                  <div className="p-3 border border-border rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Errors</div>
                    <div className="font-medium text-destructive">
                      {parsingResult?.errors.length ?? 0}
                    </div>
                  </div>
                </div>
              )}
              {(parsingResult?.errors.length ?? 0) > 0 && (
                <div className="mt-4 p-3 border border-destructive/20 bg-destructive/5 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">
                        Parsing Errors
                      </p>
                      <ul className="text-sm text-destructive/80 mt-1 space-y-1 list-disc list-inside">
                        {parsingResult?.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>
                            {err.rowNumber > 0 ? `Line ${err.rowNumber}: ` : ""}
                            {err.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              {parsingResult?.truncated && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <p className="text-sm text-foreground">
                    The file has more rows than the processing limit, so only the first{" "}
                    {parsingResult.rowCount.toLocaleString()} rows were kept.
                  </p>
                </div>
              )}
              {(parsingResult?.warnings.length ?? 0) > 0 && (
                <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {parsingResult?.warnings.length} warning(s)
                      </p>
                      <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                        {parsingResult?.warnings.slice(0, 5).map((w, i) => (
                          <li key={i}>
                            {w.rowNumber > 0 ? `Line ${w.rowNumber}: ` : ""}
                            {w.message}
                          </li>
                        ))}
                      </ul>
                      {(parsingResult?.warnings.length ?? 0) > 5 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          and {(parsingResult?.warnings.length ?? 0) - 5} more. See the Quality page for details.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {parsingResult?.encoding && (
                <p className="text-xs text-muted-foreground">
                  Detected encoding: {parsingResult.encoding}. Delimiter:{" "}
                  {parsingResult.delimiter === "\t" ? "tab" : `"${parsingResult.delimiter}"`}.
                </p>
              )}
              {isProcessed && (processingStatus === "ready" || processingStatus === "warning") ? (
                <div className="mt-4 flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    Dataset processed successfully. Navigate to Data Preview to view records.
                  </span>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>CSV Format Requirements</CardTitle>
          <CardDescription>Ensure your data meets these requirements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Header row required</p>
                <p className="text-sm text-muted-foreground">
                  First row must contain column names
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Consistent columns</p>
                <p className="text-sm text-muted-foreground">
                  Rows with a different number of fields are kept but reported as warnings
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Encoding and delimiter</p>
                <p className="text-sm text-muted-foreground">
                  Detected automatically: UTF-8, Windows-1256 or Windows-1252 text, and comma, semicolon, tab or pipe delimiters
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Local processing</p>
                <p className="text-sm text-muted-foreground">
                  CSV parsing happens entirely in your browser. No data is uploaded.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
