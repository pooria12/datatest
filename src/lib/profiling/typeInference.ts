import type { ColumnDataType, MissingValuePolicy } from "@/types/dataset.types";
import { DEFAULT_MISSING_VALUE_POLICY } from "@/types/dataset.types";

/** Share of non-missing values that must fit a type for the column to get that type. */
export const TYPE_MATCH_THRESHOLD = 0.95;

const INT_RE = /^[+-]?\d+$/;
const DEC_RE = /^[+-]?(?:\d+\.\d*|\.\d+)$/;
const SCI_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)[eE][+-]?\d+$/;
const THOUSANDS_RE = /^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;
const DEC_COMMA_RE = /^[+-]?\d+,\d+$/;
const BOOLEAN_WORDS = new Set(["true", "false", "yes", "no", "t", "f", "y", "n"]);
const TRUE_WORDS = new Set(["true", "yes", "t", "y", "1"]);
const FALSE_WORDS = new Set(["false", "no", "f", "n", "0"]);

const ISO_DATE_RE =
  /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ]+(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,]\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?)?$/i;
const PART_DATE_RE =
  /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[T ]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]m)?)?$/i;

export type DateOrder = "dmy" | "mdy";

export interface ParsedNumber {
  value: number;
  isInteger: boolean;
}

export interface ParsedDate {
  date: Date;
  hasTime: boolean;
}

export interface ColumnTypeAnalysis {
  dataType: ColumnDataType;
  /** Non-missing values that do not fit the inferred type. */
  invalidCount: number;
  nonMissingCount: number;
}

/**
 * Parses a numeric string. Supports integers, decimals, scientific notation, thousands
 * separators ("1,200") and decimal commas ("3,5"). Returns null for anything else.
 * Integers with leading zeros ("00123", zip codes, phone numbers) and integers longer than
 * 15 digits are treated as identifiers, not numbers.
 */
export function parseNumber(raw: string): ParsedNumber | null {
  const s = raw.trim();
  if (s === "") return null;

  if (INT_RE.test(s)) {
    const digits = s.replace(/^[+-]/, "");
    if (digits.length > 15) return null;
    if (digits.length > 1 && digits.startsWith("0")) return null;
    return { value: Number(s), isInteger: true };
  }
  if (DEC_RE.test(s)) {
    if (/^[+-]?0\d/.test(s)) return null;
    return { value: Number(s), isInteger: false };
  }
  if (SCI_RE.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? { value: n, isInteger: false } : null;
  }
  if (THOUSANDS_RE.test(s)) {
    return { value: Number(s.replace(/,/g, "")), isInteger: !s.includes(".") };
  }
  if (DEC_COMMA_RE.test(s)) {
    if (/^[+-]?0\d/.test(s)) return null;
    return { value: Number(s.replace(",", ".")), isInteger: false };
  }
  return null;
}

function buildUtcDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  offsetMinutes: number
): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59 || second > 59) return null;
  const ms = Date.UTC(year, month - 1, day, hour, minute, second);
  const d = new Date(ms);
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }
  return new Date(ms - offsetMinutes * 60000);
}

function parseOffset(raw: string | undefined): number {
  if (!raw || raw.toUpperCase() === "Z") return 0;
  const sign = raw[0] === "-" ? -1 : 1;
  const digits = raw.slice(1).replace(":", "");
  return sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4)));
}

/**
 * Parses date and datetime strings without relying on `new Date(string)` so that results do not
 * depend on the browser time zone: values without an offset are read as UTC wall-clock time.
 * Supported: yyyy-mm-dd, yyyy/mm/dd, ISO with time and offset, and dd/mm/yyyy or mm/dd/yyyy
 * (1-2 digit parts, "/", "-" or "." separators, optional time, optional AM/PM).
 */
export function parseDateValue(raw: string, order: DateOrder = "mdy"): ParsedDate | null {
  const s = raw.trim();
  if (s === "") return null;

  const iso = ISO_DATE_RE.exec(s);
  if (iso) {
    const hasTime = iso[4] !== undefined;
    const d = buildUtcDate(
      Number(iso[1]),
      Number(iso[2]),
      Number(iso[3]),
      hasTime ? Number(iso[4]) : 0,
      hasTime ? Number(iso[5]) : 0,
      iso[6] !== undefined ? Number(iso[6]) : 0,
      parseOffset(iso[7])
    );
    return d ? { date: d, hasTime } : null;
  }

  const part = PART_DATE_RE.exec(s);
  if (part) {
    const first = Number(part[1]);
    const second = Number(part[2]);
    const day = order === "dmy" ? first : second;
    const month = order === "dmy" ? second : first;
    const hasTime = part[4] !== undefined;
    let hour = hasTime ? Number(part[4]) : 0;
    const meridiem = part[7]?.toLowerCase();
    if (meridiem) {
      if (hour < 1 || hour > 12) return null;
      hour = (hour % 12) + (meridiem === "pm" ? 12 : 0);
    }
    const d = buildUtcDate(
      Number(part[3]),
      month,
      day,
      hour,
      hasTime ? Number(part[5]) : 0,
      part[6] !== undefined ? Number(part[6]) : 0,
      0
    );
    return d ? { date: d, hasTime } : null;
  }

  return null;
}

