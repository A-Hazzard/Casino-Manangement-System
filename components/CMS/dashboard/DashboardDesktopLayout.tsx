/**
 * Dashboard Desktop Layout Component
 * Dashboard layout optimized for larger screens (xl+).
 *
 * Features:
 * - Date filters with custom date range support
 * - Licensee selector for filtering data
 * - Refresh button for data reload
 * - Financial metrics cards
 * - Detailed chart section with metrics filters
 * - Map preview of gaming locations
 * - Top performing section with tabs (locations vs cabinets)
 * - Sorting controls for top performing data
 * - Pie chart visualization
 * - Skeleton loading states
 * - No data messages
 *
 * @module components/dashboard/DashboardDesktopLayout
 */
'use client';

import DashboardChart from '@/components/CMS/dashboard/DashboardChart';
import TopPerformingLocationModal from '@/components/CMS/dashboard/modals/TopPerformingLocationModal';
import TopPerformingMachineModal from '@/components/CMS/dashboard/modals/TopPerformingMachineModal';
import DateFilters from '@/components/shared/ui/common/DateFilters';
import FinancialMetricsCards from '@/components/shared/ui/FinancialMetricsCards';
import MapPreview from '@/components/shared/ui/MapPreview';
import { RefreshButtonSkeleton } from '@/components/shared/ui/skeletons/ButtonSkeletons';
import {
  DashboardChartSkeleton,
  DashboardTopPerformingSkeleton,
} from '@/components/shared/ui/skeletons/DashboardSkeletons';
import type { TopPerformingItem } from '@/lib/types';
import type { DashboardDesktopLayoutProps } from '@/lib/types/components';
import { getLicenseeName } from '@/lib/utils/licensee';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

export default function DashboardDesktopLayout(
  props: DashboardDesktopLayoutProps
) {
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

  const licenseeName =
    getLicenseeName(props.selectedLicencee) ||
    props.selectedLicencee ||
    'any licensee';

  const NoDataMessage = ({ message }: { message: string }) => (
    <div
      className="flex flex-col items-center justify-center rounded-lg bg-container p-8 shadow-md"
      suppressHydrationWarning
    >
      <div className="mb-2 text-lg text-gray-500">No Data Available</div>
      <div className="text-center text-sm text-gray-400">{message}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-5 gap-6">
      {/* ============================================================================
         Left Section (Dashboard Content) - 60% Width (3/5 columns)
         ============================================================================ */}
      <div className="col-span-3 space-y-6">
        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <DateFilters hideAllTime={true} />
        </div>

        {/* Metrics Description Text with Refresh Button */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg text-gray-700">
            Total for all Locations and Machines
          </h2>
          {/* Refresh Button with Loading State */}
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
          loading={props.loadingTotals ?? props.loadingChartData}
          title="Total for all Locations and Machines"
        />

        {/* Trend Chart Section */}
        <div className="rounded-lg bg-container p-6 shadow-md">
          {/* Chart Granularity Selector */}
          {props.showGranularitySelector && !props.loadingChartData && (
            <div className="mb-3 flex items-center justify-end gap-2">
              <label
                htmlFor="chart-granularity-desktop"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Granularity:
              </label>
              <select
                id="chart-granularity-desktop"
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
          {/* Main Dashboard Chart */}
          {props.loadingChartData ? (
            <DashboardChartSkeleton />
          ) : (
            <DashboardChart
              loadingChartData={props.loadingChartData}
              chartData={props.chartData}
              activeMetricsFilter={props.activeMetricsFilter}
              totals={props.totals}
            />
          )}
        </div>
      </div>

      {/* ============================================================================
         Right Section (Map & Status) - 40% Width (2/5 columns)
         ============================================================================ */}
      <div className="col-span-2 space-y-6">
        {/* Map Preview Section */}
        <div className="rounded-lg bg-container p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Location Map</h3>
          </div>
          {props.loadingLocations ?? props.loadingChartData ? (
            <div className="relative h-56 w-full rounded-lg bg-container p-4">
              <div className="skeleton-bg mt-2 h-full w-full animate-pulse rounded-lg"></div>
            </div>
          ) : (
            <MapPreview gamingLocations={props.gamingLocations} />
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
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Top Performing</h2>
              </div>

              {/* Tabs with Curved Design */}
              <div
                className={`relative flex flex-col ${
                  props.activeTab === 'locations'
                    ? 'bg-container'
                    : 'bg-buttonActive'
                } w-full rounded-lg rounded-tl-3xl rounded-tr-3xl shadow-md`}
              >
                {/* Tab Buttons */}
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

                {/* Content Area */}
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
                    <div className="flex flex-col items-center gap-6 md:flex-col lg:flex-row lg:items-center lg:justify-between">
                      {/* Items List */}
                      <ul className="w-full flex-1 space-y-2 md:w-full lg:w-auto">
                        {props.topPerformingData.map(
                          (item: TopPerformingItem, index: number) => (
                            <li
                              key={index}
                              className="flex items-center gap-2 text-sm"
                            >
                              {/* Colored Dot */}
                              <div
                                className="h-4 w-4 flex-shrink-0 rounded-full"
                                style={{ backgroundColor: item.color }}
                              ></div>

                              {/* Conditional Rendering */}
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
                          )
                        )}
                      </ul>

                      {/* Pie Chart */}
                      <div className="flex-shrink-0 h-40 min-h-[160px] w-40 min-w-[160px] md:mx-auto lg:mx-0">
                        <ResponsiveContainer width="100%" height="100%">
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

