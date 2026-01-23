/**
 * Reports Machines Tab Component
 *
 * Main orchestration component for the machines reports.
 * Manages shared state, data fetching via custom hooks, and delegates
 * rendering to sub-tab components: Overview, Evaluation, and Offline.
 *
 * @module components/reports/tabs/machines/ReportsMachinesTab
 */

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import CabinetsDeleteCabinetModal from '@/components/CMS/cabinets/modals/CabinetsDeleteCabinetModal';
import CabinetsEditCabinetModal from '@/components/CMS/cabinets/modals/CabinetsEditCabinetModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';

import { useLocationMachineStats, useMachinesTabData } from '@/lib/hooks/data';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useCabinetsActionsStore } from '@/lib/store/cabinetActionsStore';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useDebounce } from '@/lib/utils/hooks';

import {
  calculateOfflineDurationHours,
  calculateParetoStatement,
  getPerformanceRating
} from '@/lib/helpers/machines';
import { handleExportMeters as handleExportMetersHelper } from '@/lib/helpers/reports';

import { ReportsMachinesEvaluation } from './ReportsMachinesEvaluation';
import { ReportsMachinesOffline } from './ReportsMachinesOffline';
import { ReportsMachinesOverview } from './ReportsMachinesOverview';

import type { MachineEvaluationData } from '@/lib/types';
import type { TopMachinesCriteria } from '@/lib/types/reports';
import type { MachineData } from '@/shared/types/machines';

/**
 * Main ReportsMachinesTab Component
 */
const ITEMS_PER_PAGE = 20;
// Fetch 100 items at a time (5 pages worth)
const ITEMS_PER_BATCH = 100;
const PAGES_PER_BATCH = ITEMS_PER_BATCH / ITEMS_PER_PAGE; // 5

