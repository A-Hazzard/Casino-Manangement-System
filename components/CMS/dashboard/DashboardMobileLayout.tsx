/**
 * Dashboard Mobile Layout Component
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
 * @module components/dashboard/DashboardMobileLayout
 */
'use client';

import DashboardChart from '@/components/CMS/dashboard/DashboardChart';
import TopPerformingLocationModal from '@/components/CMS/dashboard/modals/TopPerformingLocationModal';
import TopPerformingMachineModal from '@/components/CMS/dashboard/modals/TopPerformingMachineModal';
import DateFilters from '@/components/shared/ui/common/DateFilters';
import FinancialMetricsCards from '@/components/shared/ui/FinancialMetricsCards';
import MachineStatusWidget from '@/components/shared/ui/MachineStatusWidget';
import MapPreview from '@/components/shared/ui/MapPreview';
import { RefreshButtonSkeleton } from '@/components/shared/ui/skeletons/ButtonSkeletons';
import {
    DashboardChartSkeleton,
} from '@/components/shared/ui/skeletons/DashboardSkeletons';
import type {
    DashboardMobileLayoutProps,
} from '@/lib/types/components';
import { getLicenseeName } from '@/lib/utils/licensee';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardTopPerformingSection } from './sections/DashboardTopPerformingSection';

export default function DashboardMobileLayout(props: DashboardMobileLayoutProps) {
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


  const [machineStats, setMachineStats] = useState<{
    totalMachines: number;
    onlineMachines: number;
    offlineMachines: number;
  } | null>(null);
  const [machineStatsLoading, setMachineStatsLoading] = useState(true);

  /**
   * Fetches machine stats for online/offline counts.
   * Used to display machine status widget on mobile dashboard.
   */
  useEffect(() => {
    let aborted = false;
    const fetchMachineStats = async () => {
      setMachineStatsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('licensee', 'all');

        const res = await axios.get(
          `/api/analytics/machines/stats?${params.toString()}`
        );
        const data = res.data;
        // Only update state if request wasn't aborted
        if (!aborted) {
          setMachineStats({
            totalMachines: data.totalMachines || 0,
            onlineMachines: data.onlineMachines || 0,
            offlineMachines: data.offlineMachines || 0,
          });
        }
      } catch {
        // On error, set zero counts if request wasn't aborted
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

  const onlineCount = machineStats?.onlineMachines || 0;
  const offlineCount = machineStats?.offlineMachines || 0;

  return (
    <div className="space-y-6">
      {/* Date Filter Controls (mobile) */}
      <div className="flex flex-wrap items-center gap-2">
        <DateFilters hideAllTime={false} />
      </div>

      {/* Machine Status Widget */}
      <div className="mb-4">
        <MachineStatusWidget
          isLoading={machineStatsLoading}
          onlineCount={onlineCount}
          offlineCount={offlineCount}
        />
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        {/* Show skeleton while loading, otherwise show refresh button */}
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
              // Only trigger refresh if not already loading or refreshing
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

      {/* Chart Section */}
      {/* Show skeleton while loading, otherwise show chart with optional granularity selector */}
      {props.loadingChartData ? (
        <DashboardChartSkeleton />
      ) : (
        <>
          {/* Granularity Selector - Only shown for Today/Yesterday/Custom periods */}
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
          <DashboardChart
            loadingChartData={props.loadingChartData}
            chartData={props.chartData}
            activeMetricsFilter={props.activeMetricsFilter}
            totals={props.totals}
          />
        </>
      )}

      {/* Map Preview Section */}
      {/* Show skeleton while loading, otherwise show map preview */}
      {props.loadingLocations ?? props.loadingChartData ? (
        <div className="relative w-full rounded-lg bg-container p-4 shadow-md">
          <div className="skeleton-bg mt-2 h-48 w-full animate-pulse rounded-lg"></div>
        </div>
      ) : (
        <MapPreview gamingLocations={props.gamingLocations} />
      )}

      {/* Top Performing Section */}
      <DashboardTopPerformingSection
        loadingTopPerforming={props.loadingTopPerforming}
        hasTopPerformingFetched={props.hasTopPerformingFetched}
        topPerformingData={props.topPerformingData}
        activeTab={props.activeTab}
        setActiveTab={props.setActiveTab}
        selectedLicencee={props.selectedLicencee}
        licenseeName={licenseeName}
        renderCustomizedLabel={props.renderCustomizedLabel}
        onViewMachine={item => {
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
        onViewLocation={item => {
          if (item.locationId) {
            setSelectedLocation({
              locationId: item.locationId,
              locationName: item.name,
            });
            setIsLocationModalOpen(true);
          }
        }}
      />

      {/* Machine Preview Modal - Show only when machine is selected and not a location */}
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

      {/* Location Preview Modal - Show only when location is selected */}
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

