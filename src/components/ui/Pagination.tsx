import { cn } from '@lib/utils';
import { Select } from './Select';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showPageSizes?: boolean;
  pageSizes?: number[];
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  totalItems?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showPageSizes = false,
  pageSizes = [10, 25, 50, 100],
  pageSize,
  onPageSizeChange,
  totalItems,
}: PaginationProps) {
  const pages = getPageNumbers(currentPage, totalPages);
  
  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-border', className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {totalItems !== undefined && (
          <span>
            {totalItems === 0 ? (
              'No results'
            ) : (
              <>
                Showing <span className="font-medium">{(currentPage - 1) * (pageSize || 10) + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * (pageSize || 10), totalItems)}</span> of{' '}
                <span className="font-medium">{totalItems.toLocaleString()}</span> results
              </>
            )}
          </span>
        )}
        {showPageSizes && pageSize && onPageSizeChange && (
          <Select
            value={pageSize.toString()}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            options={pageSizes.map((size) => ({ value: size.toString(), label: size.toString() }))}
            className="w-auto"
          />
        )}
      </div>
      
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={cn('p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:pointer-events-none', 'transition-colors')}
          aria-label="First page"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 18l-6-6 6-6" />
            <path d="M6 18l6-6-6-6" />
          </svg>
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn('p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:pointer-events-none', 'transition-colors')}
          aria-label="Previous page"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        
        <div className="flex items-center gap-1 mx-1">
          {pages.map((page, index) => (
            <button
              key={page === '...' ? `ellipsis-${index}` : page}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={page === '...'}
              className={cn(
                'min-w-[36px] h-8 rounded-md text-sm font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                page === '...'
                  ? 'text-muted-foreground pointer-events-none'
                  : page === currentPage
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'text-foreground hover:bg-muted'
              )}
              aria-label={page === '...' ? undefined : `Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn('p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:pointer-events-none', 'transition-colors')}
          aria-label="Next page"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={cn('p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:pointer-events-none', 'transition-colors')}
          aria-label="Last page"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 18l6-6-6-6" />
            <path d="M18 18l-6-6 6-6" />
          </svg>
        </button>
      </nav>
    </div>
  );
}

function getPageNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  
  if (currentPage <= 3) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }
  
  if (currentPage >= totalPages - 2) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  
  return [
    1,
    '...',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    '...',
    totalPages,
  ];
}