/**
 * useMachinePageData Hook
 *
 * Coordinates all data and UI state for the machine detail page.
 */

'use client';

import { useCabinetDetailsData, useSmibConfiguration } from '@/lib/hooks/data';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function useMachinePageData() {
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

  const canManageMachines = useMemo(() => {
    const roles = user?.roles || [];
    if (roles.includes('collector')) return false;
    return ['developer', 'admin', 'manager', 'location admin', 'technician'].some(r => roles.includes(r));
  }, [user]);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchCabinetDetailsData();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeMetricsFilter) setDateFilterInitialized(true);
  }, [activeMetricsFilter]);

  useEffect(() => {
    if (cabinet) {
      smibHook.setCommunicationModeFromData(cabinet);
      smibHook.setFirmwareVersionFromData(cabinet);
    }
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
    canManageMachines,
    selectedLicencee,
    smibHook,
    handleTabChange,
    handleRefresh,
    handleCabinetUpdated,
    onBack: () => router.push('/machines'),
    onLocationClick: (id: string) => router.push(`/locations/${id}`),
  };
}



