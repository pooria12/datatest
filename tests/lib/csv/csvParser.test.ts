import { describe, it, expect } from "vitest";
import { detectDelimiter, stripBom, validateFile } from "@/lib/csv/csvParser";
import { DEFAULT_VALIDATION_OPTIONS } from "@/lib/csv/csvParser";

describe("csvParser - detectDelimiter", () => {
  it("detects comma as default delimiter", () => {
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
  });

  it("detects semicolon delimiter", () => {
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
  });

  it("detects tab delimiter", () => {
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
  });

  it("handles empty content", () => {
    expect(detectDelimiter("")).toBe(",");
  });
});

describe("csvParser - stripBom", () => {
  it("strips UTF-8 BOM when present", () => {
    const result = stripBom("\uFEFFa,b,c");
    expect(result.hasBom).toBe(true);
    expect(result.content).toBe("a,b,c");
  });

  it("returns content unchanged when no BOM", () => {
    const result = stripBom("a,b,c");
    expect(result.hasBom).toBe(false);
    expect(result.content).toBe("a,b,c");
  });
});

describe("csvParser - validateFile", () => {
  it("validates a valid CSV file", () => {
    const file = new File(["a,b\n1,2"], "test.csv", { type: "text/csv" });
    const result = validateFile(file, DEFAULT_VALIDATION_OPTIONS);
    expect(result.valid).toBe(true);
  });

  it("rejects non-CSV extension", () => {
    const file = new File(["a,b"], "test.txt", { type: "text/plain" });
    const result = validateFile(file, DEFAULT_VALIDATION_OPTIONS);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unsupported file type");
  });

  it("rejects empty file", () => {
    const file = new File([], "empty.csv", { type: "text/csv" });
    const result = validateFile(file, DEFAULT_VALIDATION_OPTIONS);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("rejects no file", () => {
    const result = validateFile(null as unknown as File, DEFAULT_VALIDATION_OPTIONS);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("No file provided");
  });
});
