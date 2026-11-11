import { describe, it, expect } from "vitest";
import { parseCsvContent, parseCsvFile, validateFile, detectDelimiter } from "@/lib/csv/csvParser";

describe("parser", () => {
  it("content basic", async () => {
    const r = await parseCsvContent("a,b\n1,2\n3,4\n");
    expect(r.headers).toEqual(["a", "b"]);
    expect(r.rows).toEqual([{ a: "1", b: "2" }, { a: "3", b: "4" }]);
  });
  it("file basic + bom + semicolon", async () => {
    const r = await parseCsvFile(new File(["\uFEFFa;b\n1;2\n"], "t.csv"));
    expect(r.headers).toEqual(["a", "b"]);
    expect(r.hasBom).toBe(true);
    expect(r.delimiter).toBe(";");
  });
  it("ragged", async () => {
    const r = await parseCsvFile(new File(["a,b,c\n1,2\n3,4,5,6\n7,8,9\n"], "t.csv"));
    expect(r.rowCount).toBe(3);
    expect(r.warnings.map((w) => w.rowNumber)).toEqual([2, 3]);
    expect(r.rows[0]).toEqual({ a: "1", b: "2", c: "" });
    expect(Object.keys(r.rows[1])).toEqual(["a", "b", "c"]);
  });
  it("dup + empty headers", async () => {
    const r = await parseCsvFile(new File(["a,a,\n1,2,3\n"], "t.csv"));
    expect(r.headers).toEqual(["a", "a_1", "column_3"]);
    expect(r.warnings.length).toBe(2);
  });
  it("truncation exact", async () => {
    const csv = "a\n1\n2\n3\n";
    expect((await parseCsvContent(csv, { maxRecords: 3 })).truncated).toBe(false);
    const t = await parseCsvContent(csv, { maxRecords: 2 });
    expect(t.truncated).toBe(true);
    expect(t.rowCount).toBe(2);
  });
  it("windows-1256", async () => {
    // "سلام" in windows-1256
    const bytes = new Uint8Array([0x6e, 0x0a, 0xd3, 0xe1, 0xc7, 0xe3]);
    const r = await parseCsvFile(new File([bytes], "t.csv"));
    expect(r.encoding).toBe("windows-1256");
    expect(r.rows[0].n).toBe("سلام");
  });
  it("no ext + hasHeader false", async () => {
    expect(validateFile(new File(["x"], "data")).error).toContain("(none)");
    const r = await parseCsvContent("1,2\n3,4", { hasHeader: false });
    expect(r.headers).toEqual(["column_1", "column_2"]);
    expect(r.rows[1]).toEqual({ column_1: "3", column_2: "4" });
  });
  it("delimiter consistency", () => {
    expect(detectDelimiter("a;b;c\n1;x,y,z,w;3\n4;5;6")).toBe(";");
  });
});
