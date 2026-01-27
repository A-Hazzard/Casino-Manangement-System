/**
 * Pagination Controls Component
 * Pagination controls with first, previous, next, last, and direct page input.
 *
 * Features:
 * - First, previous, next, last page buttons
 * - Direct page number input
 * - Page count display
 * - Responsive design (mobile and desktop)
 * - Disabled states for boundary pages
 * - Accessible navigation
 *
 * @param currentPage - Current page index (0-based)
 * @param totalPages - Total number of pages
 * @param setCurrentPage - Callback to change current page
 */
import { Button } from '@/components/shared/ui/button';
import {
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@radix-ui/react-icons';
import type { PaginationControlsProps } from '@/lib/types/components';

export default function PaginationControls({
  currentPage,
  totalPages,
  setCurrentPage,
  totalCount,
  limit = 20,
}: PaginationControlsProps) {
  if (totalPages <= 0) {
    return null; // Don't render pagination if there are no pages
  }

  const handlePageChange = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = Number(e.target.value);
    if (isNaN(val)) val = 1;
    if (val < 1) val = 1;
    if (val > totalPages) val = totalPages;
    setCurrentPage(val - 1);
  };

  const startItem = currentPage * limit + 1;
  const endItem = Math.min((currentPage + 1) * limit, totalCount || 0);

  return (
    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
      {totalCount !== undefined && (
        <div className="text-sm text-gray-600">
          Showing <span className="font-medium text-gray-900">{startItem}</span>{' '}
          to <span className="font-medium text-gray-900">{endItem}</span> of{' '}
          <span className="font-medium text-gray-900">{totalCount}</span>{' '}
          results
        </div>
      )}

      {/* Mobile Pagination */}
      <div className="flex w-full flex-col space-y-3 sm:hidden">
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(0)}
            disabled={currentPage === 0}
            className="px-2 py-1 text-xs"
            aria-label="Go to first page"
          >
            ««
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className="px-2 py-1 text-xs"
            aria-label="Go to previous page"
          >
            ‹
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-600">Page</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage + 1}
              onChange={handleInputChange}
              className="w-12 rounded border border-gray-300 px-1 py-1 text-center text-xs text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
              aria-label="Page number"
            />
            <span className="text-xs text-gray-600">of {totalPages}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className="px-2 py-1 text-xs"
            aria-label="Go to next page"
          >
            ›
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages - 1)}
            disabled={currentPage >= totalPages - 1}
            className="px-2 py-1 text-xs"
            aria-label="Go to last page"
          >
            »»
          </Button>
        </div>
      </div>

      {/* Desktop Pagination */}
      <div className="hidden items-center justify-center space-x-2 sm:flex">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(0)}
          disabled={currentPage === 0}
          className="border-button bg-white p-2 text-button hover:bg-button/10 disabled:border-gray-300 disabled:text-gray-400 disabled:opacity-50"
          aria-label="Go to first page"
        >
          <DoubleArrowLeftIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="border-button bg-white p-2 text-button hover:bg-button/10 disabled:border-gray-300 disabled:text-gray-400 disabled:opacity-50"
          aria-label="Go to previous page"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage + 1}
            onChange={handleInputChange}
            className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
            aria-label="Page number"
          />
          <span className="text-sm text-gray-700">of {totalPages}</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages - 1}
          className="border-button bg-white p-2 text-button hover:bg-button/10 disabled:border-gray-300 disabled:text-gray-400 disabled:opacity-50"
          aria-label="Go to next page"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(totalPages - 1)}
          disabled={currentPage === totalPages - 1}
          className="border-button bg-white p-2 text-button hover:bg-button/10 disabled:border-gray-300 disabled:text-gray-400 disabled:opacity-50"
          aria-label="Go to last page"
        >
          <DoubleArrowRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
