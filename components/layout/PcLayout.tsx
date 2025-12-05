/**
 * PC Layout Component
 * Dashboard layout optimized for desktop devices (hidden on mobile).
 *
 * Features:
 * - Date filters with custom date range support
 * - Machine status widget (online/offline counts)
 * - Refresh button for data reload
 * - Financial metrics cards with currency formatting
 * - Interactive charts (bar/line charts)
 * - Map preview of gaming locations
 * - Top performing section with tabs and sorting
 * - Pie chart visualization
 * - Skeleton loading states
 * - No data messages
 * - Currency conversion support
 *
 * @param props - PcLayoutProps including data, loading states, and handlers
 */
'use client';

import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import TopPerformingLocationModal from '@/components/modals/TopPerformingLocationModal';
import TopPerformingMachineModal from '@/components/modals/TopPerformingMachineModal';
import Chart from '@/components/ui/dashboard/Chart';
import MapPreview from '@/components/ui/MapPreview';
import { RefreshButtonSkeleton } from '@/components/ui/skeletons/ButtonSkeletons';
import {
  DashboardChartSkeleton,
  DashboardFinancialMetricsSkeleton,
  DashboardTopPerformingSkeleton,
} from '@/components/ui/skeletons/DashboardSkeletons';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { TopPerformingItem } from '@/lib/types';
import { PcLayoutProps } from '@/lib/types/componentProps';
import { formatCurrency } from '@/lib/utils/currency';
import {
  getGrossColorClass,
  getMoneyInColorClass,
  getMoneyOutColorClass,
} from '@/lib/utils/financialColors';
import { getLicenseeName } from '@/lib/utils/licenseeMapping';
import axios from 'axios';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

