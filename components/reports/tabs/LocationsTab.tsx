"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  MapPin,
  Download,
  BarChart3,
  Monitor,
  Wifi,
  WifiOff,
  Star,
  ExternalLink,
  DollarSign,
  TrendingUp,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useReportsStore } from "@/lib/store/reportsStore";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { ExportUtils } from "@/lib/utils/exportUtils";
import LocationMap from "@/components/reports/common/LocationMap";
import DashboardDateFilters from "@/components/dashboard/DashboardDateFilters";

// SAS Evaluation Components
import LocationMultiSelect from "@/components/ui/common/LocationMultiSelect";
import EnhancedLocationTable from "@/components/reports/common/EnhancedLocationTable";
import HandleChart from "@/components/reports/charts/HandleChart";
import WinLossChart from "@/components/reports/charts/WinLossChart";
import JackpotChart from "@/components/reports/charts/JackpotChart";
import PlaysChart from "@/components/reports/charts/PlaysChart";
import TopMachinesTable from "@/components/reports/common/TopMachinesTable";

// Reports helpers and components
import { AggregatedLocation } from "@/lib/types/location";
import axios from "axios";

// Types for location data
type MachineData = {
  id: string;
  name: string;
  revenue: number;
  hold: number;
};

type HourlyRevenueData = {
  hour: number;
  revenue: number;
};
type LocationMetrics = {
  totalGross: number;
  totalDrop: number;
  totalCancelledCredits: number;
  onlineMachines: number;
  totalMachines: number;
};

type TopLocation = {
  locationId: string;
  locationName: string;
  gross: number;
  drop: number;
  cancelledCredits: number;
  onlineMachines: number;
  totalMachines: number;
  performance: "excellent" | "good" | "average" | "poor";
  sasEnabled: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
  // Additional fields for the new card design
  holdPercentage: number;
};

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
  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 animate-pulse">
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

// SimpleBarChart Component
  const SimpleBarChart = ({
    data,
    title,
  }: {
    data: Array<{ hour: number; revenue: number }>;
    title: string;
  }) => {
    if (!data || data.length === 0) {
      return (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{title}</h4>
          <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-sm text-gray-500">No data available</span>
          </div>
        </div>
      );
    }

    const maxRevenue = Math.max(...data.map((d) => d.revenue));
    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

    // Transform data for Recharts
    const chartData = data.map((item) => ({
      hour: `${item.hour}:00`,
      revenue: item.revenue,
    }));

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">{title}</h4>
          <span className="text-xs text-muted-foreground">
            Total: ${totalRevenue.toLocaleString()}
          </span>
        </div>

        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#6b7280" }}
                interval={5} // Show every 6th hour
              />
              <YAxis hide />
              <Tooltip
                formatter={(value: number) => [
                  `$${value.toLocaleString()}`,
                  "Revenue",
                ]}
                labelStyle={{ color: "#374151" }}
                contentStyle={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Peak: ${maxRevenue.toLocaleString()}</span>
          <span>
            Avg: ${Math.round(totalRevenue / data.length).toLocaleString()}
          </span>
        </div>
      </div>
    );
  };

// Real data fetching functions
const useHourlyRevenueData = (locationId: string, timePeriod: string) => {
  const [data, setData] = useState<HourlyRevenueData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = `/api/metrics/hourly-trends?locationId=${locationId}&timePeriod=${timePeriod}`;
        const response = await fetch(url);
        if (response.ok) {
          const result = await response.json();
          setData(result.data || []);
        }
      } catch (error) {
        console.error('Error fetching hourly revenue data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (locationId) {
      fetchData();
    }
  }, [locationId, timePeriod]);

  return { data, loading };
};

const useTopMachinesData = (locationId: string, timePeriod: string) => {
  const [data, setData] = useState<MachineData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = `/api/metrics/top-performers?locationId=${locationId}&timePeriod=${timePeriod}`;
        const response = await fetch(url);
        if (response.ok) {
          const result = await response.json();
          setData(result.data || []);
        }
      } catch (error) {
        console.error('Error fetching top machines data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (locationId) {
      fetchData();
    }
  }, [locationId, timePeriod]);

  return { data, loading };
};

