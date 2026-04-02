/**
 * Pagination Controls Component
 * Minimal pagination controls: first, previous, page input, next, last.
 *
 * Layout: <<  <  [x] of y  >  >>
 *
 * @param currentPage - Current page index (0-based)
 * @param totalPages - Total number of pages
 * @param setCurrentPage - Callback to change current page
 */
import { cn } from '@/lib/utils';
import { ChangeEvent } from 'react';
import { Button } from '@/components/shared/ui/button';
import type { PaginationControlsProps } from '@/lib/types/components';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    DoubleArrowLeftIcon,
    DoubleArrowRightIcon,
} from '@radix-ui/react-icons';

export default function PaginationControls({
  currentPage,
  totalPages,
  setCurrentPage,
  totalCount,
  showTotalCount = false,
  className,
}: PaginationControlsProps) {
  // Standard rule: hide if 20 or fewer items total
  if (totalCount !== undefined && totalCount <= 20) {
    return null;
  }

  if (totalPages <= 1) {
    return null;
  }

  const handlePageChange = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    let val = Number(e.target.value);
    if (isNaN(val)) val = 1;
    if (val < 1) val = 1;
    if (val > totalPages) val = totalPages;
    setCurrentPage(val - 1);
  };

  const navButtonClass =
    'border-button bg-white p-2 text-button hover:bg-button/10 disabled:border-gray-300 disabled:text-gray-400 disabled:opacity-50';

  return (
    <div className={cn("mt-4 flex flex-col items-center gap-4 py-3 sm:px-6 w-full", className)}>
      {showTotalCount && totalCount !== undefined && (
        <div className="text-sm text-gray-500 font-medium italic">
          Page {currentPage + 1} of {totalPages} ({totalCount} total items)
        </div>
      )}
      
      <div className="flex h-12 w-full items-center justify-center border-t border-gray-200 bg-white px-4 py-3">
        {/* Navigation controls — shared for both mobile and desktop */}
        <div className="flex items-center gap-1">
          {/* First page */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(0)}
            disabled={currentPage === 0}
            className={navButtonClass}
            aria-label="Go to first page"
          >
            <DoubleArrowLeftIcon className="h-4 w-4" />
          </Button>

          {/* Previous page */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className={navButtonClass}
            aria-label="Go to previous page"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>

          {/* Page input */}
          <div className="flex items-center gap-1.5 px-1">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage + 1}
              onChange={handleInputChange}
              className="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm text-gray-700 focus:border-buttonActive focus:outline-none focus:ring-1 focus:ring-buttonActive"
              aria-label="Page number"
            />
            <span className="text-sm text-gray-500">of {totalPages}</span>
          </div>

          {/* Next page */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className={navButtonClass}
            aria-label="Go to next page"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>

          {/* Last page */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(totalPages - 1)}
            disabled={currentPage >= totalPages - 1}
            className={navButtonClass}
            aria-label="Go to last page"
          >
            <DoubleArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
