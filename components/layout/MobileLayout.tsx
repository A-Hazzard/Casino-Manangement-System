/**
 * Mobile Layout Component
 * Dashboard layout optimized for mobile devices (hidden on xl+ screens).
 *
 * Features:
 * - Date filters with custom date range support
 * - Machine status widget (online/offline counts)
 * - Refresh button for data reload
 * - Financial metrics cards
 * - Interactive charts (bar/line charts)
 * - Map preview of gaming locations
 * - Top performing section with tabs (locations vs cabinets)
 * - Pie chart visualization
 * - Skeleton loading states
 * - No data messages
 *
 * @param props - MobileLayoutProps including data, loading states, and handlers
 */
'use client';

import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import TopPerformingLocationModal from '@/components/modals/TopPerformingLocationModal';
import TopPerformingMachineModal from '@/components/modals/TopPerformingMachineModal';
import Chart from '@/components/ui/dashboard/Chart';
import FinancialMetricsCards from '@/components/ui/FinancialMetricsCards';
import MachineStatusWidget from '@/components/ui/MachineStatusWidget';
import MapPreview from '@/components/ui/MapPreview';
import { RefreshButtonSkeleton } from '@/components/ui/skeletons/ButtonSkeletons';
import {
  DashboardChartSkeleton,
  DashboardTopPerformingSkeleton,
} from '@/components/ui/skeletons/DashboardSkeletons';
import type { TopPerformingItem } from '@/lib/types';
import { MobileLayoutProps } from '@/lib/types/componentProps';
import { getLicenseeName } from '@/lib/utils/licenseeMapping';
import axios from 'axios';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

