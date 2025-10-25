'use client';

import MapPreview from '@/components/ui/MapPreview';
import { MobileLayoutProps } from '@/lib/types/componentProps';
import type { TopPerformingItem } from '@/lib/types';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { DashboardChartSkeleton } from '@/components/ui/skeletons/DashboardSkeletons';
import FinancialMetricsCards from '@/components/ui/FinancialMetricsCards';
import { RefreshButtonSkeleton } from '@/components/ui/skeletons/ButtonSkeletons';
import Chart from '@/components/ui/dashboard/Chart';
import MachineStatusWidget from '@/components/ui/MachineStatusWidget';
import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';

export default function MobileLayout(props: MobileLayoutProps) {
  const NoDataMessage = ({ message }: { message: string }) => (
    <div
      className="flex flex-col items-center justify-center rounded-lg bg-container p-8 shadow-md"
      suppressHydrationWarning
    >
      <div className="mb-2 text-lg text-gray-500">No Data Available</div>
      <div className="text-center text-sm text-gray-400">{message}</div>
    </div>
  );

  // Use online/offline counts from props if provided, otherwise fetch from API
  const [machineStats, setMachineStats] = useState<{
    totalMachines: number;
    onlineMachines: number;
    offlineMachines: number;
  } | null>(null);
  const [machineStatsLoading, setMachineStatsLoading] = useState(true);

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

  // Use machine stats for online/offline counts
  const onlineCount = machineStats?.onlineMachines || 0;
  const offlineCount = machineStats?.offlineMachines || 0;

  return (
    <div className="space-y-6 xl:hidden">
      {/* Date Filter Controls (mobile) */}
      <div className="flex flex-wrap items-center gap-2">
        <DashboardDateFilters
          disabled={props.loadingChartData || props.refreshing}
          hideAllTime={false}
        />
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
        <Chart
          loadingChartData={props.loadingChartData}
          chartData={props.chartData}
          activeMetricsFilter={props.activeMetricsFilter}
        />
      )}

      {props.loadingChartData ? (
        <div className="relative w-full rounded-lg bg-container p-4 shadow-md">
          <div className="skeleton-bg mt-2 h-48 w-full animate-pulse rounded-lg"></div>
        </div>
      ) : (
        <MapPreview gamingLocations={props.gamingLocations} />
      )}

      {/* Top Performing Section */}
      {props.loadingTopPerforming ? (
        <div className="space-y-2">
          <h2 className="text-lg">Top Performing</h2>
          <div className="relative flex w-full flex-col rounded-lg rounded-tl-3xl rounded-tr-3xl bg-container shadow-md">
            <div className="flex">
              <div className="w-full rounded-tl-xl rounded-tr-3xl bg-gray-100 px-4 py-2"></div>
              <div className="w-full rounded-tr-3xl bg-gray-100 px-4 py-2"></div>
            </div>
            <div className="mb-0 rounded-lg rounded-tl-none rounded-tr-3xl bg-container p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                {/* Skeleton for sort by select */}
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center space-x-2">
                      <div className="h-4 w-4 animate-pulse rounded-full bg-gray-200"></div>
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
                    </div>
                  ))}
                </div>
                <div className="h-40 w-40 animate-pulse rounded-full bg-gray-200"></div>
              </div>
            </div>
          </div>
        </div>
      ) : props.topPerformingData.length === 0 ? (
        <NoDataMessage message="No top performing data available for the selected period" />
      ) : (
        <div className="space-y-2">
          <h2 className="text-lg">Top Performing</h2>
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
              <div className="mb-4 flex items-center justify-between">
                {/* Removed sort by select input on mobile */}
              </div>
              <div className="flex items-center justify-between">
                <ul className="space-y-2">
                  {props.topPerformingData.map(
                    (item: TopPerformingItem, index: number) => (
                      <li
                        key={index}
                        className="flex items-center space-x-2 text-sm"
                      >
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span>{item.name}</span>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
