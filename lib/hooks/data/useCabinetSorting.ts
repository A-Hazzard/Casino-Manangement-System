/**
 * Custom hook for managing cabinet sorting and pagination
 * Handles sort state, pagination logic, and data transformation
 */

import { mapToCabinetProps } from '@/lib/utils/cabinet';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { useCallback, useMemo, useState } from 'react';

export type CabinetSortOption =
  | 'assetNumber'
  | 'locationName'
  | 'moneyIn'
  | 'moneyOut'
  | 'jackpot'
  | 'gross'
  | 'cancelledCredits'
  | 'game'
  | 'smbId'
  | 'serialNumber'
  | 'lastOnline';

type UseCabinetSortingProps = {
  filteredCabinets: Cabinet[];
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
};

type UseCabinetSortingReturn = {
  sortOrder: 'asc' | 'desc';
  sortOption: CabinetSortOption;
  currentPage: number;
  sortedCabinets: Cabinet[];
  paginatedCabinets: Cabinet[];
  totalPages: number;
  handleSortToggle: () => void;
  handleColumnSort: (column: CabinetSortOption) => void;
  setCurrentPage: (page: number) => void;
  transformCabinet: (cabinet: Cabinet) => ReturnType<typeof mapToCabinetProps>;
};

export const useCabinetSorting = ({
  filteredCabinets,
  itemsPerPage = 10,
}: UseCabinetSortingProps): UseCabinetSortingReturn => {
  // Sort state management
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortOption, setSortOption] = useState<CabinetSortOption>('moneyIn');
  const [currentPage, setCurrentPage] = useState(0);

  // Sort toggle handler
  const handleSortToggle = useCallback(() => {
    console.warn(
      'Toggling sort order from',
      sortOrder,
      'to',
      sortOrder === 'desc' ? 'asc' : 'desc'
    );
    setSortOrder(previousOrder => (previousOrder === 'desc' ? 'asc' : 'desc'));
  }, [sortOrder]);

  // Column sort handler
  const handleColumnSort = useCallback(
    (column: CabinetSortOption) => {
      console.warn('Sorting by column:', column, 'current option:', sortOption);

      if (sortOption === column) {
        handleSortToggle();
      } else {
        setSortOption(column);
        setSortOrder('desc');
        console.warn('New sort option:', column, 'order: desc');
      }
    },
    [sortOption, handleSortToggle]
  );

  // Sort cabinets based on current sort option and order
  const sortedCabinets = useMemo(() => {
    console.warn('Sorting cabinets:', {
      totalCabinets: filteredCabinets.length,
      sortOption,
      sortOrder,
    });

    const sorted = [...filteredCabinets].sort((firstCabinet, secondCabinet) => {
      const orderMultiplier = sortOrder === 'desc' ? -1 : 1;
      const firstValue = firstCabinet[sortOption] || 0;
      const secondValue = secondCabinet[sortOption] || 0;

      return (firstValue > secondValue ? 1 : -1) * orderMultiplier;
    });

    console.warn('Sorted cabinets result:', sorted.length);
    return sorted;
  }, [filteredCabinets, sortOption, sortOrder]);

  // Paginate sorted cabinets - slice from the current batch (50 items)
  const paginatedCabinets = useMemo(() => {
    // Calculate which items to show from the current batch (10 items per page from 50-item batch)
    const positionInBatch = (currentPage % 5) * itemsPerPage;
    const startIndex = positionInBatch;
    const endIndex = startIndex + itemsPerPage;
    const paginated = sortedCabinets.slice(startIndex, endIndex);

    console.warn('Paginated cabinets:', {
      currentPage,
      itemsPerPage,
      positionInBatch,
      startIndex,
      endIndex,
      totalItemsInBatch: sortedCabinets.length,
      paginatedItems: paginated.length,
    });

    return paginated;
  }, [sortedCabinets, currentPage, itemsPerPage]);

  // Calculate total pages based on current batch size (50 items = 5 pages)
  // Each batch has 50 items, which equals 5 pages of 10 items each
  const totalPages = useMemo(() => {
    // For the current batch, we always have 5 pages (50 items / 10 per page)
    // But if we have fewer items than a full batch, calculate based on actual items
    const pagesInCurrentBatch = Math.min(
      5,
      Math.ceil(sortedCabinets.length / itemsPerPage)
    );
    const total = pagesInCurrentBatch > 0 ? pagesInCurrentBatch : 1;
    console.warn(
      'Total pages calculated:',
      total,
      'for current batch with',
      sortedCabinets.length,
      'items (max 5 pages per batch)'
    );
    return total;
  }, [sortedCabinets.length, itemsPerPage]);

  // Cabinet transformation function
  const transformCabinet = useMemo(() => {
    return (cabinet: Cabinet) => {
      console.warn('Transforming cabinet for display:', cabinet._id);
      return mapToCabinetProps(cabinet);
    };
  }, []);

  return {
    // Sort state
    sortOrder,
    sortOption,
    currentPage,

    // Computed data
    sortedCabinets,
    paginatedCabinets,
    totalPages,

    // Actions
    handleSortToggle,
    handleColumnSort,
    setCurrentPage,
    transformCabinet,
  };
};
