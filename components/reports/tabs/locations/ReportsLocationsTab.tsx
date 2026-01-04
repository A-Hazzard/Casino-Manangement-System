/**
 * Reports Locations Tab Component
 *
 * Main component for the Locations reports section with three tabs:
 * - Overview: All locations with metrics, map, and table
 * - SAS Evaluation: SAS-enabled locations evaluation with charts and top machines
 * - Revenue Analysis: Revenue analysis with location selection and charts
 *
 * Features:
 * - Tab navigation with URL sync
 * - Data fetching via useLocationsTabData hook
 * - Export functionality for all tabs
 * - Location selection and filtering
 * - Chart granularity controls
 */

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import ReportsLocationsOverview from './ReportsLocationsOverview';
import ReportsLocationsRevenueAnalysis from './ReportsLocationsRevenueAnalysis';
import ReportsLocationsSASEvaluation from './ReportsLocationsSASEvaluation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  handleExportLocationOverview,
  handleExportRevenueAnalysis,
  handleExportSASEvaluation,
} from '@/lib/helpers/reports/locationsTabHelpers';
import { useLocationsTabData } from '@/lib/hooks/reports/useLocationsTabData';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useReportsStore } from '@/lib/store/reportsStore';
import { getDefaultChartGranularity } from '@/lib/utils/chartGranularity';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';

/**
 * Main ReportsLocationsTab Component
 */
