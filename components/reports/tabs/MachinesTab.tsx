"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReportsStore } from "@/lib/store/reportsStore";
import { useAnalyticsDataStore } from "@/lib/store/reportsDataStore";
import { ExportUtils } from "@/lib/utils/exportUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

// Sample machine data with enhanced fields for meeting requirements
const sampleMachines = [
  {
    id: "MAC001",
    gameTitle: "Lucky Stars Deluxe",
    manufacturer: "IGT",
    machineType: "slot",
    locationId: "LOC001",
    locationName: "Main Casino Floor",
    totalHandle: 125000,
    totalWin: 10875,
    actualHold: 8.7,
    theoreticalHold: 8.5,
    gamesPlayed: 12500,
    isActive: true,
    isOnline: true,
    installDate: "2023-01-15",
    avgBet: 10.0,
    averageWager: 10.0,
    coinIn: 125000,
    coinOut: 114125,
    totalCancelledCredits: 500,
    totalHandPaidCancelledCredits: 200,
    totalWonCredits: 10875,
    drop: 5000,
    jackpot: 2500,
    currentCredits: 0,
    gamesWon: 1087,
    lastActivity: "2024-01-20T14:30:00Z",
    isSasEnabled: true,
    softMeterData: {
      coinIn: 125000,
      coinOut: 114125,
      gamesPlayed: 12500,
      jackpot: 2500,
    },
    netWin: 10875,
  },
  {
    id: "MAC002",
    gameTitle: "Diamond Rush Pro",
    manufacturer: "Aristocrat",
    machineType: "slot",
    locationId: "LOC002",
    locationName: "VIP Gaming Area",
    totalHandle: 89000,
    totalWin: 7654,
    actualHold: 8.6,
    theoreticalHold: 8.2,
    gamesPlayed: 8900,
    isActive: true,
    isOnline: false,
    installDate: "2023-02-20",
    avgBet: 10.0,
    averageWager: 10.0,
    coinIn: 89000,
    coinOut: 81346,
    totalCancelledCredits: 300,
    totalHandPaidCancelledCredits: 150,
    totalWonCredits: 7654,
    drop: 3500,
    jackpot: 1800,
    currentCredits: 0,
    gamesWon: 765,
    lastActivity: "2024-01-19T10:15:00Z",
    isSasEnabled: true,
    softMeterData: {
      coinIn: 89000,
      coinOut: 81346,
      gamesPlayed: 8900,
      jackpot: 1800,
    },
    netWin: 7654,
  },
  {
    id: "MAC003",
    gameTitle: "Golden Jackpot",
    manufacturer: "Scientific Games",
    machineType: "roulette",
    locationId: "LOC003",
    locationName: "Sports Bar Gaming",
    totalHandle: 67000,
    totalWin: 5360,
    actualHold: 8.0,
    theoreticalHold: 7.8,
    gamesPlayed: 6700,
    isActive: true,
    isOnline: true,
    installDate: "2023-03-10",
    avgBet: 10.0,
    averageWager: 10.0,
    coinIn: 67000,
    coinOut: 61640,
    totalCancelledCredits: 250,
    totalHandPaidCancelledCredits: 100,
    totalWonCredits: 5360,
    drop: 2800,
    jackpot: 1200,
    currentCredits: 0,
    gamesWon: 536,
    lastActivity: "2024-01-20T13:45:00Z",
    isSasEnabled: false,
    softMeterData: null,
    netWin: 5360,
  },
  {
    id: "MAC004",
    gameTitle: "Mega Fortune",
    manufacturer: "NetEnt",
    machineType: "slot",
    locationId: "LOC001",
    locationName: "Main Casino Floor",
    totalHandle: 45000,
    totalWin: 3600,
    actualHold: 8.0,
    theoreticalHold: 8.3,
    gamesPlayed: 4500,
    isActive: false,
    isOnline: false,
    installDate: "2023-04-05",
    avgBet: 10.0,
    averageWager: 10.0,
    coinIn: 45000,
    coinOut: 41400,
    totalCancelledCredits: 200,
    totalHandPaidCancelledCredits: 80,
    totalWonCredits: 3600,
    drop: 2000,
    jackpot: 800,
    currentCredits: 0,
    gamesWon: 360,
    lastActivity: "2024-01-18T16:20:00Z",
    isSasEnabled: false,
    softMeterData: null,
    netWin: 3600,
  },
];

