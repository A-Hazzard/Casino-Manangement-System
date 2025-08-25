"use client";

import MapPreview from "@/components/ui/MapPreview";
import { MobileLayoutProps } from "@/lib/types/componentProps";
import { formatNumber } from "@/lib/utils/metrics";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import StatCardSkeleton, {
  ChartSkeleton,
} from "@/components/ui/SkeletonLoader";
import Chart from "@/components/ui/dashboard/Chart";
import MachineStatusWidget from "@/components/ui/MachineStatusWidget";
import { RefreshCw } from "lucide-react";
import DashboardDateFilters from "@/components/dashboard/DashboardDateFilters";
import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { IMAGES } from "@/lib/constants/images";

export default function MobileLayout(props: MobileLayoutProps) {
  const NoDataMessage = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center p-8 bg-container rounded-lg shadow-md" suppressHydrationWarning>
      <div className="text-gray-500 text-lg mb-2">No Data Available</div>
      <div className="text-gray-400 text-sm text-center">{message}</div>
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
        params.append("licensee", "all"); // Get all machines

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
    <div className="xl:hidden space-y-6">
      {/* Date Filter Controls (mobile) */}
      <div className="flex flex-wrap items-center gap-2">
        <DashboardDateFilters
          disabled={props.loadingChartData || props.refreshing}
        />
      </div>

      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg">Total for all Locations and Machines</h2>
          <Image
            src={IMAGES.dashboardIcon}
            alt="Dashboard Icon"
            width={24}
            height={24}
            className="w-5 h-5 sm:w-6 sm:h-6"
          />
        </div>
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
        <div
          className={`flex items-center gap-2 bg-buttonActive text-white rounded-md px-4 py-2 cursor-pointer transition-opacity select-none ${
            props.loadingChartData || props.refreshing
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-buttonActive/90"
          }`}
          onClick={() => {
            if (!(props.loadingChartData || props.refreshing)) props.onRefresh();
          }}
          aria-disabled={props.loadingChartData || props.refreshing}
          tabIndex={0}
          role="button"
        >
          <RefreshCw
            className={`w-4 h-4 ${props.refreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span className="font-semibold">Refresh</span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {props.loadingChartData ? (
          <StatCardSkeleton count={3} />
        ) : (
          <>
            <div className="px-8 py-6 text-center rounded-lg shadow-md bg-gradient-to-b from-white to-transparent">
              <p className="text-gray-500 text-sm lg:text-lg font-medium">
                Money In
              </p>
              <div className="w-full h-[4px] rounded-full my-2 bg-buttonActive"></div>
              <p className="font-bold">
                {props.totals ? formatNumber(props.totals.moneyIn) : "--"}
              </p>
            </div>
            <div className="px-8 py-6 text-center rounded-lg shadow-md bg-gradient-to-b from-white to-transparent">
              <p className="text-gray-500 text-sm lg:text-lg font-medium">
                Money Out
              </p>
              <div className="w-full h-[4px] rounded-full my-2 bg-lighterBlueHighlight"></div>
              <p className="font-bold">
                {props.totals ? formatNumber(props.totals.moneyOut) : "--"}
              </p>
            </div>
            <div className="px-8 py-6 text-center rounded-lg shadow-md bg-gradient-to-b from-white to-transparent">
              <p className="text-gray-500 text-sm lg:text-lg font-medium">
                Gross
              </p>
              <div className="w-full h-[4px] rounded-full my-2 bg-orangeHighlight"></div>
              <p className="font-bold">
                {props.totals ? formatNumber(props.totals.gross) : "--"}
              </p>
            </div>
          </>
        )}
      </div>

      {props.loadingChartData ? (
        <ChartSkeleton />
      ) : (
        <Chart
          loadingChartData={props.loadingChartData}
          chartData={props.chartData}
          activeMetricsFilter={props.activeMetricsFilter}
        />
      )}

      {props.loadingChartData ? (
        <div className="relative p-4 rounded-lg shadow-md bg-container w-full">
          <div className="mt-2 h-48 w-full rounded-lg skeleton-bg animate-pulse"></div>
        </div>
      ) : (
        <MapPreview gamingLocations={props.gamingLocations} />
      )}

      {/* Top Performing Section */}
      {props.loadingTopPerforming ? (
        <div className="space-y-2">
          <h2 className="text-lg">Top Performing</h2>
          <div className="relative flex flex-col bg-container w-full rounded-lg rounded-tl-3xl rounded-tr-3xl shadow-md">
            <div className="flex">
              <div className="w-full px-4 py-2 rounded-tr-3xl rounded-tl-xl bg-gray-100"></div>
              <div className="w-full px-4 py-2 rounded-tr-3xl bg-gray-100"></div>
            </div>
            <div className="p-6 mb-0 rounded-lg rounded-tr-3xl rounded-tl-none shadow-sm bg-container">
              <div className="flex justify-between items-center mb-4">
                {/* Skeleton for sort by select */}
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-gray-200 rounded-full animate-pulse"></div>
                      <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
                <div className="w-40 h-40 bg-gray-200 rounded-full animate-pulse"></div>
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
              props.activeTab === "locations"
                ? "bg-container"
                : "bg-buttonActive"
            } w-full rounded-lg rounded-tl-3xl rounded-tr-3xl shadow-md`}
          >
            <div className="flex">
              <button
                className={`w-full px-4 py-2 rounded-tr-3xl rounded-tl-xl ${
                  props.activeTab === "locations"
                    ? "bg-buttonActive text-white"
                    : "bg-container"
                } ${
                  props.activeTab !== "locations" && props.loadingTopPerforming
                    ? "cursor-not-allowed"
                    : ""
                }`}
                onClick={() => {
                  if (
                    props.activeTab !== "locations" &&
                    props.loadingTopPerforming
                  )
                    return;
                  props.setActiveTab("locations");
                }}
              >
                Locations
              </button>
              <button
                className={`w-full px-4 py-2 rounded-tr-3xl ${
                  props.activeTab === "Cabinets"
                    ? "bg-buttonActive text-white"
                    : "bg-container"
                } ${
                  props.activeTab !== "Cabinets" && props.loadingTopPerforming
                    ? "cursor-not-allowed"
                    : ""
                }`}
                onClick={() => {
                  if (
                    props.activeTab !== "Cabinets" &&
                    props.loadingTopPerforming
                  )
                    return;
                  props.setActiveTab("Cabinets");
                }}
              >
                Cabinets
              </button>
            </div>

            <div className="p-6 mb-0 rounded-lg rounded-tr-3xl rounded-tl-none shadow-sm bg-container">
              <div className="flex justify-between items-center mb-4">
                {/* Removed sort by select input on mobile */}
              </div>
              <div className="flex items-center justify-between">
                <ul className="space-y-2">
                  {props.topPerformingData.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-center space-x-2 text-sm"
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span>
                        {props.activeTab === "Cabinets"
                          ? item.machine
                          : item.location}
                      </span>
                    </li>
                  ))}
                </ul>
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={props.topPerformingData}
                      dataKey="totalDrop"
                      nameKey={
                        props.activeTab === "Cabinets" ? "machine" : "location"
                      }
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      labelLine={false}
                      label={props.renderCustomizedLabel}
                    >
                      {props.topPerformingData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
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
