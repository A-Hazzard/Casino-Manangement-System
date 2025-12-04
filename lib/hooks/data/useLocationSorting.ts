/**
 * Custom hook for managing location sorting and filtering logic
 * Extracts complex sorting logic from the Locations page
 */

import { useState, useEffect, useMemo } from 'react';
import { AggregatedLocation } from '@/shared/types/common';
import { LocationSortOption } from '@/lib/types/location';

type UseLocationSortingProps = {
  locationData: AggregatedLocation[];
  currentPage?: number;
  totalCount?: number;
  itemsPerPage?: number;
};

type UseLocationSortingReturn = {
  filtered: AggregatedLocation[];
  sortedData: AggregatedLocation[];
  currentPage: number;
  sortOrder: 'asc' | 'desc';
  sortOption: LocationSortOption;
  sortedLocations: AggregatedLocation[];
  paginatedLocations: AggregatedLocation[];
  totalPages: number;
  setCurrentPage: (page: number) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setSortOption: (option: LocationSortOption) => void;
  handleSort: (option: LocationSortOption) => void;
  handleColumnSort: (option: LocationSortOption) => void;
  currentItems: AggregatedLocation[];
};

export function useLocationSorting({
  locationData,
  currentPage: externalCurrentPage = 0,
  totalCount,
  itemsPerPage: externalItemsPerPage = 10,
}: Omit<UseLocationSortingProps, 'selectedFilters'>): UseLocationSortingReturn {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortOption, setSortOption] = useState<LocationSortOption>('moneyIn');
  
  // Use external currentPage if provided, otherwise use internal state
  const [internalCurrentPage, setInternalCurrentPage] = useState(0);
  const currentPage = externalCurrentPage !== undefined ? externalCurrentPage : internalCurrentPage;
  const setCurrentPage = externalCurrentPage !== undefined ? () => {} : setInternalCurrentPage;

  // Memoized filtered data to prevent unnecessary recalculations
  // NOTE: Filters are now handled by the backend API, so we just pass through the data
  // The selectedFilters are sent to the API which returns pre-filtered results
  const filtered = useMemo(() => {
    // No frontend filtering needed - backend handles all filters
    return locationData;
  }, [locationData]);

  // Memoized sorted data
  const sortedData = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const valA = a[sortOption] ?? 0;
      const valB = b[sortOption] ?? 0;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      } else {
        // Fallback for mixed types or other types
        return 0;
      }
    });
  }, [filtered, sortOrder, sortOption]);

  const handleSortToggle = () => {
    setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const handleColumnSort = (column: LocationSortOption) => {
    if (sortOption === column) {
      handleSortToggle();
    } else {
      setSortOption(column);
      setSortOrder('desc');
    }
  };

  const itemsPerPage = externalItemsPerPage;
  // Use totalCount if provided (for server-side pagination), otherwise calculate from sortedData
  const totalPages = totalCount !== undefined 
    ? Math.ceil(totalCount / itemsPerPage)
    : Math.ceil(sortedData.length / itemsPerPage);
  const currentItems = sortedData.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  // Reset current page if it exceeds total pages (only for internal state)
  useEffect(() => {
    if (externalCurrentPage === undefined && currentPage >= totalPages && totalPages > 0) {
      setInternalCurrentPage(0);
    }
  }, [currentPage, totalPages, externalCurrentPage]);

  return {
    filtered,
    sortedData,
    currentPage,
    setCurrentPage,
    sortOrder,
    sortOption,
    handleColumnSort,
    totalPages,
    currentItems,
    sortedLocations: sortedData,
    paginatedLocations: currentItems,
    setSortOrder,
    setSortOption,
    handleSort: handleColumnSort,
  };
}
