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
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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
import { ExportUtils } from "@/lib/utils/exportUtils";
import LocationMap from "@/components/reports/common/LocationMap";

// Sample location data with enhanced fields for meeting requirements
const sampleLocations = [
  {
    locationId: "LOC001",
    locationName: "Main Casino Floor",
    sasEnabled: true, // SAS capability
    onlineMachines: 85,
    totalMachines: 90,
    metrics: {
      totalHandle: 1250000,
      totalWin: 108750,
      totalJackpots: 45000,
      totalGamesPlayed: 125000,
      actualHoldPercentage: 8.7,
      averageBetPerGame: 10.0,
      totalDrop: 875000, // Yellow color per meeting notes
      totalCancelledCredits: 65000, // Black color per meeting notes
      totalHandPaidCancelledCredits: 12000,
      totalWonCredits: 980000,
      voucherOut: 53000,
      moneyWon: 1025000,
      grossRevenue: 108750, // Green color per meeting notes
      netRevenue: 96750,
    },
    performance: "excellent" as const,
    coordinates: { lat: 40.7128, lng: -74.006 },
    topMachines: [
      { id: "MAC001", name: "Lucky Stars Deluxe", revenue: 15420, hold: 9.2 },
      { id: "MAC045", name: "Diamond Riches", revenue: 13890, hold: 8.9 },
      { id: "MAC023", name: "Golden Fortune", revenue: 12750, hold: 8.7 },
      { id: "MAC067", name: "Vegas Dreams", revenue: 11200, hold: 8.5 },
      { id: "MAC012", name: "Jackpot Express", revenue: 10980, hold: 8.4 },
    ],
    hourlyRevenue: [
      { hour: 0, revenue: 3200 },
      { hour: 1, revenue: 2800 },
      { hour: 2, revenue: 2400 },
      { hour: 3, revenue: 2100 },
      { hour: 4, revenue: 1900 },
      { hour: 5, revenue: 2200 },
      { hour: 6, revenue: 4500 },
      { hour: 7, revenue: 6200 },
      { hour: 8, revenue: 7800 },
      { hour: 9, revenue: 8900 },
      { hour: 10, revenue: 9200 },
      { hour: 11, revenue: 9800 },
      { hour: 12, revenue: 10200 },
      { hour: 13, revenue: 9800 },
      { hour: 14, revenue: 9500 },
      { hour: 15, revenue: 9200 },
      { hour: 16, revenue: 9800 },
      { hour: 17, revenue: 10500 },
      { hour: 18, revenue: 11200 },
      { hour: 19, revenue: 12800 },
      { hour: 20, revenue: 14200 },
      { hour: 21, revenue: 15800 },
      { hour: 22, revenue: 16200 },
      { hour: 23, revenue: 14800 },
    ],
  },
  {
    locationId: "LOC002",
    locationName: "VIP Gaming Area",
    sasEnabled: true,
    onlineMachines: 42,
    totalMachines: 45,
    metrics: {
      totalHandle: 890000,
      totalWin: 76230,
      totalJackpots: 32000,
      totalGamesPlayed: 89000,
      actualHoldPercentage: 8.6,
      averageBetPerGame: 10.0,
      totalDrop: 623000,
      totalCancelledCredits: 45000,
      totalHandPaidCancelledCredits: 8000,
      totalWonCredits: 698000,
      voucherOut: 37000,
      moneyWon: 730000,
      grossRevenue: 76230,
      netRevenue: 68230,
    },
    performance: "good" as const,
    coordinates: { lat: 40.7589, lng: -73.9851 },
    topMachines: [
      { id: "MAC078", name: "High Roller Elite", revenue: 18900, hold: 9.5 },
      { id: "MAC089", name: "Platinum Palace", revenue: 16800, hold: 9.1 },
      { id: "MAC091", name: "Diamond VIP", revenue: 14200, hold: 8.8 },
      { id: "MAC103", name: "Royal Fortune", revenue: 12500, hold: 8.6 },
      { id: "MAC115", name: "Executive Club", revenue: 11800, hold: 8.4 },
    ],
    hourlyRevenue: [
      { hour: 0, revenue: 2200 },
      { hour: 1, revenue: 1800 },
      { hour: 2, revenue: 1400 },
      { hour: 3, revenue: 1200 },
      { hour: 4, revenue: 1000 },
      { hour: 5, revenue: 1300 },
      { hour: 6, revenue: 2800 },
      { hour: 7, revenue: 3900 },
      { hour: 8, revenue: 4800 },
      { hour: 9, revenue: 5200 },
      { hour: 10, revenue: 5800 },
      { hour: 11, revenue: 6200 },
      { hour: 12, revenue: 6800 },
      { hour: 13, revenue: 6500 },
      { hour: 14, revenue: 6200 },
      { hour: 15, revenue: 5800 },
      { hour: 16, revenue: 6200 },
      { hour: 17, revenue: 7200 },
      { hour: 18, revenue: 8200 },
      { hour: 19, revenue: 9800 },
      { hour: 20, revenue: 10500 },
      { hour: 21, revenue: 11200 },
      { hour: 22, revenue: 10800 },
      { hour: 23, revenue: 9200 },
    ],
  },
  {
    locationId: "LOC003",
    locationName: "Sports Bar Gaming",
    sasEnabled: false, // Non-SAS location for Location Revenue Report
    onlineMachines: 28,
    totalMachines: 32,
    metrics: {
      totalHandle: 567000,
      totalWin: 45360,
      totalJackpots: 18000,
      totalGamesPlayed: 56700,
      actualHoldPercentage: 8.0,
      averageBetPerGame: 10.0,
      totalDrop: 396900,
      totalCancelledCredits: 28000,
      totalHandPaidCancelledCredits: 5000,
      totalWonCredits: 445000,
      voucherOut: 23000,
      moneyWon: 463000,
      grossRevenue: 45360,
      netRevenue: 40360,
    },
    performance: "average" as const,
    coordinates: { lat: 40.7282, lng: -73.7949 },
    topMachines: [
      { id: "MAC201", name: "Sports Supreme", revenue: 8900, hold: 8.2 },
      { id: "MAC215", name: "Championship Gold", revenue: 7800, hold: 8.0 },
      { id: "MAC223", name: "Victory Lane", revenue: 7200, hold: 7.9 },
      { id: "MAC235", name: "Trophy Hunter", revenue: 6800, hold: 7.8 },
      { id: "MAC247", name: "Game Winner", revenue: 6200, hold: 7.7 },
    ],
    hourlyRevenue: [
      { hour: 0, revenue: 1200 },
      { hour: 1, revenue: 800 },
      { hour: 2, revenue: 600 },
      { hour: 3, revenue: 400 },
      { hour: 4, revenue: 300 },
      { hour: 5, revenue: 500 },
      { hour: 6, revenue: 1200 },
      { hour: 7, revenue: 1800 },
      { hour: 8, revenue: 2200 },
      { hour: 9, revenue: 2800 },
      { hour: 10, revenue: 3200 },
      { hour: 11, revenue: 3600 },
      { hour: 12, revenue: 4200 },
      { hour: 13, revenue: 4800 },
      { hour: 14, revenue: 4500 },
      { hour: 15, revenue: 4200 },
      { hour: 16, revenue: 4800 },
      { hour: 17, revenue: 5500 },
      { hour: 18, revenue: 6200 },
      { hour: 19, revenue: 7200 },
      { hour: 20, revenue: 8200 },
      { hour: 21, revenue: 8800 },
      { hour: 22, revenue: 8200 },
      { hour: 23, revenue: 6800 },
    ],
  },
];

