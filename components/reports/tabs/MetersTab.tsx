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
import { MetersHourlyCharts } from '@/components/ui/MetersHourlyCharts';
import PaginationControls from '@/components/ui/PaginationControls';
import { Skeleton } from '@/components/ui/skeleton';
import { MetersTabSkeleton } from '@/components/ui/skeletons/ReportsSkeletons';
import { colorPalette } from '@/lib/constants/uiConstants';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useReportsStore } from '@/lib/store/reportsStore';
import { useUserStore } from '@/lib/store/userStore';
import type { TopPerformingItem } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';
import {
  exportMetersReportExcel,
  exportMetersReportPDF,
} from '@/lib/utils/export';
import { getFinancialColorClass } from '@/lib/utils/financialColors';
import { useDebounce } from '@/lib/utils/hooks';
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
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Monitor,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { toast } from 'sonner';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';

export default function MetersTab() {
  const router = useRouter();
  
  // AbortController for meters data fetching
  const makeMetersRequest = useAbortableRequest();
  
  const [allMetersData, setAllMetersData] = useState<MetersReportData[]>([]); // Store all fetched data (batches)
  const [locations, setLocations] = useState<
    { id: string; name: string; sasEnabled: boolean }[]
  >([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(true); // Track locations/permissions loading
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // Debounce search by 500ms
  const [currentPage, setCurrentPage] = useState(0);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set([1]));
  const [hourlyChartData, setHourlyChartData] = useState<
    Array<{
      day: string;
      hour: string;
      gamesPlayed: number;
      coinIn: number;
      coinOut: number;
    }>
  >([]);
  const [allHourlyChartData, setAllHourlyChartData] = useState<
    Array<{
      day: string;
      hour: string;
      gamesPlayed: number;
      coinIn: number;
      coinOut: number;
    }>
  >([]); // Store original hourly chart data for all machines
  const [hourlyChartLoading, setHourlyChartLoading] = useState(false);
  const [topMachinesData, setTopMachinesData] = useState<TopPerformingItem[]>(
    []
  );
  const [topMachinesLoading, setTopMachinesLoading] = useState(false);
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const itemsPerPage = 10;
  const itemsPerBatch = 50;
  const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5

  const {
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    displayCurrency,
    setActiveMetricsFilter,
  } = useDashBoardStore();
  const { setLoading: setReportsLoading, activeView } = useReportsStore();
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
  // If JWT has no locations, we'll fetch from server as fallback
  const [fetchedLocationPermissions, setFetchedLocationPermissions] = useState<
    string[]
  >([]);
  const locationAdminLocations = useMemo(() => {
    if (!isLocationAdmin) return [];
    // Use only new field
    let jwtLocations: string[] = [];
    if (
      Array.isArray(user?.assignedLocations) &&
      user.assignedLocations.length > 0
    ) {
      jwtLocations = user.assignedLocations.map(id => String(id));
    }
    // If JWT has locations, use them; otherwise use fetched permissions
    return jwtLocations.length > 0 ? jwtLocations : fetchedLocationPermissions;
  }, [isLocationAdmin, user?.assignedLocations, fetchedLocationPermissions]);

  // Calculate which batch we need based on current page
  const calculateBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / pagesPerBatch) + 1;
    },
    [pagesPerBatch]
  );

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

        // Search in machineId (which may contain serial number in parentheses)
        // Also search for the serial number within the machineId string
        const machineIdMatch = machineId.includes(searchLower);
        const locationMatch = location.includes(searchLower);
        const serialNumberMatch = serialNumber.includes(searchLower);
        const customNameMatch = customName.includes(searchLower);

        // Also check if search term appears anywhere in machineId (e.g., "5089" in "GM#TTRH009 (TTRHP009)" won't match, but "5089" in "5089" will)
        // Extract serial number from machineId if it's in parentheses format: "CustomName (SerialNumber)"
        const machineIdSerialMatch =
          machineId
            .match(/\(([^)]+)\)/)?.[1]
            ?.toLowerCase()
            .includes(searchLower) || false;

        return (
          machineIdMatch ||
          locationMatch ||
          serialNumberMatch ||
          customNameMatch ||
          machineIdSerialMatch
        );
      });
    },
    []
  );

  // Handle search - frontend filtering only
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(0); // Reset to first page when searching
  };

  // Get filtered data for export (uses frontend filtering)
  const getDataForExport = useCallback(
    (search: string = '') => {
      // Use the already-fetched allMetersData and apply frontend filtering
      return filterMetersData(allMetersData, search);
    },
    [allMetersData, filterMetersData]
  );

  // Fetch current user's permissions from server if JWT is stale (for location admins)
  const fetchUserPermissions = useCallback(async () => {
    if (!isLocationAdmin || !user?._id) return;

    // Use only new field
    let jwtLocations: string[] = [];
    if (
      Array.isArray(user?.assignedLocations) &&
      user.assignedLocations.length > 0
    ) {
      jwtLocations = user.assignedLocations.map(id => String(id));
    }

    // Only fetch if JWT has no location permissions (might be stale)
    if (jwtLocations.length === 0) {
      try {
        setLocationsLoading(true);
        const response = await axios.get('/api/auth/current-user');
        if (response.data?.success && response.data?.user?.assignedLocations) {
          // Use only new field
          let serverLocations: string[] = [];
          if (
            Array.isArray(response.data.user.assignedLocations) &&
            response.data.user.assignedLocations.length > 0
          ) {
            serverLocations = response.data.user.assignedLocations.map(
              (id: string) => String(id)
            );
          }
          if (serverLocations.length > 0) {
            console.log(
              '[MetersTab] Fetched fresh location permissions from server:',
              serverLocations
            );
            setFetchedLocationPermissions(serverLocations);
          }
        }
      } catch (err) {
        console.error('[MetersTab] Failed to fetch user permissions:', err);
      } finally {
        setLocationsLoading(false);
      }
    } else {
      // JWT has locations, no need to fetch
      setLocationsLoading(false);
    }
  }, [isLocationAdmin, user?._id, user?.assignedLocations]);

  // Fetch locations data
  const fetchLocations = useCallback(async () => {
    try {
      setLocationsLoading(true);

      // For location admins with stale JWT, fetch fresh permissions first
      if (isLocationAdmin) {
        await fetchUserPermissions();
      }

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

      console.log('[MetersTab] Fetched locations:', {
        total: mappedLocations.length,
        locationAdmin: isLocationAdmin,
        assignedLocations: locationAdminLocations,
        fetchedLocationIds: mappedLocations.map(
          (l: { id: string; name: string; sasEnabled: boolean }) => l.id
        ),
      });

      setLocations(mappedLocations);

      // Don't auto-select locations - user must manually select
      // For location admins, the API returns only their accessible locations,
      // but we still require manual selection
      if (isLocationAdmin) {
        if (mappedLocations.length === 0 && locationAdminLocations.length > 0) {
          // JWT has locations but API returned none - might be a permission mismatch
          console.warn(
            '[MetersTab] JWT has location permissions but API returned no locations. This may indicate a permission mismatch.'
          );
          toast.warning(
            'No locations found. Your permissions may have changed. Please refresh the page or log out and log back in.',
            { duration: 3000 }
          );
        } else if (
          mappedLocations.length === 0 &&
          locationAdminLocations.length === 0
        ) {
          // No locations in JWT and API returned none - user has no location access
          console.warn('[MetersTab] Location admin has no assigned locations.');
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
      toast.error(errorMessage as string, {
        duration: 3000,
      });
    } finally {
      setLocationsLoading(false);
    }
  }, [
    selectedLicencee,
    isLocationAdmin,
    locationAdminLocations,
    fetchUserPermissions,
  ]);

  // Calculate top performing machines from table data
  // Uses the same "last meter" logic as the table - only shows machines that appear in the table
  const calculateTopMachines = useCallback(() => {
    if (allMetersData.length === 0) {
      setTopMachinesData([]);
      setTopMachinesLoading(false);
      return;
    }

    setTopMachinesLoading(true);

    try {
      // Since each machine only appears once in allMetersData (last meter per machine),
      // we can directly sort by billIn (drop) value
      // Group by machineDocumentId in case of duplicates (defensive)
      const machineMap = new Map<
        string,
        {
          machineId: string;
          machineDocumentId: string;
          totalDrop: number;
          location: string;
          locationId: string;
          game?: string;
        }
      >();

      allMetersData.forEach(item => {
        const existing = machineMap.get(item.machineDocumentId);
        // Use billIn (drop) as the performance metric - this is the standard "drop" value
        const dropValue = item.billIn || 0;
        if (existing) {
          // If duplicate, use the higher value (shouldn't happen, but defensive)
          existing.totalDrop = Math.max(existing.totalDrop, dropValue);
        } else {
          machineMap.set(item.machineDocumentId, {
            machineId: item.machineId,
            machineDocumentId: item.machineDocumentId,
            totalDrop: dropValue,
            location: item.location,
            locationId: item.locationId,
            game: item.game,
          });
        }
      });

      // Convert to array, sort by totalDrop descending, and take top 10
      const topMachines = Array.from(machineMap.values())
        .sort((a, b) => b.totalDrop - a.totalDrop)
        .slice(0, 10)
        .map((item, index) => {
          // Format machine name with game in brackets if available
          // machineId format is already "CustomName (SerialNumber)" or just "SerialNumber"
          // We need to add game to the brackets: "CustomName (SerialNumber, Game)" or "SerialNumber (Game)"
          let displayName = item.machineId;
          if (item.game) {
            // Check if machineId already has brackets (contains serial number)
            if (item.machineId.includes('(') && item.machineId.includes(')')) {
              // Add game to existing brackets: "CustomName (SerialNumber, Game)"
              displayName = item.machineId.replace(/\)$/, `, ${item.game})`);
            } else {
              // Add new brackets with game: "SerialNumber (Game)"
              displayName = `${item.machineId} (${item.game})`;
            }
          }

          return {
            _id: item.machineDocumentId,
            name: displayName,
            originalName: item.machineId,
            total: item.totalDrop,
            totalDrop: item.totalDrop,
            performance: '',
            color: colorPalette[index % colorPalette.length],
            location: item.location,
            locationId: item.locationId,
            machine: item.machineId,
            game: item.game,
          };
        });

      setTopMachinesData(topMachines);
    } catch (error) {
      console.error('Failed to calculate top machines:', error);
      setTopMachinesData([]);
    } finally {
      setTopMachinesLoading(false);
    }
  }, [allMetersData]);

  // Calculate top machines when table data changes
  useEffect(() => {
    calculateTopMachines();
  }, [calculateTopMachines]);

  // Fetch meters data - batch-based pagination
  const fetchMetersData = useCallback(
    async (batch: number = 1) => {
      if (selectedLocations.length === 0) {
        setAllMetersData([]);
        setHasData(false);
        setLoadedBatches(new Set());
        setCurrentPage(0);
        return;
      }

      setLoading(true);
      setReportsLoading(true);
      setError(null);

      await makeMetersRequest(
        async (signal) => {
          const params = new URLSearchParams({
            locations: selectedLocations.join(','),
            timePeriod: activeMetricsFilter,
            page: batch.toString(),
            limit: itemsPerBatch.toString(),
          });

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

          if (selectedLicencee && selectedLicencee !== 'all') {
            params.append('licencee', selectedLicencee);
          }

          if (displayCurrency) {
            params.append('currency', displayCurrency);
          }

          if (selectedLocations.length > 0) {
            params.append('includeHourlyData', 'true');
            setHourlyChartLoading(true);
          }

          try {
            const response = await axios.get<
              MetersReportResponse & {
                hourlyChartData?: Array<{
                  day: string;
                  hour: string;
                  gamesPlayed: number;
                  coinIn: number;
                  coinOut: number;
                }>;
              }
            >(`/api/reports/meters?${params}`, { signal });

            const newMetersData = response.data.data || [];

            if (response.data.hourlyChartData) {
              setHourlyChartData(response.data.hourlyChartData);
              setAllHourlyChartData(response.data.hourlyChartData);
            }
            setHourlyChartLoading(false);

            setAllMetersData(prev => {
              const existingIds = new Set(
                prev.map(
                  m => m.machineId || ((m as Record<string, unknown>)._id as string)
                )
              );
              const uniqueNewMeters = newMetersData.filter(
                (m: MetersReportData) => {
                  const id =
                    m.machineId || ((m as Record<string, unknown>)._id as string);
                  return !existingIds.has(id);
                }
              );
              return [...prev, ...uniqueNewMeters];
            });
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
            toast.error(errorMessage as string, {
              duration: 3000,
            });
          }
        },
        `Meters Report (Batch ${batch}, ${activeMetricsFilter}, Licensee: ${selectedLicencee || 'all'})`
      );

      setLoading(false);
      setReportsLoading(false);
    },
    [
      selectedLocations,
      activeMetricsFilter,
      customDateRange,
      selectedLicencee,
      displayCurrency,
      itemsPerBatch,
      setReportsLoading,
      makeMetersRequest,
    ]
  );

  // Ensure meters tab defaults to "Today" and never uses "All Time"
  useEffect(() => {
    if (activeView === 'meters' && activeMetricsFilter === 'All Time') {
      setActiveMetricsFilter('Today');
    }
  }, [activeView, activeMetricsFilter, setActiveMetricsFilter]);

  // Initialize locations once on mount
  useEffect(() => {
    if (!locationsInitialized.current) {
      void fetchLocations();
      locationsInitialized.current = true;
    }
  }, [fetchLocations]);

  // Refetch locations when licensee changes
  useEffect(() => {
    if (locationsInitialized.current) {
      void fetchLocations();
    }
  }, [selectedLicencee, fetchLocations]);

  // Load initial batch on mount and when filters change
  useEffect(() => {
    if (selectedLocations.length > 0) {
      setAllMetersData([]);
      setLoadedBatches(new Set([1]));
      setCurrentPage(0);
      fetchMetersData(1);
    }
  }, [
    selectedLocations,
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    setAllMetersData,
    setLoadedBatches,
    setCurrentPage,
    fetchMetersData,
    displayCurrency,
  ]);

  // Fetch next batch when crossing batch boundaries
  useEffect(() => {
    if (loading || selectedLocations.length === 0) return;

    const currentBatch = calculateBatchNumber(currentPage);
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    // Fetch next batch if we're on the last page of current batch and haven't loaded it yet
    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      setLoadedBatches(prev => new Set([...prev, nextBatch]));
      fetchMetersData(nextBatch);
    }

    // Also ensure current batch is loaded
    if (!loadedBatches.has(currentBatch)) {
      setLoadedBatches(prev => new Set([...prev, currentBatch]));
      fetchMetersData(currentBatch);
    }
  }, [
    currentPage,
    loading,
    fetchMetersData,
    itemsPerBatch,
    pagesPerBatch,
    loadedBatches,
    calculateBatchNumber,
    selectedLocations.length,
  ]);

  // Filter and paginate data
  const filteredMetersData = useMemo(() => {
    return filterMetersData(allMetersData, debouncedSearchTerm);
  }, [allMetersData, debouncedSearchTerm, filterMetersData]);

  // Fetch hourly chart data for filtered machines when search changes
  useEffect(() => {
    if (!selectedLocations.length || !allHourlyChartData.length) {
      return;
    }

    const fetchFilteredHourlyData = async () => {
      if (!debouncedSearchTerm.trim()) {
        // No search - use all hourly chart data
        setHourlyChartData(allHourlyChartData);
        return;
      }

      // Get machine document IDs from filtered data
      const filteredMachineIds = filteredMetersData
        .map(item => {
          const itemRecord = item as Record<string, unknown>;
          return itemRecord.machineDocumentId as string;
        })
        .filter((id): id is string => !!id);

      if (filteredMachineIds.length === 0) {
        // No machines match search - show empty chart
        setHourlyChartData([]);
        return;
      }

      try {
        setHourlyChartLoading(true);
        setReportsLoading(true); // Set reports store loading state
        const params = new URLSearchParams({
          locations: selectedLocations.join(','),
          timePeriod: activeMetricsFilter,
          includeHourlyData: 'true',
          hourlyDataMachineIds: filteredMachineIds.join(','),
        });

        // Add custom dates if needed
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

        const response = await axios.get<{
          hourlyChartData?: Array<{
            day: string;
            hour: string;
            gamesPlayed: number;
            coinIn: number;
            coinOut: number;
          }>;
        }>(`/api/reports/meters?${params}`);

        if (response.data.hourlyChartData) {
          setHourlyChartData(response.data.hourlyChartData);
        } else {
          setHourlyChartData([]);
        }
      } catch (error) {
        console.error('Error fetching filtered hourly chart data:', error);
        // On error, fall back to all data
        setHourlyChartData(allHourlyChartData);
      } finally {
        setHourlyChartLoading(false);
        setReportsLoading(false); // Clear reports store loading state
      }
    };

    fetchFilteredHourlyData();
  }, [
    debouncedSearchTerm,
    filteredMetersData,
    selectedLocations,
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    displayCurrency,
    allHourlyChartData,
    setReportsLoading,
  ]);

  // Get items for current page from filtered data
  const paginatedMetersData = useMemo(() => {
    const positionInBatch = (currentPage % pagesPerBatch) * itemsPerPage;
    const startIndex = positionInBatch;
    const endIndex = startIndex + itemsPerPage;
    return filteredMetersData.slice(startIndex, endIndex);
  }, [filteredMetersData, currentPage, itemsPerPage, pagesPerBatch]);

  // Calculate total pages based on filtered data
  const totalPages = useMemo(() => {
    const totalItems = filteredMetersData.length;
    const totalPagesFromItems = Math.ceil(totalItems / itemsPerPage);
    return totalPagesFromItems > 0 ? totalPagesFromItems : 1;
  }, [filteredMetersData.length, itemsPerPage]);

  // Update hasData
  useEffect(() => {
    setHasData(paginatedMetersData.length > 0);
  }, [paginatedMetersData.length]);

  // Handle export - now supports PDF and Excel
  const handleExport = async (format: 'pdf' | 'excel') => {
    if (selectedLocations.length === 0) {
      toast.error('Please select at least one location to export', {
        duration: 3000,
      });
      return;
    }

    const selectedLocationNames = locations
      .filter(loc => selectedLocations.includes(loc.id))
      .map(loc => loc.name);

    try {
      // Get filtered data for export (frontend filtering)
      const allData = getDataForExport(searchTerm);

      if (allData.length === 0) {
        toast.error('No data found for export', {
          duration: 3000,
        });
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

      // Prepare data for export
      // If custom.name has a value, only export custom.name (not serialNumber)
      const exportData = allData.map(item => {
        const itemRecord = item as Record<string, unknown>;
        const customName =
          (itemRecord.customName as string)?.trim() || undefined;
        const serialNumber =
          (itemRecord.serialNumber as string)?.trim() || undefined;
        const origSerialNumber = itemRecord.origSerialNumber as
          | string
          | undefined;

        // For export: if customName exists, use only customName, otherwise use machineId
        const exportMachineId = customName || item.machineId;

        return {
          machineId: exportMachineId,
          location: item.location,
          metersIn: item.metersIn,
          metersOut: item.metersOut,
          jackpot: item.jackpot,
          billIn: item.billIn,
          voucherOut: item.voucherOut,
          attPaidCredits: item.attPaidCredits,
          gamesPlayed: item.gamesPlayed,
          createdAt: item.createdAt,
          // Don't include serialNumber in export if customName exists
          serialNumber: customName ? undefined : serialNumber,
          origSerialNumber: customName ? undefined : origSerialNumber?.trim(),
        };
      });

      if (format === 'pdf') {
        await exportMetersReportPDF(exportData, metadata);
      } else {
        exportMetersReportExcel(exportData, metadata);
      }

      toast.success(
        `Successfully exported ${allData.length} records to ${format.toUpperCase()}`,
        { duration: 3000 }
      );
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export ${format.toUpperCase()}`, {
        duration: 3000,
      });
    }
  };

  // (deduped) Load locations handled above

  // Mark locations as initialized (no auto-select - user must manually select)
  useEffect(() => {
    if (locations.length > 0 && !locationsInitialized.current) {
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
            onClick={() => {
              setAllMetersData([]);
              setLoadedBatches(new Set([1]));
              setCurrentPage(0);
              fetchMetersData(1);
            }}
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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Location Selection Controls */}
            <div className="space-y-3">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Locations
                  </label>
                  {selectedLocations.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLocations([])}
                      className="h-7 text-xs"
                    >
                      Clear Selection
                    </Button>
                  )}
                </div>
                <LocationMultiSelect
                  locations={locations.map(loc => ({
                    id: loc.id,
                    name: loc.name,
                  }))}
                  selectedLocations={selectedLocations}
                  onSelectionChange={setSelectedLocations}
                  placeholder="Choose locations to filter..."
                />
              </div>
            </div>

            {/* Top Performing Machines Pie Chart */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Top Performing Machines
                </label>
                <div className="text-xs text-gray-500">
                  {topMachinesData.length > 0
                    ? `${topMachinesData.length} machines`
                    : 'No data'}
                </div>
              </div>
              <div className="rounded-md border border-gray-300 bg-white p-4">
                {loading || topMachinesLoading ? (
                  <TopPerformingMachinesSkeleton />
                ) : topMachinesData.length > 0 ? (
                  <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center">
                    {/* Legend */}
                    <div className="min-w-0 flex-1 space-y-2">
                      {topMachinesData.map((item, index) => (
                        <div
                          key={item._id}
                          className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
                            activePieIndex === index
                              ? 'bg-blue-50 ring-2 ring-blue-500'
                              : 'hover:bg-gray-50'
                          }`}
                          onMouseEnter={() => setActivePieIndex(index)}
                          onMouseLeave={() => setActivePieIndex(null)}
                        >
                          <div
                            className="h-4 w-4 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="flex-1 truncate font-medium text-gray-700">
                            {item.name}
                          </span>
                          {item._id && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                if (item._id) {
                                  router.push(`/cabinets/${item._id}`);
                                }
                              }}
                              className="flex-shrink-0"
                              title="View machine details"
                            >
                              <ExternalLink className="h-3.5 w-3.5 cursor-pointer text-gray-500 transition-transform hover:scale-110 hover:text-blue-600" />
                            </button>
                          )}
                          <span className="flex-shrink-0 text-xs text-gray-500">
                            {formatCurrency(item.totalDrop)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* Pie Chart */}
                    <div className="flex-shrink-0">
                      <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                          <Pie
                            data={topMachinesData}
                            dataKey="totalDrop"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={30}
                            paddingAngle={2}
                            activeIndex={activePieIndex ?? undefined}
                            onMouseEnter={(_, index) =>
                              setActivePieIndex(index)
                            }
                            onMouseLeave={() => setActivePieIndex(null)}
                          >
                            {topMachinesData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                stroke={
                                  activePieIndex === index ? '#3b82f6' : '#fff'
                                }
                                strokeWidth={activePieIndex === index ? 2 : 1}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0]
                                  .payload as TopPerformingItem;
                                return (
                                  <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                                    <p className="font-semibold text-gray-900">
                                      {data.name}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Total: {formatCurrency(data.totalDrop)}
                                    </p>
                                    {data.location && (
                                      <p className="text-xs text-gray-500">
                                        Location: {data.location}
                                      </p>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
                    No top performing machines data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Display */}
      {locationsLoading && locations.length === 0 ? (
        <MetersTabSkeleton />
      ) : selectedLocations.length === 0 ? (
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
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-48" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            {/* Hourly Charts Skeleton - Matches MetersHourlyCharts loading state */}
            {selectedLocations.length > 0 && (
              <div className="mb-6 space-y-4">
                {/* Games Played - Full Width Skeleton */}
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-64 w-full" />
                  </CardContent>
                </Card>
                {/* Coin In and Coin Out - Side by Side Skeleton */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[1, 2].map(i => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-32" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-64 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Search bar skeleton */}
            <div className="mb-4">
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="mt-2 h-4 w-48" />
            </div>

            {/* Desktop table skeleton with proper column structure */}
            <div className="hidden min-w-0 overflow-x-auto md:block">
              <div className="min-w-full">
                <table className="w-full min-w-[800px]">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <th key={i} className="px-4 py-3 text-center">
                          <Skeleton className="mx-auto h-4 w-20" />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 10 }).map((_, j) => (
                          <td key={j} className="px-4 py-3 text-center">
                            <Skeleton className="mx-auto h-4 w-16" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards skeleton */}
            <div className="space-y-4 md:hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <div key={j}>
                          <Skeleton className="mb-1 h-3 w-20" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination skeleton */}
            <div className="mt-6 flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
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
                {paginatedMetersData.length} records
              </Badge>
            </div>
            <CardDescription className="text-sm">
              Monitor meter readings and financial data by location with
              comprehensive filtering
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!hasData ? (
              <>
                {/* Search bar - Always visible, even when no data */}
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
                </div>
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
              </>
            ) : (
              <>
                {/* Hourly Charts - Only show when location is selected */}
                {selectedLocations.length > 0 && (
                  <div className="mb-6">
                    <MetersHourlyCharts
                      data={hourlyChartData}
                      loading={hourlyChartLoading}
                    />
                  </div>
                )}

                {/* Search bar - Right above the table */}
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
                    Showing {paginatedMetersData.length} of{' '}
                    {filteredMetersData.length} records
                    {debouncedSearchTerm &&
                      ` (filtered by "${debouncedSearchTerm}")`}
                  </p>
                </div>

                {/* Desktop Table View - lg and above */}
                <div className="hidden min-w-0 overflow-x-auto lg:block">
                  <div className="min-w-full">
                    <table className="w-full min-w-[800px]">
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
                        {paginatedMetersData.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="whitespace-nowrap px-4 py-3 text-center">
                              {item.machineDocumentId ? (
                                <button
                                  onClick={() => {
                                    router.push(
                                      `/cabinets/${item.machineDocumentId}`
                                    );
                                  }}
                                  className="group mx-auto flex items-center gap-1.5 font-mono text-sm text-gray-900 transition-opacity hover:opacity-80"
                                >
                                  <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                                    {/* machineId is already computed by the API with proper fallback:
                                        1. serialNumber (if not blank/whitespace)
                                        2. custom.name (if serialNumber is blank) */}
                                    {item.machineId}
                                  </span>
                                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                                </button>
                              ) : (
                                <div className="font-mono text-sm text-gray-900">
                                  {item.machineId}
                                </div>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-center">
                              <div className="text-sm font-medium text-gray-900">
                                {item.location}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-center">
                              <div
                                className={`text-sm ${getFinancialColorClass(item.metersIn)}`}
                              >
                                {item.metersIn.toLocaleString()}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-center">
                              <div
                                className={`text-sm ${getFinancialColorClass(item.metersOut)}`}
                              >
                                {item.metersOut.toLocaleString()}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-center">
                              <div
                                className={`text-sm ${getFinancialColorClass(item.jackpot)}`}
                              >
                                {item.jackpot.toLocaleString()}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-center">
                              <div
                                className={`text-sm ${getFinancialColorClass(item.billIn)}`}
                              >
                                {item.billIn.toLocaleString()}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-center">
                              <div
                                className={`text-sm ${getFinancialColorClass(item.voucherOut)}`}
                              >
                                {item.voucherOut.toLocaleString()}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-center">
                              <div
                                className={`text-sm ${getFinancialColorClass(item.attPaidCredits)}`}
                              >
                                {item.attPaidCredits.toLocaleString()}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-center">
                              <div className="text-sm text-gray-900">
                                {item.gamesPlayed.toLocaleString()}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-center">
                              <div className="text-sm text-gray-900">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Card View - md and below (2x2 grid on md, single column on mobile) */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
                  {paginatedMetersData.map((item, index) => (
                    <div
                      key={index}
                      className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                    >
                      {/* Header */}
                      <div className="mb-4 flex flex-col border-b border-gray-100 pb-3">
                        <div className="mb-2 w-fit flex-shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="break-words font-mono text-base font-semibold text-gray-900">
                              {/* machineId is already computed by the API with proper fallback:
                                  1. serialNumber (if not blank/whitespace)
                                  2. custom.name (if serialNumber is blank) */}
                              {item.machineId}
                            </h3>
                            <p className="mt-1 truncate text-sm text-gray-600">
                              {item.location}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg bg-white p-3 shadow-sm">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                            Meters In
                          </p>
                          <p
                            className={`text-base font-bold ${getFinancialColorClass(item.metersIn)}`}
                          >
                            {item.metersIn.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white p-3 shadow-sm">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                            Money Won
                          </p>
                          <p
                            className={`text-base font-bold ${getFinancialColorClass(item.metersOut)}`}
                          >
                            {item.metersOut.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white p-3 shadow-sm">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                            Jackpot
                          </p>
                          <p
                            className={`text-base font-bold ${getFinancialColorClass(item.jackpot)}`}
                          >
                            {item.jackpot.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white p-3 shadow-sm">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                            Bill In
                          </p>
                          <p
                            className={`text-base font-bold ${getFinancialColorClass(item.billIn)}`}
                          >
                            {item.billIn.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white p-3 shadow-sm">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                            Voucher Out
                          </p>
                          <p
                            className={`text-base font-bold ${getFinancialColorClass(item.voucherOut)}`}
                          >
                            {item.voucherOut.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white p-3 shadow-sm">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                            Hand Paid
                          </p>
                          <p
                            className={`text-base font-bold ${getFinancialColorClass(item.attPaidCredits)}`}
                          >
                            {item.attPaidCredits.toLocaleString()}
                          </p>
                        </div>
                        <div className="col-span-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-3 shadow-sm">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-600">
                            Games Played
                          </p>
                          <p className="text-lg font-bold text-gray-900">
                            {item.gamesPlayed.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* View Machine Button */}
                      {item.machineDocumentId && (
                        <div className="mt-4 border-t border-gray-100 pt-4">
                          <button
                            onClick={() => {
                              router.push(
                                `/cabinets/${item.machineDocumentId}`
                              );
                            }}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View Machine
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination Controls - Mobile Responsive */}
                {!loading && totalPages > 1 && (
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    setCurrentPage={setCurrentPage}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Top Performing Machines Skeleton
 *
 * Shown in the exact spot where the Top Performing Machines chart renders
 * while the meters/top-machines query is loading.
 * Responsive layout: list + pie chart (stacked on mobile, side-by-side on desktop).
 */
function TopPerformingMachinesSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center">
      {/* Legend skeleton */}
      <div className="min-w-0 flex-1 space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-2 rounded px-2 py-1.5"
          >
            <Skeleton className="h-4 w-4 flex-shrink-0 rounded-full" />
            <Skeleton className="h-4 min-w-0 flex-1" />
            <Skeleton className="h-3.5 w-3.5 flex-shrink-0" />
            <Skeleton className="h-4 w-16 flex-shrink-0" />
          </div>
        ))}
      </div>
      {/* Pie chart skeleton */}
      <div className="flex-shrink-0">
        <Skeleton className="h-[200px] w-[200px] rounded-full" />
      </div>
    </div>
  );
}
