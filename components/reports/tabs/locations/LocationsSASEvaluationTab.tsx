/**
 * Locations SAS Evaluation Tab Component
 *
 * Displays SAS evaluation dashboard with location selection, metrics, charts, and top machines
 *
 * Features:
 * - Location selection (SAS locations only, max 3)
 * - Location evaluation table
 * - Summary metrics cards
 * - Location trend charts (Money In, Win/Loss, Jackpot, Plays)
 * - Top 5 machines table
 * - Export functionality
 */

'use client';

import {
  Activity,
  BarChart3,
  ChevronDown,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Monitor,
  RefreshCw,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { toast } from 'sonner';

import EnhancedLocationTable from '@/components/reports/common/EnhancedLocationTable';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import LocationMultiSelect from '@/components/ui/common/LocationMultiSelect';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LocationTrendChart } from '@/components/ui/LocationTrendChart';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LocationsSASEvaluationSkeleton,
  MachineHourlyChartsSkeleton,
  SummaryCardsSkeleton,
  TopMachinesTableSkeleton,
} from '@/components/ui/skeletons/ReportsSkeletons';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { DashboardTotals } from '@/lib/types';
import { TimePeriod } from '@/lib/types/api';
import { AggregatedLocation } from '@/lib/types/location';
import {
  getGrossColorClass,
  getMoneyInColorClass,
  getMoneyOutColorClass,
} from '@/lib/utils/financialColors';
import { MachineData } from '@/shared/types/machines';

