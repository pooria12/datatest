import * as Papa from "papaparse";
import type { ParsingResult, ParsingError } from "@/types/dataset.types";
import { DEFAULT_PROCESSING_LIMITS } from "@/types/dataset.types";

const COMMON_DELIMITERS = [",", ";", "\t", "|"];
const EXTRA_FIELDS_KEY = "__parsed_extra";

export interface FileValidationOptions {
  allowedExtensions: string[];
  maxFileSizeBytes: number;
}

export const DEFAULT_VALIDATION_OPTIONS: FileValidationOptions = {
  allowedExtensions: [".csv", ".tsv"],
  maxFileSizeBytes: 50 * 1024 * 1024,
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface ParseOptions {
  delimiter?: string;
  hasHeader?: boolean;
  skipEmptyLines?: boolean;
  maxRecords?: number;
  maxColumns?: number;
  chunkSize?: number;
  dynamicTyping?: boolean;
  /** Force a specific text encoding. When omitted the encoding is detected. */
  encoding?: string;
}

export const DEFAULT_PARSE_OPTIONS: ParseOptions = {
  skipEmptyLines: true,
  dynamicTyping: false,
  chunkSize: 10000,
  maxColumns: DEFAULT_PROCESSING_LIMITS.maxColumns,
};

/**
 * Detects the most likely delimiter by sampling the first lines.
 * A delimiter wins when it appears the same (non-zero) number of times on most lines;
 * ties are broken by the higher column count, then by the order of COMMON_DELIMITERS.
 */
export function detectDelimiter(content: string): string {
  const lines = content.split(/\r?\n/).slice(0, 50);
  let bestDelimiter = ",";
  let bestScore = -1;

  for (const delim of COMMON_DELIMITERS) {
    const frequency = new Map<number, number>();

    for (const line of lines) {
      if (!line.trim()) continue;
      const count = countDelimiterOutsideQuotes(line, delim);
      if (count > 0) {
        frequency.set(count, (frequency.get(count) ?? 0) + 1);
      }
    }

    let modeCount = 0;
    let modeLines = 0;
    for (const [count, numLines] of frequency) {
      if (numLines > modeLines || (numLines === modeLines && count > modeCount)) {
        modeCount = count;
        modeLines = numLines;
      }
    }

    if (modeLines === 0) continue;
    const score = modeLines * 1000 + modeCount;
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}

function countDelimiterOutsideQuotes(line: string, delim: string): number {
  let count = 0;
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (char === delim && !inQuotes) {
      count++;
    }
    i++;
  }

  return count;
}

/**
 * Strips UTF-8 BOM if present.
 */
export function stripBom(content: string): { content: string; hasBom: boolean } {
  if (content.charCodeAt(0) === 0xfeff) {
    return { content: content.slice(1), hasBom: true };
  }
  return { content, hasBom: false };
}

/**
 * Validates a File object before parsing.
 */
export function validateFile(
  file: File,
  options: FileValidationOptions = DEFAULT_VALIDATION_OPTIONS
): ValidationResult {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  const dotIndex = file.name.lastIndexOf(".");
  const extension = dotIndex === -1 ? "" : file.name.slice(dotIndex).toLowerCase();
  if (!extension || !options.allowedExtensions.includes(extension)) {
    const allowed = options.allowedExtensions.join(", ");
    return {
      valid: false,
      error: `Unsupported file type "${extension || "(none)"}". Allowed file types: ${allowed}.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: "The file is empty (0 bytes)" };
  }

  if (file.size > options.maxFileSizeBytes) {
    const maxMB = (options.maxFileSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File exceeds maximum size of ${maxMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Decodes raw bytes to text. Tries strict UTF-8 first; if the bytes are not valid UTF-8 it
 * falls back to windows-1256 (Arabic/Persian) or windows-1252 (Western) based on the content.
 */
export function decodeBuffer(
  buffer: ArrayBuffer,
  forcedEncoding?: string
): { text: string; encoding: string } {
  const bytes = new Uint8Array(buffer);

  if (forcedEncoding) {
    return {
      text: new TextDecoder(forcedEncoding, { ignoreBOM: true }).decode(bytes),
      encoding: forcedEncoding.toLowerCase(),
    };
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    return { text, encoding: text.charCodeAt(0) === 0xfeff ? "utf-8-bom" : "utf-8" };
  } catch {
    const arabic = new TextDecoder("windows-1256").decode(bytes);
    const nonAscii = arabic.match(/[^\x20-\x7e\t\r\n]/g)?.length ?? 0;
    const arabicLetters = arabic.match(/[\u0600-\u06ff]/g)?.length ?? 0;
    if (nonAscii > 0 && arabicLetters / nonAscii > 0.3) {
      return { text: arabic, encoding: "windows-1256" };
    }
    return { text: new TextDecoder("windows-1252").decode(bytes), encoding: "windows-1252" };
  }
}

function rowNumberFromIndex(index: number | undefined, hasHeader: boolean): number {
  return (index ?? 0) + (hasHeader ? 2 : 1);
}

/**
 * Shared parsing core used by both the file and the string entry points.
 */
function parseCore(
  rawContent: string,
  encoding: string,
  config: ParseOptions
): ParsingResult {
  const stripped = stripBom(rawContent);
  const content = stripped.content;
  const hasHeader = config.hasHeader !== undefined ? config.hasHeader : true;
  const delimiter = config.delimiter || detectDelimiter(content);
  const maxRecords = config.maxRecords;
  const maxColumns = config.maxColumns ?? DEFAULT_PROCESSING_LIMITS.maxColumns;

  const errors: ParsingError[] = [];
  const warnings: ParsingError[] = [];
  const rawHeaders: string[] = [];

  const papaConfig: Papa.ParseConfig = {
    header: hasHeader,
    skipEmptyLines: config.skipEmptyLines ?? true,
    dynamicTyping: false,
    delimiter,
    // Read one extra row so that truncation can be detected exactly.
    preview: maxRecords ? maxRecords + 1 : undefined,
    transformHeader: (header: string, index: number) => {
      const trimmed = header.trim();
      rawHeaders[index] = trimmed;
      return trimmed === "" ? `column_${index + 1}` : trimmed;
    },
  };

  const results = Papa.parse(content, papaConfig) as Papa.ParseResult<unknown>;

  let headers: string[];
  let rows: Array<Record<string, string>>;

  if (hasHeader) {
    headers = results.meta.fields ?? [];
    rows = results.data as Array<Record<string, string>>;
  } else {
    const arrays = results.data as string[][];
    const width = arrays.reduce((max, r) => Math.max(max, r.length), 0);
    headers = Array.from({ length: width }, (_, i) => `column_${i + 1}`);
    rows = arrays.map((arr) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = arr[i] ?? "";
      });
      return obj;
    });
  }

  // Papa errors: row-level problems become warnings, structural problems become errors.
  const damagedRows = new Set<number>();
  for (const err of results.errors) {
    if (err.code === "TooFewFields" || err.code === "TooManyFields") {
      if (err.row !== undefined) damagedRows.add(err.row);
      warnings.push({
        category: "row",
        rowNumber: rowNumberFromIndex(err.row, hasHeader),
        message: err.message,
        severity: "warning",
        recoverable: true,
      });
    } else if (err.code === "UndetectableDelimiter") {
      warnings.push({
        category: "delimiter",
        rowNumber: rowNumberFromIndex(err.row, hasHeader),
        message: err.message,
        severity: "warning",
        recoverable: true,
      });
    } else {
      errors.push({
        category: err.type === "Quotes" ? "quote" : "structure",
        rowNumber: rowNumberFromIndex(err.row, hasHeader),
        message: err.message,
        severity: "error",
        recoverable: false,
      });
    }
  }

  // Normalise damaged rows: drop Papa's overflow key and fill missing cells with "".
  for (const index of damagedRows) {
    const row = rows[index];
    if (!row) continue;
    delete (row as Record<string, unknown>)[EXTRA_FIELDS_KEY];
    for (const h of headers) {
      if (row[h] === undefined) row[h] = "";
    }
  }

  // Header problems: empty and duplicate column names.
  if (hasHeader) {
    const seen = new Map<string, number>();
    rawHeaders.forEach((name, index) => {
      if (name === "") {
        warnings.push({
          category: "structure",
          rowNumber: 1,
          columnIndex: index,
          message: `Column ${index + 1} has an empty name and was renamed to "column_${index + 1}"`,
          severity: "warning",
          recoverable: true,
        });
        return;
      }
      if (seen.has(name)) {
        warnings.push({
          category: "structure",
          rowNumber: 1,
          columnName: name,
          columnIndex: index,
          message: `Duplicate column name "${name}" (column ${index + 1}); the duplicate was renamed automatically`,
          severity: "warning",
          recoverable: true,
        });
      } else {
        seen.set(name, index);
      }
    });
  }

  if (headers.length > maxColumns) {
    errors.push({
      category: "structure",
      rowNumber: 1,
      message: `The file has ${headers.length} columns; the maximum supported is ${maxColumns}`,
      severity: "error",
      recoverable: false,
    });
  }

  let truncated = false;
  if (maxRecords && rows.length > maxRecords) {
    rows = rows.slice(0, maxRecords);
    truncated = true;
  }

  if (rows.length === 0) {
    errors.push({
      category: "structure",
      rowNumber: 0,
      message: "The file contains no data rows",
      severity: "error",
      recoverable: false,
    });
  }

  return {
    headers,
    rows,
    rowCount: rows.length,
    columnCount: headers.length,
    errors,
    warnings,
    delimiter,
    hasHeader,
    encoding,
    hasBom: stripped.hasBom,
    truncated,
  };
}

/** Lets the browser paint progress updates before heavy synchronous work starts. */
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (result == null || typeof result === "string") {
        reject(new Error("Failed to read file content"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parses a CSV file using Papa Parse with custom error handling.
 */
export async function parseCsvFile(
  file: File,
  options: ParseOptions = {}
): Promise<ParsingResult> {
  const config: ParseOptions = { ...DEFAULT_PARSE_OPTIONS, ...options };
  const buffer = await readFileAsArrayBuffer(file);
  const { text, encoding } = decodeBuffer(buffer, config.encoding);
  await yieldToEventLoop();
  return parseCore(text, encoding, config);
}

/**
 * Parses CSV content from a string.
 */
export async function parseCsvContent(
  content: string,
  options: ParseOptions = {}
): Promise<ParsingResult> {
  const config: ParseOptions = { ...DEFAULT_PARSE_OPTIONS, ...options };
  const encoding = content.charCodeAt(0) === 0xfeff ? "utf-8-bom" : "utf-8";
  return parseCore(content, encoding, config);
}