export default function PcLayout(props: PcLayoutProps) {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const router = useRouter();
  const [selectedMachine, setSelectedMachine] = useState<{
    machineId?: string;
    locationId?: string;
    machineName?: string;
    locationName?: string;
    game?: string;
    isLocation?: boolean;
  } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    locationId?: string;
    locationName?: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const { activeMetricsFilter, customDateRange, selectedLicencee } =
    useDashBoardStore();
  const { shouldShowCurrency, displayCurrency } = useCurrencyFormat();
  const licenseeName =
    getLicenseeName(selectedLicencee) || selectedLicencee || 'any licensee';

  // ============================================================================
  // Helper Functions
  // ============================================================================
  // Format amount with currency code (BBD) instead of symbol (Bds$)
  const formatAmountWithCode = (amount: number, currency: string) => {
    const hasDecimals = amount % 1 !== 0;
    const decimalPart = Math.abs(amount % 1);
    const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;

    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: hasSignificantDecimals ? 2 : 0,
      maximumFractionDigits: hasSignificantDecimals ? 2 : 0,
    }).format(amount);

    return `${currency} ${formatted}`;
  };

  // ============================================================================
  // Helper Components
  // ============================================================================
  const NoDataMessage = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center rounded-lg bg-container p-8 shadow-md">
      <div className="mb-2 text-lg text-gray-500">No Data Available</div>
      <div className="text-center text-sm text-gray-400">{message}</div>
    </div>
  );

  // ============================================================================
  // State - Location Aggregates
  // ============================================================================
  // State for aggregated location data
  const [locationAggregates, setLocationAggregates] = useState<
    Record<string, unknown>[]
  >([]);
  const [aggLoading, setAggLoading] = useState(true);

  // Track fetch to prevent duplicate calls
  const lastAggFetchRef = useRef<string>('');
  const aggFetchInProgressRef = useRef(false);

  // Only fetch locationAggregation for MapPreview when needed
  useEffect(() => {
    let aborted = false;
    const fetchAgg = async () => {
      // Only fetch if we have a valid activeMetricsFilter - no fallback
      if (!activeMetricsFilter) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '⚠️ No activeMetricsFilter available in PcLayout, skipping locationAggregation fetch'
          );
        }
        setLocationAggregates([]);
        setAggLoading(false);
        return;
      }

      // Create unique key for this fetch
      const fetchKey = `${activeMetricsFilter}-${selectedLicencee}-${customDateRange?.startDate?.getTime()}-${customDateRange?.endDate?.getTime()}`;

      // Skip if this exact fetch is already in progress
      if (
        aggFetchInProgressRef.current &&
        lastAggFetchRef.current === fetchKey
      ) {
        return;
      }

      // Mark as in progress and update key
      aggFetchInProgressRef.current = true;
      lastAggFetchRef.current = fetchKey;

      setAggLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('timePeriod', activeMetricsFilter);

        // Add custom date range if applicable
        if (activeMetricsFilter === 'Custom' && customDateRange) {
          if (customDateRange.startDate && customDateRange.endDate) {
            const sd =
              customDateRange.startDate instanceof Date
                ? customDateRange.startDate
                : new Date(customDateRange.startDate as unknown as string);
            const ed =
              customDateRange.endDate instanceof Date
                ? customDateRange.endDate
                : new Date(customDateRange.endDate as unknown as string);
            params.append('startDate', sd.toISOString());
            params.append('endDate', ed.toISOString());
          }
        }

        // Add licensee filter if applicable
        if (selectedLicencee && selectedLicencee !== 'all') {
          params.append('licencee', selectedLicencee);
        }

        const res = await axios.get(
          `/api/locationAggregation?${params.toString()}`
        );
        const json = res.data;
        if (!aborted) setLocationAggregates(json.data || []);
      } catch {
        if (!aborted) setLocationAggregates([]);
      } finally {
        if (!aborted) {
          setAggLoading(false);
          aggFetchInProgressRef.current = false;
        }
      }
    };
    fetchAgg();
    return () => {
      aborted = true;
    };
  }, [activeMetricsFilter, customDateRange, selectedLicencee]);

  // ============================================================================
  // Render - Desktop Dashboard Layout
  // ============================================================================
  return (
    <div className="hidden md:block">
      <div className="grid grid-cols-5 gap-6">
        {/* Left Section (Dashboard Content) - 60% Width (3/5 columns) */}
        <div className="col-span-3 space-y-6">
          {/* Date Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <DashboardDateFilters hideAllTime={true} />
          </div>

          {/* Metrics Description Text */}
          <div className="flex items-center gap-2">
            <h2 className="text-lg text-gray-700">
              Total for all Locations and Machines
            </h2>
            {props.loadingChartData ? (
              <RefreshButtonSkeleton />
            ) : (
              <div
                className={`flex cursor-pointer select-none items-center gap-2 rounded-md bg-buttonActive px-4 py-2 text-white transition-opacity ${
                  props.loadingChartData || props.refreshing
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:bg-buttonActive/90'
                }`}
                onClick={() => {
                  if (!(props.loadingChartData || props.refreshing))
                    props.onRefresh();
                }}
                aria-disabled={props.loadingChartData || props.refreshing}
                tabIndex={0}
                role="button"
              >
                <RefreshCw
                  className={`h-4 w-4 ${props.refreshing ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span className="font-semibold">Refresh</span>
              </div>
            )}
          </div>

          {/* Financial Metrics Cards */}
          {props.loadingChartData ? (
            <DashboardFinancialMetricsSkeleton />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {/* Money In Card */}
              <div className="flex min-h-[120px] flex-col justify-center rounded-lg bg-gradient-to-b from-white to-transparent px-4 py-4 text-center shadow-md sm:px-6 sm:py-6">
                <p className="mb-2 text-xs font-medium text-gray-500 sm:text-sm md:text-base lg:text-lg">
                  Money In
                </p>
                <div className="my-2 h-[4px] w-full rounded-full bg-buttonActive"></div>
                <div className="flex flex-1 items-center justify-center">
                  <p
                    className={`overflow-hidden break-words text-sm font-bold sm:text-base md:text-lg lg:text-xl ${getMoneyInColorClass(
                      props.totals?.moneyIn
                    )}`}
                  >
                    {props.totals
                      ? shouldShowCurrency()
                        ? formatAmountWithCode(
                            props.totals.moneyIn,
                            displayCurrency
                          )
                        : formatCurrency(props.totals.moneyIn)
                      : '--'}
                  </p>
                </div>
              </div>
              {/* Money Out Card */}
              <div className="flex min-h-[120px] flex-col justify-center rounded-lg bg-gradient-to-b from-white to-transparent px-4 py-4 text-center shadow-md sm:px-6 sm:py-6">
                <p className="mb-2 text-xs font-medium text-gray-500 sm:text-sm md:text-base lg:text-lg">
                  Money Out
                </p>
                <div className="my-2 h-[4px] w-full rounded-full bg-lighterBlueHighlight"></div>
                <div className="flex flex-1 items-center justify-center">
                  <p
                    className={`overflow-hidden break-words text-sm font-bold sm:text-base md:text-lg lg:text-xl ${getMoneyOutColorClass(
                      props.totals?.moneyOut,
                      props.totals?.moneyIn
                    )}`}
                  >
                    {props.totals
                      ? shouldShowCurrency()
                        ? formatAmountWithCode(
                            props.totals.moneyOut,
                            displayCurrency
                          )
                        : formatCurrency(props.totals.moneyOut)
                      : '--'}
                  </p>
                </div>
              </div>
              {/* Gross Card - Will wrap to new line when space is limited */}
              <div className="flex min-h-[120px] flex-col justify-center rounded-lg bg-gradient-to-b from-white to-transparent px-4 py-4 text-center shadow-md sm:px-6 sm:py-6 md:col-span-2 lg:col-span-2 xl:col-span-1">
                <p className="mb-2 text-xs font-medium text-gray-500 sm:text-sm md:text-base lg:text-lg">
                  Gross
                </p>
                <div className="my-2 h-[4px] w-full rounded-full bg-orangeHighlight"></div>
                <div className="flex flex-1 items-center justify-center">
                  <p
                    className={`overflow-hidden break-words text-sm font-bold sm:text-base md:text-lg lg:text-xl ${getGrossColorClass(
                      props.totals?.gross
                    )}`}
                  >
                    {props.totals
                      ? shouldShowCurrency()
                        ? formatAmountWithCode(
                            props.totals.gross,
                            displayCurrency
                          )
                        : formatCurrency(props.totals.gross)
                      : '--'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Trend Chart Section */}
          {props.loadingChartData ? (
            <DashboardChartSkeleton />
          ) : (
            <div className="rounded-lg bg-container p-6 shadow-md">
              <Chart
                loadingChartData={props.loadingChartData}
                chartData={props.chartData}
                activeMetricsFilter={props.activeMetricsFilter}
              />
            </div>
          )}
        </div>

        {/* Right Section (Map & Status) - 40% Width (2/5 columns) */}
        <div className="col-span-2 space-y-6">
          {/* Map Preview Section */}
          <div className="rounded-lg bg-container p-6 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Location Map</h3>
              {aggLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
                  <span>Updating financial data...</span>
                </div>
              )}
            </div>

            {aggLoading ? (
              <div className="relative w-full rounded-lg bg-container p-4 shadow-md">
                <div className="skeleton-bg mt-2 h-48 w-full animate-pulse rounded-lg"></div>
              </div>
            ) : (
              <MapPreview
                gamingLocations={props.gamingLocations}
                locationAggregates={locationAggregates}
                aggLoading={aggLoading}
              />
            )}
          </div>

          {/* Top Performing Section */}
          <div className="rounded-lg bg-container p-6 shadow-md">
            {props.loadingTopPerforming ? (
              <DashboardTopPerformingSkeleton />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Top Performing</h2>
                  {/* Date filter removed - now synced with chart/metrics filters */}
                </div>

                {/* Tabs with curved design matching mobile */}
                <div
                  className={`relative flex flex-col ${
                    props.activeTab === 'locations'
                      ? 'bg-container'
                      : 'bg-buttonActive'
                  } w-full rounded-lg rounded-tl-3xl rounded-tr-3xl shadow-md`}
                >
                  <div className="flex">
                    <button
                      className={`w-full rounded-tl-xl rounded-tr-3xl px-4 py-2 text-sm font-medium transition-colors ${
                        props.activeTab === 'locations'
                          ? 'bg-buttonActive text-white'
                          : 'bg-container text-gray-700'
                      } ${
                        props.activeTab !== 'locations' &&
                        props.loadingTopPerforming
                          ? 'cursor-not-allowed opacity-50'
                          : ''
                      }`}
                      onClick={() => {
                        if (
                          props.activeTab !== 'locations' &&
                          props.loadingTopPerforming
                        )
                          return;
                        props.setActiveTab('locations');
                      }}
                    >
                      Locations
                    </button>
                    <button
                      className={`w-full rounded-tr-3xl px-4 py-2 text-sm font-medium transition-colors ${
                        props.activeTab === 'Cabinets'
                          ? 'bg-buttonActive text-white'
                          : 'bg-container text-gray-700'
                      } ${
                        props.activeTab !== 'Cabinets' &&
                        props.loadingTopPerforming
                          ? 'cursor-not-allowed opacity-50'
                          : ''
                      }`}
                      onClick={() => {
                        if (
                          props.activeTab !== 'Cabinets' &&
                          props.loadingTopPerforming
                        )
                          return;
                        props.setActiveTab('Cabinets');
                      }}
                    >
                      Cabinets
                    </button>
                  </div>

                  {/* Content area */}
                  <div className="mb-0 rounded-lg rounded-tl-none rounded-tr-3xl bg-container p-6 shadow-sm">
                    {props.topPerformingData.length === 0 ? (
                      <NoDataMessage
                        message={`No metrics found for ${selectedLicencee === 'all' ? 'any licensee' : licenseeName}`}
                      />
                    ) : (
                      <div className="flex flex-col gap-6 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between">
                        <ul className="flex-1 space-y-2 lg:min-w-0">
                          {props.topPerformingData.map(
                            (item: TopPerformingItem, index: number) => {
                              // Debug: Log location data to verify locationId is present
                              if (
                                props.activeTab === 'locations' &&
                                process.env.NODE_ENV === 'development'
                              ) {
                                console.log(
                                  'Location item:',
                                  item,
                                  'has locationId:',
                                  item.locationId
                                );
                              }
                              return (
                                <li
                                  key={index}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <div
                                    className="h-4 w-4 flex-shrink-0 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                  ></div>
                                  {props.activeTab === 'Cabinets' &&
                                  item.machineId ? (
                                    <>
                                      <span className="flex-1 text-gray-700">
                                        {item.name}
                                      </span>
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          if (item.machineId) {
                                            setSelectedMachine({
                                              machineId: item.machineId,
                                              machineName: item.name,
                                              game: item.game,
                                              locationName: item.location,
                                              locationId: item.locationId,
                                              isLocation: false,
                                            });
                                            setIsModalOpen(true);
                                          }
                                        }}
                                        className="flex-shrink-0"
                                        title="View machine preview"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5 cursor-pointer text-gray-500 transition-transform hover:scale-110 hover:text-blue-600" />
                                      </button>
                                    </>
                                  ) : props.activeTab === 'locations' &&
                                    item.locationId ? (
                                    <>
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          if (item.locationId) {
                                            setSelectedLocation({
                                              locationId: item.locationId,
                                              locationName: item.name,
                                            });
                                            setIsLocationModalOpen(true);
                                          }
                                        }}
                                        className="flex-1 cursor-pointer text-left text-gray-700 hover:text-blue-600 hover:underline"
                                        title="View location preview"
                                      >
                                        {item.name}
                                      </button>
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          if (item.locationId) {
                                            setSelectedLocation({
                                              locationId: item.locationId,
                                              locationName: item.name,
                                            });
                                            setIsLocationModalOpen(true);
                                          }
                                        }}
                                        className="flex-shrink-0"
                                        title="View location preview"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5 cursor-pointer text-gray-500 transition-transform hover:scale-110 hover:text-blue-600" />
                                      </button>
                                    </>
                                  ) : (
                                    <span className="flex-1 text-gray-700">
                                      {item.name}
                                    </span>
                                  )}
                                </li>
                              );
                            }
                          )}
                        </ul>
                        <div className="mt-4 flex justify-center lg:mt-0 lg:flex-shrink-0 lg:justify-end">
                          <ResponsiveContainer width={160} height={160}>
                            <PieChart>
                              <Pie
                                data={props.topPerformingData}
                                dataKey="totalDrop"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={70}
                                labelLine={false}
                                label={props.renderCustomizedLabel}
                              >
                                {props.topPerformingData.map(
                                  (entry: TopPerformingItem, index: number) => (
                                    <Cell key={index} fill={entry.color} />
                                  )
                                )}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Machine Preview Modal */}
      {selectedMachine &&
        selectedMachine.machineId &&
        !selectedMachine.isLocation && (
          <TopPerformingMachineModal
            open={isModalOpen}
            machineId={selectedMachine.machineId}
            machineName={selectedMachine.machineName || ''}
            game={selectedMachine.game}
            locationName={selectedMachine.locationName}
            locationId={selectedMachine.locationId}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedMachine(null);
            }}
            onNavigate={() => {
              if (selectedMachine.machineId) {
                router.push(`/cabinets/${selectedMachine.machineId}`);
              }
            }}
          />
        )}

      {/* Location Preview Modal */}
      {selectedLocation && selectedLocation.locationId && (
        <TopPerformingLocationModal
          open={isLocationModalOpen}
          locationId={selectedLocation.locationId}
          locationName={selectedLocation.locationName || ''}
          onClose={() => {
            setIsLocationModalOpen(false);
            setSelectedLocation(null);
          }}
          onNavigate={() => {
            if (selectedLocation.locationId) {
              router.push(`/locations/${selectedLocation.locationId}`);
            }
          }}
        />
      )}
    </div>
  );
}
