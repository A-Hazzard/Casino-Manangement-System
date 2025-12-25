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
import { getDefaultChartGranularity } from '@/lib/utils/chartGranularity';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type { dashboardData } from '@/lib/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export function useCabinetPageData() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const slug = pathname.split('/').pop() || '';
  const { user } = useUserStore();
  const {
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();
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
  const [loadingChart, setLoadingChart] = useState(false);
  const [chartGranularity, setChartGranularity] = useState<'hourly' | 'minute'>(
    () =>
      getDefaultChartGranularity(
        activeMetricsFilter || 'Today',
        customDateRange?.startDate,
        customDateRange?.endDate
      )
  );
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
    return user?.roles?.some(role => ['technician', 'admin', 'developer'].includes(role)) ?? false;
  }, [user]);

  const canEditMachines = useMemo(() => {
    if (user?.roles?.includes('collector')) return false;
    return user?.roles?.some(role => ['developer', 'admin', 'manager', 'location admin', 'technician'].includes(role)) ?? false;
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
        return hoursDiff <= 24;
      } catch (error) {
        console.error('Error calculating gaming day range:', error);
        return false;
      }
    }
    return false;
  }, [activeMetricsFilter, customDateRange]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    const sectionMap: Record<string, string> = {
      'Range Metrics': '',
      'Live Metrics': 'live-metrics',
      'Bill Validator': 'bill-validator',
      'Activity Log': 'activity-log',
      'Collection History': 'collection-history',
      'Collection Settings': 'collection-settings',
      'Configurations': 'configurations',
    };

    const params = new URLSearchParams(searchParams?.toString() || '');
    const sectionValue = sectionMap[tab];
    if (sectionValue) params.set('section', sectionValue);
    else params.delete('section');

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

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

  // Fetch chart data
  useEffect(() => {
    if (!cabinet?._id || !activeMetricsFilter) return;

    makeChartRequest(async signal => {
      setLoadingChart(true);
      try {
        const isLongPeriod = ['7d', '30d', 'last7days', 'last30days'].includes(activeMetricsFilter);
        const granularity = (showGranularitySelector && !isLongPeriod) ? chartGranularity : undefined;
        
        const data = await getMachineChartData(
          String(cabinet._id),
          activeMetricsFilter,
          customDateRange.startDate,
          customDateRange.endDate,
          displayCurrency,
          selectedLicencee,
          granularity,
          signal
        );
        if (data) setChartData(data);
      } catch {
        setChartData([]);
      } finally {
        setLoadingChart(false);
      }
    });
  }, [cabinet?._id, activeMetricsFilter, customDateRange, displayCurrency, selectedLicencee, chartGranularity, showGranularitySelector, makeChartRequest]);

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
  }, [cabinet, smibHook]);

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
    activeMetricsFilter,
    canAccessSmibConfig,
    canEditMachines,
    selectedLicencee,
    displayCurrency,
    smibHook,
    // Setters
    setEditingSection,
    setChartGranularity: (value: 'hourly' | 'minute') => {
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


