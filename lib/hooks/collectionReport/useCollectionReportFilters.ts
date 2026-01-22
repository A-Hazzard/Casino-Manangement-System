/**
 * useCollectionReportFilters Hook
 *
 * Manages the complex filtering and sorting logic for collection reports.
 */

'use client';

import { useMemo, useState } from 'react';
import { filterCollectionReports } from '@/lib/helpers/collectionReport';
import type { CollectionReportRow } from '@/lib/types/components';
import type { LocationSelectItem } from '@/lib/types/location';

export function useCollectionReportFilters(
  allReports: CollectionReportRow[],
  locations: LocationSelectItem[],
) {
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [showUncollectedOnly, setShowUncollectedOnly] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof CollectionReportRow>('time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const filteredReports = useMemo(() => {
    // Apply basic filters
    const filtered = filterCollectionReports(
      allReports,
      selectedLocation,
      '', // Server-side search handled via debouncedSearch
      showUncollectedOnly,
      locations
    );

    // Apply specific SMIB filters
    let result = filtered;
    if (selectedFilters.length > 0) {
      result = filtered.filter(report => {
        return selectedFilters.some(filter => {
          if (filter === 'SMIBLocationsOnly') return !report.noSMIBLocation;
          if (filter === 'NoSMIBLocation') return report.noSMIBLocation === true;
          if (filter === 'LocalServersOnly') return report.isLocalServer;
          return false;
        });
      });
    }

    // Apply sorting
    return [...result].sort((a, b) => {
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
  }, [allReports, selectedLocation, showUncollectedOnly, locations, selectedFilters, sortField, sortDirection]);

  const handleSort = (field: keyof CollectionReportRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleFilterChange = (filter: string, checked: boolean) => {
    if (checked) setSelectedFilters(prev => [...prev, filter]);
    else setSelectedFilters(prev => prev.filter(f => f !== filter));
  };

  const clearFilters = () => {
    setSelectedLocation('all');
    setShowUncollectedOnly(false);
    setSelectedFilters([]);
  };

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