type LocationsSASEvaluationTabProps = {
  // Data
  paginatedLocations: AggregatedLocation[];
  allLocationsForDropdown: AggregatedLocation[];
  selectedSasLocations: string[];
  metricsTotals: DashboardTotals | null;
  locationTrendData: {
    trends: Array<{
      day: string;
      time?: string;
      [locationId: string]:
        | {
            handle: number;
            winLoss: number;
            jackpot: number;
            plays: number;
            drop: number;
            gross: number;
          }
        | string
        | undefined;
    }>;
    locations: string[];
    locationNames?: Record<string, string>;
    isHourly?: boolean;
  } | null;
  topMachinesData: MachineData[];
  // Pagination
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  // Loading states
  paginationLoading: boolean;
  locationsLoading: boolean;
  metricsLoading: boolean;
  metricsTotalsLoading: boolean;
  locationTrendLoading: boolean;
  topMachinesLoading: boolean;
  bottomMachinesLoading: boolean;
  // Actions
  onRefresh: () => Promise<void>;
  onExportSASEvaluation: (format: 'pdf' | 'excel') => void;
  onSelectionChange: (selectedIds: string[]) => void;
  onClearSelection: () => void;
  // Chart settings
  chartGranularity: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly';
  onGranularityChange: (granularity: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly') => void;
  showGranularitySelector: boolean;
  itemsPerPage: number;
};

/**
 * Locations SAS Evaluation Tab Component
 */
export default function LocationsSASEvaluationTab({
  paginatedLocations,
  allLocationsForDropdown,
  selectedSasLocations,
  metricsTotals,
  locationTrendData,
  topMachinesData,
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  paginationLoading,
  locationsLoading,
  metricsLoading,
  metricsTotalsLoading,
  locationTrendLoading,
  topMachinesLoading,
  bottomMachinesLoading,
  onRefresh,
  onExportSASEvaluation,
  onSelectionChange,
  onClearSelection,
  chartGranularity,
  onGranularityChange,
  showGranularitySelector,
  itemsPerPage,
}: LocationsSASEvaluationTabProps) {
  const router = useRouter();
  const { formatAmount, shouldShowCurrency } = useCurrencyFormat();
  const { activeMetricsFilter } = useDashBoardStore();

  // Calculate display totals from selected locations
  const displayTotals = useMemo(() => {
    if (selectedSasLocations.length === 0) {
      return metricsTotals;
    }

    const filteredLocations = paginatedLocations.filter(loc =>
      selectedSasLocations.includes(loc.location)
    );

    return {
      gross: filteredLocations.reduce(
        (sum, loc) => sum + ((loc.gross as number) || 0),
        0
      ),
      moneyIn: filteredLocations.reduce(
        (sum, loc) => sum + ((loc.moneyIn as number) || 0),
        0
      ),
      moneyOut: filteredLocations.reduce(
        (sum, loc) => sum + ((loc.moneyOut as number) || 0),
        0
      ),
    };
  }, [selectedSasLocations, paginatedLocations, metricsTotals]);

  // Filter SAS locations for dropdown
  const sasLocations = useMemo(() => {
    return allLocationsForDropdown
      .filter(loc => (loc.sasMachines as number) > 0)
      .map(loc => ({
        id: loc.location as string,
        name: loc.locationName,
        sasEnabled: (loc.sasMachines as number) > 0,
      }));
  }, [allLocationsForDropdown]);

  return (
    <div className="space-y-6">
      {/* Header with Export Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 sm:text-2xl">
            SAS Evaluation Dashboard
          </h3>
          <p className="mt-1 text-xs text-gray-600 sm:text-sm">
            Comprehensive location evaluation with interactive filtering and
            real-time data visualization
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={
              paginationLoading ||
              locationsLoading ||
              metricsLoading ||
              topMachinesLoading ||
              metricsTotalsLoading
            }
            className="flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                paginationLoading ||
                locationsLoading ||
                metricsLoading ||
                topMachinesLoading ||
                metricsTotalsLoading
                  ? 'animate-spin'
                  : ''
              }`}
            />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex w-full items-center justify-center gap-2 sm:w-auto"
              >
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onExportSASEvaluation('pdf')}
                className="cursor-pointer"
              >
                <FileText className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onExportSASEvaluation('excel')}
                className="cursor-pointer"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Location Selection Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Location Selection & Controls
          </CardTitle>
          <CardDescription>
            Select up to 3 SAS-enabled locations to filter data (SAS locations
            only)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Select SAS Locations (Max 3)
              </label>
              {locationsLoading && allLocationsForDropdown.length === 0 ? (
                <div className="h-10 w-full animate-pulse rounded-md bg-gray-100" />
              ) : (
                <LocationMultiSelect
                  locations={sasLocations}
                  selectedLocations={selectedSasLocations}
                  onSelectionChange={newSelection => {
                    if (newSelection.length <= 3) {
                      onSelectionChange(newSelection);
                    } else {
                      toast.error('Maximum 3 locations can be selected', {
                        duration: 3000,
                      });
                    }
                  }}
                  placeholder="Choose SAS locations to filter..."
                  maxSelections={3}
                />
              )}
            </div>
            <div className="flex items-end sm:col-span-1">
              <Button
                variant="outline"
                onClick={onClearSelection}
                className="w-full"
              >
                Clear Selection
              </Button>
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <div className="w-full text-sm text-gray-600">
                {selectedSasLocations.length > 0
                  ? `${selectedSasLocations.length} location${
                      selectedSasLocations.length > 1 ? 's' : ''
                    } selected`
                  : 'Please select locations to view data'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Show skeleton loaders when data is loading */}
      {metricsLoading ||
      paginationLoading ||
      locationsLoading ||
      metricsTotalsLoading ? (
        <LocationsSASEvaluationSkeleton />
      ) : selectedSasLocations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              Please select locations to view data
            </p>
          </CardContent>
        </Card>
      ) : selectedSasLocations.length > 0 &&
        paginatedLocations.length === 0 &&
        !metricsLoading &&
        !paginationLoading &&
        !locationsLoading &&
        !metricsTotalsLoading ? (
        // Show skeleton when locations are selected but data hasn't loaded yet
        // This handles the brief moment when loading states are false but data hasn't arrived
        <LocationsSASEvaluationSkeleton />
      ) : paginatedLocations.length > 0 ? (
        <>
          {/* Enhanced Location Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Location Evaluation Table
              </CardTitle>
              <CardDescription>
                Comprehensive location metrics with SAS status indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedLocationTable
                key={`enhanced-table-sas-${paginatedLocations.length}`}
                locations={paginatedLocations.map(loc => ({
                  location: loc.location,
                  locationName: loc.locationName,
                  moneyIn: loc.moneyIn,
                  moneyOut: loc.moneyOut,
                  gross: loc.gross,
                  coinIn: loc.coinIn || 0,
                  coinOut: loc.coinOut || 0,
                  jackpot: loc.jackpot || 0,
                  totalMachines: loc.totalMachines,
                  onlineMachines: loc.onlineMachines,
                  sasMachines: loc.sasMachines,
                  nonSasMachines: loc.nonSasMachines,
                  hasSasMachines: loc.hasSasMachines,
                  hasNonSasMachines: loc.hasNonSasMachines,
                  isLocalServer: loc.isLocalServer,
                  noSMIBLocation: !loc.hasSasMachines,
                  hasSmib: loc.hasSasMachines,
                  gamesPlayed: loc.gamesPlayed,
                }))}
                onLocationClick={locationId => {
                  console.warn(`Location clicked: ${locationId}`);
                }}
                loading={paginationLoading}
                error={null}
                currentPage={currentPage + 1}
                totalPages={totalPages}
                totalCount={totalCount}
                onPageChange={page => onPageChange(page - 1)}
                itemsPerPage={itemsPerPage}
              />
            </CardContent>
          </Card>

          {/* Summary Cards for SAS Evaluation */}
          {paginatedLocations.length > 0 &&
            (locationsLoading || metricsTotalsLoading ? (
              <SummaryCardsSkeleton />
            ) : (
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Net Win (Gross)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${getGrossColorClass(
                        displayTotals?.gross || 0
                      )}`}
                    >
                      {metricsTotalsLoading ? (
                        <Skeleton className="h-8 w-24" />
                      ) : shouldShowCurrency() ? (
                        formatAmount(displayTotals?.gross || 0)
                      ) : (
                        `$${(displayTotals?.gross || 0).toLocaleString()}`
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      (Green if positive, Red if negative)
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Money In
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${getMoneyInColorClass()}`}
                    >
                      {metricsTotalsLoading ? (
                        <Skeleton className="h-8 w-24" />
                      ) : shouldShowCurrency() ? (
                        formatAmount(displayTotals?.moneyIn || 0)
                      ) : (
                        `$${(displayTotals?.moneyIn || 0).toLocaleString()}`
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total money in this period
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Money Out
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${getMoneyOutColorClass(
                        displayTotals?.moneyOut || 0,
                        displayTotals?.moneyIn || 0
                      )}`}
                    >
                      {metricsTotalsLoading ? (
                        <Skeleton className="h-8 w-24" />
                      ) : shouldShowCurrency() ? (
                        formatAmount(displayTotals?.moneyOut || 0)
                      ) : (
                        `$${(displayTotals?.moneyOut || 0).toLocaleString()}`
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total money out this period
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="break-words text-lg font-bold text-blue-600 sm:text-xl lg:text-2xl">
                      {(() => {
                        const filteredLocations =
                          selectedSasLocations.length > 0
                            ? paginatedLocations.filter(loc =>
                                selectedSasLocations.includes(loc.location)
                              )
                            : [];
                        const onlineMachines = filteredLocations.reduce(
                          (sum, loc) => sum + (loc.onlineMachines || 0),
                          0
                        );
                        const totalMachines = filteredLocations.reduce(
                          (sum, loc) => sum + (loc.totalMachines || 0),
                          0
                        );
                        return `${onlineMachines}/${totalMachines}`;
                      })()}
                    </div>
                    <p className="break-words text-xs text-muted-foreground sm:text-sm">
                      Online Machines
                    </p>
                    <Progress
                      value={(() => {
                        const onlineMachines = paginatedLocations.reduce(
                          (sum, loc) => sum + (loc.onlineMachines || 0),
                          0
                        );
                        const totalMachines = paginatedLocations.reduce(
                          (sum, loc) => sum + (loc.totalMachines || 0),
                          0
                        );
                        return totalMachines > 0
                          ? (onlineMachines / totalMachines) * 100
                          : 0;
                      })()}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>
              </div>
            ))}

          {/* Location Trend Charts */}
          <div className="space-y-6">
            {(() => {
              const hasSelectedLocations = selectedSasLocations.length > 0;
              const isInitialLoading = metricsLoading || paginationLoading;

              // Check if we have valid trend data
              const hasValidTrendData =
                locationTrendData &&
                locationTrendData.locations &&
                locationTrendData.locations.length > 0 &&
                locationTrendData.trends &&
                locationTrendData.trends.length > 0;

              // Show skeleton if:
              // 1. Not initial loading AND
              // 2. Has selected locations AND
              // 3. (Still loading trends OR no valid data yet)
              if (
                !isInitialLoading &&
                hasSelectedLocations &&
                (locationTrendLoading || !hasValidTrendData)
              ) {
                return <MachineHourlyChartsSkeleton />;
              }

              if (isInitialLoading) {
                return null;
              }

              // Show charts if we have valid data
              if (hasValidTrendData) {
                return (
                  <>
                    {/* Granularity Toggle */}
                    {showGranularitySelector && (
                      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <label
                          htmlFor="chart-granularity-location-evaluation"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Granularity:
                        </label>
                        <select
                          id="chart-granularity-location-evaluation"
                          value={chartGranularity}
                          onChange={e => {
                            const newGranularity = e.target.value as
                              | 'hourly'
                              | 'minute';
                            onGranularityChange(newGranularity);
                          }}
                          className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-auto dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                        >
                          <option value="minute">Minute</option>
                          <option value="hourly">Hourly</option>
                        </select>
                      </div>
                    )}

                    {/* Charts Row: Grid layout 2x2 on desktop, stacked on mobile */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <LocationTrendChart
                        title="Money In"
                        icon={<BarChart3 className="h-5 w-5" />}
                        data={locationTrendData.trends}
                        dataKey="drop"
                        locations={locationTrendData.locations}
                        locationNames={locationTrendData.locationNames}
                        colors={[
                          '#3b82f6',
                          '#ef4444',
                          '#10b981',
                          '#f59e0b',
                          '#8b5cf6',
                        ]}
                        formatter={value => `$${value.toLocaleString()}`}
                        isHourly={locationTrendData.isHourly}
                        timePeriod={
                          (activeMetricsFilter || 'Today') as TimePeriod
                        }
                        granularity={chartGranularity}
                      />

                      <LocationTrendChart
                        title="Win/Loss"
                        icon={<TrendingUp className="h-5 w-5" />}
                        data={locationTrendData.trends}
                        dataKey="gross"
                        locations={locationTrendData.locations}
                        locationNames={locationTrendData.locationNames}
                        colors={[
                          '#10b981',
                          '#ef4444',
                          '#3b82f6',
                          '#f59e0b',
                          '#8b5cf6',
                        ]}
                        formatter={value => `$${value.toLocaleString()}`}
                        isHourly={locationTrendData.isHourly}
                        timePeriod={
                          (activeMetricsFilter || 'Today') as TimePeriod
                        }
                        granularity={chartGranularity}
                      />

                      <LocationTrendChart
                        title="Jackpot"
                        icon={<Trophy className="h-5 w-5" />}
                        data={locationTrendData.trends}
                        dataKey="jackpot"
                        locations={locationTrendData.locations}
                        locationNames={locationTrendData.locationNames}
                        colors={[
                          '#f59e0b',
                          '#ef4444',
                          '#10b981',
                          '#3b82f6',
                          '#8b5cf6',
                        ]}
                        formatter={value => `$${value.toLocaleString()}`}
                        isHourly={locationTrendData.isHourly}
                        timePeriod={
                          (activeMetricsFilter || 'Today') as TimePeriod
                        }
                        granularity={chartGranularity}
                      />

                      <LocationTrendChart
                        title="Plays"
                        icon={<Activity className="h-5 w-5" />}
                        data={locationTrendData.trends}
                        dataKey="plays"
                        locations={locationTrendData.locations}
                        locationNames={locationTrendData.locationNames}
                        colors={[
                          '#8b5cf6',
                          '#ef4444',
                          '#10b981',
                          '#3b82f6',
                          '#f59e0b',
                        ]}
                        formatter={value => value.toLocaleString()}
                        isHourly={locationTrendData.isHourly}
                        timePeriod={
                          (activeMetricsFilter || 'Today') as TimePeriod
                        }
                        granularity={chartGranularity}
                      />
                    </div>
                  </>
                );
              }

              return (
                <div className="py-8 text-center text-muted-foreground">
                  Select locations to view location trend data
                </div>
              );
            })()}
          </div>

          {/* Top 5 Machines Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-600" />
                Top 5 Machines
              </CardTitle>
              <CardDescription>
                Highest performing machines by revenue and hold percentage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const hasSelectedLocations = selectedSasLocations.length > 0;
                const isInitialLoading = metricsLoading || paginationLoading;

                // Show skeleton if:
                // 1. Not initial loading AND
                // 2. Has selected locations AND
                // 3. (Still loading OR no data yet)
                if (
                  !isInitialLoading &&
                  hasSelectedLocations &&
                  (topMachinesLoading ||
                    bottomMachinesLoading ||
                    topMachinesData.length === 0)
                ) {
                  return <TopMachinesTableSkeleton />;
                }

                if (isInitialLoading) {
                  return null;
                }

                if (!hasSelectedLocations) {
                  return (
                    <div className="py-8 text-center text-muted-foreground">
                      Select locations to view machine data
                    </div>
                  );
                }

                if (topMachinesData.length > 0) {
                  return (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden overflow-x-auto md:block">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="p-3 text-left font-medium text-gray-700">
                                Location
                              </th>
                              <th className="p-3 text-left font-medium text-gray-700">
                                Machine
                              </th>
                              <th className="p-3 text-left font-medium text-gray-700">
                                Game
                              </th>
                              <th className="p-3 text-left font-medium text-gray-700">
                                Manufacturer
                              </th>
                              <th className="p-3 text-left font-medium text-gray-700">
                                Money In
                              </th>
                              <th className="p-3 text-left font-medium text-gray-700">
                                Win/Loss
                              </th>
                              <th className="p-3 text-left font-medium text-gray-700">
                                Jackpot
                              </th>
                              <th className="p-3 text-left font-medium text-gray-700">
                                Avg. Wag. per Game
                              </th>
                              <th className="p-3 text-left font-medium text-gray-700">
                                Actual Hold
                              </th>
                              <th className="p-3 text-left font-medium text-gray-700">
                                Theoretical Hold
                              </th>
                              <th className="p-3 text-left font-medium text-gray-700">
                                Games Played
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {topMachinesData.map((machine, index) => (
                              <tr
                                key={`${machine.machineId}-${index}`}
                                className="border-b hover:bg-gray-50"
                              >
                                <td className="p-3 text-left">
                                  {machine.locationId ? (
                                    <button
                                      onClick={() => {
                                        router.push(
                                          `/locations/${machine.locationId}`
                                        );
                                      }}
                                      className="group flex items-center gap-1.5 text-sm font-medium text-gray-900 transition-opacity hover:opacity-80"
                                    >
                                      <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                                        {machine.locationName}
                                      </span>
                                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                                    </button>
                                  ) : (
                                    <div className="text-sm font-medium text-gray-900">
                                      {machine.locationName}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-left">
                                  {machine.machineId ? (
                                    <button
                                      onClick={() => {
                                        router.push(
                                          `/cabinets/${machine.machineId}`
                                        );
                                      }}
                                      className="group flex items-center gap-1.5 font-mono text-sm text-gray-900 transition-opacity hover:opacity-80"
                                    >
                                      <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                                        {machine.serialNumber ||
                                          machine.customName ||
                                          machine.machineId}
                                      </span>
                                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                                    </button>
                                  ) : (
                                    <div className="font-mono text-sm text-gray-900">
                                      {machine.serialNumber ||
                                        machine.machineId}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-sm">
                                  {machine.gameTitle ? (
                                    machine.gameTitle
                                  ) : (
                                    <span className="text-red-600">
                                      (game name not provided)
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-sm">
                                  {machine.manufacturer}
                                </td>
                                <td className="p-3 text-sm font-medium">
                                  ${(machine.drop || 0).toLocaleString()}
                                </td>
                                <td
                                  className={`p-3 text-sm font-medium ${
                                    (machine.netWin || 0) >= 0
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                  }`}
                                >
                                  ${(machine.netWin || 0).toLocaleString()}
                                </td>
                                <td className="p-3 text-sm">
                                  ${(machine.jackpot || 0).toLocaleString()}
                                </td>
                                <td className="p-3 text-sm">
                                  $
                                  {machine.avgBet
                                    ? machine.avgBet.toFixed(2)
                                    : '0.00'}
                                </td>
                                <td className="p-3 text-sm font-medium text-gray-600">
                                  {machine.actualHold != null &&
                                  !isNaN(machine.actualHold)
                                    ? machine.actualHold.toFixed(2) + '%'
                                    : 'N/A'}
                                </td>
                                <td className="p-3 text-sm text-gray-600">
                                  {machine.theoreticalHold != null &&
                                  !isNaN(machine.theoreticalHold)
                                    ? machine.theoreticalHold.toFixed(2) + '%'
                                    : 'N/A'}
                                </td>
                                <td className="p-3 text-sm">
                                  {(machine.gamesPlayed || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="space-y-4 md:hidden">
                        {topMachinesData.map((machine, index) => (
                          <Card
                            key={`${machine.machineId}-${index}`}
                            className="p-4"
                          >
                            <div className="mb-3">
                              <h4 className="text-sm font-medium">
                                {machine.machineName}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {machine.locationName} •{' '}
                                {machine.gameTitle ? (
                                  machine.gameTitle
                                ) : (
                                  <span className="text-red-600">
                                    (game name not provided)
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Manufacturer:
                                </span>
                                <span className="font-medium">
                                  {machine.manufacturer}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Money In:
                                </span>
                                <span className="font-medium">
                                  ${(machine.drop || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Win/Loss:
                                </span>
                                <span
                                  className={`font-medium ${
                                    (machine.netWin || 0) >= 0
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                  }`}
                                >
                                  ${(machine.netWin || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Avg. Wag. per Game:
                                </span>
                                <span className="font-medium">
                                  $
                                  {machine.avgBet
                                    ? machine.avgBet.toFixed(2)
                                    : '0.00'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Actual Hold:
                                </span>
                                <span className="font-medium text-gray-600">
                                  {machine.actualHold != null &&
                                  !isNaN(machine.actualHold)
                                    ? machine.actualHold.toFixed(2) + '%'
                                    : 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Games Played:
                                </span>
                                <span className="font-medium">
                                  {(machine.gamesPlayed || 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </>
                  );
                }

                return (
                  <div className="py-8 text-center text-muted-foreground">
                    No machine data available for evaluation
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </>
      ) : locationsLoading || paginationLoading ? (
        <LocationsSASEvaluationSkeleton />
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mb-2 text-lg text-gray-500">No Data to Display</div>
            <div className="text-sm text-gray-400">
              Please select up to 3 SAS-enabled locations to view evaluation
              data
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
