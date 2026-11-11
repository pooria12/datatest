import { describe, it, expect } from "vitest";
import { profileDataset } from "@/lib/profiling/profilingEngine";
import { calculateMissingValues } from "@/lib/profiling/missingValues";
import { detectDuplicateRows } from "@/lib/profiling/duplicates";
import { DEFAULT_MISSING_VALUE_POLICY } from "@/types/dataset.types";

describe("profilingEngine - profileDataset", () => {
  it("profiles a simple dataset with typed columns", () => {
    const input = {
      headers: ["name", "age", "score"],
      rows: [
        { name: "Alice", age: "30", score: "95.5" },
        { name: "Bob", age: "25", score: "87.0" },
        { name: "Charlie", age: "35", score: "" },
      ],
      rowCount: 3,
      columnCount: 3,
      parsingErrors: [],
      parsingWarnings: [],
    };

    const profile = profileDataset(input, "ds-test");

    expect(profile.totalRecords).toBe(3);
    expect(profile.totalColumns).toBe(3);
    expect(profile.columnMetadata).toHaveLength(3);

    const ageCol = profile.columnMetadata.find((c) => c.name === "age");
    expect(ageCol?.dataType).toBe("integer");
    expect(ageCol?.missingCount).toBe(0);

    const scoreCol = profile.columnMetadata.find((c) => c.name === "score");
    expect(scoreCol?.dataType).toBe("decimal");
    expect(scoreCol?.missingCount).toBe(1);
    expect(scoreCol?.missingPercentage).toBe(33.33333333333333);
  });

  it("detects empty columns", () => {
    const input = {
      headers: ["empty_col"],
      rows: [{ empty_col: "" }, { empty_col: "" }],
      rowCount: 2,
      columnCount: 1,
      parsingErrors: [],
      parsingWarnings: [],
    };

    const profile = profileDataset(input, "ds-test");
    const col = profile.columnMetadata[0];
    expect(col.dataType).toBe("empty");
    expect(col.missingCount).toBe(2);
  });
});

describe("profiling - calculateMissingValues", () => {
  it("counts missing values correctly", () => {
    const stats = calculateMissingValues(
      ["hello", "", "null", "  ", "world"],
      "test_col",
      DEFAULT_MISSING_VALUE_POLICY
    );

    expect(stats.missingCount).toBe(3);
    expect(stats.missingPercentage).toBe(60);
  });

  it("returns zero for no missing values", () => {
    const stats = calculateMissingValues(["a", "b", "c"], "test_col");
    expect(stats.missingCount).toBe(0);
    expect(stats.missingPercentage).toBe(0);
  });
});

describe("profiling - detectDuplicateRows", () => {
  it("detects duplicate rows", () => {
    const rows = [
      { a: "1", b: "x" },
      { a: "2", b: "y" },
      { a: "1", b: "x" },
    ];

    const stats = detectDuplicateRows(rows);
    expect(stats.totalDuplicateRecords).toBe(1);
    expect(stats.uniqueRecords).toBe(2);
    expect(stats.duplicatePercentage).toBe(33.33333333333333);
  });

  it("returns zero for no duplicates", () => {
    const rows = [{ a: "1" }, { a: "2" }, { a: "3" }];
    const stats = detectDuplicateRows(rows);
    expect(stats.totalDuplicateRecords).toBe(0);
    expect(stats.uniqueRecords).toBe(3);
  });
});