export default function ReportsMachinesTab() {
  // ============================================================================
  // Hooks & Context
  // ============================================================================
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { displayCurrency } = useCurrencyFormat();
  const { openEditModal, openDeleteModal } = useCabinetsActionsStore();
  const { selectedLicencee, customDateRange, activeMetricsFilter } =
    useDashBoardStore();

  // ============================================================================
  // State: Tab & Filters
  // ============================================================================
  const [activeTab, setActiveTab] = useState<string>(
    searchParams?.get('mtab') || 'overview'
  );

  // Overview filters
  const [searchTerm, setSearchTerm] = useState('');
  const [overviewSelectedLocation, setOverviewSelectedLocation] =
    useState<string>('all');
  const [onlineStatusFilter, setOnlineStatusFilter] = useState<string>('all');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Evaluation filters
  const [evaluationSelectedLocations, setEvaluationSelectedLocations] =
    useState<string[]>([]);

  // Offline filters
  const [offlineSelectedLocations, setOfflineSelectedLocations] = useState<
    string[]
  >([]);
  const [offlineSearchTerm, setOfflineSearchTerm] = useState('');
  const [selectedOfflineDuration, setSelectedOfflineDuration] =
    useState<string>('all');
  const debouncedOfflineSearchTerm = useDebounce(offlineSearchTerm, 500);

  // ============================================================================
  // State: Sorting & Pagination
  // ============================================================================
  const [sortConfig, setSortConfig] = useState<{
    key: keyof MachineData | 'offlineDurationHours';
    direction: 'asc' | 'desc';
  }>({
    key: 'netWin',
    direction: 'desc',
  });

  const [topMachinesSortKey, setTopMachinesSortKey] =
    useState<TopMachinesCriteria>('netWin');
  const [topMachinesSortDirection] = useState<'asc' | 'desc'>('desc');

  const [bottomMachinesSortKey, setBottomMachinesSortKey] =
    useState<TopMachinesCriteria>('netWin');
  const [bottomMachinesSortDirection] = useState<'asc' | 'desc'>('asc');

  // ============================================================================
  // Data Fetching Hook
  // ============================================================================
  // Pass batch size for API requests
  const {
    machineStats,
    allOverviewMachines,
    allOfflineMachines,
    allMachines,
    locations,
    overviewTotalCount,
    offlineTotalCount,
    statsLoading,
    overviewLoading,
    offlineLoading,
    evaluationLoading,
    fetchMachineStats,
    fetchOverviewMachines,
    fetchOfflineMachines,
    fetchAllMachines,
    fetchLocationsData,
    setStatsLoading,
    setOverviewLoading,
    setEvaluationLoading,
    setOfflineLoading,
    setAllOfflineMachines,
  } = useMachinesTabData(activeTab, displayCurrency, ITEMS_PER_BATCH, ITEMS_PER_BATCH);

  // Pagination State - Local (for UI)
  const [overviewCurrentPage, setOverviewCurrentPage] = useState(0);
  const [overviewLoadedBatches, setOverviewLoadedBatches] = useState<Set<number>>(new Set([1]));

  const [offlineCurrentPage, setOfflineCurrentPage] = useState(0);
  const [offlineLoadedBatches, setOfflineLoadedBatches] = useState<Set<number>>(new Set([1]));

  const calculateBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / PAGES_PER_BATCH) + 1;
    },
    []
  );

  // Get machine stats - pass locationId(s) when specific locations are selected for offline tab
  // Multiple locations are passed as comma-separated string (API handles this)
  // useLocationMachineStats takes locationId as first param, licensee is handled internally
  const effectiveLocationIdForStats =
    activeTab === 'offline' && offlineSelectedLocations.length > 0
      ? offlineSelectedLocations.join(',') // Pass all selected locations as comma-separated
      : undefined; // No locations selected - show aggregate stats for all

  const {
    machineStats: locationMachineStats,
    machineStatsLoading: locationMachineStatsLoading,
    refreshMachineStats: refreshLocationMachineStats,
  } = useLocationMachineStats(effectiveLocationIdForStats);

  // ============================================================================
  // Computed Values: Evaluation
  // ============================================================================

  const evaluationData = useMemo((): MachineEvaluationData[] => {
    return allMachines.map(machine => {
      const theoreticalHold = machine.theoreticalHold || 0;
      const actualHold = machine.actualHold || 0;
      const holdDifference = actualHold - theoreticalHold;

      return {
        machineId: machine.machineId,
        serialNumber: machine.serialNumber || machine.machineId,
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
        cancelledCredits: machine.totalCancelledCredits || 0,
        jackpot: machine.jackpot || 0,
        averageWager:
          machine.gamesPlayed > 0
            ? (machine.coinIn || 0) / machine.gamesPlayed
            : 0,
      };
    });
  }, [allMachines]);

  const filteredEvaluationData = useMemo(() => {
    return evaluationData.filter(machine => {
      return (
        evaluationSelectedLocations.length === 0 ||
        evaluationSelectedLocations.includes(machine.locationId)
      );
    });
  }, [evaluationData, evaluationSelectedLocations]);

  const summaryCalculations = useMemo(() => {
    const totalHandle = filteredEvaluationData.reduce(
      (sum, m) => sum + (m.coinIn || 0),
      0
    );
    const totalWin = filteredEvaluationData.reduce(
      (sum, m) => sum + (m.netWin || 0),
      0
    );
    const totalGamesPlayed = filteredEvaluationData.reduce(
      (sum, m) => sum + (m.gamesPlayed || 0),
      0
    );

    const handleResult = calculateParetoStatement(
      filteredEvaluationData,
      m => m.coinIn || 0,
      totalHandle,
      'Handle'
    );
    const winResult = calculateParetoStatement(
      filteredEvaluationData,
      m => m.netWin || 0,
      totalWin,
      'Win'
    );
    const gamesPlayedResult = calculateParetoStatement(
      filteredEvaluationData,
      m => m.gamesPlayed || 0,
      totalGamesPlayed,
      'Games Played'
    );

    return {
      handleStatement: handleResult.statement,
      winStatement: winResult.statement,
      gamesPlayedStatement: gamesPlayedResult.statement,
      handleDetails: handleResult.details,
      winDetails: winResult.details,
      gamesPlayedDetails: gamesPlayedResult.details,
    };
  }, [filteredEvaluationData]);

  // Chart data calculations
  const manufacturerData = useMemo(() => {
    if (!filteredEvaluationData.length) return [];

    const activeMachinesNumber = filteredEvaluationData.length;
    const totals = filteredEvaluationData.reduce(
      (acc, m) => ({
        coinIn: acc.coinIn + (m.coinIn || 0),
        netWin: acc.netWin + (m.netWin || 0),
        drop: acc.drop + (m.drop || 0),
        gross: acc.gross + (m.gross || 0),
        cancelledCredits: acc.cancelledCredits + (m.cancelledCredits || 0),
        gamesPlayed: acc.gamesPlayed + (m.gamesPlayed || 0),
      }),
      {
        coinIn: 0,
        netWin: 0,
        drop: 0,
        gross: 0,
        cancelledCredits: 0,
        gamesPlayed: 0,
      }
    );

    const grouped = filteredEvaluationData.reduce(
      (acc, machine) => {
        const mfr = (machine.manufacturer || 'Unknown').trim();
        if (!acc[mfr]) acc[mfr] = [];
        acc[mfr].push(machine);
        return acc;
      },
      {} as Record<string, MachineEvaluationData[]>
    );

    return Object.entries(grouped).map(([mfr, machines]) => {
      const mfrTotals = machines.reduce(
        (acc, m) => ({
          coinIn: acc.coinIn + (m.coinIn || 0),
          netWin: acc.netWin + (m.netWin || 0),
          drop: acc.drop + (m.drop || 0),
          gross: acc.gross + (m.gross || 0),
          cancelledCredits: acc.cancelledCredits + (m.cancelledCredits || 0),
          gamesPlayed: acc.gamesPlayed + (m.gamesPlayed || 0),
        }),
        {
          coinIn: 0,
          netWin: 0,
          drop: 0,
          gross: 0,
          cancelledCredits: 0,
          gamesPlayed: 0,
        }
      );

      return {
        manufacturer: mfr,
        floorPositions: (machines.length / activeMachinesNumber) * 100,
        totalHandle:
          totals.coinIn > 0 ? (mfrTotals.coinIn / totals.coinIn) * 100 : 0,
        totalWin:
          totals.netWin > 0 ? (mfrTotals.netWin / totals.netWin) * 100 : 0,
        totalDrop: totals.drop > 0 ? (mfrTotals.drop / totals.drop) * 100 : 0,
        totalCancelledCredits:
          totals.cancelledCredits > 0
            ? (mfrTotals.cancelledCredits / totals.cancelledCredits) * 100
            : 0,
        totalGross:
          totals.gross > 0 ? (mfrTotals.gross / totals.gross) * 100 : 0,
        totalGamesPlayed:
          totals.gamesPlayed > 0
            ? (mfrTotals.gamesPlayed / totals.gamesPlayed) * 100
            : 0,
      };
    });
  }, [filteredEvaluationData]);

  const gamesData = useMemo(() => {
    if (!filteredEvaluationData.length) return [];

    const activeMachinesNumber = filteredEvaluationData.length;
    const totals = filteredEvaluationData.reduce(
      (acc, m) => ({
        coinIn: acc.coinIn + (m.coinIn || 0),
        netWin: acc.netWin + (m.netWin || 0),
        drop: acc.drop + (m.drop || 0),
        gross: acc.gross + (m.gross || 0),
        cancelledCredits: acc.cancelledCredits + (m.cancelledCredits || 0),
        gamesPlayed: acc.gamesPlayed + (m.gamesPlayed || 0),
      }),
      {
        coinIn: 0,
        netWin: 0,
        drop: 0,
        gross: 0,
        cancelledCredits: 0,
        gamesPlayed: 0,
      }
    );

    const grouped = filteredEvaluationData.reduce(
      (acc, machine) => {
        const game = (machine.gameTitle || 'Unknown').trim();
        if (!acc[game]) acc[game] = [];
        acc[game].push(machine);
        return acc;
      },
      {} as Record<string, MachineEvaluationData[]>
    );

    return Object.entries(grouped).map(([game, machines]) => {
      const gameTotals = machines.reduce(
        (acc, m) => ({
          coinIn: acc.coinIn + (m.coinIn || 0),
          netWin: acc.netWin + (m.netWin || 0),
          drop: acc.drop + (m.drop || 0),
          gross: acc.gross + (m.gross || 0),
          cancelledCredits: acc.cancelledCredits + (m.cancelledCredits || 0),
          gamesPlayed: acc.gamesPlayed + (m.gamesPlayed || 0),
        }),
        {
          coinIn: 0,
          netWin: 0,
          drop: 0,
          gross: 0,
          cancelledCredits: 0,
          gamesPlayed: 0,
        }
      );

      return {
        gameName: game,
        floorPositions: (machines.length / activeMachinesNumber) * 100,
        totalHandle:
          totals.coinIn > 0 ? (gameTotals.coinIn / totals.coinIn) * 100 : 0,
        totalWin:
          totals.netWin > 0 ? (gameTotals.netWin / totals.netWin) * 100 : 0,
        totalDrop: totals.drop > 0 ? (gameTotals.drop / totals.drop) * 100 : 0,
        totalCancelledCredits:
          totals.cancelledCredits > 0
            ? (gameTotals.cancelledCredits / totals.cancelledCredits) * 100
            : 0,
        totalGross:
          totals.gross > 0 ? (gameTotals.gross / totals.gross) * 100 : 0,
        totalGamesPlayed:
          totals.gamesPlayed > 0
            ? (gameTotals.gamesPlayed / totals.gamesPlayed) * 100
            : 0,
      };
    });
  }, [filteredEvaluationData]);

  // Top and Bottom machines
  const topMachines = useMemo(() => {
    return [...filteredEvaluationData]
      .sort((a, b) => {
        const aVal = a[
          topMachinesSortKey as keyof MachineEvaluationData
        ] as number;
        const bVal = b[
          topMachinesSortKey as keyof MachineEvaluationData
        ] as number;
        return topMachinesSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      })
      .slice(0, 5);
  }, [filteredEvaluationData, topMachinesSortKey, topMachinesSortDirection]);

  const bottomMachines = useMemo(() => {
    return [...filteredEvaluationData]
      .sort((a, b) => {
        const aVal = a[
          bottomMachinesSortKey as keyof MachineEvaluationData
        ] as number;
        const bVal = b[
          bottomMachinesSortKey as keyof MachineEvaluationData
        ] as number;
        return bottomMachinesSortDirection === 'asc'
          ? aVal - bVal
          : bVal - aVal;
      })
      .slice(0, 5);
  }, [
    filteredEvaluationData,
    bottomMachinesSortKey,
    bottomMachinesSortDirection,
  ]);

  // ============================================================================
  // Computed Values: Overview & Offline
  // ============================================================================

  const paginatedOverviewMachines = useMemo(() => {
    const startIndex = overviewCurrentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return allOverviewMachines.slice(startIndex, endIndex);
  }, [allOverviewMachines, overviewCurrentPage]);

  const overviewTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(overviewTotalCount / ITEMS_PER_PAGE));
  }, [overviewTotalCount]);

  const paginatedOfflineMachines = useMemo(() => {
    // Clone and sort first
    const sorted = [...allOfflineMachines].sort((a, b) => {
      const { key, direction } = sortConfig;
      const factor = direction === 'asc' ? 1 : -1;

      if (key === 'offlineDurationHours') {
        const durA = calculateOfflineDurationHours(a.lastActivity);
        const durB = calculateOfflineDurationHours(b.lastActivity);
        return (durA - durB) * factor;
      }

      // Handle standard keys
      let valA = a[key as keyof MachineData];
      let valB = b[key as keyof MachineData];

      // Handle null/undefined values
      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB) * factor;
      }

      // Default to numeric comparison
      valA = (valA as number) || 0;
      valB = (valB as number) || 0;
      return (valA - valB) * factor;
    });

    const startIndex = offlineCurrentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sorted.slice(startIndex, endIndex);
  }, [allOfflineMachines, offlineCurrentPage, sortConfig]);

  const offlineTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(offlineTotalCount / ITEMS_PER_PAGE));
  }, [offlineTotalCount]);

  // ============================================================================
  // Handlers
  // ============================================================================

  // Helper function to convert MachineData to partial GamingMachine for modals
  const machineToGamingMachine = useCallback((machine: MachineData) => {
    return {
      _id: machine.machineId,
      machineId: machine.machineId,
      serialNumber: machine.serialNumber || machine.machineId,
      relayId: machine.machineId, // Use machineId as fallback
      custom: { name: machine.customName || machine.machineName },
      game: machine.gameTitle,
      gameType: machine.machineType || '',
      isCronosMachine: false,
      cabinetType: '',
      assetStatus: machine.isOnline ? 'online' : 'offline',
      manufacturer: machine.manufacturer,
      gamingLocation: machine.locationId,
      accountingDenomination: 1,
      lastActivity: machine.lastActivity,
      online: machine.isOnline,
      loggedIn: machine.isOnline,
    } as Parameters<typeof openEditModal>[0];
  }, []);

  // Wrapper functions to convert MachineData to GamingMachine for modals
  const handleEdit = useCallback(
    (machine: MachineData) => {
      openEditModal(machineToGamingMachine(machine));
    },
    [openEditModal, machineToGamingMachine]
  );

  const handleDelete = useCallback(
    (machine: MachineData) => {
      openDeleteModal(machineToGamingMachine(machine));
    },
    [openDeleteModal, machineToGamingMachine]
  );

  const handleRefresh = useCallback(async () => {
    setStatsLoading(true);
    setOverviewLoading(true);
    setEvaluationLoading(true);
    setOfflineLoading(true);
    try {
      await Promise.all([
        fetchMachineStats(),
        refreshLocationMachineStats(),
        fetchOverviewMachines(
          1,
          searchTerm,
          overviewSelectedLocation,
          onlineStatusFilter
        ),
        fetchAllMachines(evaluationSelectedLocations),
        offlineSelectedLocations.length > 0
          ? fetchOfflineMachines(
              1,
              offlineSearchTerm,
              offlineSelectedLocations.join(',')
            )
          : (setAllOfflineMachines([]), Promise.resolve()),
      ]);
      toast.success('Data refreshed successfully');
    } finally {
      setStatsLoading(false);
      setOverviewLoading(false);
      setEvaluationLoading(false);
      setOfflineLoading(false);
    }
  }, [
    setStatsLoading,
    setOverviewLoading,
    setEvaluationLoading,
    setOfflineLoading,
    fetchMachineStats,
    refreshLocationMachineStats,
    fetchOverviewMachines,
    fetchAllMachines,
    fetchOfflineMachines,
    searchTerm,
    overviewSelectedLocation,
    onlineStatusFilter,
    evaluationSelectedLocations,
    offlineSearchTerm,
    offlineSelectedLocations,
    setAllOfflineMachines,
  ]);

  const handleExport = useCallback(
    async (format: 'pdf' | 'excel') => {
      if (activeTab === 'evaluation') {
        const { handleExportMachinesEvaluation } = await import(
          '@/lib/helpers/reports'
        );
        await handleExportMachinesEvaluation(
          manufacturerData,
          gamesData,
          topMachines,
          bottomMachines,
          summaryCalculations,
          customDateRange
            ? {
                start: customDateRange.startDate,
                end: customDateRange.endDate,
              }
            : null,
          activeMetricsFilter || 'Today',
          format,
          toast
        );
      } else {
        await handleExportMetersHelper(
          activeTab,
          allOverviewMachines,
          allOfflineMachines,
          activeMetricsFilter,
          customDateRange,
          format,
          toast
        );
      }
    },
    [
      activeTab,
      allOverviewMachines,
      allOfflineMachines,
      activeMetricsFilter,
      customDateRange,
      manufacturerData,
      gamesData,
      topMachines,
      bottomMachines,
      summaryCalculations,
    ]
  );

  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      const sp = new URLSearchParams(searchParams?.toString() || '');
      sp.set('mtab', tab);
      sp.set('section', 'machines');
      router.replace(`${pathname}?${sp.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    fetchMachineStats();
    fetchLocationsData();
  }, [
    fetchMachineStats,
    fetchLocationsData,
    selectedLicencee,
    customDateRange,
  ]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchOverviewMachines(
        1,
        debouncedSearchTerm,
        overviewSelectedLocation,
        onlineStatusFilter
      );
    }
  }, [
    activeTab,
    debouncedSearchTerm,
    overviewSelectedLocation,
    onlineStatusFilter,
    selectedLicencee,
    customDateRange,
    fetchOverviewMachines,
  ]);

  useEffect(() => {
    if (activeTab === 'evaluation') {
      fetchAllMachines(evaluationSelectedLocations);
    }
  }, [
    activeTab,
    evaluationSelectedLocations,
    selectedLicencee,
    customDateRange,
    fetchAllMachines,
  ]);

  useEffect(() => {
    if (activeTab === 'offline') {
      // Only fetch data if at least one location is selected
      if (offlineSelectedLocations.length > 0) {
        const locationParam = offlineSelectedLocations.join(',');
        fetchOfflineMachines(
          1,
          debouncedOfflineSearchTerm,
          locationParam,
          selectedOfflineDuration
        );
      } else {
        // Clear data when no locations are selected
        setAllOfflineMachines([]);
        setOfflineLoading(false);
      }
    }
  }, [
    activeTab,
    debouncedOfflineSearchTerm,
    offlineSelectedLocations,
    selectedOfflineDuration,
    selectedLicencee,
    customDateRange,
    fetchOfflineMachines,
    setAllOfflineMachines,
    setOfflineLoading,
  ]);

  // Batch loading effect for Overview
  useEffect(() => {
    if (overviewLoading || !activeMetricsFilter || searchTerm.trim()) return;

    const currentBatch = calculateBatchNumber(overviewCurrentPage);
    const isLastPageOfBatch = (overviewCurrentPage + 1) % PAGES_PER_BATCH === 0;
    const nextBatch = currentBatch + 1;

    if ((isLastPageOfBatch && !overviewLoadedBatches.has(nextBatch)) || !overviewLoadedBatches.has(currentBatch)) {
      const batchToLoad = isLastPageOfBatch ? nextBatch : currentBatch;
      fetchOverviewMachines(batchToLoad, searchTerm, overviewSelectedLocation, onlineStatusFilter);
      setOverviewLoadedBatches(prev => new Set([...prev, batchToLoad]));
    }
  }, [
    overviewCurrentPage,
    overviewLoading,
    activeMetricsFilter,
    searchTerm,
    overviewLoadedBatches,
    fetchOverviewMachines,
    calculateBatchNumber,
    overviewSelectedLocation,
    onlineStatusFilter,
  ]);

  // Batch loading effect for Offline
  useEffect(() => {
    if (offlineLoading || !activeMetricsFilter || offlineSearchTerm.trim()) return;

    const currentBatch = calculateBatchNumber(offlineCurrentPage);
    const isLastPageOfBatch = (offlineCurrentPage + 1) % PAGES_PER_BATCH === 0;
    const nextBatch = currentBatch + 1;

    if ((isLastPageOfBatch && !offlineLoadedBatches.has(nextBatch)) || !offlineLoadedBatches.has(currentBatch)) {
      const batchToLoad = isLastPageOfBatch ? nextBatch : currentBatch;
      fetchOfflineMachines(
        batchToLoad, 
        offlineSearchTerm, 
        offlineSelectedLocations.length > 0 && !offlineSelectedLocations.includes('all') ? offlineSelectedLocations.join(',') : 'all', 
        selectedOfflineDuration
      );
      setOfflineLoadedBatches(prev => new Set([...prev, batchToLoad]));
    }
  }, [
    offlineCurrentPage,
    offlineLoading,
    activeMetricsFilter,
    offlineSearchTerm,
    offlineLoadedBatches,
    fetchOfflineMachines,
    calculateBatchNumber,
    offlineSelectedLocations,
    selectedOfflineDuration,
  ]);

  // Reset pages when filters change
  useEffect(() => {
    setOverviewCurrentPage(0);
    setOverviewLoadedBatches(new Set([1]));
  }, [
    debouncedSearchTerm,
    overviewSelectedLocation,
    onlineStatusFilter,
    selectedLicencee,
    customDateRange,
  ]);

  useEffect(() => {
    setOfflineCurrentPage(0);
    setOfflineLoadedBatches(new Set([1]));
  }, [
    debouncedOfflineSearchTerm,
    offlineSelectedLocations,
    selectedOfflineDuration,
    selectedLicencee,
    customDateRange,
  ]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Machine Performance
        </h2>
        <p className="text-sm text-gray-600">
          Monitor and analyze individual machine performance across locations
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        {/* Desktop Navigation */}
        <TabsList className="mb-6 hidden w-full grid-cols-3 rounded-lg bg-gray-100 p-2 shadow-sm md:grid">
          <TabsTrigger
            value="overview"
            className="flex-1 rounded bg-white px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="evaluation"
            className="flex-1 rounded bg-white px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Evaluation
          </TabsTrigger>
          <TabsTrigger
            value="offline"
            className="flex-1 rounded bg-white px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Offline
          </TabsTrigger>
        </TabsList>

        {/* Mobile Navigation */}
        <div className="mb-6 md:hidden">
          <select
            value={activeTab}
            onChange={e => handleTabChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
          >
            <option value="overview">Overview</option>
            <option value="evaluation">Evaluation</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        <TabsContent value="overview">
          <ReportsMachinesOverview
            overviewMachines={paginatedOverviewMachines}
            allMachines={allMachines}
            machineStats={machineStats}
            manufacturerData={manufacturerData}
            gamesData={gamesData}
            locations={locations}
            searchTerm={searchTerm}
            selectedLocation={overviewSelectedLocation}
            onlineStatusFilter={onlineStatusFilter}
            overviewLoading={overviewLoading}
            statsLoading={statsLoading}
            manufacturerLoading={evaluationLoading}
            gamesLoading={evaluationLoading}
            pagination={{
              page: overviewCurrentPage + 1,
              limit: ITEMS_PER_PAGE,
              totalCount: overviewTotalCount,
              totalPages: overviewTotalPages,
              hasNextPage: overviewCurrentPage < overviewTotalPages - 1,
              hasPrevPage: overviewCurrentPage > 0,
            }}
            sortConfig={{
              key: sortConfig.key as keyof MachineData,
              direction: sortConfig.direction,
            }}
            onSearchChange={setSearchTerm}
            onLocationChange={setOverviewSelectedLocation}
            onStatusChange={setOnlineStatusFilter}
            onSort={(key: keyof MachineData) =>
              setSortConfig({
                key,
                direction:
                  sortConfig.key === key && sortConfig.direction === 'desc'
                    ? 'asc'
                    : 'desc',
              })
            }
            onPageChange={(page: number) => setOverviewCurrentPage(page - 1)}
            onRefresh={handleRefresh}
            onExport={handleExport}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="evaluation">
          <ReportsMachinesEvaluation
            evaluationData={filteredEvaluationData}
            allMachines={filteredEvaluationData}
            manufacturerData={manufacturerData}
            gamesData={gamesData}
            locations={locations}
            selectedLocationIds={evaluationSelectedLocations}
            evaluationLoading={evaluationLoading}
            topMachinesSortKey={topMachinesSortKey}
            topMachinesSortDirection={topMachinesSortDirection}
            bottomMachinesSortKey={bottomMachinesSortKey}
            bottomMachinesSortDirection={bottomMachinesSortDirection}
            summaryCalculations={summaryCalculations}
            topMachines={topMachines}
            bottomMachines={bottomMachines}
            onLocationChange={setEvaluationSelectedLocations}
            onTopMachinesSort={setTopMachinesSortKey}
            onBottomMachinesSort={setBottomMachinesSortKey}
            onRefresh={handleRefresh}
            onExport={handleExport}
          />
        </TabsContent>

        <TabsContent value="offline">
          <ReportsMachinesOffline
            offlineMachines={paginatedOfflineMachines}
            locations={locations}
            searchTerm={offlineSearchTerm}
            selectedLocations={offlineSelectedLocations || []}
            selectedOfflineDuration={selectedOfflineDuration}
            offlineLoading={offlineLoading}
            machineStats={locationMachineStats}
            machineStatsLoading={locationMachineStatsLoading}
            allOfflineMachines={allOfflineMachines}
            offlinePagination={{
              page: offlineCurrentPage + 1,
              limit: ITEMS_PER_PAGE,
              totalCount: offlineTotalCount,
              totalPages: offlineTotalPages,
              hasNextPage: offlineCurrentPage < offlineTotalPages - 1,
              hasPrevPage: offlineCurrentPage > 0,
            }}
            sortConfig={{
              key: sortConfig.key as keyof MachineData | 'offlineDurationHours',
              direction: sortConfig.direction,
            }}
            onSearchChange={setOfflineSearchTerm}
            onLocationChange={setOfflineSelectedLocations}
            onDurationChange={setSelectedOfflineDuration}
            onSort={key =>
              setSortConfig({
                key,
                direction:
                  sortConfig.key === key && sortConfig.direction === 'desc'
                    ? 'asc'
                    : 'desc',
              })
            }
            onPageChange={page => setOfflineCurrentPage(page - 1)}
            onRefresh={handleRefresh}
            onExport={handleExport}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>
      </Tabs>

      <CabinetsEditCabinetModal onCabinetUpdated={handleRefresh} />
      <CabinetsDeleteCabinetModal onCabinetDeleted={handleRefresh} />
    </div>
  );
}

