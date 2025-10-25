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
