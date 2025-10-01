/**
 * Refactored Machines Tab Component
 * Main component that orchestrates the three sub-tabs: Overview, Evaluation, and Offline
 */

import { useState, useCallback, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import axios from "axios";
import type {
  MachineData,
  MachineStats,
} from "@/shared/types/machines";
import { handleMachineSort } from "@/lib/helpers/reportsPage";
import { fetchMachineStats } from "@/lib/helpers/machineStats";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { useCabinetActionsStore } from "@/lib/store/cabinetActionsStore";

// Import the extracted tab components
import { MachinesOverviewTab } from "./MachinesOverviewTab";
import { MachinesEvaluationTab } from "./MachinesEvaluationTab";
import { MachinesOfflineTab } from "./MachinesOfflineTab";

export default function MachinesTabRefactored() {
  const { selectedLicencee } = useDashBoardStore();
  const { openEditModal, openDeleteModal } = useCabinetActionsStore();

  // Separate states for different purposes (streaming approach)
  const [overviewMachines, setOverviewMachines] = useState<MachineData[]>([]); // Paginated for overview
  const [allMachines] = useState<MachineData[]>([]); // All machines for performance analysis
  const [offlineMachines, setOfflineMachines] = useState<MachineData[]>([]); // Offline machines only
  const [machineStats, setMachineStats] = useState<MachineStats | null>(null); // Counts for dashboard cards

  // Manufacturer performance data
  const [manufacturerData] = useState<Array<{
    manufacturer: string;
    floorPositions: number;
    totalHandle: number;
    totalWin: number;
    totalDrop: number;
    totalCancelledCredits: number;
    totalGross: number;
  }>>([]);
  const [manufacturerLoading] = useState(false);

  // Games performance data
  const [gamesData] = useState<Array<{
    gameName: string;
    floorPositions: number;
    totalHandle: number;
    totalWin: number;
    totalDrop: number;
    totalCancelledCredits: number;
    totalGross: number;
  }>>([]);
  const [gamesLoading] = useState(false);

  // Evaluation data
  const [evaluationData, setEvaluationData] = useState<MachineData[]>([]);

  // Summary calculations
  const [locations] = useState<{ id: string; name: string; sasEnabled: boolean }[]>([]);

  // Loading states for each section
  const [statsLoading, setStatsLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [evaluationLoading, setEvaluationLoading] = useState(false);

  // Pagination for overview tab
  const [pagination, setPagination] = useState({
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

  // Sorting state for machine overview table
  const [sortConfig, setSortConfig] = useState<{
    key: keyof MachineData | 'handle' | 'avgWagerPerGame' | 'moneyIn';
    direction: 'asc' | 'desc';
  }>({
    key: 'netWin',
    direction: 'desc'
  });

  // Sorting state for evaluation data
  const [evaluationSortConfig, setEvaluationSortConfig] = useState<{
    key: keyof MachineData;
    direction: 'asc' | 'desc';
  }>({
    key: 'netWin',
    direction: 'desc'
  });

  // Sorting state for offline machines
  const [offlineSortConfig, setOfflineSortConfig] = useState<{
    key: keyof MachineData;
    direction: 'asc' | 'desc';
  }>({
    key: 'isOnline',
    direction: 'desc'
  });

  // Data fetching functions
  const fetchMachineStatsData = useCallback(async () => {
    setStatsLoading(true);
    try {
      const stats = await fetchMachineStats(selectedLicencee);
      // Convert helper type to shared type
      const convertedStats = {
        onlineCount: stats.onlineMachines,
        offlineCount: stats.offlineMachines,
        totalCount: stats.totalMachines,
        totalGross: 0, // Not available in helper
        totalDrop: 0, // Not available in helper
        totalCancelledCredits: 0, // Not available in helper
      };
      setMachineStats(convertedStats);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching machine stats:", error);
      }
      toast.error("Failed to fetch machine statistics");
    } finally {
      setStatsLoading(false);
    }
  }, [selectedLicencee]);

  const fetchOverviewMachines = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const response = await axios.get("/api/analytics/machines", {
        params: {
          licensee: selectedLicencee,
          page: pagination.page,
          limit: pagination.limit,
          sortBy: sortConfig.key,
          sortOrder: sortConfig.direction,
        },
      });
      
      if (response.data?.success) {
        setOverviewMachines(response.data.data || []);
        setPagination(prev => ({
          ...prev,
          totalCount: response.data.totalCount || 0,
          totalPages: response.data.totalPages || 1,
          hasNextPage: response.data.hasNextPage || false,
          hasPrevPage: response.data.hasPrevPage || false,
        }));
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching overview machines:", error);
      }
      toast.error("Failed to fetch machine data");
    } finally {
      setOverviewLoading(false);
    }
  }, [selectedLicencee, pagination.page, pagination.limit, sortConfig]);

  const fetchOfflineMachines = useCallback(async () => {
    setOfflineLoading(true);
    try {
      const response = await axios.get("/api/analytics/machines/offline", {
        params: {
          licensee: selectedLicencee,
          page: offlinePagination.page,
          limit: offlinePagination.limit,
          sortBy: offlineSortConfig.key,
          sortOrder: offlineSortConfig.direction,
        },
      });
      
      if (response.data?.success) {
        setOfflineMachines(response.data.data || []);
        setOfflinePagination(prev => ({
          ...prev,
          totalCount: response.data.totalCount || 0,
          totalPages: response.data.totalPages || 1,
          hasNextPage: response.data.hasNextPage || false,
          hasPrevPage: response.data.hasPrevPage || false,
        }));
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching offline machines:", error);
      }
      toast.error("Failed to fetch offline machines");
    } finally {
      setOfflineLoading(false);
    }
  }, [selectedLicencee, offlinePagination.page, offlinePagination.limit, offlineSortConfig]);

  const fetchEvaluationData = useCallback(async () => {
    setEvaluationLoading(true);
    try {
      const response = await axios.get("/api/analytics/machines/evaluation", {
        params: {
          licensee: selectedLicencee,
          sortBy: evaluationSortConfig.key,
          sortOrder: evaluationSortConfig.direction,
        },
      });
      
      if (response.data?.success) {
        setEvaluationData(response.data.data || []);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching evaluation data:", error);
      }
      toast.error("Failed to fetch evaluation data");
    } finally {
      setEvaluationLoading(false);
    }
  }, [selectedLicencee, evaluationSortConfig]);

  // Handle sort for overview machines
  const handleOverviewSort = useCallback((key: keyof MachineData | 'handle' | 'avgWagerPerGame' | 'moneyIn') => {
    handleMachineSort(key, setSortConfig);
  }, []);

  // Handle sort for evaluation data
  const handleEvaluationSort = useCallback((key: keyof MachineData) => {
    setEvaluationSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  }, []);

  // Handle sort for offline machines
  const handleOfflineSort = useCallback((key: keyof MachineData) => {
    setOfflineSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  }, []);

  // Handle page change for overview
  const handleOverviewPageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  // Handle page change for offline machines
  const handleOfflinePageChange = useCallback((page: number) => {
    setOfflinePagination(prev => ({ ...prev, page }));
  }, []);

  // Handle refresh for all data
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchMachineStatsData(),
      fetchOverviewMachines(),
      fetchOfflineMachines(),
      fetchEvaluationData(),
    ]);
    toast.success("Data refreshed successfully");
  }, [fetchMachineStatsData, fetchOverviewMachines, fetchOfflineMachines, fetchEvaluationData]);

  // Handle export for all data
  const handleExport = useCallback(async () => {
    try {
      const response = await axios.get("/api/analytics/machines/export", {
        params: { licensee: selectedLicencee },
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `machines-report-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Export completed successfully");
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error exporting data:", error);
      }
      toast.error("Failed to export data");
    }
  }, [selectedLicencee]);

  // Initial data fetching
  useEffect(() => {
    fetchMachineStatsData();
    fetchOverviewMachines();
  }, [fetchMachineStatsData, fetchOverviewMachines]);

  // Fetch data when sort config changes
  useEffect(() => {
    fetchOverviewMachines();
  }, [fetchOverviewMachines]);

  useEffect(() => {
    fetchOfflineMachines();
  }, [fetchOfflineMachines]);

  useEffect(() => {
    fetchEvaluationData();
  }, [fetchEvaluationData]);

  // Handle edit for machines
  const handleEdit = useCallback((machine: MachineData) => {
    // Convert MachineData to GamingMachine format for the modal
    const gamingMachine = {
      _id: machine.machineId,
      serialNumber: machine.serialNumber || machine.machineId,
      relayId: machine.machineId,
      game: machine.gameTitle,
      gameType: machine.machineType,
      isCronosMachine: false,
      cabinetType: machine.machineType,
      assetStatus: machine.isOnline ? "active" : "inactive",
      manufacturer: machine.manufacturer,
      gamingLocation: machine.locationName,
      accountingDenomination: 1,
      lastActivity: machine.lastActivity,
      online: machine.isOnline,
      moneyIn: machine.coinIn,
      moneyOut: machine.coinOut,
      jackpot: machine.jackpot,
      cancelledCredits: machine.totalCancelledCredits,
      gross: machine.gross,
      coinIn: machine.coinIn,
      coinOut: machine.coinOut,
      gamesPlayed: machine.gamesPlayed,
      gamesWon: machine.gamesWon || 0,
      handle: machine.coinIn,
      custom: { name: machine.serialNumber || machine.machineId || "Unknown" },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Open the edit modal
    openEditModal(gamingMachine);
  }, [openEditModal]);

  // Handle delete for machines
  const handleDelete = useCallback((machine: MachineData) => {
    // Convert MachineData to GamingMachine format for the modal
    const gamingMachine = {
      _id: machine.machineId,
      serialNumber: machine.serialNumber || machine.machineId,
      relayId: machine.machineId,
      game: machine.gameTitle,
      gameType: machine.machineType,
      isCronosMachine: false,
      cabinetType: machine.machineType,
      assetStatus: machine.isOnline ? "active" : "inactive",
      manufacturer: machine.manufacturer,
      gamingLocation: machine.locationName,
      accountingDenomination: 1,
      lastActivity: machine.lastActivity,
      online: machine.isOnline,
      moneyIn: machine.coinIn,
      moneyOut: machine.coinOut,
      jackpot: machine.jackpot,
      cancelledCredits: machine.totalCancelledCredits,
      gross: machine.gross,
      coinIn: machine.coinIn,
      coinOut: machine.coinOut,
      gamesPlayed: machine.gamesPlayed,
      gamesWon: machine.gamesWon || 0,
      handle: machine.coinIn,
      custom: { name: machine.serialNumber || machine.machineId || "Unknown" },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Open the delete modal
    openDeleteModal(gamingMachine);
  }, [openDeleteModal]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="overview"
            className="flex items-center gap-2"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="evaluation"
            className="flex items-center gap-2"
          >
            Evaluation
          </TabsTrigger>
          <TabsTrigger
            value="offline"
            className="flex items-center gap-2"
          >
            Offline
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <MachinesOverviewTab
            overviewMachines={overviewMachines}
            allMachines={allMachines}
            machineStats={machineStats}
            manufacturerData={manufacturerData}
            gamesData={gamesData}
            locations={locations}
            overviewLoading={overviewLoading}
            manufacturerLoading={manufacturerLoading}
            gamesLoading={gamesLoading}
            statsLoading={statsLoading}
            pagination={pagination}
            sortConfig={sortConfig}
            onSort={handleOverviewSort}
            onPageChange={handleOverviewPageChange}
            onRefresh={handleRefresh}
            onExport={handleExport}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        {/* Evaluation Tab */}
        <TabsContent value="evaluation" className="space-y-6 mt-2">
          <MachinesEvaluationTab
            evaluationData={evaluationData}
            locations={locations}
            evaluationLoading={evaluationLoading}
            sortConfig={evaluationSortConfig}
            onSort={handleEvaluationSort}
            onRefresh={handleRefresh}
            onExport={handleExport}
          />
        </TabsContent>

        {/* Offline Tab */}
        <TabsContent value="offline" className="space-y-4">
          <MachinesOfflineTab
            offlineMachines={offlineMachines}
            locations={locations}
            offlineLoading={offlineLoading}
            offlinePagination={offlinePagination}
            sortConfig={offlineSortConfig}
            onSort={handleOfflineSort}
            onPageChange={handleOfflinePageChange}
            onRefresh={handleRefresh}
            onExport={handleExport}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
