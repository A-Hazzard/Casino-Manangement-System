/**
 * Location Pagination Types
 * Types for location list pagination functionality.
 *
 * Manages pagination state and navigation controls for location
 * listings with first/last/prev/next page handlers.
 */
export type UseLocationPaginationProps = {
  totalPages: number;
  initialPage?: number;
};

export type UseLocationPaginationReturn = {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  handleFirstPage: () => void;
  handleLastPage: () => void;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  resetToFirstPage: () => void;
};
