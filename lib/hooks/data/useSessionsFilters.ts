/**
 * Sessions Filters Custom Hook
 *
 * Provides a custom hook for managing sessions filtering and search functionality.
 * It handles search terms, sorting, filter state management, and provides
 * utilities for filter operations.
 *
 * Features:
 * - Search term management
 * - Sort field and order management
 * - Filter state tracking
 * - Clear filters functionality
 * - Active filter detection
 * - Sort icon utilities
 * - Filter change notifications
 */

import { useCallback, useMemo, useState } from 'react';
type UseSessionsFiltersProps = {
  onFiltersChange?: (filters: {
    searchTerm: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    status: string;
  }) => void;
};

type UseSessionsFiltersReturn = {
  searchTerm: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  statusFilter: string;
  setSearchTerm: (term: string) => void;
  setSortBy: (field: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setStatusFilter: (status: string) => void;
  handleSort: (field: string) => void;
  clearFilters: () => void;
  filters: {
    searchTerm: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    statusFilter: string;
  };
  hasActiveFilters: boolean;
  getSortIcon: (field: string) => React.ReactNode;
};

export function useSessionsFilters({
  onFiltersChange,
}: UseSessionsFiltersProps = {}): UseSessionsFiltersReturn {
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('startTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState('all');

  // Handle search term changes
  const handleSearchTermChange = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  // Handle sort field changes
  const handleSortByChange = useCallback((field: string) => {
    setSortBy(field);
  }, []);

  // Handle sort order changes
  const handleSortOrderChange = useCallback((order: 'asc' | 'desc') => {
    setSortOrder(order);
  }, []);

  // Handle sort toggle (toggle between asc/desc for same field)
  const handleSort = useCallback(
    (field: string) => {
      if (sortBy === field) {
        setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        setSortOrder('desc');
      }
    },
    [sortBy]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSortBy('startTime');
    setSortOrder('desc');
    setStatusFilter('all');
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm.trim() !== '' ||
      sortBy !== 'startTime' ||
      sortOrder !== 'desc' ||
      statusFilter !== 'all'
    );
  }, [searchTerm, sortBy, sortOrder, statusFilter]);

  // Get sort icon for a field
  const getSortIcon = useCallback(
    (field: string) => {
      if (sortBy !== field) return '↕';
      return sortOrder === 'asc' ? '↑' : '↓';
    },
    [sortBy, sortOrder]
  );

  // Notify parent of filter changes
  useMemo(() => {
    if (onFiltersChange) {
      onFiltersChange({
        searchTerm,
        sortBy,
        sortOrder,
        status: statusFilter,
      });
    }
  }, [searchTerm, sortBy, sortOrder, statusFilter, onFiltersChange]);

  return {
    searchTerm,
    sortBy,
    sortOrder,
    statusFilter,
    setSearchTerm: handleSearchTermChange,
    setSortBy: handleSortByChange,
    setSortOrder: handleSortOrderChange,
    setStatusFilter,
    handleSort,
    clearFilters,
    filters: {
      searchTerm,
      sortBy,
      sortOrder,
      statusFilter,
    },
    hasActiveFilters,
    getSortIcon,
  };
}
