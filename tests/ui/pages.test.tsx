import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useState } from "react";
import { DatasetContext, type DatasetContextValue } from "@/context/DatasetContext";
import { Quality } from "@/pages/Quality";
import { FeatureAnalysis } from "@/pages/FeatureAnalysis";
import { DatasetTable } from "@/components/datasets/DatasetTable";
import { DatasetUploader } from "@/components/datasets/DatasetUploader";
import { Modal } from "@/components/ui/Modal";
import { parseCsvContent } from "@/lib/csv/csvParser";
import { profileDataset } from "@/lib/profiling/profilingEngine";
import { generateQualityReport } from "@/lib/profiling/dataQuality";
import type { DatasetRecord } from "@/types/dataset.types";

async function buildDataset(csv: string): Promise<DatasetRecord> {
  const r = await parseCsvContent(csv);
  const profile = profileDataset(
    { headers: r.headers, rows: r.rows, rowCount: r.rowCount, columnCount: r.columnCount, parsingErrors: r.errors, parsingWarnings: r.warnings },
    "ds-1"
  );
  return {
    id: "ds-1",
    filename: "sample.csv",
    fileSize: 100,
    fileType: "text/csv",
    createdAt: "2026-01-01T00:00:00Z",
    recordCount: r.rowCount,
    columnCount: r.columnCount,
    columns: profile.columnMetadata,
    status: "ready",
    parsingWarnings: r.warnings,
    parsingErrors: r.errors,
    profile,
    qualityReport: generateQualityReport(profile),
    storageStatus: "saved",
  };
}

function contextValue(dataset: DatasetRecord | null): DatasetContextValue {
  return {
    dataset,
    records: null,
    status: dataset ? "ready" : "idle",
    progress: 100,
    parsingResult: null,
    isProcessing: false,
    isLoading: false,
    isRecordsLoading: false,
    error: null,
    processFile: vi.fn().mockResolvedValue(true),
    cancelProcessing: vi.fn(),
    clearDataset: vi.fn().mockResolvedValue(undefined),
    loadRecords: vi.fn().mockResolvedValue(undefined),
    clearError: vi.fn(),
  };
}

const renderWith = (ui: React.ReactElement, dataset: DatasetRecord | null) =>
  render(
    <MemoryRouter>
      <DatasetContext.Provider value={contextValue(dataset)}>{ui}</DatasetContext.Provider>
    </MemoryRouter>
  );

const SAMPLE = ["id,price,city,when"]
  .concat(Array.from({ length: 40 }, (_, i) => `${i + 1},${(i + 1) * 1.5},City${i % 3},2026-01-${String((i % 28) + 1).padStart(2, "0")}`))
  .concat(["41,oops,City0,2026-02-10"])
  .join("\n");

describe("Quality page", () => {
  it("shows real numbers instead of literal template braces", async () => {
    const dataset = await buildDataset(SAMPLE);
    const { container } = renderWith(<Quality />, dataset);
    expect(container.textContent).not.toMatch(/\{[^}]*\}/);
    expect(screen.getAllByText("Overall quality score").length).toBeGreaterThan(0);
    expect(screen.getByText(/unique of 41 records/)).toBeInTheDocument();
  });

  it("renders critical issues with the critical badge", async () => {
    const dataset = await buildDataset(SAMPLE);
    dataset.qualityReport!.issues.push({
      type: "parsing_error",
      affectedRecordCount: 2,
      severity: "critical",
      description: "2 parsing error(s) detected during file processing",
    });
    renderWith(<Quality />, dataset);
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });
});

