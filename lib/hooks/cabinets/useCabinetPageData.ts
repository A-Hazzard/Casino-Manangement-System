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
import { getMachineChartData } from '@/lib/helpers/machineChart';
import { useCabinetDetailsData, useSmibConfiguration } from '@/lib/hooks/data';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import type { dashboardData } from '@/lib/types';
import { getDefaultChartGranularity } from '@/lib/utils/chartGranularity';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
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
  const [chartData, setChartData] = useState<dashboardData[]>([]);
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
    return 'Range Metrics';
  });

  const [refreshing, setRefreshing] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);

  // ============================================================================
  // Computed Values
  // ============================================================================
  const canAccessSmibConfig = useMemo(() => {
    return (
      user?.roles?.some(role =>
        ['technician', 'admin', 'developer'].includes(role)
      ) ?? false
    );
  }, [user]);

  const canEditMachines = useMemo(() => {
    if (user?.roles?.includes('collector')) return false;
    return (
      user?.roles?.some(role =>
        [
          'developer',
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
        const daysDiff = hoursDiff / 24;
        return daysDiff <= 2; // Show toggle only if ≤ 2 days (48 hours)
      } catch (error) {
        console.error('Error calculating gaming day range:', error);
        return false;
      }
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
      'Range Metrics': '',
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

  const copyToClipboard = async (text: string, label: string) => {
    if (!text || text === 'N/A') {
      toast.error(`No ${label} value to copy`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchCabinetDetailsData();
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
  // Only update if user hasn't manually set granularity
  useEffect(() => {
    if (hasManuallySetGranularityRef.current) {
      return;
    }

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

  // Memoize effective granularity - only changes when granularity matters (short periods)
  // For long periods, granularity is handled client-side and shouldn't trigger refetch
  const effectiveGranularity = useMemo(() => {
    const isShortPeriod =
      activeMetricsFilter === 'Today' || activeMetricsFilter === 'Yesterday';
    return isShortPeriod ? chartGranularity : null;
  }, [activeMetricsFilter, chartGranularity]);

  // Fetch chart data
  useEffect(() => {
    if (!cabinet?._id || !activeMetricsFilter) {
      setLoadingChart(false);
      return;
    }

    makeChartRequest(async signal => {
      setLoadingChart(true);
      try {
        // Only pass granularity to API for Today/Yesterday where it affects the response
        // For Quarterly/All Time, granularity is handled client-side and shouldn't trigger refetch
        const isShortPeriod =
          activeMetricsFilter === 'Today' ||
          activeMetricsFilter === 'Yesterday';
        const granularity = isShortPeriod ? chartGranularity : undefined;
        
        const result = await getMachineChartData(
          String(cabinet._id),
          activeMetricsFilter,
          customDateRange.startDate,
          customDateRange.endDate,
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
      } catch {
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
    refreshing,
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
