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
import FinancialMetricsCards from '@/components/ui/FinancialMetricsCards';
import MapPreview from '@/components/ui/MapPreview';
import { RefreshButtonSkeleton } from '@/components/ui/skeletons/ButtonSkeletons';
import {
  DashboardChartSkeleton,
  DashboardTopPerformingSkeleton,
} from '@/components/ui/skeletons/DashboardSkeletons';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { TopPerformingItem } from '@/lib/types';
import { PcLayoutProps } from '@/lib/types/componentProps';
import { getLicenseeName } from '@/lib/utils/licenseeMapping';
import { deduplicateRequest } from '@/lib/utils/requestDeduplication';
import axios from 'axios';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  const licenseeName =
    getLicenseeName(selectedLicencee) || selectedLicencee || 'any licensee';

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

      // Create unique key for this fetch (used for deduplication)
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

      const requestKey = `/api/locationAggregation?${params.toString()}`;

      setAggLoading(true);
      try {
        // Use deduplication to prevent duplicate requests
        const json = await deduplicateRequest(requestKey, async signal => {
          const res = await axios.get(requestKey, { signal });
          return res.data;
        });

        if (!aborted) setLocationAggregates(json.data || []);
      } catch (error) {
        // Ignore abort errors (request was cancelled)
        if (!aborted && !axios.isCancel(error)) {
          setLocationAggregates([]);
        }
      } finally {
        if (!aborted) {
          setAggLoading(false);
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
          <FinancialMetricsCards
            totals={props.totals}
            loading={props.loadingChartData}
            title="Total for all Locations and Machines"
          />

          {/* Trend Chart Section */}
          {props.loadingChartData ? (
            <DashboardChartSkeleton />
          ) : (
            <div className="rounded-lg bg-container p-6 shadow-md">
              {/* Granularity Selector - Only show for Today/Yesterday/Custom */}
              {props.showGranularitySelector && (
                <div className="mb-3 flex items-center justify-end gap-2">
                  <label
                    htmlFor="chart-granularity-dashboard"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Granularity:
                  </label>
                  <select
                    id="chart-granularity-dashboard"
                    value={props.chartGranularity}
                    onChange={e =>
                      props.setChartGranularity?.(
                        e.target.value as 'hourly' | 'minute'
                      )
                    }
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <option value="minute">Minute</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>
              )}
              <Chart
                loadingChartData={props.loadingChartData}
                chartData={props.chartData}
                activeMetricsFilter={props.activeMetricsFilter}
                totals={props.totals}
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
            {props.loadingTopPerforming ||
            (!props.hasTopPerformingFetched &&
              props.topPerformingData.length === 0) ? (
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
                    {props.loadingTopPerforming ||
                    (!props.hasTopPerformingFetched &&
                      props.topPerformingData.length === 0) ? (
                      <DashboardTopPerformingSkeleton />
                    ) : props.topPerformingData.length === 0 ? (
                      <NoDataMessage
                        message={`No metrics found for ${selectedLicencee === 'all' ? 'any licensee' : licenseeName}`}
                      />
                    ) : (
                      <div className="flex flex-col gap-6 md:flex-col lg:flex-col xl:flex-row xl:flex-wrap xl:items-start xl:justify-between">
                        <ul className="flex-1 space-y-2 xl:min-w-0">
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
                        <div className="flex justify-center xl:flex-shrink-0 xl:justify-end">
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
