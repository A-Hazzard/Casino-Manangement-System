/**
 * useCabinetPageData Hook
 *
 * Coordinates all data and UI state for the cabinet detail page.
 *
 * Features:
 * - Cabinet and location data fetching (via base hook)
 * - Chart data management and granularity selection
 * - Currency management and defaults
 * - Tab state and URL synchronization
 * - Clipboard utilities
 * - SMIB configuration coordination
 */

'use client';

import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { getMachineChartData } from '@/lib/helpers/cabinets';
import { useCabinetDetailsData, useSmibConfiguration } from '@/lib/hooks/data';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import type { dashboardData } from '@/lib/types';
import { getDefaultChartGranularity } from '@/lib/utils/chart';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

export function useCabinetPageData() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const slug = pathname.split('/').pop() || '';
  const { user } = useUserStore();
  const { selectedLicencee, activeMetricsFilter, customDateRange } =
    useDashBoardStore();
  const { displayCurrency } = useCurrency();

  // ============================================================================
  // Base Data Hooks
  // ============================================================================
  const [dateFilterInitialized, setDateFilterInitialized] = useState(false);

  const {
    cabinet,
    locationName,
    error,
    errorType,
    isOnline,
    fetchCabinetDetailsData,
    handleCabinetUpdated,
    metricsLoading: baseMetricsLoading,
  } = useCabinetDetailsData({
    slug,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    dateFilterInitialized,
  });

  const smibHook = useSmibConfiguration();

  // ============================================================================
  // Chart State
  // ============================================================================
  const [chartData, setChartData] = useState<dashboardData[] | null>(null);
  const [loadingChart, setLoadingChart] = useState(true);
  const [chartGranularity, setChartGranularity] = useState<
    'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly'
  >(() =>
    getDefaultChartGranularity(
      activeMetricsFilter || 'Today',
      customDateRange?.startDate,
      customDateRange?.endDate
    )
  );
  const [availableGranularityOptions, setAvailableGranularityOptions] =
    useState<Array<'daily' | 'weekly' | 'monthly'>>([]);
  const [dataSpan, setDataSpan] = useState<{
    minDate: string;
    maxDate: string;
  } | null>(null);
  const hasManuallySetGranularityRef = useRef(false);
  const makeChartRequest = useAbortableRequest();

  // ============================================================================
  // UI State
  // ============================================================================
  const [activeTab, setActiveTab] = useState<string>(() => {
    const section = searchParams?.get('section');
    if (section === 'live-metrics') return 'Live Metrics';
    if (section === 'bill-validator') return 'Bill Validator';
    if (section === 'activity-log') return 'Activity Log';
    if (section === 'collection-history') return 'Collection History';
    if (section === 'collection-settings') return 'Collection Settings';
    if (section === 'configurations') return 'Configurations';
    return 'Movement Metrics';
  });

  const [refreshing, setRefreshing] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ============================================================================
  // Computed Values
  // ============================================================================
  const canAccessSmibConfig = useMemo(() => {
    return (
      user?.roles?.some(role =>
        ['technician', 'owner', 'admin', 'developer'].includes(role)
      ) ?? false
    );
  }, [user]);

  const canEditMachines = useMemo(() => {
    if (user?.roles?.includes('collector')) return false;
    return (
      user?.roles?.some(role =>
        [
          'developer',
          'owner',
          'admin',
          'manager',
          'location admin',
          'technician',
        ].includes(role)
      ) ?? false
    );
  }, [user]);

  const showGranularitySelector = useMemo(() => {
    if (
      activeMetricsFilter === 'Today' ||
      activeMetricsFilter === 'Yesterday'
    ) {
      return true;
    }
    if (
      activeMetricsFilter === 'Custom' && (
        (customDateRange?.startDate && customDateRange?.endDate) ||
        (customDateRange?.from && customDateRange?.to)
      )
    ) {
      // Show minute/hourly selector only for same-day custom ranges
      const customStart = customDateRange?.startDate || customDateRange?.from || (customDateRange as Record<string, unknown>)?.start;
      const customEnd = customDateRange?.endDate || customDateRange?.to || (customDateRange as Record<string, unknown>)?.end;

      const sd = customStart instanceof Date ? customStart : new Date(customStart as unknown as string);
      const ed = customEnd instanceof Date ? customEnd : new Date(customEnd as unknown as string);
      // Compare calendar dates (same year, month, day)
      return sd.getFullYear() === ed.getFullYear() &&
        sd.getMonth() === ed.getMonth() &&
        sd.getDate() === ed.getDate();
    }
    // Show daily/weekly selector for Last 30 Days
    if (activeMetricsFilter === '30d' || activeMetricsFilter === 'last30days') {
      return true;
    }
    // For Quarterly and All Time, show selector if we have available options (data span >= 1 week)
    if (
      (activeMetricsFilter === 'Quarterly' ||
        activeMetricsFilter === 'All Time') &&
      availableGranularityOptions.length > 0
    ) {
      return true;
    }
    return false;
  }, [activeMetricsFilter, customDateRange, availableGranularityOptions]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      const sectionMap: Record<string, string> = {
        'Movement Metrics': '',
        'Live Metrics': 'live-metrics',
        'Bill Validator': 'bill-validator',
        'Activity Log': 'activity-log',
        'Collection History': 'collection-history',
        'Collection Settings': 'collection-settings',
        Configurations: 'configurations',
      };

      const params = new URLSearchParams(searchParams?.toString() || '');
      const sectionValue = sectionMap[tab];
      if (sectionValue) params.set('section', sectionValue);
      else params.delete('section');

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    if (!text || text === 'N/A' || text.trim() === '') {
      toast.error(`No ${label} value to copy`);
      return;
    }

    const cleanText = text.trim();

    try {
      // 1. Try using the modern Clipboard API
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(cleanText);
          toast.success(`${label} copied to clipboard`);
          return;
        } catch (clipboardError) {
          console.warn('Clipboard API failed, trying fallback:', clipboardError);
          // Fall through to fallback
        }
      }

      // 2. Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = cleanText;

      // Ensure the textarea is off-screen but still part of the DOM
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '0';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.select();

      let successful = false;
      try {
        successful = document.execCommand('copy');
      } catch (err) {
        console.error('execCommand copy failed:', err);
      }

      document.body.removeChild(textArea);

      if (successful) {
        toast.success(`${label} copied to clipboard`);
      } else {
        throw new Error('Copy command failed');
      }
    } catch (err) {
      console.error(`Failed to copy ${label}:`, err);
      toast.error(`Could not copy ${label}. Please try selecting and copying manually.`);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchCabinetDetailsData();
      // Trigger chart data refetch by incrementing the trigger
      setRefreshTrigger(prev => prev + 1);
    } finally {
      setRefreshing(false);
    }
  };

  // ============================================================================
  // Effects
  // ============================================================================
  // Init date filter
  useEffect(() => {
    if (activeMetricsFilter) setDateFilterInitialized(true);
  }, [activeMetricsFilter]);

  // Recalculate default granularity when date filters change
  // Reset manual flag so auto-detection works for the new filter
  useEffect(() => {
    hasManuallySetGranularityRef.current = false;

    if (!activeMetricsFilter) return;

    const updateGranularity = () => {
      const defaultGranularity = getDefaultChartGranularity(
        activeMetricsFilter,
        customDateRange?.startDate,
        customDateRange?.endDate
      );
      setChartGranularity(defaultGranularity);
    };

    // Update immediately
    updateGranularity();

    // For "Today" filter, set up interval to recalculate every minute
    // This ensures granularity switches from 'minute' to 'hourly' when 5 hours pass
    if (activeMetricsFilter === 'Today') {
      const interval = setInterval(updateGranularity, 60000); // Every minute
      return () => clearInterval(interval);
    }

    return undefined;
  }, [
    activeMetricsFilter,
    customDateRange?.startDate,
    customDateRange?.endDate,
  ]);

  // Update granularity based on data span
  useEffect(() => {
    if (
      activeMetricsFilter !== 'Quarterly' &&
      activeMetricsFilter !== 'All Time'
    ) {
      setAvailableGranularityOptions([]);
      return;
    }

    if (!dataSpan || !dataSpan.minDate || !dataSpan.maxDate) {
      setAvailableGranularityOptions([]);
      return;
    }

    const minDate = new Date(dataSpan.minDate);
    const maxDate = new Date(dataSpan.maxDate);
    const diffTime = Math.abs(maxDate.getTime() - minDate.getTime());
    const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const newOptions: Array<'daily' | 'weekly' | 'monthly'> =
      daysDiff < 7
        ? []
        : daysDiff < 60
          ? ['daily', 'weekly']
          : ['monthly', 'weekly'];

    setAvailableGranularityOptions(prev => {
      if (JSON.stringify(prev) === JSON.stringify(newOptions)) return prev;
      return newOptions;
    });

    if (!hasManuallySetGranularityRef.current) {
      if (daysDiff < 7) {
        setChartGranularity(prev => (prev !== 'daily' ? 'daily' : prev));
      } else if (daysDiff < 60) {
        setChartGranularity(prev =>
          !['daily', 'weekly'].includes(prev) ? 'daily' : prev
        );
      } else {
        setChartGranularity(prev =>
          !['monthly', 'weekly'].includes(prev) ? 'monthly' : prev
        );
      }
    }
  }, [activeMetricsFilter, dataSpan]);

  // Check if Custom range is same-day (warrants minute/hourly granularity control)
  const isCustomShortPeriod = useMemo(() => {
    const customStart = customDateRange?.startDate || customDateRange?.from || (customDateRange as Record<string, unknown>)?.start;
    const customEnd = customDateRange?.endDate || customDateRange?.to || (customDateRange as Record<string, unknown>)?.end;

    if (activeMetricsFilter !== 'Custom' || !customStart || !customEnd) return false;

    const sd = customStart instanceof Date ? customStart : new Date(customStart as unknown as string);
    const ed = customEnd instanceof Date ? customEnd : new Date(customEnd as unknown as string);

    return sd.getFullYear() === ed.getFullYear() &&
      sd.getMonth() === ed.getMonth() &&
      sd.getDate() === ed.getDate();
  }, [activeMetricsFilter, customDateRange]);

  // Memoize effective granularity - triggers refetch when granularity changes for supported periods
  const effectiveGranularity = useMemo(() => {
    const isShortPeriod =
      activeMetricsFilter === 'Today' || activeMetricsFilter === 'Yesterday';
    const is30d = activeMetricsFilter === '30d' || activeMetricsFilter === 'last30days';
    const isLongPeriod = activeMetricsFilter === 'Quarterly' || activeMetricsFilter === 'All Time';
    return (isShortPeriod || isCustomShortPeriod || is30d || isLongPeriod) ? chartGranularity : null;
  }, [activeMetricsFilter, chartGranularity, isCustomShortPeriod]);

  // Fetch chart data
  useEffect(() => {
    if (!cabinet?._id || !activeMetricsFilter) {
      setLoadingChart(false);
      return;
    }

    // Set loading before making request so skeleton shows immediately
    setLoadingChart(true);
    // Set chartData to null so DashboardChart shows skeleton (not "No Metrics Data")
    setChartData(null);

    makeChartRequest(async signal => {
      try {
        // Pass granularity to API for all periods that support granularity selection
        const isShortPeriod =
          activeMetricsFilter === 'Today' ||
          activeMetricsFilter === 'Yesterday';
        const is30d = activeMetricsFilter === '30d' || activeMetricsFilter === 'last30days';
        const isLongPeriod = activeMetricsFilter === 'Quarterly' || activeMetricsFilter === 'All Time';
        const granularity = (isShortPeriod || isCustomShortPeriod || is30d || isLongPeriod) ? chartGranularity : undefined;

        const customStart = customDateRange?.startDate || customDateRange?.from || (customDateRange as Record<string, unknown>)?.start;
        const customEnd = customDateRange?.endDate || customDateRange?.to || (customDateRange as Record<string, unknown>)?.end;

        const effectiveStartDate = customStart instanceof Date
          ? customStart
          : customStart ? new Date(customStart as unknown as string)
            : undefined;

        const effectiveEndDate = customEnd instanceof Date
          ? customEnd
          : customEnd ? new Date(customEnd as unknown as string)
            : undefined;

        const result = await getMachineChartData(
          String(cabinet._id),
          activeMetricsFilter,
          effectiveStartDate,
          effectiveEndDate,
          displayCurrency,
          selectedLicencee,
          granularity,
          signal
        );
        if (result.data) {
          setChartData(result.data);

          // Store data span for granularity calculation
          setDataSpan(result.dataSpan || null);
        }
      } catch (err) {
        // Don't clear chart data on abort — keep skeleton showing for the next request
        if (err instanceof Error && (err.name === 'AbortError' || err.message === 'canceled')) {
          return;
        }
        setChartData([]);
      } finally {
        setLoadingChart(false);
      }
    });
  }, [
    cabinet?._id,
    activeMetricsFilter,
    customDateRange?.startDate,
    customDateRange?.endDate,
    displayCurrency,
    selectedLicencee,
    effectiveGranularity,
    makeChartRequest,
    chartGranularity,
    refreshTrigger,
  ]);

  // SMIB Config Coordination
  useEffect(() => {
    if (!cabinet?._id) return;

    // Set communication mode and firmware version from cabinet data
    smibHook.setCommunicationModeFromData(cabinet);
    smibHook.setFirmwareVersionFromData(cabinet);

    // Fetch MQTT configuration from API (only if SMIB is not online with live data)
    const cabinetId = String(cabinet._id);
    smibHook.fetchMqttConfig(cabinetId);

    return () => smibHook.disconnectFromConfigStream();
    // Only depend on cabinet._id, not the whole smibHook object
    // The smibHook functions are stable useCallback hooks, so they don't need to be in deps
  }, [cabinet?._id]);

  return {
    slug,
    cabinet,
    locationName,
    error,
    errorType,
    isOnline,
    activeTab,
    refreshing: refreshing || baseMetricsLoading,
    loading: baseMetricsLoading,
    editingSection,
    chartData,
    loadingChart,
    chartGranularity,
    showGranularitySelector,
    availableGranularityOptions,
    activeMetricsFilter,
    canAccessSmibConfig,
    canEditMachines,
    selectedLicencee,
    displayCurrency,
    smibHook,
    // Setters
    setEditingSection,
    setChartGranularity: (
      value: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly'
    ) => {
      hasManuallySetGranularityRef.current = true;
      setChartGranularity(value);
    },
    // Handlers
    handleTabChange,
    handleRefresh,
    handleCabinetUpdated,
    copyToClipboard,
    onBack: () => router.push('/cabinets'),
    onLocationClick: (id: string) => router.push(`/locations/${id}`),
  };
}


