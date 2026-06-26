/**
 * Locations Overview Tab Component
 *
 * Displays overview of all locations with metrics, map, and top locations
 *
 * Features:
 * - Metrics overview cards
 * - Location map
 * - Top 5 locations
 * - Location table with pagination
 */

'use client';

import ReportsLocationsMap from '@/components/CMS/reports/tabs/locations/ReportsLocationsMap';
import ReportsLocationsTable from '@/components/CMS/reports/tabs/locations/ReportsLocationsTable';
import { Button } from '@/components/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import { Progress } from '@/components/shared/ui/progress';
import {
  SummaryCardsSkeleton,
  TopMachinesTableSkeleton,
} from '@/components/shared/ui/skeletons/ReportsSkeletons';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { DashboardTotals } from '@/lib/types';
import type { MapPreviewLocation } from '@/lib/types/components';
import { formatCurrencyWithCodeString } from '@/lib/utils/currency';
import { AggregatedLocation } from '@/lib/types/location';
import {
  getGrossColorClass,
  getMoneyInColorClass,
} from '@/lib/utils/financial';
import { MoneyOutCell } from '@/components/shared/ui/financial/MoneyOutCell';
import { TopLocation } from '@/shared/types';
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useMemo } from 'react';

type ReportsLocationsOverviewProps = {
  // Data
  metricsTotals: DashboardTotals | null;
  metricsTotalsLoading: boolean;
  paginatedLocations: AggregatedLocation[];
  topLocations: TopLocation[];
  allLocationsForDropdown: AggregatedLocation[];
  gamingLocations: MapPreviewLocation[];
  gamingLocationsLoading: boolean;
  locationAggregates: AggregatedLocation[];
  locationAggregatesLoading: boolean;
  // Pagination
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  // Loading states
  paginationLoading: boolean;
  locationsLoading: boolean;
  metricsLoading: boolean;
  // Actions
  onRefresh: () => Promise<void>;
  onExportLocationOverview?: (format: 'pdf' | 'excel') => Promise<void>;
};

/**
 * Reports Locations Overview Tab Component
 *
 * @module components/reports/tabs/locations/ReportsLocationsOverview
 */
