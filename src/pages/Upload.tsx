import { useState } from "react";
import { useDataset } from "@hooks/useDataset";
import { DatasetUploader } from "@components/datasets/DatasetUploader";
import { validateFile } from "@/lib/csv/csvParser";

export function Upload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [processedFile, setProcessedFile] = useState<File | null>(null);

  const {
    dataset,
    status,
    progress,
    parsingResult,
    isProcessing,
    error,
    processFile,
    cancelProcessing,
    clearDataset,
    clearError,
  } = useDataset();

  const handleFileSelect = (file: File) => {
    // Validate right away so an invalid file is never shown as "ready to process".
    const validation = validateFile(file);
    setSelectedFile(file);
    setValidationError(validation.valid ? null : (validation.error ?? "Invalid file"));
    setProcessedFile(null);
    clearError();
  };

  const handleProcess = async () => {
    if (!selectedFile || validationError) return;
    const file = selectedFile;
    const ok = await processFile(file);
    if (ok) setProcessedFile(file);
  };

  const handleRemove = async () => {
    setSelectedFile(null);
    setValidationError(null);
    setProcessedFile(null);
    clearError();
    await clearDataset();
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    setValidationError(null);
    setProcessedFile(null);
    clearError();
  };

  const parsingResultMapped =
    parsingResult && {
      headers: parsingResult.headers,
      rows: parsingResult.rows,
      rowCount: parsingResult.rowCount,
      columnCount: parsingResult.columnCount,
      errors: parsingResult.errors.map((e) => ({
        message: e.message,
        severity: e.severity,
        rowNumber: e.rowNumber,
      })),
      warnings: parsingResult.warnings.map((w) => ({
        message: w.message,
        severity: w.severity,
        rowNumber: w.rowNumber,
      })),
      delimiter: parsingResult.delimiter,
      encoding: parsingResult.encoding,
      truncated: parsingResult.truncated,
    };

  const selectedFileMeta =
    selectedFile && {
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type,
    };

  return (
    <DatasetUploader
      onFileSelect={handleFileSelect}
      onProcess={handleProcess}
      onCancel={cancelProcessing}
      onRemove={handleClearSelection}
      onRemoveStored={handleRemove}
      selectedFile={selectedFileMeta}
      storedDataset={
        dataset
          ? {
              filename: dataset.filename,
              recordCount: dataset.recordCount,
              columnCount: dataset.columnCount,
              storageStatus: dataset.storageStatus,
            }
          : null
      }
      processingStatus={status}
      isProcessed={!!selectedFile && processedFile === selectedFile}
      progress={progress}
      error={validationError ?? error}
      parsingResult={parsingResultMapped}
      disabled={isProcessing}
    />
  );
}