describe("Feature Analysis page", () => {
  it("renders exactly one card per column with type-specific statistics", async () => {
    const dataset = await buildDataset(SAMPLE);
    renderWith(<FeatureAnalysis />, dataset);
    for (const name of ["id", "price", "city", "when"]) {
      expect(screen.getAllByText(name, { selector: "h3, [title]" }).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("Median").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Most frequent values")).toHaveLength(1);
    expect(screen.getAllByText("Earliest")).toHaveLength(1);
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("filters columns by type", async () => {
    const dataset = await buildDataset(SAMPLE);
    renderWith(<FeatureAnalysis />, dataset);
    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(1);
  });
});

describe("DatasetTable", () => {
  const rows = Array.from({ length: 60 }, (_, i) => ({ n: String(i % 2 === 0 ? i : -i), v: i === 5 ? "10.5" : i === 6 ? "10.25" : "1" }));

  it("changes the page size", () => {
    render(<DatasetTable columns={["n", "v"]} rows={rows} totalRecords={60} totalColumns={2} />);
    expect(screen.getAllByRole("row")).toHaveLength(26);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "50" } });
    expect(screen.getAllByRole("row")).toHaveLength(51);
  });

  it("sorts negatives and decimals numerically using the column type", () => {
    render(<DatasetTable columns={["n"]} rows={rows} totalRecords={60} totalColumns={1} columnTypes={{ n: "integer" }} />);
    fireEvent.click(screen.getByRole("button", { name: /^n/ }));
    const firstCell = within(screen.getAllByRole("row")[1]).getAllByRole("cell")[1];
    expect(firstCell.textContent).toBe("-59");
  });

  it("shows the number of matches, not the query text", () => {
    render(<DatasetTable columns={["n", "v"]} rows={rows} totalRecords={60} totalColumns={2} />);
    fireEvent.change(screen.getByLabelText("Search records"), { target: { value: "10.5" } });
    expect(
      screen.getByText((_, el) => el?.tagName === "P" && /\b1 match$/.test(el.textContent ?? ""))
    ).toBeInTheDocument();
    expect(screen.queryByText(/matches found/)).not.toBeInTheDocument();
  });
});

describe("DatasetUploader", () => {
  const baseProps = {
    onFileSelect: vi.fn(),
    onProcess: vi.fn(),
    onRemove: vi.fn(),
    processingStatus: "selected" as const,
    progress: 0,
    parsingResult: null,
    disabled: false,
  };
  const file = { name: "a.csv", size: 10, type: "text/csv" };

  beforeEach(() => vi.clearAllMocks());

  it("Replace opens the file picker straight away (the input is not disabled)", () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click");
    const { container } = render(<DatasetUploader {...baseProps} selectedFile={file} error={null} />);
    const input = container.querySelector("input[type=file]") as HTMLInputElement;
    expect(input.disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /Replace/ }));
    expect(click).toHaveBeenCalled();
  });

  it("does not show an invalid file as ready to process", () => {
    render(<DatasetUploader {...baseProps} selectedFile={{ ...file, name: "a.txt" }} error='Unsupported file type ".txt"' />);
    expect(screen.queryByText(/Ready to process/)).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Unsupported file type");
    expect(screen.getByRole("button", { name: /Process Dataset/ })).toBeDisabled();
  });

  it("ignores dropped files while processing", () => {
    const { container } = render(
      <DatasetUploader {...baseProps} selectedFile={null} error={null} disabled processingStatus="parsing" />
    );
    const zone = container.querySelector("[class*='border-dashed']") as HTMLElement;
    fireEvent.drop(zone, { dataTransfer: { files: [new File(["x"], "b.csv")] } });
    expect(baseProps.onFileSelect).not.toHaveBeenCalled();
  });

  it("calls onProcess without arguments and shows Cancel while busy", () => {
    const onCancel = vi.fn();
    const { rerender } = render(<DatasetUploader {...baseProps} selectedFile={file} error={null} />);
    fireEvent.click(screen.getByRole("button", { name: /Process Dataset/ }));
    expect(baseProps.onProcess).toHaveBeenCalledWith();
    rerender(<DatasetUploader {...baseProps} selectedFile={file} error={null} disabled processingStatus="profiling" onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe("Modal", () => {
  function Harness() {
    const [open, setOpen] = useState(true);
    return (
      <Modal open={open} onClose={() => setOpen(false)} title="Title">
        <p>Body</p>
      </Modal>
    );
  }

  it("closes when the area outside the dialog is clicked", async () => {
    render(<Harness />);
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog); // inside: stays open
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(dialog.parentElement as HTMLElement);
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