export default function ReportsLocationsOverview({
  metricsTotals,
  metricsTotalsLoading,
  paginatedLocations,
  allLocationsForDropdown,
  gamingLocations,
  gamingLocationsLoading,
  locationAggregates,
  locationAggregatesLoading,
  currentPage,
  totalPages,
  onPageChange,
  paginationLoading,
  locationsLoading,
  metricsLoading,
  onRefresh,
  onExportLocationOverview,
}: ReportsLocationsOverviewProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { displayCurrency } = useCurrencyFormat();
  const formatCurrency = (val: number | null | undefined) =>
    formatCurrencyWithCodeString(val, displayCurrency);

  // ============================================================================
  // Computed
  // ============================================================================
  // Check if any location has includeJackpot and compute total jackpot
  const { anyIncludeJackpot, totalJackpot } = useMemo(() => {
    const dataSource =
      locationAggregates.length > 0
        ? locationAggregates
        : allLocationsForDropdown;
    const any = dataSource.some(loc => loc.includeJackpot);
    const jackpot = dataSource.reduce(
      (sum, loc) => sum + (loc.jackpot || 0),
      0
    );
    return { anyIncludeJackpot: any, totalJackpot: jackpot };
  }, [locationAggregates, allLocationsForDropdown]);

  // Calculate online machines totals - use locationAggregates if available, otherwise fallback to allLocationsForDropdown
  const onlineMachinesData = useMemo(() => {
    const dataSource =
      locationAggregates.length > 0
        ? locationAggregates
        : allLocationsForDropdown;

    const online = dataSource.reduce(
      (sum, loc) => sum + (loc.onlineMachines || 0),
      0
    );
    const total = dataSource.reduce(
      (sum, loc) => sum + (loc.totalMachines || 0),
      0
    );
    return {
      online,
      total,
      percentage: total > 0 ? (online / total) * 100 : 0,
    };
  }, [locationAggregates, allLocationsForDropdown]);

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Metrics Overview
        </h3>
        <div className="mb-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
        {metricsLoading || metricsTotalsLoading ? (
          <SummaryCardsSkeleton />
        ) : metricsTotals ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Gross Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`truncate text-xl font-bold md:text-2xl ${getGrossColorClass(metricsTotals.gross || 0)}`}
                >
                  {formatCurrency(metricsTotals.gross || 0)}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  Gross revenue this period
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Money In</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`truncate text-xl font-bold md:text-2xl ${getMoneyInColorClass()}`}
                >
                  {formatCurrency(metricsTotals.moneyIn || 0)}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  Total money in this period
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Money Out</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="truncate text-xl font-bold md:text-2xl">
                  <MoneyOutCell
                    moneyOut={metricsTotals.moneyOut || 0}
                    moneyIn={metricsTotals.moneyIn || 0}
                    jackpot={totalJackpot}
                    displayValue={formatCurrency(metricsTotals.moneyOut || 0)}
                    includeJackpot={anyIncludeJackpot}
                    showInfoIcon={true}
                  />
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  Total money out this period
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="truncate text-lg font-bold text-blue-600 sm:text-xl lg:text-2xl">
                  {`${onlineMachinesData.online}/${onlineMachinesData.total}`}
                </div>
                <p className="truncate text-xs text-muted-foreground sm:text-sm">
                  Online Machines
                </p>
                <Progress
                  value={onlineMachinesData.percentage}
                  className="mt-2"
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            No metrics data available
          </div>
        )}
      </div>

      {/* Interactive Map */}
      <ReportsLocationsMap
        key={`map-overview-${gamingLocations.length}-${locationAggregates.length}`}
        locations={useMemo(() => {
          // Map all gaming locations to LocationData format
          // Use locationAggregation data (same as dashboard) for financial metrics
          return gamingLocations
            .map((location) => {
              // Extract coordinates from geoCoords (API format: { latitude, longitude })
              const geoCoords = location.geoCoords;
              let coordinates: [number, number] | undefined;
              if (geoCoords) {
                const lat = geoCoords.lat ?? geoCoords.latitude;
                const lng = geoCoords.lng ?? geoCoords.longitude;
                if (
                  typeof lat === 'number' &&
                  typeof lng === 'number' &&
                  !isNaN(lat) &&
                  !isNaN(lng) &&
                  lat !== 0 &&
                  lng !== 0
                ) {
                  coordinates = [lat, lng];
                }
              }

              // Skip locations without valid coordinates
              if (!coordinates) {
                return null;
              }

              // Get financial data from locationAggregation (same as dashboard map)
              // Match by location._id with locationAggregates.location field
              const locationId = String(location._id || '');

              // Try multiple matching strategies to ensure we find the data
              let stats: AggregatedLocation | undefined;
              if (
                Array.isArray(locationAggregates) &&
                locationAggregates.length > 0
              ) {
                // Primary match: exact string comparison (same as dashboard MapPreview)
                stats = locationAggregates.find(
                  loc => String(loc.location) === locationId
                );

                // Fallback: try matching without string conversion (in case types match)
                if (!stats) {
                  stats = locationAggregates.find(
                    loc => loc.location === locationId
                  );
                }

                // Additional fallback: try matching _id field if location field doesn't match
                if (!stats) {
                  stats = locationAggregates.find(
                    loc => String(loc._id) === locationId
                  );
                }
              }

              // Calculate performance based on revenue percentage
              const gross = stats?.gross ?? 0;
              const moneyIn = stats?.moneyIn ?? 0;
              const revenuePercent = moneyIn > 0 ? (gross / moneyIn) * 100 : 0;

              let performance: 'excellent' | 'good' | 'average' | 'poor' =
                'average';
              if (revenuePercent > 20) {
                performance = 'excellent';
              } else if (revenuePercent >= 15) {
                performance = 'good';
              } else if (revenuePercent >= 10) {
                performance = 'average';
              } else {
                performance = 'poor';
              }

              return {
                id: locationId,
                name: location.name || 'Unknown Location',
                coordinates,
                performance,
                revenue: gross,
                moneyIn,
                moneyOut: stats?.moneyOut ?? 0,
                totalMachines:
                  stats?.totalMachines ??
                  location.totalMachines ??
                  0,
                onlineMachines:
                  stats?.onlineMachines ??
                  location.onlineMachines ??
                  0,
              };
            })
            .filter((loc): loc is NonNullable<typeof loc> => loc !== null);
        }, [gamingLocations, locationAggregates])}
        financialDataLoading={
          metricsLoading ||
          locationsLoading ||
          gamingLocationsLoading ||
          locationAggregatesLoading
        }
        loading={
          locationsLoading ||
          gamingLocationsLoading ||
          locationAggregatesLoading
        }
      />

      {/* Location Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                All Locations
              </CardTitle>
              <CardDescription>
                Complete list of all gaming locations with performance metrics
              </CardDescription>
            </div>
            {onExportLocationOverview && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      paginatedLocations.length === 0 || locationsLoading
                    }
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onExportLocationOverview('pdf')}
                    className="cursor-pointer"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onExportLocationOverview('excel')}
                    className="cursor-pointer"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {paginationLoading ||
          locationsLoading ||
          gamingLocationsLoading ||
          locationAggregatesLoading ? (
            <TopMachinesTableSkeleton />
          ) : paginatedLocations.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No locations found matching your criteria.
            </div>
          ) : (
            <>
              <ReportsLocationsTable locations={paginatedLocations} />
              <div className="mt-4">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  setCurrentPage={onPageChange}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
