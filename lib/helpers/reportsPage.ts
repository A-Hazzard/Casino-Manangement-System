/**
 * Reports Page Helper Functions
 *
 * Provides helper functions for the reports page, including location selection,
 * data refresh, time filtering, dashboard data loading, export functionality,
 * and machine data sorting. It handles all operations related to the reports
 * dashboard and its various tabs.
 *
 * Features:
 * - Handles location selection from dashboard map and locations tab.
 * - Manages dashboard data refresh.
 * - Creates time filter button configurations.
 * - Loads dashboard data from MongoDB (placeholder implementation).
 * - Exports SAS evaluation and machine meters reports to PDF/Excel.
 * - Handles machine data sorting and evaluation data sorting.
 */

import type {
  RealTimeMetrics,
  MachineEvaluationData,
  MachineExportData,
  LocationExportData,
  TopLocationData,
  DateRange,
} from '@/lib/types';
import type { MachineData } from '@/shared/types/machines';
import type { ExtendedLegacyExportData } from '@/lib/utils/exportUtils';
import type React from 'react';

type MachineSortConfig = {
  key: keyof MachineData;
  direction: 'asc' | 'desc';
};

// ============================================================================
// Location Selection Handlers
// ============================================================================

/**
 * Handles location selection from dashboard map
 * @param locationIds - Array of selected location IDs
 */
export function handleLocationSelect(locationIds: string[]) {
  console.warn(`Selected locations: ${JSON.stringify(locationIds)}`);
  // Here you could navigate to location details or show more info
  // For now, just handle the first selected location if any
  if (locationIds.length > 0) {
    console.warn(`Primary selected location: ${locationIds[0]}`);
  }
}

// ============================================================================
// Dashboard Data Management
// ============================================================================

/**
 * Handles refresh action for dashboard data
 * @param setIsRefreshing - Function to set refreshing state
 * @returns Promise that resolves when refresh is complete
 */
export async function handleRefresh(
  setIsRefreshing: (refreshing: boolean) => void
) {
  setIsRefreshing(true);
  await new Promise(resolve => setTimeout(resolve, 1500));
  setIsRefreshing(false);
}

/**
 * Creates time filter buttons configuration
 * @returns Array of time filter button objects
 */
export function createTimeFilterButtons() {
  return [
    { id: 'Today', label: 'Today' },
    { id: 'last7days', label: 'Last 7 Days' },
    { id: 'last30days', label: 'Last 30 Days' },
    { id: 'Custom', label: 'Custom Range' },
  ];
}

/**
 * Loads dashboard data from MongoDB
 * @param setLoading - Function to set loading state
 * @param updateRealTimeMetrics - Function to update real-time metrics
 * @param _selectedDateRange - Selected date range (unused parameter)
 */
