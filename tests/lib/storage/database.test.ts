import { describe, it, expect } from "vitest";
import { isIndexedDBAvailable } from "@/lib/storage/database";

describe("storage - database", () => {
  it("reports IndexedDB availability", () => {
    const available = isIndexedDBAvailable();
    expect(typeof available).toBe("boolean");
  });
});
