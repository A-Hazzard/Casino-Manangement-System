/**
 * useCollectionReportFilters Hook
 *
 * Manages the complex filtering and sorting logic for collection reports.
 *
 * Architecture:
 * - Client-side filtering and sorting
 * - Combines location, SMIB, and collection status filters
 * - Supports custom date ranges and search relevance
 */

'use client';

// ============================================================================
// External Dependencies
// ============================================================================

import { filterCollectionReports } from '@/lib/helpers/collectionReport';
import type { CollectionReportRow } from '@/lib/types/components';
import type { LocationSelectItem } from '@/lib/types/location';
import type { dateRange as DashboardDateRange } from '@/lib/types';
import { useMemo, useState } from 'react';

// ============================================================================
// Type Definitions
// ============================================================================

type UseCollectionReportFiltersProps = {
  allReports: CollectionReportRow[];
  locations: LocationSelectItem[];
  searchTerm?: string;
  timePeriod?: string;
  dateRange?: DashboardDateRange;
};

// ============================================================================
// Main Hook
// ============================================================================

export function useCollectionReportFilters({
  allReports,
  locations,
  searchTerm = '',
  timePeriod = '',
  dateRange,
}: UseCollectionReportFiltersProps) {
  // ==========================================================================
  // Local State - Filters
  // ==========================================================================
  const [selectedLocation, setSelectedLocation] = useState<string | string[]>('all');
  const [showUncollectedOnly, setShowUncollectedOnly] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // ==========================================================================
  // Local State - Sorting
  // ==========================================================================
  const [sortField, setSortField] = useState<keyof CollectionReportRow>('time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // ==========================================================================
  // Computed Values
  // ==========================================================================

  /**
   * Filtered and sorted collection reports
   * - Applies location and collection status filters
   * - Applies SMIB-specific filters
   * - Sorts by selected field with search relevance
   */
  const filteredReports = useMemo(() => {
    const rdpDateRange = dateRange
      ? {
          from: dateRange.from || dateRange.startDate || dateRange.start,
          to: dateRange.to || dateRange.endDate || dateRange.end,
        }
      : undefined;

    const filtered = filterCollectionReports(
      allReports,
      selectedLocation,
      '',
      showUncollectedOnly,
      locations,
      timePeriod === 'Custom' ? rdpDateRange : undefined
    );

    let result = filtered;
    if (selectedFilters.length > 0) {
      result = filtered.filter(report => {
        return selectedFilters.some(filter => {
          if (filter === 'SMIBLocationsOnly') return !report.noSMIBLocation;
          if (filter === 'NoSMIBLocation')
            return report.noSMIBLocation === true;
          if (filter === 'LocalServersOnly') return report.isLocalServer;
          return false;
        });
      });
    }

    return [...result].sort((a, b) => {
      if (searchTerm.trim()) {
        const lowerSearch = searchTerm.trim().toLowerCase();
        const aId = String(a.locationReportId || '').toLowerCase();
        const bId = String(b.locationReportId || '').toLowerCase();
        const aCollector = String(a.collector || '').toLowerCase();
        const bCollector = String(b.collector || '').toLowerCase();

        const aStarts =
          aId.startsWith(lowerSearch) || aCollector.startsWith(lowerSearch);
        const bStarts =
          bId.startsWith(lowerSearch) || bCollector.startsWith(lowerSearch);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
      }

      const aValue = a[sortField];
      const bValue = b[sortField];

      if (sortField === 'time') {
        const aTime = new Date(aValue as string).getTime();
        const bTime = new Date(bValue as string).getTime();
        return sortDirection === 'desc' ? bTime - aTime : aTime - bTime;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });
  }, [
    allReports,
    selectedLocation,
    showUncollectedOnly,
    locations,
    selectedFilters,
    sortField,
    sortDirection,
    searchTerm,
    timePeriod,
    dateRange,
  ]);

  // ==========================================================================
  // Event Handlers - Sorting
  // ==========================================================================

  /**
   * Toggle sort direction or change sort field
   */
  const handleSort = (field: keyof CollectionReportRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // ==========================================================================
  // Event Handlers - Filters
  // ==========================================================================

  /**
   * Toggle a filter option on/off
   */
  const handleFilterChange = (filter: string, checked: boolean) => {
    if (checked) setSelectedFilters(prev => [...prev, filter]);
    else setSelectedFilters(prev => prev.filter(activeFilter => activeFilter !== filter));
  };

  /**
   * Reset all filters to defaults
   */
  const clearFilters = () => {
    setSelectedLocation('all');
    setShowUncollectedOnly(false);
    setSelectedFilters([]);
  };

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    filteredReports,
    selectedLocation,
    showUncollectedOnly,
    selectedFilters,
    sortField,
    sortDirection,
    setSelectedLocation,
    setShowUncollectedOnly,
    handleSort,
    handleFilterChange,
    clearFilters,
  };
}
