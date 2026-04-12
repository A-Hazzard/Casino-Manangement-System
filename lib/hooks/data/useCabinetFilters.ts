/**
 * Custom hook for managing cabinet search and filter state
 * Handles search term, location filter, and filter logic
 */

import type {
    UseCabinetFiltersProps,
    UseCabinetFiltersReturn,
} from '@/lib/types/cabinet';
import { useCallback, useEffect, useState } from 'react';

export function useCabinetFilters({
  onFiltersChange,
}: UseCabinetFiltersProps = {}): UseCabinetFiltersReturn {
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string[]>([]);
  const [selectedGameType, setSelectedGameType] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedMembership, setSelectedMembership] = useState<string>('all');

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedLocation([]);
    setSelectedGameType([]);
    setSelectedStatus('All');
    setSelectedMembership('all');
  }, []);

  // Check if any filters are active
  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    selectedLocation.length > 0 ||
    selectedGameType.length > 0 ||
    selectedStatus !== 'All' ||
    selectedMembership !== 'all';

  // Handle search term changes
  const handleSearchTermChange = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  // Handle location filter changes
  const handleLocationChange = useCallback((locations: string[]) => {
    setSelectedLocation(locations);
  }, []);

  // Handle game type filter changes
  const handleGameTypeChange = useCallback((gameTypes: string[]) => {
    setSelectedGameType(gameTypes);
  }, []);

  // Handle status filter changes
  const handleStatusChange = useCallback((status: string) => {
    setSelectedStatus(status);
  }, []);

  // Handle membership filter changes
  const handleMembershipChange = useCallback((membership: string) => {
    setSelectedMembership(membership);
  }, []);

  // Notify parent of filter changes
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(
        searchTerm,
        selectedLocation,
        selectedGameType,
        selectedStatus,
        selectedMembership
      );
    }
  }, [
    searchTerm,
    selectedLocation,
    selectedGameType,
    selectedStatus,
    selectedMembership,
    onFiltersChange,
  ]);

  return {
    searchTerm,
    selectedLocation,
    selectedGameType,
    selectedStatus,
    selectedMembership,
    setSearchTerm: handleSearchTermChange,
    setSelectedLocation: handleLocationChange,
    setSelectedGameType: handleGameTypeChange,
    setSelectedStatus: handleStatusChange,
    setSelectedMembership: handleMembershipChange,
    clearFilters,
    hasActiveFilters,
  };
}