const locations = [
  { id: "LOC001", name: "Main Casino Floor" },
  { id: "LOC002", name: "VIP Gaming Area" },
  { id: "LOC003", name: "Sports Bar Gaming" },
  { id: "LOC004", name: "Hotel Gaming Lounge" },
];

const machineTypes = ["slot", "roulette", "blackjack", "poker"];

export default function MachinesTab() {
  const {
    isLoading,
    setLoading,
    selectedDateRange,
    setIsMachineComparisonModalOpen,
  } = useReportsStore();
  const { setMachineComparisons } = useAnalyticsDataStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [machineTypeFilter, setMachineTypeFilter] = useState("all");
  const [showOfflineOnly] = useState(false);
  const [showSasOnly, setShowSasOnly] = useState(false);
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, [setLoading, selectedDateRange]);

  const handleMachineSelect = (machineId: string) => {
    setSelectedMachineIds((prev) =>
      prev.includes(machineId)
        ? prev.filter((id) => id !== machineId)
        : [...prev, machineId]
    );
  };

  const handleExportMeters = async () => {
    try {
      const metersData = {
        title: "Meters Export Report",
        subtitle: `Raw machine meter data - ${
          selectedDateRange?.start?.toDateString() || "All time"
        }`,
        headers: [
          "Machine ID",
          "Game Title",
          "Location",
          "Coin In",
          "Coin Out",
          "Jackpot",
          "Games Played",
          "Drop",
          "Total Cancelled Credits",
          "Net Win",
          "Last Activity",
          "Status",
        ],
        data: filteredMachines.map((machine) => [
          machine.id,
          machine.gameTitle,
          machine.locationName,
          machine.coinIn.toLocaleString(),
          machine.coinOut.toLocaleString(),
          machine.jackpot.toLocaleString(),
          machine.gamesPlayed.toLocaleString(),
          machine.drop.toLocaleString(),
          machine.totalCancelledCredits.toLocaleString(),
          machine.netWin.toLocaleString(),
          new Date(machine.lastActivity).toLocaleString(),
          machine.isOnline ? "Online" : "Offline",
        ]),
        summary: [
          {
            label: "Total Machines",
            value: filteredMachines.length.toString(),
          },
          {
            label: "Online Machines",
            value: filteredMachines.filter((m) => m.isOnline).length.toString(),
          },
          {
            label: "Offline Machines",
            value: filteredMachines
              .filter((m) => !m.isOnline)
              .length.toString(),
          },
          {
            label: "Total Coin In",
            value: `$${filteredMachines
              .reduce((sum, m) => sum + m.coinIn, 0)
              .toLocaleString()}`,
          },
          {
            label: "Total Net Win",
            value: `$${filteredMachines
              .reduce((sum, m) => sum + m.netWin, 0)
              .toLocaleString()}`,
          },
        ],
        metadata: {
          generatedBy: "Evolution1 CMS - Meters Export",
          generatedAt: new Date().toISOString(),
          dateRange: selectedDateRange
            ? `${selectedDateRange.start?.toDateString()} - ${selectedDateRange.end?.toDateString()}`
            : "All time",
        },
      };

      await ExportUtils.exportData(metersData, "csv");
      toast.success("Meters data exported successfully");
    } catch (error) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("Export failed:", error);
      }
      toast.error("Failed to export meters data");
    }
  };

  const handleCompareSelected = () => {
    if (selectedMachineIds.length < 2) {
      toast.error("Please select at least 2 machines to compare");
      return;
    }

    const selectedMachines = sampleMachines.filter((machine) =>
      selectedMachineIds.includes(machine.id)
    );

    setMachineComparisons(selectedMachines);
    setIsMachineComparisonModalOpen(true);
    toast.success(`Comparing ${selectedMachineIds.length} selected machines`);
  };

  // Remove unused variable

  const filteredMachines = useMemo(() => {
    return sampleMachines.filter((machine) => {
      const matchesSearch =
        machine.gameTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesLocation =
        locationFilter === "all" || machine.locationId === locationFilter;

      const matchesType =
        machineTypeFilter === "all" ||
        machine.machineType === machineTypeFilter;

      const matchesOfflineFilter = !showOfflineOnly || !machine.isOnline;

      const matchesSasFilter = !showSasOnly || machine.isSasEnabled;

      return (
        matchesSearch &&
        matchesLocation &&
        matchesType &&
        matchesOfflineFilter &&
        matchesSasFilter
      );
    });
  }, [
    searchTerm,
    locationFilter,
    machineTypeFilter,
    showOfflineOnly,
    showSasOnly,
  ]);

  const offlineMachines = useMemo(() => {
    return sampleMachines.filter((machine) => !machine.isOnline);
  }, []);

  const comparisonData = useMemo(() => {
    return sampleMachines.map((machine) => ({
      ...machine,
      holdDifference: machine.actualHold - machine.theoreticalHold,
      performanceRating:
        machine.actualHold >= machine.theoreticalHold
          ? "Above Expected"
          : "Below Expected",
    }));
  }, []);

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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="meters-export">Meters Export</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="offline">Offline Report</TabsTrigger>
          <TabsTrigger value="location-evaluation">
            Location Evaluation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Existing overview content */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search machines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={machineTypeFilter}
              onValueChange={setMachineTypeFilter}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {machineTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Machine Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  $
                  {filteredMachines
                    .reduce((sum, m) => sum + m.netWin, 0)
                    .toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  Total Net Win (Gross)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  $
                  {filteredMachines
                    .reduce((sum, m) => sum + m.drop, 0)
                    .toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total Drop</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-black">
                  $
                  {filteredMachines
                    .reduce((sum, m) => sum + m.totalCancelledCredits, 0)
                    .toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  Total Cancelled Credits
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredMachines.filter((m) => m.isOnline).length}/
                  {filteredMachines.length}
                </div>
                <p className="text-sm text-muted-foreground">Online Machines</p>
              </CardContent>
            </Card>
          </div>

          {/* Machine List */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Machine Performance</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCompareSelected}
                    disabled={selectedMachineIds.length < 2}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Compare Selected ({selectedMachineIds.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportMeters}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-left p-3">
                          <Checkbox
                            checked={
                              selectedMachineIds.length ===
                              filteredMachines.length
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedMachineIds(
                                  filteredMachines.map((m) => m.id)
                                );
                              } else {
                                setSelectedMachineIds([]);
                              }
                            }}
                          />
                        </th>
                        <th className="text-left p-3 font-medium">Machine</th>
                        <th className="text-left p-3 font-medium">Location</th>
                        <th className="text-left p-3 font-medium">Type</th>
                        <th className="text-left p-3 font-medium">Net Win</th>
                        <th className="text-left p-3 font-medium">Drop</th>
                        <th className="text-left p-3 font-medium">Hold %</th>
                        <th className="text-left p-3 font-medium">Games</th>
                        <th className="text-left p-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMachines.map((machine) => (
                        <tr
                          key={machine.id}
                          className="border-b hover:bg-muted/30"
                        >
                          <td className="p-3">
                            <Checkbox
                              checked={selectedMachineIds.includes(machine.id)}
                              onCheckedChange={() =>
                                handleMachineSelect(machine.id)
                              }
                            />
                          </td>
                          <td className="p-3">
                            <div>
                              <div className="font-medium">
                                {machine.gameTitle}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {machine.manufacturer} • {machine.id}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            {machine.locationName}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline">
                              {machine.machineType}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm font-medium text-green-600">
                            ${machine.netWin.toLocaleString()}
                          </td>
                          <td className="p-3 text-sm font-medium text-yellow-600">
                            ${machine.drop.toLocaleString()}
                          </td>
                          <td className="p-3 text-sm">
                            {machine.actualHold.toFixed(1)}%
                          </td>
                          <td className="p-3 text-sm">
                            {machine.gamesPlayed.toLocaleString()}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                machine.isOnline ? "default" : "destructive"
                              }
                            >
                              {machine.isOnline ? "Online" : "Offline"}
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

        <TabsContent value="meters-export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meters Export Report</CardTitle>
              <CardDescription>
                Export raw machine meter data including Coin In, Coin Out,
                Jackpot, and Games Played
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <Select
                    value={locationFilter}
                    onValueChange={setLocationFilter}
                  >
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Select Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleExportMeters}
                    className="w-full md:w-auto"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Meters Data
                  </Button>
                </div>

                {/* Preview of data to be exported */}
                <div className="mt-4">
                  <h4 className="font-medium mb-2">
                    Preview ({filteredMachines.length} machines)
                  </h4>
                  <div className="rounded-md border max-h-96 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/50">
                        <tr>
                          <th className="text-left p-2">Machine</th>
                          <th className="text-left p-2">Coin In</th>
                          <th className="text-left p-2">Coin Out</th>
                          <th className="text-left p-2">Jackpot</th>
                          <th className="text-left p-2">Games Played</th>
                          <th className="text-left p-2">Drop</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMachines.slice(0, 10).map((machine) => (
                          <tr key={machine.id} className="border-b">
                            <td className="p-2">{machine.gameTitle}</td>
                            <td className="p-2">
                              ${machine.coinIn.toLocaleString()}
                            </td>
                            <td className="p-2">
                              ${machine.coinOut.toLocaleString()}
                            </td>
                            <td className="p-2">
                              ${machine.jackpot.toLocaleString()}
                            </td>
                            <td className="p-2">
                              {machine.gamesPlayed.toLocaleString()}
                            </td>
                            <td className="p-2">
                              ${machine.drop.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredMachines.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Showing first 10 of {filteredMachines.length} machines
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Machine Performance Comparison</CardTitle>
              <CardDescription>
                Compare actual machine performance against theoretical
                expectations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Machine</th>
                        <th className="text-left p-3 font-medium">
                          Theoretical Hold
                        </th>
                        <th className="text-left p-3 font-medium">
                          Actual Hold
                        </th>
                        <th className="text-left p-3 font-medium">
                          Difference
                        </th>
                        <th className="text-left p-3 font-medium">
                          Performance
                        </th>
                        <th className="text-left p-3 font-medium">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonData.map((machine) => (
                        <tr
                          key={machine.id}
                          className="border-b hover:bg-muted/30"
                        >
                          <td className="p-3">
                            <div>
                              <div className="font-medium">
                                {machine.gameTitle}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {machine.id}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            {machine.theoreticalHold.toFixed(1)}%
                          </td>
                          <td className="p-3 text-sm">
                            {machine.actualHold.toFixed(1)}%
                          </td>
                          <td className="p-3">
                            <span
                              className={`text-sm font-medium ${
                                machine.holdDifference >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {machine.holdDifference >= 0 ? "+" : ""}
                              {machine.holdDifference.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                machine.holdDifference >= 0
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {machine.performanceRating}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm font-medium text-green-600">
                            ${machine.netWin.toLocaleString()}
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

        <TabsContent value="offline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Machines Offline Report</CardTitle>
              <CardDescription>
                Monitor offline machines and edit machine values (authorized
                users only)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Badge variant="destructive" className="mb-2">
                  {offlineMachines.length} Machines Offline
                </Badge>
              </div>

              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Machine</th>
                        <th className="text-left p-3 font-medium">Location</th>
                        <th className="text-left p-3 font-medium">
                          Last Activity
                        </th>
                        <th className="text-left p-3 font-medium">
                          Offline Duration
                        </th>
                        <th className="text-left p-3 font-medium">
                          Current Values
                        </th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offlineMachines.map((machine) => {
                        const offlineDuration = Math.floor(
                          (new Date().getTime() -
                            new Date(machine.lastActivity).getTime()) /
                            (1000 * 60 * 60)
                        );
                        return (
                          <tr
                            key={machine.id}
                            className="border-b hover:bg-muted/30"
                          >
                            <td className="p-3">
                              <div>
                                <div className="font-medium">
                                  {machine.gameTitle}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {machine.id}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-sm">
                              {machine.locationName}
                            </td>
                            <td className="p-3 text-sm">
                              {new Date(machine.lastActivity).toLocaleString()}
                            </td>
                            <td className="p-3">
                              <Badge variant="outline">
                                {offlineDuration}h ago
                              </Badge>
                            </td>
                            <td className="p-3 text-sm">
                              <div className="space-y-1">
                                <div>Credits: {machine.currentCredits}</div>
                                <div>
                                  Games: {machine.gamesPlayed.toLocaleString()}
                                </div>
                                <div>
                                  Drop: ${machine.drop.toLocaleString()}
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <Button variant="outline" size="sm">
                                Edit Values
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location-evaluation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Location Evaluation Report</CardTitle>
              <CardDescription>
                Track SAS machine performance with immediate soft meter data
                access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    id="sas-only"
                    checked={showSasOnly}
                    onCheckedChange={(checked) =>
                      setShowSasOnly(checked === true)
                    }
                  />
                  <label htmlFor="sas-only" className="text-sm font-medium">
                    Show SAS-enabled machines only
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {sampleMachines.filter((m) => m.isSasEnabled).length}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      SAS-Enabled Machines
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {
                        sampleMachines.filter(
                          (m) => m.isSasEnabled && m.isOnline
                        ).length
                      }
                    </div>
                    <p className="text-sm text-muted-foreground">SAS Online</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-amber-600">
                      {
                        sampleMachines.filter(
                          (m) => m.isSasEnabled && !m.isOnline
                        ).length
                      }
                    </div>
                    <p className="text-sm text-muted-foreground">SAS Offline</p>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Machine</th>
                        <th className="text-left p-3 font-medium">Location</th>
                        <th className="text-left p-3 font-medium">
                          SAS Status
                        </th>
                        <th className="text-left p-3 font-medium">
                          Soft Meter Data
                        </th>
                        <th className="text-left p-3 font-medium">
                          Real-time Metrics
                        </th>
                        <th className="text-left p-3 font-medium">
                          Performance
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showSasOnly
                        ? sampleMachines.filter((m) => m.isSasEnabled)
                        : sampleMachines
                      ).map((machine) => (
                        <tr
                          key={machine.id}
                          className="border-b hover:bg-muted/30"
                        >
                          <td className="p-3">
                            <div>
                              <div className="font-medium">
                                {machine.gameTitle}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {machine.id}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            {machine.locationName}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                machine.isSasEnabled ? "default" : "secondary"
                              }
                            >
                              {machine.isSasEnabled ? "SAS Enabled" : "Non-SAS"}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">
                            {machine.softMeterData ? (
                              <div className="space-y-1">
                                <div>
                                  Coin In: $
                                  {machine.softMeterData.coinIn.toLocaleString()}
                                </div>
                                <div>
                                  Games:{" "}
                                  {machine.softMeterData.gamesPlayed.toLocaleString()}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                Not Available
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-sm">
                            <div className="space-y-1">
                              <div>Hold: {machine.actualHold.toFixed(1)}%</div>
                              <div>Avg Bet: ${machine.avgBet.toFixed(2)}</div>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                machine.actualHold >= machine.theoreticalHold
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {machine.actualHold >= machine.theoreticalHold
                                ? "Above Target"
                                : "Below Target"}
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
      </Tabs>
    </div>
  );
}
