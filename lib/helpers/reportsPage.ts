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
  DateRange,
  LocationExportData,
  MachineEvaluationData,
  TopLocationData,
  dateRange,
} from '@/lib/types';
import type { ExtendedLegacyExportData } from '@/lib/utils/exportUtils';
import type { MachineData } from '@/shared/types/machines';

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Handles Machines Evaluation export
 * @param manufacturerData - Manufacturer performance data
 * @param gamesData - Games performance data
 * @param topMachines - Top performing machines
 * @param bottomMachines - Least performing machines
 * @param summaryCalculations - Summary calculations
 * @param selectedDateRange - Selected date range
 * @param activeMetricsFilter - Active metrics filter
 * @param format - Export format (pdf or excel)
 * @param toast - Toast notification function
 */
export async function handleExportMachinesEvaluation(
  manufacturerData: Array<{
    manufacturer: string;
    floorPositions: number;
    totalHandle: number;
    totalWin: number;
    totalDrop: number;
    totalCancelledCredits: number;
    totalGross: number;
    totalGamesPlayed: number;
  }>,
  gamesData: Array<{
    gameName: string;
    floorPositions: number;
    totalHandle: number;
    totalWin: number;
    totalDrop: number;
    totalCancelledCredits: number;
    totalGross: number;
    totalGamesPlayed: number;
  }>,
  topMachines: MachineEvaluationData[],
  bottomMachines: MachineEvaluationData[],
  summaryCalculations: {
    handleStatement: string;
    winStatement: string;
    gamesPlayedStatement: string;
  },
  selectedDateRange: DateRange | null,
  activeMetricsFilter: string,
  format: 'pdf' | 'excel',
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
  }
) {
  try {
    if (
      manufacturerData.length === 0 &&
      gamesData.length === 0 &&
      topMachines.length === 0 &&
      bottomMachines.length === 0
    ) {
      toast.error('No data available to export. Please wait for data to load.');
      return;
    }

    const dateRangeText =
      activeMetricsFilter === 'Custom' &&
      selectedDateRange?.start &&
      selectedDateRange?.end
        ? `${selectedDateRange.start.toLocaleDateString()} - ${selectedDateRange.end.toLocaleDateString()}`
        : activeMetricsFilter;

    // Build comprehensive export data with multiple sections
    const exportDataObj: ExtendedLegacyExportData = {
      title: 'Machines Evaluation Report',
      subtitle: `Machine performance evaluation - ${dateRangeText}`,
      headers: [
        'Category',
        'Item Name',
        'Floor Positions %',
        'Total Handle %',
        'Total Win %',
        'Total Drop %',
        'Total Canc. Cr. %',
        'Total Gross %',
        'Total Games Played %',
        'Details',
      ],
      data: [
        // Summary Section
        [
          'SUMMARY',
          'Handle Statement',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          summaryCalculations.handleStatement,
        ],
        [
          'SUMMARY',
          'Win Statement',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          summaryCalculations.winStatement,
        ],
        [
          'SUMMARY',
          'Games Played Statement',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          summaryCalculations.gamesPlayedStatement,
        ],
        // Separator row
        ['', '', '', '', '', '', '', '', '', ''],
        // Manufacturers Performance Section Header
        [
          'MANUFACTURERS PERFORMANCE',
          'All Metrics in Percentage',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ],
        // Manufacturers Performance Data
        ...manufacturerData.map(mfr => [
          'Manufacturer',
          mfr.manufacturer,
          mfr.floorPositions.toFixed(2) + '%',
          mfr.totalHandle.toFixed(2) + '%',
          mfr.totalWin.toFixed(2) + '%',
          mfr.totalDrop.toFixed(2) + '%',
          mfr.totalCancelledCredits.toFixed(2) + '%',
          mfr.totalGross.toFixed(2) + '%',
          mfr.totalGamesPlayed.toFixed(2) + '%',
          '',
        ]),
        // Separator row
        ['', '', '', '', '', '', '', '', '', ''],
        // Games Performance Section Header
        [
          'GAMES PERFORMANCE',
          'All Metrics in Percentage',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ],
        // Games Performance Data
        ...gamesData.map(game => [
          'Game',
          game.gameName,
          game.floorPositions.toFixed(2) + '%',
          game.totalHandle.toFixed(2) + '%',
          game.totalWin.toFixed(2) + '%',
          game.totalDrop.toFixed(2) + '%',
          game.totalCancelledCredits.toFixed(2) + '%',
          game.totalGross.toFixed(2) + '%',
          game.totalGamesPlayed.toFixed(2) + '%',
          '',
        ]),
        // Separator row
        ['', '', '', '', '', '', '', '', '', ''],
        // Top Machines Section Header
        [
          'TOP PERFORMING MACHINES',
          'Top 5 Machines by Selected Criteria',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ],
        // Top Machines Data
        ...topMachines.map(machine => [
          'Machine',
          `${machine.machineName} (${machine.machineId})`,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          `Location: ${machine.locationName || 'N/A'} | Handle: $${(machine.coinIn || 0).toLocaleString()} | Net Win: $${(machine.netWin || 0).toLocaleString()} | Gross: $${(machine.gross || 0).toLocaleString()} | Hold: ${((machine.actualHold || 0) * 100).toFixed(1)}% | Games Played: ${(machine.gamesPlayed || 0).toLocaleString()}`,
        ]),
        // Separator row
        ['', '', '', '', '', '', '', '', '', ''],
        // Bottom Machines Section Header
        [
          'LEAST PERFORMING MACHINES',
          'Bottom 5 Machines by Selected Criteria',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ],
        // Bottom Machines Data
        ...bottomMachines.map(machine => [
          'Machine',
          `${machine.machineName} (${machine.machineId})`,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          `Location: ${machine.locationName || 'N/A'} | Handle: $${(machine.coinIn || 0).toLocaleString()} | Net Win: $${(machine.netWin || 0).toLocaleString()} | Gross: $${(machine.gross || 0).toLocaleString()} | Hold: ${((machine.actualHold || 0) * 100).toFixed(1)}% | Games Played: ${(machine.gamesPlayed || 0).toLocaleString()}`,
        ]),
      ],
      summary: [
        {
          label: 'Total Manufacturers',
          value: manufacturerData.length.toString(),
        },
        {
          label: 'Total Games',
          value: gamesData.length.toString(),
        },
        {
          label: 'Top Machines',
          value: topMachines.length.toString(),
        },
        {
          label: 'Least Performing Machines',
          value: bottomMachines.length.toString(),
        },
      ],
      metadata: {
        generatedBy: 'Reports System',
        generatedAt: new Date().toISOString(),
        dateRange: dateRangeText,
        tab: 'Machines Evaluation',
      },
    };

    const { ExportUtils } = await import('@/lib/utils/exportUtils');
    if (format === 'pdf') {
      await ExportUtils.exportToPDF(exportDataObj);
    } else {
      ExportUtils.exportToExcel(exportDataObj);
    }
    toast.success(
      `Machines evaluation report exported successfully as ${format.toUpperCase()}`
    );
  } catch (error) {
    console.error('Error exporting machines evaluation:', error);
    toast.error('Failed to export machines evaluation report');
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
    toast.success(
      `SAS evaluation report exported successfully as ${format.toUpperCase()}`
    );
  } catch (error) {
    console.error('Error exporting SAS evaluation:', error);
    toast.error('Failed to export SAS evaluation report');
  }
}

