"use client";

import MapPreview from "@/components/ui/MapPreview";
import { timeFrames } from "@/lib/constants/uiConstants";
import { PcLayoutProps } from "@/lib/types/componentProps";
import { formatNumber } from "@/lib/utils/metrics";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import CustomSelect from "../ui/CustomSelect";
import StatCardSkeleton, {
  ChartSkeleton,
} from "@/components/ui/SkeletonLoader";
import Chart from "@/components/ui/dashboard/Chart";
import { RefreshCw, BarChart3 } from "lucide-react";
import MachineStatusWidget from "@/components/ui/MachineStatusWidget";
import { useEffect, useState } from "react";
import DashboardDateFilters from "@/components/dashboard/DashboardDateFilters";

export default function PcLayout(props: PcLayoutProps) {
  const NoDataMessage = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center p-8 bg-container rounded-lg shadow-md">
      <div className="text-gray-500 text-lg mb-2">No Data Available</div>
      <div className="text-gray-400 text-sm text-center">{message}</div>
    </div>
  );

  // State for aggregated location data
  const [locationAggregates, setLocationAggregates] = useState<any[]>([]);
  const [aggLoading, setAggLoading] = useState(true);

  useEffect(() => {
    const fetchLocationAggregation = async () => {
      setAggLoading(true);
      try {
        const res = await fetch("/api/locationAggregation?timePeriod=Today");
        const response = await res.json();
        // Extract the data array from the response
        setLocationAggregates(response.data || []);
      } catch {
        setLocationAggregates([]);
      } finally {
        setAggLoading(false);
      }
    };
    fetchLocationAggregation();
  }, []);

  // Calculate total online/offline from aggregation
  const onlineCount = Array.isArray(locationAggregates)
    ? locationAggregates.reduce(
        (sum, loc) => sum + (loc.onlineMachines || 0),
        0
      )
    : 0;
  const totalMachines = Array.isArray(locationAggregates)
    ? locationAggregates.reduce((sum, loc) => sum + (loc.totalMachines || 0), 0)
    : 0;
  const offlineCount = totalMachines - onlineCount;

  return (
    <div className="hidden xl:block">
      <div className="grid grid-cols-5 gap-6">
        {/* Left Section (Dashboard Content) - 60% Width (3/5 columns) */}
        <div className="col-span-3 space-y-6">
          {/* Dashboard Title Section */}
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-buttonActive" />
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          </div>

          {/* Date Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <DashboardDateFilters
              disabled={props.loadingChartData || props.refreshing}
            />
          </div>

          {/* Metrics Description Text */}
          <div className="flex items-center gap-2">
            <h2 className="text-lg text-gray-700">
              Total for all Locations and Machines
            </h2>
            <div
              className={`flex items-center gap-2 bg-buttonActive text-white rounded-md px-4 py-2 cursor-pointer transition-opacity select-none ${
                props.loadingChartData || props.refreshing
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-buttonActive/90"
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
                className={`w-4 h-4 ${props.refreshing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span className="font-semibold">Refresh</span>
            </div>
          </div>

          {/* Three Metric Cards (Horizontal Row) */}
          <div className="grid grid-cols-3 gap-4">
            {props.loadingChartData ? (
              <StatCardSkeleton count={3} />
            ) : (
              <>
                {/* Wager Card */}
                <div className="px-6 py-6 text-center rounded-lg shadow-md bg-gradient-to-b from-white to-transparent">
                  <p className="text-gray-500 text-sm lg:text-lg font-medium">
                    Money In
                  </p>
                  <div className="w-full h-[4px] rounded-full my-2 bg-buttonActive"></div>
                  <p className="font-bold text-lg">
                    {props.totals ? formatNumber(props.totals.moneyIn) : "--"}
                  </p>
                </div>
                {/* Games Won Card */}
                <div className="px-6 py-6 text-center rounded-lg shadow-md bg-gradient-to-b from-white to-transparent">
                  <p className="text-gray-500 text-sm lg:text-lg font-medium">
                    Money Out
                  </p>
                  <div className="w-full h-[4px] rounded-full my-2 bg-lighterBlueHighlight"></div>
                  <p className="font-bold text-lg">
                    {props.totals ? formatNumber(props.totals.moneyOut) : "--"}
                  </p>
                </div>
                {/* Gross Card */}
                <div className="px-6 py-6 text-center rounded-lg shadow-md bg-gradient-to-b from-white to-transparent">
                  <p className="text-gray-500 text-sm lg:text-lg font-medium">
                    Gross
                  </p>
                  <div className="w-full h-[4px] rounded-full my-2 bg-orangeHighlight"></div>
                  <p className="font-bold text-lg">
                    {props.totals ? formatNumber(props.totals.gross) : "--"}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Trend Chart Section */}
          {props.loadingChartData ? (
            <ChartSkeleton />
          ) : (
            <div className="bg-container rounded-lg shadow-md p-6">
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
          {/* Online/Offline Status Widget */}
          <div className="bg-container rounded-lg shadow-md p-6">
            <MachineStatusWidget
              isLoading={aggLoading}
              onlineCount={onlineCount}
              offlineCount={offlineCount}
            />
          </div>

          {/* Map Preview Section */}
          <div className="bg-container rounded-lg shadow-md p-6">
            <MapPreview gamingLocations={props.gamingLocations} />
          </div>

          {/* Top Performing Section */}
          <div className="bg-container rounded-lg shadow-md p-6">
            {props.topPerformingData.length === 0 &&
            !props.loadingTopPerforming ? (
              <NoDataMessage message="No top performing data available for the selected period" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Top Performing</h2>
                  <CustomSelect
                    timeFrames={timeFrames}
                    selectedFilter={props.activePieChartFilter}
                    activePieChartFilter={props.activePieChartFilter}
                    activeFilters={props.activeFilters}
                    onSelect={(value) => {
                      if (!props.loadingTopPerforming) {
                        props.setActivePieChartFilter(value);
                      }
                    }}
                    isActive={true}
                    placeholder="Select Time Frame"
                    disabled={props.loadingTopPerforming}
                  />
                </div>

                {/* Tabs */}
                <div className="flex rounded-lg overflow-hidden border border-gray-200">
                  <button
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                      props.activeTab === "locations"
                        ? "bg-buttonActive text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } ${
                      props.activeTab !== "locations" &&
                      props.loadingTopPerforming
                        ? "cursor-not-allowed opacity-50"
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
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                      props.activeTab === "Cabinets"
                        ? "bg-buttonActive text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } ${
                      props.activeTab !== "Cabinets" &&
                      props.loadingTopPerforming
                        ? "cursor-not-allowed opacity-50"
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

                {/* Chart and Legend */}
                <div className="flex items-center justify-between">
                  <ul className="space-y-2 flex-1">
                    {props.topPerformingData.map((item, index) => (
                      <li
                        key={index}
                        className="flex items-center space-x-2 text-sm"
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-gray-700">
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
                          props.activeTab === "Cabinets"
                            ? "machine"
                            : "location"
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
