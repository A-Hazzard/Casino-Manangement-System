"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Download,
  BarChart3,
  Monitor,
  Trophy,
  Activity,
  RefreshCw,
  TrendingUp,
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
import {
  MachineHourlyChartsSkeleton,
  RevenueAnalysisChartsSkeleton,
  TopMachinesTableSkeleton,
  SummaryCardsSkeleton,
  LocationsSASEvaluationSkeleton,
  LocationsRevenueAnalysisSkeleton,
} from "@/components/ui/skeletons/ReportsSkeletons";
// import { formatCurrency } from "@/lib/utils/formatting";
import { useReportsStore } from "@/lib/store/reportsStore";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { exportData } from "@/lib/utils/exportUtils";
import LocationMap from "@/components/reports/common/LocationMap";
import { handleExportSASEvaluation as handleExportSASEvaluationHelper } from "@/lib/helpers/reportsPage";

// Recharts imports for CasinoLocationCard charts - Commented out since Top 5 Locations section is hidden
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
// } from "recharts";

// SAS Evaluation Components
import LocationMultiSelect from "@/components/ui/common/LocationMultiSelect";
import EnhancedLocationTable from "@/components/reports/common/EnhancedLocationTable";
import RevenueAnalysisTable from "@/components/reports/common/RevenueAnalysisTable";

import { StackedChart } from "@/components/ui/StackedChart";

// Reports helpers and components
import { AggregatedLocation } from "@/lib/types/location";
import axios from "axios";

// Types for location data
import { LocationMetrics, TopLocation } from "@/shared/types";
import { MachineData } from "@/shared/types/machines";

// Skeleton loader components - now imported from ReportsSkeletons

// TopLocationsSkeleton - Commented out since Top 5 Locations section is hidden
// const TopLocationsSkeleton = () => (
//   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//     {[1, 2, 3, 4, 5].map((i) => (
//       <div
//         key={i}
//         className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 animate-pulse"
//       >
//         {/* Header */}
//         <div className="flex items-center justify-between mb-2">
//           <div className="flex items-center gap-2">
//             <div className="h-6 bg-gray-200 rounded w-32"></div>
//             <div className="h-5 bg-gray-200 rounded w-16"></div>
//           </div>
//           <div className="h-5 w-5 bg-gray-200 rounded"></div>
//         </div>
//         <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>

//         {/* Metrics Grid */}
//         <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
//           {[1, 2, 3, 4].map((j) => (
//             <div key={j}>
//               <div className="h-3 bg-gray-200 rounded w-20 mb-1"></div>
//               <div className="h-5 bg-gray-200 rounded w-16"></div>
//             </div>
//           ))}
//         </div>

//         {/* Chart */}
//         <div className="h-24 bg-gray-200 rounded mb-4"></div>

//         {/* Daily Trend */}
//         <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>

//         {/* Top Performer */}
//         <div className="border-t pt-3">
//           <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
//           <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
//           <div className="h-3 bg-gray-200 rounded w-20"></div>
//         </div>
//       </div>
//     ))}
//   </div>
// );

// Casino Location Card Component - Commented out since Top 5 Locations section is hidden

