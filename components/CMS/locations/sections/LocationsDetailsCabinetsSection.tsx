/**
 * LocationsDetailsCabinetsSection Component
 *
 * Displays the machines/cabinets view for a location details page.
 * Includes financial metrics, charts, filters, search, and cabinet grid.
 *
 * Features:
 * - Financial metrics overview
 * - Location-specific metrics chart with granularity selector
 * - Date filters and machine status widget
 * - Search and filter capabilities
 * - Cabinet grid with pagination
 * - Responsive design for mobile and desktop
 * 
 * @param props - Component props
 */

'use client';

import LocationsCabinetGrid from '@/components/CMS/locations/LocationsCabinetGrid';
import LocationsDetailsChartSection from '@/components/CMS/locations/sections/LocationsDetailsChartSection';
import DateFilters from '@/components/shared/ui/common/DateFilters';
import LocationSingleSelect from '@/components/shared/ui/common/LocationSingleSelect';
import { CustomSelect } from '@/components/shared/ui/custom-select';
import NotFoundError from '@/components/shared/ui/errors/NotFoundError';
import UnauthorizedError from '@/components/shared/ui/errors/UnauthorizedError';
import FinancialMetricsCards from '@/components/shared/ui/FinancialMetricsCards';
import { Input } from '@/components/shared/ui/input';
import MachineStatusWidget from '@/components/shared/ui/MachineStatusWidget';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import type { dashboardData } from '@/lib/types';
import type { ExtendedCabinetDetail } from '@/lib/types/pages';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import gsap from 'gsap';
import { Info, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import LocationsCabinetCardsSkeleton from '../LocationsCabinetCardsSkeleton';
import LocationsCabinetTableSkeleton from '../LocationsCabinetTableSkeleton';

type CabinetSortOption =
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

type LocationsDetailsCabinetsSectionProps = {
  // Data
  financialTotals: {
    moneyIn: number;
    moneyOut: number;
    gross: number;
    jackpot?: number;
  } | null;
  chartData: dashboardData[] | null;
  filteredCabinets: Cabinet[];
  gameTypes: string[];
  locationName: string;
  locationId: string;
  selectedLocationId: string;
  locations: { id: string; name: string }[];
  error: string | null;
  // Loading states
  loading: boolean;
  cabinetsLoading: boolean;
  loadingChartData: boolean;
  machineStatsLoading: boolean;
  membershipStatsLoading: boolean;
  // Chart
  showGranularitySelector: boolean;
  chartGranularity: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly';
  availableGranularityOptions?: Array<'daily' | 'weekly' | 'monthly'>;
  activeMetricsFilter: string | null;
  // Filters
  searchTerm: string;
  selectedStatus: string;
  selectedGameType: string;
  sortOption: CabinetSortOption;
  sortOrder: 'asc' | 'desc';
  selectedSmibStatus: string;
  // Pagination
  currentPage: number;
  effectiveTotalPages: number;
  totalCount: number;
  debouncedSearchTerm: string;
  // Stats
  machineStats: {
    onlineMachines?: number;
    offlineMachines?: number;
    totalMachines?: number;
  } | null;
  membershipStats: {
    membershipCount?: number;
  } | null;
  // Setters
  setSearchTerm: (value: string) => void;
  setSelectedStatus: (status: string) => void;
  setSelectedGameType: (type: string) => void;
  setSelectedSmibStatus: (status: string) => void;
  setSortOption: (option: CabinetSortOption) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setCurrentPage: (page: number) => void;
  setChartGranularity: (
    granularity: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly'
  ) => void;
  setSelectedLocationId: (id: string) => void;
  // Handlers
  handleRefresh: () => Promise<void>;
  handleFilterChange: (status: string) => void;
  includeJackpot?: boolean;
  handleLocationChangeInPlace: (newLocationId: string) => void;
  onRestore?: (cabinet: Cabinet) => void;
  onPermanentDelete?: (cabinet: Cabinet) => void;
  // Archived machine management
  showArchived: boolean;
  setShowArchived: (value: boolean) => void;
  canViewArchived: boolean;
  canPermanentlyDeleteMachines?: boolean;
};

export default function LocationsDetailsCabinetsSection({
  financialTotals,
  chartData,
  filteredCabinets,
  gameTypes,
  locationId,
  selectedLocationId,
  locations,
  error,
  loading,
  cabinetsLoading,
  loadingChartData,
  machineStatsLoading,
  membershipStatsLoading,
  showGranularitySelector,
  chartGranularity,
  availableGranularityOptions,
  activeMetricsFilter,
  searchTerm,
  selectedStatus,
  selectedGameType,
  selectedSmibStatus,
  sortOption,
  sortOrder,
  currentPage,
  effectiveTotalPages,
  totalCount,
  debouncedSearchTerm,
  machineStats,
  membershipStats,
  setSearchTerm,
  setSelectedGameType,
  setSelectedSmibStatus,
  setSortOption,
  setSortOrder,
  setCurrentPage,
  setChartGranularity,
  includeJackpot = false,
  handleRefresh,
  handleFilterChange,
  handleLocationChangeInPlace,
  onRestore,
  onPermanentDelete,
  showArchived,
  setShowArchived,
  canViewArchived,
}: LocationsDetailsCabinetsSectionProps) {
  const router = useRouter();
  const tableRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 20;

  const showLocationSelect = locations.length > 1;
  const locationSelectOptions = locations.map(loc => ({
    id: loc.id,
    name: loc.name,
  }));

  /**
   * Animates table rows and cards when cabinets data changes.
   * Uses GSAP for smooth animations on data load/filter changes.
   */
  useEffect(() => {
    if (!loading && !cabinetsLoading && filteredCabinets.length > 0) {
      const timeoutId = setTimeout(() => {
        if (tableRef.current) {
          const tableRows = tableRef.current.querySelectorAll('tbody tr');
          if (tableRows.length > 0) {
            gsap.fromTo(
              tableRows,
              { opacity: 0, y: 15 },
              {
                opacity: 1,
                y: 0,
                duration: 0.4,
                stagger: 0.05,
                ease: 'power2.out',
              }
            );
          }

          const cardsContainer = tableRef.current.querySelector('.grid');
          if (cardsContainer) {
            const cards = Array.from(cardsContainer.children);
            if (cards.length > 0) {
              gsap.fromTo(
                cards,
                { opacity: 0, scale: 0.95, y: 15 },
                {
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  duration: 0.4,
                  stagger: 0.08,
                  ease: 'back.out(1.5)',
                }
              );
            }
          }
        }
      }, 150);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [
    filteredCabinets,
    selectedStatus,
    selectedGameType,
    selectedSmibStatus,
    searchTerm,
    sortOption,
    sortOrder,
    currentPage,
    loading,
    cabinetsLoading,
  ]);

  /**
   * Handles search input changes and provides visual feedback.
   * Prevents updates while data is loading or refreshing.
   */
  const handleSearchChange = (value: string) => {
    // allow typing even while loading to prevent input freezing
    setSearchTerm(value);

    // Highlight table when user is searching
    if (tableRef.current && value.trim() !== '') {
      gsap.to(tableRef.current, {
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        duration: 0.2,
        onComplete: () => {
          gsap.to(tableRef.current, {
            backgroundColor: 'transparent',
            duration: 0.5,
          });
        },
      });
    }
  };

  // Show error message if user is unauthorized or location not found
  if (error === 'UNAUTHORIZED' || error === 'Location not found') {
    // Show unauthorized error if user doesn't have access
    return error === 'UNAUTHORIZED' ? (
      <UnauthorizedError
        title="Access Denied"
        message="You are not authorized to view details for this location."
        resourceType="location"
        customBackText="Back to Locations"
        customBackHref="/locations"
      />
    ) : (
      <NotFoundError
        title="Location Not Found"
        message={`No location found for this ID (${locationId}) for your licence.`}
        resourceType="location"
        showRetry={false}
        customBackText="Back to Locations"
        customBackHref="/locations"
      />
    );
  }

  return (
    <>
      {/* Financial Metrics Section: Location-specific financial overview */}
      <div>
        {/* Jackpot badge — above heading on mobile/md, inline on lg+ */}
        {includeJackpot && (
          <div className="mb-2 lg:hidden">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              <Info className="h-3 w-3" />
              This location adds Jackpot to Money Out
            </span>
          </div>
        )}
        <div className="mb-2 flex items-center gap-2">
          {includeJackpot && (
            <div className="group relative hidden flex-shrink-0 lg:inline-flex">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                <Info className="h-3.5 w-3.5" />
                This location adds Jackpot to Money Out
              </span>
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                Jackpot is added to Money Out: Money Out = Total Cancelled Credits + Jackpot
              </div>
            </div>
          )}
        </div>

        <FinancialMetricsCards
          totals={financialTotals}
          loading={loading || cabinetsLoading}
          disableCurrencyConversion={true}
          locationFiltered={true}
          includeJackpot={includeJackpot}
        />
      </div>

      {/* Chart Section: Location-specific metrics chart */}
      <LocationsDetailsChartSection
        chartData={chartData}
        loadingChartData={loadingChartData}
        activeMetricsFilter={activeMetricsFilter}
        chartGranularity={chartGranularity}
        onGranularityChange={setChartGranularity}
        showGranularitySelector={showGranularitySelector}
        availableGranularityOptions={availableGranularityOptions}
      />

      {/* Date Filters and Machine Status Section: Responsive layout for filters and status */}
      <div className="mt-4 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="order-1 flex-1">
          <DateFilters
            onCustomRangeGo={handleRefresh}
            hideAllTime={false}
            showQuarterly={true}
            enableTimeInputs={true}
          />
        </div>
        <div className="order-2 w-auto flex-shrink-0">
          <MachineStatusWidget
            isLoading={machineStatsLoading || membershipStatsLoading || machineStats === null || machineStats === undefined}
            onlineCount={machineStats?.onlineMachines || 0}
            offlineCount={machineStats?.offlineMachines || 0}
            totalCount={machineStats?.totalMachines}
            showTotal={true}
            membershipCount={membershipStats?.membershipCount || 0}
            showMembership={true}
          />
        </div>
      </div>

      {/* Search and Location Selection Section: Desktop search bar with location dropdown */}
      <div className="mt-4 hidden w-full bg-buttonActive p-4 md:block rounded-lg rounded-b-none shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full flex-1 md:max-w-none lg:max-w-2xl xl:max-w-3xl">
            <Input
              type="text"
              placeholder="Search machines (Asset, SMID, Serial, Game)..."
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:border-buttonActive focus:ring-buttonActive"
               value={searchTerm}
              onChange={e => handleSearchChange(e.target.value)}
            />
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Filter Buttons - On the right */}
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:min-w-min lg:gap-4">
            {showLocationSelect && (
              <div className="w-full flex-shrink-0 sm:w-auto md:min-w-[150px] lg:min-w-[180px]">
                <LocationSingleSelect
                  locations={locationSelectOptions}
                  selectedLocation={selectedLocationId || locationId}
                  onSelectionChange={handleLocationChangeInPlace}
                  includeAllOption={true}
                  allOptionLabel="All Locations"
                  showSasBadge={false}
                  className="w-full"
                />
              </div>
            )}

            {/* Game Type Filter */}
            <div className="w-full flex-shrink-0 sm:w-auto md:min-w-[140px] lg:min-w-[180px]">
              <CustomSelect
                value={selectedGameType}
                onValueChange={setSelectedGameType}
                options={[
                  { value: 'all', label: 'All Games' },
                  ...gameTypes
                    .filter((gameType): gameType is string => !!gameType)
                    .map(gameType => ({
                      value: gameType,
                      label: gameType,
                    })),
                ]}
                placeholder="All Games"
                className="w-full"
                triggerClassName="h-9 bg-white border border-gray-300 rounded-md px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
                searchable={true}
                emptyMessage="No game types found"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full flex-shrink-0 sm:w-auto md:min-w-[150px] lg:min-w-[180px]">
              <CustomSelect
                value={selectedStatus}
                onValueChange={value =>
                  handleFilterChange(value)
                }
                options={[
                  { value: 'All', label: 'All Status' },
                  { value: 'Online', label: 'Online' },
                  { value: 'OfflineLongest', label: 'Offline (Longest First)' },
                  { value: 'OfflineShortest', label: 'Offline (Shortest First)' },
                  { value: 'NeverOnline', label: 'Never Online' },
                ]}
                placeholder="All Status"
                className="w-full"
                triggerClassName="h-9 bg-white border border-gray-300 rounded-md px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
                searchable={false}
                emptyMessage="No status options found"
              />
            </div>

            {/* SMIB Status Filter */}
            <div className="w-full flex-shrink-0 sm:w-auto md:min-w-[150px] lg:min-w-[180px]">
              <CustomSelect
                value={selectedSmibStatus}
                onValueChange={setSelectedSmibStatus}
                options={[
                  { value: 'all', label: 'All SMIB Status' },
                  { value: 'smib', label: 'Only SMIB' },
                  { value: 'no-smib', label: 'No SMIB' },
                ]}
                placeholder="SMIB Status"
                className="w-full"
                triggerClassName="h-9 bg-white border border-gray-300 rounded-md px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
                searchable={false}
                emptyMessage="No SMIB options found"
              />
            </div>

            {/* Show Archived Toggle */}
            {canViewArchived && (
              <div className="flex items-center gap-2 px-2">
                <input
                  type="checkbox"
                  id="showArchivedDesktop"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-buttonActive focus:ring-buttonActive"
                />
                <label htmlFor="showArchivedDesktop" className="text-sm font-medium text-white cursor-pointer select-none">
                  View Archived
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Horizontal scrollable filters */}
      <div className="mt-4 md:hidden">
        {/* Search Input - Full width */}
        <div className="relative mb-3 w-full">
          <Input
            type="text"
            placeholder="Search machines..."
            className="h-11 w-full rounded-full border border-gray-300 bg-white px-4 pr-10 text-base text-gray-700 placeholder-gray-400 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
             value={searchTerm}
            onChange={e => handleSearchChange(e.target.value)}
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Filters - Horizontal scrollable */}
        <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 flex gap-2 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-2">
            {showLocationSelect && (
              <div className="w-40 flex-shrink-0">
                <LocationSingleSelect
                  locations={locationSelectOptions}
                  selectedLocation={selectedLocationId || locationId}
                  onSelectionChange={handleLocationChangeInPlace}
                  includeAllOption={true}
                  allOptionLabel="All Locations"
                  showSasBadge={false}
                  className="w-full"
                />
              </div>
            )}
            <div className="relative w-36 flex-shrink-0">
              <CustomSelect
                value={selectedGameType}
                onValueChange={setSelectedGameType}
                options={[
                  { value: 'all', label: 'All Games' },
                  ...gameTypes
                    .filter((gameType): gameType is string => !!gameType)
                    .map(gameType => ({
                      value: gameType,
                      label: gameType,
                    })),
                ]}
                placeholder="All Games"
                className="w-full"
                triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
                searchable={true}
                emptyMessage="No game types found"
              />
            </div>
            <div className="relative w-44 flex-shrink-0">
              <CustomSelect
                value={selectedStatus}
                onValueChange={value =>
                  handleFilterChange(value)
                }
                options={[
                  { value: 'All', label: 'All Status' },
                  { value: 'Online', label: 'Online' },
                  { value: 'OfflineLongest', label: 'Offline (Longest First)' },
                  { value: 'OfflineShortest', label: 'Offline (Shortest First)' },
                  { value: 'NeverOnline', label: 'Never Online' },
                ]}
                placeholder="All Status"
                className="w-full"
                triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
                searchable={false}
                emptyMessage="No status options found"
              />
            </div>

            <div className="relative w-44 flex-shrink-0">
              <CustomSelect
                value={selectedSmibStatus}
                onValueChange={setSelectedSmibStatus}
                options={[
                  { value: 'all', label: 'All SMIB Status' },
                  { value: 'smib', label: 'Only SMIB' },
                  { value: 'no-smib', label: 'No SMIB' },
                ]}
                placeholder="SMIB Status"
                className="w-full"
                triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
                searchable={false}
                emptyMessage="No SMIB options found"
              />
            </div>
            <div className="relative w-40 flex-shrink-0">
              <CustomSelect
                value={`${sortOption}-${sortOrder}`}
                onValueChange={value => {
                  const [option, order] = value.split('-');
                  setSortOption(option as CabinetSortOption);
                  setSortOrder(order as 'asc' | 'desc');
                }}
                options={[
                  {
                    value: 'moneyIn-desc',
                    label: 'Money In (Highest First)',
                  },
                  {
                    value: 'moneyIn-asc',
                    label: 'Money In (Lowest First)',
                  },
                  {
                    value: 'moneyOut-desc',
                    label: 'Money Out (Highest First)',
                  },
                  {
                    value: 'moneyOut-asc',
                    label: 'Money Out (Lowest First)',
                  },
                  {
                    value: 'gross-desc',
                    label: 'Gross Revenue (Highest First)',
                  },
                  {
                    value: 'gross-asc',
                    label: 'Gross Revenue (Lowest First)',
                  },
                  {
                    value: 'jackpot-desc',
                    label: 'Jackpot (Highest First)',
                  },
                  {
                    value: 'jackpot-asc',
                    label: 'Jackpot (Lowest First)',
                  },
                  {
                    value: 'assetNumber-asc',
                    label: 'Asset Number (A to Z)',
                  },
                  {
                    value: 'assetNumber-desc',
                    label: 'Asset Number (Z to A)',
                  },
                  {
                    value: 'locationName-asc',
                    label: 'Location (A to Z)',
                  },
                  {
                    value: 'locationName-desc',
                    label: 'Location (Z to A)',
                  },
                  {
                    value: 'lastOnline-desc',
                    label: 'Last Online (Most Recent)',
                  },
                  {
                    value: 'lastOnline-asc',
                    label: 'Last Online (Oldest First)',
                  },
                  {
                    value: 'offlineTime-desc',
                    label: 'Offline Time (Longest First)',
                  },
                  {
                    value: 'offlineTime-asc',
                    label: 'Offline Time (Shortest First)',
                  },
                ]}
                placeholder="Sort by"
                className="w-full"
                triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm whitespace-nowrap"
                searchable={false}
                emptyMessage="No sort options found"
              />
            </div>
            
            {/* Show Archived Toggle - Mobile */}
            {canViewArchived && (
              <div className="flex h-10 items-center gap-2 rounded-full border border-gray-300 bg-white px-4">
                <input
                  type="checkbox"
                  id="showArchivedMobile"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-buttonActive focus:ring-buttonActive"
                />
                <label htmlFor="showArchivedMobile" className="text-sm font-medium text-gray-700 cursor-pointer select-none whitespace-nowrap">
                  View Archived
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Section: Main cabinet data display with responsive layouts */}
      <div className="mt-4 lg:mt-0 w-full flex-1">
        {loading || cabinetsLoading ? (
          <>
            {/* Use CabinetTableSkeleton for lg+ only */}
            <div className="hidden lg:block">
              <LocationsCabinetTableSkeleton />
            </div>
            {/* Use LocationsCabinetCardsSkeleton for mobile and tablet (up to md) */}
            <div className="block lg:hidden">
              <LocationsCabinetCardsSkeleton />
            </div>
          </>
        ) : /* Show empty state if no cabinets match filters */ filteredCabinets.length ===
          0 ? (
          <div className="mt-10 text-center text-gray-500">
            No cabinets found
            {debouncedSearchTerm ? ' matching your search' : ''}.
          </div>
        ) : /* Show loading message if cabinets data is null */ filteredCabinets ==
          null ? (
          <div className="mt-10 text-center text-gray-500">
            Loading cabinets...
          </div>
        ) : (
          <>
            <div ref={tableRef}>
              <LocationsCabinetGrid
                filteredCabinets={
                filteredCabinets
                  .filter(cab => (cab.serialNumber || cab.custom?.name || 'N/A') !== 'N/A')
                  .map(cab => ({
                      ...cab,
                      isOnline: cab.online,
                    })) as ExtendedCabinetDetail[]
                }
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                router={router}
                sortOption={sortOption}
                sortOrder={sortOrder}
                onSortChange={(option, order) => {
                  setSortOption(option);
                  setSortOrder(order);
                }}
                onRestore={onRestore}
                onPermanentDelete={onPermanentDelete}
                showArchived={showArchived}
                includeJackpot={includeJackpot}
              />
            </div>

            {/* Show pagination only if there are multiple pages */}
            {!loading && effectiveTotalPages > 1 && (
              <div className="my-4 flex w-full justify-center">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={effectiveTotalPages}
                  totalCount={totalCount}
                  setCurrentPage={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
