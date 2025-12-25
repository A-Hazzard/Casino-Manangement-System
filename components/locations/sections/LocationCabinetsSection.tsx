/**
 * LocationCabinetsSection Component
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
 */

'use client';

import CabinetGrid from '@/components/locationDetails/CabinetGrid';
import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import FinancialMetricsCards from '@/components/ui/FinancialMetricsCards';
import MachineStatusWidget from '@/components/ui/MachineStatusWidget';
import Chart from '@/components/ui/dashboard/Chart';
import LocationSingleSelect from '@/components/ui/common/LocationSingleSelect';
import { CustomSelect } from '@/components/ui/custom-select';
import NotFoundError from '@/components/ui/errors/NotFoundError';
import UnauthorizedError from '@/components/ui/errors/UnauthorizedError';
import { Input } from '@/components/ui/input';
import CabinetCardsSkeleton from '@/components/ui/locations/CabinetCardsSkeleton';
import CabinetTableSkeleton from '@/components/ui/locations/CabinetTableSkeleton';
import PaginationControls from '@/components/ui/PaginationControls';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import type { ExtendedCabinetDetail } from '@/lib/types/pages';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import type { TimePeriod } from '@/shared/types/common';
import type { dashboardData } from '@/lib/types';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useEffect } from 'react';
import gsap from 'gsap';

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
  | 'lastOnline';

type LocationCabinetsSectionProps = {
  // Data
  financialTotals: {
    moneyIn: number;
    moneyOut: number;
    gross: number;
    jackpot?: number;
  };
  chartData: dashboardData[];
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
  refreshing: boolean;
  // Chart
  showGranularitySelector: boolean;
  chartGranularity: 'hourly' | 'minute';
  activeMetricsFilter: string | null;
  // Filters
  searchTerm: string;
  selectedStatus: 'All' | 'Online' | 'Offline';
  selectedGameType: string;
  sortOption: CabinetSortOption;
  sortOrder: 'asc' | 'desc';
  // Pagination
  currentPage: number;
  effectiveTotalPages: number;
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
  setSelectedStatus: (status: 'All' | 'Online' | 'Offline') => void;
  setSelectedGameType: (type: string) => void;
  setSortOption: (option: CabinetSortOption) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setCurrentPage: (page: number) => void;
  setChartGranularity: (granularity: 'hourly' | 'minute') => void;
  setSelectedLocationId: (id: string) => void;
  // Handlers
  handleRefresh: () => Promise<void>;
  handleFilterChange: (status: 'All' | 'Online' | 'Offline') => void;
  handleLocationChangeInPlace: (newLocationId: string) => void;
};

