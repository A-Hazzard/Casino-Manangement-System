'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import LocationMultiSelect from '@/components/ui/common/LocationMultiSelect';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { MetersTabSkeleton } from '@/components/ui/skeletons/ReportsSkeletons';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import {
  exportMetersReportExcel,
  exportMetersReportPDF,
} from '@/lib/utils/export';
import { getFinancialColorClass } from '@/lib/utils/financialColors';
import { getLicenseeName } from '@/lib/utils/licenseeMapping';
import type {
  MetersReportData,
  MetersReportResponse,
} from '@/shared/types/meters';
import axios from 'axios';
import {
  AlertCircle,
  BarChart3,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Monitor,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

export default function MetersTab() {
  const [allMetersData, setAllMetersData] = useState<MetersReportData[]>([]); // Store all fetched data
  const [metersData, setMetersData] = useState<MetersReportData[]>([]); // Filtered and paginated data
  const [locations, setLocations] = useState<
    { id: string; name: string; sasEnabled: boolean }[]
  >([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [paginationLoading, setPaginationLoading] = useState(false);

  const {
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    displayCurrency,
  } = useDashBoardStore();
  const { user } = useUserStore();
  const licenseeName =
    getLicenseeName(selectedLicencee) || selectedLicencee || 'any licensee';
  const locationsInitialized = useRef(false);

  // Check if user is a location admin
  const isLocationAdmin = useMemo(() => {
    const userRoles = user?.roles || [];
    return userRoles.some(
      role =>
        typeof role === 'string' && role.toLowerCase() === 'location admin'
    );
  }, [user?.roles]);

  // Get location admin's assigned locations
  const locationAdminLocations = useMemo(() => {
    if (!isLocationAdmin) return [];
    return (
      user?.resourcePermissions?.['gaming-locations']?.resources || []
    ).map(id => String(id));
  }, [isLocationAdmin, user?.resourcePermissions]);

  // Filter data based on search term (frontend filtering)
  const filterMetersData = useCallback(
    (data: MetersReportData[], search: string): MetersReportData[] => {
      if (!search.trim()) {
        return data;
      }

      const searchLower = search.toLowerCase().trim();
      return data.filter(item => {
        // Search in machineId, location, and any additional fields
        const machineId = item.machineId?.toLowerCase() || '';
        const location = item.location?.toLowerCase() || '';

        // Also check serialNumber and custom name if available in the item
        const itemRecord = item as Record<string, unknown>;
        const serialNumber =
          (itemRecord.serialNumber as string)?.toLowerCase() || '';
        const customName =
          (
            (itemRecord.custom as Record<string, unknown>)?.name as string
          )?.toLowerCase() || '';

        return (
          machineId.includes(searchLower) ||
          location.includes(searchLower) ||
          serialNumber.includes(searchLower) ||
          customName.includes(searchLower)
        );
      });
    },
    []
  );

  // Apply pagination to filtered data
  const applyPagination = useCallback(
    (data: MetersReportData[], page: number, limit: number = 10) => {
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      return data.slice(startIndex, endIndex);
    },
    []
  );

  // Handle page change
  const handlePageChange = (page: number) => {
    setPaginationLoading(true);
    setCurrentPage(page);

    // Filter and paginate the data
    const filtered = filterMetersData(allMetersData, searchTerm);
    const paginated = applyPagination(filtered, page);

    setMetersData(paginated);
    setTotalCount(filtered.length);
    setTotalPages(Math.ceil(filtered.length / 10));
    setHasData(paginated.length > 0);

    setPaginationLoading(false);
  };

  // Handle search - frontend filtering only
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching

    // Filter and paginate the data
    const filtered = filterMetersData(allMetersData, value);
    const paginated = applyPagination(filtered, 1);

    setMetersData(paginated);
    setTotalCount(filtered.length);
    setTotalPages(Math.ceil(filtered.length / 10));
    setHasData(paginated.length > 0);
  };

  // Get filtered data for export (uses frontend filtering)
  const getDataForExport = useCallback(
    (search: string = '') => {
      // Use the already-fetched allMetersData and apply frontend filtering
      return filterMetersData(allMetersData, search);
    },
    [allMetersData, filterMetersData]
  );

  // Fetch locations data
  const fetchLocations = useCallback(async () => {
    try {
      // Build API parameters
      const params: Record<string, string> = {};
      // Location admin should not filter by licensee (they only see their assigned location)
      if (!isLocationAdmin && selectedLicencee && selectedLicencee !== 'all') {
        params.licencee = selectedLicencee;
      }

      const response = await axios.get('/api/locations', { params });

      const locationsData = response.data.locations || [];
      const mappedLocations = locationsData.map(
        (loc: Record<string, unknown>) => ({
          id: loc._id,
          name: loc.name,
          sasEnabled: loc.sasEnabled || false, // Default to false if not available
        })
      );

      setLocations(mappedLocations);

      // Auto-select location admin's assigned locations
      if (isLocationAdmin && locationAdminLocations.length > 0) {
        // Filter to only locations that exist in the fetched list
        const validLocations = locationAdminLocations.filter(locId =>
          mappedLocations.some(
            (loc: { id: string; name: string; sasEnabled: boolean }) =>
              loc.id === locId
          )
        );
        if (validLocations.length > 0) {
          setSelectedLocations(validLocations);
        }
      }
    } catch (err: unknown) {
      console.error('Error fetching locations:', err);
      const errorMessage =
        (
          (
            (err as Record<string, unknown>)?.response as Record<
              string,
              unknown
            >
          )?.data as Record<string, unknown>
        )?.error ||
        (err as Error)?.message ||
        'Failed to load locations';
      toast.error(errorMessage as string);
    }
  }, [selectedLicencee, isLocationAdmin, locationAdminLocations]);

  // Fetch meters data - fetch all data without pagination or search
  const fetchMetersData = useCallback(async () => {
    if (selectedLocations.length === 0) {
      setAllMetersData([]);
      setMetersData([]);
      setHasData(false);
      setTotalCount(0);
      setTotalPages(1);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        locations: selectedLocations.join(','),
        timePeriod: activeMetricsFilter,
        page: '1',
        limit: '10000', // Fetch all data for frontend filtering
        // Removed search parameter - we'll filter on frontend
      });

      // Add custom dates if needed (in YYYY-MM-DD format)
      if (activeMetricsFilter === 'Custom' && customDateRange) {
        params.append(
          'startDate',
          customDateRange.startDate.toISOString().split('T')[0]
        );
        params.append(
          'endDate',
          customDateRange.endDate.toISOString().split('T')[0]
        );
      }

      // Add licensee filter if selected
      if (selectedLicencee && selectedLicencee !== 'all') {
        params.append('licencee', selectedLicencee);
      }

      // Add currency parameter
      if (displayCurrency) {
        params.append('currency', displayCurrency);
      }

      const response = await axios.get<MetersReportResponse>(
        `/api/reports/meters?${params}`
      );

      // Store all fetched data
      setAllMetersData(response.data.data);

      // Don't apply filtering here - let the separate useEffect handle it
      // This prevents loading state when searchTerm changes
    } catch (err: unknown) {
      console.error('Error fetching meters data:', err);
      const errorMessage =
        (
          (
            (err as Record<string, unknown>)?.response as Record<
              string,
              unknown
            >
          )?.data as Record<string, unknown>
        )?.error ||
        (err as Error)?.message ||
        'Failed to load meters data';
      setError(errorMessage as string);
      toast.error(errorMessage as string);
    } finally {
      setLoading(false);
    }
  }, [
    selectedLocations,
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    displayCurrency,
    // Removed filterMetersData and applyPagination - filtering handled in separate useEffect
    // Removed searchTerm - we filter locally in separate useEffect
  ]);

  // Initialize locations once
  useEffect(() => {
    if (!locationsInitialized.current) {
      void fetchLocations();
      locationsInitialized.current = true;
    }
  }, [fetchLocations]);

  // Fetch meters data when locations or date range or licensee changes (but not when search changes)
  useEffect(() => {
    if (selectedLocations.length > 0) {
      void fetchMetersData();
    }
  }, [
    selectedLocations,
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    displayCurrency,
    fetchMetersData,
  ]);

  // Re-apply filtering when search term or data changes (but don't refetch from API)
  // This runs immediately when searchTerm changes, with no loading state
  useEffect(() => {
    if (allMetersData.length > 0) {
      const filtered = filterMetersData(allMetersData, searchTerm);
      const paginated = applyPagination(filtered, 1);

      setMetersData(paginated);
      setTotalCount(filtered.length);
      setTotalPages(Math.ceil(filtered.length / 10));
      setCurrentPage(1);
      setHasData(paginated.length > 0);
    } else {
      // No data yet - clear the display
      setMetersData([]);
      setTotalCount(0);
      setTotalPages(1);
      setCurrentPage(1);
      setHasData(false);
    }
  }, [searchTerm, allMetersData, filterMetersData, applyPagination]);

  // Handle export - now supports PDF and Excel
  const handleExport = async (format: 'pdf' | 'excel') => {
    if (selectedLocations.length === 0) {
      toast.error('Please select at least one location to export');
      return;
    }

    const selectedLocationNames = locations
      .filter(loc => selectedLocations.includes(loc.id))
      .map(loc => loc.name);

    // Show loading toast
    const loadingToast = toast.loading(
      `Preparing ${format.toUpperCase()} export...`
    );

    try {
      // Get filtered data for export (frontend filtering)
      const allData = getDataForExport(searchTerm);

      if (allData.length === 0) {
        toast.error('No data found for export');
        return;
      }

      // Prepare date range string
      const dateRangeStr =
        activeMetricsFilter === 'Custom' && customDateRange
          ? `${customDateRange.startDate.toLocaleDateString()} - ${customDateRange.endDate.toLocaleDateString()}`
          : activeMetricsFilter;

      // Prepare metadata
      const metadata = {
        locations: selectedLocationNames,
        dateRange: dateRangeStr,
        searchTerm: searchTerm || undefined,
        totalCount: allData.length,
      };

      // Prepare data for export - the API already provides machineId computed from serialNumber or customName
      const exportData = allData.map(item => {
        // Extract serialNumber and origSerialNumber from the item if available
        // These may be in the raw data structure
        const itemRecord = item as Record<string, unknown>;
        const serialNumber = itemRecord.serialNumber as string | undefined;
        const origSerialNumber = itemRecord.origSerialNumber as
          | string
          | undefined;

        return {
          machineId: item.machineId,
          location: item.location,
          metersIn: item.metersIn,
          metersOut: item.metersOut,
          jackpot: item.jackpot,
          billIn: item.billIn,
          voucherOut: item.voucherOut,
          attPaidCredits: item.attPaidCredits,
          gamesPlayed: item.gamesPlayed,
          createdAt: item.createdAt,
          serialNumber: serialNumber?.trim(),
          origSerialNumber: origSerialNumber?.trim(),
        };
      });

      if (format === 'pdf') {
        await exportMetersReportPDF(exportData, metadata);
        toast.success(`Successfully exported ${allData.length} records to PDF`);
      } else {
        exportMetersReportExcel(exportData, metadata);
        toast.success(
          `Successfully exported ${allData.length} records to Excel`
        );
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export ${format.toUpperCase()}`);
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  // (deduped) Load locations handled above

  // Auto-select all locations when locations are first loaded
  useEffect(() => {
    if (locations.length > 0 && !locationsInitialized.current) {
      setSelectedLocations(locations.map(loc => loc.id));
      locationsInitialized.current = true;
    }
  }, [locations]);

  // This effect is now handled by the main fetchMetersData effect above

  // Skeleton loader component - now imported from ReportsSkeletons

  return (
    <div className="space-y-6">
      {/* Header with Export Buttons - Mobile Responsive */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchMetersData()}
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
                disabled={metersData.length === 0}
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

      {/* Location Selection Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Location Selection & Controls
          </CardTitle>
          <CardDescription>
            Select specific locations to filter data or view all locations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {isLocationAdmin ? 'Location' : 'Select Locations'}
              </label>
              {isLocationAdmin ? (
                <div className="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {locations.find(loc =>
                    locationAdminLocations.includes(loc.id)
                  )?.name || 'Loading...'}
                </div>
              ) : (
                <LocationMultiSelect
                  locations={locations.map(loc => ({
                    id: loc.id,
                    name: loc.name,
                  }))}
                  selectedLocations={selectedLocations}
                  onSelectionChange={setSelectedLocations}
                  placeholder="Choose locations to filter..."
                />
              )}
            </div>
            {!isLocationAdmin && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setSelectedLocations([])}
                  className="w-full"
                >
                  Clear Selection
                </Button>
              </div>
            )}
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                {selectedLocations.length > 0
                  ? `${selectedLocations.length} location${
                      selectedLocations.length > 1 ? 's' : ''
                    } selected`
                  : 'Showing all locations'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
      ) : loading ? (
        <MetersTabSkeleton />
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
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                Meters Export Report
              </CardTitle>
              <Badge
                variant="secondary"
                className="self-start text-xs sm:self-auto"
              >
                {metersData.length} records
              </Badge>
            </div>
            <CardDescription className="text-sm">
              Monitor meter readings and financial data by location with
              comprehensive filtering
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search bar for table - Always visible */}
            <div className="mb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by Serial Number, Custom Name, or Location..."
                  value={searchTerm}
                  onChange={e => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Showing {metersData.length} of {totalCount} records
                {searchTerm && ` (filtered by "${searchTerm}")`}
              </p>
            </div>

            {!hasData ? (
              <div className="p-8 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  No Data Found
                </h3>
                <p className="text-gray-600">
                  {searchTerm
                    ? 'No meters data found matching your search criteria.'
                    : `No meters data found for ${selectedLicencee === 'all' ? 'any licensee' : licenseeName}.`}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                          Machine ID
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                          Location
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                          Meters In
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                          Money Won
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                          Jackpot
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                          Bill In
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                          Voucher Out
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                          Hand Paid Cancelled Credits
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                          Games Played
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {metersData.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="font-mono text-sm text-gray-900">
                              {/* machineId is already computed by the API with proper fallback:
                                  1. serialNumber (if not blank/whitespace)
                                  2. custom.name (if serialNumber is blank) */}
                              {item.machineId}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">
                              {item.location}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div
                              className={`text-sm ${getFinancialColorClass(item.metersIn)}`}
                            >
                              {item.metersIn.toLocaleString()}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div
                              className={`text-sm ${getFinancialColorClass(item.metersOut)}`}
                            >
                              {item.metersOut.toLocaleString()}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div
                              className={`text-sm ${getFinancialColorClass(item.jackpot)}`}
                            >
                              {item.jackpot.toLocaleString()}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div
                              className={`text-sm ${getFinancialColorClass(item.billIn)}`}
                            >
                              {item.billIn.toLocaleString()}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div
                              className={`text-sm ${getFinancialColorClass(item.voucherOut)}`}
                            >
                              {item.voucherOut.toLocaleString()}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div
                              className={`text-sm ${getFinancialColorClass(item.attPaidCredits)}`}
                            >
                              {item.attPaidCredits.toLocaleString()}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="text-sm text-gray-900">
                              {item.gamesPlayed.toLocaleString()}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="text-sm text-gray-900">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="space-y-4 md:hidden">
                  {metersData.map((item, index) => (
                    <div
                      key={index}
                      className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="truncate font-mono text-sm font-medium text-gray-900">
                            {/* machineId is already computed by the API with proper fallback:
                                1. serialNumber (if not blank/whitespace)
                                2. custom.name (if serialNumber is blank) */}
                            {item.machineId}
                          </h3>
                          <p className="truncate text-xs text-gray-500">
                            {item.location}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Meters In</p>
                          <p
                            className={`text-sm font-medium ${getFinancialColorClass(item.metersIn)}`}
                          >
                            {item.metersIn.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Money Won</p>
                          <p
                            className={`text-sm font-medium ${getFinancialColorClass(item.metersOut)}`}
                          >
                            {item.metersOut.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Jackpot</p>
                          <p
                            className={`text-sm font-medium ${getFinancialColorClass(item.jackpot)}`}
                          >
                            {item.jackpot.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Bill In</p>
                          <p
                            className={`text-sm font-medium ${getFinancialColorClass(item.billIn)}`}
                          >
                            {item.billIn.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Voucher Out</p>
                          <p
                            className={`text-sm font-medium ${getFinancialColorClass(item.voucherOut)}`}
                          >
                            {item.voucherOut.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            Hand Paid Cancelled Credits
                          </p>
                          <p
                            className={`text-sm font-medium ${getFinancialColorClass(item.attPaidCredits)}`}
                          >
                            {item.attPaidCredits.toLocaleString()}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500">Games Played</p>
                          <p className="text-sm font-medium text-gray-900">
                            {item.gamesPlayed.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls - Mobile Responsive */}
                {totalPages > 1 && (
                  <>
                    {/* Mobile Pagination */}
                    <div className="mt-4 flex flex-col space-y-3 sm:hidden">
                      <div className="text-center text-xs text-gray-600">
                        Page {currentPage} of {totalPages} ({totalCount} total
                        records)
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(1)}
                          disabled={currentPage === 1 || paginationLoading}
                          className="px-2 py-1 text-xs"
                        >
                          ««
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1 || paginationLoading}
                          className="px-2 py-1 text-xs"
                        >
                          ‹
                        </Button>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-600">Page</span>
                          <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={currentPage}
                            onChange={e => {
                              let val = Number(e.target.value);
                              if (isNaN(val)) val = 1;
                              if (val < 1) val = 1;
                              if (val > totalPages) val = totalPages;
                              handlePageChange(val);
                            }}
                            className="w-12 rounded border border-gray-300 px-1 py-1 text-center text-xs text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
                            aria-label="Page number"
                            disabled={paginationLoading}
                          />
                          <span className="text-xs text-gray-600">
                            of {totalPages}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={
                            currentPage === totalPages || paginationLoading
                          }
                          className="px-2 py-1 text-xs"
                        >
                          ›
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(totalPages)}
                          disabled={
                            currentPage === totalPages || paginationLoading
                          }
                          className="px-2 py-1 text-xs"
                        >
                          »»
                        </Button>
                      </div>
                    </div>

                    {/* Desktop Pagination */}
                    <div className="mt-4 hidden items-center justify-between sm:flex">
                      <div className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages} ({totalCount} total
                        records)
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(1)}
                          disabled={currentPage === 1 || paginationLoading}
                        >
                          First
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1 || paginationLoading}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Page</span>
                          <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={currentPage}
                            onChange={e => {
                              let val = Number(e.target.value);
                              if (isNaN(val)) val = 1;
                              if (val < 1) val = 1;
                              if (val > totalPages) val = totalPages;
                              handlePageChange(val);
                            }}
                            className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
                            aria-label="Page number"
                            disabled={paginationLoading}
                          />
                          <span className="text-sm text-gray-600">
                            of {totalPages}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={
                            currentPage === totalPages || paginationLoading
                          }
                        >
                          Next
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(totalPages)}
                          disabled={
                            currentPage === totalPages || paginationLoading
                          }
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
      )}
    </div>
  );
}