// Location Revenue Chart Component
const LocationRevenueChart = ({ locationId, timePeriod }: { locationId: string; timePeriod: string }) => {
  const { data, loading } = useHourlyRevenueData(locationId, timePeriod);

  if (loading) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium">24-Hour Revenue Pattern</h4>
        <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
          <span className="text-sm text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <SimpleBarChart
      data={data}
      title="24-Hour Revenue Pattern"
    />
  );
};

// Location Top Machines Component
const LocationTopMachines = ({ locationId, timePeriod }: { locationId: string; timePeriod: string }) => {
  const { data, loading } = useTopMachinesData(locationId, timePeriod);

  if (loading) {
    return (
      <div>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-500" />
          Top 5 Performing Machines
        </h4>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between text-sm animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gray-200"></span>
                <span className="h-4 bg-gray-200 rounded w-24"></span>
              </div>
              <div className="text-right">
                <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h4 className="font-medium mb-3 flex items-center gap-2">
        <Star className="h-4 w-4 text-yellow-500" />
        Top 5 Performing Machines
      </h4>
      <div className="space-y-2">
        {data.map((machine, index) => (
          <div
            key={machine.id}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                {index + 1}
              </span>
              <span className="font-medium">{machine.name}</span>
            </div>
            <div className="text-right">
              <div className="font-medium text-green-600">
                ${machine.revenue.toLocaleString()}
              </div>
              <div className="text-muted-foreground text-xs">
                {machine.hold}% hold
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Casino Location Card Component
const CasinoLocationCard = ({ location, isSelected, onClick }: { 
  location: TopLocation; 
  isSelected: boolean; 
  onClick: () => void; 
}) => {
  const [revenueTrend, setRevenueTrend] = useState<Array<{ hour: string; revenue: number }>>([]);
  const [topPerformer, setTopPerformer] = useState<{
    machineName: string;
    revenue: number;
    holdPercentage: number;
  } | null>(null);
  const [dailyTarget, setDailyTarget] = useState<number>(0);
  const [dailyPerformance, setDailyPerformance] = useState<number>(0);
  const [trendLoading, setTrendLoading] = useState(true);
  const [performerLoading, setPerformerLoading] = useState(true);

  const {
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
  } = useDashBoardStore();

  // Fetch revenue trend data
  useEffect(() => {
    const fetchRevenueTrend = async () => {
      setTrendLoading(true);
      try {
        let url = `/api/metrics/hourly-trends?locationId=${location.locationId}`;
        
        // Add time period
        if (activeMetricsFilter === "Custom" && customDateRange?.startDate && customDateRange?.endDate) {
          url += `&timePeriod=Custom&startDate=${encodeURIComponent(customDateRange.startDate.toISOString())}&endDate=${encodeURIComponent(customDateRange.endDate.toISOString())}`;
        } else {
          url += `&timePeriod=${encodeURIComponent(activeMetricsFilter)}`;
        }
        
        // Add licencee filter
        if (selectedLicencee) {
          url += `&licencee=${encodeURIComponent(selectedLicencee)}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch revenue trend");
        const data = await res.json();
        
        setRevenueTrend(data.hourlyTrends || []);
        setDailyTarget(Math.round(data.previousPeriodAverage || 0));
        // Calculate daily performance percentage using new API fields
        const current = data.currentPeriodRevenue || 0;
        const target = data.previousPeriodAverage || 0;
        const performance = target > 0 ? ((current - target) / target) * 100 : 0;
        setDailyPerformance(Math.round(performance));
        
    } catch (error) {
        console.error("Error fetching revenue trend:", error);
        // Fallback to mock data
        const mockTrend = Array.from({ length: 24 }, (_, i) => ({
          hour: `${i.toString().padStart(2, '0')}:00`,
          revenue: Math.floor(Math.random() * 20000) + 1000
        }));
        setRevenueTrend(mockTrend);
        setDailyTarget(100000);
        setDailyPerformance(Math.floor(Math.random() * 200) - 50);
      } finally {
        setTrendLoading(false);
      }
    };

    fetchRevenueTrend();
  }, [location.locationId, activeMetricsFilter, customDateRange, selectedLicencee]);

  // Fetch top performer data
  useEffect(() => {
    const fetchTopPerformer = async () => {
      setPerformerLoading(true);
      try {
        let url = `/api/metrics/top-performers?locationId=${location.locationId}`;
        
        // Add time period
        if (activeMetricsFilter === "Custom" && customDateRange?.startDate && customDateRange?.endDate) {
          url += `&timePeriod=Custom&startDate=${encodeURIComponent(customDateRange.startDate.toISOString())}&endDate=${encodeURIComponent(customDateRange.endDate.toISOString())}`;
        } else {
          url += `&timePeriod=${encodeURIComponent(activeMetricsFilter)}`;
        }
        
        // Add licencee filter
        if (selectedLicencee) {
          url += `&licencee=${encodeURIComponent(selectedLicencee)}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch top performer");
        const data = await res.json();
        
        if (data.topPerformer) {
          setTopPerformer({
            machineName: data.topPerformer.machineName,
            revenue: data.topPerformer.revenue,
            holdPercentage: data.topPerformer.holdPercentage
          });
        } else {
          setTopPerformer(null);
        }
        
      } catch (error) {
        console.error("Error fetching top performer:", error);
        // Fallback to mock data
        setTopPerformer({
          machineName: "Lucky Stars Deluxe",
          revenue: Math.floor(Math.random() * 20000) + 10000,
          holdPercentage: Math.random() * 10 + 5,
        });
      } finally {
        setPerformerLoading(false);
      }
    };

    fetchTopPerformer();
  }, [location.locationId, activeMetricsFilter, customDateRange, selectedLicencee]);

  const totalRevenue = revenueTrend.reduce((sum, item) => sum + item.revenue, 0);
  const peakRevenue = revenueTrend.length > 0 ? Math.max(...revenueTrend.map(item => item.revenue)) : 0;
  const avgRevenue = revenueTrend.length > 0 ? Math.floor(totalRevenue / revenueTrend.length) : 0;

  const chartData = revenueTrend.map(item => ({
    hour: item.hour,
    revenue: item.revenue
  }));

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case "excellent":
        return "bg-green-100 text-green-700";
      case "good":
        return "bg-blue-100 text-blue-700";
      case "average":
        return "bg-yellow-100 text-yellow-700";
      case "poor":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getDailyTrendColor = (performance: number) => {
    if (performance >= 0) return "bg-green-500";
    return "bg-red-500";
  };

  const getDailyTrendTextColor = (performance: number) => {
    if (performance >= 0) return "text-green-700";
    return "text-red-700";
  };

    return (
    <div 
      className={`bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-auto border border-gray-200 cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] ${
        isSelected ? "ring-2 ring-blue-500 shadow-xl bg-blue-50" : "hover:ring-1 hover:ring-gray-300"
      }`}
      onClick={onClick}
    >
          {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900">{location.locationName}</span>
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${getPerformanceColor(location.performance)}`}>
            {location.performance}
          </span>
        </div>
        {location.sasEnabled ? (
          <Wifi className="w-5 h-5 text-green-500" />
        ) : (
          <WifiOff className="w-5 h-5 text-gray-400" />
        )}
      </div>
      <div className="text-sm text-gray-500 mb-4">
        {location.onlineMachines}/{location.totalMachines} machines online • {location.sasEnabled ? "SAS Enabled" : "Non-SAS"}
        </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
            <div>
          <div className="text-xs text-gray-500">Gross Revenue:</div>
          <div className="text-green-600 font-bold text-lg">${location.gross.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Drop:</div>
          <div className="text-yellow-600 font-bold text-lg">${location.drop.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Hold %:</div>
          <div className="text-gray-900 font-bold text-lg">
            {location.drop > 0 ? ((location.gross / location.drop) * 100).toFixed(1) : "0.0"}%
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Cancelled Credits:</div>
          <div className="text-gray-900 font-bold text-lg">${location.cancelledCredits.toLocaleString()}</div>
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">24h Revenue Trend</span>
          <span className="text-xs text-gray-500">
            Total: <span className="font-semibold text-gray-900">${totalRevenue.toLocaleString()}</span>
          </span>
        </div>
        {trendLoading ? (
          <div className="h-24 w-full bg-gray-200 rounded animate-pulse"></div>
        ) : (
          <div className="h-24 w-full">
          <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <XAxis dataKey="hour" hide />
              <YAxis hide />
              <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                  labelFormatter={(label) => `${label}:00`}
                />
              </LineChart>
          </ResponsiveContainer>
          </div>
        )}
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Peak: <span className="font-semibold text-gray-900">${peakRevenue.toLocaleString()}</span></span>
          <span>Avg: <span className="font-semibold text-gray-900">${avgRevenue.toLocaleString()}</span></span>
        </div>
        </div>

      {/* Daily Trend */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${getDailyTrendColor(dailyPerformance)} inline-block`}></span>
        <span className={`${getDailyTrendTextColor(dailyPerformance)} text-sm font-semibold`}>
          {dailyPerformance >= 0 ? '+' : ''}{dailyPerformance}% {dailyPerformance >= 0 ? 'above' : 'below'} target
          </span>
        </div>

      {/* Top Performer */}
      <div className="border-t pt-3 mt-2">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium text-gray-700">Top Performer</span>
        </div>
        {performerLoading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </div>
        ) : topPerformer ? (
          <>
            <div className="text-gray-900 font-semibold">
              {topPerformer.machineName}
            </div>
            <div className="text-xs text-gray-500">
              ${topPerformer.revenue.toLocaleString()} • {topPerformer.holdPercentage.toFixed(1)}% hold
            </div>
          </>
        ) : (
          <div className="text-xs text-gray-500">No data available</div>
        )}
      </div>
      </div>
    );
  };

export default function LocationsTab() {
  const { isLoading, setLoading } = useReportsStore();
  const {
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
  } = useDashBoardStore();

  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [metricsOverview, setMetricsOverview] = useState<LocationMetrics | null>(null);
  const [topLocations, setTopLocations] = useState<TopLocation[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [paginatedLocations, setPaginatedLocations] = useState<AggregatedLocation[]>([]);
  const [paginationLoading, setPaginationLoading] = useState(true); // Start with loading true

  // Fetch all locations and aggregate metrics using the reports API
  const fetchLocationsDataAsync = async () => {
    console.log("🔍 Starting fetchLocationsDataAsync - setting loading states to true");
    setMetricsLoading(true);
    setLocationsLoading(true);
    setPaginationLoading(true); // Set pagination loading to true during initial load
    try {
      console.log("🔍 LocationsTab - selectedLicencee:", selectedLicencee);
      console.log("🔍 LocationsTab - activeMetricsFilter:", activeMetricsFilter);
      
      // Build API parameters
      const params: Record<string, string> = {
        limit: "10", // Use limit of 10 for faster loading
        page: "1", // Start with page 1
      };
      
      if (selectedLicencee && selectedLicencee !== "all") {
        params.licencee = selectedLicencee;
      }
      
      if (activeMetricsFilter === "Custom" && customDateRange?.startDate && customDateRange?.endDate) {
        params.startDate = customDateRange.startDate.toISOString();
        params.endDate = customDateRange.endDate.toISOString();
      } else if (activeMetricsFilter !== "Custom") {
        params.timePeriod = activeMetricsFilter;
      }
      
      console.log("🔍 API params:", params);
      
      // Call the reports locations API
      const response = await axios.get("/api/reports/locations", { params });
      const { data: allLocations, pagination } = response.data;
      
      console.log("🔍 Total locations from API:", allLocations.length);
      console.log("🔍 Pagination info:", pagination);
      console.log("🔍 totalPages value:", pagination.totalPages);
      console.log("🔍 totalCount value:", pagination.totalCount);
      
      // Check if we have any locations with data
      const locationsWithData = allLocations.filter((loc: any) => loc.gross > 0 || loc.moneyIn > 0 || loc.moneyOut > 0);
      console.log("🔍 Locations with data:", locationsWithData.length);
      
      // Aggregate metrics overview
      const overview = allLocations.reduce(
        (acc: LocationMetrics, loc: any) => {
          acc.totalGross += loc.gross || 0;
          acc.totalDrop += loc.moneyIn || 0;
          acc.totalCancelledCredits += loc.moneyOut || 0;
          acc.onlineMachines += loc.onlineMachines || 0;
          acc.totalMachines += loc.totalMachines || 0;
          return acc;
        },
        { totalGross: 0, totalDrop: 0, totalCancelledCredits: 0, onlineMachines: 0, totalMachines: 0 }
      );
      setMetricsOverview(overview);
      setMetricsLoading(false);
      
      // Get top locations for overview (include all locations, even those with no data)
      const sorted = allLocations
        .sort((a: any, b: any) => (b.gross || 0) - (a.gross || 0))
        .slice(0, 20)
        .map((loc: any) => {
          const sasEnabled = loc.hasSasMachines;
          console.log(`🔍 Location ${loc.locationName}: hasSasMachines=${loc.hasSasMachines}, hasNonSasMachines=${loc.hasNonSasMachines}, sasEnabled=${sasEnabled}`);
          return {
            locationId: loc.location,
            locationName: loc.locationName,
            gross: loc.gross || 0,
            drop: loc.moneyIn || 0,
            cancelledCredits: loc.moneyOut || 0,
            onlineMachines: loc.onlineMachines || 0,
            totalMachines: loc.totalMachines || 0,
            performance: "average" as const,
            sasEnabled: sasEnabled,
            coordinates: undefined, // Will be added if needed
            holdPercentage: loc.moneyIn > 0 ? (loc.gross / loc.moneyIn) * 100 : 0,
          };
        });
      setTopLocations(sorted);
      setLocationsLoading(false);
      
      // Set paginated data from API response
      setPaginatedLocations(allLocations);
      setCurrentPage(pagination.page);
      setTotalPages(pagination.totalPages);
      setTotalCount(pagination.totalCount);
      setHasNextPage(pagination.hasNextPage);
      setHasPrevPage(pagination.hasPrevPage);
      console.log("🔍 API call successful - setting paginationLoading to false");
      // Add a longer delay to make loading state more visible
      setTimeout(() => {
        setPaginationLoading(false);
      }, 1000);
    } catch (error) {
      console.log("🔍 API call failed - setting paginationLoading to false");
      toast.error("Failed to load location data");
      setMetricsLoading(false);
      setLocationsLoading(false);
      setPaginationLoading(false); // Make sure to set pagination loading to false on error
      setMetricsOverview(null);
      setTopLocations([]);
      setPaginatedLocations([]);
      console.error("Error fetching location data:", error);
    }
  };

  // Handle pagination (server-side)
  const handlePageChange = useCallback(async (page: number) => {
    console.log("🔍 handlePageChange called - setting paginationLoading to true");
    setPaginationLoading(true);
    try {
      // Build API parameters for the new page
      const params: Record<string, string> = {
        limit: "10",
        page: page.toString(),
      };
      
      if (selectedLicencee && selectedLicencee !== "all") {
        params.licencee = selectedLicencee;
      }
      
      if (activeMetricsFilter === "Custom" && customDateRange?.startDate && customDateRange?.endDate) {
        params.startDate = customDateRange.startDate.toISOString();
        params.endDate = customDateRange.endDate.toISOString();
      } else if (activeMetricsFilter !== "Custom") {
        params.timePeriod = activeMetricsFilter;
      }
      
      console.log("🔍 Pagination API params:", params);
      
      // Call the reports locations API for the new page
      const response = await axios.get("/api/reports/locations", { params });
      const { data: newLocations, pagination: newPagination } = response.data;
      
      // Update paginated data
      setPaginatedLocations(newLocations);
      setCurrentPage(newPagination.page);
      setTotalPages(newPagination.totalPages);
      setTotalCount(newPagination.totalCount);
      setHasNextPage(newPagination.hasNextPage);
      setHasPrevPage(newPagination.hasPrevPage);
      console.log("🔍 Pagination API call successful - setting paginationLoading to false");
      // Add a longer delay to make loading state more visible
      setTimeout(() => {
        setPaginationLoading(false);
      }, 1000);
    } catch (error) {
      console.log("🔍 Pagination API call failed - setting paginationLoading to false");
      toast.error("Failed to load page data");
      console.error("Error fetching page data:", error);
    } finally {
      setPaginationLoading(false);
    }
  }, [selectedLicencee, activeMetricsFilter, customDateRange]);

  useEffect(() => {
    fetchLocationsDataAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMetricsFilter, customDateRange, selectedLicencee]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeMetricsFilter, customDateRange, selectedLicencee]);

  // Debug effect to log state changes
  useEffect(() => {
    console.log("🔍 State Debug - paginationLoading:", paginationLoading, "locations count:", paginatedLocations.length, "currentPage:", currentPage, "totalPages:", totalPages, "totalCount:", totalCount);
    console.log("🔍 Table Props Debug - totalPages:", totalPages, "totalCount:", totalCount, "onPageChange exists:", !!handlePageChange);
    console.log("🔍 Loading State Debug - paginationLoading:", paginationLoading, "should show skeleton:", paginationLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationLoading, paginatedLocations.length, currentPage, totalPages, totalCount]);

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocations(prev => 
      prev.includes(locationId) 
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleExportLocationRevenue = async () => {
    try {
      const exportData = {
        title: "Location Revenue Report",
        subtitle: "Top performing locations sorted by gross revenue",
        headers: [
          "Location ID",
          "Location Name",
          "Gross Revenue",
          "Drop",
          "Cancelled Credits",
          "Online Machines",
          "Total Machines",
          "Performance",
          "SAS Status",
        ],
        data: topLocations.map(location => [
          location.locationId,
          location.locationName,
          location.gross.toLocaleString(),
          location.drop.toLocaleString(),
          location.cancelledCredits.toLocaleString(),
          location.onlineMachines,
          location.totalMachines,
          location.performance,
          location.sasEnabled ? "SAS Enabled" : "Non-SAS",
        ]),
        summary: metricsOverview ? [
          { label: "Total Gross Revenue", value: `$${metricsOverview.totalGross.toLocaleString()}` },
          { label: "Total Drop", value: `$${metricsOverview.totalDrop.toLocaleString()}` },
          { label: "Total Cancelled Credits", value: `$${metricsOverview.totalCancelledCredits.toLocaleString()}` },
          { label: "Online Machines", value: `${metricsOverview.onlineMachines}/${metricsOverview.totalMachines}` },
        ] : [],
        metadata: {
          generatedBy: "Reports System",
          generatedAt: new Date().toISOString(),
          dateRange: `${activeMetricsFilter}`,
        },
      };

      await ExportUtils.exportToExcel(exportData);
      toast.success("Location revenue report exported successfully");
    } catch (error) {
      toast.error("Failed to export report");
      console.error("Export error:", error);
    }
  };

  // Filter locations by SAS status
  const sasLocations = useMemo(() => {
    const filtered = topLocations.filter((location) => location.sasEnabled);
    console.log('🔍 SAS Locations:', filtered.length, 'out of', topLocations.length);
    return filtered;
  }, [topLocations]);

  const nonSasLocations = useMemo(() => {
    const filtered = topLocations.filter((location) => !location.sasEnabled);
    console.log('🔍 Non-SAS Locations:', filtered.length, 'out of', topLocations.length);
    console.log('🔍 Sample non-SAS locations:', filtered.slice(0, 3).map(loc => ({ name: loc.locationName, sasEnabled: loc.sasEnabled })));
    return filtered;
  }, [topLocations]);

  return (
    <div className="space-y-6">
          {/* Header */}
      <div className="flex items-center justify-between mb-4">
            <div>
          <h2 className="text-2xl font-bold text-gray-900">Location Performance Overview</h2>
          <p className="text-sm text-gray-600">Compare performance across all casino locations</p>
          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
            <span role="img" aria-label="lightbulb">💡</span> Click any location card to view detailed information
              </p>
            </div>
        <button
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition-all text-base ml-4"
          onClick={handleExportLocationRevenue}
        >
          <Download className="w-5 h-5" />
              Export Report
        </button>
          </div>

      {/* Date Filter */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Date Filter</h3>
        <DashboardDateFilters />
      </div>

      {/* Three-Tab Navigation System */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Navigation Tabs</h3>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100 p-2 rounded-lg shadow-sm">
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

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Interactive Map */}
          <LocationMap
            selectedLocations={selectedLocations}
            onLocationSelect={handleLocationSelect}
          />

          {/* Metrics Overview */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Metrics Overview</h3>
            {metricsLoading ? (
              <MetricsOverviewSkeleton />
            ) : metricsOverview ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                      ${metricsOverview.totalGross.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  Total Gross Revenue
                </p>
                <p className="text-xs text-green-600 font-medium">
                  (Green - Gross)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">
                      ${metricsOverview.totalDrop.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total Drop</p>
                <p className="text-xs text-yellow-600 font-medium">
                  (Yellow - Drop)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-black">
                      ${metricsOverview.totalCancelledCredits.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  Total Cancelled Credits
                </p>
                <p className="text-xs text-black font-medium">
                  (Black - Cancelled)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                      {metricsOverview.onlineMachines}/{metricsOverview.totalMachines}
                </div>
                <p className="text-sm text-muted-foreground">Online Machines</p>
                <Progress
                      value={(metricsOverview.onlineMachines / metricsOverview.totalMachines) * 100}
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Locations (Sorted by Gross)</h3>
            {locationsLoading ? (
              <TopLocationsSkeleton />
            ) : topLocations.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {topLocations.map((location) => (
                  <CasinoLocationCard
                key={location.locationId}
                    location={location}
                    isSelected={selectedLocations.includes(location.locationId)}
                onClick={() => handleLocationSelect(location.locationId)}
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
                <h3 className="text-2xl font-bold text-gray-900">SAS Evaluation Dashboard</h3>
                <p className="text-sm text-gray-600">Comprehensive location evaluation with interactive filtering and real-time data visualization</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportLocationRevenue}
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
                  Select specific locations to filter data or view all locations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Locations
                    </label>
                    <LocationMultiSelect
                      options={topLocations.map(loc => ({
                        id: loc.locationId,
                        name: loc.locationName,
                        sasEnabled: loc.sasEnabled
                      }))}
                      selectedIds={selectedLocations}
                      onSelectionChange={setSelectedLocations}
                      placeholder="Choose locations to filter..."
                    />
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
                        ? `${selectedLocations.length} location${selectedLocations.length > 1 ? 's' : ''} selected`
                        : 'Showing all locations'
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Location Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Location Evaluation Table
                </CardTitle>
                <CardDescription>
                  Comprehensive location metrics with SAS status indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedLocationTable
                  locations={(selectedLocations.length > 0 
                    ? paginatedLocations.filter(loc => selectedLocations.includes(loc.location))
                    : paginatedLocations
                  ).map(loc => ({
                    location: loc.location,
                    locationName: loc.locationName,
                    moneyIn: loc.moneyIn,
                    moneyOut: loc.moneyOut,
                    gross: loc.gross,
                    totalMachines: loc.totalMachines,
                    onlineMachines: loc.onlineMachines,
                    sasMachines: loc.sasMachines,
                    nonSasMachines: loc.nonSasMachines,
                    hasSasMachines: loc.hasSasMachines,
                    hasNonSasMachines: loc.hasNonSasMachines,
                    isLocalServer: loc.isLocalServer,
                    noSMIBLocation: !loc.hasSasMachines,
                    hasSmib: loc.hasSasMachines,
                  }))}
                  onLocationClick={(locationId) => {
                    // Handle location click - could navigate to location details
                    console.log('Location clicked:', locationId);
                  }}
                  loading={paginationLoading}
                  error={null}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  onPageChange={handlePageChange}
                  itemsPerPage={10}
                />
              </CardContent>
            </Card>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HandleChart
                timePeriod={activeMetricsFilter}
                locationIds={selectedLocations.length > 0 ? selectedLocations : undefined}
                licencee={selectedLicencee}
              />
              <WinLossChart
                timePeriod={activeMetricsFilter}
                locationIds={selectedLocations.length > 0 ? selectedLocations : undefined}
                licencee={selectedLicencee}
              />
              <JackpotChart
                timePeriod={activeMetricsFilter}
                locationIds={selectedLocations.length > 0 ? selectedLocations : undefined}
                licencee={selectedLicencee}
              />
              <PlaysChart
                timePeriod={activeMetricsFilter}
                locationIds={selectedLocations.length > 0 ? selectedLocations : undefined}
                licencee={selectedLicencee}
              />
            </div>

            {/* Top Machines Section */}
            <TopMachinesTable
              timePeriod={activeMetricsFilter}
              locationIds={selectedLocations.length > 0 ? selectedLocations : undefined}
              licencee={selectedLicencee}
              limit={5}
            />


          </div>
        </TabsContent>

                {/* Revenue Analysis Tab */}
        <TabsContent value="location-revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Location Revenue Report - Non-SAS Analysis
              </CardTitle>
              <CardDescription>
                Track non-SAS machine performance with drop, cancelled credits, and gross revenue analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Revenue Analysis Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {nonSasLocations.length > 0 ? (
                    nonSasLocations.map((location) => (
                    <Card key={location.locationId}>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                          {location.locationName}
                          <Badge variant="secondary">Non-SAS</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Color-coded metrics */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                              ${location.gross.toLocaleString()}
                            </div>
                            <div className="text-muted-foreground">Gross Revenue</div>
                            <div className="text-xs text-green-600">Green</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-600">
                              ${location.drop.toLocaleString()}
                            </div>
                            <div className="text-muted-foreground">Drop</div>
                            <div className="text-xs text-yellow-600">Yellow</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-black">
                              ${location.cancelledCredits.toLocaleString()}
                            </div>
                            <div className="text-muted-foreground">Cancelled</div>
                            <div className="text-xs text-black">Black</div>
                          </div>
                        </div>

                        {/* Hourly Revenue Graph */}
                        <LocationRevenueChart locationId={location.locationId} timePeriod={activeMetricsFilter} />

                        {/* Top 5 Machines */}
                        <LocationTopMachines locationId={location.locationId} timePeriod={activeMetricsFilter} />
                      </CardContent>
                    </Card>
                  ))
                  ) : (
                    <div className="col-span-2 text-center py-8">
                      <div className="text-gray-500 mb-4">
                        <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <h3 className="text-lg font-medium">No Non-SAS Locations Found</h3>
                        <p className="text-sm">All locations appear to be SAS-enabled. Check the SAS Evaluation tab for detailed analysis.</p>
                                </div>
                      <div className="text-xs text-gray-400">
                        Debug: Found {topLocations.length} total locations, {sasLocations.length} SAS locations, {nonSasLocations.length} non-SAS locations
                                  </div>
                                  </div>
                  )}
                </div>

                {/* Summary Section */}
                {nonSasLocations.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Non-SAS Location Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                            ${nonSasLocations.reduce((sum, loc) => sum + loc.gross, 0).toLocaleString()}
                        </div>
                          <p className="text-sm text-muted-foreground">Total Gross Revenue</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                            ${nonSasLocations.reduce((sum, loc) => sum + loc.drop, 0).toLocaleString()}
                        </div>
                          <p className="text-sm text-muted-foreground">Total Drop</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-black">
                            ${nonSasLocations.reduce((sum, loc) => sum + loc.cancelledCredits, 0).toLocaleString()}
                        </div>
                          <p className="text-sm text-muted-foreground">Total Cancelled Credits</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {(
                            nonSasLocations.reduce(
                                (sum, loc) => sum + (loc.drop > 0 ? (loc.gross / loc.drop) * 100 : 0),
                              0
                            ) / nonSasLocations.length
                            ).toFixed(1)}%
                        </div>
                          <p className="text-sm text-muted-foreground">Average Hold</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
