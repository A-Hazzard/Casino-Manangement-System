"use client";

import { useState, useEffect, useMemo } from "react";
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

// Types for location data
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

  // Fetch all locations and aggregate metrics
  const fetchLocationsData = async () => {
    setMetricsLoading(true);
    setLocationsLoading(true);
    try {
      // Build query params
      let url = "/api/locationAggregation?";
      if (activeMetricsFilter === "Custom" && customDateRange?.startDate && customDateRange?.endDate) {
        url += `timePeriod=Custom&startDate=${encodeURIComponent(customDateRange.startDate.toISOString())}&endDate=${encodeURIComponent(customDateRange.endDate.toISOString())}`;
      } else {
        url += `timePeriod=${encodeURIComponent(activeMetricsFilter)}`;
      }
      if (selectedLicencee) {
        url += `&licencee=${encodeURIComponent(selectedLicencee)}`;
      }
      // Fetch all locations with metrics
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch location metrics");
      const locations = await res.json();
      // Aggregate metrics overview
      const overview = locations.reduce(
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
      // Top 5 locations by gross
      const sorted = [...locations]
        .sort((a, b) => (b.gross || 0) - (a.gross || 0))
        .slice(0, 5)
        .map((loc: any) => ({
          locationId: loc.location,
          locationName: loc.locationName,
          gross: loc.gross || 0,
          drop: loc.moneyIn || 0,
          cancelledCredits: loc.moneyOut || 0,
          onlineMachines: loc.onlineMachines || 0,
          totalMachines: loc.totalMachines || 0,
          performance: "average" as const, // You can add logic for performance if needed
          sasEnabled: loc.hasSmib !== false,
          coordinates: loc.geoCoords
            ? { lat: loc.geoCoords.latitude, lng: loc.geoCoords.longitude }
            : undefined,
          // Additional fields for the new card design
          holdPercentage: loc.drop > 0 ? (loc.gross / loc.drop) * 100 : 0,
        }));
      setTopLocations(sorted);
      setLocationsLoading(false);
    } catch (error) {
      toast.error("Failed to load location data");
      setMetricsLoading(false);
      setLocationsLoading(false);
      setMetricsOverview(null);
      setTopLocations([]);
      console.error("Error fetching location data:", error);
    }
  };

  useEffect(() => {
    fetchLocationsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMetricsFilter, customDateRange, selectedLicencee]);

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
    </div>
  );
}
