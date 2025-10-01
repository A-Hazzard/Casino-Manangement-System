/**
 * Custom hook for managing location pagination logic
 * Handles pagination state, navigation, and page management
 */

import { useState, useCallback } from "react";

interface UseLocationPaginationProps {
  totalPages: number;
  initialPage?: number;
}

interface UseLocationPaginationReturn {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  handleFirstPage: () => void;
  handleLastPage: () => void;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  resetToFirstPage: () => void;
}

export function useLocationPagination({
  totalPages,
  initialPage = 0,
}: UseLocationPaginationProps): UseLocationPaginationReturn {
  const [currentPage, setCurrentPage] = useState(initialPage);

  // Navigation handlers
  const handleFirstPage = useCallback(() => {
    setCurrentPage(0);
  }, []);

  const handleLastPage = useCallback(() => {
    setCurrentPage(totalPages - 1);
  }, [totalPages]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);

  // Utility functions
  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  const resetToFirstPage = useCallback(() => {
    setCurrentPage(0);
  }, []);

  return {
    currentPage,
    setCurrentPage,
    handleFirstPage,
    handleLastPage,
    handlePrevPage,
    handleNextPage,
    canGoPrevious,
    canGoNext,
    resetToFirstPage,
  };
}
