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

import ReportsLocationsMap from '@/components/reports/tabs/locations/ReportsLocationsMap';
import ReportsLocationsTable from '@/components/reports/tabs/locations/ReportsLocationsTable';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PaginationControls from '@/components/ui/PaginationControls';
import { Progress } from '@/components/ui/progress';
import {
  SummaryCardsSkeleton,
  TopMachinesTableSkeleton,
} from '@/components/ui/skeletons/ReportsSkeletons';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { DashboardTotals } from '@/lib/types';
import { AggregatedLocation } from '@/lib/types/location';
import {
  getGrossColorClass,
  getMoneyInColorClass,
  getMoneyOutColorClass,
} from '@/lib/utils/financialColors';
import { TopLocation } from '@/shared/types';
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useMemo } from 'react';

export type ReportsLocationsOverviewProps = {
  // Data
  metricsTotals: DashboardTotals | null;
  metricsTotalsLoading: boolean;
  paginatedLocations: AggregatedLocation[];
  topLocations: TopLocation[];
  allLocationsForDropdown: AggregatedLocation[];
  gamingLocations: Record<string, unknown>[];
  gamingLocationsLoading: boolean;
  locationAggregates: Record<string, unknown>[];
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
  topLocations: _topLocations, // Kept for interface compatibility but not used (map now uses gamingLocations)
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
  const { formatAmount, shouldShowCurrency } = useCurrencyFormat();

  // Calculate online machines totals - use locationAggregates if available, otherwise fallback to allLocationsForDropdown
  const onlineMachinesData = useMemo(() => {
    const dataSource = (locationAggregates as AggregatedLocation[]).length > 0 
      ? (locationAggregates as AggregatedLocation[])
      : allLocationsForDropdown;
    
    const online = dataSource.reduce(
      (sum: number, loc: AggregatedLocation) =>
        sum + (loc.onlineMachines || 0),
      0
    );
    const total = dataSource.reduce(
      (sum: number, loc: AggregatedLocation) =>
        sum + (loc.totalMachines || 0),
      0
    );
    return { online, total, percentage: total > 0 ? (online / total) * 100 : 0 };
  }, [locationAggregates, allLocationsForDropdown]);

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
                  {shouldShowCurrency()
                    ? formatAmount(metricsTotals.gross || 0)
                    : `$${(metricsTotals.gross || 0).toLocaleString()}`}
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
                <div className={`truncate text-xl font-bold md:text-2xl ${getMoneyInColorClass()}`}>
                  {shouldShowCurrency()
                    ? formatAmount(metricsTotals.moneyIn || 0)
                    : `$${(metricsTotals.moneyIn || 0).toLocaleString()}`}
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
                <div
                  className={`truncate text-xl font-bold md:text-2xl ${getMoneyOutColorClass(metricsTotals.moneyOut || 0, metricsTotals.moneyIn || 0)}`}
                >
                  {shouldShowCurrency()
                    ? formatAmount(metricsTotals.moneyOut || 0)
                    : `$${(metricsTotals.moneyOut || 0).toLocaleString()}`}
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
            .map((location: Record<string, unknown>) => {
              // Extract coordinates from geoCoords (API format: { latitude, longitude })
              const geoCoords = location.geoCoords as
                | { latitude?: number; longitude?: number; lat?: number; lng?: number }
                | undefined;
              
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
              let stats: Record<string, unknown> | undefined;
              if (Array.isArray(locationAggregates) && locationAggregates.length > 0) {
                // Primary match: exact string comparison (same as dashboard MapPreview)
                stats = locationAggregates.find(
                  d => String(d.location) === locationId
                );
                
                // Fallback: try matching without string conversion (in case types match)
                if (!stats) {
                  stats = locationAggregates.find(d => d.location === locationId);
                }
                
                // Additional fallback: try matching _id field if location field doesn't match
                if (!stats) {
                  stats = locationAggregates.find(
                    d => String(d._id) === locationId
                  );
                }
                
                // Debug log for D'Fastlime to verify matching
                if (location.name === "D'Fastlime") {
                  console.log('🔍 [Map] D\'Fastlime matching:', {
                    locationId,
                    locationAggregatesCount: locationAggregates.length,
                    foundStats: stats,
                    statsMoneyIn: stats?.moneyIn,
                    statsGross: stats?.gross,
                    sampleAggregateLocation: locationAggregates[0]?.location,
                    sampleAggregateId: locationAggregates[0]?._id,
                    allLocationIds: locationAggregates.slice(0, 5).map((d: Record<string, unknown>) => ({
                      location: d.location,
                      _id: d._id,
                      name: d.locationName,
                    })),
                  });
                }
              } else if (location.name === "D'Fastlime") {
                console.warn('⚠️ [Map] D\'Fastlime: locationAggregates is empty or not an array', {
                  locationAggregates,
                  isArray: Array.isArray(locationAggregates),
                  length: Array.isArray(locationAggregates) ? locationAggregates.length : 'N/A',
                });
              }
              
              // Calculate performance based on revenue percentage
              const gross = (stats?.gross as number) ?? 0;
              const moneyIn = (stats?.moneyIn as number) ?? 0;
              const revenuePercent = moneyIn > 0 ? (gross / moneyIn) * 100 : 0;
              
              let performance: 'excellent' | 'good' | 'average' | 'poor' = 'average';
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
                name: (location.name as string) || 'Unknown Location',
                coordinates,
                performance,
                revenue: gross,
                moneyIn,
                moneyOut: (stats?.moneyOut as number) ?? 0,
                totalMachines: (stats?.totalMachines as number) ?? (location.totalMachines as number) ?? 0,
                onlineMachines: (stats?.onlineMachines as number) ?? (location.onlineMachines as number) ?? 0,
              };
            })
            .filter((loc): loc is NonNullable<typeof loc> => loc !== null);
        }, [gamingLocations, locationAggregates])}
        financialDataLoading={metricsLoading || locationsLoading || gamingLocationsLoading || locationAggregatesLoading}
        loading={locationsLoading || gamingLocationsLoading || locationAggregatesLoading}
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
          {paginationLoading || locationsLoading || gamingLocationsLoading || locationAggregatesLoading ? (
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
