"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useComparisonReportsStore } from "@/lib/store/comparisonReportsStore";
import ComparisonReportsSkeleton from "./skeletons/ComparisonReportsSkeleton";
import LocationSelector from "./LocationSelector";

// Overview Components
import NetWinRevenueChart from "./overview/NetWinRevenueChart";
import DropComparisonTable from "./overview/DropComparisonTable";
import JackpotComparisonTable from "./overview/JackpotComparisonTable";
import HoldsMetricCard from "./overview/HoldsMetricCard";

// Machine Components
import MachinePerformanceTable from "./machines/MachinePerformanceTable";
import MachineDropTable from "./machines/MachineDropTable";
import TopPerformingMachinesChart from "./machines/TopPerformingMachinesChart";

type ComparisonReportsProps = {
  dateRange: {
    start: Date;
    end: Date;
  };
};

export default function ComparisonReports({
  dateRange,
}: ComparisonReportsProps) {
  const {
    overviewData,
    machinePerformance,
    machineDrop,
    topPerformers,
    loading,
    error,
    selectedLocations,
    fetchData,
    setLocations,
    setDateRange,
  } = useComparisonReportsStore();

  useEffect(() => {
    setDateRange(dateRange.start, dateRange.end);
  }, [dateRange, setDateRange]);

  useEffect(() => {
    if (selectedLocations.length > 0) {
      fetchData();
    }
  }, [selectedLocations, dateRange, fetchData]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleLocationSelect = (locationIds: string[]) => {
    setLocations(locationIds);
  };

  if (loading) {
    return <ComparisonReportsSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <LocationSelector
          onLocationSelect={handleLocationSelect}
          selectedLocations={selectedLocations}
        />
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <h3 className="text-lg font-semibold">Error Loading Data</h3>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!overviewData) {
    return (
      <div className="space-y-6">
        <LocationSelector
          onLocationSelect={handleLocationSelect}
          selectedLocations={selectedLocations}
        />
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-gray-600">
            No Data Available
          </h3>
          <p className="text-sm text-gray-500">
            No comparison data found for the selected locations and date range.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Location Selector - Always visible */}
      <LocationSelector
        onLocationSelect={handleLocationSelect}
        selectedLocations={selectedLocations}
      />

      {/* Overview Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {overviewData.title}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {overviewData.cards.map((card, index) => {
            switch (card.type) {
              case "chart":
                return (
                  <NetWinRevenueChart key={index} data={card.data.chartData!} />
                );
              case "table":
                if (card.title.includes("Drop")) {
                  return (
                    <DropComparisonTable
                      key={index}
                      data={card.data.tableData!}
                    />
                  );
                } else {
                  return (
                    <JackpotComparisonTable
                      key={index}
                      data={card.data.tableData!}
                    />
                  );
                }
              case "metric":
                if (card.data.metricValue && card.data.metricSubtitle) {
                  return (
                    <HoldsMetricCard
                      key={index}
                      data={{
                        metricValue: card.data.metricValue,
                        metricSubtitle: card.data.metricSubtitle,
                      }}
                    />
                  );
                }
                return null;
              default:
                return null;
            }
          })}
        </div>
      </div>

      {/* Machine Performance Section */}
      <div className="space-y-6">
        <MachinePerformanceTable data={machinePerformance} />
        <MachineDropTable data={machineDrop} />
        <TopPerformingMachinesChart data={topPerformers} />
      </div>
    </div>
  );
}