export function loadDashboardData(
  setLoading: (loading: boolean) => void,
  _updateRealTimeMetrics: (metrics: RealTimeMetrics) => void,
  _selectedDateRange: unknown
) {
  setLoading(true);

  // TODO: Implement actual API call to fetch dashboard data from MongoDB
  // This should fetch real-time metrics from the database
  // fetchDashboardMetrics().then(data => {
  //   updateRealTimeMetrics(data);
  //   setLoading(false);
  // }).catch(error => {
  //   console.error('Error fetching dashboard metrics:', error);
  //   setLoading(false);
  // });

  // For now, just set loading to false
  setLoading(false);
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Handles location selection for locations tab
 * @param locationIds - Array of selected location IDs
 * @param setSelectedLocations - Function to update selected locations
 */
export function handleLocationSelectLocations(
  locationIds: string[],
  setSelectedLocations: (
    locations: string[] | ((prev: string[]) => string[])
  ) => void
) {
  // For now, handle the first selected location if any
  if (locationIds.length > 0) {
    const locationId = locationIds[0];
    setSelectedLocations(prev =>
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  }
}

/**
 * Handles SAS evaluation export
 * @param selectedLocations - Array of selected location IDs
 * @param paginatedLocations - Array of paginated locations
 * @param topLocations - Array of top locations
 * @param selectedDateRange - Selected date range
 * @param activeMetricsFilter - Active metrics filter
 * @param exportData - Export data function
 * @param toast - Toast notification function
 */
export async function handleExportSASEvaluation(
  selectedLocations: string[],
  paginatedLocations: LocationExportData[],
  topLocations: TopLocationData[],
  selectedDateRange: DateRange | null,
  activeMetricsFilter: string,
  format: 'pdf' | 'excel',
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
  }
) {
  try {
    const filteredData =
      selectedLocations.length > 0
        ? paginatedLocations.filter(loc => {
            // Find the corresponding topLocation to get the correct locationId
            const topLocation = topLocations.find(
              tl => tl.locationName === loc.locationName
            );
            return topLocation
              ? selectedLocations.includes(topLocation.locationId)
              : false;
          })
        : paginatedLocations;

    const exportDataObj: ExtendedLegacyExportData = {
      title: 'SAS Evaluation Report',
      subtitle: 'SAS machine evaluation and performance metrics',
      headers: [
        'Location ID',
        'Location Name',
        'Money In',
        'Money Out',
        'Gross',
        'Total Machines',
        'Online Machines',
        'SAS Machines',
        'Non-SAS Machines',
        'Has SAS Machines',
        'Has Non-SAS Machines',
        'Is Local Server',
      ],
      data: filteredData.map(loc => [
        loc.location,
        loc.locationName,
        (loc.moneyIn || 0).toLocaleString(),
        (loc.moneyOut || 0).toLocaleString(),
        (loc.gross || 0).toLocaleString(),
        loc.totalMachines,
        loc.onlineMachines,
        loc.sasMachines,
        loc.nonSasMachines,
        loc.hasSasMachines ? 'Yes' : 'No',
        loc.hasNonSasMachines ? 'Yes' : 'No',
        loc.isLocalServer ? 'Yes' : 'No',
      ]),
      summary: [
        { label: 'Total Locations', value: filteredData.length.toString() },
        {
          label: 'Total SAS Machines',
          value: filteredData
            .reduce((sum, loc) => sum + loc.sasMachines, 0)
            .toString(),
        },
        {
          label: 'Total Non-SAS Machines',
          value: filteredData
            .reduce((sum, loc) => sum + loc.nonSasMachines, 0)
            .toString(),
        },
        {
          label: 'Total Gross Revenue',
          value: `$${filteredData
            .reduce((sum, loc) => sum + (loc.gross || 0), 0)
            .toLocaleString()}`,
        },
      ],
      metadata: {
        generatedBy: 'Reports System',
        generatedAt: new Date().toISOString(),
        dateRange:
          selectedDateRange?.start && selectedDateRange?.end
            ? `${selectedDateRange.start.toLocaleDateString()} - ${selectedDateRange.end.toLocaleDateString()}`
            : `${activeMetricsFilter}`,
        tab: 'SAS Evaluation',
        selectedLocations:
          selectedLocations.length > 0 ? selectedLocations.length : 'All',
      },
    };

    const { ExportUtils } = await import('@/lib/utils/exportUtils');
    if (format === 'pdf') {
      await ExportUtils.exportToPDF(exportDataObj);
    } else {
      ExportUtils.exportToExcel(exportDataObj);
    }
    toast.success(`SAS evaluation report exported successfully as ${format.toUpperCase()}`);
  } catch (error) {
    console.error('Error exporting SAS evaluation:', error);
    toast.error('Failed to export SAS evaluation report');
  }
}

// ============================================================================
// Sorting Functions
// ============================================================================

/**
 * Handles sorting for machine data
 * @param key - Sort key
 * @param setSortConfig - Function to update sort configuration
 */
export function handleMachineSort(
  key: keyof MachineData,
  setSortConfig: React.Dispatch<React.SetStateAction<MachineSortConfig>>
) {
  setSortConfig(prevConfig => {
    const newDirection: 'asc' | 'desc' =
      prevConfig.key === key && prevConfig.direction === 'desc'
        ? 'asc'
        : 'desc';
    return {
      key,
      direction: newDirection,
    };
  });
}

/**
 * Sorts evaluation data based on sort configuration
 * @param machines - Array of machine evaluation data
 * @param sortConfig - Current sort configuration
 * @returns Sorted array of machines
 */
export function sortEvaluationData(
  machines: MachineEvaluationData[],
  sortConfig: { key: string; direction: 'asc' | 'desc' }
) {
  return [...machines].sort(
    (a: MachineEvaluationData, b: MachineEvaluationData) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortConfig.key) {
        case 'locationName':
          aValue = a.locationName;
          bValue = b.locationName;
          break;
        case 'machineId':
          aValue = a.machineId;
          bValue = b.machineId;
          break;
        case 'gameTitle':
          aValue = a.gameTitle;
          bValue = b.gameTitle;
          break;
        case 'manufacturer':
          aValue = a.manufacturer;
          bValue = b.manufacturer;
          break;
        case 'handle':
          aValue = a.coinIn || 0;
          bValue = b.coinIn || 0;
          break;
        case 'moneyIn':
          aValue = a.drop || 0;
          bValue = b.drop || 0;
          break;
        case 'netWin':
          aValue = a.netWin;
          bValue = b.netWin;
          break;
        case 'jackpot':
          aValue = 0; // evaluationData doesn't have jackpot
          bValue = 0;
          break;
        case 'avgWagerPerGame':
          aValue = a.avgBet || 0;
          bValue = b.avgBet || 0;
          break;
        case 'actualHold':
          aValue = a.actualHold || 0;
          bValue = b.actualHold || 0;
          break;
        case 'theoreticalHold':
          aValue = a.theoreticalHold;
          bValue = b.theoreticalHold;
          break;
        case 'gamesPlayed':
          aValue = a.gamesPlayed;
          bValue = b.gamesPlayed;
          break;
        default:
          aValue = a.netWin;
          bValue = b.netWin;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    }
  );
}