/**
 * Decides whether ambiguous "a/b/yyyy" dates are day-first or month-first by looking for a
 * part greater than 12. Defaults to month-first when nothing disambiguates.
 */
export function detectDateOrder(values: string[]): DateOrder {
  let dayFirst = 0;
  let monthFirst = 0;
  let inspected = 0;
  for (const v of values) {
    const m = PART_DATE_RE.exec(v.trim());
    if (!m) continue;
    if (Number(m[1]) > 12) dayFirst++;
    if (Number(m[2]) > 12) monthFirst++;
    if (++inspected >= 2000) break;
  }
  return dayFirst > monthFirst ? "dmy" : "mdy";
}

function markerSet(policy: MissingValuePolicy): Set<string> {
  let cached = markerCache.get(policy);
  if (!cached) {
    cached = new Set(policy.markers.map((m) => m.trim().toLowerCase()));
    markerCache.set(policy, cached);
  }
  return cached;
}
const markerCache = new WeakMap<MissingValuePolicy, Set<string>>();

export type MissingKind = "empty" | "whitespace" | "marker" | null;

/**
 * Single source of truth for "is this cell missing?" and why. Marker matching is case-insensitive.
 */
export function classifyMissing(
  value: string | null | undefined,
  policy: MissingValuePolicy = DEFAULT_MISSING_VALUE_POLICY
): MissingKind {
  if (value == null || value === "") return policy.treatEmptyAsMissing ? "empty" : null;
  const trimmed = value.trim();
  if (trimmed === "") return policy.treatWhitespaceOnlyAsMissing ? "whitespace" : null;
  return markerSet(policy).has(trimmed.toLowerCase()) ? "marker" : null;
}

export function isMissingValue(
  value: string | null | undefined,
  policy: MissingValuePolicy = DEFAULT_MISSING_VALUE_POLICY
): boolean {
  return classifyMissing(value, policy) !== null;
}

export function isNonMissingValue(
  value: string | null | undefined,
  policy: MissingValuePolicy = DEFAULT_MISSING_VALUE_POLICY
): boolean {
  return !isMissingValue(value, policy);
}

/**
 * Infers the data type of a column and counts the values that do not fit it.
 * A numeric or date type needs at least TYPE_MATCH_THRESHOLD of the non-missing values to match;
 * the remaining values are reported as invalid instead of silently skewing the type.
 */
export function analyzeColumnType(
  values: string[],
  policy: MissingValuePolicy = DEFAULT_MISSING_VALUE_POLICY
): ColumnTypeAnalysis {
  const nonMissing: string[] = [];
  for (const v of values) {
    if (!isMissingValue(v, policy)) nonMissing.push(v.trim());
  }
  const total = nonMissing.length;
  if (total === 0) return { dataType: "empty", invalidCount: 0, nonMissingCount: 0 };

  const order = detectDateOrder(nonMissing);
  let integers = 0;
  let decimals = 0;
  let booleanWords = 0;
  let dates = 0;
  let datetimes = 0;
  let zeros = 0;
  let ones = 0;

  for (const t of nonMissing) {
    if (t === "0") zeros++;
    else if (t === "1") ones++;

    const num = parseNumber(t);
    if (num) {
      if (num.isInteger) integers++;
      else decimals++;
      continue;
    }
    if (BOOLEAN_WORDS.has(t.toLowerCase())) {
      booleanWords++;
      continue;
    }
    const date = parseDateValue(t, order);
    if (date) {
      if (date.hasTime) datetimes++;
      else dates++;
    }
  }

  // A column made only of 0 and 1 (both present) is a flag, not a count.
  if (zeros > 0 && ones > 0 && zeros + ones === total) {
    return { dataType: "boolean", invalidCount: 0, nonMissingCount: total };
  }
  if (booleanWords === total) {
    return { dataType: "boolean", invalidCount: 0, nonMissingCount: total };
  }

  const numeric = integers + decimals;
  if (numeric / total >= TYPE_MATCH_THRESHOLD) {
    return {
      dataType: decimals > 0 ? "decimal" : "integer",
      invalidCount: total - numeric,
      nonMissingCount: total,
    };
  }
  const temporal = dates + datetimes;
  if (temporal / total >= TYPE_MATCH_THRESHOLD) {
    return {
      dataType: datetimes > 0 ? "datetime" : "date",
      invalidCount: total - temporal,
      nonMissingCount: total,
    };
  }
  return { dataType: "string", invalidCount: 0, nonMissingCount: total };
}

export function inferColumnType(
  values: string[],
  policy: MissingValuePolicy = DEFAULT_MISSING_VALUE_POLICY
): ColumnDataType {
  return analyzeColumnType(values, policy).dataType;
}

export function isTrueValue(value: string): boolean {
  return TRUE_WORDS.has(value.trim().toLowerCase());
}

export function isFalseValue(value: string): boolean {
  return FALSE_WORDS.has(value.trim().toLowerCase());
}
