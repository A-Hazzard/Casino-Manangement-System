"use client";

import MapPreview from "@/components/ui/MapPreview";
import { timeFrames } from "@/lib/constants/uiConstants";
import { PcLayoutProps } from "@/lib/types/componentProps";
import { formatNumber } from "@/lib/utils/metrics";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import CustomSelect from "../ui/CustomSelect";
import DateRange from "../ui/dateRange";
import dayjs from "dayjs";
import StatCardSkeleton, {
  ChartSkeleton,
} from "@/components/ui/SkeletonLoader";
import customParseFormat from "dayjs/plugin/customParseFormat";
import Chart from "@/components/ui/dashboard/Chart";
import RefreshButton from "@/components/ui/RefreshButton";

dayjs.extend(customParseFormat);

export default function PcLayout(props: PcLayoutProps) {
  const NoDataMessage = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center p-8 bg-container rounded-lg shadow-md">
      <div className="text-gray-500 text-lg mb-2">No Data Available</div>
      <div className="text-gray-400 text-sm text-center">{message}</div>
    </div>
  );

  return (
    <>
      <div className="hidden lg:flex lg:gap-6">
        <div className="flex-[2] space-y-6 flex flex-col">
          {/* Date Range Picker */}
          {props.showDatePicker && (
            <DateRange
              CustomDateRange={props.CustomDateRange}
              setCustomDateRange={props.setCustomDateRange}
              setTotals={props.setTotals}
              setChartData={props.setChartData}
              selectedLicencee={props.selectedLicencee}
              setActiveFilters={props.setActiveFilters}
              setShowDatePicker={props.setShowDatePicker}
            />
          )}

          <div className="flex justify-between items-center">
            <h2 className="text-lg">Total for all Locations and Machines</h2>
            <RefreshButton
              onClick={props.onRefresh}
              isRefreshing={props.refreshing}
            />
          </div>
          {/* Metrics Cards */}
          <div className="flex justify-between lg:flex-wrap lg:justify-around lg:gap-4 h-full">
            {props.loadingChartData ? (
              <StatCardSkeleton count={3} />
            ) : (
              <>
                {/* Metrics Cards */}
                <div className="flex-1 px-8 py-6 bg-container shadow-md rounded-lg text-center">
                  <p className="text-gray-500 text-sm lg:text-lg font-medium">
                    Money In
                  </p>
                  <div className="w-full h-[4px] rounded-full my-2 bg-buttonActive"></div>
                  {/* Check if props.totals is not null before rendering */}
                  <p className="font-bold">
                    {props.totals ? formatNumber(props.totals.moneyIn) : "--"}
                  </p>
                </div>
                <div className="flex-1 px-8 py-6 bg-container shadow-md rounded-lg text-center">
                  <p className="text-gray-500 text-sm lg:text-lg font-medium">
                    Money Out
                  </p>
                  <div className="w-full h-[4px] rounded-full my-2 bg-lighterBlueHighlight"></div>
                  {/* Check if props.totals is not null before rendering */}
                  <p className="font-bold">
                    {props.totals ? formatNumber(props.totals.moneyOut) : "--"}
                  </p>
                </div>
                <div className="flex-1 px-8 py-6 bg-container shadow-md rounded-lg text-center">
                  <p className="text-gray-500 text-sm lg:text-lg font-medium">
                    Gross
                  </p>
                  <div className="w-full h-[4px] rounded-full my-2 bg-orangeHighlight"></div>
                  {/* Check if props.totals is not null before rendering */}
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
        </div>

        {/* Top Performing Section */}
        <div className="flex justify-between border-10 flex-col">
          {props.topPerformingData.length === 0 &&
          !props.loadingTopPerforming ? (
            <NoDataMessage message="No top performing data available for the selected period" />
          ) : (
            <>
              <MapPreview
                chartData={props.chartData}
                gamingLocations={props.gamingLocations}
              />
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
                        props.activeTab !== "locations" &&
                        props.loadingTopPerforming
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
                        props.activeTab !== "Cabinets" &&
                        props.loadingTopPerforming
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
                      <div className="mb-4">
                        <CustomSelect
                          timeFrames={timeFrames}
                          selectedFilter={props.activePieChartFilter}
                          activePieChartFilter={props.activePieChartFilter}
                          activeFilters={props.activeFilters}
                          onSelect={(value) => {
                            props.setActivePieChartFilter(value);
                          }}
                          isActive={true}
                          isTopPerforming={true}
                          placeholder="Select Time Frame"
                          disabled={props.loadingTopPerforming}
                        />
                      </div>
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
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
