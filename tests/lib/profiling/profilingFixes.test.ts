import { describe, it, expect } from "vitest";
import { parseCsvContent } from "@/lib/csv/csvParser";
import { profileDataset, profileDatasetAsync } from "@/lib/profiling/profilingEngine";
import { generateQualityReport } from "@/lib/profiling/dataQuality";
import { inferColumnType, analyzeColumnType, parseNumber, parseDateValue } from "@/lib/profiling/typeInference";
import { calculateTextStats, calculateNumericStats, calculateDateStats } from "@/lib/profiling/statistics";
import { detectDuplicateRows } from "@/lib/profiling/duplicates";
import { calculateMissingValues } from "@/lib/profiling/missingValues";

async function profileCsv(csv: string) {
  const r = await parseCsvContent(csv);
  const profile = profileDataset(
    {
      headers: r.headers,
      rows: r.rows,
      rowCount: r.rowCount,
      columnCount: r.columnCount,
      parsingErrors: r.errors,
      parsingWarnings: r.warnings,
      truncated: r.truncated,
    },
    "ds"
  );
  return { r, profile, report: generateQualityReport(profile) };
}

describe("type inference (UCI Online Retail style data)", () => {
  it("detects m/d/yyyy h:mm as datetime", () => {
    expect(inferColumnType(["12/1/2010 8:26", "12/1/2010 8:28", "12/13/2010 10:00"])).toBe("datetime");
  });
  it("detects day-first dates when a day > 12 exists", () => {
    expect(inferColumnType(["13/05/2020", "25/12/2020", "01/02/2020"])).toBe("date");
    const stats = calculateDateStats(["13/05/2020", "25/12/2020", "01/02/2020"]);
    expect(stats.earliestDate?.toISOString()).toBe("2020-02-01T00:00:00.000Z");
  });
  it("keeps identifiers with leading zeros as strings", () => {
    expect(inferColumnType(["01234", "02345", "00123"])).toBe("string");
  });
  it("treats a 0/1 column as boolean", () => {
    expect(inferColumnType(["0", "1", "1", "0"])).toBe("boolean");
  });
  it("supports decimal comma, thousands separators and scientific notation", () => {
    expect(inferColumnType(["3,5", "4,25"])).toBe("decimal");
    expect(inferColumnType(["1,200", "3,400"])).toBe("integer");
    expect(inferColumnType(["1e5", "2.5e3"])).toBe("decimal");
    expect(parseNumber("1,200")?.value).toBe(1200);
    expect(parseNumber("3,5")?.value).toBe(3.5);
  });
  it("reports invalid values instead of hiding them in a numeric column", () => {
    const values = Array.from({ length: 40 }, (_, i) => String(i + 10));
    values.push("abc");
    const a = analyzeColumnType(values);
    expect(a.dataType).toBe("integer");
    expect(a.invalidCount).toBe(1);
    expect(inferColumnType(["1", "2", "3", "abc", "def"])).toBe("string");
  });
  it("rejects impossible dates", () => {
    expect(parseDateValue("31/02/2020", "dmy")).toBeNull();
    expect(parseDateValue("2020-02-29")?.hasTime).toBe(false);
  });
});

describe("missing values, uniqueness, duplicates", () => {
  it("honours the missing-value policy flags", () => {
    const values = ["a", "", "  ", "N/A", "none"];
    const strict = calculateMissingValues(values, "c", { markers: ["n/a"], treatEmptyAsMissing: true, treatWhitespaceOnlyAsMissing: false });
    expect(strict.missingCount).toBe(2);
    expect(strict.whitespaceOnlyCount).toBe(0);
    const defaults = calculateMissingValues(values, "c");
    expect(defaults.whitespaceOnlyCount).toBe(1);
    expect(defaults.missingCount).toBe(4);
  });
  it("computes unique/duplicate counts on non-missing values only", async () => {
    const { profile } = await profileCsv("c\nx\nN/A\nN/A\nx\ny\n");
    const c = profile.columnMetadata[0];
    expect(c.missingCount).toBe(2);
    expect(c.uniqueCount).toBe(2);
    expect(c.duplicateCount).toBe(1);
  });
  it("does not report different rows as duplicates (fingerprint collision)", () => {
    const stats = detectDuplicateRows([{ a: "x|b=>y", b: "" }, { a: "x", b: "y|b=>" }]);
    expect(stats.totalDuplicateRecords).toBe(0);
    expect(detectDuplicateRows([{ a: "1" }, { a: "1" }]).totalDuplicateRecords).toBe(1);
  });
});

describe("statistics", () => {
  it("does not throw on very large text columns", () => {
    const big = Array.from({ length: 200000 }, (_, i) => "v" + (i % 1000));
    const s = calculateTextStats(big);
    expect(s.minLength).toBeGreaterThan(0);
    expect(s.topValues).toHaveLength(5);
  });
  it("returns quartiles, outliers, histogram and no fake zeros", () => {
    const s = calculateNumericStats(["1", "2", "3", "4", "5", "6", "7", "8", "9", "100"]);
    expect(s.median).toBe(5.5);
    expect(s.q1).toBeCloseTo(3.25);
    expect(s.outlierCount).toBe(1);
    expect(s.histogram).toHaveLength(10);
    expect(calculateNumericStats(["abc"]).min).toBeUndefined();
  });
});

describe("end to end quality report", () => {
  it("reports ragged rows, invalid values, constant columns and overall score", async () => {
    const rows = ["id,qty,flag"];
    for (let i = 0; i < 30; i++) rows.push(`${i + 1},${i + 5},same`);
    rows.push("31,oops,same");
    rows.push("32,40");
    const { report, profile } = await profileCsv(rows.join("\n"));
    const types = report.issues.map((i) => i.type);
    expect(profile.inconsistentRowCount).toBe(1);
    expect(types).toContain("inconsistent_row_length");
    expect(types).toContain("invalid_values");
    expect(types).toContain("constant_column");
    expect(report.overallScore).toBeGreaterThan(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
  });
  it("emits only empty_column for a fully empty column", async () => {
    const { report } = await profileCsv("a,b\n1,\n2,\n");
    const forB = report.issues.filter((i) => i.columnName === "b").map((i) => i.type);
    expect(forB).toEqual(["empty_column"]);
  });
  it("async profiling matches sync profiling", async () => {
    const r = await parseCsvContent("a,b\n1,x\n2,y\n3,x\n");
    const input = { headers: r.headers, rows: r.rows, rowCount: r.rowCount, columnCount: r.columnCount, parsingErrors: [], parsingWarnings: [] };
    const a = profileDataset(input, "d");
    const b = await profileDatasetAsync(input, "d");
    expect(b.columnMetadata).toEqual(a.columnMetadata);
  });
});
