import { useState, useMemo, useCallback, useEffect } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, EyeOff } from "lucide-react";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import { Pagination } from "@components/ui/Pagination";
import { cn } from "@lib/utils";
import type { ColumnDataType } from "@/types/dataset.types";
import { isMissingValue, parseDateValue, parseNumber, detectDateOrder } from "@/lib/profiling/typeInference";

interface DatasetTableProps {
  columns: string[];
  rows: Array<Record<string, string>>;
  totalRecords: number;
  totalColumns: number;
  /** Inferred type per column name; used for type-aware sorting. */
  columnTypes?: Record<string, ColumnDataType>;
  /** Initial page size. */
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZES = [10, 25, 50, 100];

type SortDirection = "asc" | "desc";

/** Builds a comparable key for each row value so sorting follows the column's real type. */
function buildSortKeys(
  rows: Array<Record<string, string>>,
  column: string,
  type: ColumnDataType | undefined
): Array<number | string | null> {
  const values = rows.map((r) => r[column] ?? "");
  if (type === "integer" || type === "decimal") {
    return values.map((v) => parseNumber(v)?.value ?? null);
  }
  if (type === "date" || type === "datetime") {
    const order = detectDateOrder(values);
    return values.map((v) => parseDateValue(v, order)?.date.getTime() ?? null);
  }
  if (type === "boolean") {
    return values.map((v) => (isMissingValue(v) ? null : v.trim().toLowerCase()));
  }
  return values.map((v) => (isMissingValue(v) ? null : v.toLowerCase()));
}

export function DatasetTable({
  columns,
  rows,
  totalRecords,
  totalColumns,
  columnTypes,
  pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
  onPageChange,
  onPageSizeChange,
  className,
}: DatasetTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      columns.some((col) => (row[col] ?? "").toLowerCase().includes(query))
    );
  }, [rows, columns, searchQuery]);

  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows;
    const keys = buildSortKeys(filteredRows, sortColumn, columnTypes?.[sortColumn]);
    const order = filteredRows.map((_, i) => i);
    const factor = sortDirection === "asc" ? 1 : -1;
    order.sort((a, b) => {
      const ka = keys[a];
      const kb = keys[b];
      // Missing/unparsable values always go last, whatever the direction.
      if (ka === null && kb === null) return a - b;
      if (ka === null) return 1;
      if (kb === null) return -1;
      if (typeof ka === "number" && typeof kb === "number") {
        return ka === kb ? a - b : (ka - kb) * factor;
      }
      const cmp = String(ka).localeCompare(String(kb), undefined, { numeric: true });
      return cmp === 0 ? a - b : cmp * factor;
    });
    return order.map((i) => filteredRows[i]);
  }, [filteredRows, sortColumn, sortDirection, columnTypes]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));

  // Keep the page in range when the data, filter or page size changes.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, safePage, pageSize]);

  const handleSort = useCallback(
    (col: string) => {
      if (sortColumn === col) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortColumn(col);
        setSortDirection("asc");
      }
    },
    [sortColumn]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      onPageChange?.(page);
    },
    [onPageChange]
  );

  const handlePageSizeChange = useCallback(
    (size: number) => {
      setPageSize(size);
      setCurrentPage(1);
      onPageSizeChange?.(size);
    },
    [onPageSizeChange]
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setCurrentPage(1);
  }, []);

  const ariaSort = (col: string): "ascending" | "descending" | "none" =>
    sortColumn === col ? (sortDirection === "asc" ? "ascending" : "descending") : "none";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {totalRecords.toLocaleString()} records × {totalColumns} columns
          {searchQuery.trim() && (
            <>
              {" "}
              • <span className="font-medium text-foreground">{filteredRows.length.toLocaleString()}</span>{" "}
              {filteredRows.length === 1 ? "match" : "matches"}
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search records…"
            aria-label="Search records"
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full sm:w-64"
          />
          {searchQuery && (
            <Button variant="outline" size="sm" onClick={handleClearSearch}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm" aria-label="Dataset records">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th
                scope="col"
                className="w-8 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  scope="col"
                  aria-sort={ariaSort(col)}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground",
                    sortColumn === col && "bg-primary/10 text-primary"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(col)}
                    className="flex items-center gap-1 rounded uppercase tracking-wider transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {col}
                    {sortColumn === col ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <ArrowDown className="h-3 w-3" aria-hidden="true" />
                      )
                    ) : (
                      <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" aria-hidden="true" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-muted-foreground">
                  {searchQuery ? "No matching records found" : "No data available"}
                </td>
              </tr>
            )}
            {paginatedRows.map((row, rowIndex) => {
              const globalIndex = (safePage - 1) * pageSize + rowIndex + 1;
              return (
                <tr
                  key={globalIndex}
                  className={cn(
                    "border-b border-border transition-colors hover:bg-muted/30",
                    globalIndex % 2 === 0 && "bg-muted/10"
                  )}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{globalIndex}</td>
                  {columns.map((col) => {
                    const val = row[col];
                    const missing = isMissingValue(val);
                    return (
                      <td
                        key={col}
                        dir="auto"
                        className={cn("px-4 py-3 text-sm", missing && "italic text-muted-foreground/50")}
                      >
                        {missing ? (
                          <span className="flex items-center gap-1" title="Missing value">
                            <EyeOff className="h-3 w-3" aria-hidden="true" />
                            <span className="text-xs">—</span>
                          </span>
                        ) : (
                          <span className="block max-w-xs truncate" title={val}>
                            {val}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        totalItems={sortedRows.length}
        showPageSizes
        pageSizes={PAGE_SIZES}
      />
    </div>
  );
}