export default function LocationsTab() {
  const { isLoading, setLoading, selectedDateRange } = useReportsStore();
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, [setLoading, selectedDateRange]);

  const sasLocations = useMemo(() => {
    return sampleLocations.filter((location) => location.sasEnabled);
  }, []);

  const nonSasLocations = useMemo(() => {
    return sampleLocations.filter((location) => !location.sasEnabled);
  }, []);

  const handleExportLocationRevenue = async () => {
    try {
      const exportData = {
        title: "Location Revenue Report",
        subtitle:
          "Non-SAS machine revenue analysis with graphs and top performers",
        headers: [
          "Location ID",
          "Location Name",
          "SAS Status",
          "Gross Revenue",
          "Drop",
          "Cancelled Credits",
          "Net Revenue",
          "Hold %",
          "Online/Total Machines",
          "Top Machine",
        ],
        data: sampleLocations.map((location) => [
          location.locationId,
          location.locationName,
          location.sasEnabled ? "SAS Enabled" : "Non-SAS",
          `$${location.metrics.grossRevenue.toLocaleString()}`,
          `$${location.metrics.totalDrop.toLocaleString()}`,
          `$${location.metrics.totalCancelledCredits.toLocaleString()}`,
          `$${location.metrics.netRevenue.toLocaleString()}`,
          `${location.metrics.actualHoldPercentage.toFixed(1)}%`,
          `${location.onlineMachines}/${location.totalMachines}`,
          location.topMachines[0].name,
        ]),
        summary: [
          {
            label: "Total Locations",
            value: sampleLocations.length.toString(),
          },
          { label: "SAS Locations", value: sasLocations.length.toString() },
          {
            label: "Non-SAS Locations",
            value: nonSasLocations.length.toString(),
          },
          {
            label: "Total Gross Revenue",
            value: `$${sampleLocations
              .reduce((sum, loc) => sum + loc.metrics.grossRevenue, 0)
              .toLocaleString()}`,
          },
          {
            label: "Total Drop",
            value: `$${sampleLocations
              .reduce((sum, loc) => sum + loc.metrics.totalDrop, 0)
              .toLocaleString()}`,
          },
          {
            label: "Total Cancelled Credits",
            value: `$${sampleLocations
              .reduce((sum, loc) => sum + loc.metrics.totalCancelledCredits, 0)
              .toLocaleString()}`,
          },
        ],
        metadata: {
          generatedBy: "Evolution1 CMS - Location Revenue Report",
          generatedAt: new Date().toISOString(),
          dateRange: selectedDateRange
            ? `${selectedDateRange.start?.toDateString()} - ${selectedDateRange.end?.toDateString()}`
            : "All time",
        },
      };

      await ExportUtils.exportData(exportData, "pdf");
      toast.success("Location revenue report exported successfully");
    } catch (error) {
      console.error("Failed to export location revenue:", error);
      toast.error("Failed to export location revenue report");
    }
  };

  const handleLocationSelect = (locationId: string) => {
    // Toggle selection for visual feedback
    setSelectedLocations((prev) =>
      prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );

    // Navigate to location details page
    const selectedLocation = sampleLocations.find(
      (loc) => loc.locationId === locationId
    );
    if (selectedLocation) {
      // Create a URL-friendly slug from the location name
      const locationSlug = selectedLocation.locationName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      // Navigate to the location details page
      window.open(`/locations/${locationSlug}`, "_blank");
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="location-evaluation">SAS Evaluation</TabsTrigger>
          <TabsTrigger value="location-revenue">Revenue Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Location Performance Overview
              </h2>
              <p className="text-gray-600">
                Compare performance across all casino locations
              </p>
              <p className="text-sm text-blue-600 mt-1">
                💡 Click any location card to view detailed information
              </p>
            </div>
            <Button onClick={handleExportLocationRevenue} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>

          {/* Interactive Map */}
          <LocationMap
            locations={sampleLocations}
            selectedLocations={selectedLocations}
            onLocationSelect={handleLocationSelect}
          />

          {/* Summary Cards with Color Coding per Meeting Notes */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  $
                  {sampleLocations
                    .reduce((sum, loc) => sum + loc.metrics.grossRevenue, 0)
                    .toLocaleString()}
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
                  $
                  {sampleLocations
                    .reduce((sum, loc) => sum + loc.metrics.totalDrop, 0)
                    .toLocaleString()}
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
                  $
                  {sampleLocations
                    .reduce(
                      (sum, loc) => sum + loc.metrics.totalCancelledCredits,
                      0
                    )
                    .toLocaleString()}
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
                  {sampleLocations.reduce(
                    (sum, loc) => sum + loc.onlineMachines,
                    0
                  )}
                  /
                  {sampleLocations.reduce(
                    (sum, loc) => sum + loc.totalMachines,
                    0
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Online Machines</p>
                <Progress
                  value={
                    (sampleLocations.reduce(
                      (sum, loc) => sum + loc.onlineMachines,
                      0
                    ) /
                      sampleLocations.reduce(
                        (sum, loc) => sum + loc.totalMachines,
                        0
                      )) *
                    100
                  }
                  className="mt-2"
                />
              </CardContent>
            </Card>
          </div>

          {/* Location Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {sampleLocations.map((location) => (
              <Card
                key={location.locationId}
                className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] group ${
                  selectedLocations.includes(location.locationId)
                    ? "ring-2 ring-blue-500 shadow-lg bg-blue-50"
                    : "hover:ring-1 hover:ring-gray-300"
                }`}
                onClick={() => handleLocationSelect(location.locationId)}
                title="Click to view location details"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">
                        {location.locationName}
                      </CardTitle>
                      <div className="ml-auto opacity-60 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          location.performance === "excellent"
                            ? "default"
                            : location.performance === "good"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {location.performance}
                      </Badge>
                      {location.sasEnabled ? (
                        <div className="relative group">
                          <Wifi className="h-4 w-4 text-green-600" />
                          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            SAS Enabled
                          </span>
                        </div>
                      ) : (
                        <div className="relative group">
                          <WifiOff className="h-4 w-4 text-gray-400" />
                          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            Non-SAS
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    {location.onlineMachines}/{location.totalMachines} machines
                    online •{location.sasEnabled ? " SAS Enabled" : " Non-SAS"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Key Metrics with Color Coding */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Gross Revenue:
                        </span>
                        <div className="font-medium text-green-600">
                          ${location.metrics.grossRevenue.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Drop:</span>
                        <div className="font-medium text-yellow-600">
                          ${location.metrics.totalDrop.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Hold %:</span>
                        <div className="font-medium">
                          {location.metrics.actualHoldPercentage.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Cancelled Credits:
                        </span>
                        <div className="font-medium text-black">
                          $
                          {location.metrics.totalCancelledCredits.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Hourly Revenue Chart */}
                    <SimpleBarChart
                      data={location.hourlyRevenue}
                      title="24h Revenue Trend"
                    />

                    {/* Performance Trend Indicator */}
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Daily Trend:
                        </span>
                        <div className="flex items-center gap-1">
                          {location.performance === "excellent" ? (
                            <>
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-green-600 font-medium">
                                +
                                {Math.round(
                                  location.metrics.actualHoldPercentage * 10
                                )}
                                % above target
                              </span>
                            </>
                          ) : location.performance === "good" ? (
                            <>
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-blue-600 font-medium">
                                +
                                {Math.round(
                                  location.metrics.actualHoldPercentage * 5
                                )}
                                % above average
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              <span className="text-yellow-600 font-medium">
                                Meeting expectations
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Top Machine */}
                    <div className="pt-3 border-t">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">
                          Top Performer
                        </span>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">
                          {location.topMachines[0].name}
                        </div>
                        <div className="text-muted-foreground">
                          ${location.topMachines[0].revenue.toLocaleString()} •{" "}
                          {location.topMachines[0].hold}% hold
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="location-evaluation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Location Evaluation Report - SAS Machine Performance
              </CardTitle>
              <CardDescription>
                Track SAS machine performance with immediate soft meter data
                access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {sasLocations.length}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      SAS-Enabled Locations
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {sasLocations.reduce(
                        (sum, loc) => sum + loc.onlineMachines,
                        0
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      SAS Machines Online
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-amber-600">
                      $
                      {sasLocations
                        .reduce((sum, loc) => sum + loc.metrics.grossRevenue, 0)
                        .toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">SAS Revenue</p>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Location</th>
                        <th className="text-left p-3 font-medium">
                          SAS Status
                        </th>
                        <th className="text-left p-3 font-medium">
                          Online Machines
                        </th>
                        <th className="text-left p-3 font-medium">
                          Real-time Revenue
                        </th>
                        <th className="text-left p-3 font-medium">Hold %</th>
                        <th className="text-left p-3 font-medium">
                          Performance
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleLocations.map((location) => (
                        <tr
                          key={location.locationId}
                          className="border-b hover:bg-muted/30"
                        >
                          <td className="p-3">
                            <div>
                              <div className="font-medium">
                                {location.locationName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {location.locationId}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                location.sasEnabled ? "default" : "secondary"
                              }
                            >
                              {location.sasEnabled ? "SAS Enabled" : "Non-SAS"}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {location.onlineMachines}/
                                {location.totalMachines}
                              </span>
                              <Progress
                                value={
                                  (location.onlineMachines /
                                    location.totalMachines) *
                                  100
                                }
                                className="w-16 h-2"
                              />
                            </div>
                          </td>
                          <td className="p-3 text-sm font-medium text-green-600">
                            ${location.metrics.grossRevenue.toLocaleString()}
                          </td>
                          <td className="p-3 text-sm">
                            {location.metrics.actualHoldPercentage.toFixed(1)}%
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                location.performance === "excellent"
                                  ? "default"
                                  : location.performance === "good"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {location.performance}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location-revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Location Revenue Report - Non-SAS Analysis
              </CardTitle>
              <CardDescription>
                Track non-SAS machine performance with drop, cancelled credits,
                and gross revenue analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Revenue Analysis Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {nonSasLocations.map((location) => (
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
                              ${location.metrics.grossRevenue.toLocaleString()}
                            </div>
                            <div className="text-muted-foreground">
                              Gross Revenue
                            </div>
                            <div className="text-xs text-green-600">Green</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-600">
                              ${location.metrics.totalDrop.toLocaleString()}
                            </div>
                            <div className="text-muted-foreground">Drop</div>
                            <div className="text-xs text-yellow-600">
                              Yellow
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-black">
                              $
                              {location.metrics.totalCancelledCredits.toLocaleString()}
                            </div>
                            <div className="text-muted-foreground">
                              Cancelled
                            </div>
                            <div className="text-xs text-black">Black</div>
                          </div>
                        </div>

                        {/* Hourly Revenue Graph */}
                        <SimpleBarChart
                          data={location.hourlyRevenue}
                          title="24-Hour Revenue Pattern"
                        />

                        {/* Top 5 Machines */}
                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            Top 5 Performing Machines
                          </h4>
                          <div className="space-y-2">
                            {location.topMachines.map((machine, index) => (
                              <div
                                key={machine.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                    {index + 1}
                                  </span>
                                  <span className="font-medium">
                                    {machine.name}
                                  </span>
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
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Summary Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Non-SAS Location Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          $
                          {nonSasLocations
                            .reduce(
                              (sum, loc) => sum + loc.metrics.grossRevenue,
                              0
                            )
                            .toLocaleString()}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Total Gross Revenue
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          $
                          {nonSasLocations
                            .reduce(
                              (sum, loc) => sum + loc.metrics.totalDrop,
                              0
                            )
                            .toLocaleString()}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Total Drop
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-black">
                          $
                          {nonSasLocations
                            .reduce(
                              (sum, loc) =>
                                sum + loc.metrics.totalCancelledCredits,
                              0
                            )
                            .toLocaleString()}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Total Cancelled Credits
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {(
                            nonSasLocations.reduce(
                              (sum, loc) =>
                                sum + loc.metrics.actualHoldPercentage,
                              0
                            ) / nonSasLocations.length
                          ).toFixed(1)}
                          %
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Average Hold
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