export default function LocationsTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activeMetricsFilter, customDateRange, selectedLicencee } =
    useDashBoardStore();

  const { selectedDateRange } = useReportsStore();

  // Separate state management for each tab
  const [selectedSasLocations, setSelectedSasLocations] = useState<string[]>(
    []
  );
  const [selectedRevenueLocations, setSelectedRevenueLocations] = useState<
    string[]
  >([]);

  const [metricsOverview, setMetricsOverview] =
    useState<LocationMetrics | null>(null);
  const [topLocations, setTopLocations] = useState<TopLocation[]>([]);

  // Add state for top machines data
  const [topMachinesData, setTopMachinesData] = useState<MachineData[]>([]);
  const [topMachinesLoading, setTopMachinesLoading] = useState(false);

  // Add state for machine hourly data
  const [machineHourlyData, setMachineHourlyData] = useState<{
    hourlyTrends: Array<{
      hour: string;
      [locationId: string]:
        | {
            handle: number;
            winLoss: number;
            jackpot: number;
            plays: number;
          }
        | string;
    }>;
    totals: Record<
      string,
      {
        handle: number;
        winLoss: number;
        jackpot: number;
        plays: number;
      }
    >;
    locations: string[];
  } | null>(null);
  const [machineHourlyLoading, setMachineHourlyLoading] = useState(false);

  // Two-phase loading: gaming locations (fast) + financial data (slow)
  const [gamingLocations, setGamingLocations] = useState<
    Record<string, unknown>[]
  >([]);
  const [gamingLocationsLoading, setGamingLocationsLoading] = useState(true);

  const [metricsLoading, setMetricsLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Independent loading states for each tab (currently unused but available for future use)
  // const [sasLoading, setSasLoading] = useState(false);
  // const [revenueLoading, setRevenueLoading] = useState(false);

  // Helper function to set current selected locations based on active tab
  const setCurrentSelectedLocations = useCallback(
    (locations: string[]) => {
      if (activeTab === "sas-evaluation") {
        setSelectedSasLocations(locations);
      } else {
        setSelectedRevenueLocations(locations);
      }
    },
    [activeTab]
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [paginatedLocations, setPaginatedLocations] = useState<
    AggregatedLocation[]
  >([]);
  const [paginationLoading, setPaginationLoading] = useState(true); // Start with loading true

  // Combined loading state for better UX (kept for potential future use)
  // const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

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

  // Simplified data fetching for locations with lazy loading
  const fetchLocationDataAsync = useCallback(
    async (specificLocations?: string[]) => {
      console.warn(
        `🔍 Starting fetchLocationDataAsync: ${JSON.stringify({
          specificLocations,
        })}`
      );
      setGamingLocationsLoading(true);
      setLocationsLoading(true);
      setMetricsLoading(true);
      setPaginationLoading(true);
      // setIsInitialLoadComplete(false);

      try {
        // Fetch gaming locations first (for map) - show immediately when ready
        await fetchGamingLocationsAsync();
        setGamingLocationsLoading(false);

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

        // Debug: Log sample data to understand the structure
        if (locationData.length > 0) {
          console.warn(
            "🔍 Sample location data from API:",
            JSON.stringify(
              {
                location: locationData[0].location,
                locationName: locationData[0].locationName,
                sasMachines: locationData[0].sasMachines,
                hasSasMachines: locationData[0].hasSasMachines,
                totalMachines: locationData[0].totalMachines,
                machines: locationData[0].machines?.slice(0, 2), // First 2 machines for debugging
              },
              null,
              2
            )
          );
        }

        // Normalize location data
        const normalizedLocations = locationData.map(
          (loc: Record<string, unknown>) => ({
            ...loc,
            gross: loc.gross || 0,
            locationName:
              loc.locationName || loc.name || loc.location || "Unknown",
          })
        );

        // Store locations for dropdown selection (always all locations) - show immediately
        console.warn("🔍 Frontend - Setting allLocationsForDropdown with", normalizedLocations.length, "locations");
        console.warn("🔍 Frontend - Sample normalized location:", normalizedLocations[0] ? {
          location: normalizedLocations[0].location,
          locationName: normalizedLocations[0].locationName,
          sasMachines: normalizedLocations[0].sasMachines,
          hasSasMachines: normalizedLocations[0].hasSasMachines,
          totalMachines: normalizedLocations[0].totalMachines
        } : "No locations");
        setAllLocationsForDropdown(normalizedLocations);
        setLocationsLoading(false); // Show dropdown immediately

        // Filter data based on selected locations if any are selected
        const currentSelectedLocations =
          activeTab === "sas-evaluation"
            ? selectedSasLocations
            : selectedRevenueLocations;
        const filteredData =
          currentSelectedLocations.length > 0
            ? normalizedLocations.filter((loc: Record<string, unknown>) =>
                currentSelectedLocations.includes(loc.location as string)
              )
            : normalizedLocations;

        // Set paginated data (filtered if locations are selected) - show immediately
        setPaginatedLocations(filteredData);
        setCurrentPage(1);
        setTotalPages(1);
        setTotalCount(normalizedLocations.length);
        setPaginationLoading(false); // Show pagination immediately

        // Calculate metrics overview (use filtered data if locations are selected)
        const dataForMetrics =
          currentSelectedLocations.length > 0
            ? filteredData
            : normalizedLocations;
        const overview = dataForMetrics.reduce(
          (acc: Record<string, unknown>, loc: Record<string, unknown>) => {
            (acc.totalGross as number) += (loc.gross as number) || 0;
            (acc.totalDrop as number) += (loc.moneyIn as number) || 0;
            (acc.totalCancelledCredits as number) +=
              (loc.moneyOut as number) || 0;
            (acc.onlineMachines as number) +=
              (loc.onlineMachines as number) || 0;
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
        const dataForTopLocations =
          currentSelectedLocations.length > 0
            ? filteredData
            : normalizedLocations;
        const sorted = dataForTopLocations
          .sort(
            (a: Record<string, unknown>, b: Record<string, unknown>) =>
              ((b.gross as number) || 0) - ((a.gross as number) || 0)
          )
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
              (loc.moneyIn as number) > 0
                ? ((loc.gross as number) / (loc.moneyIn as number)) * 100
                : 0,
          }));

        setTopLocations(sorted);
        setLocationsLoading(false);

        console.warn(
          "🔍 Location data successful - setting loading states to false"
        );

        // Set loading states
        setGamingLocationsLoading(false);
        setPaginationLoading(false);
        // setIsInitialLoadComplete(true);
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
        // setIsInitialLoadComplete(false);
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
      selectedSasLocations,
      selectedRevenueLocations,
    ]
  );

  // Function to fetch top machines data
  const fetchTopMachines = useCallback(async () => {
    const currentSelectedLocations =
      activeTab === "sas-evaluation"
        ? selectedSasLocations
        : selectedRevenueLocations;
    if (currentSelectedLocations.length === 0) {
      setTopMachinesData([]);
      return;
    }

    setTopMachinesLoading(true);
    try {
      const params: Record<string, string> = {
        type: "all", // Get all machines for the selected locations
      };

      if (selectedLicencee && selectedLicencee !== "all") {
        params.licencee = selectedLicencee;
      }

      // Add date parameters
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
        params.timePeriod = "Today";
      }

      const response = await axios.get("/api/reports/machines", { params });
      const { data: machinesData } = response.data;

      // Filter machines by selected locations and sort by netWin
      const filteredMachines = machinesData
        .filter((machine: MachineData) =>
          currentSelectedLocations.includes(machine.locationId)
        )
        .sort((a: MachineData, b: MachineData) => b.netWin - a.netWin)
        .slice(0, 5);

      setTopMachinesData(filteredMachines);
    } catch (error) {
      console.error("Error fetching top machines:", error);
      toast.error("Failed to fetch top machines data");
      setTopMachinesData([]);
    } finally {
      setTopMachinesLoading(false);
    }
  }, [
    selectedSasLocations,
    selectedRevenueLocations,
    activeTab,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange?.startDate,
    customDateRange?.endDate,
  ]);

  // Function to fetch machine hourly data
  const fetchMachineHourlyData = useCallback(async () => {
    const currentSelectedLocations =
      activeTab === "sas-evaluation"
        ? selectedSasLocations
        : selectedRevenueLocations;
    if (currentSelectedLocations.length === 0) {
      setMachineHourlyData(null);
      return;
    }

    setMachineHourlyLoading(true);
    try {
      const params: Record<string, string> = {
        locationIds: currentSelectedLocations.join(","),
      };

      if (selectedLicencee && selectedLicencee !== "all") {
        params.licencee = selectedLicencee;
      }

      // Add date parameters
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
        params.timePeriod = "Today";
      }

      const response = await axios.get("/api/analytics/machine-hourly", {
        params,
      });
      setMachineHourlyData(response.data);
    } catch (error) {
      console.error("Error fetching machine hourly data:", error);
      toast.error("Failed to fetch machine hourly data");
      setMachineHourlyData(null);
    } finally {
      setMachineHourlyLoading(false);
    }
  }, [
    selectedSasLocations,
    selectedRevenueLocations,
    activeTab,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
  ]);

  // Consolidated useEffect to handle all data fetching
  useEffect(() => {
    const currentSelectedLocations =
      activeTab === "sas-evaluation"
        ? selectedSasLocations
        : selectedRevenueLocations;
    // Fetch location data when filters change or when locations are selected
    fetchLocationDataAsync(
      currentSelectedLocations.length > 0 ? currentSelectedLocations : undefined
    );

    // Fetch additional data only when locations are selected
    if (currentSelectedLocations.length > 0) {
      fetchTopMachines();
      fetchMachineHourlyData();
    } else {
      setTopMachinesData([]);
      setMachineHourlyData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedLicencee,
    activeTab,
    activeMetricsFilter,
    customDateRange?.startDate,
    customDateRange?.endDate,
    selectedSasLocations,
    selectedRevenueLocations,
  ]);

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
      const currentSelectedLocations =
        activeTab === "sas-evaluation"
          ? selectedSasLocations
          : selectedRevenueLocations;
      const filteredData =
        currentSelectedLocations.length > 0
          ? allLocationsForDropdown.filter((loc) =>
              currentSelectedLocations.includes(loc.location as string)
            )
          : allLocationsForDropdown;

      console.warn(
        `🔍 Filtering locations - allLocationsForDropdown: ${allLocationsForDropdown.length}, filteredData: ${filteredData.length}, selectedLocations: ${currentSelectedLocations.length}`
      );

      setPaginatedLocations(filteredData);
      setTotalCount(filteredData.length);
      setCurrentPage(1);

      // Recalculate metrics overview
      const overview = filteredData.reduce(
        (acc: Record<string, unknown>, loc: Record<string, unknown>) => {
          (acc.totalGross as number) += (loc.gross as number) || 0;
          (acc.totalDrop as number) += (loc.moneyIn as number) || 0;
          (acc.totalCancelledCredits as number) +=
            (loc.moneyOut as number) || 0;
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
        .sort(
          (a: Record<string, unknown>, b: Record<string, unknown>) =>
            ((b.gross as number) || 0) - ((a.gross as number) || 0)
        )
        .slice(0, 5)
        .map((loc: Record<string, unknown>) => ({
          locationId: loc.location as string,
          locationName: (loc.locationName ||
            loc.name ||
            loc.location ||
            "Unknown") as string,
          gross: (loc.gross || 0) as number,
          drop: (loc.moneyIn || 0) as number,
          cancelledCredits: (loc.moneyOut || 0) as number,
          onlineMachines: (loc.onlineMachines || 0) as number,
          totalMachines: (loc.totalMachines || 0) as number,
          performance: "average" as const,
          sasEnabled: (loc.hasSasMachines ||
            (loc.sasMachines as number) > 0) as boolean,
          coordinates: undefined,
          holdPercentage:
            (loc.moneyIn as number) > 0
              ? ((loc.gross as number) / (loc.moneyIn as number)) * 100
              : 0,
        })) as TopLocation[];
      setTopLocations(sorted);
    }
  }, [
    selectedSasLocations,
    selectedRevenueLocations,
    activeTab,
    allLocationsForDropdown,
  ]);

  // Debug effect to log state changes
  useEffect(() => {
    console.warn(
      `🔍 State Debug - paginationLoading: ${paginationLoading}, locations count: ${paginatedLocations.length}, currentPage: ${currentPage}, totalPages: ${totalPages}, totalCount: ${totalCount}`
    );
    console.warn(
      `🔍 Table Props Debug - totalPages: ${totalPages}, totalCount: ${totalCount}`
    );
    console.warn(
      `🔍 Loading State Debug - paginationLoading: ${paginationLoading}, should show skeleton: ${paginationLoading}`
    );
  }, [
    paginationLoading,
    paginatedLocations.length,
    currentPage,
    totalPages,
    totalCount,
  ]);

  const handleLocationSelect = (locationIds: string[]) => {
    setCurrentSelectedLocations(locationIds);
  };

  const handleExportSASEvaluation = async () => {
    const currentSelectedLocations =
      activeTab === "sas-evaluation"
        ? selectedSasLocations
        : selectedRevenueLocations;
    await handleExportSASEvaluationHelper(
      currentSelectedLocations,
      paginatedLocations,
      topLocations,
      selectedDateRange,
      activeMetricsFilter,
      exportData,
      toast
    );
  };

  const handleExportRevenueAnalysis = async () => {
    try {
      const currentSelectedLocations =
        activeTab === "sas-evaluation"
          ? selectedSasLocations
          : selectedRevenueLocations;
      const filteredData =
        currentSelectedLocations.length > 0
          ? paginatedLocations.filter((loc) => {
              // Find the corresponding topLocation to get the correct locationId
              const topLocation = topLocations.find(
                (tl) => tl.locationName === loc.locationName
              );
              return topLocation
                ? currentSelectedLocations.includes(topLocation.locationId)
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
            currentSelectedLocations.length > 0
              ? currentSelectedLocations.length
              : "All",
        },
      };

      await exportData(exportDataObj);
      toast.success("Revenue analysis report exported successfully");
    } catch (error) {
      toast.error("Failed to export report");
      console.error("Export error:", error);
    }
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
                    const currentSelectedLocations =
                      activeTab === "sas-evaluation"
                        ? selectedSasLocations
                        : selectedRevenueLocations;
                    fetchLocationDataAsync(
                      currentSelectedLocations.length > 0
                        ? currentSelectedLocations
                        : undefined
                    );
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
              </div>
              {metricsLoading ? (
                <SummaryCardsSkeleton />
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
              selectedLocations={
                activeTab === "sas-evaluation"
                  ? selectedSasLocations
                  : selectedRevenueLocations
              }
              onLocationSelect={handleLocationSelect}
              aggregates={paginatedLocations}
              gamingLocations={gamingLocations}
              gamingLocationsLoading={gamingLocationsLoading}
              financialDataLoading={locationsLoading}
            />

            {/* Top 5 Locations - Commented Out */}
            {/* <div>
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
                      isSelected={(activeTab === "sas-evaluation" ? selectedSasLocations : selectedRevenueLocations).includes(
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
            </div> */}
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
                      {locationsLoading ? (
                        <div className="w-full h-10 bg-gray-100 rounded-md animate-pulse" />
                      ) : (
                        <LocationMultiSelect
                          locations={(() => {
                            const sasLocations = allLocationsForDropdown.filter(
                              (loc) => loc.sasMachines > 0
                            );
                            console.warn(
                              `🔍 SAS Evaluation - allLocationsForDropdown: ${allLocationsForDropdown.length}, sasLocations: ${sasLocations.length}`
                            );
                            console.warn(
                              "🔍 SAS Evaluation - sasLocations:",
                              sasLocations.map((loc) => ({
                                location: loc.location,
                                locationName: loc.locationName,
                                sasMachines: loc.sasMachines,
                              }))
                            );
                            return sasLocations.map((loc) => ({
                              id: loc.location,
                              name: loc.locationName,
                              sasEnabled: loc.sasMachines > 0,
                            }));
                          })()}
                          selectedLocations={
                            activeTab === "sas-evaluation"
                              ? selectedSasLocations
                              : selectedRevenueLocations
                          }
                          onSelectionChange={(newSelection) => {
                            // Limit to 5 selections
                            if (newSelection.length <= 5) {
                              setCurrentSelectedLocations(newSelection);
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
                        onClick={() => setCurrentSelectedLocations([])}
                        className="w-full"
                      >
                        Clear Selection
                      </Button>
                    </div>
                    <div className="flex items-end">
                      <div className="text-sm text-gray-600">
                        {(activeTab === "sas-evaluation"
                          ? selectedSasLocations
                          : selectedRevenueLocations
                        ).length > 0
                          ? `${
                              (activeTab === "sas-evaluation"
                                ? selectedSasLocations
                                : selectedRevenueLocations
                              ).length
                            } location${
                              (activeTab === "sas-evaluation"
                                ? selectedSasLocations
                                : selectedRevenueLocations
                              ).length > 1
                                ? "s"
                                : ""
                            } selected`
                          : "Please select locations to view data"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Show skeleton loaders only when locations are selected and data is loading */}
              {(activeTab === "sas-evaluation" ? selectedSasLocations : selectedRevenueLocations).length > 0 && (metricsLoading || paginationLoading) ? (
                <LocationsSASEvaluationSkeleton />
              ) : (activeTab === "sas-evaluation" ? selectedSasLocations : selectedRevenueLocations).length > 0 ? (
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
                        locations={((activeTab === "sas-evaluation"
                          ? selectedSasLocations
                          : selectedRevenueLocations
                        ).length > 0
                          ? paginatedLocations.filter((loc) => {
                              // Find the corresponding topLocation to get the correct locationId
                              const topLocation = topLocations.find(
                                (tl) => tl.locationName === loc.locationName
                              );
                              return topLocation
                                ? (activeTab === "sas-evaluation"
                                    ? selectedSasLocations
                                    : selectedRevenueLocations
                                  ).includes(topLocation.locationId)
                                : false;
                            })
                          : []
                        ).map((loc) => {
                          // Debug logging to check data values
                          console.warn(
                            `🔍 Location data for table: ${JSON.stringify({
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
                            })}`
                          );

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

                  {/* Summary Cards for SAS Evaluation - Only show when more than 1 location selected */}
                  {(activeTab === "sas-evaluation"
                    ? selectedSasLocations
                    : selectedRevenueLocations
                  ).length > 1 &&
                    (locationsLoading ? (
                      <SummaryCardsSkeleton />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 break-words">
                              $
                              {(() => {
                                const filteredLocations =
                                  (activeTab === "sas-evaluation"
                                    ? selectedSasLocations
                                    : selectedRevenueLocations
                                  ).length > 0
                                    ? paginatedLocations.filter((loc) =>
                                        (activeTab === "sas-evaluation"
                                          ? selectedSasLocations
                                          : selectedRevenueLocations
                                        ).includes(loc.location)
                                      )
                                    : [];
                                const totalGross = filteredLocations.reduce(
                                  (sum, loc) => sum + (loc.gross || 0),
                                  0
                                );
                                return totalGross.toLocaleString();
                              })()}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground break-words">
                              Total Net Win (Gross)
                            </p>
                            <p className="text-xs text-green-600 font-medium">
                              (Green - Gross)
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600 break-words">
                              $
                              {(() => {
                                const filteredLocations =
                                  (activeTab === "sas-evaluation"
                                    ? selectedSasLocations
                                    : selectedRevenueLocations
                                  ).length > 0
                                    ? paginatedLocations.filter((loc) =>
                                        (activeTab === "sas-evaluation"
                                          ? selectedSasLocations
                                          : selectedRevenueLocations
                                        ).includes(loc.location)
                                      )
                                    : [];
                                const totalDrop = filteredLocations.reduce(
                                  (sum, loc) => sum + (loc.moneyIn || 0),
                                  0
                                );
                                return totalDrop.toLocaleString();
                              })()}
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
                              {(() => {
                                const filteredLocations =
                                  (activeTab === "sas-evaluation"
                                    ? selectedSasLocations
                                    : selectedRevenueLocations
                                  ).length > 0
                                    ? paginatedLocations.filter((loc) =>
                                        (activeTab === "sas-evaluation"
                                          ? selectedSasLocations
                                          : selectedRevenueLocations
                                        ).includes(loc.location)
                                      )
                                    : [];
                                const totalCancelledCredits =
                                  filteredLocations.reduce(
                                    (sum, loc) => sum + (loc.moneyOut || 0),
                                    0
                                  );
                                return totalCancelledCredits.toLocaleString();
                              })()}
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
                              {(() => {
                                const filteredLocations =
                                  (activeTab === "sas-evaluation"
                                    ? selectedSasLocations
                                    : selectedRevenueLocations
                                  ).length > 0
                                    ? paginatedLocations.filter((loc) =>
                                        (activeTab === "sas-evaluation"
                                          ? selectedSasLocations
                                          : selectedRevenueLocations
                                        ).includes(loc.location)
                                      )
                                    : [];
                                const onlineMachines = filteredLocations.reduce(
                                  (sum, loc) => sum + (loc.onlineMachines || 0),
                                  0
                                );
                                const totalMachines = filteredLocations.reduce(
                                  (sum, loc) => sum + (loc.totalMachines || 0),
                                  0
                                );
                                return `${onlineMachines}/${totalMachines}`;
                              })()}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground break-words">
                              Online Machines
                            </p>
                            <Progress
                              value={(() => {
                                const filteredLocations =
                                  (activeTab === "sas-evaluation"
                                    ? selectedSasLocations
                                    : selectedRevenueLocations
                                  ).length > 0
                                    ? paginatedLocations.filter((loc) =>
                                        (activeTab === "sas-evaluation"
                                          ? selectedSasLocations
                                          : selectedRevenueLocations
                                        ).includes(loc.location)
                                      )
                                    : [];
                                const onlineMachines = filteredLocations.reduce(
                                  (sum, loc) => sum + (loc.onlineMachines || 0),
                                  0
                                );
                                const totalMachines = filteredLocations.reduce(
                                  (sum, loc) => sum + (loc.totalMachines || 0),
                                  0
                                );
                                return totalMachines > 0
                                  ? (onlineMachines / totalMachines) * 100
                                  : 0;
                              })()}
                              className="mt-2"
                            />
                          </CardContent>
                        </Card>
                      </div>
                    ))}

                  {/* Machine Hourly Charts - Stacked by Machine */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {machineHourlyLoading ? (
                      <MachineHourlyChartsSkeleton />
                    ) : machineHourlyData &&
                      machineHourlyData.locations &&
                      machineHourlyData.locations.length > 0 ? (
                      <>
                        {/* Money In Chart */}
                        <StackedChart
                          title="Money In"
                          icon={<BarChart3 className="h-5 w-5" />}
                          data={machineHourlyData.hourlyTrends}
                          dataKey="handle"
                          machines={machineHourlyData.locations}
                          colors={[
                            "#3b82f6",
                            "#ef4444",
                            "#10b981",
                            "#f59e0b",
                            "#8b5cf6",
                          ]}
                          formatter={(value) => `$${value.toLocaleString()}`}
                        />

                        {/* Win/Loss Chart */}
                        <StackedChart
                          title="Win/Loss"
                          icon={<TrendingUp className="h-5 w-5" />}
                          data={machineHourlyData.hourlyTrends}
                          dataKey="winLoss"
                          machines={machineHourlyData.locations}
                          colors={[
                            "#10b981",
                            "#ef4444",
                            "#3b82f6",
                            "#f59e0b",
                            "#8b5cf6",
                          ]}
                          formatter={(value) => `$${value.toLocaleString()}`}
                        />

                        {/* Jackpot Chart */}
                        <StackedChart
                          title="Jackpot"
                          icon={<Trophy className="h-5 w-5" />}
                          data={machineHourlyData.hourlyTrends}
                          dataKey="jackpot"
                          machines={machineHourlyData.locations}
                          colors={[
                            "#f59e0b",
                            "#ef4444",
                            "#10b981",
                            "#3b82f6",
                            "#8b5cf6",
                          ]}
                          formatter={(value) => `$${value.toLocaleString()}`}
                        />

                        {/* Plays Chart */}
                        <StackedChart
                          title="Plays"
                          icon={<Activity className="h-5 w-5" />}
                          data={machineHourlyData.hourlyTrends}
                          dataKey="plays"
                          machines={machineHourlyData.locations}
                          colors={[
                            "#8b5cf6",
                            "#ef4444",
                            "#10b981",
                            "#3b82f6",
                            "#f59e0b",
                          ]}
                          formatter={(value) => value.toLocaleString()}
                        />
                      </>
                    ) : (
                      <div className="col-span-2 text-center py-8 text-muted-foreground">
                        Select locations to view machine hourly data
                      </div>
                    )}
                  </div>

                  {/* Top 5 Machines Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-orange-600" />
                        Top 5 Machines
                      </CardTitle>
                      <CardDescription>
                        Highest performing machines by revenue and hold
                        percentage
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {topMachinesLoading ? (
                        <TopMachinesTableSkeleton />
                      ) : (
                        <>
                          {/* Desktop Table View */}
                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b bg-gray-50">
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Location
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Machine
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Game
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Manufacturer
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Money In
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Win/Loss
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Jackpot
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Avg. Wag. per Game
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Actual Hold
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Theoretical Hold
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Games Played
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {topMachinesData.map((machine, index) => (
                                  <tr
                                    key={`${machine.machineId}-${index}`}
                                    className="border-b hover:bg-gray-50"
                                  >
                                    <td className="p-3 text-sm">
                                      {machine.locationName}
                                    </td>
                                    <td className="p-3 text-sm font-mono">
                                      {machine.serialNumber ||
                                        machine.machineId}
                                    </td>
                                    <td className="p-3 text-sm">
                                      {machine.gameTitle}
                                    </td>
                                    <td className="p-3 text-sm">
                                      {machine.manufacturer}
                                    </td>
                                    <td className="p-3 text-sm font-medium">
                                      ${(machine.drop || 0).toLocaleString()}
                                    </td>
                                    <td
                                      className={`p-3 text-sm font-medium ${
                                        (machine.netWin || 0) >= 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      ${(machine.netWin || 0).toLocaleString()}
                                    </td>
                                    <td className="p-3 text-sm">
                                      ${(machine.jackpot || 0).toLocaleString()}
                                    </td>
                                    <td className="p-3 text-sm">
                                      $
                                      {machine.avgBet
                                        ? machine.avgBet.toFixed(2)
                                        : "0.00"}
                                    </td>
                                    <td className="p-3 text-sm font-medium text-gray-600">
                                      {machine.actualHold
                                        ? machine.actualHold.toFixed(3) + "%"
                                        : "N/A"}
                                    </td>
                                    <td className="p-3 text-sm text-gray-600">
                                      {machine.theoreticalHold
                                        ? machine.theoreticalHold.toFixed(3) +
                                          "%"
                                        : "N/A"}
                                    </td>
                                    <td className="p-3 text-sm">
                                      {(
                                        machine.gamesPlayed || 0
                                      ).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Card View */}
                          <div className="md:hidden space-y-4">
                            {topMachinesData.map((machine, index) => (
                              <Card
                                key={`${machine.machineId}-${index}`}
                                className="p-4"
                              >
                                <div className="mb-3">
                                  <h4 className="font-medium text-sm">
                                    {machine.machineName}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {machine.locationName} • {machine.gameTitle}
                                  </p>
                                </div>

                                {/* Tiny screen layout (< 425px) - Single column */}
                                <div className="block sm:hidden space-y-2 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Manufacturer:
                                    </span>
                                    <span className="font-medium">
                                      {machine.manufacturer}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Money In:
                                    </span>
                                    <span className="font-medium">
                                      ${(machine.drop || 0).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Win/Loss:
                                    </span>
                                    <span
                                      className={`font-medium ${
                                        (machine.netWin || 0) >= 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      ${(machine.netWin || 0).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Avg. Wag. per Game:
                                    </span>
                                    <span className="font-medium">
                                      $
                                      {machine.avgBet
                                        ? machine.avgBet.toFixed(2)
                                        : "0.00"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Actual Hold:
                                    </span>
                                    <span className="font-medium text-gray-600">
                                      {machine.actualHold
                                        ? machine.actualHold.toFixed(3) + "%"
                                        : "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Theoretical Hold:
                                    </span>
                                    <span className="font-medium text-gray-600">
                                      {machine.theoreticalHold
                                        ? machine.theoreticalHold.toFixed(3) +
                                          "%"
                                        : "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Games Played:
                                    </span>
                                    <span className="font-medium">
                                      {(
                                        machine.gamesPlayed || 0
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                </div>

                                {/* Small screen layout (425px+) - Two columns */}
                                <div className="hidden sm:grid sm:grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">
                                      Manufacturer:
                                    </span>
                                    <p>{machine.manufacturer}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Money In:
                                    </span>
                                    <p className="font-medium">
                                      ${(machine.drop || 0).toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Win/Loss:
                                    </span>
                                    <p
                                      className={`font-medium ${
                                        (machine.netWin || 0) >= 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      ${(machine.netWin || 0).toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Avg. Wag. per Game:
                                    </span>
                                    <p>
                                      $
                                      {machine.avgBet
                                        ? machine.avgBet.toFixed(2)
                                        : "0.00"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Actual Hold:
                                    </span>
                                    <p className="font-medium text-gray-600">
                                      {machine.actualHold
                                        ? machine.actualHold.toFixed(3) + "%"
                                        : "N/A"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Theoretical Hold:
                                    </span>
                                    <p className="text-gray-600">
                                      {machine.theoreticalHold
                                        ? machine.theoreticalHold.toFixed(3) +
                                          "%"
                                        : "N/A"}
                                    </p>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">
                                      Games Played:
                                    </span>
                                    <p>
                                      {(
                                        machine.gamesPlayed || 0
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>

                          {topMachinesData.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              No machine data available for evaluation
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </>
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
                      {locationsLoading ? (
                        <div className="w-full h-10 bg-gray-100 rounded-md animate-pulse" />
                      ) : (
                        <LocationMultiSelect
                          locations={(() => {
                            console.warn(
                              `🔍 Revenue Analysis - allLocationsForDropdown: ${allLocationsForDropdown.length}`
                            );
                            console.warn(
                              "🔍 Revenue Analysis - allLocationsForDropdown:",
                              allLocationsForDropdown.map((loc) => ({
                                location: loc.location,
                                locationName: loc.locationName,
                                sasMachines: loc.sasMachines,
                                hasSasMachines: loc.hasSasMachines,
                              }))
                            );
                            return allLocationsForDropdown.map((loc) => ({
                              id: loc.location,
                              name: loc.locationName,
                              sasEnabled: loc.hasSasMachines,
                            }));
                          })()}
                          selectedLocations={
                            activeTab === "sas-evaluation"
                              ? selectedSasLocations
                              : selectedRevenueLocations
                          }
                          onSelectionChange={(newSelection) => {
                            // Limit to 5 selections
                            if (newSelection.length <= 5) {
                              setCurrentSelectedLocations(newSelection);
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
                        onClick={() => setCurrentSelectedLocations([])}
                        className="w-full"
                      >
                        Clear Selection
                      </Button>
                    </div>
                    <div className="flex items-end">
                      <div className="text-sm text-gray-600">
                        {(activeTab === "sas-evaluation"
                          ? selectedSasLocations
                          : selectedRevenueLocations
                        ).length > 0
                          ? `${
                              (activeTab === "sas-evaluation"
                                ? selectedSasLocations
                                : selectedRevenueLocations
                              ).length
                            } location${
                              (activeTab === "sas-evaluation"
                                ? selectedSasLocations
                                : selectedRevenueLocations
                              ).length > 1
                                ? "s"
                                : ""
                            } selected`
                          : "Please select locations to view data"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Show skeleton loaders only when locations are selected and data is loading */}
              {(activeTab === "sas-evaluation" ? selectedSasLocations : selectedRevenueLocations).length > 0 && (metricsLoading || paginationLoading) ? (
                <LocationsRevenueAnalysisSkeleton />
              ) : (activeTab === "sas-evaluation" ? selectedSasLocations : selectedRevenueLocations).length > 0 ? (
                <>
                  {/* Revenue Analysis Table */}
                  <RevenueAnalysisTable
                    key={`revenue-table-${activeTab}-${paginatedLocations.length}`}
                    locations={
                      (activeTab === "sas-evaluation"
                        ? selectedSasLocations
                        : selectedRevenueLocations
                      ).length > 0
                        ? paginatedLocations.filter((loc) => {
                            // Find the corresponding topLocation to get the correct locationId
                            const topLocation = topLocations.find(
                              (tl) => tl.locationName === loc.locationName
                            );
                            return topLocation
                              ? (activeTab === "sas-evaluation"
                                  ? selectedSasLocations
                                  : selectedRevenueLocations
                                ).includes(topLocation.locationId)
                              : false;
                          })
                        : []
                    }
                    loading={paginationLoading}
                    onLocationClick={(location: AggregatedLocation) => {
                      // Handle location click if needed
                      console.warn(
                        `Location clicked: ${JSON.stringify(location)}`
                      );
                    }}
                  />

                  {/* Summary Cards for Revenue Analysis - Only show when more than 1 location selected */}
                  {(activeTab === "sas-evaluation"
                    ? selectedSasLocations
                    : selectedRevenueLocations
                  ).length > 1 &&
                    (locationsLoading ? (
                      <SummaryCardsSkeleton />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 break-words">
                              $
                              {(() => {
                                const filteredLocations =
                                  (activeTab === "sas-evaluation"
                                    ? selectedSasLocations
                                    : selectedRevenueLocations
                                  ).length > 0
                                    ? paginatedLocations.filter((loc) => {
                                        const topLocation = topLocations.find(
                                          (tl) =>
                                            tl.locationName === loc.locationName
                                        );
                                        return topLocation
                                          ? (activeTab === "sas-evaluation"
                                              ? selectedSasLocations
                                              : selectedRevenueLocations
                                            ).includes(topLocation.locationId)
                                          : false;
                                      })
                                    : [];
                                const totalGross = filteredLocations.reduce(
                                  (sum, loc) => sum + (loc.gross || 0),
                                  0
                                );
                                return totalGross.toLocaleString();
                              })()}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground break-words">
                              Total Net Win (Gross)
                            </p>
                            <p className="text-xs text-green-600 font-medium">
                              (Green - Gross)
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600 break-words">
                              $
                              {(() => {
                                const filteredLocations =
                                  (activeTab === "sas-evaluation"
                                    ? selectedSasLocations
                                    : selectedRevenueLocations
                                  ).length > 0
                                    ? paginatedLocations.filter((loc) => {
                                        const topLocation = topLocations.find(
                                          (tl) =>
                                            tl.locationName === loc.locationName
                                        );
                                        return topLocation
                                          ? (activeTab === "sas-evaluation"
                                              ? selectedSasLocations
                                              : selectedRevenueLocations
                                            ).includes(topLocation.locationId)
                                          : false;
                                      })
                                    : [];
                                const totalDrop = filteredLocations.reduce(
                                  (sum, loc) => sum + (loc.moneyIn || 0),
                                  0
                                );
                                return totalDrop.toLocaleString();
                              })()}
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
                              {(() => {
                                const filteredLocations =
                                  (activeTab === "sas-evaluation"
                                    ? selectedSasLocations
                                    : selectedRevenueLocations
                                  ).length > 0
                                    ? paginatedLocations.filter((loc) => {
                                        const topLocation = topLocations.find(
                                          (tl) =>
                                            tl.locationName === loc.locationName
                                        );
                                        return topLocation
                                          ? (activeTab === "sas-evaluation"
                                              ? selectedSasLocations
                                              : selectedRevenueLocations
                                            ).includes(topLocation.locationId)
                                          : false;
                                      })
                                    : [];
                                const totalCancelledCredits =
                                  filteredLocations.reduce(
                                    (sum, loc) => sum + (loc.moneyOut || 0),
                                    0
                                  );
                                return totalCancelledCredits.toLocaleString();
                              })()}
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
                              {(() => {
                                const filteredLocations =
                                  (activeTab === "sas-evaluation"
                                    ? selectedSasLocations
                                    : selectedRevenueLocations
                                  ).length > 0
                                    ? paginatedLocations.filter((loc) => {
                                        const topLocation = topLocations.find(
                                          (tl) =>
                                            tl.locationName === loc.locationName
                                        );
                                        return topLocation
                                          ? (activeTab === "sas-evaluation"
                                              ? selectedSasLocations
                                              : selectedRevenueLocations
                                            ).includes(topLocation.locationId)
                                          : false;
                                      })
                                    : [];
                                const onlineMachines = filteredLocations.reduce(
                                  (sum, loc) => sum + (loc.onlineMachines || 0),
                                  0
                                );
                                const totalMachines = filteredLocations.reduce(
                                  (sum, loc) => sum + (loc.totalMachines || 0),
                                  0
                                );
                                return `${onlineMachines}/${totalMachines}`;
                              })()}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground break-words">
                              Online Machines
                            </p>
                            <Progress
                              value={(() => {
                                const filteredLocations =
                                  (activeTab === "sas-evaluation"
                                    ? selectedSasLocations
                                    : selectedRevenueLocations
                                  ).length > 0
                                    ? paginatedLocations.filter((loc) => {
                                        const topLocation = topLocations.find(
                                          (tl) =>
                                            tl.locationName === loc.locationName
                                        );
                                        return topLocation
                                          ? (activeTab === "sas-evaluation"
                                              ? selectedSasLocations
                                              : selectedRevenueLocations
                                            ).includes(topLocation.locationId)
                                          : false;
                                      })
                                    : [];
                                const onlineMachines = filteredLocations.reduce(
                                  (sum, loc) => sum + (loc.onlineMachines || 0),
                                  0
                                );
                                const totalMachines = filteredLocations.reduce(
                                  (sum, loc) => sum + (loc.totalMachines || 0),
                                  0
                                );
                                return totalMachines > 0
                                  ? (onlineMachines / totalMachines) * 100
                                  : 0;
                              })()}
                              className="mt-2"
                            />
                          </CardContent>
                        </Card>
                      </div>
                    ))}

                  {/* Revenue Analysis Charts - Handle, Win/Loss, and Jackpot */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {machineHourlyLoading ? (
                      <RevenueAnalysisChartsSkeleton />
                    ) : machineHourlyData &&
                      machineHourlyData.locations &&
                      machineHourlyData.locations.length > 0 ? (
                      <>
                        {/* Money In Chart */}
                        <StackedChart
                          title="Money In"
                          icon={<BarChart3 className="h-5 w-5" />}
                          data={machineHourlyData.hourlyTrends}
                          dataKey="handle"
                          machines={machineHourlyData.locations}
                          colors={[
                            "#3b82f6",
                            "#ef4444",
                            "#10b981",
                            "#f59e0b",
                            "#8b5cf6",
                          ]}
                          formatter={(value) => `$${value.toLocaleString()}`}
                          locationNames={(() => {
                            const locationNameMap: Record<string, string> = {};
                            gamingLocations.forEach((loc) => {
                              if (
                                typeof loc === "object" &&
                                loc !== null &&
                                "_id" in loc
                              ) {
                                const locationId = loc._id?.toString() || "";
                                const locationName = (loc.name ||
                                  loc.locationName ||
                                  locationId) as string;
                                locationNameMap[locationId] = locationName;
                              }
                            });
                            return locationNameMap;
                          })()}
                        />

                        {/* Win/Loss Chart */}
                        <StackedChart
                          title="Win/Loss"
                          icon={<TrendingUp className="h-5 w-5" />}
                          data={machineHourlyData.hourlyTrends}
                          dataKey="winLoss"
                          machines={machineHourlyData.locations}
                          colors={[
                            "#10b981",
                            "#ef4444",
                            "#3b82f6",
                            "#f59e0b",
                            "#8b5cf6",
                          ]}
                          formatter={(value) => `$${value.toLocaleString()}`}
                          locationNames={(() => {
                            const locationNameMap: Record<string, string> = {};
                            gamingLocations.forEach((loc) => {
                              if (
                                typeof loc === "object" &&
                                loc !== null &&
                                "_id" in loc
                              ) {
                                const locationId = loc._id?.toString() || "";
                                const locationName = (loc.name ||
                                  loc.locationName ||
                                  locationId) as string;
                                locationNameMap[locationId] = locationName;
                              }
                            });
                            return locationNameMap;
                          })()}
                        />

                        {/* Jackpot Chart */}
                        <StackedChart
                          title="Jackpot"
                          icon={<Trophy className="h-5 w-5" />}
                          data={machineHourlyData.hourlyTrends}
                          dataKey="jackpot"
                          machines={machineHourlyData.locations}
                          colors={[
                            "#f59e0b",
                            "#ef4444",
                            "#10b981",
                            "#3b82f6",
                            "#8b5cf6",
                          ]}
                          formatter={(value) => `$${value.toLocaleString()}`}
                          locationNames={(() => {
                            const locationNameMap: Record<string, string> = {};
                            gamingLocations.forEach((loc) => {
                              if (
                                typeof loc === "object" &&
                                loc !== null &&
                                "_id" in loc
                              ) {
                                const locationId = loc._id?.toString() || "";
                                const locationName = (loc.name ||
                                  loc.locationName ||
                                  locationId) as string;
                                locationNameMap[locationId] = locationName;
                              }
                            });
                            return locationNameMap;
                          })()}
                        />
                      </>
                    ) : (
                      <div className="col-span-3 text-center py-8 text-muted-foreground">
                        Select locations to view revenue analysis data
                      </div>
                    )}
                  </div>

                  {/* Top 5 Machines Table for Revenue Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-orange-600" />
                        Top 5 Machines (Overall)
                      </CardTitle>
                      <CardDescription>
                        Highest performing machines by revenue and hold
                        percentage
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {topMachinesLoading ? (
                        <TopMachinesTableSkeleton />
                      ) : (
                        <>
                          {/* Desktop Table View */}
                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b bg-gray-50">
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Location
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Machine
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Game
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Manufacturer
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Money In
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Win/Loss
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Jackpot
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Avg. Wag. per Game
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Actual Hold
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Theoretical Hold
                                  </th>
                                  <th className="text-center p-3 font-medium text-gray-700">
                                    Games Played
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {topMachinesData.map((machine, index) => (
                                  <tr
                                    key={`${machine.machineId}-${index}`}
                                    className="border-b hover:bg-gray-50"
                                  >
                                    <td className="p-3 text-sm">
                                      {machine.locationName}
                                    </td>
                                    <td className="p-3 text-sm font-mono">
                                      {machine.serialNumber ||
                                        machine.machineId}
                                    </td>
                                    <td className="p-3 text-sm">
                                      {machine.gameTitle}
                                    </td>
                                    <td className="p-3 text-sm">
                                      {machine.manufacturer}
                                    </td>
                                    <td className="p-3 text-sm font-medium">
                                      ${(machine.drop || 0).toLocaleString()}
                                    </td>
                                    <td
                                      className={`p-3 text-sm font-medium ${
                                        (machine.netWin || 0) >= 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      ${(machine.netWin || 0).toLocaleString()}
                                    </td>
                                    <td className="p-3 text-sm">
                                      ${(machine.jackpot || 0).toLocaleString()}
                                    </td>
                                    <td className="p-3 text-sm">
                                      $
                                      {machine.avgBet
                                        ? machine.avgBet.toFixed(2)
                                        : "0.00"}
                                    </td>
                                    <td className="p-3 text-sm font-medium text-gray-600">
                                      {machine.actualHold
                                        ? machine.actualHold.toFixed(3) + "%"
                                        : "N/A"}
                                    </td>
                                    <td className="p-3 text-sm text-gray-600">
                                      {machine.theoreticalHold
                                        ? machine.theoreticalHold.toFixed(3) +
                                          "%"
                                        : "N/A"}
                                    </td>
                                    <td className="p-3 text-sm">
                                      {(
                                        machine.gamesPlayed || 0
                                      ).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Card View */}
                          <div className="md:hidden space-y-4">
                            {topMachinesData.map((machine, index) => (
                              <Card
                                key={`${machine.machineId}-${index}`}
                                className="p-4"
                              >
                                <div className="mb-3">
                                  <h4 className="font-medium text-sm">
                                    {machine.machineName}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {machine.locationName} • {machine.gameTitle}
                                  </p>
                                </div>

                                {/* Tiny screen layout (< 425px) - Single column */}
                                <div className="block sm:hidden space-y-2 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Manufacturer:
                                    </span>
                                    <span className="font-medium">
                                      {machine.manufacturer}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Money In:
                                    </span>
                                    <span className="font-medium">
                                      ${(machine.drop || 0).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Win/Loss:
                                    </span>
                                    <span
                                      className={`font-medium ${
                                        (machine.netWin || 0) >= 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      ${(machine.netWin || 0).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Avg. Wag. per Game:
                                    </span>
                                    <span className="font-medium">
                                      $
                                      {machine.avgBet
                                        ? machine.avgBet.toFixed(2)
                                        : "0.00"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Actual Hold:
                                    </span>
                                    <span className="font-medium text-gray-600">
                                      {machine.actualHold
                                        ? machine.actualHold.toFixed(3) + "%"
                                        : "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Theoretical Hold:
                                    </span>
                                    <span className="font-medium text-gray-600">
                                      {machine.theoreticalHold
                                        ? machine.theoreticalHold.toFixed(3) +
                                          "%"
                                        : "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Games Played:
                                    </span>
                                    <span className="font-medium">
                                      {(
                                        machine.gamesPlayed || 0
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                </div>

                                {/* Small screen layout (425px+) - Two columns */}
                                <div className="hidden sm:grid sm:grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">
                                      Manufacturer:
                                    </span>
                                    <p>{machine.manufacturer}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Money In:
                                    </span>
                                    <p className="font-medium">
                                      ${(machine.drop || 0).toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Win/Loss:
                                    </span>
                                    <p
                                      className={`font-medium ${
                                        (machine.netWin || 0) >= 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      ${(machine.netWin || 0).toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Avg. Wag. per Game:
                                    </span>
                                    <p>
                                      $
                                      {machine.avgBet
                                        ? machine.avgBet.toFixed(2)
                                        : "0.00"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Actual Hold:
                                    </span>
                                    <p className="font-medium text-gray-600">
                                      {machine.actualHold
                                        ? machine.actualHold.toFixed(3) + "%"
                                        : "N/A"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Theoretical Hold:
                                    </span>
                                    <p className="text-gray-600">
                                      {machine.theoreticalHold
                                        ? machine.theoreticalHold.toFixed(3) +
                                          "%"
                                        : "N/A"}
                                    </p>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">
                                      Games Played:
                                    </span>
                                    <p>
                                      {(
                                        machine.gamesPlayed || 0
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>

                          {topMachinesData.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              No machine data available for evaluation
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </>
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
    </div>
  );
}
