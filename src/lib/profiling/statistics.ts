import type {
  ColumnStatistics,
  ColumnDataType,
  HistogramBin,
  TopValue,
} from "@/types/dataset.types";
import {
  detectDateOrder,
  isFalseValue,
  isNonMissingValue,
  isTrueValue,
  parseDateValue,
  parseNumber,
} from "./typeInference";

const HISTOGRAM_BINS = 10;
const TOP_VALUES = 5;
const MS_PER_DAY = 86_400_000;

export interface NumericStats {
  count: number;
  min?: number;
  max?: number;
  sum?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  q1?: number;
  q3?: number;
  iqr?: number;
  outlierCount?: number;
  skewness?: number;
  mode?: number;
  modeCount?: number;
  histogram?: HistogramBin[];
}

export interface TextStats {
  minLength: number;
  maxLength: number;
  avgLength: number;
  mode?: string;
  modeCount?: number;
  topValues: TopValue[];
}

export interface BooleanStats {
  trueCount: number;
  falseCount: number;
}

export interface DateStats {
  earliestDate: Date | null;
  latestDate: Date | null;
  spanDays?: number;
}

/** Linear-interpolation percentile (the same method as NumPy/Excel `PERCENTILE.INC`). */
function percentile(sorted: Float64Array, p: number): number {
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function buildHistogram(sorted: Float64Array): HistogramBin[] {
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) return [{ start: min, end: max, count: sorted.length }];

  const width = (max - min) / HISTOGRAM_BINS;
  const bins: HistogramBin[] = Array.from({ length: HISTOGRAM_BINS }, (_, i) => ({
    start: min + i * width,
    end: i === HISTOGRAM_BINS - 1 ? max : min + (i + 1) * width,
    count: 0,
  }));
  for (const value of sorted) {
    const index = Math.min(HISTOGRAM_BINS - 1, Math.floor((value - min) / width));
    bins[index].count++;
  }
  return bins;
}

export function calculateNumericStats(values: string[]): NumericStats {
  const parsed: number[] = [];
  for (const v of values) {
    if (!isNonMissingValue(v)) continue;
    const n = parseNumber(v);
    if (n) parsed.push(n.value);
  }

  if (parsed.length === 0) return { count: 0 };

  const sorted = Float64Array.from(parsed).sort();
  const count = sorted.length;
  let sum = 0;
  for (const n of sorted) sum += n;
  const mean = sum / count;

  let stdDev: number | undefined;
  let skewness: number | undefined;
  if (count > 1) {
    let squares = 0;
    for (const n of sorted) squares += (n - mean) ** 2;
    stdDev = Math.sqrt(squares / (count - 1));
    if (count > 2 && stdDev > 0) {
      let cubes = 0;
      for (const n of sorted) cubes += ((n - mean) / stdDev) ** 3;
      skewness = (count / ((count - 1) * (count - 2))) * cubes;
    }
  }

  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowFence = q1 - 1.5 * iqr;
  const highFence = q3 + 1.5 * iqr;
  let outlierCount = 0;
  const frequency = new Map<number, number>();
  for (const n of sorted) {
    if (n < lowFence || n > highFence) outlierCount++;
    frequency.set(n, (frequency.get(n) ?? 0) + 1);
  }

  let mode: number | undefined;
  let modeCount = 1;
  for (const [n, c] of frequency) {
    if (c > modeCount) {
      mode = n;
      modeCount = c;
    }
  }

  return {
    count,
    min: sorted[0],
    max: sorted[count - 1],
    sum,
    mean,
    median: percentile(sorted, 0.5),
    stdDev,
    q1,
    q3,
    iqr,
    outlierCount,
    skewness,
    mode,
    modeCount: mode === undefined ? undefined : modeCount,
    histogram: buildHistogram(sorted),
  };
}

export function calculateTextStats(values: string[]): TextStats {
  let count = 0;
  let totalLength = 0;
  let minLength = Number.POSITIVE_INFINITY;
  let maxLength = 0;
  const frequency = new Map<string, number>();

  // Plain loop on purpose: spreading large arrays into Math.min/max throws RangeError.
  for (const v of values) {
    if (!isNonMissingValue(v)) continue;
    count++;
    totalLength += v.length;
    if (v.length < minLength) minLength = v.length;
    if (v.length > maxLength) maxLength = v.length;
    frequency.set(v, (frequency.get(v) ?? 0) + 1);
  }

  if (count === 0) {
    return { minLength: 0, maxLength: 0, avgLength: 0, topValues: [] };
  }

  const topValues = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, TOP_VALUES)
    .map(([value, c]) => ({ value, count: c }));
  const top = topValues[0];

  return {
    minLength,
    maxLength,
    avgLength: totalLength / count,
    mode: top && top.count > 1 ? top.value : undefined,
    modeCount: top && top.count > 1 ? top.count : undefined,
    topValues,
  };
}

export function calculateBooleanStats(values: string[]): BooleanStats {
  let trueCount = 0;
  let falseCount = 0;

  for (const v of values) {
    if (!isNonMissingValue(v)) continue;
    if (isTrueValue(v)) trueCount++;
    else if (isFalseValue(v)) falseCount++;
  }

  return { trueCount, falseCount };
}

export function calculateDateStats(values: string[]): DateStats {
  const nonMissing = values.filter((v) => isNonMissingValue(v));
  const order = detectDateOrder(nonMissing);
  let earliest: Date | null = null;
  let latest: Date | null = null;

  for (const v of nonMissing) {
    const parsed = parseDateValue(v, order);
    if (!parsed) continue;
    if (!earliest || parsed.date < earliest) earliest = parsed.date;
    if (!latest || parsed.date > latest) latest = parsed.date;
  }

  const spanDays =
    earliest && latest ? (latest.getTime() - earliest.getTime()) / MS_PER_DAY : undefined;
  return { earliestDate: earliest, latestDate: latest, spanDays };
}

/**
 * Builds the statistics stored with a column. Returns undefined when there is nothing to report
 * (for example a numeric column without a single parsable value).
 */
export function buildColumnStatistics(
  dataType: ColumnDataType,
  values: string[]
): ColumnStatistics | undefined {
  switch (dataType) {
    case "integer":
    case "decimal": {
      const stats = calculateNumericStats(values);
      return stats.count === 0 ? undefined : stats;
    }
    case "string":
      return calculateTextStats(values);
    case "boolean":
      return calculateBooleanStats(values);
    case "date":
    case "datetime": {
      const stats = calculateDateStats(values);
      if (!stats.earliestDate || !stats.latestDate) return undefined;
      return {
        earliestDate: stats.earliestDate,
        latestDate: stats.latestDate,
        spanDays: stats.spanDays,
      };
    }
    default:
      return undefined;
  }
}
