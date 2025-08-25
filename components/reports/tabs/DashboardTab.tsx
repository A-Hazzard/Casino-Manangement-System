"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useReportsStore } from "@/lib/store/reportsStore";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Activity,
  MapPin,
} from "lucide-react";
import LocationMap from "@/components/reports/common/LocationMap";

// Sample KPI data
const sampleKpiMetrics = [
  {
    title: "Total Revenue",
    value: 2450000,
    previousValue: 2280000,
    format: "currency" as const,
    trend: "up" as const,
    change: 7.5,
    icon: DollarSign,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    title: "Active Players",
    value: 1847,
    previousValue: 1693,
    format: "number" as const,
    trend: "up" as const,
    change: 9.1,
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "Games Played",
    value: 45678,
    previousValue: 42341,
    format: "number" as const,
    trend: "up" as const,
    change: 7.9,
    icon: Activity,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    title: "Active Locations",
    value: 12,
    previousValue: 11,
    format: "number" as const,
    trend: "up" as const,
    change: 9.1,
    icon: MapPin,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
];

const topPerformingMachines = [
  {
    machineId: "MAC001",
    machineName: "Lucky Stars Deluxe",
    locationName: "Main Casino Floor",
    metric: 45678,
    metricType: "Revenue",
  },
  {
    machineId: "MAC002",
    machineName: "Diamond Rush Pro",
    locationName: "VIP Gaming Area",
    metric: 38945,
    metricType: "Revenue",
  },
  {
    machineId: "MAC003",
    machineName: "Golden Jackpot",
    locationName: "Sports Bar Gaming",
    metric: 32156,
    metricType: "Revenue",
  },
  {
    machineId: "MAC004",
    machineName: "Mega Fortune",
    locationName: "Hotel Gaming Lounge",
    metric: 28934,
    metricType: "Revenue",
  },
  {
    machineId: "MAC005",
    machineName: "Royal Flush",
    locationName: "Poker Room",
    metric: 25678,
    metricType: "Revenue",
  },
];

// Sample location data for the dashboard map
const dashboardLocations = [
  {
    locationId: "LOC001",
    locationName: "Main Casino Floor",
    coordinates: { lat: 40.7128, lng: -74.006 },
    metrics: {
      grossRevenue: 108750,
      totalDrop: 875000,
      totalCancelledCredits: 65000,
      actualHoldPercentage: 8.7,
    },
    onlineMachines: 85,
    totalMachines: 90,
    performance: "excellent" as const,
    sasEnabled: true,
  },
  {
    locationId: "LOC002",
    locationName: "VIP Gaming Area",
    coordinates: { lat: 40.7589, lng: -73.9851 },
    metrics: {
      grossRevenue: 76230,
      totalDrop: 623000,
      totalCancelledCredits: 45000,
      actualHoldPercentage: 8.6,
    },
    onlineMachines: 42,
    totalMachines: 45,
    performance: "good" as const,
    sasEnabled: true,
  },
  {
    locationId: "LOC003",
    locationName: "Sports Bar Gaming",
    coordinates: { lat: 40.7282, lng: -73.7949 },
    metrics: {
      grossRevenue: 45360,
      totalDrop: 396900,
      totalCancelledCredits: 28000,
      actualHoldPercentage: 8.0,
    },
    onlineMachines: 28,
    totalMachines: 32,
    performance: "average" as const,
    sasEnabled: false,
  },
  {
    locationId: "LOC004",
    locationName: "Hotel Gaming Lounge",
    coordinates: { lat: 40.6892, lng: -74.0445 },
    metrics: {
      grossRevenue: 32800,
      totalDrop: 287500,
      totalCancelledCredits: 18000,
      actualHoldPercentage: 7.8,
    },
    onlineMachines: 22,
    totalMachines: 25,
    performance: "average" as const,
    sasEnabled: false,
  },
];

export default function DashboardTab() {
  const {
    isLoading,
    setLoading,
    realTimeMetrics,
    updateRealTimeMetrics,
    selectedDateRange,
  } = useReportsStore();



  const [timePeriod, setTimePeriod] = useState("last7days");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle location selection from map
  const handleLocationSelect = (locationIds: string[]) => {
    console.warn(`Selected locations: ${JSON.stringify(locationIds)}`);
    // Here you could navigate to location details or show more info
    // For now, just handle the first selected location if any
    if (locationIds.length > 0) {
      console.warn(`Primary selected location: ${locationIds[0]}`);
    }
  };

  useEffect(() => {
    // Load dashboard data when component mounts
    setLoading(true);
    setTimeout(() => {
      updateRealTimeMetrics({
        currentPlayers: 1847,
        activeTerminals: 234,
        totalRevenue: 2450000,
        averageHold: 8.7,
        topPerformingMachine: {
          id: "MAC001",
          name: "Lucky Stars Deluxe",
          revenue: 45678,
        },
        alerts: [
          {
            type: "performance",
            message: "Machine MAC003 performance below threshold",
            timestamp: new Date().toISOString(),
            severity: "medium",
            acknowledged: false,
          },
        ],
        lastUpdated: new Date().toISOString(),
      });
      setLoading(false);
    }, 1000);
  }, [setLoading, updateRealTimeMetrics, selectedDateRange]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  const timeFilterButtons = [
    { id: "Today", label: "Today" },
    { id: "last7days", label: "Last 7 Days" },
    { id: "last30days", label: "Last 30 Days" },
    { id: "Custom", label: "Custom Range" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
        {/* Loading Chart */}
        <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
        <div className="w-full lg:w-auto">
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">
            Casino Performance Overview
          </h2>
          <p className="text-sm text-gray-600">
            Real-time analytics and key performance indicators
          </p>
          {realTimeMetrics && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge
                variant="outline"
                className="text-green-600 border-green-600 text-xs"
              >
                Live • {realTimeMetrics.currentPlayers} players
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {realTimeMetrics.activeTerminals} terminals active
              </Badge>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
          {/* Time Period Filters */}
          <div className="flex flex-wrap gap-2">
            {timeFilterButtons.map((filter) => (
              <Button
                key={filter.id}
                variant={timePeriod === filter.id ? "default" : "outline"}
                size="sm"
                onClick={() => setTimePeriod(filter.id)}
                className={`text-xs ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={isLoading}
              >
                {isLoading && timePeriod === filter.id ? (
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1"></span>
                ) : null}
                {filter.label}
              </Button>
            ))}
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {sampleKpiMetrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className={`p-1.5 sm:p-2 rounded-lg ${metric.bgColor}`}>
                    <metric.icon
                      className={`w-5 h-5 sm:w-6 sm:h-6 ${metric.color}`}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {metric.trend === "up" ? (
                      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                    )}
                    <span
                      className={`text-xs sm:text-sm font-medium ${
                        metric.trend === "up"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      +{metric.change}%
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 break-words">
                    {metric.format === "currency"
                      ? `$${metric.value.toLocaleString()}`
                      : metric.value.toLocaleString()}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                    {metric.title}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
        {/* Location Performance Map */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Location Performance Map
            </CardTitle>
            <p className="text-sm text-gray-600">
              Geographic view of casino locations with performance indicators
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64 rounded-lg overflow-hidden border">
              <LocationMap
                locations={dashboardLocations.map((location) => ({
                  id: location.locationId,
                  name: location.locationName,
                  coordinates: location.coordinates,
                  performance:
                    location.performance === "excellent"
                      ? 95
                      : location.performance === "good"
                      ? 80
                      : location.performance === "average"
                      ? 65
                      : 50,
                  revenue: location.metrics.grossRevenue,
                }))}
                onLocationSelect={handleLocationSelect}
                compact={true}
              />
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Machines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Top Performing Machines
            </CardTitle>
            <p className="text-sm text-gray-600">
              Best performing machines across all locations
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformingMachines.slice(0, 5).map((machine, index) => (
                <div
                  key={machine.machineId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-buttonActive text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {machine.machineName}
                      </div>
                      <div className="text-sm text-gray-600">
                        {machine.locationName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      ${machine.metric.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600">
                      {machine.metricType}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {realTimeMetrics?.alerts && realTimeMetrics.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {realTimeMetrics.alerts.map((alert, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">{alert.message}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-yellow-600 border-yellow-600"
                  >
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Updated Info */}
      {realTimeMetrics?.lastUpdated && (
        <div className="text-xs text-gray-600 text-center mt-6">
          Last updated: {new Date(realTimeMetrics.lastUpdated).toLocaleString()}
        </div>
      )}
    </motion.div>
  );
}