// ============================================================================
// Sorting Functions
// ============================================================================

/**
 * Handles machine meters export
 * @param activeTab - Current active tab
 * @param overviewMachines - Overview machines data
 * @param offlineMachines - Offline machines data
 * @param activeMetricsFilter - Active metrics filter
 * @param customDateRange - Custom date range
 * @param format - Export format (pdf or excel)
 * @param toast - Toast notification function
 */
export async function handleExportMeters(
  activeTab: string,
  overviewMachines: MachineData[],
  offlineMachines: MachineData[],
  activeMetricsFilter: string,
  customDateRange: dateRange | null,
  format: 'pdf' | 'excel',
  toast: {
    error: (message: string) => void;
    success: (message: string) => void;
  }
) {
  try {
    // Ensure we have data to export
    let machinesToExport: MachineData[] = [];

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

    const startStr = customDateRange?.startDate || customDateRange?.start;
    const endStr = customDateRange?.endDate || customDateRange?.end;

    const metersData: ExtendedLegacyExportData = {
      title: 'Machines Export Report',
      subtitle: `Machine performance data - ${
        activeMetricsFilter === 'Custom' && startStr && endStr
          ? `${new Date(startStr).toDateString()} - ${new Date(endStr).toDateString()}`
          : activeMetricsFilter
      }`,
      headers: [
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
      data: machinesToExport.map((machine: MachineData) => [
        `${machine.machineName} (${machine.machineId})`,
        machine.gameTitle,
        machine.locationName,
        machine.manufacturer,
        'Slot', // Default type since it's not in the data
        (machine.netWin || 0).toLocaleString(),
        (machine.drop || 0).toLocaleString(),
        (machine.totalCancelledCredits || 0).toLocaleString(),
        '0', // Jackpot not available in current data
        (machine.gamesPlayed || 0).toLocaleString(),
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
            .filter((m: MachineData) => m.isOnline)
            .length.toString(),
        },
        {
          label: 'Offline Machines',
          value: machinesToExport
            .filter((m: MachineData) => !m.isOnline)
            .length.toString(),
        },
        {
          label: 'Total Net Win',
          value: `$${machinesToExport
            .reduce(
              (sum: number, m: MachineData) => sum + (m.netWin || 0),
              0
            )
            .toLocaleString()}`,
        },
        {
          label: 'Total Drop',
          value: `$${machinesToExport
            .reduce(
              (sum: number, m: MachineData) => sum + (m.drop || 0),
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
    toast.success(
      `Machine data exported successfully as ${format.toUpperCase()}`
    );
  } catch (error) {
    console.error('Error exporting machine data:', error);
    toast.error('Failed to export machine data');
  }
}
