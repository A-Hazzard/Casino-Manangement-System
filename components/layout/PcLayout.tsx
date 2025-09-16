"use client";

import MapPreview from "@/components/ui/MapPreview";
import { timeFrames } from "@/lib/constants/uiConstants";
import { PcLayoutProps } from "@/lib/types/componentProps";
import { getFinancialColorClass } from "@/lib/utils/financialColors";
import { formatCurrency } from "@/lib/utils/currency";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import CustomSelect from "../ui/CustomSelect";
import {
  DashboardFinancialMetricsSkeleton,
  DashboardChartSkeleton,
} from "@/components/ui/skeletons/DashboardSkeletons";
import Chart from "@/components/ui/dashboard/Chart";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import DashboardDateFilters from "@/components/dashboard/DashboardDateFilters";

export default function PcLayout(props: PcLayoutProps) {
  const { activeMetricsFilter, customDateRange, selectedLicencee } = useDashBoardStore();

  const NoDataMessage = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center p-8 bg-container rounded-lg shadow-md">
      <div className="text-gray-500 text-lg mb-2">No Data Available</div>
      <div className="text-gray-400 text-sm text-center">{message}</div>
    </div>
  );

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
        console.warn("⚠️ No activeMetricsFilter available in PcLayout, skipping locationAggregation fetch");
        setLocationAggregates([]);
        setAggLoading(false);
        return;
      }

      setAggLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("timePeriod", activeMetricsFilter);
        
        // Add custom date range if applicable
        if (activeMetricsFilter === "Custom" && customDateRange) {
          if (customDateRange.startDate && customDateRange.endDate) {
            const sd = customDateRange.startDate instanceof Date
              ? customDateRange.startDate
              : new Date(customDateRange.startDate as unknown as string);
            const ed = customDateRange.endDate instanceof Date
              ? customDateRange.endDate
              : new Date(customDateRange.endDate as unknown as string);
            params.append("startDate", sd.toISOString());
            params.append("endDate", ed.toISOString());
          }
        }
        
        // Add licensee filter if applicable
        if (selectedLicencee && selectedLicencee !== "all") {
          params.append("licencee", selectedLicencee);
        }
        
        const res = await axios.get(
          `/api/locationAggregation?${params.toString()}`
        );
        const json = res.data;
        if (!aborted) setLocationAggregates(json.data || []);
      } catch {
        if (!aborted) setLocationAggregates([]);
      } finally {
        if (!aborted) setAggLoading(false);
      }
    };
    fetchAgg();
    return () => {
      aborted = true;
    };
  }, [activeMetricsFilter, customDateRange, selectedLicencee]);

  return (
    <div className="hidden md:block">
      <div className="grid grid-cols-5 gap-6">
        {/* Left Section (Dashboard Content) - 60% Width (3/5 columns) */}
        <div className="col-span-3 space-y-6">
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


          {/* Three Metric Cards (Vertical on mobile, Horizontal on md) */}
          {props.loadingChartData ? (
            <DashboardFinancialMetricsSkeleton />
          ) : (
            <div className="flex flex-col md:flex-row gap-4">
              <>
                {/* Money In Card */}
                <div className="flex-1 px-4 sm:px-6 py-4 sm:py-6 text-center rounded-lg shadow-md bg-gradient-to-b from-white to-transparent min-h-[120px] flex flex-col justify-center">
                  <p className="text-gray-500 text-xs sm:text-sm md:text-base lg:text-lg font-medium mb-2">
                    Money In
                  </p>
                  <div className="w-full h-[4px] rounded-full my-2 bg-buttonActive"></div>
                  <div className="flex-1 flex items-center justify-center">
                    <p
                      className={`font-bold break-words overflow-hidden text-sm sm:text-base md:text-lg lg:text-xl ${getFinancialColorClass(
                        props.totals?.moneyIn
                      )}`}
                    >
                      {props.totals
                        ? formatCurrency(props.totals.moneyIn)
                        : "--"}
                    </p>
                  </div>
                </div>
                {/* Money Out Card */}
                <div className="flex-1 px-4 sm:px-6 py-4 sm:py-6 text-center rounded-lg shadow-md bg-gradient-to-b from-white to-transparent min-h-[120px] flex flex-col justify-center">
                  <p className="text-gray-500 text-xs sm:text-sm md:text-base lg:text-lg font-medium mb-2">
                    Money Out
                  </p>
                  <div className="w-full h-[4px] rounded-full my-2 bg-lighterBlueHighlight"></div>
                  <div className="flex-1 flex items-center justify-center">
                    <p
                      className={`font-bold break-words overflow-hidden text-sm sm:text-base md:text-lg lg:text-xl ${getFinancialColorClass(
                        props.totals?.moneyOut
                      )}`}
                    >
                      {props.totals
                        ? formatCurrency(props.totals.moneyOut)
                        : "--"}
                    </p>
                  </div>
                </div>
                {/* Gross Card */}
                <div className="flex-1 px-4 sm:px-6 py-4 sm:py-6 text-center rounded-lg shadow-md bg-gradient-to-b from-white to-transparent min-h-[120px] flex flex-col justify-center">
                  <p className="text-gray-500 text-xs sm:text-sm md:text-base lg:text-lg font-medium mb-2">
                    Gross
                  </p>
                  <div className="w-full h-[4px] rounded-full my-2 bg-orangeHighlight"></div>
                  <div className="flex-1 flex items-center justify-center">
                    <p
                      className={`font-bold break-words overflow-hidden text-sm sm:text-base md:text-lg lg:text-xl ${getFinancialColorClass(
                        props.totals?.gross
                      )}`}
                    >
                      {props.totals
                        ? formatCurrency(props.totals.gross)
                        : "--"}
                    </p>
                  </div>
                </div>
              </>
            </div>
          )}

          {/* Trend Chart Section */}
          {props.loadingChartData ? (
            <DashboardChartSkeleton />
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
          {/* Map Preview Section */}
          <div className="bg-container rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Location Map</h3>
              {aggLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Updating financial data...</span>
                </div>
              )}
            </div>
            
            {aggLoading ? (
              <div className="relative p-4 rounded-lg shadow-md bg-container w-full">
                <div className="mt-2 h-48 w-full rounded-lg skeleton-bg animate-pulse"></div>
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
          <div className="bg-container rounded-lg shadow-md p-6">
            {props.loadingTopPerforming ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Top Performing</h2>
                  <div className="w-32 h-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="flex rounded-lg overflow-hidden border border-gray-200">
                  <div className="flex-1 px-4 py-2 bg-gray-100"></div>
                  <div className="flex-1 px-4 py-2 bg-gray-100"></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
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
            ) : props.topPerformingData.length === 0 ? (
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
