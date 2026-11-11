import { ReactNode } from 'react';
import { cn } from '@lib/utils';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyAccessor: (row: T) => string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
}

function TableHeaderCell<T>({ 
  column, 
  sortBy, 
  sortOrder, 
  onSort 
}: { 
  column: Column<T>; 
  sortBy?: string; 
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
}) {
  const isSorted = sortBy === column.key;
  
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider',
        'border-b border-border bg-muted/50',
        column.sortable && 'cursor-pointer select-none hover:bg-muted',
        column.align === 'center' && 'text-center',
        column.align === 'right' && 'text-right',
        column.className
      )}
      style={{ width: column.width }}
      onClick={column.sortable ? () => onSort?.(column.key) : undefined}
    >
      <div className="flex items-center gap-1">
        {column.header}
        {column.sortable && isSorted && (
          <span className="flex items-center">
            {sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </span>
        )}
        {column.sortable && !isSorted && (
          <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
        )}
      </div>
    </th>
  );
}

function TableBodyRow<T>({
  row,
  columns,
  onClick,
  striped,
  hoverable,
  rowIndex,
}: {
  row: T;
  columns: Column<T>[];
  onClick?: (row: T) => void;
  striped?: boolean;
  hoverable?: boolean;
  rowIndex: number;
}) {
  const isClickable = !!onClick;
  
  return (
    <tr
      className={cn(
        'border-b border-border',
        'transition-colors duration-100',
        striped && rowIndex % 2 === 1 && 'bg-muted/30',
        hoverable && !isClickable && 'hover:bg-muted/50',
        isClickable && 'cursor-pointer hover:bg-accent/5'
      )}
      onClick={() => onClick?.(row)}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => { if (isClickable && (e.key === 'Enter' || e.key === ' ')) onClick(row); }}
    >
      {columns.map((column) => (
        <td
          key={column.key}
          className={cn(
            'px-4 py-3 text-sm text-foreground',
            column.align === 'center' && 'text-center',
            column.align === 'right' && 'text-right',
            column.className
          )}
        >
          {column.accessor(row)}
        </td>
      ))}
    </tr>
  );
}

function TableSkeleton<T>({ columns, rows = 5 }: { columns: Column<T>[]; rows?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border animate-pulse">
          {columns.map((column) => (
            <td key={column.key} className="px-4 py-3">
              <div className="h-4 w-3/4 bg-muted rounded" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export function Table<T>({
  columns,
  data,
  keyAccessor,
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
  emptyMessage = 'No data available',
  loading = false,
  className,
  striped = true,
  hoverable = true,
}: TableProps<T>) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-lg border border-border', className)}>
      <table className="w-full caption-bottom text-sm" role="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <TableHeaderCell
                key={column.key}
                column={column}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            ))}
          </tr>
        </thead>
        {loading ? (
          <TableSkeleton columns={columns} />
        ) : data.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          </tbody>
        ) : (
          <tbody>
            {data.map((row, index) => (
              <TableBodyRow
                key={keyAccessor(row)}
                row={row}
                columns={columns}
                onClick={onRowClick}
                striped={striped}
                hoverable={hoverable}
                rowIndex={index}
              />
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}