export default function MobileLayout(props: MobileLayoutProps) {
  // ============================================================================
  // Hooks
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

  // ============================================================================
  // Computed Values
  // ============================================================================
  const licenseeName =
    getLicenseeName(props.selectedLicencee) ||
    props.selectedLicencee ||
    'any licensee';

  // ============================================================================
  // Helper Components
  // ============================================================================
  const NoDataMessage = ({ message }: { message: string }) => (
    <div
      className="flex flex-col items-center justify-center rounded-lg bg-container p-8 shadow-md"
      suppressHydrationWarning
    >
      <div className="mb-2 text-lg text-gray-500">No Data Available</div>
      <div className="text-center text-sm text-gray-400">{message}</div>
    </div>
  );

  // ============================================================================
  // State - Machine Stats
  // ============================================================================
  // Use online/offline counts from props if provided, otherwise fetch from API
  const [machineStats, setMachineStats] = useState<{
    totalMachines: number;
    onlineMachines: number;
    offlineMachines: number;
  } | null>(null);
  const [machineStatsLoading, setMachineStatsLoading] = useState(true);

  // ============================================================================
  // Effects - Fetch Machine Stats
  // ============================================================================
  // Fetch machine stats for online/offline counts (similar to reports tab)
  useEffect(() => {
    let aborted = false;
    const fetchMachineStats = async () => {
      setMachineStatsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('licensee', 'all'); // Get all machines

        const res = await axios.get(
          `/api/analytics/machines/stats?${params.toString()}`
        );
        const data = res.data;
        if (!aborted) {
          setMachineStats({
            totalMachines: data.totalMachines || 0,
            onlineMachines: data.onlineMachines || 0,
            offlineMachines: data.offlineMachines || 0,
          });
        }
      } catch {
        if (!aborted) {
          setMachineStats({
            totalMachines: 0,
            onlineMachines: 0,
            offlineMachines: 0,
          });
        }
      } finally {
        if (!aborted) setMachineStatsLoading(false);
      }
    };
    fetchMachineStats();
    return () => {
      aborted = true;
    };
  }, []);

  // ============================================================================
  // Computed Values - Machine Counts
  // ============================================================================
  // Use machine stats for online/offline counts
  const onlineCount = machineStats?.onlineMachines || 0;
  const offlineCount = machineStats?.offlineMachines || 0;

  // ============================================================================
  // Render - Mobile Dashboard Layout
  // ============================================================================
  return (
    <div className="space-y-6 xl:hidden">
      {/* Date Filter Controls (mobile) */}
      <div className="flex flex-wrap items-center gap-2">
        <DashboardDateFilters hideAllTime={false} />
      </div>

      {/* Machine Status Widget */}
      <div className="mb-4">
        <MachineStatusWidget
          isLoading={machineStatsLoading}
          onlineCount={onlineCount}
          offlineCount={offlineCount}
        />
      </div>

      {/* Refresh button below Machine Status on mobile */}
      <div className="flex justify-end">
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

      {/* Metrics Cards - Mobile uses new design */}
      <FinancialMetricsCards
        totals={props.totals}
        loading={props.loadingChartData}
        title="Total for all Locations and Machines"
      />

      {props.loadingChartData ? (
        <DashboardChartSkeleton />
      ) : (
        <>
          {/* Granularity Selector - Only show for Today/Yesterday/Custom */}
          {props.showGranularitySelector && (
            <div className="mb-3 flex items-center justify-end gap-2">
              <label
                htmlFor="chart-granularity-mobile"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Granularity:
              </label>
              <select
                id="chart-granularity-mobile"
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
        </>
      )}

      {props.loadingChartData ? (
        <div className="relative w-full rounded-lg bg-container p-4 shadow-md">
          <div className="skeleton-bg mt-2 h-48 w-full animate-pulse rounded-lg"></div>
        </div>
      ) : (
        <MapPreview gamingLocations={props.gamingLocations} />
      )}

      {/* Top Performing Section */}
      {props.loadingTopPerforming ||
      (!props.hasTopPerformingFetched &&
        props.topPerformingData.length === 0) ? (
        <div className="space-y-2">
          <h2 className="text-lg">Top Performing</h2>
          <div className="relative flex w-full flex-col rounded-lg rounded-tl-3xl rounded-tr-3xl bg-container shadow-md">
            {/* Tabs skeleton */}
            <div className="flex">
              <div className="w-full rounded-tl-xl rounded-tr-3xl bg-gray-100 px-4 py-2">
                <div className="h-5 w-20 animate-pulse rounded bg-gray-200"></div>
              </div>
              <div className="w-full rounded-tr-3xl bg-gray-100 px-4 py-2">
                <div className="h-5 w-20 animate-pulse rounded bg-gray-200"></div>
              </div>
            </div>
            <div className="mb-0 rounded-lg rounded-tl-none rounded-tr-3xl bg-container p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                {/* Empty space for sort by select (removed on mobile) */}
              </div>
              <div className="flex items-center justify-between gap-4">
                {/* List skeleton - matches actual list structure */}
                <ul className="flex-1 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      {/* Colored dot skeleton */}
                      <div className="h-4 w-4 flex-shrink-0 animate-pulse rounded-full bg-gray-200"></div>
                      {/* Name text skeleton */}
                      <div className="h-4 flex-1 animate-pulse rounded bg-gray-200"></div>
                      {/* External link icon skeleton (only for some items) */}
                      {i < 3 && (
                        <div className="h-3.5 w-3.5 flex-shrink-0 animate-pulse rounded bg-gray-200"></div>
                      )}
                    </li>
                  ))}
                </ul>
                {/* Pie chart skeleton - matches ResponsiveContainer width={160} height={160} */}
                <div className="h-40 w-40 flex-shrink-0">
                  <div className="h-full w-full animate-pulse rounded-full bg-gray-200"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg">Top Performing</h2>
            {/* Date filter removed - now synced with chart/metrics filters */}
          </div>
          <div
            className={`relative flex flex-col ${
              props.activeTab === 'locations'
                ? 'bg-container'
                : 'bg-buttonActive'
            } w-full rounded-lg rounded-tl-3xl rounded-tr-3xl shadow-md`}
          >
            <div className="flex">
              <button
                className={`w-full rounded-tl-xl rounded-tr-3xl px-4 py-2 ${
                  props.activeTab === 'locations'
                    ? 'bg-buttonActive text-white'
                    : 'bg-container'
                } ${
                  props.activeTab !== 'locations' && props.loadingTopPerforming
                    ? 'cursor-not-allowed'
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
                className={`w-full rounded-tr-3xl px-4 py-2 ${
                  props.activeTab === 'Cabinets'
                    ? 'bg-buttonActive text-white'
                    : 'bg-container'
                } ${
                  props.activeTab !== 'Cabinets' && props.loadingTopPerforming
                    ? 'cursor-not-allowed'
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

            <div className="mb-0 rounded-lg rounded-tl-none rounded-tr-3xl bg-container p-6 shadow-sm">
              {props.loadingTopPerforming ||
              (!props.hasTopPerformingFetched &&
                props.topPerformingData.length === 0) ? (
                <DashboardTopPerformingSkeleton />
              ) : props.topPerformingData.length === 0 ? (
                <NoDataMessage
                  message={`No metrics found for ${props.selectedLicencee === 'all' ? 'any licensee' : licenseeName}`}
                />
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    {/* Removed sort by select input on mobile */}
                  </div>
                  <div className="flex items-center justify-between">
                    <ul className="flex-1 space-y-2">
                      {props.topPerformingData.map(
                        (item: TopPerformingItem, index: number) => (
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
                                <span className="flex-1">{item.name}</span>
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
                                  className="flex-1 cursor-pointer text-left hover:text-blue-600 hover:underline"
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
                              <span className="flex-1">{item.name}</span>
                            )}
                          </li>
                        )
                      )}
                    </ul>
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
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
