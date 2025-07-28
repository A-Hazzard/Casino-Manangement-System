"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import axios from "axios";
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
import { BarChart3, Download, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReportsStore } from "@/lib/store/reportsStore";
import { useAnalyticsDataStore } from "@/lib/store/reportsDataStore";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { exportData } from "@/lib/utils/exportUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import type { 
  MachineData, 
  MachinesApiResponse, 
  MachineStats, 
  MachineStatsApiResponse 
} from "@/shared/types/machines";

export default function MachinesTab() {
  // Separate states for different purposes (streaming approach)
  const [overviewMachines, setOverviewMachines] = useState<MachineData[]>([]); // Paginated for overview
  const [allMachines, setAllMachines] = useState<MachineData[]>([]); // All machines for performance analysis
  const [offlineMachines, setOfflineMachines] = useState<MachineData[]>([]); // Offline machines only
  const [machineStats, setMachineStats] = useState<MachineStats | null>(null); // Counts for dashboard cards
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  
  // Loading states for each section
  const [statsLoading, setStatsLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination for overview tab
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Pagination for performance analysis tab
  const [analysisPagination, setAnalysisPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Pagination for offline machines tab
  const [offlinePagination, setOfflinePagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Store and filter states
  const {
    selectedDateRange,
    setIsMachineComparisonModalOpen,
  } = useReportsStore();
  const { setMachineComparisons } = useAnalyticsDataStore();
  const { selectedLicencee, activeMetricsFilter, customDateRange } = useDashBoardStore();
  
  // Search states for different tabs
  const [searchTerm, setSearchTerm] = useState("");
  const [analysisSearchTerm, setAnalysisSearchTerm] = useState("");
  const [offlineSearchTerm, setOfflineSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [showOfflineOnly, setShowOfflineOnly] = useState(false);
  const [showSasOnly, setShowSasOnly] = useState(false);
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  // Build API parameters helper
  const buildApiParams = useCallback((type: string, page?: number) => {
    const params: Record<string, string> = {
      type,
    };

    if (page) {
      params.page = page.toString();
      params.limit = "10";
    }

    if (selectedLicencee && selectedLicencee !== "all") {
      params.licencee = selectedLicencee;
    }

    if (activeMetricsFilter === "Custom" && customDateRange?.startDate && customDateRange?.endDate) {
      params.startDate = customDateRange.startDate.toISOString();
      params.endDate = customDateRange.endDate.toISOString();
    } else if (activeMetricsFilter !== "Custom") {
      params.timePeriod = activeMetricsFilter;
    }

    return params;
  }, [selectedLicencee, activeMetricsFilter, customDateRange]);

  // Fetch locations data
  const fetchLocationsData = useCallback(async () => {
    try {
      const response = await axios.get("/api/gaming-locations");
      const locationsData = response.data.map((location: any) => ({
        id: location._id,
        name: location.name
      }));
      setLocations(locationsData);
      console.log("🔍 Fetched locations:", locationsData.length);
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    }
  }, []);

  // Fetch machine statistics (loads first)
  const fetchMachineStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const params = buildApiParams('stats');
      console.log("🔍 Fetching machine stats with params:", params);

      const response = await axios.get<MachineStatsApiResponse>("/api/reports/machines", { params });
      setMachineStats(response.data);
      console.log("🔍 Machine stats:", response.data);
    } catch (error) {
      console.error("Failed to fetch machine stats:", error);
      setError("Failed to load machine statistics");
      toast.error("Failed to load machine statistics");
    } finally {
      setStatsLoading(false);
    }
  }, [buildApiParams]);

  // Fetch overview machines (paginated)
  const fetchOverviewMachines = useCallback(async (page: number = 1) => {
    try {
      setOverviewLoading(true);
      setError(null);

      const params = buildApiParams('overview', page);
      console.log("🔍 Fetching overview machines with params:", params);

      const response = await axios.get<MachinesApiResponse>("/api/reports/machines", { params });
      const { data: machinesData, pagination: paginationData } = response.data;

      setOverviewMachines(machinesData);
      setPagination(paginationData);
      console.log("🔍 Overview machines:", machinesData.length, "Pagination:", paginationData);
    } catch (error) {
      console.error("Failed to fetch overview machines:", error);
      setError("Failed to load overview machines");
      toast.error("Failed to load overview machines");
    } finally {
      setOverviewLoading(false);
    }
  }, [buildApiParams]);

  // Fetch all machines for performance analysis (loads on tab switch)
  const fetchAllMachines = useCallback(async () => {
    try {
      setAnalysisLoading(true);
      const params = buildApiParams('all');
      console.log("🔍 Fetching all machines for analysis with params:", params);

      const response = await axios.get<MachinesApiResponse>("/api/reports/machines", { params });
      const { data: allMachinesData } = response.data;

      setAllMachines(allMachinesData);
      console.log("🔍 All machines for analysis:", allMachinesData.length);
    } catch (error) {
      console.error("Failed to fetch all machines:", error);
      toast.error("Failed to load performance analysis data");
    } finally {
      setAnalysisLoading(false);
    }
  }, [buildApiParams]);

  // Fetch offline machines (loads on tab switch)
  const fetchOfflineMachines = useCallback(async () => {
    try {
      setOfflineLoading(true);
      const params = buildApiParams('offline');
      console.log("🔍 Fetching offline machines with params:", params);

      const response = await axios.get<MachinesApiResponse>("/api/reports/machines", { params });
      const { data: offlineMachinesData } = response.data;

      setOfflineMachines(offlineMachinesData);
      console.log("🔍 Offline machines:", offlineMachinesData.length);
    } catch (error) {
      console.error("Failed to fetch offline machines:", error);
      toast.error("Failed to load offline machines data");
    } finally {
      setOfflineLoading(false);
    }
  }, [buildApiParams]);

  // Backend search fallback when frontend search finds no results
  const performBackendSearch = useCallback(async (searchTerm: string, type: string = 'overview') => {
    try {
      const params = buildApiParams(type, 1);
      params.search = searchTerm; // Add search parameter for backend search
      console.log("🔍 Performing backend search with params:", params);

      const response = await axios.get<MachinesApiResponse>("/api/reports/machines", { params });
      const { data: machinesData, pagination: paginationData } = response.data;

      if (type === 'overview') {
        setOverviewMachines(machinesData);
        setPagination(paginationData);
      } else if (type === 'all') {
        setAllMachines(machinesData);
        setAnalysisPagination(prev => ({
          ...prev,
          totalCount: paginationData.totalCount,
          totalPages: paginationData.totalPages,
          hasNextPage: paginationData.hasNextPage,
          hasPrevPage: paginationData.hasPrevPage,
        }));
      } else if (type === 'offline') {
        setOfflineMachines(machinesData);
        setOfflinePagination(prev => ({
          ...prev,
          totalCount: paginationData.totalCount,
          totalPages: paginationData.totalPages,
          hasNextPage: paginationData.hasNextPage,
          hasPrevPage: paginationData.hasPrevPage,
        }));
      }
      console.log("🔍 Backend search results:", machinesData.length);
    } catch (error) {
      console.error("Failed to perform backend search:", error);
      toast.error("Backend search failed");
    }
  }, [buildApiParams]);

  // Handle search with backend fallback for overview tab
  const handleSearchChange = useCallback(async (value: string) => {
    setSearchTerm(value);
    
    // If search term is cleared, reset to original data
    if (!value.trim()) {
      fetchOverviewMachines(1);
      return;
    }
    
    // Perform frontend search first
    const frontendFiltered = overviewMachines.filter((machine) => {
      const matchesSearch =
        (machine.machineName || "").toLowerCase().includes(value.toLowerCase()) ||
        (machine.gameTitle || "").toLowerCase().includes(value.toLowerCase()) ||
        (machine.manufacturer || "").toLowerCase().includes(value.toLowerCase());
      return matchesSearch;
    });

    // If frontend search finds results, use them
    if (frontendFiltered.length > 0) {
      console.log("🔍 Frontend search found results:", frontendFiltered.length);
      return;
    }

    // If frontend search finds no results and search term is long enough, try backend search
    if (value.length > 2) {
      console.log("🔍 No frontend results, trying backend search");
      await performBackendSearch(value, 'overview');
    }
  }, [overviewMachines, fetchOverviewMachines, performBackendSearch]);

  // Handle search for performance analysis tab
  const handleAnalysisSearchChange = useCallback(async (value: string) => {
    setAnalysisSearchTerm(value);
    
    // If search term is cleared, reset to original data
    if (!value.trim()) {
      fetchAllMachines();
      return;
    }
    
    // Perform frontend search first
    const frontendFiltered = allMachines.filter((machine) => {
      const matchesSearch =
        (machine.machineName || "").toLowerCase().includes(value.toLowerCase()) ||
        (machine.gameTitle || "").toLowerCase().includes(value.toLowerCase()) ||
        (machine.manufacturer || "").toLowerCase().includes(value.toLowerCase());
      return matchesSearch;
    });

    // If frontend search finds results, use them
    if (frontendFiltered.length > 0) {
      console.log("🔍 Analysis frontend search found results:", frontendFiltered.length);
      return;
    }

    // If frontend search finds no results and search term is long enough, try backend search
    if (value.length > 2) {
      console.log("🔍 No analysis frontend results, trying backend search");
      await performBackendSearch(value, 'all');
    }
  }, [allMachines, fetchAllMachines, performBackendSearch]);

  // Handle search for offline machines tab
  const handleOfflineSearchChange = useCallback(async (value: string) => {
    setOfflineSearchTerm(value);
    
    // If search term is cleared, reset to original data
    if (!value.trim()) {
      fetchOfflineMachines();
      return;
    }
    
    // Perform frontend search first
    const frontendFiltered = offlineMachines.filter((machine) => {
      const matchesSearch =
        (machine.machineName || "").toLowerCase().includes(value.toLowerCase()) ||
        (machine.gameTitle || "").toLowerCase().includes(value.toLowerCase()) ||
        (machine.manufacturer || "").toLowerCase().includes(value.toLowerCase());
      return matchesSearch;
    });

    // If frontend search finds results, use them
    if (frontendFiltered.length > 0) {
      console.log("🔍 Offline frontend search found results:", frontendFiltered.length);
      return;
    }

    // If frontend search finds no results and search term is long enough, try backend search
    if (value.length > 2) {
      console.log("🔍 No offline frontend results, trying backend search");
      await performBackendSearch(value, 'offline');
    }
  }, [offlineMachines, fetchOfflineMachines, performBackendSearch]);

  // Handle pagination for overview tab
  const handlePageChange = (newPage: number) => {
    fetchOverviewMachines(newPage);
  };

  // Handle pagination for analysis tab
  const handleAnalysisPageChange = (newPage: number) => {
    setAnalysisPagination(prev => ({
      ...prev,
      page: newPage,
      hasNextPage: newPage < prev.totalPages,
      hasPrevPage: newPage > 1,
    }));
  };

  // Handle pagination for offline tab
  const handleOfflinePageChange = (newPage: number) => {
    setOfflinePagination(prev => ({
      ...prev,
      page: newPage,
      hasNextPage: newPage < prev.totalPages,
      hasPrevPage: newPage > 1,
    }));
  };

  const handleMachineSelect = (machineId: string) => {
    setSelectedMachineIds((prev) =>
      prev.includes(machineId)
        ? prev.filter((id) => id !== machineId)
        : [...prev, machineId]
    );
  };

  const handleExportMeters = async () => {
    try {
      const machinesToExport = activeTab === 'overview' ? filteredMachines : 
                              activeTab === 'comparison' ? allMachines : 
                              offlineMachines;

      const metersData = {
        title: "Machines Export Report",
        subtitle: `Machine performance data - ${
          activeMetricsFilter === "Custom" && customDateRange?.startDate && customDateRange?.endDate
            ? `${customDateRange.startDate.toDateString()} - ${customDateRange.endDate.toDateString()}`
            : activeMetricsFilter
        }`,
        headers: [
          "Machine ID",
          "Machine Name",
          "Game Title",
          "Location",
          "Manufacturer",
          "Type",
          "Net Win",
          "Drop",
          "Cancelled Credits",
          "Jackpot",
          "Games Played",
          "Hold %",
          "Status",
          "SAS Enabled",
        ],
        data: machinesToExport.map((machine) => [
          machine.machineId,
          machine.machineName,
          machine.gameTitle,
          machine.locationName,
          machine.manufacturer,
          machine.machineType,
          machine.netWin.toLocaleString(),
          machine.drop.toLocaleString(),
          machine.totalCancelledCredits.toLocaleString(),
          machine.jackpot.toLocaleString(),
          machine.gamesPlayed.toLocaleString(),
          machine.actualHold?.toFixed(1) + "%" || "0.0%",
          machine.isOnline ? "Online" : "Offline",
          machine.isSasEnabled ? "Yes" : "No",
        ]),
        summary: [
          {
            label: "Total Machines",
            value: machinesToExport.length.toString(),
          },
          {
            label: "Online Machines",
            value: machinesToExport.filter((m) => m.isOnline).length.toString(),
          },
          {
            label: "Offline Machines",
            value: machinesToExport.filter((m) => !m.isOnline).length.toString(),
          },
          {
            label: "Total Net Win",
            value: `$${machinesToExport
              .reduce((sum, m) => sum + m.netWin, 0)
              .toLocaleString()}`,
          },
          {
            label: "Total Drop",
            value: `$${machinesToExport
              .reduce((sum, m) => sum + m.drop, 0)
              .toLocaleString()}`,
          },
        ],
        metadata: {
          generatedBy: "Evolution1 CMS - Machines Export",
          generatedAt: new Date().toISOString(),
          dateRange: activeMetricsFilter === "Custom" && customDateRange?.startDate && customDateRange?.endDate
            ? `${customDateRange.startDate.toDateString()} - ${customDateRange.endDate.toDateString()}`
            : activeMetricsFilter,
        },
      };

      await exportData(metersData, "csv");
      toast.success("Machines data exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export machines data");
    }
  };

  const handleCompareSelected = () => {
    if (selectedMachineIds.length < 2) {
      toast.error("Please select at least 2 machines to compare");
      return;
    }

    const selectedMachines = filteredMachines.filter((machine) =>
      selectedMachineIds.includes(machine.machineId)
    );

    // Transform MachineData to GamingMachine format
    const gamingMachines = selectedMachines.map((machine) => ({
      id: machine.machineId,
      gameTitle: machine.gameTitle,
      manufacturer: machine.manufacturer,
      locationId: machine.locationId,
      locationName: machine.locationName,
      totalHandle: machine.coinIn,
      totalWin: machine.netWin,
      actualHold: machine.actualHold || 0,
      gamesPlayed: machine.gamesPlayed,
      isActive: machine.isOnline,
      installDate: machine.installDate || "",
      lastActivity: machine.lastActivity,
      avgBet: machine.avgBet,
      averageWager: machine.averageWager,
      coinIn: machine.coinIn,
      coinOut: machine.coinOut,
      totalCancelledCredits: machine.totalCancelledCredits,
      totalHandPaidCancelledCredits: machine.totalHandPaidCancelledCredits || 0,
      totalWonCredits: machine.totalWonCredits || 0,
      drop: machine.drop,
      jackpot: machine.jackpot,
      currentCredits: machine.currentCredits || 0,
      gamesWon: machine.gamesWon || 0,
    }));

    setMachineComparisons(gamingMachines);
    setIsMachineComparisonModalOpen(true);
    toast.success(`Comparing ${selectedMachineIds.length} selected machines`);
  };

  // Filter machines based on search and filters (for overview tab)
  const filteredMachines = useMemo(() => {
    console.log("🔍 Filtering overview machines:", overviewMachines.length);
    console.log("🔍 Filter criteria:", { searchTerm, locationFilter, showOfflineOnly, showSasOnly });
    
    const filtered = overviewMachines.filter((machine) => {
      const matchesSearch =
        (machine.machineName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (machine.gameTitle || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (machine.manufacturer || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesLocation =
        locationFilter === "all" || machine.locationId === locationFilter;

      const matchesOnlineStatus =
        !showOfflineOnly || !machine.isOnline;

      const matchesSasStatus =
        !showSasOnly || machine.isSasEnabled;

      return matchesSearch && matchesLocation && matchesOnlineStatus && matchesSasStatus;
    }).map(machine => ({
      ...machine,
      // Calculate derived fields on frontend for better performance
      actualHold: machine.coinIn > 0 ? ((machine.coinIn - machine.coinOut) / machine.coinIn) * 100 : 0,
      totalWonCredits: machine.coinOut || 0,
      currentCredits: 0, // Default value since not provided by API
      gamesWon: 0, // Default value since not provided by API
    }));
    
    console.log("🔍 Filtered overview machines:", filtered.length);
    return filtered;
  }, [overviewMachines, searchTerm, locationFilter, showOfflineOnly, showSasOnly]);

  // Filter analysis data based on search
  const filteredAnalysisData = useMemo(() => {
    const filtered = allMachines.filter((machine) => {
      const matchesSearch =
        (machine.machineName || "").toLowerCase().includes(analysisSearchTerm.toLowerCase()) ||
        (machine.gameTitle || "").toLowerCase().includes(analysisSearchTerm.toLowerCase()) ||
        (machine.manufacturer || "").toLowerCase().includes(analysisSearchTerm.toLowerCase());

      const matchesLocation =
        locationFilter === "all" || machine.locationId === locationFilter;

      return matchesSearch && matchesLocation;
    });

    return filtered;
  }, [allMachines, analysisSearchTerm, locationFilter]);

  // Filter offline data based on search
  const filteredOfflineData = useMemo(() => {
    const filtered = offlineMachines.filter((machine) => {
      const matchesSearch =
        (machine.machineName || "").toLowerCase().includes(offlineSearchTerm.toLowerCase()) ||
        (machine.gameTitle || "").toLowerCase().includes(offlineSearchTerm.toLowerCase()) ||
        (machine.manufacturer || "").toLowerCase().includes(offlineSearchTerm.toLowerCase());

      const matchesLocation =
        locationFilter === "all" || machine.locationId === locationFilter;

      return matchesSearch && matchesLocation;
    });

    return filtered;
  }, [offlineMachines, offlineSearchTerm, locationFilter]);

  // Load data on component mount (streaming approach)
  useEffect(() => {
    const loadDataStreaming = async () => {
      // 1. Load stats first (fastest)
      await fetchMachineStats();
      
      // 2. Load overview data (paginated, fast)
      await fetchOverviewMachines(1);
      
      // 3. Load locations data
      await fetchLocationsData();
    };

    loadDataStreaming();
  }, [fetchMachineStats, fetchOverviewMachines, fetchLocationsData]);

  // Handle tab change with lazy loading
  const handleTabChange = useCallback(async (tab: string) => {
    setActiveTab(tab);
    
    if (tab === 'comparison' && allMachines.length === 0) {
      await fetchAllMachines();
    } else if (tab === 'offline' && offlineMachines.length === 0) {
      await fetchOfflineMachines();
    }
  }, [allMachines.length, offlineMachines.length, fetchAllMachines, fetchOfflineMachines]);

  // Calculate overview statistics from filtered machines
  const overviewStats = useMemo(() => {
    const totalMachines = filteredMachines.length;
    const onlineMachines = filteredMachines.filter((m) => m.isOnline).length;
    const totalNetWin = filteredMachines.reduce((sum, m) => sum + (m.netWin || 0), 0);
    const totalDrop = filteredMachines.reduce((sum, m) => sum + (m.drop || 0), 0);
    const totalCancelledCredits = filteredMachines.reduce((sum, m) => sum + (m.totalCancelledCredits || 0), 0);
    const totalJackpot = filteredMachines.reduce((sum, m) => sum + (m.jackpot || 0), 0);
    const averageHold = totalMachines > 0 
      ? filteredMachines.reduce((sum, m) => sum + (m.actualHold || 0), 0) / totalMachines 
      : 0;

    return {
      totalMachines,
      onlineMachines,
      offlineMachines: totalMachines - onlineMachines,
      totalNetWin,
      totalDrop,
      totalCancelledCredits,
      totalJackpot,
      averageHoldPercentage: averageHold,
    };
  }, [filteredMachines]);

  // Helper functions for performance analysis
  const getPerformanceRating = (holdDifference: number) => {
    if (holdDifference >= 1) return "excellent";
    if (holdDifference >= 0) return "good";
    if (holdDifference >= -1) return "average";
    return "poor";
  };

  const getPerformanceColor = (holdDifference: number) => {
    if (holdDifference >= 1) return "bg-green-100 text-green-800 border-green-200";
    if (holdDifference >= 0) return "bg-blue-100 text-blue-800 border-blue-200";
    if (holdDifference >= -1) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const formatOfflineDuration = (hours: number) => {
    if (hours === 0) return "Less than 1 hour";
    if (hours < 24) {
      const wholeHours = Math.floor(hours);
      const minutes = Math.floor((hours - wholeHours) * 60);
      if (minutes === 0) return `${wholeHours} hour${wholeHours > 1 ? 's' : ''}`;
      return `${wholeHours} hour${wholeHours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    const wholeRemainingHours = Math.floor(remainingHours);
    const minutes = Math.floor((remainingHours - wholeRemainingHours) * 60);
    
    if (wholeRemainingHours === 0 && minutes === 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (minutes === 0) {
      return `${days} day${days > 1 ? 's' : ''} ${wholeRemainingHours} hour${wholeRemainingHours > 1 ? 's' : ''}`;
    } else {
      return `${days} day${days > 1 ? 's' : ''} ${wholeRemainingHours} hour${wholeRemainingHours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  };

  // Performance analysis data with pagination
  const comparisonData = useMemo(() => {
    const allComparisonData = filteredAnalysisData.map((machine) => {
      const actualHold = machine.coinIn > 0 ? ((machine.coinIn - machine.coinOut) / machine.coinIn) * 100 : 0;
      const theoreticalHold = machine.theoreticalHold || 0;
      const holdDifference = actualHold - theoreticalHold;

      return {
        ...machine,
        actualHold,
        theoreticalHold,
        holdDifference,
        performanceRating: getPerformanceRating(holdDifference),
        performanceColor: getPerformanceColor(holdDifference),
      };
    }).sort((a, b) => b.holdDifference - a.holdDifference);

    // Update pagination info
    const totalCount = allComparisonData.length;
    const totalPages = Math.ceil(totalCount / analysisPagination.limit);
    const hasNextPage = analysisPagination.page < totalPages;
    const hasPrevPage = analysisPagination.page > 1;
    setAnalysisPagination(prev => ({ ...prev, totalCount, totalPages, hasNextPage, hasPrevPage }));

    // Return paginated data
    const startIndex = (analysisPagination.page - 1) * analysisPagination.limit;
    const endIndex = startIndex + analysisPagination.limit;
    return allComparisonData.slice(startIndex, endIndex);
  }, [filteredAnalysisData, analysisPagination.page, analysisPagination.limit]);

  // Offline machines with duration calculation and pagination
  const offlineMachinesWithDuration = useMemo(() => {
    const allOfflineMachines = filteredOfflineData.map(machine => {
      const now = new Date();
      const lastActivity = new Date(machine.lastActivity);
      const offlineDurationMs = now.getTime() - lastActivity.getTime();
      const offlineDurationHours = Math.max(0, offlineDurationMs / (1000 * 60 * 60));

      return {
        ...machine,
        offlineDurationHours,
        offlineDurationFormatted: formatOfflineDuration(offlineDurationHours),
      };
    }).sort((a, b) => b.offlineDurationHours - a.offlineDurationHours);

    // Update pagination info
    const totalCount = allOfflineMachines.length;
    const totalPages = Math.ceil(totalCount / offlinePagination.limit);
    const hasNextPage = offlinePagination.page < totalPages;
    const hasPrevPage = offlinePagination.page > 1;
    setOfflinePagination(prev => ({ ...prev, totalCount, totalPages, hasNextPage, hasPrevPage }));

    // Return paginated data
    const startIndex = (offlinePagination.page - 1) * offlinePagination.limit;
    const endIndex = startIndex + offlinePagination.limit;
    return allOfflineMachines.slice(startIndex, endIndex);
  }, [filteredOfflineData, offlinePagination.page, offlinePagination.limit]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => fetchOverviewMachines(1)} className="bg-buttonActive hover:bg-buttonActive/90">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Machine Performance Overview</h2>
          <p className="text-sm text-gray-600">Monitor individual machine performance and revenue tracking</p>
          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
            <span role="img" aria-label="lightbulb">💡</span> Click any machine to view detailed information
          </p>
        </div>
      </div>

      {/* Machine Statistics Cards - Load first */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {statsLoading || !machineStats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  ${machineStats.totalGross.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  Total Net Win (Gross)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  ${machineStats.totalDrop.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total Drop</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-black">
                  ${machineStats.totalCancelledCredits.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  Total Cancelled Credits
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {machineStats.onlineCount}/{machineStats.totalCount}
                </div>
                <p className="text-sm text-muted-foreground">Online Machines</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Three-Tab Navigation System */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="comparison">Performance Analysis</TabsTrigger>
          <TabsTrigger value="offline">Offline Machines</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search machines..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full text-gray-900 placeholder:text-gray-600 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full md:w-48 text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="All Locations" className="text-gray-900" />
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
                    Export Data
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {overviewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading overview machines...</span>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block">
                    <div className="rounded-md border">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b bg-muted/50">
                            <tr>
                              <th className="text-left p-3 font-medium">Select</th>
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
                            {filteredMachines.length > 0 ? (
                              filteredMachines.map((machine) => (
                                <tr
                                  key={machine.machineId}
                                  className="border-b hover:bg-muted/30"
                                >
                                  <td className="p-3">
                                    <Checkbox
                                      checked={selectedMachineIds.includes(machine.machineId)}
                                      onCheckedChange={() =>
                                        handleMachineSelect(machine.machineId)
                                      }
                                    />
                                  </td>
                                  <td className="p-3">
                                    <div>
                                      <div className="font-medium">
                                        {machine.machineName || "Unknown"}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {(machine.manufacturer || "Unknown")} • {machine.machineId}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3 text-sm">
                                    {machine.locationName || "Unknown"}
                                  </td>
                                  <td className="p-3">
                                    <Badge variant="outline">
                                      {machine.machineType || "slot"}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-sm font-medium text-green-600">
                                    ${(machine.netWin || 0).toLocaleString()}
                                  </td>
                                  <td className="p-3 text-sm font-medium text-yellow-600">
                                    ${(machine.drop || 0).toLocaleString()}
                                  </td>
                                  <td className="p-3 text-sm">
                                    {(machine.actualHold || 0).toFixed(1)}%
                                  </td>
                                  <td className="p-3 text-sm">
                                    {(machine.gamesPlayed || 0).toLocaleString()}
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
                              ))
                            ) : (
                              <tr>
                                <td colSpan={9} className="p-8 text-center text-gray-500">
                                  <div className="flex flex-col items-center gap-2">
                                    <RefreshCw className="w-8 h-8 text-gray-400" />
                                    <p>No machines found matching the current filters</p>
                                    <p className="text-sm">Try adjusting your search or filter criteria</p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-4">
                    {filteredMachines.length > 0 ? (
                      filteredMachines.map((machine) => (
                        <Card key={machine.machineId} className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedMachineIds.includes(machine.machineId)}
                                onCheckedChange={() =>
                                  handleMachineSelect(machine.machineId)
                                }
                              />
                              <div>
                                <h4 className="font-medium">{machine.machineName || "Unknown"}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {(machine.manufacturer || "Unknown")} • {machine.machineId}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant={machine.isOnline ? "default" : "destructive"}
                            >
                              {machine.isOnline ? "Online" : "Offline"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Location:</span>
                              <p>{machine.locationName || "Unknown"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Type:</span>
                              <p>{machine.machineType || "slot"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Net Win:</span>
                              <p className="text-green-600 font-medium">
                                ${(machine.netWin || 0).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Drop:</span>
                              <p className="text-yellow-600 font-medium">
                                ${(machine.drop || 0).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Hold %:</span>
                              <p>{(machine.actualHold || 0).toFixed(1)}%</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Games:</span>
                              <p>{(machine.gamesPlayed || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      <Card className="p-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <RefreshCw className="w-8 h-8 text-gray-400" />
                          <p className="text-gray-500">No machines found matching the current filters</p>
                          <p className="text-sm text-gray-400">Try adjusting your search or filter criteria</p>
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-sm text-muted-foreground">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                        {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{" "}
                        {pagination.totalCount} machines
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={!pagination.hasPrevPage}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={!pagination.hasNextPage}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Machine Performance Comparison</CardTitle>
              <CardDescription>
                Compare actual machine performance against theoretical expectations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysisLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading performance analysis data...</span>
                </div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <Input
                        placeholder="Search machines..."
                        value={analysisSearchTerm}
                        onChange={(e) => handleAnalysisSearchChange(e.target.value)}
                        className="w-full text-gray-900 placeholder:text-gray-600 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                      <SelectTrigger className="w-full md:w-48 text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="All Locations" className="text-gray-900" />
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
                  </div>

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
                              key={machine.machineId}
                              className="border-b hover:bg-muted/30"
                            >
                              <td className="p-3">
                                <div>
                                  <div className="font-medium">
                                    {machine.machineName}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {machine.machineId}
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
                                    machine.performanceRating === "excellent" || machine.performanceRating === "good"
                                      ? "default"
                                      : "destructive"
                                  }
                                  className={
                                    machine.performanceRating === "excellent" 
                                      ? "bg-green-100 text-green-800 border-green-200" 
                                      : machine.performanceRating === "good"
                                      ? "bg-blue-100 text-blue-800 border-blue-200"
                                      : machine.performanceRating === "average"
                                      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                      : "bg-red-100 text-red-800 border-red-200"
                                  }
                                >
                                  {machine.performanceRating.charAt(0).toUpperCase() + machine.performanceRating.slice(1)}
                                </Badge>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {machine.performanceRating === "excellent" && "Outperforming theoretical by 1%+"}
                                  {machine.performanceRating === "good" && "Meeting or slightly above theoretical"}
                                  {machine.performanceRating === "average" && "Slightly below theoretical (-1% to 0%)"}
                                  {machine.performanceRating === "poor" && "Significantly below theoretical (-1% or more)"}
                                </div>
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

                  {/* Performance Analysis Pagination Info */}
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-muted-foreground">
                      Showing {((analysisPagination.page - 1) * analysisPagination.limit) + 1} to{" "}
                      {Math.min(analysisPagination.page * analysisPagination.limit, analysisPagination.totalCount)} of{" "}
                      {analysisPagination.totalCount} machines
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAnalysisPageChange(analysisPagination.page - 1)}
                        disabled={!analysisPagination.hasPrevPage}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAnalysisPageChange(analysisPagination.page + 1)}
                        disabled={!analysisPagination.hasNextPage}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Machines Offline Report</CardTitle>
              <CardDescription>
                Monitor offline machines and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {offlineLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading offline machines data...</span>
                </div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <Input
                        placeholder="Search machines..."
                        value={offlineSearchTerm}
                        onChange={(e) => handleOfflineSearchChange(e.target.value)}
                        className="w-full text-gray-900 placeholder:text-gray-600 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                      <SelectTrigger className="w-full md:w-48 text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="All Locations" className="text-gray-900" />
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
                  </div>

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
                          </tr>
                        </thead>
                        <tbody>
                          {offlineMachinesWithDuration.map((machine) => (
                            <tr
                              key={machine.machineId}
                              className="border-b hover:bg-muted/30"
                            >
                              <td className="p-3">
                                <div>
                                  <div className="font-medium">
                                    {machine.machineName}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {machine.machineId}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-sm">
                                {machine.locationName}
                              </td>
                              <td className="p-3 text-sm">
                                {new Date(machine.lastActivity).toLocaleString()}
                              </td>
                              <td className="p-3 text-sm">
                                {machine.offlineDurationFormatted}
                              </td>
                              <td className="p-3 text-sm">
                                <div className="space-y-1">
                                  <div>Net Win: ${machine.netWin.toLocaleString()}</div>
                                  <div>Drop: ${machine.drop.toLocaleString()}</div>
                                  <div>Games: {machine.gamesPlayed.toLocaleString()}</div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Offline Machines Pagination */}
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-muted-foreground">
                      Showing {((offlinePagination.page - 1) * offlinePagination.limit) + 1} to{" "}
                      {Math.min(offlinePagination.page * offlinePagination.limit, offlinePagination.totalCount)} of{" "}
                      {offlinePagination.totalCount} offline machines
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOfflinePageChange(offlinePagination.page - 1)}
                        disabled={!offlinePagination.hasPrevPage}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOfflinePageChange(offlinePagination.page + 1)}
                        disabled={!offlinePagination.hasNextPage}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
