export interface DuplicateStats {
  totalDuplicateRecords: number;
  uniqueRecords: number;
  duplicatePercentage: number;
}

/**
 * Builds an unambiguous key for a row: the JSON encoding of its values in column order.
 * (A delimiter-joined string can collide when values contain the delimiter.)
 */
export function calculateFingerprint(
  row: Record<string, string>,
  keys: string[] = Object.keys(row)
): string {
  const values = new Array<string>(keys.length);
  for (let i = 0; i < keys.length; i++) {
    values[i] = row[keys[i]] ?? "";
  }
  return JSON.stringify(values);
}

export function detectDuplicateRows(
  rows: Array<Record<string, string>>,
  headers?: string[]
): DuplicateStats {
  const keys = headers ?? (rows.length > 0 ? Object.keys(rows[0]) : []);
  const seen = new Set<string>();
  let duplicateCount = 0;

  for (const row of rows) {
    const fp = calculateFingerprint(row, keys);
    if (seen.has(fp)) {
      duplicateCount++;
    } else {
      seen.add(fp);
    }
  }

  const totalRecords = rows.length;
  const duplicatePercentage =
    totalRecords > 0 ? (duplicateCount / totalRecords) * 100 : 0;

  return {
    totalDuplicateRecords: duplicateCount,
    uniqueRecords: seen.size,
    duplicatePercentage,
  };
}

export function findDuplicateColumns(
  headers: string[]
): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const header of headers) {
    counts.set(header, (counts.get(header) ?? 0) + 1);
  }

  const duplicates: Array<{ name: string; count: number }> = [];
  for (const [name, count] of counts) {
    if (count > 1) {
      duplicates.push({ name, count });
    }
  }
  return duplicates;
}
