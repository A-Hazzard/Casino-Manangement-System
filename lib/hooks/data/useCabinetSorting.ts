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
  | 'lastOnline'
  | 'offlineTime';

type UseCabinetSortingProps = {
  filteredCabinets: Cabinet[];
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  /**
   * When true (default), use 50-item batch pagination (5 pages per batch).
   * When false, use simple global pagination over the entire dataset.
   */
  useBatchPagination?: boolean;
  /**
   * Optional total count of items from the backend.
   * If provided, used to calculate totalPages for global pagination.
   */
  totalCount?: number;
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
  setSortOption: (option: CabinetSortOption) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setCurrentPage: (page: number) => void;
  transformCabinet: (cabinet: Cabinet) => ReturnType<typeof mapToCabinetProps>;
};

export const useCabinetSorting = ({
  filteredCabinets,
  itemsPerPage = 20,
  useBatchPagination = true,
  totalCount,
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

      // Special handling for offlineTime sorting
      if (sortOption === 'offlineTime') {
        const now = Date.now();
        const threeMinutesAgo = now - 3 * 60 * 1000;

        // Determine if machines are online
        // Use backend provided 'online' flag if available, otherwise calculate
        const firstLastActivity = firstCabinet.lastActivity || firstCabinet.lastOnline;
        const secondLastActivity = secondCabinet.lastActivity || secondCabinet.lastOnline;

        const firstIsOnline = firstCabinet.online !== undefined ? firstCabinet.online : (
          firstLastActivity &&
          new Date(firstLastActivity).getTime() > threeMinutesAgo
        );
        const secondIsOnline = secondCabinet.online !== undefined ? secondCabinet.online : (
          secondLastActivity &&
          new Date(secondLastActivity).getTime() > threeMinutesAgo
        );

        // If both online or both offline, compare by offline time
        if (firstIsOnline && secondIsOnline) {
          return 0; // Both online, maintain order
        }
        if (!firstIsOnline && !secondIsOnline) {
          // Both offline, compare by time offline (older lastActivity = longer offline)
          const firstTime = firstLastActivity ? new Date(firstLastActivity).getTime() : 0;
          const secondTime = secondLastActivity ? new Date(secondLastActivity).getTime() : 0;

          // Always push "Never Online" (0) to the bottom
          if (firstTime === 0 && secondTime > 0) return 1;
          if (firstTime > 0 && secondTime === 0) return -1;
          if (firstTime === 0 && secondTime === 0) return 0;

          // Lower timestamp = longer offline time
          // For 'desc' (Longest First): we want lower timestamps first, so reverse the comparison
          return (firstTime < secondTime ? 1 : -1) * orderMultiplier;
        }
        // One online, one offline - offline machines come first when sorting by offline time
        return firstIsOnline ? 1 : -1;
      }

      // Standard sorting for other options
      const firstValue = firstCabinet[sortOption] || 0;
      const secondValue = secondCabinet[sortOption] || 0;

      return (firstValue > secondValue ? 1 : -1) * orderMultiplier;
    });

    console.warn('Sorted cabinets result:', sorted.length);
    return sorted;
  }, [filteredCabinets, sortOption, sortOrder]);

  // Paginate sorted cabinets - slice from the current batch (100 items)
  const paginatedCabinets = useMemo(() => {
    if (useBatchPagination) {
      // Batch mode: 100-item batches, 5 pages per batch (used by cabinets page)
      const pagesPerBatch = 5; // 100 items / 20 items per page = 5 pages
      const positionInBatch = (currentPage % pagesPerBatch) * itemsPerPage;
      const startIndex = positionInBatch;
      const endIndex = startIndex + itemsPerPage;
      const paginated = sortedCabinets.slice(startIndex, endIndex);

      console.warn('Paginated cabinets (batched mode):', {
        currentPage,
        itemsPerPage,
        positionInBatch,
        startIndex,
        endIndex,
        totalItemsInBatch: sortedCabinets.length,
        paginatedItems: paginated.length,
      });

      return paginated;
    }

    // Simple mode: standard global pagination over all sorted cabinets
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = sortedCabinets.slice(startIndex, endIndex);

    console.warn('Paginated cabinets (simple mode):', {
      currentPage,
      itemsPerPage,
      startIndex,
      endIndex,
      totalItems: sortedCabinets.length,
      paginatedItems: paginated.length,
    });

    return paginated;
  }, [sortedCabinets, currentPage, itemsPerPage, useBatchPagination]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    if (totalCount !== undefined) {
      // If we have a backend totalCount, use it for global total pages
      const total = Math.max(
        1,
        Math.ceil(totalCount / itemsPerPage)
      );
      console.warn(
        'Total pages calculated (from backend totalCount):',
        total,
        'for total database items:',
        totalCount
      );
      return total;
    }

    if (useBatchPagination) {
      // Batched mode: each batch shows its available pages (e.g. 50 items / 10 per page = 5 pages)
      // As more data is accumulated, the total pages grow.
      const totalLoadedPages = Math.ceil(sortedCabinets.length / itemsPerPage);
      const total = totalLoadedPages > 0 ? totalLoadedPages : 1;

      console.warn(
        'Total pages calculated (batched mode):',
        total,
        'for accumulated',
        sortedCabinets.length,
        'items'
      );
      return total;
    }

    // Simple mode: total pages based on full dataset
    const total = Math.max(
      1,
      Math.ceil(sortedCabinets.length / itemsPerPage)
    );
    console.warn(
      'Total pages calculated (simple mode):',
      total,
      'for dataset with',
      sortedCabinets.length,
      'items'
    );
    return total;
  }, [sortedCabinets.length, itemsPerPage, useBatchPagination]);

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
    setSortOption,
    setSortOrder,
    setCurrentPage,
    transformCabinet,
  };
};

