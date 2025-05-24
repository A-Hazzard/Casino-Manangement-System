"use client";

import Header from "@/components/layout/Header";
import MobileLayout from "@/components/layout/MobileLayout";
import PcLayout from "@/components/layout/PcLayout";
import Sidebar from "@/components/layout/Sidebar";
import { RADIAN } from "@/lib/constants/uiConstants";
import { fetchTopPerformingData } from "@/lib/helpers/topPerforming";
import { dashboardData } from "@/lib/types";
import { CustomizedLabelProps } from "@/lib/types/componentProps";
import { switchFilter } from "@/lib/utils/metrics";
import { useCallback, useEffect, useRef } from "react";
import getAllGamingLocations from "@/lib/helpers/locations";
import { TimePeriod } from "@/app/api/lib/types";
import { useDashBoardStore } from "@/lib/store/dashboardStore";

// Create a client component to ensure the page only renders on the client
export default function Home() {
  return <DashboardContent />;
}

// Separate client component that uses zustand
function DashboardContent() {
  const {
    loadingChartData,
    setLoadingChartData,
    loadingTopPerforming,
    setLoadingTopPerforming,
    activeFilters,
    setActiveFilters,
    activeMetricsFilter,
    setActiveMetricsFilter,
    activePieChartFilter,
    setActivePieChartFilter,
    activeTab,
    setActiveTab,
    totals,
    setTotals,
    chartData,
    setChartData,
    gamingLocations,
    setGamingLocations,
    selectedLicencee,
    setSelectedLicencee,
    showDatePicker,
    setShowDatePicker,
    customDateRange,
    setCustomDateRange,
    topPerformingData,
    setTopPerformingData,
    pieChartSortIsOpen,
    setPieChartSortIsOpen,
  } = useDashBoardStore();
  // To compare new totals with previous ones.
  const prevTotals = useRef<dashboardData | null>(null);
  // To prevent double fetch on initial load
  const hasFetchedOnce = useRef(false);

  // Memoized custom label for Chart.
  const renderCustomizedLabel = useCallback((props: CustomizedLabelProps) => {
    const radius =
      props.innerRadius + (props.outerRadius - props.innerRadius) * 0.7;
    const x = props.cx + radius * Math.cos(-props.midAngle * RADIAN);
    const y = props.cy + radius * Math.sin(-props.midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={props.percent < 0.1 ? "12px" : "14px"}
        fontWeight="bold"
      >
        {(props.percent * 100).toFixed(0)}%
      </text>
    );
  }, []);

  // Replace with a single useEffect:
  useEffect(() => {
    const fetchMetrics = async () => {
      setLoadingChartData(true);
      try {
        // On initial load, fetch locations only ONCE.
        if (!hasFetchedOnce.current) {
          const locationsData = await getAllGamingLocations();
          const validLocations = locationsData.filter(
            (loc) =>
              loc.geoCoords &&
              loc.geoCoords.latitude !== 0 &&
              loc.geoCoords.longitude !== 0
          );
          setGamingLocations(validLocations);
          hasFetchedOnce.current = true;
        }
        // Fetch metrics
        if (selectedLicencee) {
          await switchFilter(
            activeMetricsFilter,
            setTotals,
            setChartData,
            activeMetricsFilter === "Custom"
              ? customDateRange.startDate
              : undefined,
            activeMetricsFilter === "Custom"
              ? customDateRange.endDate
              : undefined,
            selectedLicencee,
            setActiveFilters,
            setShowDatePicker
          );
        } else {
          await switchFilter(
            activeMetricsFilter,
            setTotals,
            setChartData,
            activeMetricsFilter === "Custom"
              ? customDateRange.startDate
              : undefined,
            activeMetricsFilter === "Custom"
              ? customDateRange.endDate
              : undefined,
            undefined,
            setActiveFilters,
            setShowDatePicker
          );
        }
      } catch (error) {
        console.error("Error fetching metrics:", error);
      } finally {
        setLoadingChartData(false);
      }
    };
    fetchMetrics();
  }, [
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    setTotals,
    setChartData,
    setLoadingChartData,
    setGamingLocations,
    setActiveFilters,
    setShowDatePicker,
  ]);

  // Top Performing: Fetch top performing data separately.
  useEffect(() => {
    let isMounted = true;
    setLoadingTopPerforming(true);
    fetchTopPerformingData(activeTab, activePieChartFilter)
      .then((data) => {
        if (isMounted) setTopPerformingData(data);
      })
      .catch((error) => {
        if (isMounted)
          console.error("Error fetching top-performing data:", error);
      })
      .finally(() => {
        if (isMounted) setLoadingTopPerforming(false);
      });
    return () => {
      isMounted = false;
    };
  }, [
    activeTab,
    activePieChartFilter,
    setTopPerformingData,
    setLoadingTopPerforming,
  ]);

  // When totals update with new data, disable aggregator child skeleton loaders.
  useEffect(() => {
    if (
      totals &&
      (!prevTotals.current ||
        totals.moneyIn !== prevTotals.current.moneyIn ||
        totals.moneyOut !== prevTotals.current.moneyOut ||
        totals.gross !== prevTotals.current.gross)
    ) {
      setLoadingChartData(false);
      prevTotals.current = totals;
    }
  }, [totals, setLoadingChartData]);

  return (
    <>
      <Sidebar />
      <div className="md:w-[80%] md:mx-auto md:pl-20 lg:pl-10 min-h-screen bg-background flex">
        <main className="flex-1 p-6 space-y-6 mt-4">
          <Header
            selectedLicencee={selectedLicencee}
            pageTitle="Dashboard"
            setSelectedLicencee={setSelectedLicencee}
          />

          {/* Date Filter Controls (Desktop) */}
          <div className="hidden lg:flex space-x-2 overflow-x-auto flex-wrap justify-start mt-4">
            {[
              { label: "Today", value: "Today" as TimePeriod },
              { label: "Yesterday", value: "Yesterday" as TimePeriod },
              { label: "Last 7 days", value: "7d" as TimePeriod },
              { label: "30 days", value: "30d" as TimePeriod },
              { label: "Custom", value: "Custom" as TimePeriod },
            ].map((filter) => (
              <button
                key={filter.label}
                className={`px-2 py-1 text-xs lg:text-base rounded-full mb-1 whitespace-nowrap ${
                  activeMetricsFilter === filter.value
                    ? "bg-buttonActive text-white"
                    : "bg-button text-white hover:bg-buttonActive"
                } ${loadingChartData ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() =>
                  !loadingChartData && setActiveMetricsFilter(filter.value)
                }
                disabled={loadingChartData}
              >
                {filter.label}
              </button>
            ))}
          </div>
          {/* Date Filter Controls (Mobile) */}
          <div className="flex lg:hidden justify-center my-4">
            <select
              className={`px-4 py-2 rounded-full text-sm bg-buttonActive text-white ${
                loadingChartData ? "opacity-50 cursor-not-allowed" : ""
              }`}
              value={activeMetricsFilter}
              onChange={(e) =>
                setActiveMetricsFilter(e.target.value as TimePeriod)
              }
              disabled={loadingChartData}
            >
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">30 days</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          {/* Main dashboard layouts */}
          <PcLayout
            activeFilters={activeFilters}
            activeTab={activeTab}
            totals={totals}
            chartData={chartData}
            gamingLocations={gamingLocations}
            loadingChartData={loadingChartData}
            pieChartSortIsOpen={pieChartSortIsOpen}
            activeMetricsFilter={activeMetricsFilter}
            activePieChartFilter={activePieChartFilter}
            topPerformingData={topPerformingData}
            showDatePicker={showDatePicker}
            setLoadingChartData={setLoadingChartData}
            CustomDateRange={customDateRange}
            setCustomDateRange={setCustomDateRange}
            setActiveFilters={setActiveFilters}
            setActiveTab={setActiveTab}
            setTotals={setTotals}
            setChartData={setChartData}
            setPieChartSortIsOpen={setPieChartSortIsOpen}
            setShowDatePicker={setShowDatePicker}
            setTopPerformingData={setTopPerformingData}
            setActiveMetricsFilter={setActiveMetricsFilter}
            setActivePieChartFilter={setActivePieChartFilter}
            renderCustomizedLabel={renderCustomizedLabel}
            selectedLicencee={selectedLicencee}
            loadingTopPerforming={loadingTopPerforming}
          />
          <MobileLayout
            activeFilters={activeFilters}
            activeTab={activeTab}
            totals={totals}
            chartData={chartData}
            gamingLocations={gamingLocations}
            loadingChartData={loadingChartData}
            pieChartSortIsOpen={pieChartSortIsOpen}
            activeMetricsFilter={activeMetricsFilter}
            activePieChartFilter={activePieChartFilter}
            topPerformingData={topPerformingData}
            showDatePicker={showDatePicker}
            setLoadingChartData={setLoadingChartData}
            CustomDateRange={customDateRange}
            setCustomDateRange={setCustomDateRange}
            setActiveFilters={setActiveFilters}
            setActiveTab={setActiveTab}
            setTotals={setTotals}
            setChartData={setChartData}
            setPieChartSortIsOpen={setPieChartSortIsOpen}
            setShowDatePicker={setShowDatePicker}
            setTopPerformingData={setTopPerformingData}
            setActiveMetricsFilter={setActiveMetricsFilter}
            setActivePieChartFilter={setActivePieChartFilter}
            renderCustomizedLabel={renderCustomizedLabel}
            selectedLicencee={selectedLicencee}
            loadingTopPerforming={loadingTopPerforming}
            isChangingDateFilter={false}
          />
        </main>
      </div>
    </>
  );
}
