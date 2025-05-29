import { Button } from "@/components/ui/button";
import {
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@radix-ui/react-icons";

type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage?: number; // Optional, for future use if needed elsewhere
  totalItems?: number; // Optional, for future use if needed elsewhere
};

export default function PaginationControls({
  currentPage,
  totalPages,
  setCurrentPage,
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null; // Don't render pagination if there's only one page or less
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

  return (
    <div className="flex justify-center items-center space-x-2 mt-8">
      <Button
        onClick={() => handlePageChange(0)}
        disabled={currentPage === 0}
        className="p-2 bg-gray-200 hover:bg-gray-300 text-black disabled:opacity-50"
        aria-label="Go to first page"
      >
        <DoubleArrowLeftIcon className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className="p-2 bg-gray-200 hover:bg-gray-300 text-black disabled:opacity-50"
        aria-label="Go to previous page"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </Button>
      <span className="text-gray-700 text-sm">Page</span>
      <input
        type="number"
        min={1}
        max={totalPages}
        value={currentPage + 1}
        onChange={handleInputChange}
        className="w-12 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-1 focus:ring-buttonActive focus:border-buttonActive"
        aria-label="Page number"
      />
      <span className="text-gray-700 text-sm">of {totalPages}</span>
      <Button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1}
        className="p-2 bg-gray-200 hover:bg-gray-300 text-black disabled:opacity-50"
        aria-label="Go to next page"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => handlePageChange(totalPages - 1)}
        disabled={currentPage === totalPages - 1}
        className="p-2 bg-gray-200 hover:bg-gray-300 text-black disabled:opacity-50"
        aria-label="Go to last page"
      >
        <DoubleArrowRightIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
