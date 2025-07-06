"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  TrendingUp, 
  Download,
  Calendar, 
  Filter,
  DollarSign,
  Activity,
  ChevronDown,
  ArrowUpDown,
  Wifi,
  WifiOff,
  ShieldCheck,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { KpiCard } from "../charts/KpiCard";
import { PerformanceChart } from "../charts/PerformanceChart";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
import { LocationPerformance, MachinePerformance, GlobalStats, DateRange, AnalyticsChartDataPoint } from '@/lib/types/reports';
import { fetchLocationsAnalytics, fetchMachinesAnalytics, fetchChartsAnalytics, fetchDashboardStats, fetchAvailableLocations } from '@/lib/helpers/locationsTab';

const LocationMap = dynamic(() => import('../common/LocationMap').then(mod => mod.LocationMap), { ssr: false });

export default function LocationsTab() {
  const { selectedLicencee, activeMetricsFilter, setActiveMetricsFilter } = useDashBoardStore();
  const router = useRouter();
  
  // State
  const [viewMode, setViewMode] = useState<"overview" | "location">("overview");
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedLocationName, setSelectedLocationName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date()
  });
  
  // Data
  const [topLocations, setTopLocations] = useState<LocationPerformance[]>([]);
  const [locationMachines, setLocationMachines] = useState<MachinePerformance[]>([]);
  const [chartData, setChartData] = useState<AnalyticsChartDataPoint[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalDrop: 0,
    totalCancelledCredits: 0,
    totalGross: 0,
    totalMachines: 0,
    onlineMachines: 0,
    sasMachines: 0
  });
  const [topMachines, setTopMachines] = useState<MachinePerformance[]>([]);
  const [availableLocations, setAvailableLocations] = useState<{id: string, name: string}[]>([]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!selectedLicencee) {
      console.log('fetchData: selectedLicencee not set, returning early');
      return;
    }
    setIsLoading(true);
    try {
      const dateParam = activeMetricsFilter === "Custom" 
        ? `start=${customDateRange.start.toISOString()}&end=${customDateRange.end.toISOString()}`
        : `period=${activeMetricsFilter}`;

      // Use modular helpers for API calls
      const [locationsData, machinesData, chartData, statsData, availableData] = await Promise.all([
        fetchLocationsAnalytics(selectedLicencee, dateParam),
        fetchMachinesAnalytics(selectedLicencee, dateParam, 5),
        fetchChartsAnalytics(selectedLicencee, dateParam),
        fetchDashboardStats(selectedLicencee, dateParam),
        fetchAvailableLocations(selectedLicencee)
      ]);

      // Debug logs
      console.log('Fetched locations:', locationsData);
      console.log('Fetched machines:', machinesData);
      console.log('Fetched chart data:', chartData);
      console.log('Fetched stats:', statsData);
      console.log('Fetched available locations:', availableData);

      setTopLocations(locationsData.topLocations || []);
      setTopMachines(machinesData.topMachines || []);
      setChartData(chartData.series || []);
      setGlobalStats(statsData.globalStats || {});
      setAvailableLocations(availableData.locations || []);
      
      // Debug logs for rendered arrays
      console.log('Rendering topLocations:', locationsData.topLocations || []);
      console.log('Rendering topMachines:', machinesData.topMachines || []);
    } catch (error) {
      console.error("Error fetching locations data:", error);
    } finally {
      console.log('Setting isLoading to false');
      setIsLoading(false);
    }
  }, [selectedLicencee, activeMetricsFilter, customDateRange]);

  // Fetch location-specific machines
  const fetchLocationMachines = useCallback(async (locationId: string) => {
    setIsLoading(true);
    try {
      const dateFilter = activeMetricsFilter === "Custom" ? customDateRange : activeMetricsFilter;
      const response = await fetch(`/api/analytics/machines?licensee=${selectedLicencee}&location=${locationId}&period=${dateFilter}`);
      const data = await response.json();
      setLocationMachines(data.machines || []);
    } catch (error) {
      console.error("Error fetching location machines:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLicencee, activeMetricsFilter, customDateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedLocation && viewMode === "location") {
      fetchLocationMachines(selectedLocation);
    }
  }, [selectedLocation, viewMode, fetchLocationMachines]);

  // Event handlers
  const handleBackToOverview = () => {
    setViewMode("overview");
    setSelectedLocation(null);
    setSelectedLocationName("");
  };

  const handleLocationSelect = (locationId: string, locationName: string) => {
    setSelectedLocation(locationId);
    setSelectedLocationName(locationName);
    setViewMode("location");
  };

  const handleExport = async (format: "pdf" | "excel") => {
    try {
      const exportData = {
        type: viewMode,
        licensee: selectedLicencee,
        dateRange: activeMetricsFilter === "Custom" ? customDateRange : activeMetricsFilter,
        selectedLocation: selectedLocation,
        data: viewMode === "overview" ? { topLocations, globalStats } : { locationMachines, selectedLocationName }
      };
      
      const response = await fetch(`/api/reports/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exportData)
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `locations-report-${Date.now()}.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  const handleLocationCardClick = (locationId: string) => {
    router.push(`/locations/${locationId}`);
  };

  // UI Components
  const renderKpiCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard title="Total Drop" value={globalStats.totalDrop} format="currency" icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
      <KpiCard title="Cancelled Credits" value={globalStats.totalCancelledCredits} format="currency" icon={<Activity className="h-4 w-4 text-muted-foreground" />} />
      <KpiCard title="Gross Revenue" value={globalStats.totalGross} format="currency" icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
      <KpiCard title="Machine Status" value={`${globalStats.onlineMachines}/${globalStats.totalMachines}`} format="fraction" icon={<Wifi className="h-4 w-4 text-muted-foreground" />} />
    </div>
  );

  const renderTopLocationsTable = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" /> Top 5 Performing Locations</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">Location</th>
              <th className="text-right">Drop</th>
              <th className="text-right">Gross</th>
              <th className="text-center">Trend</th>
            </tr>
          </thead>
          <tbody>
            {topLocations.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-gray-400">No locations data available.</td>
              </tr>
            ) : (
              topLocations.map((location) => (
                <tr key={location.id} onClick={() => handleLocationCardClick(location.id)} className="cursor-pointer hover:bg-gray-100">
                  <td>{location.name}</td>
                  <td className="text-right">${location.totalDrop}</td>
                  <td className="text-right">${location.gross}</td>
                  <td className="flex justify-center items-center gap-2">
                    {getTrendIcon(location.trend)}
                    <span>{location.trendPercentage.toFixed(1)}%</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );

  const renderTopMachinesTable = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Top 5 Performing Machines</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">Machine</th>
              <th className="text-right">Drop</th>
              <th className="text-right">Gross</th>
              <th className="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {(viewMode === 'overview' ? topMachines : locationMachines).length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-gray-400">No machines data available.</td>
              </tr>
            ) : (
              (viewMode === 'overview' ? topMachines : locationMachines).map((machine) => (
                <tr key={machine.id}>
                  <td>{machine.name}</td>
                  <td className="text-right">${machine.totalDrop}</td>
                  <td className="text-right">${machine.gross}</td>
                  <td className="flex justify-center items-center gap-2">
                    {machine.isOnline ? <Wifi className="text-green-500" /> : <WifiOff className="text-red-500" />}
                    {machine.hasSas && <ShieldCheck className="text-blue-500" />}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );

  const renderLocationSelection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Filter className="w-5 h-5" /> Select a Location</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {availableLocations.map((location) => (
            <Button
              key={location.id}
              variant="outline"
              onClick={() => handleLocationSelect(location.id, location.name)}
              className="flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              {location.name}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="text-green-500" />;
      case "down":
        return <TrendingDown className="text-red-500" />;
      default:
        return <Minus className="text-gray-500" />;
    }
  };

  // Render
  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {viewMode === "location" && (
            <Button
              variant="outline"
              onClick={handleBackToOverview}
              className="flex items-center gap-2"
            >
              <ArrowUpDown className="w-4 h-4 rotate-90" />
              Back to Overview
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {viewMode === "overview" ? "Locations Overview" : `${selectedLocationName} Details`}
            </h2>
            <p className="text-gray-600">
              {viewMode === "overview" 
                ? "Top performing locations and machines across all properties"
                : `Machine performance for ${selectedLocationName}`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Filter */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              {activeMetricsFilter === "Custom" ? "Custom Range" : activeMetricsFilter}
              <ChevronDown className="w-4 h-4" />
            </Button>
            
            {showDatePicker && activeMetricsFilter === "Custom" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full mt-2 p-4 bg-white rounded-lg shadow-lg border border-gray-200 z-20"
              >
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <Input
                      type="date"
                      value={customDateRange.start.toISOString().split('T')[0]}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <Input
                      type="date"
                      value={customDateRange.end.toISOString().split('T')[0]}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveMetricsFilter("Custom");
                        setShowDatePicker(false);
                      }}
                    >
                      Apply
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDatePicker(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleExport("pdf")}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("excel")}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Global Stats */}
      {renderKpiCards()}

      {/* Overview Content */}
      <AnimatePresence>
        {viewMode === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <PerformanceChart data={chartData} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderTopLocationsTable()}
              {renderTopMachinesTable()}
            </div>
            <LocationMap locations={topLocations} />
            {renderLocationSelection()}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Location-specific Content */}
      <AnimatePresence>
        {viewMode === "location" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <h3 className="text-xl font-bold">Location: {selectedLocationName}</h3>
            <PerformanceChart data={chartData} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderTopMachinesTable()}
              <Card>
                <CardHeader><CardTitle>Location Details</CardTitle></CardHeader>
                <CardContent>
                  <p>Details about {selectedLocationName} will go here.</p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
