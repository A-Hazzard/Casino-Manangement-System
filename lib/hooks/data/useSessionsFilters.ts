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

import { ReactNode } from 'react';
import { useState } from 'react';
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
  getSortIcon: (field: string) => ReactNode;
};

export function useSessionsFilters({
  onFiltersChange,
}: UseSessionsFiltersProps = {}): UseSessionsFiltersReturn {
  // ============================================================================
  // State & Hooks
  // ============================================================================

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('startTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState('all');

  // ============================================================================
  // Handlers
  // ============================================================================

  // Handle search term changes
  const handleSearchTermChange = (term: string) => {
    setSearchTerm(term);
  };

  // Handle sort field changes
  const handleSortByChange = (field: string) => {
    setSortBy(field);
  };

  // Handle sort order changes
  const handleSortOrderChange = (order: 'asc' | 'desc') => {
    setSortOrder(order);
  };

  // Handle sort toggle (toggle between asc/desc for same field)
  const handleSort = (field: string) => {
      if (sortBy === field) {
        setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        setSortOrder('desc');
      }
    };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSortBy('startTime');
    setSortOrder('desc');
    setStatusFilter('all');
  };

  // ============================================================================
  // Computed
  // ============================================================================

  // Check if any filters are active
  const hasActiveFilters = (() => {
    return (
      searchTerm.trim() !== '' ||
      sortBy !== 'startTime' ||
      sortOrder !== 'desc' ||
      statusFilter !== 'all'
    );
  })();

  // Get sort icon for a field
  const getSortIcon = (field: string) => {
      if (sortBy !== field) return '↕';
      return sortOrder === 'asc' ? '↑' : '↓';
    };

  // Notify parent of filter changes
  (() => {
    if (onFiltersChange) {
      onFiltersChange({
        searchTerm,
        sortBy,
        sortOrder,
        status: statusFilter,
      });
    }
  })();

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