/**
 * Handles machine meters export
 * @param activeTab - Current active tab
 * @param overviewMachines - Overview machines data
 * @param offlineMachines - Offline machines data
 * @param activeMetricsFilter - Active metrics filter
 * @param customDateRange - Custom date range
 * @param exportData - Export data function
 * @param toast - Toast notification function
 */
export async function handleExportMeters(
  activeTab: string,
  overviewMachines: MachineExportData[],
  offlineMachines: MachineExportData[],
  activeMetricsFilter: string,
  customDateRange: { startDate: Date; endDate: Date } | null,
  format: 'pdf' | 'excel',
  toast: {
    error: (message: string) => void;
    success: (message: string) => void;
  }
) {
  try {
    // Ensure we have data to export
    let machinesToExport: MachineExportData[] = [];

    if (activeTab === 'overview') {
      if (overviewMachines.length === 0) {
        toast.error(
          'No overview data available to export. Please wait for data to load.'
        );
        return;
      }
      machinesToExport = overviewMachines;
    } else if (activeTab === 'offline') {
      if (offlineMachines.length === 0) {
        toast.error(
          'No offline data available to export. Please wait for data to load.'
        );
        return;
      }
      machinesToExport = offlineMachines;
    } else {
      // Default to overview data
      if (overviewMachines.length === 0) {
        toast.error(
          'No data available to export. Please wait for data to load.'
        );
        return;
      }
      machinesToExport = overviewMachines;
    }

    const metersData: ExtendedLegacyExportData = {
      title: 'Machines Export Report',
      subtitle: `Machine performance data - ${
        activeMetricsFilter === 'Custom' &&
        customDateRange?.startDate &&
        customDateRange?.endDate
          ? `${customDateRange.startDate.toDateString()} - ${customDateRange.endDate.toDateString()}`
          : activeMetricsFilter
      }`,
      headers: [
        'Machine ID',
        'Machine Name',
        'Game Title',
        'Location',
        'Manufacturer',
        'Type',
        'Net Win',
        'Drop',
        'Cancelled Credits',
        'Jackpot',
        'Games Played',
        'Hold %',
        'Status',
        'SAS Enabled',
      ],
      data: machinesToExport.map((machine: MachineExportData) => [
        machine.machineId,
        machine.machineName,
        machine.gameTitle,
        machine.locationName,
        machine.manufacturer,
        'Slot', // Default type since it's not in the data
        machine.netWin.toLocaleString(),
        machine.drop.toLocaleString(),
        machine.totalCancelledCredits.toLocaleString(),
        '0', // Jackpot not available in current data
        machine.gamesPlayed.toLocaleString(),
        (() => {
          const hold = machine.theoreticalHold;
          if (hold === undefined) return '0%';
          const hasDecimals = hold % 1 !== 0;
          const decimalPart = hold % 1;
          const hasSignificantDecimals = hasDecimals && decimalPart >= 0.1;
          return hold.toFixed(hasSignificantDecimals ? 1 : 0) + '%';
        })(),
        machine.isOnline ? 'Online' : 'Offline',
        machine.isSasEnabled ? 'Yes' : 'No',
      ]),
      summary: [
        {
          label: 'Total Machines',
          value: machinesToExport.length.toString(),
        },
        {
          label: 'Online Machines',
          value: machinesToExport
            .filter((m: MachineExportData) => m.isOnline)
            .length.toString(),
        },
        {
          label: 'Offline Machines',
          value: machinesToExport
            .filter((m: MachineExportData) => !m.isOnline)
            .length.toString(),
        },
        {
          label: 'Total Net Win',
          value: `$${machinesToExport
            .reduce(
              (sum: number, m: MachineExportData) => sum + (m.netWin || 0),
              0
            )
            .toLocaleString()}`,
        },
        {
          label: 'Total Drop',
          value: `$${machinesToExport
            .reduce(
              (sum: number, m: MachineExportData) => sum + (m.drop || 0),
              0
            )
            .toLocaleString()}`,
        },
      ],
      metadata: {
        generatedBy: 'Reports System',
        generatedAt: new Date().toISOString(),
        dateRange: activeMetricsFilter,
        tab: 'Machines',
      },
    };

    const { ExportUtils } = await import('@/lib/utils/exportUtils');
    if (format === 'pdf') {
      await ExportUtils.exportToPDF(metersData);
    } else {
      ExportUtils.exportToExcel(metersData);
    }
    toast.success(`Machine data exported successfully as ${format.toUpperCase()}`);
  } catch (error) {
    console.error('Error exporting machine data:', error);
    toast.error('Failed to export machine data');
  }
}
