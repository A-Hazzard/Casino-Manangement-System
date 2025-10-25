/**
 * Custom hook for managing cabinet sorting and pagination
 * Handles sort state, pagination logic, and data transformation
 */

import { useState, useMemo, useCallback } from 'react';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { mapToCabinetProps } from '@/lib/utils/cabinet';

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

  // Paginate sorted cabinets
  const paginatedCabinets = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = sortedCabinets.slice(startIndex, endIndex);

    console.warn('Paginated cabinets:', {
      currentPage,
      itemsPerPage,
      startIndex,
      endIndex,
      totalItems: sortedCabinets.length,
      paginatedItems: paginated.length,
    });

    return paginated;
  }, [sortedCabinets, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    const total = Math.ceil(sortedCabinets.length / itemsPerPage);
    console.warn(
      'Total pages calculated:',
      total,
      'for',
      sortedCabinets.length,
      'items'
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
