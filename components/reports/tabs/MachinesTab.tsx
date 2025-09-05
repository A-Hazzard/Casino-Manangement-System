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
import { BarChart3, Download, RefreshCw, ChevronUp, ChevronDown, Monitor, TrendingUp, Trophy } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReportsStore } from "@/lib/store/reportsStore";

import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { exportData } from "@/lib/utils/exportUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  handleMachineSort as handleMachineSortHelper,
  sortEvaluationData as sortEvaluationDataHelper,
  handleExportMeters as handleExportMetersHelper
} from "@/lib/helpers/reportsPage";
import LocationSingleSelect from "@/components/ui/common/LocationSingleSelect";

import { EditCabinetModal } from "@/components/ui/cabinets/EditCabinetModal";
import { DeleteCabinetModal } from "@/components/ui/cabinets/DeleteCabinetModal";
import { useCabinetActionsStore } from "@/lib/store/cabinetActionsStore";
import { StackedChart } from "@/components/ui/StackedChart";
import { 
  RevenueAnalysisChartsSkeleton,
  ChartNoData,
  MainContentSkeleton
} from "@/components/ui/skeletons/ReportsSkeletons";
import type {
  MachineData,
  MachinesApiResponse,
  MachineStats,
  MachineStatsApiResponse,
} from "@/shared/types/machines";
import type {
  MachineEvaluationData,
} from "@/lib/types/reports";
import { Pencil2Icon } from "@radix-ui/react-icons";
import { Trash2 } from "lucide-react";

import StatusIcon from "@/components/ui/common/StatusIcon";
import { getFinancialColorClass } from "@/lib/utils/financialColors";

// Sortable table header component
const SortableHeader = ({ 
  children, 
  sortKey, 
  currentSort, 
  onSort 
}: { 
  children: React.ReactNode; 
  sortKey: keyof MachineData | 'handle' | 'avgWagerPerGame' | 'moneyIn'; 
  currentSort: { key: keyof MachineData | 'handle' | 'avgWagerPerGame' | 'moneyIn'; direction: 'asc' | 'desc' }; 
  onSort: (key: keyof MachineData | 'handle' | 'avgWagerPerGame' | 'moneyIn') => void; 
}) => {
  const isActive = currentSort.key === sortKey;
  
  return (
    <th 
      className="text-left p-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive ? (
          currentSort.direction === 'asc' ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )
        ) : (
          <div className="w-4 h-4 opacity-30">
            <ChevronUp className="w-4 h-4" />
          </div>
        )}
      </div>
    </th>
  );
};