export default function ReportsLocationsTab() {
  // ============================================================================
  // Hooks & Store
  // ============================================================================
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { formatAmount, shouldShowCurrency } = useCurrencyFormat();
  const { activeMetricsFilter, customDateRange, selectedLicencee } =
    useDashBoardStore();
  const { selectedDateRange, setLoading } = useReportsStore();

  // ============================================================================
  // Tab State
  // ============================================================================
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('ltab') || 'overview';
    }
    return 'overview';
  });

  // ============================================================================
  // Location Selection State
  // ============================================================================
  const [selectedSasLocations, setSelectedSasLocations] = useState<string[]>(
    []
  );
  const [selectedRevenueLocations, setSelectedRevenueLocations] = useState<
    string[]
  >([]);

  // ============================================================================
  // Chart Granularity State
  // ============================================================================
  const [chartGranularity, setChartGranularity] = useState<
    'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly'
  >(
    () =>
      getDefaultChartGranularity(
        activeMetricsFilter || 'Today',
        customDateRange?.startDate,
        customDateRange?.endDate
      ) as 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly'
  );
  const hasManuallySetGranularityRef = useRef(false);

  // Show granularity selector for Today/Yesterday/Custom (only if Custom spans ≤ 1 gaming day)
  const showGranularitySelector = useMemo(() => {
    if (
      activeMetricsFilter === 'Today' ||
      activeMetricsFilter === 'Yesterday'
    ) {
      return true;
    }
    if (
      activeMetricsFilter === 'Custom' &&
      customDateRange?.startDate &&
      customDateRange?.endDate
    ) {
      try {
        const range = getGamingDayRangeForPeriod(
          'Custom',
          8,
          customDateRange.startDate instanceof Date
            ? customDateRange.startDate
            : new Date(customDateRange.startDate),
          customDateRange.endDate instanceof Date
            ? customDateRange.endDate
            : new Date(customDateRange.endDate)
        );
        const hoursDiff =
          (range.rangeEnd.getTime() - range.rangeStart.getTime()) /
          (1000 * 60 * 60);
        return hoursDiff <= 24;
      } catch (error) {
        console.error('Error calculating gaming day range:', error);
        return false;
      }
    }
    return false;
  }, [activeMetricsFilter, customDateRange]);

  // Recalculate default granularity when date filters change
  useEffect(() => {
    if (hasManuallySetGranularityRef.current) {
      return;
    }

    const updateGranularity = () => {
      const defaultGranularity = getDefaultChartGranularity(
        activeMetricsFilter || 'Today',
        customDateRange?.startDate,
        customDateRange?.endDate
      );
      setChartGranularity(defaultGranularity);
    };

    updateGranularity();

    if (activeMetricsFilter === 'Today') {
      const interval = setInterval(updateGranularity, 60000);
      return () => clearInterval(interval);
    }

    return undefined;
  }, [
    activeMetricsFilter,
    customDateRange?.startDate,
    customDateRange?.endDate,
  ]);

  // ============================================================================
  // Pagination Constants
  // ============================================================================
  const itemsPerPage = 20;
  const itemsPerBatch = 100;
  const pagesPerBatch = itemsPerBatch / itemsPerPage;

  // ============================================================================
  // Data Fetching Hook
  // ============================================================================
  const {
    gamingLocations,
    gamingLocationsLoading,
    locationAggregates,
    locationAggregatesLoading,
    metricsLoading,
    locationsLoading,
    metricsOverview,
    topLocations,
    metricsTotals,
    metricsTotalsLoading,
    topMachinesData,
    topMachinesLoading,
    bottomMachinesLoading,
    locationTrendData,
    locationTrendLoading,
    accumulatedLocations,
    paginatedLocations,
    paginationLoading,
    allLocationsForDropdown,
    currentPage,
    totalPages,
    totalCount,
    setCurrentPage,
    setAccumulatedLocations,
    setLoadedBatches,
    setPaginationLoading,
    setLocationsLoading,
    setMetricsLoading,
    setTopMachinesData,
    setTopMachinesLoading,
    setBottomMachinesData,
    setLocationTrendData,
    setLocationTrendLoading,
    setMetricsTotalsLoading,
    fetchLocationDataAsync,
    fetchTopMachines,
    fetchBottomMachines,
    fetchLocationTrendData,
    fetchMetricsTotals,
  } = useLocationsTabData({
    activeTab,
    selectedSasLocations,
    selectedRevenueLocations,
    itemsPerPage,
    itemsPerBatch,
    pagesPerBatch,
    chartGranularity,
  });

  // ============================================================================
  // Tab Change Handler
  // ============================================================================
  const handleLocationsTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      try {
        const sp = new URLSearchParams(searchParams?.toString() || '');
        sp.set('ltab', tab);
        sp.set('section', 'locations');
        router.replace(`${pathname}?${sp.toString()}`);
      } catch {
        // Ignore URL update errors
      }
    },
    [searchParams, pathname, router]
  );

  // Sync activeTab with URL parameter
  useEffect(() => {
    const initial = searchParams?.get('ltab') || 'overview';
    if (initial !== activeTab) {
      setActiveTab(initial);
    }
  }, [searchParams, activeTab]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [
    activeMetricsFilter,
    selectedDateRange,
    selectedLicencee,
    setCurrentPage,
  ]);

  // Auto-select single location for SAS Evaluation and Revenue Analysis tabs
  useEffect(() => {
    if (
      (activeTab === 'sas-evaluation' || activeTab === 'location-evaluation') &&
      selectedSasLocations.length === 0 &&
      allLocationsForDropdown.length > 0
    ) {
      // Filter SAS locations
      const sasLocations = allLocationsForDropdown.filter(
        loc => (loc.sasMachines as number) > 0
      );
      if (sasLocations.length === 1) {
        setSelectedSasLocations([sasLocations[0].location as string]);
      }
    } else if (
      activeTab === 'location-revenue' &&
      selectedRevenueLocations.length === 0 &&
      allLocationsForDropdown.length > 0
    ) {
      // Auto-select single location for Revenue Analysis
      if (allLocationsForDropdown.length === 1) {
        setSelectedRevenueLocations([
          allLocationsForDropdown[0].location as string,
        ]);
      }
    }
  }, [
    activeTab,
    allLocationsForDropdown,
    selectedSasLocations.length,
    selectedRevenueLocations.length,
  ]);

  // Refetch trend data when granularity or selected locations change
  useEffect(() => {
    const currentSelectedLocations =
      activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
        ? selectedSasLocations
        : selectedRevenueLocations;

    if (currentSelectedLocations.length > 0) {
      void fetchLocationTrendData();
    } else {
      // Clear trend data when no locations selected
      setLocationTrendData(null);
    }
  }, [
    chartGranularity,
    activeTab,
    selectedSasLocations,
    selectedRevenueLocations,
    fetchLocationTrendData,
    setLocationTrendData,
  ]);

  // Fetch location data (table) when selected locations change for SAS Evaluation/Revenue Analysis
  useEffect(() => {
    const currentSelectedLocations =
      activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
        ? selectedSasLocations
        : activeTab === 'location-revenue'
          ? selectedRevenueLocations
          : [];

    // Only fetch table data for SAS Evaluation and Revenue Analysis tabs when locations are selected
    if (
      (activeTab === 'sas-evaluation' ||
        activeTab === 'location-evaluation' ||
        activeTab === 'location-revenue') &&
      currentSelectedLocations.length > 0
    ) {
      void fetchLocationDataAsync(currentSelectedLocations);
    }
  }, [
    activeTab,
    selectedSasLocations,
    selectedRevenueLocations,
    fetchLocationDataAsync,
  ]);

  // Fetch top and bottom machines when selected locations change
  useEffect(() => {
    const currentSelectedLocations =
      activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
        ? selectedSasLocations
        : selectedRevenueLocations;

    if (currentSelectedLocations.length > 0) {
      void fetchTopMachines();
      void fetchBottomMachines();
    } else {
      // Clear machine data when no locations selected
      setTopMachinesData([]);
      setBottomMachinesData([]);
    }
  }, [
    activeTab,
    selectedSasLocations,
    selectedRevenueLocations,
    fetchTopMachines,
    fetchBottomMachines,
    setTopMachinesData,
    setBottomMachinesData,
  ]);

  // ============================================================================
  // Location Selection Helpers
  // ============================================================================
  const setCurrentSelectedLocations = useCallback(
    (locations: string[]) => {
      if (
        activeTab === 'sas-evaluation' ||
        activeTab === 'location-evaluation'
      ) {
        setSelectedSasLocations(locations);
      } else {
        setSelectedRevenueLocations(locations);
      }
    },
    [activeTab]
  );

  // ============================================================================
  // Refresh Handler
  // ============================================================================
  const handleRefresh = useCallback(async () => {
    const currentSelectedLocations =
      activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
        ? selectedSasLocations
        : selectedRevenueLocations;

    setPaginationLoading(true);
    setLocationsLoading(true);
    setMetricsLoading(true);
    setTopMachinesLoading(true);
    setLoading(true);

    try {
      setAccumulatedLocations([]);
      setLoadedBatches(new Set());
      setCurrentPage(0);

      await fetchLocationDataAsync(
        currentSelectedLocations.length > 0
          ? currentSelectedLocations
          : undefined
      );

      if (currentSelectedLocations.length > 0) {
        await fetchTopMachines();
        await fetchBottomMachines();
        await fetchLocationTrendData();
      } else {
        setTopMachinesData([]);
        setBottomMachinesData([]);
        setLocationTrendData(null);
      }

      await fetchMetricsTotals();
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data', {
        duration: 3000,
      });
    } finally {
      setPaginationLoading(false);
      setLocationsLoading(false);
      setMetricsLoading(false);
      setTopMachinesLoading(false);
      setMetricsTotalsLoading(false);
      setLoading(false);
    }
  }, [
    activeTab,
    selectedSasLocations,
    selectedRevenueLocations,
    setMetricsTotalsLoading,
    setPaginationLoading,
    setLocationsLoading,
    setMetricsLoading,
    setTopMachinesLoading,
    setLoading,
    setAccumulatedLocations,
    setLoadedBatches,
    setCurrentPage,
    fetchLocationDataAsync,
    fetchTopMachines,
    fetchBottomMachines,
    fetchLocationTrendData,
    fetchMetricsTotals,
    setTopMachinesData,
    setBottomMachinesData,
    setLocationTrendData,
  ]);

  // ============================================================================
  // Export Handlers
  // ============================================================================
  const handleExportLocationOverviewWrapper = useCallback(
    async (format: 'pdf' | 'excel') => {
      const locationsToExport =
        allLocationsForDropdown.length > 0
          ? allLocationsForDropdown
          : accumulatedLocations;

      await handleExportLocationOverview({
        locations: locationsToExport,
        metricsOverview,
        activeMetricsFilter: activeMetricsFilter || 'Today',
        format,
        formatAmount,
        shouldShowCurrency,
        toast,
      });
    },
    [
      allLocationsForDropdown,
      accumulatedLocations,
      metricsOverview,
      activeMetricsFilter,
      formatAmount,
      shouldShowCurrency,
    ]
  );

  const handleExportSASEvaluationWrapper = useCallback(
    async (format: 'pdf' | 'excel') => {
      const currentSelectedLocations =
        activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
          ? selectedSasLocations
          : selectedRevenueLocations;

      await handleExportSASEvaluation({
        selectedLocations: currentSelectedLocations,
        allLocationsForDropdown,
        topLocations,
        selectedDateRange,
        activeMetricsFilter: activeMetricsFilter || 'Today',
        format,
        toast,
      });
    },
    [
      activeTab,
      selectedSasLocations,
      selectedRevenueLocations,
      allLocationsForDropdown,
      topLocations,
      selectedDateRange,
      activeMetricsFilter,
    ]
  );

  const handleExportRevenueAnalysisWrapper = useCallback(
    async (format: 'pdf' | 'excel') => {
      const currentSelectedLocations =
        activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
          ? selectedSasLocations
          : selectedRevenueLocations;

      await handleExportRevenueAnalysis({
        selectedLocations: currentSelectedLocations,
        allLocationsForDropdown,
        topLocations,
        activeMetricsFilter: activeMetricsFilter || 'Today',
        format,
        formatAmount,
        shouldShowCurrency,
        toast,
      });
    },
    [
      activeTab,
      selectedSasLocations,
      selectedRevenueLocations,
      allLocationsForDropdown,
      topLocations,
      activeMetricsFilter,
      formatAmount,
      shouldShowCurrency,
    ]
  );

  // ============================================================================
  // Granularity Change Handler
  // ============================================================================
  const handleGranularityChange = useCallback(
    (granularity: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly') => {
      setChartGranularity(granularity);
      hasManuallySetGranularityRef.current = true;
      setLocationTrendData(null);
      setLocationTrendLoading(true);
    },
    [setLocationTrendData, setLocationTrendLoading]
  );

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Location Performance Overview
          </h2>
          <p className="text-sm text-gray-600">
            Compare performance across all casino locations
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-blue-600">
            <span role="img" aria-label="lightbulb">
              💡
            </span>{' '}
            Click any location card to view detailed information
          </p>
        </div>
      </div>

      {/* Three-Tab Navigation System */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Navigation Tabs
        </h3>
        <Tabs
          value={activeTab}
          onValueChange={handleLocationsTabChange}
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
              value="location-evaluation"
              className="flex-1 rounded bg-white px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              SAS Evaluation
            </TabsTrigger>
            <TabsTrigger
              value="location-revenue"
              className="flex-1 rounded bg-white px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              Revenue Analysis
            </TabsTrigger>
          </TabsList>

          {/* Mobile Navigation */}
          <div className="mb-6 md:hidden">
            <select
              value={activeTab}
              onChange={e => handleLocationsTabChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
            >
              <option value="overview">Overview</option>
              <option value="location-evaluation">SAS Evaluation</option>
              <option value="location-revenue">Revenue Analysis</option>
            </select>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <ReportsLocationsOverview
              metricsTotals={metricsTotals}
              metricsTotalsLoading={metricsTotalsLoading}
              paginatedLocations={paginatedLocations}
              topLocations={topLocations}
              allLocationsForDropdown={allLocationsForDropdown}
              gamingLocations={gamingLocations}
              gamingLocationsLoading={gamingLocationsLoading}
              locationAggregates={locationAggregates}
              locationAggregatesLoading={locationAggregatesLoading}
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              onPageChange={setCurrentPage}
              paginationLoading={paginationLoading}
              locationsLoading={locationsLoading}
              metricsLoading={metricsLoading}
              onRefresh={handleRefresh}
              onExportLocationOverview={handleExportLocationOverviewWrapper}
            />
          </TabsContent>

          {/* SAS Evaluation Tab */}
          <TabsContent value="location-evaluation" className="space-y-6">
            <ReportsLocationsSASEvaluation
              paginatedLocations={paginatedLocations}
              allLocationsForDropdown={allLocationsForDropdown}
              selectedSasLocations={selectedSasLocations}
              metricsTotals={metricsTotals}
              locationTrendData={locationTrendData}
              topMachinesData={topMachinesData}
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              onPageChange={setCurrentPage}
              paginationLoading={paginationLoading}
              locationsLoading={locationsLoading}
              metricsLoading={metricsLoading}
              metricsTotalsLoading={metricsTotalsLoading}
              locationTrendLoading={locationTrendLoading}
              topMachinesLoading={topMachinesLoading}
              bottomMachinesLoading={bottomMachinesLoading}
              onRefresh={handleRefresh}
              onExportSASEvaluation={handleExportSASEvaluationWrapper}
              onSelectionChange={setCurrentSelectedLocations}
              onClearSelection={() => setCurrentSelectedLocations([])}
              chartGranularity={chartGranularity}
              onGranularityChange={handleGranularityChange}
              showGranularitySelector={showGranularitySelector}
              itemsPerPage={itemsPerPage}
            />
          </TabsContent>

          {/* Revenue Analysis Tab */}
          <TabsContent value="location-revenue" className="space-y-6">
            <ReportsLocationsRevenueAnalysis
              paginatedLocations={paginatedLocations}
              allLocationsForDropdown={allLocationsForDropdown}
              selectedRevenueLocations={selectedRevenueLocations}
              metricsTotals={metricsTotals}
              locationTrendData={locationTrendData}
              topMachinesData={topMachinesData}
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              onPageChange={setCurrentPage}
              paginationLoading={paginationLoading}
              locationsLoading={locationsLoading}
              metricsLoading={metricsLoading}
              metricsTotalsLoading={metricsTotalsLoading}
              locationTrendLoading={locationTrendLoading}
              topMachinesLoading={topMachinesLoading}
              bottomMachinesLoading={bottomMachinesLoading}
              onRefresh={handleRefresh}
              onExportRevenueAnalysis={handleExportRevenueAnalysisWrapper}
              onSelectionChange={setCurrentSelectedLocations}
              onClearSelection={() => setCurrentSelectedLocations([])}
              chartGranularity={chartGranularity}
              onGranularityChange={handleGranularityChange}
              showGranularitySelector={showGranularitySelector}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
