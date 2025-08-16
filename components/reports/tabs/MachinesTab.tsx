"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import LocationSingleSelect from "@/components/ui/common/LocationSingleSelect";
import { Checkbox } from "@/components/ui/checkbox";
import { EditCabinetModal } from "@/components/ui/cabinets/EditCabinetModal";
import { DeleteCabinetModal } from "@/components/ui/cabinets/DeleteCabinetModal";
import { useCabinetActionsStore } from "@/lib/store/cabinetActionsStore";
import type {
  MachineData,
  MachinesApiResponse,
  MachineStats,
  MachineStatsApiResponse,
} from "@/shared/types/machines";
import { Pencil2Icon } from "@radix-ui/react-icons";
import { Trash2 } from "lucide-react";
import { debounce } from "lodash";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { isMachineOnline } from "@/lib/utils/machines";

export default function MachinesTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Separate states for different purposes (streaming approach)
  const [overviewMachines, setOverviewMachines] = useState<MachineData[]>([]); // Paginated for overview
  const [allMachines, setAllMachines] = useState<MachineData[]>([]); // All machines for performance analysis
  const [offlineMachines, setOfflineMachines] = useState<MachineData[]>([]); // Offline machines only
  const [machineStats, setMachineStats] = useState<MachineStats | null>(null); // Counts for dashboard cards
  const [locations, setLocations] = useState<{ id: string; name: string; sasEnabled: boolean }[]>(
    []
  );

  // Loading states for each section
  const [statsLoading, setStatsLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
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
  const { selectedDateRange, setIsMachineComparisonModalOpen } =
    useReportsStore();
  const { setMachineComparisons } = useAnalyticsDataStore();
  const { selectedLicencee, activeMetricsFilter, customDateRange } =
    useDashBoardStore();
  const { openEditModal, openDeleteModal } = useCabinetActionsStore();

  // Search states for different tabs
  const [searchTerm, setSearchTerm] = useState("");
  const [analysisSearchTerm, setAnalysisSearchTerm] = useState("");
  const [offlineSearchTerm, setOfflineSearchTerm] = useState("");
  const [evaluationSearchTerm, setEvaluationSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [onlineStatusFilter, setOnlineStatusFilter] = useState("all"); // New filter for online/offline
  const [showOfflineOnly, setShowOfflineOnly] = useState(false);
  const [showSasOnly, setShowSasOnly] = useState(false);
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  // Location selection states for each tab (single location selection)
  const [overviewSelectedLocation, setOverviewSelectedLocation] = useState<string>("all");
  const [comparisonSelectedLocation, setComparisonSelectedLocation] = useState<string>("all");
  const [evaluationSelectedLocation, setEvaluationSelectedLocation] = useState<string>("all");
  const [offlineSelectedLocation, setOfflineSelectedLocation] = useState<string>("all");

  // Fetch locations data
  const fetchLocationsData = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (selectedLicencee && selectedLicencee !== "all") {
        params.licensee = selectedLicencee;
      }
      
      const response = await axios.get("/api/locations", { params });

      const locationsData = response.data.locations || [];
      const mappedLocations = locationsData.map((loc: any) => ({
        id: loc._id,
        name: loc.name,
        sasEnabled: loc.sasEnabled || false, // Default to false if not available
      }));

      setLocations(mappedLocations);
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      const errorMessage = (error as any).response?.data?.error || (error as any).message || "Failed to load locations";
      toast.error(errorMessage);
      // Set empty locations array to prevent further errors
      setLocations([]);
    }
  }, [selectedLicencee]);

  // Fetch machine statistics (loads first)
  const fetchMachineStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const params: Record<string, string> = {
        type: "stats",
      };

      if (selectedLicencee && selectedLicencee !== "all") {
        params.licencee = selectedLicencee;
      }

      if (selectedDateRange?.start && selectedDateRange?.end) {
        params.startDate = selectedDateRange.start.toISOString();
        params.endDate = selectedDateRange.end.toISOString();
      }

      if (onlineStatusFilter !== "all") {
        params.onlineStatus = onlineStatusFilter;
      }

      const response = await axios.get<MachineStatsApiResponse>(
        "/api/reports/machines",
        { params }
      );
      setMachineStats(response.data);
    } catch (error) {
      console.error("Failed to fetch machine stats:", error);
      setError("Failed to load machine statistics");
      toast.error("Failed to load machine statistics");
    } finally {
      setStatsLoading(false);
    }
  }, [selectedLicencee, selectedDateRange?.start, selectedDateRange?.end, onlineStatusFilter]);

  // Fetch overview machines (paginated)
  const fetchOverviewMachines = useCallback(
    async (page: number = 1) => {
      try {
        setOverviewLoading(true);
        setError(null);

        const params: Record<string, string> = {
          type: "overview",
          page: page.toString(),
          limit: "10",
        };

        if (selectedLicencee && selectedLicencee !== "all") {
          params.licencee = selectedLicencee;
        }

        if (overviewSelectedLocation && overviewSelectedLocation !== "all") {
          params.locationId = overviewSelectedLocation;
        }

        if (selectedDateRange?.start && selectedDateRange?.end) {
          params.startDate = selectedDateRange.start.toISOString();
          params.endDate = selectedDateRange.end.toISOString();
        }

        if (onlineStatusFilter !== "all") {
          params.onlineStatus = onlineStatusFilter;
        }

        const response = await axios.get<MachinesApiResponse>(
          "/api/reports/machines",
          { params }
        );
        const { data: machinesData, pagination: paginationData } =
          response.data;

        setOverviewMachines(machinesData);
        setPagination(paginationData);
      } catch (error) {
        console.error("Failed to fetch overview machines:", error);
        setError("Failed to load overview machines");
        toast.error("Failed to load overview machines");
      } finally {
        setOverviewLoading(false);
      }
    },
    [selectedLicencee, selectedDateRange?.start, selectedDateRange?.end, onlineStatusFilter, overviewSelectedLocation]
  );

  // Fetch all machines for performance analysis (loads on tab switch)
  const fetchAllMachines = useCallback(async () => {
    try {
      setAnalysisLoading(true);
      const params: Record<string, string> = {
        type: "all",
      };

      if (selectedLicencee && selectedLicencee !== "all") {
        params.licencee = selectedLicencee;
      }

      // Apply location filter based on active tab
      if (activeTab === "comparison" && comparisonSelectedLocation && comparisonSelectedLocation !== "all") {
        params.locationId = comparisonSelectedLocation;
      } else if (activeTab === "evaluation" && evaluationSelectedLocation && evaluationSelectedLocation !== "all") {
        params.locationId = evaluationSelectedLocation;
      }

      if (selectedDateRange?.start && selectedDateRange?.end) {
        params.startDate = selectedDateRange.start.toISOString();
        params.endDate = selectedDateRange.end.toISOString();
      }

      if (onlineStatusFilter !== "all") {
        params.onlineStatus = onlineStatusFilter;
      }

      const response = await axios.get<MachinesApiResponse>(
        "/api/reports/machines",
        { params }
      );
      const { data: allMachinesData } = response.data;

      setAllMachines(allMachinesData);
    } catch (error) {
      console.error("Failed to fetch all machines:", error);
      toast.error("Failed to load performance analysis data");
    } finally {
      setAnalysisLoading(false);
    }
  }, [selectedLicencee, selectedDateRange?.start, selectedDateRange?.end, onlineStatusFilter, activeTab, comparisonSelectedLocation, evaluationSelectedLocation]);

  // Fetch offline machines (loads on tab switch)
  const fetchOfflineMachines = useCallback(async () => {
    try {
      setOfflineLoading(true);
      const params: Record<string, string> = {
        type: "offline",
      };

      if (selectedLicencee && selectedLicencee !== "all") {
        params.licencee = selectedLicencee;
      }

      if (offlineSelectedLocation && offlineSelectedLocation !== "all") {
        params.locationId = offlineSelectedLocation;
      }

      if (selectedDateRange?.start && selectedDateRange?.end) {
        params.startDate = selectedDateRange.start.toISOString();
        params.endDate = selectedDateRange.end.toISOString();
      }

      if (onlineStatusFilter !== "all") {
        params.onlineStatus = onlineStatusFilter;
      }

      console.log("🔍 Fetching offline machines with params:", params);

      const response = await axios.get<MachinesApiResponse>(
        "/api/reports/machines",
        { params }
      );
      const { data: offlineMachinesData } = response.data;

      setOfflineMachines(offlineMachinesData);
    } catch (error) {
      console.error("Failed to fetch offline machines:", error);
      toast.error("Failed to load offline machines data");
    } finally {
      setOfflineLoading(false);
    }
  }, [selectedLicencee, selectedDateRange?.start, selectedDateRange?.end, onlineStatusFilter, offlineSelectedLocation]);

  // Backend search fallback when frontend search finds no results
  const performBackendSearch = useCallback(
    async (searchTerm: string, type: string = "overview") => {
      try {
        const params: Record<string, string> = {
          type,
          page: "1",
          limit: "10",
          search: searchTerm,
        };

        if (selectedLicencee && selectedLicencee !== "all") {
          params.licencee = selectedLicencee;
        }

        if (selectedDateRange?.start && selectedDateRange?.end) {
          params.startDate = selectedDateRange.start.toISOString();
          params.endDate = selectedDateRange.end.toISOString();
        }

        if (onlineStatusFilter !== "all") {
          params.onlineStatus = onlineStatusFilter;
        }

        const response = await axios.get<MachinesApiResponse>(
          "/api/reports/machines",
          { params }
        );
        const { data: machinesData, pagination: paginationData } =
          response.data;

        if (type === "overview") {
          setOverviewMachines(machinesData);
          setPagination(paginationData);
        } else if (type === "all") {
          setAllMachines(machinesData);
          setAnalysisPagination((prev) => ({
            ...prev,
            totalCount: paginationData.totalCount,
            totalPages: paginationData.totalPages,
            hasNextPage: paginationData.hasNextPage,
            hasPrevPage: paginationData.hasPrevPage,
          }));
        } else if (type === "offline") {
          setOfflineMachines(machinesData);
          setOfflinePagination((prev) => ({
            ...prev,
            totalCount: paginationData.totalCount,
            totalPages: paginationData.totalPages,
            hasNextPage: paginationData.hasNextPage,
            hasPrevPage: paginationData.hasPrevPage,
          }));
        }
      } catch (error) {
        console.error("Failed to perform backend search:", error);
        toast.error("Backend search failed");
      }
    },
    [selectedLicencee, selectedDateRange?.start, selectedDateRange?.end, onlineStatusFilter]
  );

  // Handle search with backend fallback for overview tab
  const handleSearchChange = useCallback(
    async (value: string) => {
      setSearchTerm(value);

      // If search term is cleared, reset to original data
      if (!value.trim()) {
        fetchOverviewMachines(1);
        return;
      }

      // Perform frontend search first
      const frontendFiltered = overviewMachines.filter((machine) => {
        const matchesSearch =
          (machine.machineName || "")
            .toLowerCase()
            .includes(value.toLowerCase()) ||
          (machine.gameTitle || "")
            .toLowerCase()
            .includes(value.toLowerCase()) ||
          (machine.manufacturer || "")
            .toLowerCase()
            .includes(value.toLowerCase());
        return matchesSearch;
      });

      // If frontend search finds results, use them
      if (frontendFiltered.length > 0) {
        return;
      }

      // If frontend search finds no results and search term is long enough, try backend search
      if (value.length > 2) {
        await performBackendSearch(value, "overview");
      }
    },
    [overviewMachines, fetchOverviewMachines, performBackendSearch]
  );

  // Handle analysis search change
  const handleAnalysisSearchChange = useCallback((value: string) => {
    setAnalysisSearchTerm(value);
  }, []);

  // Handle evaluation search change
  const handleEvaluationSearchChange = useCallback((value: string) => {
    setEvaluationSearchTerm(value);
  }, []);

  // Handle offline search change
  const handleOfflineSearchChange = useCallback((value: string) => {
    setOfflineSearchTerm(value);
  }, []);

  // Handle pagination for overview tab
  const handlePageChange = (newPage: number) => {
    fetchOverviewMachines(newPage);
  };

  // Handle pagination for analysis tab
  const handleAnalysisPageChange = (newPage: number) => {
    setAnalysisPagination((prev) => ({
      ...prev,
      page: newPage,
      hasNextPage: newPage < prev.totalPages,
      hasPrevPage: newPage > 1,
    }));
  };

  // Handle pagination for offline tab
  const handleOfflinePageChange = (newPage: number) => {
    setOfflinePagination((prev) => ({
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
      // Ensure we have data to export
      let machinesToExport: MachineData[] = [];
      
      if (activeTab === "overview") {
        if (overviewMachines.length === 0) {
          toast.error("No overview data available to export. Please wait for data to load.");
          return;
        }
        machinesToExport = overviewMachines;
      } else if (activeTab === "comparison") {
        if (allMachines.length === 0) {
          toast.error("No comparison data available to export. Please wait for data to load.");
          return;
        }
        machinesToExport = allMachines;
      } else if (activeTab === "offline") {
        if (offlineMachines.length === 0) {
          toast.error("No offline data available to export. Please wait for data to load.");
          return;
        }
        machinesToExport = offlineMachines;
      } else {
        // Default to overview data
        if (overviewMachines.length === 0) {
          toast.error("No data available to export. Please wait for data to load.");
          return;
        }
        machinesToExport = overviewMachines;
      }

      const metersData = {
        title: "Machines Export Report",
        subtitle: `Machine performance data - ${
          activeMetricsFilter === "Custom" &&
          customDateRange?.startDate &&
          customDateRange?.endDate
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
          "Slot", // Default type since it's not in the data
          machine.netWin.toLocaleString(),
          machine.drop.toLocaleString(),
          machine.totalCancelledCredits.toLocaleString(),
          "0", // Jackpot not available in current data
          machine.gamesPlayed.toLocaleString(),
          machine.theoreticalHold?.toFixed(1) + "%" || "0.0%",
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
            value: machinesToExport
              .filter((m) => !m.isOnline)
              .length.toString(),
          },
          {
            label: "Total Net Win",
            value: `$${machinesToExport
              .reduce((sum, m) => sum + (m.netWin || 0), 0)
              .toLocaleString()}`,
          },
          {
            label: "Total Drop",
            value: `$${machinesToExport
              .reduce((sum, m) => sum + (m.drop || 0), 0)
              .toLocaleString()}`,
          },
        ],
        metadata: {
          generatedBy: "Evolution1 CMS - Machines Export",
          generatedAt: new Date().toISOString(),
          dateRange:
            activeMetricsFilter === "Custom" &&
            customDateRange?.startDate &&
            customDateRange?.endDate
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

    const selectedMachines = overviewMachines.filter((machine) =>
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
    const filtered = overviewMachines
      .filter((machine) => {
        const matchesSearch =
          (machine.machineName || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (machine.gameTitle || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (machine.manufacturer || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

                const matchesLocation =
          overviewSelectedLocation === "all" ||
          overviewSelectedLocation === machine.locationId;

        return matchesSearch && matchesLocation;
      })
      .map((machine) => ({
        ...machine,
        // Calculate derived fields on frontend for better performance
        actualHold:
          machine.coinIn > 0
            ? ((machine.coinIn - machine.coinOut) / machine.coinIn) * 100
            : 0,
        totalWonCredits: machine.coinOut || 0,
        currentCredits: 0, // Default value since not provided by API
        gamesWon: 0, // Default value since not provided by API
      }));

    return filtered;
  }, [overviewMachines, searchTerm, overviewSelectedLocation]);

  // Filter analysis data based on search
  const filteredAnalysisData = useMemo(() => {
    const filtered = allMachines.filter((machine) => {
      const matchesSearch =
        (machine.machineName || "")
          .toLowerCase()
          .includes(analysisSearchTerm.toLowerCase()) ||
        (machine.serialNumber || "")
          .toLowerCase()
          .includes(analysisSearchTerm.toLowerCase()) ||
        (machine.machineId || "")
          .toLowerCase()
          .includes(analysisSearchTerm.toLowerCase()) ||
        (machine.gameTitle || "")
          .toLowerCase()
          .includes(analysisSearchTerm.toLowerCase()) ||
        (machine.manufacturer || "")
          .toLowerCase()
          .includes(analysisSearchTerm.toLowerCase());

            const matchesLocation =
        comparisonSelectedLocation === "all" ||
        comparisonSelectedLocation === machine.locationId;

      return matchesSearch && matchesLocation;
    });

    return filtered;
  }, [allMachines, analysisSearchTerm, comparisonSelectedLocation]);

  // Filter offline data based on search
  const filteredOfflineData = useMemo(() => {
    const filtered = offlineMachines.filter((machine) => {
      const matchesSearch =
        (machine.machineName || "")
          .toLowerCase()
          .includes(offlineSearchTerm.toLowerCase()) ||
        (machine.gameTitle || "")
          .toLowerCase()
          .includes(offlineSearchTerm.toLowerCase()) ||
        (machine.manufacturer || "")
          .toLowerCase()
          .includes(offlineSearchTerm.toLowerCase()) ||
        (machine.locationName || "")
          .toLowerCase()
          .includes(offlineSearchTerm.toLowerCase());

            const matchesLocation =
        offlineSelectedLocation === "all" ||
        offlineSelectedLocation === machine.locationId;

      return matchesSearch && matchesLocation;
    });

    return filtered;
  }, [offlineMachines, offlineSearchTerm, offlineSelectedLocation]);

  // Helper functions for performance analysis
  const getPerformanceRating = (holdDifference: number) => {
    if (holdDifference >= 1) return "excellent";
    if (holdDifference >= 0) return "good";
    if (holdDifference >= -1) return "average";
    return "poor";
  };

  const getPerformanceColor = (holdDifference: number) => {
    if (holdDifference >= 1)
      return "bg-green-100 text-green-800 border-green-200";
    if (holdDifference >= 0) return "bg-blue-100 text-blue-800 border-blue-200";
    if (holdDifference >= -1)
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const formatOfflineDuration = (hours: number) => {
    if (hours === 0) return "Less than 1 hour";
    if (hours < 24) {
      const wholeHours = Math.floor(hours);
      const minutes = Math.floor((hours - wholeHours) * 60);
      if (minutes === 0)
        return `${wholeHours} hour${wholeHours > 1 ? "s" : ""}`;
      return `${wholeHours} hour${wholeHours > 1 ? "s" : ""} ${minutes} minute${
        minutes > 1 ? "s" : ""
      }`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    const wholeRemainingHours = Math.floor(remainingHours);
    const minutes = Math.floor((remainingHours - wholeRemainingHours) * 60);

    if (wholeRemainingHours === 0 && minutes === 0) {
      return `${days} day${days > 1 ? "s" : ""}`;
    } else if (minutes === 0) {
      return `${days} day${days > 1 ? "s" : ""} ${wholeRemainingHours} hour${
        wholeRemainingHours > 1 ? "s" : ""
      }`;
    } else {
      return `${days} day${days > 1 ? "s" : ""} ${wholeRemainingHours} hour${
        wholeRemainingHours > 1 ? "s" : ""
      } ${minutes} minute${minutes > 1 ? "s" : ""}`;
    }
  };

  // Real evaluation data from allMachines
  const evaluationData = useMemo(() => {
    return allMachines.map((machine) => {
      const theoreticalHold = machine.theoreticalHold || 85;
      const actualHold = machine.actualHold || 87.5;
      const holdDifference = actualHold - theoreticalHold;

      return {
        machineId: machine.machineId,
        serialNumber:
          (typeof (machine as any).serialNumber === "string" && (machine as any).serialNumber.trim()) ||
          (typeof (machine as any).origSerialNumber === "string" && (machine as any).origSerialNumber.trim()) ||
          machine.machineId,
        machineName: machine.machineName,
        locationName: machine.locationName,
        locationId: machine.locationId,
        manufacturer: machine.manufacturer,
        gameTitle: machine.gameTitle,
        theoreticalHold,
        actualHold,
        holdDifference,
        performanceRating: getPerformanceRating(holdDifference),
        netWin: machine.netWin || 0,
        gamesPlayed: machine.gamesPlayed || 0,
        avgBet: machine.avgBet || 0,
      };
    });
  }, [allMachines]);

  // Filter evaluation data based on search
  const filteredEvaluationData = useMemo(() => {
    return evaluationData.filter((machine) => {
      const matchesSearch =
        (machine.machineName || "")
          .toLowerCase()
          .includes(evaluationSearchTerm.toLowerCase()) ||
        (machine.gameTitle || "")
          .toLowerCase()
          .includes(evaluationSearchTerm.toLowerCase()) ||
        (machine.manufacturer || "")
          .toLowerCase()
          .includes(evaluationSearchTerm.toLowerCase()) ||
        (machine.locationName || "")
          .toLowerCase()
          .includes(evaluationSearchTerm.toLowerCase());

      const matchesLocation =
        evaluationSelectedLocation === "all" || 
        evaluationSelectedLocation === machine.locationId;

      return matchesSearch && matchesLocation;
    });
  }, [evaluationData, evaluationSearchTerm, evaluationSelectedLocation]);

  // Generate real chart data from evaluation data
  const evaluationChartData = useMemo(() => {
    if (filteredEvaluationData.length === 0) return [];

    // Group by manufacturer
    const manufacturerData = filteredEvaluationData.reduce((acc, machine) => {
      const manufacturer = machine.manufacturer || "Unknown";
      if (!acc[manufacturer]) {
        acc[manufacturer] = {
          name: manufacturer,
          machines: 0,
          totalNetWin: 0,
          totalGamesPlayed: 0,
          avgHold: 0,
          holdValues: [],
        };
      }
      acc[manufacturer].machines++;
      acc[manufacturer].totalNetWin += machine.netWin;
      acc[manufacturer].totalGamesPlayed += machine.gamesPlayed;
      acc[manufacturer].holdValues.push(machine.actualHold);
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages and format data
    return Object.values(manufacturerData).map((data: any) => ({
      name: data.name,
      machines: data.machines,
      totalNetWin: data.totalNetWin,
      totalGamesPlayed: data.totalGamesPlayed,
      avgHold: data.holdValues.length > 0 
        ? data.holdValues.reduce((sum: number, val: number) => sum + val, 0) / data.holdValues.length 
        : 0,
    }));
  }, [filteredEvaluationData]);

  // Generate games performance chart data
  const gamesPerformanceData = useMemo(() => {
    if (filteredEvaluationData.length === 0) return [];

    // Group by game title
    const gameData = filteredEvaluationData.reduce((acc, machine) => {
      const gameTitle = machine.gameTitle || "Unknown";
      if (!acc[gameTitle]) {
        acc[gameTitle] = {
          name: gameTitle,
          machines: 0,
          totalNetWin: 0,
          totalGamesPlayed: 0,
          avgHold: 0,
          holdValues: [],
        };
      }
      acc[gameTitle].machines++;
      acc[gameTitle].totalNetWin += machine.netWin;
      acc[gameTitle].totalGamesPlayed += machine.gamesPlayed;
      acc[gameTitle].holdValues.push(machine.actualHold);
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages and format data, limit to top 5 games
    return Object.values(gameData)
      .map((data: any) => ({
        name: data.name,
        machines: data.machines,
        totalNetWin: data.totalNetWin,
        totalGamesPlayed: data.totalGamesPlayed,
        avgHold: data.holdValues.length > 0 
          ? data.holdValues.reduce((sum: number, val: number) => sum + val, 0) / data.holdValues.length 
          : 0,
      }))
      .sort((a: any, b: any) => b.totalNetWin - a.totalNetWin)
      .slice(0, 5);
  }, [filteredEvaluationData]);

  // Load data on component mount and when dependencies change
  useEffect(() => {
    const loadDataStreaming = async () => {
      // Set loading states for all tabs
      setStatsLoading(true);
      setOverviewLoading(true);
      setAnalysisLoading(true);
      setOfflineLoading(true);
      setEvaluationLoading(true);

      try {
        // 1. Load stats first (fastest)
        await fetchMachineStats();

        // 2. Load overview data (paginated, fast)
        await fetchOverviewMachines(1);

        // 3. Load locations data
        await fetchLocationsData();

        // 4. Always load all machines data for evaluation tab
        await fetchAllMachines();
      } finally {
        // Clear loading states
        setStatsLoading(false);
        setOverviewLoading(false);
        setAnalysisLoading(false);
        setOfflineLoading(false);
        setEvaluationLoading(false);
      }
    };

    loadDataStreaming();
  }, [
    selectedLicencee, 
    selectedDateRange?.start, 
    selectedDateRange?.end,
    fetchMachineStats,
    fetchOverviewMachines,
    fetchLocationsData,
    fetchAllMachines
  ]);

  // Show loading state for current tab when licensee changes
  useEffect(() => {
    if (activeTab === "overview") {
      setOverviewLoading(true);
    } else if (activeTab === "comparison") {
      setAnalysisLoading(true);
    } else if (activeTab === "evaluation") {
      setEvaluationLoading(true);
    } else if (activeTab === "offline") {
      setOfflineLoading(true);
    }
  }, [selectedLicencee, activeTab]);

  // Effects to trigger data refetch when location selections change
  useEffect(() => {
    if (activeTab === "overview" && overviewSelectedLocation) {
      fetchOverviewMachines(1);
    }
  }, [overviewSelectedLocation, activeTab, fetchOverviewMachines]);

  useEffect(() => {
    if ((activeTab === "comparison" || activeTab === "evaluation") && (comparisonSelectedLocation || evaluationSelectedLocation)) {
      fetchAllMachines();
    }
  }, [comparisonSelectedLocation, evaluationSelectedLocation, activeTab, fetchAllMachines]);

  useEffect(() => {
    if (activeTab === "offline" && offlineSelectedLocation) {
      fetchOfflineMachines();
    }
  }, [offlineSelectedLocation, activeTab, fetchOfflineMachines]);

  // Handle online status filter change
  const handleOnlineStatusFilterChange = useCallback(
    async (value: string) => {
      setOnlineStatusFilter(value);
      setOverviewLoading(true);
      await fetchOverviewMachines(1);
    },
    [fetchOverviewMachines]
  );

  // Handle machine edit
  const handleMachineEdit = useCallback(
    (machine: MachineData) => {
      // Convert machine data to cabinet format for the existing modal
      const cabinetData = {
        _id: machine.machineId,
        assetNumber: machine.machineName || "",
        serialNumber: (machine as any).serialNumber || (machine as any).origSerialNumber || machine.machineId,
        game: machine.gameTitle || "",
        locationId: machine.locationId || "",
        locationName: machine.locationName || "",
        smbId: machine.machineId,
        moneyIn: machine.drop || 0,
        moneyOut: machine.totalCancelledCredits || 0,
        gross: machine.netWin || 0,
        jackpot: 0,
        lastOnline: machine.lastActivity,
        installedGame: machine.gameTitle || "",
        accountingDenomination: "1",
        collectionMultiplier: "1",
        status: machine.isOnline ? "Functional" : "Offline",
        gameType: machine.machineType || "slot",
        isCronosMachine: false,
        cabinetType: "Standing",
      };
      openEditModal(cabinetData);
    },
    [openEditModal]
  );

  // Handle machine delete
  const handleMachineDelete = useCallback(
    (machine: MachineData) => {
      // Convert machine data to cabinet format for the existing modal
      const cabinetData = {
        _id: machine.machineId,
        assetNumber: machine.machineName || "",
        serialNumber: (machine as any).serialNumber || (machine as any).origSerialNumber || machine.machineId,
        game: machine.gameTitle || "",
        locationId: machine.locationId || "",
        locationName: machine.locationName || "",
        smbId: machine.machineId,
        moneyIn: machine.drop || 0,
        moneyOut: machine.totalCancelledCredits || 0,
        gross: machine.netWin || 0,
        jackpot: 0,
        lastOnline: machine.lastActivity,
        installedGame: machine.gameTitle || "",
        accountingDenomination: "1",
        collectionMultiplier: "1",
        status: machine.isOnline ? "Functional" : "Offline",
        gameType: machine.machineType || "slot",
        isCronosMachine: false,
        cabinetType: "Standing",
      };
      openDeleteModal(cabinetData);
    },
    [openDeleteModal]
  );

  // Handle tab change with explicit fetch per tab
  const handleTabChange = useCallback(
    async (tab: string) => {
      setActiveTab(tab);

      // Update URL param to persist tab state
      try {
        const sp = new URLSearchParams(searchParams?.toString() || "");
        sp.set("mtab", tab);
        // ensure section is machines
        sp.set("section", "machines");
        router.replace(`${pathname}?${sp.toString()}`);
      } catch {}

      if (tab === "overview") {
        setOverviewLoading(true);
        try {
          await fetchOverviewMachines(1);
        } finally {
          setOverviewLoading(false);
        }
      } else if (tab === "comparison") {
        setAnalysisLoading(true);
        try {
          await fetchAllMachines();
        } finally {
          setAnalysisLoading(false);
        }
      } else if (tab === "evaluation") {
        setEvaluationLoading(true);
        try {
          await fetchAllMachines();
        } finally {
          setEvaluationLoading(false);
        }
      } else if (tab === "offline") {
        setOfflineLoading(true);
        try {
          await fetchOfflineMachines();
        } finally {
          setOfflineLoading(false);
        }
      }
    },
    [fetchOverviewMachines, fetchAllMachines, fetchOfflineMachines, router, pathname, searchParams]
  );

  // Initialize activeTab from URL
  useEffect(() => {
    const initial = searchParams?.get("mtab");
    if (initial && initial !== activeTab) {
      setActiveTab(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate overview statistics from filtered machines
  const overviewStats = useMemo(() => {
    const totalMachines = filteredMachines.length;
    const onlineMachines = filteredMachines.filter((m) => m.isOnline).length;
    const totalNetWin = filteredMachines.reduce(
      (sum, m) => sum + (m.netWin || 0),
      0
    );
    const totalDrop = filteredMachines.reduce(
      (sum, m) => sum + (m.drop || 0),
      0
    );
    const totalCancelledCredits = filteredMachines.reduce(
      (sum, m) => sum + (m.totalCancelledCredits || 0),
      0
    );
    const totalJackpot = filteredMachines.reduce(
      (sum, m) => sum + 0, // Jackpot not available in current data
      0
    );
    const averageHold =
      totalMachines > 0
        ? filteredMachines.reduce((sum, m) => sum + (m.theoreticalHold || 0), 0) /
          totalMachines
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

  // Performance analysis data with pagination
  const comparisonData = useMemo(() => {
    const allComparisonData = filteredAnalysisData
      .map((machine) => {
        const actualHold =
          machine.coinIn > 0
            ? ((machine.coinIn - machine.coinOut) / machine.coinIn) * 100
            : 0;
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
      })
      .sort((a, b) => b.holdDifference - a.holdDifference);

    // Update pagination info
    const totalCount = allComparisonData.length;
    const totalPages = Math.ceil(totalCount / analysisPagination.limit);
    const hasNextPage = analysisPagination.page < totalPages;
    const hasPrevPage = analysisPagination.page > 1;
    setAnalysisPagination((prev) => ({
      ...prev,
      totalCount,
      totalPages,
      hasNextPage,
      hasPrevPage,
    }));

    // Return paginated data
    const startIndex = (analysisPagination.page - 1) * analysisPagination.limit;
    const endIndex = startIndex + analysisPagination.limit;
    return allComparisonData.slice(startIndex, endIndex);
  }, [filteredAnalysisData, analysisPagination.page, analysisPagination.limit]);

  // Offline machines with duration calculation and pagination
  const offlineMachinesWithDuration = useMemo(() => {
    const allOfflineMachines = filteredOfflineData
      .map((machine) => {
        const now = new Date();
        const lastActivity = new Date(machine.lastActivity);
        const offlineDurationMs = now.getTime() - lastActivity.getTime();
        const offlineDurationHours = Math.max(
          0,
          offlineDurationMs / (1000 * 60 * 60)
        );

        return {
          ...machine,
          offlineDurationHours,
          offlineDurationFormatted: formatOfflineDuration(offlineDurationHours),
        };
      })
      .sort((a, b) => b.offlineDurationHours - a.offlineDurationHours);

    // Update pagination info
    const totalCount = allOfflineMachines.length;
    const totalPages = Math.ceil(totalCount / offlinePagination.limit);
    const hasNextPage = offlinePagination.page < totalPages;
    const hasPrevPage = offlinePagination.page > 1;
    setOfflinePagination((prev) => ({
      ...prev,
      totalCount,
      totalPages,
      hasNextPage,
      hasPrevPage,
    }));

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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Error Loading Data
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button
            onClick={() => fetchOverviewMachines(1)}
            className="bg-buttonActive hover:bg-buttonActive/90"
          >
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
          <h2 className="text-2xl font-bold text-gray-900">
            Machine Performance Overview
          </h2>
          <p className="text-sm text-gray-600">
            Monitor individual machine performance and revenue tracking
          </p>
          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
            <span role="img" aria-label="lightbulb">
              💡
            </span>{" "}
            Click any machine to view detailed information
          </p>
        </div>
      </div>

      {/* Modals */}
      <EditCabinetModal />
      <DeleteCabinetModal />

      {/* Machine Statistics Cards - Load first */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading || !machineStats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="min-h-[120px]">
              <CardContent className="p-4 h-full flex flex-col justify-center">
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="min-h-[120px]">
              <CardContent className="p-4 h-full flex flex-col justify-center">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 break-words leading-tight">
                  ${machineStats.totalGross.toLocaleString()}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                  Total Net Win (Gross)
                </p>
              </CardContent>
            </Card>
            <Card className="min-h-[120px]">
              <CardContent className="p-4 h-full flex flex-col justify-center">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600 break-words leading-tight">
                  ${machineStats.totalDrop.toLocaleString()}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                  Total Drop
                </p>
              </CardContent>
            </Card>
            <Card className="min-h-[120px]">
              <CardContent className="p-4 h-full flex flex-col justify-center">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-black break-words leading-tight">
                  ${machineStats.totalCancelledCredits.toLocaleString()}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                  Total Cancelled Credits
                </p>
              </CardContent>
            </Card>
            <Card className="min-h-[120px]">
              <CardContent className="p-4 h-full flex flex-col justify-center">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 break-words leading-tight">
                  {machineStats.onlineCount}/{machineStats.totalCount}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                  Online Machines
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Three-Tab Navigation System */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        {/* Desktop Navigation */}
        <TabsList className="hidden md:grid w-full grid-cols-4 mb-6 bg-gray-100 p-2 rounded-lg shadow-sm">
          <TabsTrigger
            value="overview"
            className="flex-1 bg-white rounded px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="comparison"
            className="flex-1 bg-white rounded px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Performance Analysis
          </TabsTrigger>
          <TabsTrigger
            value="evaluation"
            className="flex-1 bg-white rounded px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Evaluation
          </TabsTrigger>
          <TabsTrigger
            value="offline"
            className="flex-1 bg-white rounded px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Offline Machines
          </TabsTrigger>
        </TabsList>

        {/* Mobile Navigation */}
        <div className="md:hidden mb-6">
          <select
            value={activeTab}
            onChange={(e) => handleTabChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base font-semibold bg-white shadow-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
          >
            <option value="overview">Overview</option>
            <option value="comparison">Performance Analysis</option>
            <option value="evaluation">Evaluation</option>
            <option value="offline">Offline Machines</option>
          </select>
        </div>

        <TabsContent value="overview" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
            <div className="flex-1">
              <Input
                placeholder="Search machines..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full text-gray-900 placeholder:text-gray-600 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="w-full md:w-[420px]">
              <LocationSingleSelect
                locations={locations}
                selectedLocation={overviewSelectedLocation}
                onSelectionChange={setOverviewSelectedLocation}
                placeholder="Select Location"
              />
            </div>
            <Select
              value={onlineStatusFilter}
              onValueChange={handleOnlineStatusFilterChange}
            >
              <SelectTrigger className="w-full md:w-40 text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue
                  placeholder="All Status"
                  className="text-gray-900"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => fetchOverviewMachines(1)}>
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportMeters}>
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </div>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchOverviewMachines(1)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
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
                              <th className="text-left p-3 font-medium">
                                Select
                              </th>
                              <th className="text-left p-3 font-medium">
                                Machine
                              </th>
                              <th className="text-left p-3 font-medium">
                                Location
                              </th>
                              <th className="text-left p-3 font-medium">
                                Type
                              </th>
                              <th className="text-left p-3 font-medium">
                                Net Win
                              </th>
                              <th className="text-left p-3 font-medium">
                                Drop
                              </th>
                              <th className="text-left p-3 font-medium">
                                Hold %
                              </th>
                              <th className="text-left p-3 font-medium">
                                Games
                              </th>
                              <th className="text-left p-3 font-medium">
                                Status
                              </th>
                              <th className="text-left p-3 font-medium">
                                Actions
                              </th>
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
                                      checked={selectedMachineIds.includes(
                                        machine.machineId
                                      )}
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
                                        {machine.manufacturer || "Unknown"} •{" "}
                                        {
                                          (typeof (machine as any).serialNumber === "string" && (machine as any).serialNumber.trim()) ||
                                            (typeof (machine as any).origSerialNumber === "string" && (machine as any).origSerialNumber.trim()) ||
                                            machine.machineId
                                        }
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
                                    {(
                                      machine.gamesPlayed || 0
                                    ).toLocaleString()}
                                  </td>
                                  <td className="p-3">
                                    <Badge
                                      variant={
                                        machine.isOnline
                                          ? "default"
                                          : "destructive"
                                      }
                                    >
                                      {machine.isOnline ? "Online" : "Offline"}
                                    </Badge>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleMachineEdit(machine)
                                        }
                                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                      >
                                        <Pencil2Icon className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleMachineDelete(machine)
                                        }
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={10}
                                  className="p-8 text-center text-gray-500"
                                >
                                  <div className="flex flex-col items-center gap-2">
                                    <RefreshCw className="w-8 h-8 text-gray-400" />
                                    <p>
                                      No machines found matching the current
                                      filters
                                    </p>
                                    <p className="text-sm">
                                      Try adjusting your search or filter
                                      criteria
                                    </p>
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
                                checked={selectedMachineIds.includes(
                                  machine.machineId
                                )}
                                onCheckedChange={() =>
                                  handleMachineSelect(machine.machineId)
                                }
                              />
                              <div>
                                <h4 className="font-medium">
                                  {machine.machineName || "Unknown"}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {machine.manufacturer || "Unknown"} •{" "}
                                  {
                                    (typeof (machine as any).serialNumber === "string" && (machine as any).serialNumber.trim()) ||
                                      (typeof (machine as any).origSerialNumber === "string" && (machine as any).origSerialNumber.trim()) ||
                                      machine.machineId
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  machine.isOnline ? "default" : "destructive"
                                }
                              >
                                {machine.isOnline ? "Online" : "Offline"}
                              </Badge>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMachineEdit(machine)}
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                >
                                  <Pencil2Icon className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMachineDelete(machine)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                Location:
                              </span>
                              <p>{machine.locationName || "Unknown"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Type:
                              </span>
                              <p>{machine.machineType || "slot"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Net Win:
                              </span>
                              <p className="text-green-600 font-medium">
                                ${(machine.netWin || 0).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Drop:
                              </span>
                              <p className="text-yellow-600 font-medium">
                                ${(machine.drop || 0).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Hold %:
                              </span>
                              <p>{(machine.actualHold || 0).toFixed(1)}%</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Games:
                              </span>
                              <p>
                                {(machine.gamesPlayed || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      <Card className="p-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <RefreshCw className="w-8 h-8 text-gray-400" />
                          <p className="text-gray-500">
                            No machines found matching the current filters
                          </p>
                          <p className="text-sm text-gray-400">
                            Try adjusting your search or filter criteria
                          </p>
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-sm text-muted-foreground">
                        Showing {(pagination.page - 1) * pagination.limit + 1}{" "}
                        to{" "}
                        {Math.min(
                          pagination.page * pagination.limit,
                          pagination.totalCount
                        )}{" "}
                        of {pagination.totalCount} machines
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Machine Performance Comparison</CardTitle>
                  <CardDescription>
                    Compare actual machine performance against theoretical expectations
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAllMachines}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
              </div>
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
                        onChange={(e) =>
                          handleAnalysisSearchChange(e.target.value)
                        }
                        className="w-full text-gray-900 placeholder:text-gray-600 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-full md:w-[420px]">
                      <LocationSingleSelect
                        locations={locations}
                        selectedLocation={comparisonSelectedLocation}
                        onSelectionChange={setComparisonSelectedLocation}
                        placeholder="Select Location"
                      />
                    </div>
                  </div>

                  <div className="rounded-md border">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b bg-muted/50">
                          <tr>
                            <th className="text-left p-3 font-medium">
                              Machine
                            </th>
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
                            <th className="text-left p-3 font-medium">
                              Revenue
                            </th>
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
                                    {
                                      (typeof (machine as any).serialNumber === "string" && (machine as any).serialNumber.trim()) ||
                                        (typeof (machine as any).origSerialNumber === "string" && (machine as any).origSerialNumber.trim()) ||
                                        machine.machineId
                                    }
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
                                    machine.performanceRating === "excellent" ||
                                    machine.performanceRating === "good"
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
                                  {machine.performanceRating
                                    .charAt(0)
                                    .toUpperCase() +
                                    machine.performanceRating.slice(1)}
                                </Badge>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {machine.performanceRating === "excellent" &&
                                    "Outperforming theoretical by 1%+"}
                                  {machine.performanceRating === "good" &&
                                    "Meeting or slightly above theoretical"}
                                  {machine.performanceRating === "average" &&
                                    "Slightly below theoretical (-1% to 0%)"}
                                  {machine.performanceRating === "poor" &&
                                    "Significantly below theoretical (-1% or more)"}
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
                      Showing{" "}
                      {(analysisPagination.page - 1) *
                        analysisPagination.limit +
                        1}{" "}
                      to{" "}
                      {Math.min(
                        analysisPagination.page * analysisPagination.limit,
                        analysisPagination.totalCount
                      )}{" "}
                      of {analysisPagination.totalCount} machines
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleAnalysisPageChange(analysisPagination.page - 1)
                        }
                        disabled={!analysisPagination.hasPrevPage}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleAnalysisPageChange(analysisPagination.page + 1)
                        }
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

        <TabsContent value="evaluation" className="space-y-6">
          {/* Filters for Evaluation Tab */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
            <div className="flex-1">
              <Input
                placeholder="Search machines..."
                value={evaluationSearchTerm}
                onChange={(e) => setEvaluationSearchTerm(e.target.value)}
                className="w-full text-gray-900 placeholder:text-gray-600 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="w-full md:w-[420px]">
              <LocationSingleSelect
                locations={locations}
                selectedLocation={evaluationSelectedLocation}
                onSelectionChange={setEvaluationSelectedLocation}
                placeholder="Select Location"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={async () => {
                setEvaluationLoading(true);
                try { await fetchAllMachines(); } finally { setEvaluationLoading(false); }
              }}>
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={async () => {
                // reuse meters export for now as representative (net win and games)
                await handleExportMeters();
              }}>
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </div>
          </div>
          {evaluationLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>Loading evaluation data...</span>
            </div>
          ) : (
            <>
              {/* Charts Section */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Manufacturers Performance Chart */}
            <Card className="h-96">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Manufacturers Performance
                </CardTitle>
                <CardDescription>
                  Performance metrics by manufacturer
                </CardDescription>
              </CardHeader>
              <CardContent>
                {evaluationChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={evaluationChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v: number) => {
                        const abs = Math.abs(v);
                        if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}b`;
                        if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}m`;
                        if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
                        return `${v}`;
                      }} />
                      <Tooltip formatter={(value: any) => (typeof value === 'number' ? value.toLocaleString() : value)} />
                      <Legend />
                      <Bar dataKey="machines" fill="#3b82f6" name="Machines" />
                      <Bar dataKey="totalNetWin" fill="#10b981" name="Net Win ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Games Performance Chart */}
            <Card className="h-96">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  Top Games Performance
                </CardTitle>
                <CardDescription>
                  Performance metrics by game type
                </CardDescription>
              </CardHeader>
              <CardContent>
                {gamesPerformanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={gamesPerformanceData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v: number) => {
                        const abs = Math.abs(v);
                        if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}b`;
                        if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}m`;
                        if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
                        return `${v}`;
                      }} />
                      <Tooltip formatter={(value: any) => (typeof value === 'number' ? value.toLocaleString() : value)} />
                      <Legend />
                      <Bar dataKey="totalNetWin" fill="#10b981" name="Net Win ($)" />
                      <Bar dataKey="totalGamesPlayed" fill="#f59e0b" name="Games Played" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hold Performance Chart */}
            <Card className="h-96">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  Hold Performance
                </CardTitle>
                <CardDescription>
                  Actual vs Theoretical Hold by manufacturer
                </CardDescription>
              </CardHeader>
              <CardContent>
                {evaluationChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={evaluationChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v: number) => {
                        const abs = Math.abs(v);
                        if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}b`;
                        if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}m`;
                        if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
                        return `${v}`;
                      }} />
                      <Tooltip formatter={(value: any) => (typeof value === 'number' ? value.toLocaleString() : value)} />
                      <Legend />
                      <Bar dataKey="avgHold" fill="#8b5cf6" name="Avg Hold (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Manufacturers Performance Chart */}
            <Card className="h-96">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Manufacturers Performance
                </CardTitle>
                <CardDescription>
                  Performance metrics by manufacturer
                </CardDescription>
              </CardHeader>
              <CardContent>
                {evaluationChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={evaluationChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v: number) => {
                        const abs = Math.abs(v);
                        if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}b`;
                        if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}m`;
                        if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
                        return `${v}`;
                      }} />
                      <Tooltip formatter={(value: any) => (typeof value === 'number' ? value.toLocaleString() : value)} />
                      <Legend />
                      <Bar dataKey="machines" fill="#3b82f6" name="Machines" />
                      <Bar dataKey="totalNetWin" fill="#10b981" name="Net Win ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Games Performance Chart */}
            <Card className="h-96">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  Top Games Performance
                </CardTitle>
                <CardDescription>
                  Performance metrics by game type
                </CardDescription>
              </CardHeader>
              <CardContent>
                {gamesPerformanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={gamesPerformanceData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v: number) => {
                        const abs = Math.abs(v);
                        if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}b`;
                        if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}m`;
                        if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
                        return `${v}`;
                      }} />
                      <Tooltip formatter={(value: any) => (typeof value === 'number' ? value.toLocaleString() : value)} />
                      <Legend />
                      <Bar dataKey="totalNetWin" fill="#10b981" name="Net Win ($)" />
                      <Bar dataKey="totalGamesPlayed" fill="#f59e0b" name="Games Played" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hold Performance Chart */}
            <Card className="h-96">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  Hold Performance
                </CardTitle>
                <CardDescription>
                  Actual vs Theoretical Hold by manufacturer
                </CardDescription>
              </CardHeader>
              <CardContent>
                {evaluationChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={evaluationChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avgHold" fill="#8b5cf6" name="Avg Hold (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top 5 Machines Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-600" />
                Top 5 Machines
              </CardTitle>
              <CardDescription>
                Highest performing machines by revenue and hold percentage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search and Filter Controls */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search machines..."
                    value={evaluationSearchTerm}
                    onChange={(e) =>
                      handleEvaluationSearchChange(e.target.value)
                    }
                    className="w-full"
                  />
                </div>
                <Select
                  value={locationFilter}
                  onValueChange={setLocationFilter}
                >
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
                <Button
                  variant="outline"
                  onClick={() => {
                    setEvaluationSearchTerm("");
                    setLocationFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-700">
                        Location
                      </th>
                      <th className="text-left p-3 font-medium text-gray-700">
                        Machine ID
                      </th>
                      <th className="text-left p-3 font-medium text-gray-700">
                        Game
                      </th>
                      <th className="text-left p-3 font-medium text-gray-700">
                        Manufacturer
                      </th>
                      <th className="text-left p-3 font-medium text-gray-700">
                        Handle
                      </th>
                      <th className="text-left p-3 font-medium text-gray-700">
                        Win/Loss
                      </th>
                      <th className="text-left p-3 font-medium text-gray-700">
                        Jackpot
                      </th>
                      <th className="text-left p-3 font-medium text-gray-700">
                        Avg. Wag. per Game
                      </th>
                      <th className="text-left p-3 font-medium text-gray-700">
                        Actual Hold
                      </th>
                      <th className="text-left p-3 font-medium text-gray-700">
                        Theoretical Hold
                      </th>
                      <th className="text-left p-3 font-medium text-gray-700">
                        Games Played
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvaluationData
                      .sort((a, b) => b.netWin - a.netWin)
                      .slice(0, 5)
                      .map((machine, index) => (
                        <tr
                          key={machine.machineId}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="p-3 text-sm">
                            {machine.locationName}
                          </td>
                          <td className="p-3 text-sm font-mono">
                            {
                              (typeof (machine as any).serialNumber === "string" && (machine as any).serialNumber.trim()) ||
                                (typeof (machine as any).origSerialNumber === "string" && (machine as any).origSerialNumber.trim()) ||
                                machine.machineId
                            }
                          </td>
                          <td className="p-3 text-sm">{machine.gameTitle}</td>
                          <td className="p-3 text-sm">
                            {machine.manufacturer}
                          </td>
                          <td className="p-3 text-sm font-medium">
                            $
                            {(
                              machine.netWin +
                              (machine.actualHold * machine.netWin) / 100
                            ).toLocaleString()}
                          </td>
                          <td
                            className={`p-3 text-sm font-medium ${
                              machine.netWin >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            ${machine.netWin.toLocaleString()}
                          </td>
                          <td className="p-3 text-sm">0</td>
                          <td className="p-3 text-sm">
                            $
                            {machine.avgBet
                              ? machine.avgBet.toFixed(2)
                              : "0.00"}
                          </td>
                          <td
                            className={`p-3 text-sm font-medium ${
                              machine.actualHold >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {machine.actualHold.toFixed(3)}%
                          </td>
                          <td className="p-3 text-sm text-green-600">
                            {machine.theoreticalHold.toFixed(3)}%
                          </td>
                          <td className="p-3 text-sm">
                            {machine.gamesPlayed.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {filteredEvaluationData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No machine data available for evaluation
                </div>
              )}
            </CardContent>
          </Card>
            </>
          )}
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
                        onChange={(e) =>
                          handleOfflineSearchChange(e.target.value)
                        }
                        className="w-full text-gray-900 placeholder:text-gray-600 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-full md:w-[420px]">
                      <LocationSingleSelect
                        locations={locations}
                        selectedLocation={offlineSelectedLocation}
                        onSelectionChange={setOfflineSelectedLocation}
                        placeholder="Select Location"
                      />
                    </div>
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
                            <th className="text-left p-3 font-medium">
                              Machine
                            </th>
                            <th className="text-left p-3 font-medium">
                              Location
                            </th>
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
                                {new Date(
                                  machine.lastActivity
                                ).toLocaleString()}
                              </td>
                              <td className="p-3 text-sm">
                                {machine.offlineDurationFormatted}
                              </td>
                              <td className="p-3 text-sm">
                                <div className="space-y-1">
                                  <div>
                                    Net Win: ${machine.netWin.toLocaleString()}
                                  </div>
                                  <div>
                                    Drop: ${machine.drop.toLocaleString()}
                                  </div>
                                  <div>
                                    Games:{" "}
                                    {machine.gamesPlayed.toLocaleString()}
                                  </div>
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
                      Showing{" "}
                      {(offlinePagination.page - 1) * offlinePagination.limit +
                        1}{" "}
                      to{" "}
                      {Math.min(
                        offlinePagination.page * offlinePagination.limit,
                        offlinePagination.totalCount
                      )}{" "}
                      of {offlinePagination.totalCount} offline machines
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleOfflinePageChange(offlinePagination.page - 1)
                        }
                        disabled={!offlinePagination.hasPrevPage}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleOfflinePageChange(offlinePagination.page + 1)
                        }
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
