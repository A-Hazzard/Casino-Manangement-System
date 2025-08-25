"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Download,
  BarChart3,
  Monitor,
  TrendingUp,
  Trophy,
  Activity,
  RefreshCw,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils/formatting";
import { useReportsStore } from "@/lib/store/reportsStore";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { exportData } from "@/lib/utils/exportUtils";
import LocationMap from "@/components/reports/common/LocationMap";


// Recharts imports for CasinoLocationCard charts
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// SAS Evaluation Components
import LocationMultiSelect from "@/components/ui/common/LocationMultiSelect";
import EnhancedLocationTable from "@/components/reports/common/EnhancedLocationTable";
import RevenueAnalysisTable from "@/components/reports/common/RevenueAnalysisTable";

import SimpleChart from "@/components/reports/charts/SimpleChart";
import CompareLocationsModal from "@/components/reports/modals/CompareLocationsModal";

// Reports helpers and components
import { AggregatedLocation } from "@/lib/types/location";
import axios from "axios";

// Types for location data
import { LocationMetrics, TopLocation } from "@/shared/types";

// Skeleton loader components
const MetricsOverviewSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    {[1, 2, 3, 4].map((i) => (
      <Card key={i}>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const TopLocationsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 animate-pulse"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
            <div className="h-5 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="h-5 w-5 bg-gray-200 rounded"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
          {[1, 2, 3, 4].map((j) => (
            <div key={j}>
              <div className="h-3 bg-gray-200 rounded w-20 mb-1"></div>
              <div className="h-5 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="h-24 bg-gray-200 rounded mb-4"></div>

        {/* Daily Trend */}
        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>

        {/* Top Performer */}
        <div className="border-t pt-3">
          <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    ))}
  </div>
);

// Casino Location Card Component
const CasinoLocationCard = ({
  location,
  isSelected,
  onClick,
  isComparisonSelected = false,
}: {
  location: TopLocation;
  isSelected: boolean;
  onClick: () => void;
  isComparisonSelected?: boolean;
}) => {
  const [revenueTrend, setRevenueTrend] = useState<Record<string, unknown>[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);



  const { selectedDateRange } = useReportsStore();

  // Fetch real hourly revenue trend for this location (meters-based)
  useEffect(() => {
    const fetchHourly = async () => {
      try {
        setTrendLoading(true);
        const params = new URLSearchParams();
        params.set("locationId", location.locationId);
        const start =
          selectedDateRange?.start ??
          new Date(Date.now() - 24 * 60 * 60 * 1000);
        const end = selectedDateRange?.end ?? new Date();
        params.set("startDate", start.toISOString());
        params.set("endDate", end.toISOString());
        const res = await axios.get(
          `/api/metrics/hourly-trends?${params.toString()}`
        );
        const payload: {
          hourlyTrends?: Array<{ hour: string; revenue: number }>;
        } = res.data;
        const trend = Array.from({ length: 24 }, (_, i) => {
          const label = `${i.toString().padStart(2, "0")}:00`;
          const found = payload.hourlyTrends?.find((d) => d.hour === label);
          return {
            hour: label,
            revenue: Math.max(0, Math.round(found?.revenue ?? 0)),
          };
        });
        setRevenueTrend(trend);
      } catch {
        const trend = Array.from({ length: 24 }, (_, i) => ({
          hour: `${i.toString().padStart(2, "0")}:00`,
          revenue: 0,
        }));
        setRevenueTrend(trend);
      } finally {
        setTrendLoading(false);
      }
    };
    fetchHourly();
  }, [location.locationId, selectedDateRange?.start, selectedDateRange?.end]);



  const totalRevenue = revenueTrend.reduce(
    (sum, item) => sum + (item.revenue as number),
    0
  );
  const peakRevenue =
    revenueTrend.length > 0
      ? Math.max(...revenueTrend.map((item) => item.revenue as number))
      : 0;
  const avgRevenue =
    revenueTrend.length > 0
      ? Math.floor(totalRevenue / revenueTrend.length)
      : 0;

  const chartData = revenueTrend.map((item) => ({
    hour: item.hour,
    revenue: item.revenue,
  }));





  return (
    <div
      className={`bg-white rounded-xl shadow-lg p-6 w-full border border-gray-200 cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] ${
        isSelected
          ? "ring-2 ring-blue-500 shadow-xl bg-blue-50"
          : isComparisonSelected
          ? "ring-2 ring-blue-400 shadow-xl bg-blue-50"
          : "hover:ring-1 hover:ring-gray-300"
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg font-semibold text-gray-900">
            {location.locationName}
          </span>
          {isComparisonSelected && (
            <div className="ml-2 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          )}
        </div>
      </div>
      <div className="text-xs sm:text-sm text-gray-500 mb-4">
        {location.onlineMachines}/{location.totalMachines} machines online
      </div>

      {/* Metrics Grid - Responsive layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-x-6 sm:gap-y-2 mb-4">
        <div className="flex flex-col sm:block">
          <div className="text-xs text-gray-500">Gross Revenue:</div>
          <div className="text-green-600 font-bold text-base sm:text-lg">
            {formatCurrency(location.gross || 0)}
          </div>
        </div>
        <div className="flex flex-col sm:block">
          <div className="text-xs text-gray-500">Drop:</div>
          <div className="text-yellow-600 font-bold text-base sm:text-lg">
            {formatCurrency(location.drop || 0)}
          </div>
        </div>
        <div className="flex flex-col sm:block">
          <div className="text-xs text-gray-500">Gross %:</div>
          <div className="text-gray-900 font-bold text-base sm:text-lg">
            {location.drop > 0
              ? ((location.gross / location.drop) * 100).toFixed(1)
              : "0.0"}
            %
          </div>
        </div>
        <div className="flex flex-col sm:block">
          <div className="text-xs text-gray-500">Cancelled Credits:</div>
          <div className="text-gray-900 font-bold text-base sm:text-lg">
            {formatCurrency(location.cancelledCredits || 0)}
          </div>
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">24h Revenue Trend</span>
          <span className="text-xs text-gray-500">
            Total:{" "}
            <span className="font-semibold text-gray-900">
              {formatCurrency(totalRevenue)}
            </span>
          </span>
        </div>
        {trendLoading ? (
          <Skeleton className="h-32 w-full rounded" />
        ) : (
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                    return value.toString();
                  }}
                />
                <Tooltip
                  formatter={(value: unknown) => [
                    formatCurrency(value as number),
                    "Revenue",
                  ]}
                  labelFormatter={(label) => `${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#3b82f6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>
            Peak:{" "}
            <span className="font-semibold text-gray-900">
              {formatCurrency(peakRevenue)}
            </span>
          </span>
          <span>
            Avg Hourly:{" "}
            <span className="font-semibold text-gray-900">
              {formatCurrency(avgRevenue)}
            </span>
          </span>
        </div>
      </div>

      {/* Simplified: removed daily trend and top performer sections */}
    </div>
  );
};

export default function LocationsTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activeMetricsFilter, customDateRange, selectedLicencee } =
    useDashBoardStore();

  const { selectedDateRange } = useReportsStore();

  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [metricsOverview, setMetricsOverview] =
    useState<LocationMetrics | null>(null);
  const [topLocations, setTopLocations] = useState<TopLocation[]>([]);

  // Two-phase loading: gaming locations (fast) + financial data (slow)
  const [gamingLocations, setGamingLocations] = useState<Record<string, unknown>[]>([]);
  const [gamingLocationsLoading, setGamingLocationsLoading] = useState(true);

  const [metricsLoading, setMetricsLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [paginatedLocations, setPaginatedLocations] = useState<
    AggregatedLocation[]
  >([]);
  const [paginationLoading, setPaginationLoading] = useState(true); // Start with loading true

  // Combined loading state for better UX
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  // Store all locations for dropdown selection (not just paginated ones)
  const [allLocationsForDropdown, setAllLocationsForDropdown] = useState<
    AggregatedLocation[]
  >([]);

  // Fast fetch for gaming locations (Phase 1)
  const fetchGamingLocationsAsync = useCallback(async () => {
    setGamingLocationsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedLicencee && selectedLicencee !== "all") {
        params.append("licencee", selectedLicencee);
      }

      const response = await axios.get(`/api/locations?${params.toString()}`);
      const { locations: locationsData } = response.data;
      console.warn(
        `🗺️ Gaming locations fetched: ${locationsData?.length || 0} locations`
      );
      setGamingLocations(locationsData || []);
    } catch (error) {
      console.error("Error loading gaming locations:", error);
      setGamingLocations([]);
    } finally {
      setGamingLocationsLoading(false);
    }
  }, [selectedLicencee]);

  // Comparison state
  const [selectedForComparison, setSelectedForComparison] = useState<
    (AggregatedLocation | TopLocation)[]
  >([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [comparisonType, setComparisonType] = useState<
    "locations" | "machines"
  >("locations");

  // Simplified data fetching for locations
  const fetchLocationDataAsync = useCallback(
    async (specificLocations?: string[]) => {
              console.warn(`🔍 Starting fetchLocationDataAsync: ${JSON.stringify({ specificLocations })}`);
      setGamingLocationsLoading(true);
      setLocationsLoading(true);
      setMetricsLoading(true);
      setPaginationLoading(true);
      setIsInitialLoadComplete(false);

      try {
        // Fetch gaming locations first (for map)
        await fetchGamingLocationsAsync();

        // Build API parameters for location data
        const params: Record<string, string> = {
          limit: "1000", // Get all locations
          page: "1",
          showAllLocations: "true",
        };

        if (selectedLicencee && selectedLicencee !== "all") {
          params.licencee = selectedLicencee;
        }

        // Note: We don't add selectedLocations filter here to ensure dropdown always shows all locations
        // The selectedLocations filter will be applied separately for data display

        // Add SAS evaluation filter for SAS Evaluation tab
        if (activeTab === "location-evaluation") {
          params.sasEvaluationOnly = "true";
        }
        // For revenue analysis tab, we want all locations (SAS and non-SAS)
        // No additional filter needed as it will fetch all locations by default

        // Use appropriate date parameter based on active filter
        if (activeMetricsFilter === "Today") {
          params.timePeriod = "Today";
        } else if (activeMetricsFilter === "Yesterday") {
          params.timePeriod = "Yesterday";
        } else if (
          activeMetricsFilter === "last7days" ||
          activeMetricsFilter === "7d"
        ) {
          params.timePeriod = "7d";
        } else if (
          activeMetricsFilter === "last30days" ||
          activeMetricsFilter === "30d"
        ) {
          params.timePeriod = "30d";
        } else if (activeMetricsFilter === "All Time") {
          params.timePeriod = "All Time";
        } else if (
          activeMetricsFilter === "Custom" &&
          customDateRange?.startDate &&
          customDateRange?.endDate
        ) {
          params.startDate = (
            customDateRange.startDate instanceof Date
              ? customDateRange.startDate
              : new Date(customDateRange.startDate as string)
          ).toISOString();
          params.endDate = (
            customDateRange.endDate instanceof Date
              ? customDateRange.endDate
              : new Date(customDateRange.endDate as string)
          ).toISOString();
        } else {
          // Fallback to Today if no valid filter
          params.timePeriod = "Today";
        }

        console.warn(`🔍 Location data API params: ${JSON.stringify(params)}`);

        // API call to get location data with financial metrics
        const response = await axios.get("/api/locationAggregation", {
          params,
          timeout: 60000, // 60 second timeout
        });

        // Check for error response
        if (response.data.error) {
          console.error("❌ LocationData API Error:", response.data.error);
          toast.error("Failed to fetch location data. Please try again.");
          throw new Error(response.data.error);
        }

        const { data: locationData } = response.data;

        console.warn(`🔍 Location data from API: ${locationData.length}`);

        // Normalize location data
        const normalizedLocations = locationData.map((loc: Record<string, unknown>) => ({
          ...loc,
          gross: loc.gross || 0,
          locationName:
            loc.locationName || loc.name || loc.location || "Unknown",
        }));

        // Store locations for dropdown selection (always all locations)
        setAllLocationsForDropdown(normalizedLocations);

        // Filter data based on selected locations if any are selected
        const filteredData = selectedLocations.length > 0 
          ? normalizedLocations.filter((loc: Record<string, unknown>) => 
              selectedLocations.includes(loc.location as string)
            )
          : normalizedLocations;

        // Set paginated data (filtered if locations are selected)
        setPaginatedLocations(filteredData);
        setCurrentPage(1);
        setTotalPages(1);
        setTotalCount(normalizedLocations.length);

        // Calculate metrics overview (use filtered data if locations are selected)
        const dataForMetrics = selectedLocations.length > 0 ? filteredData : normalizedLocations;
        const overview = dataForMetrics.reduce(
          (acc: Record<string, unknown>, loc: Record<string, unknown>) => {
            (acc.totalGross as number) += (loc.gross as number) || 0;
            (acc.totalDrop as number) += (loc.moneyIn as number) || 0;
            (acc.totalCancelledCredits as number) += (loc.moneyOut as number) || 0;
            (acc.onlineMachines as number) += (loc.onlineMachines as number) || 0;
            (acc.totalMachines as number) += (loc.totalMachines as number) || 0;
            return acc;
          },
          {
            totalGross: 0,
            totalDrop: 0,
            totalCancelledCredits: 0,
            onlineMachines: 0,
            totalMachines: 0,
          }
        );

        setMetricsOverview(overview);
        setMetricsLoading(false);

        // Get top 5 locations for overview (use filtered data if locations are selected)
        const dataForTopLocations = selectedLocations.length > 0 ? filteredData : normalizedLocations;
        const sorted = dataForTopLocations
          .sort((a: Record<string, unknown>, b: Record<string, unknown>) => ((b.gross as number) || 0) - ((a.gross as number) || 0))
          .slice(0, 5)
          .map((loc: Record<string, unknown>) => ({
            locationId: loc.location,
            locationName:
              loc.locationName || loc.name || loc.location || "Unknown",
            gross: loc.gross || 0,
            drop: loc.moneyIn || 0,
            cancelledCredits: loc.moneyOut || 0,
            onlineMachines: loc.onlineMachines || 0,
            totalMachines: loc.totalMachines || 0,
            performance: "average" as const,
            sasEnabled: loc.hasSasMachines || (loc.sasMachines as number) > 0,
            coordinates: undefined,
            holdPercentage:
              (loc.moneyIn as number) > 0 ? ((loc.gross as number) / (loc.moneyIn as number)) * 100 : 0,
          }));

        setTopLocations(sorted);
        setLocationsLoading(false);

        console.warn("🔍 Location data successful - setting loading states to false");

        // Set loading states
        setGamingLocationsLoading(false);
        setPaginationLoading(false);
        setIsInitialLoadComplete(true);
      } catch (error) {
        console.error("❌ Error fetching location data:", error);

        // Show user-friendly error message
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 500) {
            toast.error(
              "Server error: Database query timeout. Please try again."
            );
          } else if (error.response?.status === 404) {
            toast.error("Location data not found. Please check your filters.");
          } else {
            toast.error("Failed to load location data. Please try again.");
          }
        } else {
          toast.error("Failed to load location data. Please try again.");
        }

        // Reset loading states and data
        setGamingLocationsLoading(false);
        setLocationsLoading(false);
        setMetricsLoading(false);
        setPaginationLoading(false);
        setIsInitialLoadComplete(false);
        setAllLocationsForDropdown([]);
        setPaginatedLocations([]);
        setMetricsOverview(null);
        setTopLocations([]);
      }
    },
    [
      selectedLicencee,
      activeTab,
      activeMetricsFilter,
      customDateRange?.startDate,
      customDateRange?.endDate,
      fetchGamingLocationsAsync,
      selectedLocations,
    ]
  );

  useEffect(() => {
    // Fetch location data for all tabs (only when filters change, not when locations are selected)
    if (selectedLocations.length === 0) {
      fetchLocationDataAsync();
    }
  }, [
    selectedLicencee,
    activeTab,
    activeMetricsFilter,
    customDateRange?.startDate,
    customDateRange?.endDate,
    fetchLocationDataAsync,
    selectedLocations.length,
  ]);

  // Handle location selection by re-querying the API
  useEffect(() => {
    if (selectedLocations.length > 0) {
      // Re-fetch data with selected locations filter
      fetchLocationDataAsync(selectedLocations);
    }
  }, [selectedLocations, fetchLocationDataAsync]);

  // Initialize from URL
  useEffect(() => {
    const initial = searchParams?.get("ltab");
    if (initial && initial !== activeTab) setActiveTab(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLocationsTabChange = (tab: string) => {
    setActiveTab(tab);
    try {
      const sp = new URLSearchParams(searchParams?.toString() || "");
      sp.set("ltab", tab);
      sp.set("section", "locations");
      router.replace(`${pathname}?${sp.toString()}`);
    } catch {}
  };
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeMetricsFilter, selectedDateRange, selectedLicencee]);

  // Filter displayed data when selectedLocations changes
  useEffect(() => {
    if (allLocationsForDropdown.length > 0) {
      const filteredData = selectedLocations.length > 0 
        ? allLocationsForDropdown.filter((loc) => 
            selectedLocations.includes(loc.location as string)
          )
        : allLocationsForDropdown;

      setPaginatedLocations(filteredData);
      setTotalCount(filteredData.length);
      setCurrentPage(1);

      // Recalculate metrics overview
      const overview = filteredData.reduce(
        (acc: Record<string, unknown>, loc: Record<string, unknown>) => {
          (acc.totalGross as number) += (loc.gross as number) || 0;
          (acc.totalDrop as number) += (loc.moneyIn as number) || 0;
          (acc.totalCancelledCredits as number) += (loc.moneyOut as number) || 0;
          (acc.onlineMachines as number) += (loc.onlineMachines as number) || 0;
          (acc.totalMachines as number) += (loc.totalMachines as number) || 0;
          return acc;
        },
        {
          totalGross: 0,
          totalDrop: 0,
          totalCancelledCredits: 0,
          onlineMachines: 0,
          totalMachines: 0,
        }
      ) as LocationMetrics;
      setMetricsOverview(overview);

      // Recalculate top locations
      const sorted = filteredData
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => ((b.gross as number) || 0) - ((a.gross as number) || 0))
        .slice(0, 5)
        .map((loc: Record<string, unknown>) => ({
          locationId: loc.location as string,
          locationName:
            (loc.locationName || loc.name || loc.location || "Unknown") as string,
          gross: (loc.gross || 0) as number,
          drop: (loc.moneyIn || 0) as number,
          cancelledCredits: (loc.moneyOut || 0) as number,
          onlineMachines: (loc.onlineMachines || 0) as number,
          totalMachines: (loc.totalMachines || 0) as number,
          performance: "average" as const,
          sasEnabled: (loc.hasSasMachines || (loc.sasMachines as number) > 0) as boolean,
          coordinates: undefined,
          holdPercentage:
            (loc.moneyIn as number) > 0 ? ((loc.gross as number) / (loc.moneyIn as number)) * 100 : 0,
        })) as TopLocation[];
      setTopLocations(sorted);
    }
  }, [selectedLocations, allLocationsForDropdown]);

  // Debug effect to log state changes
  useEffect(() => {
    console.warn(`🔍 State Debug - paginationLoading: ${paginationLoading}, locations count: ${paginatedLocations.length}, currentPage: ${currentPage}, totalPages: ${totalPages}, totalCount: ${totalCount}`);
    console.warn(`🔍 Table Props Debug - totalPages: ${totalPages}, totalCount: ${totalCount}`);
    console.warn(`🔍 Loading State Debug - paginationLoading: ${paginationLoading}, should show skeleton: ${paginationLoading}`);
  }, [
    paginationLoading,
    paginatedLocations.length,
    currentPage,
    totalPages,
    totalCount,
  ]);

  const handleLocationSelect = (locationIds: string[]) => {
    // For now, handle the first selected location if any
    if (locationIds.length > 0) {
      const locationId = locationIds[0];
      setSelectedLocations((prev) =>
        prev.includes(locationId)
          ? prev.filter((id) => id !== locationId)
          : [...prev, locationId]
      );
    }
  };

  const handleExportSASEvaluation = async () => {
    try {
      const filteredData =
        selectedLocations.length > 0
          ? paginatedLocations.filter((loc) => {
              // Find the corresponding topLocation to get the correct locationId
              const topLocation = topLocations.find(
                (tl) => tl.locationName === loc.locationName
              );
              return topLocation
                ? selectedLocations.includes(topLocation.locationId)
                : false;
            })
          : paginatedLocations;

      const exportDataObj = {
        title: "SAS Evaluation Report",
        subtitle: "SAS machine evaluation and performance metrics",
        headers: [
          "Location ID",
          "Location Name",
          "Money In",
          "Money Out",
          "Gross",
          "Total Machines",
          "Online Machines",
          "SAS Machines",
          "Non-SAS Machines",
          "Has SAS Machines",
          "Has Non-SAS Machines",
          "Is Local Server",
        ],
        data: filteredData.map((loc) => [
          loc.location,
          loc.locationName,
          (loc.moneyIn || 0).toLocaleString(),
          (loc.moneyOut || 0).toLocaleString(),
          (loc.gross || 0).toLocaleString(),
          loc.totalMachines,
          loc.onlineMachines,
          loc.sasMachines,
          loc.nonSasMachines,
          loc.hasSasMachines ? "Yes" : "No",
          loc.hasNonSasMachines ? "Yes" : "No",
          loc.isLocalServer ? "Yes" : "No",
        ]),
        summary: [
          { label: "Total Locations", value: filteredData.length.toString() },
          {
            label: "Total SAS Machines",
            value: filteredData
              .reduce((sum, loc) => sum + loc.sasMachines, 0)
              .toString(),
          },
          {
            label: "Total Non-SAS Machines",
            value: filteredData
              .reduce((sum, loc) => sum + loc.nonSasMachines, 0)
              .toString(),
          },
          {
            label: "Total Gross Revenue",
            value: `$${filteredData
              .reduce((sum, loc) => sum + (loc.gross || 0), 0)
              .toLocaleString()}`,
          },
        ],
        metadata: {
          generatedBy: "Reports System",
          generatedAt: new Date().toISOString(),
          dateRange:
            selectedDateRange?.start && selectedDateRange?.end
              ? `${selectedDateRange.start.toLocaleDateString()} - ${selectedDateRange.end.toLocaleDateString()}`
              : `${activeMetricsFilter}`,
          tab: "SAS Evaluation",
          selectedLocations:
            selectedLocations.length > 0 ? selectedLocations.length : "All",
        },
      };

      await exportData(exportDataObj);
      toast.success("SAS evaluation report exported successfully");
    } catch (error) {
      toast.error("Failed to export report");
      console.error("Export error:", error);
    }
  };

  const handleExportRevenueAnalysis = async () => {
    try {
      const filteredData =
        selectedLocations.length > 0
          ? paginatedLocations.filter((loc) => {
              // Find the corresponding topLocation to get the correct locationId
              const topLocation = topLocations.find(
                (tl) => tl.locationName === loc.locationName
              );
              return topLocation
                ? selectedLocations.includes(topLocation.locationId)
                : false;
            })
          : paginatedLocations;

      const exportDataObj = {
        title: "Revenue Analysis Report",
        subtitle:
          "Location revenue metrics with machine numbers, drop, cancelled credits, and gross revenue",
        headers: [
          "Location Name",
          "Machine Numbers",
          "Drop",
          "Cancelled Credits",
          "Gross Revenue",
        ],
        data: filteredData.map((loc) => [
          loc.locationName,
          loc.totalMachines?.toString() || "0",
          (loc.moneyIn || 0).toLocaleString(),
          (loc.moneyOut || 0).toLocaleString(),
          (loc.gross || 0).toLocaleString(),
        ]),
        summary: [
          { label: "Total Locations", value: filteredData.length.toString() },
          {
            label: "Total Machines",
            value: filteredData
              .reduce((sum, loc) => sum + (loc.totalMachines || 0), 0)
              .toString(),
          },
          {
            label: "Total Drop",
            value: `$${filteredData
              .reduce((sum, loc) => sum + (loc.moneyIn || 0), 0)
              .toLocaleString()}`,
          },
          {
            label: "Total Cancelled Credits",
            value: `$${filteredData
              .reduce((sum, loc) => sum + (loc.moneyOut || 0), 0)
              .toLocaleString()}`,
          },
          {
            label: "Total Gross Revenue",
            value: `$${filteredData
              .reduce((sum, loc) => sum + (loc.gross || 0), 0)
              .toLocaleString()}`,
          },
        ],
        metadata: {
          generatedBy: "Reports System",
          generatedAt: new Date().toISOString(),
          dateRange:
            selectedDateRange?.start && selectedDateRange?.end
              ? `${selectedDateRange.start.toLocaleDateString()} - ${selectedDateRange.end.toLocaleDateString()}`
              : `${activeMetricsFilter}`,
          tab: "Revenue Analysis",
          selectedLocations:
            selectedLocations.length > 0 ? selectedLocations.length : "All",
        },
      };

      await exportData(exportDataObj);
      toast.success("Revenue analysis report exported successfully");
    } catch (error) {
      toast.error("Failed to export report");
      console.error("Export error:", error);
    }
  };

  // Comparison functions
  const handleItemClick = (
    item: AggregatedLocation | TopLocation,
    type: "locations" | "machines"
  ) => {
    setSelectedForComparison((prev) => {
      const isSelected = prev.some((selected) => {
        if ("location" in item && "location" in selected) {
          return selected.location === item.location;
        }
        if ("locationId" in item && "locationId" in selected) {
          return selected.locationId === item.locationId;
        }
        return false;
      });

      if (isSelected) {
        return prev.filter((selected) => {
          if ("location" in item && "location" in selected) {
            return selected.location !== item.location;
          }
          if ("locationId" in item && "locationId" in selected) {
            return selected.locationId !== item.locationId;
          }
          return true;
        });
      } else {
        return [...prev, item];
      }
    });
    setComparisonType(type);
  };

  const handleCompareClick = () => {
    if (selectedForComparison.length > 0) {
      setIsCompareModalOpen(true);
    }
  };

  const handleClearComparison = () => {
    setSelectedForComparison([]);
  };

  const isItemSelected = (item: AggregatedLocation | TopLocation) => {
    return selectedForComparison.some((selected) => {
      if ("location" in item && "location" in selected) {
        return selected.location === item.location;
      }
      if ("locationId" in item && "locationId" in selected) {
        return selected.locationId === item.locationId;
      }
      return false;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Location Performance Overview
          </h2>
          <p className="text-sm text-gray-600">
            Compare performance across all casino locations
          </p>
          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
            <span role="img" aria-label="lightbulb">
              💡
            </span>{" "}
            Click any location card to view detailed information
          </p>
        </div>
      </div>

      {/* Three-Tab Navigation System */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Navigation Tabs
        </h3>
        <Tabs
          value={activeTab}
          onValueChange={handleLocationsTabChange}
          className="w-full"
        >
          {/* Desktop Navigation */}
          <TabsList className="hidden md:grid w-full grid-cols-3 mb-6 bg-gray-100 p-2 rounded-lg shadow-sm">
            <TabsTrigger
              value="overview"
              className="flex-1 bg-white rounded px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="location-evaluation"
              className="flex-1 bg-white rounded px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              SAS Evaluation
            </TabsTrigger>
            <TabsTrigger
              value="location-revenue"
              className="flex-1 bg-white rounded px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              Revenue Analysis
            </TabsTrigger>
          </TabsList>

          {/* Mobile Navigation */}
          <div className="md:hidden mb-6">
            <select
              value={activeTab}
              onChange={(e) => handleLocationsTabChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base font-semibold bg-white shadow-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
            >
              <option value="overview">Overview</option>
              <option value="location-evaluation">SAS Evaluation</option>
              <option value="location-revenue">Revenue Analysis</option>
            </select>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Interactive Map */}
            <LocationMap
              key={`map-${activeTab}-${topLocations.length}`}
              locations={topLocations.map((location) => ({
                id: location.locationId,
                name: location.locationName,
                coordinates: location.coordinates || { lat: 0, lng: 0 },
                performance:
                  location.performance === "excellent"
                    ? 95
                    : location.performance === "good"
                    ? 80
                    : location.performance === "average"
                    ? 65
                    : 50,
                revenue: location.gross,
              }))}
              selectedLocations={selectedLocations}
              onLocationSelect={handleLocationSelect}
              aggregates={paginatedLocations}
              gamingLocations={gamingLocations}
              gamingLocationsLoading={gamingLocationsLoading}
              financialDataLoading={locationsLoading}
            />

            {/* Metrics Overview */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Metrics Overview
              </h3>
              <div className="flex justify-end mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    fetchLocationDataAsync(
                      selectedLocations.length > 0
                        ? selectedLocations
                        : undefined
                    );
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
              </div>
              {metricsLoading ? (
                <MetricsOverviewSkeleton />
              ) : metricsOverview ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 break-words">
                        ${metricsOverview.totalGross.toLocaleString()}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">
                        Total Gross Revenue
                      </p>
                      <p className="text-xs text-green-600 font-medium">
                        (Green - Gross)
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600 break-words">
                        ${metricsOverview.totalDrop.toLocaleString()}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">
                        Total Drop
                      </p>
                      <p className="text-xs text-yellow-600 font-medium">
                        (Yellow - Drop)
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-black break-words">
                        $
                        {metricsOverview.totalCancelledCredits.toLocaleString()}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">
                        Total Cancelled Credits
                      </p>
                      <p className="text-xs text-black font-medium">
                        (Black - Cancelled)
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 break-words">
                        {metricsOverview.onlineMachines}/
                        {metricsOverview.totalMachines}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">
                        Online Machines
                      </p>
                      <Progress
                        value={
                          (metricsOverview.onlineMachines /
                            metricsOverview.totalMachines) *
                          100
                        }
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No metrics data available
                </div>
              )}
            </div>

            {/* Top 5 Locations */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Top 5 Locations (Sorted by Gross)
                </h3>
                {selectedForComparison.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {selectedForComparison.length} selected
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCompareClick}
                      className="flex items-center gap-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Compare ({selectedForComparison.length})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearComparison}
                      className="text-red-600 hover:text-red-700"
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
              {locationsLoading ? (
                <TopLocationsSkeleton />
              ) : topLocations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {topLocations.map((location) => (
                    <CasinoLocationCard
                      key={location.locationId}
                      location={location}
                      isSelected={selectedLocations.includes(
                        location.locationId
                      )}
                      isComparisonSelected={isItemSelected(location)}
                      onClick={() => handleItemClick(location, "locations")}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No location data available
                </div>
              )}
            </div>
          </TabsContent>

          {/* SAS Evaluation Tab */}
          <TabsContent value="location-evaluation" className="space-y-6">
            {/* Enhanced SAS Evaluation Interface */}
            <div className="space-y-6">
              {/* Header with Export Buttons */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    SAS Evaluation Dashboard
                  </h3>
                  <p className="text-sm text-gray-600">
                    Comprehensive location evaluation with interactive filtering
                    and real-time data visualization
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportSASEvaluation}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Location Selection Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Location Selection & Controls
                  </CardTitle>
                  <CardDescription>
                    Select up to 5 SAS-enabled locations to filter data (SAS
                    locations only)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select SAS Locations (Max 5)
                      </label>
                      {!isInitialLoadComplete ? (
                        <div className="w-full h-10 bg-gray-100 rounded-md flex items-center justify-center">
                          <div className="text-sm text-gray-500">
                            Loading locations...
                          </div>
                        </div>
                      ) : (
                        <LocationMultiSelect
                          locations={allLocationsForDropdown
                            .filter((loc) => loc.sasMachines > 0) // Only locations with SAS machines for SAS Evaluation
                            .map((loc) => ({
                              id: loc.location,
                              name: loc.locationName,
                              sasEnabled: loc.sasMachines > 0,
                            }))}
                          selectedLocations={selectedLocations}
                          onSelectionChange={(newSelection) => {
                            // Limit to 5 selections
                            if (newSelection.length <= 5) {
                              setSelectedLocations(newSelection);
                            } else {
                              toast.error(
                                "Maximum 5 locations can be selected"
                              );
                            }
                          }}
                          placeholder="Choose SAS locations to filter..."
                          maxSelections={5}
                        />
                      )}
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedLocations([])}
                        className="w-full"
                      >
                        Clear Selection
                      </Button>
                    </div>
                    <div className="flex items-end">
                      <div className="text-sm text-gray-600">
                        {selectedLocations.length > 0
                          ? `${selectedLocations.length} location${
                              selectedLocations.length > 1 ? "s" : ""
                            } selected`
                          : "Please select locations to view data"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Only show data when locations are selected and initial load is complete */}
              {selectedLocations.length > 0 && isInitialLoadComplete ? (
                <>
                  {/* Enhanced Location Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Location Evaluation Table
                      </CardTitle>
                      <CardDescription>
                        Comprehensive location metrics with SAS status
                        indicators
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <EnhancedLocationTable
                        key={`enhanced-table-${activeTab}-${paginatedLocations.length}`}
                        locations={(selectedLocations.length > 0
                          ? paginatedLocations.filter((loc) => {
                              // Find the corresponding topLocation to get the correct locationId
                              const topLocation = topLocations.find(
                                (tl) => tl.locationName === loc.locationName
                              );
                              return topLocation
                                ? selectedLocations.includes(
                                    topLocation.locationId
                                  )
                                : false;
                            })
                          : []
                        ).map((loc) => {
                          // Debug logging to check data values
                          console.warn(`🔍 Location data for table: ${JSON.stringify({
                            location: loc.location,
                            locationName: loc.locationName,
                            gamesPlayed: loc.gamesPlayed,
                            moneyIn: loc.moneyIn,
                            moneyOut: loc.moneyOut,
                            gross: loc.gross,
                            totalMachines: loc.totalMachines,
                            onlineMachines: loc.onlineMachines,
                            sasMachines: loc.sasMachines,
                            nonSasMachines: loc.nonSasMachines,
                          })}`);

                          return {
                            location: loc.location,
                            locationName: loc.locationName,
                            moneyIn: loc.moneyIn,
                            moneyOut: loc.moneyOut,
                            gross: loc.gross,
                            coinIn: loc.coinIn || 0,
                            coinOut: loc.coinOut || 0,
                            jackpot: loc.jackpot || 0,
                            totalMachines: loc.totalMachines,
                            onlineMachines: loc.onlineMachines,
                            sasMachines: loc.sasMachines,
                            nonSasMachines: loc.nonSasMachines,
                            hasSasMachines: loc.hasSasMachines,
                            hasNonSasMachines: loc.hasNonSasMachines,
                            isLocalServer: loc.isLocalServer,
                            noSMIBLocation: !loc.hasSasMachines,
                            hasSmib: loc.hasSasMachines,
                            gamesPlayed: loc.gamesPlayed,
                          };
                        })}
                        onLocationClick={(locationId) => {
                          // Handle location click - could navigate to location details
                          console.warn(`Location clicked: ${locationId}`);
                        }}
                        loading={paginationLoading}
                        error={null}
                      />
                    </CardContent>
                  </Card>

                  {/* Charts Section - Using existing data instead of API calls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Generate chart data from existing location data */}
                    {(() => {
                      // Use filtered locations if any are selected, otherwise use all
                      const chartLocations =
                        selectedLocations.length > 0
                          ? paginatedLocations.filter((loc) =>
                              selectedLocations.includes(loc.location)
                            )
                          : [];

                      // Generate handle trends data from location data
                      const handleData = chartLocations
                        .slice(0, 10)
                        .map((loc, index) => ({
                          time: `${index + 1}`,
                          handle: loc.moneyIn || 0,
                          location: loc.locationName || `Location ${index + 1}`,
                        }));

                      // Generate win/loss data from location data
                      const winLossData = chartLocations
                        .slice(0, 10)
                        .map((loc, index) => ({
                          time: `${index + 1}`,
                          wins: loc.gross || 0,
                          losses: loc.moneyOut || 0,
                          location: loc.locationName || `Location ${index + 1}`,
                        }));

                      // Generate jackpot data from location data
                      const jackpotData = chartLocations
                        .slice(0, 10)
                        .map((loc, index) => ({
                          time: `${index + 1}`,
                          jackpot: Math.floor((loc.gross || 0) * 0.1), // 10% of gross as jackpot
                          location: loc.locationName || `Location ${index + 1}`,
                        }));

                      // Generate plays data from location data
                      const playsData = chartLocations
                        .slice(0, 10)
                        .map((loc, index) => ({
                          time: `${index + 1}`,
                          plays: loc.gamesPlayed || 0, // Use real gamesPlayed data
                          location: loc.locationName || `Location ${index + 1}`,
                        }));

                      return (
                        <>
                          <SimpleChart
                            type="line"
                            title="Handle Trends"
                            icon={<TrendingUp className="h-5 w-5" />}
                            data={handleData}
                            dataKey="handle"
                            color="#8884d8"
                            formatter={(value) => `$${(value as number).toLocaleString()}`}
                          />

                          <SimpleChart
                            type="bar"
                            title="Win/Loss Analysis"
                            icon={<BarChart3 className="h-5 w-5" />}
                            data={winLossData}
                            dataKey="wins"
                            color="#4ade80"
                            formatter={(value) => `$${(value as number).toLocaleString()}`}
                          />

                          <SimpleChart
                            type="area"
                            title="Jackpot Trends"
                            icon={<Trophy className="h-5 w-5" />}
                            data={jackpotData}
                            dataKey="jackpot"
                            color="#fbbf24"
                            formatter={(value) => `$${(value as number).toLocaleString()}`}
                          />

                          <SimpleChart
                            type="bar"
                            title="Plays Analysis"
                            icon={<Activity className="h-5 w-5" />}
                            data={playsData}
                            dataKey="plays"
                            color="#3b82f6"
                            formatter={(value) => (value as number).toLocaleString()}
                          />
                        </>
                      );
                    })()}
                  </div>

                  {/* Top Machines Section - Overall top 5 across selected locations */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Trophy className="h-5 w-5" />
                          Top 5 Machines (Overall)
                        </CardTitle>
                        {selectedForComparison.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                              {selectedForComparison.length} selected
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCompareClick}
                              className="flex items-center gap-2"
                            >
                              <BarChart3 className="w-4 h-4" />
                              Compare ({selectedForComparison.length})
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleClearComparison}
                              className="text-red-600 hover:text-red-700"
                            >
                              Clear
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(() => {
                          // Get all locations and sort by gross revenue to get overall top 5
                          const allLocations =
                            selectedLocations.length > 0
                              ? paginatedLocations.filter((loc) =>
                                  selectedLocations.includes(loc.location)
                                )
                              : [];

                          // Sort by gross revenue and take top 5
                          const top5Locations = allLocations
                            .sort((a, b) => (b.gross || 0) - (a.gross || 0))
                            .slice(0, 5);

                          return top5Locations.map((location, index) => (
                            <div
                              key={`${location.location}-${index}`}
                              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-100 ${
                                isItemSelected(location)
                                  ? "bg-blue-50 border-2 border-blue-400"
                                  : "bg-gray-50 border-2 border-transparent"
                              }`}
                              onClick={() =>
                                handleItemClick(location, "machines")
                              }
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {location.locationName ||
                                      `Location ${index + 1}`}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {location.totalMachines || 0} machines
                                  </div>
                                </div>
                                {isItemSelected(location) && (
                                  <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-green-600">
                                  ${(location.gross || 0).toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {location.gross && location.moneyIn
                                    ? `${(
                                        (location.gross / location.moneyIn) *
                                        100
                                      ).toFixed(1)}% hold`
                                    : "N/A"}
                                </div>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : !isInitialLoadComplete ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="text-gray-500 text-lg mb-2">
                      Loading Data...
                    </div>
                    <div className="text-gray-400 text-sm">
                      Please wait while we fetch location data
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="text-gray-500 text-lg mb-2">
                      No Data to Display
                    </div>
                    <div className="text-gray-400 text-sm">
                      Please select up to 5 SAS-enabled locations to view
                      evaluation data
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Revenue Analysis Tab */}
          <TabsContent value="location-revenue" className="space-y-6">
            {/* Enhanced Revenue Analysis Interface */}
            <div className="space-y-6">
              {/* Header with Export Buttons */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Revenue Analysis Dashboard
                  </h3>
                  <p className="text-sm text-gray-600">
                    Comprehensive revenue analysis with location name, machine
                    numbers, drop, cancelled credits, and gross revenue
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportRevenueAnalysis}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Location Selection Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Location Selection & Controls
                  </CardTitle>
                  <CardDescription>
                    Select up to 5 locations to filter data (SAS and non-SAS
                    locations)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Locations (Max 5)
                      </label>
                      {!isInitialLoadComplete ? (
                        <div className="w-full h-10 bg-gray-100 rounded-md flex items-center justify-center">
                          <div className="text-sm text-gray-500">
                            Loading locations...
                          </div>
                        </div>
                      ) : (
                        <LocationMultiSelect
                          locations={allLocationsForDropdown.map((loc) => ({
                            id: loc.location,
                            name: loc.locationName,
                            sasEnabled: loc.hasSasMachines,
                          }))}
                          selectedLocations={selectedLocations}
                          onSelectionChange={(newSelection) => {
                            // Limit to 5 selections
                            if (newSelection.length <= 5) {
                              setSelectedLocations(newSelection);
                            } else {
                              toast.error(
                                "Maximum 5 locations can be selected"
                              );
                            }
                          }}
                          placeholder="Choose locations to filter..."
                          maxSelections={5}
                        />
                      )}
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedLocations([])}
                        className="w-full"
                      >
                        Clear Selection
                      </Button>
                    </div>
                    <div className="flex items-end">
                      <div className="text-sm text-gray-600">
                        {selectedLocations.length > 0
                          ? `${selectedLocations.length} location${
                              selectedLocations.length > 1 ? "s" : ""
                            } selected`
                          : "Please select locations to view data"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Only show data when locations are selected and initial load is complete */}
              {selectedLocations.length > 0 && isInitialLoadComplete ? (
                <>
                  {/* Revenue Analysis Table */}
                  <RevenueAnalysisTable
                    key={`revenue-table-${activeTab}-${paginatedLocations.length}`}
                    locations={
                      selectedLocations.length > 0
                        ? paginatedLocations.filter((loc) => {
                            // Find the corresponding topLocation to get the correct locationId
                            const topLocation = topLocations.find(
                              (tl) => tl.locationName === loc.locationName
                            );
                            return topLocation
                              ? selectedLocations.includes(
                                  topLocation.locationId
                                )
                              : false;
                          })
                        : []
                    }
                    loading={paginationLoading}
                    onLocationClick={(location: AggregatedLocation) => {
                      // Handle location click if needed
                      console.warn(`Location clicked: ${JSON.stringify(location)}`);
                    }}
                  />

                  {/* Charts Section - Using existing data instead of API calls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Generate chart data from existing location data */}
                    {(() => {
                      // Use filtered locations if any are selected, otherwise use all
                      const chartLocations =
                        selectedLocations.length > 0
                          ? paginatedLocations.filter((loc) => {
                              const topLocation = topLocations.find(
                                (tl) => tl.locationName === loc.locationName
                              );
                              return topLocation
                                ? selectedLocations.includes(
                                    topLocation.locationId
                                  )
                                : false;
                            })
                          : [];

                      // Generate handle trends data from location data
                      const handleData = chartLocations
                        .slice(0, 10)
                        .map((loc, index) => ({
                          time: `${index + 1}`,
                          handle: loc.moneyIn || 0,
                          location: loc.locationName || `Location ${index + 1}`,
                        }));

                      // Generate win/loss data from location data
                      const winLossData = chartLocations
                        .slice(0, 10)
                        .map((loc, index) => ({
                          time: `${index + 1}`,
                          wins: loc.gross || 0,
                          losses: loc.moneyOut || 0,
                          location: loc.locationName || `Location ${index + 1}`,
                        }));

                      // Generate jackpot data from location data
                      const jackpotData = chartLocations
                        .slice(0, 10)
                        .map((loc, index) => ({
                          time: `${index + 1}`,
                          jackpot: Math.floor((loc.gross || 0) * 0.1), // 10% of gross as jackpot
                          location: loc.locationName || `Location ${index + 1}`,
                        }));

                      // Generate plays data from location data
                      const playsData = chartLocations
                        .slice(0, 10)
                        .map((loc, index) => ({
                          time: `${index + 1}`,
                          plays: loc.gamesPlayed || 0, // Use real gamesPlayed data
                          location: loc.locationName || `Location ${index + 1}`,
                        }));

                      return (
                        <>
                          <SimpleChart
                            type="line"
                            title="Handle Trends"
                            icon={<TrendingUp className="h-5 w-5" />}
                            data={handleData}
                            dataKey="handle"
                            color="#8884d8"
                            formatter={(value) => `$${(value as number).toLocaleString()}`}
                          />

                          <SimpleChart
                            type="bar"
                            title="Win/Loss Analysis"
                            icon={<BarChart3 className="h-5 w-5" />}
                            data={winLossData}
                            dataKey="wins"
                            color="#4ade80"
                            formatter={(value) => `$${(value as number).toLocaleString()}`}
                          />

                          <SimpleChart
                            type="area"
                            title="Jackpot Trends"
                            icon={<Trophy className="h-5 w-5" />}
                            data={jackpotData}
                            dataKey="jackpot"
                            color="#fbbf24"
                            formatter={(value) => `$${(value as number).toLocaleString()}`}
                          />

                          <SimpleChart
                            type="bar"
                            title="Plays Analysis"
                            icon={<Activity className="h-5 w-5" />}
                            data={playsData}
                            dataKey="plays"
                            color="#3b82f6"
                            formatter={(value) => (value as number).toLocaleString()}
                          />
                        </>
                      );
                    })()}
                  </div>

                  {/* Top Machines Section - Overall top 5 across selected locations */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Trophy className="h-5 w-5" />
                          Top 5 Machines (Overall)
                        </CardTitle>
                        {selectedForComparison.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                              {selectedForComparison.length} selected
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCompareClick}
                              className="flex items-center gap-2"
                            >
                              <BarChart3 className="w-4 h-4" />
                              Compare ({selectedForComparison.length})
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleClearComparison}
                              className="text-red-600 hover:text-red-700"
                            >
                              Clear
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(() => {
                          // Get all locations and sort by gross revenue to get overall top 5
                          const allLocations =
                            selectedLocations.length > 0
                              ? paginatedLocations.filter((loc) => {
                                  const topLocation = topLocations.find(
                                    (tl) => tl.locationName === loc.locationName
                                  );
                                  return topLocation
                                    ? selectedLocations.includes(
                                        topLocation.locationId
                                      )
                                    : false;
                                })
                              : [];

                          // Sort by gross revenue and take top 5
                          const top5Locations = allLocations
                            .sort((a, b) => (b.gross || 0) - (a.gross || 0))
                            .slice(0, 5);

                          return top5Locations.map((location, index) => (
                            <div
                              key={`${location.location}-${index}`}
                              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-100 ${
                                isItemSelected(location)
                                  ? "bg-blue-50 border-2 border-blue-400"
                                  : "bg-gray-50 border-2 border-transparent"
                              }`}
                              onClick={() =>
                                handleItemClick(location, "machines")
                              }
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {location.locationName ||
                                      `Location ${index + 1}`}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {location.totalMachines || 0} machines
                                  </div>
                                </div>
                                {isItemSelected(location) && (
                                  <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-green-600">
                                  ${(location.gross || 0).toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {location.gross && location.moneyIn
                                    ? `${(
                                        (location.gross / location.moneyIn) *
                                        100
                                      ).toFixed(1)}% hold`
                                    : "N/A"}
                                </div>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : !isInitialLoadComplete ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="text-gray-500 text-lg mb-2">
                      Loading Data...
                    </div>
                    <div className="text-gray-400 text-sm">
                      Please wait while we fetch location data
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="text-gray-500 text-lg mb-2">
                      No Data to Display
                    </div>
                    <div className="text-gray-400 text-sm">
                      Please select up to 5 locations to view revenue analysis
                      data
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Comparison Modal */}
      <CompareLocationsModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        selectedItems={selectedForComparison}
        type={comparisonType}
      />
    </div>
  );
}