export default function MachinesTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Separate states for different purposes (streaming approach)
  const [overviewMachines, setOverviewMachines] = useState<MachineData[]>([]); // Paginated for overview
  const [allMachines, setAllMachines] = useState<MachineData[]>([]); // All machines for performance analysis
  const [offlineMachines, setOfflineMachines] = useState<MachineData[]>([]); // Offline machines only
  const [machineStats, setMachineStats] = useState<MachineStats | null>(null); // Counts for dashboard cards
  
  // Machine hourly data for charts
  const [machineHourlyData, setMachineHourlyData] = useState<{
    locations: string[];
    hourlyTrends: Array<{
      hour: string;
      [key: string]: string | { handle: number; winLoss: number; jackpot: number; plays: number };
    }>;
  } | null>(null);
  const [machineHourlyLoading, setMachineHourlyLoading] = useState(false);
  const [locations, setLocations] = useState<{ id: string; name: string; sasEnabled: boolean }[]>(
    []
  );

  // Loading states for each section
  const [statsLoading, setStatsLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);

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




  // Sorting state for machine overview table
  const [sortConfig, setSortConfig] = useState<{
    key: keyof MachineData | 'handle' | 'avgWagerPerGame' | 'moneyIn';
    direction: 'asc' | 'desc';
  }>({
    key: 'netWin',
    direction: 'desc'
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

  // Sorting function for machine overview table
  const handleSort = (key: keyof MachineData | 'handle' | 'avgWagerPerGame' | 'moneyIn') => {
    handleMachineSortHelper(key, setSortConfig);
  };



  // Sort function for evaluation data (different structure)
  const sortEvaluationData = (machines: typeof evaluationData) => {
    return sortEvaluationDataHelper(machines, sortConfig);
  };

  // Store and filter states
  const { selectedDateRange } = useReportsStore();
  const { selectedLicencee, activeMetricsFilter, customDateRange } =
    useDashBoardStore();
  const { openEditModal, openDeleteModal } = useCabinetActionsStore();

  // Search states for different tabs
  const [searchTerm, setSearchTerm] = useState("");

  const [offlineSearchTerm, setOfflineSearchTerm] = useState("");
  const [evaluationSearchTerm, setEvaluationSearchTerm] = useState("");

  const [onlineStatusFilter, setOnlineStatusFilter] = useState("all"); // New filter for online/offline


  const [activeTab, setActiveTab] = useState("overview");

  // Location selection states for each tab (single location selection)
  const [overviewSelectedLocation, setOverviewSelectedLocation] = useState<string>("all");

  const [evaluationSelectedLocation, setEvaluationSelectedLocation] = useState<string>("");
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
      const mappedLocations = locationsData.map((loc: Record<string, unknown>) => ({
        id: loc._id,
        name: loc.name,
        sasEnabled: loc.sasEnabled || false, // Default to false if not available
      }));

      setLocations(mappedLocations);
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      const errorMessage = (((error as Record<string, unknown>).response as Record<string, unknown>)?.data as Record<string, unknown>)?.error || (error as Record<string, unknown>).message || "Failed to load locations";
      toast.error(errorMessage as string);
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
    async (page: number = 1, search: string = "") => {
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

        // Add search parameter if provided
        if (search && search.trim()) {
          params.search = search.trim();
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

      const params: Record<string, string> = {
        type: "all",
      };

      if (selectedLicencee && selectedLicencee !== "all") {
        params.licencee = selectedLicencee;
      }

      // Apply location filter based on active tab
      if (activeTab === "evaluation" && evaluationSelectedLocation && evaluationSelectedLocation !== "all" && evaluationSelectedLocation !== "") {
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

    }
  }, [selectedLicencee, selectedDateRange?.start, selectedDateRange?.end, onlineStatusFilter, activeTab, evaluationSelectedLocation]);

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

      // Don't pass onlineStatus for offline machines - the API handles offline filtering internally
      // if (onlineStatusFilter !== "all") {
      //   params.onlineStatus = onlineStatusFilter;
      // }

      console.warn(`🔍 Fetching offline machines with params: ${JSON.stringify(params)}`);

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
  }, [selectedLicencee, selectedDateRange?.start, selectedDateRange?.end, offlineSelectedLocation]);


  // Handle search with backend fallback for overview tab
  const handleSearchChange = useCallback(
    async (value: string) => {
      setSearchTerm(value);

      // If search term is cleared, reset to original data
      if (!value.trim()) {
        fetchOverviewMachines(1);
        return;
      }

      // Use backend search directly for better results
      await fetchOverviewMachines(1, value.trim());
    },
    [fetchOverviewMachines]
  );



  // Handle evaluation search change


  // Handle offline search change
  const handleOfflineSearchChange = useCallback((value: string) => {
    setOfflineSearchTerm(value);
  }, []);

  // Handle pagination for overview tab
  const handlePageChange = (newPage: number) => {
    fetchOverviewMachines(newPage, searchTerm);
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



  const handleExportMeters = async () => {
    await handleExportMetersHelper(
      activeTab,
      overviewMachines,
      offlineMachines,
      activeMetricsFilter,
      customDateRange,
      exportData,
      toast
    );
  };







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
  const evaluationData = useMemo((): MachineEvaluationData[] => {
    return allMachines.map((machine) => {
      const theoreticalHold = machine.theoreticalHold || 0;
      const actualHold = machine.actualHold || 0;
      const holdDifference = actualHold - theoreticalHold;

      return {
        machineId: machine.machineId,
        serialNumber:
          (typeof (machine as Record<string, unknown>).serialNumber === "string" && ((machine as Record<string, unknown>).serialNumber as string).trim()) ||
          (typeof (machine as Record<string, unknown>).origSerialNumber === "string" && ((machine as Record<string, unknown>).origSerialNumber as string).trim()) ||
          (typeof (machine as Record<string, unknown>).custom === "object" && 
           typeof ((machine as Record<string, unknown>).custom as Record<string, unknown>)?.name === "string" && 
           (((machine as Record<string, unknown>).custom as Record<string, unknown>).name as string).trim()) ||
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
        gross: machine.gross || 0,
        drop: machine.drop || 0,
        coinIn: machine.coinIn || 0,
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





  // Load data on component mount and when dependencies change
  useEffect(() => {
    const loadDataStreaming = async () => {
      // Set loading states for all tabs
      setStatsLoading(true);
      setOverviewLoading(true);

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

    } else if (activeTab === "evaluation") {
      setEvaluationLoading(true);
    } else if (activeTab === "offline") {
      setOfflineLoading(true);
    }
  }, [selectedLicencee, activeTab]);

  // Effects to trigger data refetch when location selections change
  useEffect(() => {
    if (activeTab === "overview" && overviewSelectedLocation) {
      fetchOverviewMachines(1, searchTerm);
    }
  }, [overviewSelectedLocation, activeTab, fetchOverviewMachines, searchTerm]);

  useEffect(() => {
    if (activeTab === "evaluation" && evaluationSelectedLocation && evaluationSelectedLocation !== "") {
      fetchAllMachines();
    }
  }, [evaluationSelectedLocation, activeTab, fetchAllMachines]);

  // Separate useEffect for machine hourly data that depends on allMachines
  useEffect(() => {
    if (activeTab === "evaluation" && evaluationSelectedLocation && evaluationSelectedLocation !== "" && allMachines.length > 0) {
      const fetchData = async () => {
        try {
          setMachineHourlyLoading(true);
          
          // Get machine IDs for the selected location
          const locationMachines = allMachines.filter(machine => 
            machine.locationId === evaluationSelectedLocation
          );
          
          if (locationMachines.length === 0) {
            setMachineHourlyData(null);
            return;
          }

          const machineIds = locationMachines.map(machine => machine.machineId).join(',');
          
          const response = await axios.get(`/api/analytics/machine-hourly`, {
            params: {
              machineIds,
              timePeriod: 'Today',
              startDate: selectedDateRange?.start,
              endDate: selectedDateRange?.end,
              licencee: selectedLicencee
            }
          });

          setMachineHourlyData(response.data);
        } catch (error) {
          console.error("Failed to fetch machine hourly data:", error);
          toast.error("Failed to load machine performance data");
          setMachineHourlyData(null);
        } finally {
          setMachineHourlyLoading(false);
        }
      };
      
      fetchData();
    }
  }, [evaluationSelectedLocation, activeTab, allMachines, selectedDateRange, selectedLicencee]);

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
      await fetchOverviewMachines(1, searchTerm);
    },
    [fetchOverviewMachines, searchTerm]
  );

  // Handle machine edit
  const handleMachineEdit = useCallback(
    (machine: MachineData) => {
      // Convert machine data to cabinet format for the existing modal
      const cabinetData = {
        _id: machine.machineId,
        assetNumber: machine.machineName || "",
        serialNumber: (machine as Record<string, unknown>).serialNumber as string || (machine as Record<string, unknown>).origSerialNumber as string || machine.machineId,
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
        serialNumber: (machine as Record<string, unknown>).serialNumber as string || (machine as Record<string, unknown>).origSerialNumber as string || machine.machineId,
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
          await fetchOverviewMachines(1, searchTerm);
        } finally {
          setOverviewLoading(false);
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
    [fetchOverviewMachines, fetchAllMachines, fetchOfflineMachines, router, pathname, searchParams, searchTerm]
  );

  // Initialize activeTab from URL
  useEffect(() => {
    const initial = searchParams?.get("mtab");
    if (initial && initial !== activeTab) {
      setActiveTab(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);





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

  // Calculate derived fields for overview machines (backend handles filtering)
  const processedOverviewMachines = useMemo(() => {
    return overviewMachines.map((machine) => ({
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
  }, [overviewMachines]);

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
            onClick={() => fetchOverviewMachines(1, searchTerm)}
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
          Array.from({ length: 4 }).map((_, index) => (
                          <Card key={index} className="min-h-[120px]">
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
                <div className={`text-lg sm:text-xl lg:text-2xl font-bold break-words leading-tight ${getFinancialColorClass(machineStats.totalGross)}`}>
                  ${machineStats.totalGross.toLocaleString()}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                  Total Net Win (Gross)
                </p>
              </CardContent>
            </Card>
            <Card className="min-h-[120px]">
              <CardContent className="p-4 h-full flex flex-col justify-center">
                <div className={`text-lg sm:text-xl lg:text-2xl font-bold break-words leading-tight ${getFinancialColorClass(machineStats.totalDrop)}`}>
                  ${machineStats.totalDrop.toLocaleString()}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                  Total Drop
                </p>
              </CardContent>
            </Card>
            <Card className="min-h-[120px]">
              <CardContent className="p-4 h-full flex flex-col justify-center">
                <div className={`text-lg sm:text-xl lg:text-2xl font-bold break-words leading-tight ${getFinancialColorClass(machineStats.totalCancelledCredits)}`}>
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
        <TabsList className="hidden md:grid w-full grid-cols-3 mb-10 bg-gray-100 p-3 rounded-xl shadow-sm">
          <TabsTrigger
            value="overview"
            className="flex-1 bg-white rounded-lg px-6 py-4 text-sm font-semibold transition-all duration-200 hover:bg-gray-50 hover:shadow-md data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="evaluation"
            className="flex-1 bg-white rounded-lg px-6 py-4 text-sm font-semibold transition-all duration-200 hover:bg-gray-50 hover:shadow-md data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105"
          >
            Evaluation
          </TabsTrigger>
          <TabsTrigger
            value="offline"
            className="flex-1 bg-white rounded-lg px-6 py-4 text-sm font-semibold transition-all duration-200 hover:bg-gray-50 hover:shadow-md data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105"
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
            {/* <option value="comparison">Performance Analysis</option> */}
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
              <Button variant="outline" size="sm" onClick={() => fetchOverviewMachines(1, searchTerm)}>
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
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <CardTitle>Machine Performance</CardTitle>
                <div className="flex flex-wrap gap-2">
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
                  <div className="hidden md:block">
                                      {/* Desktop Table View */}
                  <div className="hidden md:block rounded-md border">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                          <thead className="border-b bg-muted/50">
                            <tr>
                              {/* Select column removed */}
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
                                Gross
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
                            {processedOverviewMachines.length > 0 ? (
                              processedOverviewMachines.map((machine) => (
                                <tr
                                  key={machine.machineId}
                                  className="border-b hover:bg-muted/30"
                                >
                                  {/* Select column data removed */}
                                  <td className="p-3">
                                    <div>
                                      <div className="font-medium">
                                        {machine.machineName || "Unknown"}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {machine.manufacturer || "Unknown"} •{" "}
                                        {
                                          (typeof (machine as Record<string, unknown>).serialNumber === "string" && ((machine as Record<string, unknown>).serialNumber as string).trim()) ||
                                            (typeof (machine as Record<string, unknown>).origSerialNumber === "string" && ((machine as Record<string, unknown>).origSerialNumber as string).trim()) ||
                                            (typeof (machine as Record<string, unknown>).custom === "object" && 
                                             typeof ((machine as Record<string, unknown>).custom as Record<string, unknown>)?.name === "string" && 
                                             (((machine as Record<string, unknown>).custom as Record<string, unknown>).name as string).trim()) ||
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
                                    <StatusIcon isOnline={machine.isOnline} />
                                  </td>
                                  <td className="p-3">
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
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={10}
                                  className="text-center py-8 text-gray-500"
                                >
                                  No machines found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {processedOverviewMachines.length > 0 ? (
                      processedOverviewMachines.map((machine) => (
                        <Card key={machine.machineId} className="p-4">
                          <div className="flex items-start justify-between mb-3 min-w-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-sm truncate">
                                  {machine.machineName || "Unknown"}
                                </h4>
                                <p className="text-xs text-muted-foreground truncate">
                                  {machine.manufacturer || "Unknown"} •{" "}
                                  {
                                    (typeof (machine as Record<string, unknown>).serialNumber === "string" && ((machine as Record<string, unknown>).serialNumber as string).trim()) ||
                                      (typeof (machine as Record<string, unknown>).origSerialNumber === "string" && ((machine as Record<string, unknown>).origSerialNumber as string).trim()) ||
                                      (typeof (machine as Record<string, unknown>).custom === "object" && 
                                       typeof ((machine as Record<string, unknown>).custom as Record<string, unknown>)?.name === "string" && 
                                       (((machine as Record<string, unknown>).custom as Record<string, unknown>).name as string).trim()) ||
                                      machine.machineId
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                              <StatusIcon isOnline={machine.isOnline} size="sm" />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMachineEdit(machine)}
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50 flex-shrink-0"
                              >
                                <Pencil2Icon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMachineDelete(machine)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50 flex-shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {/* Tiny screen layout (< 425px) - Single column */}
                          <div className="block sm:hidden space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Location:</span>
                              <span className="font-medium">{machine.locationName || "Unknown"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Type:</span>
                              <span className="font-medium">{machine.machineType || "slot"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Net Win:</span>
                              <span className={`font-medium ${getFinancialColorClass(machine.netWin)}`}>${(machine.netWin || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Drop:</span>
                              <span className={`font-medium ${getFinancialColorClass(machine.drop)}`}>${(machine.drop || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Hold %:</span>
                              <span className="font-medium">{(machine.actualHold || 0).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Games:</span>
                              <span className="font-medium">{(machine.gamesPlayed || 0).toLocaleString()}</span>
                            </div>
                          </div>
                          {/* Small screen layout (425px+) - Two columns */}
                          <div className="hidden sm:grid sm:grid-cols-2 gap-4 text-sm">
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
                              <p className={`font-medium ${getFinancialColorClass(machine.netWin)}`}>
                                ${(machine.netWin || 0).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Drop:
                              </span>
                              <p className={`font-medium ${getFinancialColorClass(machine.drop)}`}>
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
                      <div className="text-center py-8 text-gray-500">
                        No machines found
                      </div>
                    )}
                  </div>

                  {/* Pagination - Mobile Responsive */}
                  {pagination.totalPages > 1 && (
                    <>
                      {/* Mobile Pagination */}
                      <div className="flex flex-col space-y-3 mt-6 sm:hidden">
                        <div className="text-xs text-gray-600 text-center">
                          Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} machines)
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(1)}
                            disabled={pagination.page === 1}
                            className="px-2 py-1 text-xs"
                          >
                            ««
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={!pagination.hasPrevPage}
                            className="px-2 py-1 text-xs"
                          >
                            ‹
                          </Button>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600">Page</span>
                            <input
                              type="number"
                              min={1}
                              max={pagination.totalPages}
                              value={pagination.page}
                              onChange={(e) => {
                                let val = Number(e.target.value);
                                if (isNaN(val)) val = 1;
                                if (val < 1) val = 1;
                                if (val > pagination.totalPages) val = pagination.totalPages;
                                handlePageChange(val);
                              }}
                              className="w-12 px-1 py-1 border border-gray-300 rounded text-center text-xs text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
                              aria-label="Page number"
                            />
                            <span className="text-xs text-gray-600">of {pagination.totalPages}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={!pagination.hasNextPage}
                            className="px-2 py-1 text-xs"
                          >
                            ›
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.totalPages)}
                            disabled={pagination.page === pagination.totalPages}
                            className="px-2 py-1 text-xs"
                          >
                            »»
                          </Button>
                        </div>
                      </div>

                      {/* Desktop Pagination */}
                      <div className="hidden sm:flex items-center justify-between mt-6">
                        <div className="text-sm text-muted-foreground">
                          Showing {(pagination.page - 1) * pagination.limit + 1}{" "}
                          to{" "}
                          {Math.min(
                            pagination.page * pagination.limit,
                            pagination.totalCount
                          )}{" "}
                          of {pagination.totalCount} machines
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(1)}
                            disabled={pagination.page === 1}
                          >
                            First
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={!pagination.hasPrevPage}
                          >
                            Previous
                          </Button>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Page</span>
                            <input
                              type="number"
                              min={1}
                              max={pagination.totalPages}
                              value={pagination.page}
                              onChange={(e) => {
                                let val = Number(e.target.value);
                                if (isNaN(val)) val = 1;
                                if (val < 1) val = 1;
                                if (val > pagination.totalPages) val = pagination.totalPages;
                                handlePageChange(val);
                              }}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
                              aria-label="Page number"
                            />
                            <span className="text-sm text-gray-600">of {pagination.totalPages}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={!pagination.hasNextPage}
                          >
                            Next
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.totalPages)}
                            disabled={pagination.page === pagination.totalPages}
                          >
                            Last
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="evaluation" className="space-y-6 mt-2">
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
            <MainContentSkeleton />
          ) : !evaluationSelectedLocation || evaluationSelectedLocation === "" ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Location
                </h3>
                <p className="text-gray-600 mb-4">
                  Choose a specific location to view machine evaluation data and performance metrics.
                </p>
                <p className="text-sm text-gray-500">
                  Use the location selector above to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              



              {/* Machine Performance Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {machineHourlyLoading ? (
                  <RevenueAnalysisChartsSkeleton />
                ) : machineHourlyData && machineHourlyData.locations && machineHourlyData.locations.length > 0 ? (
                  <>
                    {/* Handle Chart */}
                    {(() => {
                      const hasHandleData = machineHourlyData.hourlyTrends.some(item => 
                        machineHourlyData.locations.some(locationId => {
                          const locationData = item[locationId];
                          return typeof locationData === 'object' && locationData !== null && locationData.handle > 0;
                        })
                      );
                      
                      return hasHandleData ? (
                        <StackedChart
                          title="Handle"
                          icon={<BarChart3 className="h-5 w-5" />}
                          data={machineHourlyData.hourlyTrends}
                          dataKey="handle"
                          machines={machineHourlyData.locations}
                          colors={["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"]}
                          formatter={(value) => `$${value.toLocaleString()}`}
                          locationNames={(() => {
                            const locationNameMap: Record<string, string> = {};
                            locations.forEach(loc => {
                              locationNameMap[loc.id] = loc.name;
                            });
                            return locationNameMap;
                          })()}
                        />
                      ) : (
                        <ChartNoData
                          title="Handle"
                          icon={<BarChart3 className="h-5 w-5" />}
                          message="No handle data available for the selected location"
                        />
                      );
                    })()}

                    {/* Win/Loss Chart */}
                    {(() => {
                      const hasWinLossData = machineHourlyData.hourlyTrends.some(item => 
                        machineHourlyData.locations.some(locationId => {
                          const locationData = item[locationId];
                          return typeof locationData === 'object' && locationData !== null && locationData.winLoss !== 0;
                        })
                      );
                      
                      return hasWinLossData ? (
                        <StackedChart
                          title="Win/Loss"
                          icon={<TrendingUp className="h-5 w-5" />}
                          data={machineHourlyData.hourlyTrends}
                          dataKey="winLoss"
                          machines={machineHourlyData.locations}
                          colors={["#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6"]}
                          formatter={(value) => `$${value.toLocaleString()}`}
                          locationNames={(() => {
                            const locationNameMap: Record<string, string> = {};
                            locations.forEach(loc => {
                              locationNameMap[loc.id] = loc.name;
                            });
                            return locationNameMap;
                          })()}
                        />
                      ) : (
                        <ChartNoData
                          title="Win/Loss"
                          icon={<TrendingUp className="h-5 w-5" />}
                          message="No win/loss data available for the selected location"
                        />
                      );
                    })()}

                    {/* Jackpot Chart */}
                    {(() => {
                      const hasJackpotData = machineHourlyData.hourlyTrends.some(item => 
                        machineHourlyData.locations.some(locationId => {
                          const locationData = item[locationId];
                          return typeof locationData === 'object' && locationData !== null && locationData.jackpot > 0;
                        })
                      );
                      
                      return hasJackpotData ? (
                        <StackedChart
                          title="Jackpot"
                          icon={<Trophy className="h-5 w-5" />}
                          data={machineHourlyData.hourlyTrends}
                          dataKey="jackpot"
                          machines={machineHourlyData.locations}
                          colors={["#f59e0b", "#ef4444", "#10b981", "#3b82f6", "#8b5cf6"]}
                          formatter={(value) => `$${value.toLocaleString()}`}
                          locationNames={(() => {
                            const locationNameMap: Record<string, string> = {};
                            locations.forEach(loc => {
                              locationNameMap[loc.id] = loc.name;
                            });
                            return locationNameMap;
                          })()}
                        />
                      ) : (
                        <ChartNoData
                          title="Jackpot"
                          icon={<Trophy className="h-5 w-5" />}
                          message="No jackpot data available for the selected location"
                        />
                      );
                    })()}
                  </>
                ) : (
                  <>
                    {/* No Data Charts */}
                    <ChartNoData
                      title="Handle"
                      icon={<BarChart3 className="h-5 w-5" />}
                      message="No handle data available for the selected location"
                    />
                    <ChartNoData
                      title="Win/Loss"
                      icon={<TrendingUp className="h-5 w-5" />}
                      message="No win/loss data available for the selected location"
                    />
                    <ChartNoData
                      title="Jackpot"
                      icon={<Trophy className="h-5 w-5" />}
                      message="No jackpot data available for the selected location"
                    />
                  </>
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
                Highest performing machines by revenue and hold percentage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <SortableHeader 
                        sortKey="locationName" 
                        currentSort={sortConfig} 
                        onSort={handleSort}
                      >
                        Location
                      </SortableHeader>
                      <SortableHeader 
                        sortKey="machineId" 
                        currentSort={sortConfig} 
                        onSort={handleSort}
                      >
                        Machine ID
                      </SortableHeader>
                      <SortableHeader 
                        sortKey="gameTitle" 
                        currentSort={sortConfig} 
                        onSort={handleSort}
                      >
                        Game
                      </SortableHeader>
                      <SortableHeader 
                        sortKey="manufacturer" 
                        currentSort={sortConfig} 
                        onSort={handleSort}
                      >
                        Manufacturer
                      </SortableHeader>
                      <SortableHeader 
                        sortKey="moneyIn" 
                        currentSort={sortConfig} 
                        onSort={handleSort}
                      >
                        Money In
                      </SortableHeader>
                      <SortableHeader 
                        sortKey="netWin" 
                        currentSort={sortConfig} 
                        onSort={handleSort}
                      >
                        Win/Loss
                      </SortableHeader>
                      <SortableHeader 
                        sortKey="jackpot" 
                        currentSort={sortConfig} 
                        onSort={handleSort}
                      >
                        Jackpot
                      </SortableHeader>
                      <SortableHeader 
                        sortKey="avgWagerPerGame" 
                        currentSort={sortConfig} 
                        onSort={handleSort}
                      >
                        Avg. Wag. per Game
                      </SortableHeader>
                      <SortableHeader 
                        sortKey="actualHold" 
                        currentSort={sortConfig} 
                        onSort={handleSort}
                      >
                        Actual Hold
                      </SortableHeader>
                      <SortableHeader 
                        sortKey="theoreticalHold" 
                        currentSort={sortConfig} 
                        onSort={handleSort}
                      >
                        Theoretical Hold
                      </SortableHeader>
                      <SortableHeader 
                        sortKey="gamesPlayed" 
                        currentSort={sortConfig} 
                        onSort={handleSort}
                      >
                        Games Played
                      </SortableHeader>
                    </tr>
                  </thead>
                  <tbody>
                    {sortEvaluationData(filteredEvaluationData)
                      .slice(0, 5)
                      .map((machine) => (
                        <tr
                          key={machine.machineId}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="p-3 text-sm">
                            {machine.locationName}
                          </td>
                          <td className="p-3 text-sm font-mono">
                            {
                              (typeof (machine as Record<string, unknown>).serialNumber === "string" && ((machine as Record<string, unknown>).serialNumber as string).trim()) ||
                                (typeof (machine as Record<string, unknown>).origSerialNumber === "string" && ((machine as Record<string, unknown>).origSerialNumber as string).trim()) ||
                                (typeof (machine as Record<string, unknown>).custom === "object" && 
                                 typeof ((machine as Record<string, unknown>).custom as Record<string, unknown>)?.name === "string" && 
                                 (((machine as Record<string, unknown>).custom as Record<string, unknown>).name as string).trim()) ||
                                machine.machineId
                            }
                          </td>
                          <td className="p-3 text-sm">{machine.gameTitle}</td>
                          <td className="p-3 text-sm">
                            {machine.manufacturer}
                          </td>
                          <td className="p-3 text-sm font-medium">
                            ${(machine.drop || 0).toLocaleString()}
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
                              (machine.actualHold || 0) >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {(machine.actualHold || 0).toFixed(2)}%
                          </td>
                          <td className="p-3 text-sm text-green-600">
                            {machine.theoreticalHold.toFixed(2)}%
                          </td>
                          <td className="p-3 text-sm">
                            {machine.gamesPlayed.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View for Evaluation */}
              <div className="md:hidden space-y-4">
                {sortEvaluationData(filteredEvaluationData)
                  .slice(0, 5)
                  .map((machine) => (
                    <Card key={machine.machineId} className="p-4">
                      <div className="mb-3">
                        <h4 className="font-medium text-sm">
                          {machine.machineName || machine.machineId}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {machine.locationName} • {machine.gameTitle}
                        </p>
                      </div>
                      
                      {/* Tiny screen layout (< 425px) - Single column */}
                      <div className="block sm:hidden space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Manufacturer:</span>
                          <span className="font-medium">{machine.manufacturer}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Money In:</span>
                          <span className={`font-medium ${getFinancialColorClass(machine.drop || 0)}`}>${(machine.drop || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Win/Loss:</span>
                          <span className={`font-medium ${getFinancialColorClass(machine.netWin)}`}>
                            ${machine.netWin.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg. Wag. per Game:</span>
                          <span className="font-medium">${machine.avgBet ? machine.avgBet.toFixed(2) : "0.00"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Actual Hold:</span>
                          <span className={`font-medium ${(machine.actualHold || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(machine.actualHold || 0).toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Theoretical Hold:</span>
                          <span className="font-medium text-green-600">{machine.theoreticalHold.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Games Played:</span>
                          <span className="font-medium">{machine.gamesPlayed.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      {/* Small screen layout (425px+) - Two columns */}
                      <div className="hidden sm:grid sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Manufacturer:</span>
                          <p>{machine.manufacturer}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Money In:</span>
                          <p className={`font-medium ${getFinancialColorClass(machine.drop || 0)}`}>${(machine.drop || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Win/Loss:</span>
                          <p className={`font-medium ${getFinancialColorClass(machine.netWin)}`}>
                            ${machine.netWin.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg. Wag. per Game:</span>
                          <p>${machine.avgBet ? machine.avgBet.toFixed(2) : "0.00"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Actual Hold:</span>
                          <p className={`font-medium ${machine.actualHold >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {machine.actualHold.toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Theoretical Hold:</span>
                          <p className="text-green-600">{machine.theoreticalHold.toFixed(2)}%</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Games Played:</span>
                          <p>{machine.gamesPlayed.toLocaleString()}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
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
                <MainContentSkeleton />
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

                  {/* Desktop Table View */}
                  <div className="hidden md:block rounded-md border">
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
                              Actions
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
                              <td className="p-3">
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
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Card View for Offline Machines */}
                  <div className="md:hidden space-y-4">
                    {offlineMachinesWithDuration.map((machine) => (
                      <Card key={machine.machineId} className="p-4">
                        <div className="mb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-sm">
                                {machine.machineName}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {machine.machineId}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMachineEdit(machine)}
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50 flex-shrink-0"
                              >
                                <Pencil2Icon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMachineDelete(machine)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50 flex-shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Tiny screen layout (< 425px) - Single column */}
                        <div className="block sm:hidden space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Location:</span>
                            <span className="font-medium">{machine.locationName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last Activity:</span>
                            <span className="font-medium">{new Date(machine.lastActivity).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Offline Duration:</span>
                            <span className="font-medium">{machine.offlineDurationFormatted}</span>
                          </div>

                        </div>
                        
                        {/* Small screen layout (425px+) - Two columns */}
                        <div className="hidden sm:grid sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Location:</span>
                            <p>{machine.locationName}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Last Activity:</span>
                            <p>{new Date(machine.lastActivity).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Offline Duration:</span>
                            <p>{machine.offlineDurationFormatted}</p>
                          </div>

                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {/* Offline Machines Pagination */}
              {offlinePagination.totalPages > 1 && (
                <>
                  {/* Mobile Pagination */}
                    <div className="flex flex-col space-y-3 mt-6 sm:hidden">
                      <div className="text-xs text-gray-600 text-center">
                        Page {offlinePagination.page} of {offlinePagination.totalPages} ({offlinePagination.totalCount} offline machines)
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOfflinePageChange(1)}
                          disabled={offlinePagination.page === 1}
                          className="px-2 py-1 text-xs"
                        >
                          ««
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleOfflinePageChange(offlinePagination.page - 1)
                          }
                          disabled={!offlinePagination.hasPrevPage}
                          className="px-2 py-1 text-xs"
                        >
                          ‹
                        </Button>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-600">Page</span>
                          <input
                            type="number"
                            min={1}
                            max={offlinePagination.totalPages}
                            value={offlinePagination.page}
                            onChange={(e) => {
                              let val = Number(e.target.value);
                              if (isNaN(val)) val = 1;
                              if (val < 1) val = 1;
                              if (val > offlinePagination.totalPages) val = offlinePagination.totalPages;
                              handleOfflinePageChange(val);
                            }}
                            className="w-12 px-1 py-1 border border-gray-300 rounded text-center text-xs text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
                            aria-label="Page number"
                          />
                          <span className="text-xs text-gray-600">of {offlinePagination.totalPages}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleOfflinePageChange(offlinePagination.page + 1)
                          }
                          disabled={!offlinePagination.hasNextPage}
                          className="px-2 py-1 text-xs"
                        >
                          ›
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOfflinePageChange(offlinePagination.totalPages)}
                          disabled={offlinePagination.page === offlinePagination.totalPages}
                          className="px-2 py-1 text-xs"
                        >
                          »»
                        </Button>
                      </div>
                    </div>

                    {/* Desktop Pagination */}
                    <div className="hidden sm:flex items-center justify-between mt-6">
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
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOfflinePageChange(1)}
                          disabled={offlinePagination.page === 1}
                        >
                          First
                        </Button>
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
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Page</span>
                          <input
                            type="number"
                            min={1}
                            max={offlinePagination.totalPages}
                            value={offlinePagination.page}
                            onChange={(e) => {
                              let val = Number(e.target.value);
                              if (isNaN(val)) val = 1;
                              if (val < 1) val = 1;
                              if (val > offlinePagination.totalPages) val = offlinePagination.totalPages;
                              handleOfflinePageChange(val);
                            }}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
                            aria-label="Page number"
                          />
                          <span className="text-sm text-gray-600">of {offlinePagination.totalPages}</span>
                        </div>
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOfflinePageChange(offlinePagination.totalPages)}
                          disabled={offlinePagination.page === offlinePagination.totalPages}
                        >
                          Last
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
