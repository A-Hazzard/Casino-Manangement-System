/**
 * Pagination Controls Component
 * First, previous, direct page input, next, last.
 *
 * Layout: <<  <  [input]  of N  >  >>
 */
import { cn } from '@/lib/utils';
import { useState, useEffect, KeyboardEvent } from 'react';
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
  isLoadingPage,
  hasMore = false,
}: PaginationControlsProps) {
  // ============================================================================
  // State
  // ============================================================================
  const [inputValue, setInputValue] = useState(String(currentPage + 1));

  // ============================================================================
  // Computed
  // ============================================================================
  const knownTotal = totalPages ?? 0;
  const totalIsKnown = totalPages !== null;

  // hasMore overrides the totalPages boundary — more batches exist beyond the
  // current rolling estimate, so navigation must not be capped at knownTotal-1.
  const isAtHardEnd = totalIsKnown && !hasMore && currentPage >= knownTotal - 1;

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    setInputValue(String(currentPage + 1));
  }, [currentPage]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handlePageChange = (page: number) => {
    if (page >= 0 && (!totalIsKnown || hasMore || page < knownTotal)) {
      setCurrentPage(page);
    }
  };

  const handleInputBlur = () => {
    let val = Number(inputValue);
    if (isNaN(val) || val < 1) val = 1;
    if (totalIsKnown && val > knownTotal) val = knownTotal;
    handlePageChange(val - 1);
    setInputValue(String(val));
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  // ============================================================================
  // Computed
  // ============================================================================
  const navButtonClass =
    'border-button bg-white p-2 text-button hover:bg-button/10 disabled:border-gray-300 disabled:text-gray-400 disabled:opacity-50';

  if (totalIsKnown && knownTotal <= 0) {
    return null;
  }

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div
      className={cn(
        'mt-4 flex w-full flex-col items-center gap-4 py-3 sm:px-6',
        className
      )}
    >
      {/* Page info — always shown */}
      <div className="text-sm font-medium italic text-gray-500">
        Page {currentPage + 1}{totalIsKnown ? ` of ${knownTotal}` : ''}
        {showTotalCount && totalCount != null && (
          <> ({totalCount} total items)</>
        )}
      </div>

      {/* Navigation controls */}
      <div className="flex h-12 w-full items-center justify-center border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-1">
          {/* First page */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(0)}
            disabled={currentPage === 0 || isLoadingPage}
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
            disabled={currentPage === 0 || isLoadingPage}
            className={navButtonClass}
            aria-label="Go to previous page"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>

          {/* Page input — only shown when total is known */}
          {totalIsKnown && (
            <div className="flex items-center gap-1 px-1">
              <input
                type="number"
                min={1}
                max={knownTotal}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onBlur={handleInputBlur}
                disabled={isLoadingPage}
                className="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm text-gray-700 focus:border-buttonActive focus:outline-none focus:ring-1 focus:ring-buttonActive disabled:opacity-50"
                aria-label="Page number"
              />
              <span className="ml-1 text-sm text-gray-500">of {knownTotal}</span>
            </div>
          )}

          {/* Next page */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={isAtHardEnd || isLoadingPage}
            className={navButtonClass}
            aria-label="Go to next page"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>

          {/* Last page — hidden when at the final page, shown for rolling estimates */}
          {totalIsKnown && !isAtHardEnd && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(knownTotal - 1)}
              disabled={isLoadingPage}
              className={navButtonClass}
              aria-label="Go to last page"
            >
              <DoubleArrowRightIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