export default function LocationCabinetsSection({
  financialTotals,
  chartData,
  filteredCabinets,
  gameTypes,
  locationName,
  locationId,
  selectedLocationId,
  locations,
  error,
  loading,
  cabinetsLoading,
  loadingChartData,
  machineStatsLoading,
  membershipStatsLoading,
  refreshing,
  showGranularitySelector,
  chartGranularity,
  activeMetricsFilter,
  searchTerm,
  selectedStatus,
  selectedGameType,
  sortOption,
  sortOrder,
  currentPage,
  effectiveTotalPages,
  debouncedSearchTerm,
  machineStats,
  membershipStats,
  setSearchTerm,
  setSelectedGameType,
  setSortOption,
  setSortOrder,
  setCurrentPage,
  setChartGranularity,
  handleRefresh,
  handleFilterChange,
  handleLocationChangeInPlace,
}: LocationCabinetsSectionProps) {
  const router = useRouter();
  const tableRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 10;

  const showLocationSelect = locations.length > 1;
  const locationSelectOptions = locations.map(loc => ({
    id: loc.id,
    name: loc.name,
  }));

  // ============================================================================
  // Effects - Animation
  // ============================================================================
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
    searchTerm,
    sortOption,
    sortOrder,
    currentPage,
    loading,
    cabinetsLoading,
  ]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  const handleSearchChange = (value: string) => {
    if (loading || cabinetsLoading || refreshing) return;
    setSearchTerm(value);

    // Highlight matched items when searching
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

  // ============================================================================
  // Render
  // ============================================================================
  // Error Display
  if (error === 'UNAUTHORIZED' || error === 'Location not found') {
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
      <div className="mt-6">
        <FinancialMetricsCards
          totals={{
            moneyIn: financialTotals.moneyIn,
            moneyOut: financialTotals.moneyOut,
            gross: financialTotals.gross,
          }}
          loading={loading || cabinetsLoading}
          title={`Financial Metrics for ${locationName || 'Location'}`}
          disableCurrencyConversion={true}
        />
      </div>

      {/* Chart Section: Location-specific metrics chart */}
      <div className="mt-4">
        {/* Granularity Selector - Only show for Today/Yesterday */}
        {showGranularitySelector && (
          <div className="mb-3 flex items-center justify-end gap-2">
            <label
              htmlFor="chart-granularity-location"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Granularity:
            </label>
            <select
              id="chart-granularity-location"
              value={chartGranularity}
              onChange={e =>
                setChartGranularity(e.target.value as 'hourly' | 'minute')
              }
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="minute">Minute</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>
        )}
        <Chart
          loadingChartData={loadingChartData}
          chartData={chartData}
          activeMetricsFilter={activeMetricsFilter as TimePeriod}
        />
      </div>

      {/* Date Filters and Machine Status Section: Responsive layout for filters and status */}
      <div className="mt-4">
        {/* Desktop and md: Side by side layout */}
        <div className="hidden items-center justify-between gap-4 md:flex">
          <div className="min-w-0 flex-1">
            <DashboardDateFilters
              onCustomRangeGo={handleRefresh}
              hideAllTime={false}
              showQuarterly={true}
              enableTimeInputs={true}
            />
          </div>
          <div className="ml-4 w-auto flex-shrink-0">
            <MachineStatusWidget
              isLoading={machineStatsLoading || membershipStatsLoading}
              onlineCount={machineStats?.onlineMachines || 0}
              offlineCount={machineStats?.offlineMachines || 0}
              totalCount={machineStats?.totalMachines}
              showTotal={true}
              membershipCount={membershipStats?.membershipCount || 0}
              showMembership={true}
            />
          </div>
        </div>

        {/* Mobile: Stacked layout */}
        <div className="flex flex-col gap-4 md:hidden">
          <div className="w-full">
            <DashboardDateFilters
              onCustomRangeGo={handleRefresh}
              hideAllTime={false}
              showQuarterly={true}
              enableTimeInputs={true}
            />
          </div>
          <div className="w-full">
            <MachineStatusWidget
              isLoading={machineStatsLoading || membershipStatsLoading}
              onlineCount={machineStats?.onlineMachines || 0}
              offlineCount={machineStats?.offlineMachines || 0}
              totalCount={machineStats?.totalMachines}
              showTotal={true}
              membershipCount={membershipStats?.membershipCount || 0}
              showMembership={true}
            />
          </div>
        </div>
      </div>

      {/* Search and Location Selection Section: Desktop search bar with location dropdown */}
      <div className="mt-4 hidden bg-buttonActive p-4 md:flex">
        {/* Search Input, Sort, and Filters on same row */}
        <div className="flex w-full flex-wrap items-center gap-4">
          {/* Search Input - Takes available space */}
          <div className="relative min-w-0 flex-1">
            <Input
              type="text"
              placeholder="Search machines (Asset, SMID, Serial, Game)..."
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:border-buttonActive focus:ring-buttonActive"
              value={searchTerm}
              disabled={loading || cabinetsLoading || refreshing}
              onChange={e => handleSearchChange(e.target.value)}
            />
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Filter Buttons - On the right, wrap when needed */}
          <div className="flex flex-wrap items-center gap-4">
            {showLocationSelect && (
              <div className="w-auto min-w-[180px] max-w-[220px] flex-shrink-0">
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
            <div className="w-auto min-w-[180px] max-w-[200px] flex-shrink-0">
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
            <div className="w-auto min-w-[120px] max-w-[150px] flex-shrink-0">
              <CustomSelect
                value={selectedStatus}
                onValueChange={value =>
                  handleFilterChange(value as 'All' | 'Online' | 'Offline')
                }
                options={[
                  { value: 'All', label: 'All Machines' },
                  { value: 'Online', label: 'Online' },
                  { value: 'Offline', label: 'Offline' },
                ]}
                placeholder="All Status"
                className="w-full"
                triggerClassName="h-9 bg-white border border-gray-300 rounded-md px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
                searchable={true}
                emptyMessage="No status options found"
              />
            </div>
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
            disabled={loading || cabinetsLoading || refreshing}
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
            <div className="relative w-32 flex-shrink-0">
              <CustomSelect
                value={selectedStatus}
                onValueChange={value =>
                  handleFilterChange(value as 'All' | 'Online' | 'Offline')
                }
                options={[
                  { value: 'All', label: 'All Machines' },
                  { value: 'Online', label: 'Online' },
                  { value: 'Offline', label: 'Offline' },
                ]}
                placeholder="All Status"
                className="w-full"
                triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
                searchable={true}
                emptyMessage="No status options found"
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
                ]}
                placeholder="Sort by"
                className="w-full"
                triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm whitespace-nowrap"
                searchable={true}
                emptyMessage="No sort options found"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content Section: Main cabinet data display with responsive layouts */}
      <div className="w-full flex-1">
        {loading || cabinetsLoading ? (
          <>
            {/* Use CabinetTableSkeleton for lg+ only */}
            <div className="hidden lg:block">
              <CabinetTableSkeleton />
            </div>
            {/* Use CabinetCardsSkeleton for mobile and tablet (up to md) */}
            <div className="block lg:hidden">
              <CabinetCardsSkeleton />
            </div>
          </>
        ) : filteredCabinets.length === 0 ? (
          <div className="mt-10 text-center text-gray-500">
            No cabinets found
            {debouncedSearchTerm ? ' matching your search' : ''}.
          </div>
        ) : filteredCabinets == null ? (
          <div className="mt-10 text-center text-gray-500">
            Loading cabinets...
          </div>
        ) : (
          <>
            <div ref={tableRef}>
              <CabinetGrid
                filteredCabinets={
                  filteredCabinets
                    .filter(
                      cab => getSerialNumberIdentifier(cab) !== 'N/A'
                    )
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
              />
            </div>

            {!loading && effectiveTotalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={effectiveTotalPages}
                setCurrentPage={setCurrentPage}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}

