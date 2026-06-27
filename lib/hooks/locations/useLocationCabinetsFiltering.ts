/**
 * useLocationCabinetsFiltering Hook
 *
 * Manages cabinet filtering state and handlers for the location details page.
 *
 * Features:
 * - Search term with debouncing
 * - Filter state for status, game type, SMIB status, archived machines
 * - Sort state and handlers
 * - Pagination state
 * - Filter reset handlers
 */

'use client';

import { useCallback, useMemo, useState } from 'react';

import type { CabinetSortOption } from './useLocationCabinetsData';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';

const ITEMS_PER_PAGE = 20;
const ITEMS_PER_BATCH = 40;
const PAGES_PER_BATCH = ITEMS_PER_BATCH / ITEMS_PER_PAGE;

export type { CabinetSortOption };

type UseLocationCabinetsFilteringProps = {
  allCabinets: readonly Cabinet[];
  accumulatedCabinets: readonly Cabinet[];
  totalCount: number;
  debouncedSearchTerm: string;
  selectedStatus: string;
  selectedGameType: string;
  selectedSmibStatus: string;
  sortOption: CabinetSortOption;
  sortOrder: 'asc' | 'desc';
  currentPage: number;
  showArchived: boolean;
  loadedBatches: Set<number>;
};

type UseLocationCabinetsFilteringReturn = {
  // Computed
  gameTypes: string[];
  sourceCabinets: readonly Cabinet[];
  filteredCabinets: readonly Cabinet[];
  effectiveTotalPages: number;
  paginatedCabinets: readonly Cabinet[];
  isDataMissingForPage: boolean;
  calculateBatchNumber: (page: number) => number;

  // State
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  selectedGameType: string;
  setSelectedGameType: (type: string) => void;
  selectedSmibStatus: string;
  setSelectedSmibStatus: (status: string) => void;
  sortOption: CabinetSortOption;
  setSortOption: (option: CabinetSortOption) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  loadedBatches: Set<number>;
  setLoadedBatches: (batches: Set<number>) => void;
};

export function useLocationCabinetsFiltering({
  allCabinets,
  accumulatedCabinets,
  totalCount,
  debouncedSearchTerm,
  selectedStatus: initialSelectedStatus,
  selectedGameType: initialSelectedGameType,
  selectedSmibStatus: initialSelectedSmibStatus,
  sortOption: initialSortOption,
  sortOrder: initialSortOrder,
  currentPage: initialCurrentPage,
  showArchived: initialShowArchived,
  loadedBatches: initialLoadedBatches,
}: UseLocationCabinetsFilteringProps): UseLocationCabinetsFilteringReturn {
  // ============================================================================
  // State
  // ============================================================================
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(initialSelectedStatus);
  const [selectedGameType, setSelectedGameType] = useState(initialSelectedGameType);
  const [selectedSmibStatus, setSelectedSmibStatus] = useState(initialSelectedSmibStatus);
  const [sortOption, setSortOption] = useState<CabinetSortOption>(initialSortOption);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);
  const [currentPage, setCurrentPage] = useState(initialCurrentPage);
  const [showArchived, setShowArchived] = useState(initialShowArchived);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(initialLoadedBatches);

  // ============================================================================
  // Computed
  // ============================================================================
  const gameTypes = useMemo(() => {
    const uniqueGameTypes = Array.from(
      new Set(
        allCabinets
          .map((cabinet: Cabinet) => cabinet.game || cabinet.installedGame)
          .filter((game): game is string => !!game && game.trim() !== '')
      )
    ).sort();
    return uniqueGameTypes;
  }, [allCabinets]);

  const calculateBatchNumber = useCallback((page: number) => {
    return Math.floor(page / PAGES_PER_BATCH) + 1;
  }, []);

  const sourceCabinets = useMemo(
    () => (debouncedSearchTerm?.trim() ? allCabinets : accumulatedCabinets),
    [allCabinets, accumulatedCabinets, debouncedSearchTerm]
  );

  // ============================================================================
  // Filter, Sort & Pagination
  // ============================================================================
  const filteredCabinets = useMemo(() => {
    const { filterAndSortCabinets } = require('@/lib/utils/ui');
    const { getSerialNumberIdentifier } = require('@/lib/utils/serialNumber');

    let result = filterAndSortCabinets(
      sourceCabinets,
      debouncedSearchTerm,
      sortOption,
      sortOrder
    );

    if (selectedGameType && selectedGameType !== 'all') {
      result = result.filter(
        (cabinet: Cabinet) => (cabinet.game || cabinet.installedGame) === selectedGameType
      );
    }

    result = result.filter(
      (cabinet: Cabinet) => getSerialNumberIdentifier(cabinet) !== 'N/A'
    );

    return result;
  }, [sourceCabinets, sortOption, sortOrder, selectedGameType, debouncedSearchTerm]);

  const effectiveTotalPages = useMemo(() => {
    const displayedPages =
      Math.ceil(filteredCabinets.length / ITEMS_PER_PAGE) || 1;

    if (accumulatedCabinets.length < totalCount && totalCount > 0) {
      const serverTotalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;
      return Math.min(displayedPages + 1, serverTotalPages);
    }

    return displayedPages;
  }, [filteredCabinets.length, accumulatedCabinets.length, totalCount]);

  const isDataMissingForPage = useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    return (
      !debouncedSearchTerm?.trim() &&
      startIndex >= accumulatedCabinets.length &&
      accumulatedCabinets.length < totalCount
    );
  }, [accumulatedCabinets.length, currentPage, totalCount, debouncedSearchTerm]);

  const paginatedCabinets = useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    return filteredCabinets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCabinets, currentPage]);

  // ============================================================================
  // Effects - Filter & Sort
  // ============================================================================
  // Note: These effects would normally be in the main hook since they depend on
  // external state. The filtering logic is self-contained here, but page reset
  // effects need to be in the main hook or passed as callbacks.

  return {
    // Computed
    gameTypes,
    sourceCabinets,
    filteredCabinets,
    effectiveTotalPages,
    paginatedCabinets,
    isDataMissingForPage,
    calculateBatchNumber,

    // State
    searchTerm,
    setSearchTerm,
    selectedStatus,
    setSelectedStatus,
    selectedGameType,
    setSelectedGameType,
    selectedSmibStatus,
    setSelectedSmibStatus,
    sortOption,
    setSortOption,
    sortOrder,
    setSortOrder,
    currentPage,
    setCurrentPage,
    showArchived,
    setShowArchived,
    loadedBatches,
    setLoadedBatches,
  };
}