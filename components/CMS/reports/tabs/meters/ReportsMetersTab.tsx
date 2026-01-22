/**
 * Reports Meters Tab Component
 *
 * Main component for the Meters reports section
 *
 * Features:
 * - Location selection and filtering
 * - Meters data display (table and cards)
 * - Top performing machines pie chart
 * - Hourly charts with granularity control
 * - Export functionality (PDF/Excel)
 * - Search and pagination
 *
 * @module components/reports/tabs/meters/ReportsMetersTab
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu';
import {
  calculateTopMachines,
  handleExportMeters,
} from '@/lib/helpers/reports/metersTabHelpers';
import { useMetersTabData } from '@/lib/hooks/reports/useMetersTabData';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useReportsStore } from '@/lib/store/reportsStore';
import type { TopPerformingItem } from '@/lib/types';
import { useDebounce } from '@/lib/utils/hooks';
import {
  AlertCircle,
  BarChart3,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import ReportsMetersLocationSelection from './ReportsMetersLocationSelection';
import ReportsMetersTable from './ReportsMetersTable';

/**
 * Main ReportsMetersTab Component
 */
export default function ReportsMetersTab() {
  // ============================================================================
  // Hooks & Store
  // ============================================================================
  const {
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    displayCurrency,
    setActiveMetricsFilter,
  } = useDashBoardStore();
  const { activeView } = useReportsStore();

  // ============================================================================
  // State
  // ============================================================================
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [chartGranularity, setChartGranularity] = useState<'hourly' | 'minute'>(
    'hourly'
  );
  const hasManuallySetGranularityRef = useRef(false);
  const [topMachinesData, setTopMachinesData] = useState<TopPerformingItem[]>(
    []
  );
  const [topMachinesLoading, setTopMachinesLoading] = useState(false);

  // ============================================================================
  // Constants
  // ============================================================================
  const itemsPerPage = 10;
  const itemsPerBatch = 50;
  const pagesPerBatch = itemsPerBatch / itemsPerPage;

  // ============================================================================
  // Data Fetching Hook
  // ============================================================================
  const {
    allMetersData,
    locations,
    loading,
    error,
    hasData,
    currentPage,
    hourlyChartData,
    hourlyChartLoading,
    paginatedMetersData,
    totalPages,
    setCurrentPage,
    setAllMetersData,
    setLoadedBatches,
    fetchMetersData,
    metersTabFilterInitialized,
  } = useMetersTabData({
    itemsPerPage,
    itemsPerBatch,
    pagesPerBatch,
    chartGranularity,
    selectedLocations,
    searchTerm,
    debouncedSearchTerm,
    hasManuallySetGranularityRef,
  });

  // ============================================================================
  // Effects
  // ============================================================================
  // Ensure meters tab defaults to "Yesterday" on initial page load
  useEffect(() => {
    if (activeView === 'meters') {
      if (!metersTabFilterInitialized.current) {
        setActiveMetricsFilter('Yesterday');
        metersTabFilterInitialized.current = true;
      }
      if (activeMetricsFilter === 'All Time') {
        setActiveMetricsFilter('Yesterday');
      }
    }
  }, [
    activeView,
    activeMetricsFilter,
    setActiveMetricsFilter,
    metersTabFilterInitialized,
  ]);

  // Auto-select location if there's only one location available
  useEffect(() => {
    if (locations.length === 1 && selectedLocations.length === 0) {
      setSelectedLocations([locations[0].id]);
    }
  }, [locations, selectedLocations.length]);

  // Calculate top machines when table data changes
  useEffect(() => {
    const calculateTop = () => {
      if (allMetersData.length === 0) {
        setTopMachinesData([]);
        setTopMachinesLoading(false);
        return;
      }

      setTopMachinesLoading(true);
      try {
        const topMachines = calculateTopMachines(allMetersData);
        setTopMachinesData(topMachines);
      } catch (error) {
        console.error('Failed to calculate top machines:', error);
        setTopMachinesData([]);
      } finally {
        setTopMachinesLoading(false);
      }
    };

    calculateTop();
  }, [allMetersData]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleSearch = useCallback(
    (value: string) => {
      setSearchTerm(value);
      setCurrentPage(0);
    },
    [setCurrentPage]
  );

  const handleRefresh = useCallback(() => {
    setAllMetersData([]);
    setLoadedBatches(new Set([1]));
    setCurrentPage(0);
    fetchMetersData(1);
  }, [setAllMetersData, setLoadedBatches, setCurrentPage, fetchMetersData]);

  const handleExport = useCallback(
    async (format: 'pdf' | 'excel') => {
      await handleExportMeters({
        selectedLocations,
        locations,
        activeMetricsFilter: activeMetricsFilter || 'Today',
        customDateRange,
        selectedLicencee,
        displayCurrency,
        searchTerm,
        format,
      });
    },
    [
      selectedLocations,
      locations,
      activeMetricsFilter,
      customDateRange,
      selectedLicencee,
      displayCurrency,
      searchTerm,
    ]
  );

  const handleGranularityChange = useCallback(
    (newGranularity: 'hourly' | 'minute') => {
      setChartGranularity(newGranularity);
      hasManuallySetGranularityRef.current = true;
    },
    []
  );

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="space-y-6">
      {/* Header with Export Buttons - Mobile Responsive */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading || selectedLocations.length === 0}
            className="flex items-center gap-2 border-2 border-gray-300 text-xs hover:border-gray-400 sm:text-sm xl:w-auto xl:px-4"
            size="sm"
          >
            <RefreshCw
              className={`h-3 w-3 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">↻</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={paginatedMetersData.length === 0}
                className="flex items-center gap-2 border-2 border-gray-300 text-xs hover:border-gray-400 sm:text-sm xl:w-auto xl:px-4"
                size="sm"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Export</span>
                <span className="sm:hidden">↓</span>
                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleExport('pdf')}
                className="cursor-pointer"
              >
                <FileText className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport('excel')}
                className="cursor-pointer"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Location Selection & Top Performing Machines */}
      <ReportsMetersLocationSelection
        locations={locations}
        selectedLocations={selectedLocations}
        onSelectionChange={setSelectedLocations}
        topMachinesData={topMachinesData}
        topMachinesLoading={topMachinesLoading}
        loading={loading}
        hourlyChartData={hourlyChartData}
        hourlyChartLoading={hourlyChartLoading}
        chartGranularity={chartGranularity}
        onGranularityChange={handleGranularityChange}
      />

      {/* Data Display */}
      {selectedLocations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              No Locations Selected
            </h3>
            <p className="text-gray-600">
              Please select one or more locations above to view meters data.
            </p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              Error Loading Data
            </h3>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                <CardTitle className="text-base sm:text-lg">
                  Meters Export Report
                </CardTitle>
              </div>
            </div>
            <CardDescription className="text-sm">
              Monitor meter readings and financial data by location with
              comprehensive filtering
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReportsMetersTable
              paginatedMetersData={[]}
              searchTerm={searchTerm}
              onSearchChange={handleSearch}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              loading={true}
              hasData={false}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                Meters Export Report
              </CardTitle>
            </div>
            <CardDescription className="text-sm">
              Monitor meter readings and financial data by location with
              comprehensive filtering
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              {/* Search bar and Table Section - Order 1 on mobile, Order 2 on md+ (appears first on desktop) */}
              <div className="order-2 flex flex-col md:order-1">
                <ReportsMetersTable
                  paginatedMetersData={paginatedMetersData}
                  searchTerm={searchTerm}
                  onSearchChange={handleSearch}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  loading={loading}
                  hasData={hasData}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

