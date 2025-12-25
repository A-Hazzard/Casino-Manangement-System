/**
 * Helper functions for Locations Tab
 *
 * Contains export handlers and utility functions for the Locations tab
 *
 * Features:
 * - Export location overview data
 * - Export SAS evaluation data
 * - Export revenue analysis data
 */

import { handleExportSASEvaluation as handleExportSASEvaluationHelper } from '@/lib/helpers/reportsPage';
import { DateRange, LocationExportData, TopLocationData } from '@/lib/types';
import { AggregatedLocation } from '@/lib/types/location';
import type { ExtendedLegacyExportData } from '@/lib/utils/exportUtils';
import { ExportUtils } from '@/lib/utils/exportUtils';
import { LocationMetrics, TopLocation } from '@/shared/types';

type ExportLocationOverviewParams = {
  locations: AggregatedLocation[];
  metricsOverview: LocationMetrics | null;
  activeMetricsFilter: string;
  format: 'pdf' | 'excel';
  formatAmount: (amount: number) => string;
  shouldShowCurrency: () => boolean;
  toast: {
    success: (message: string, options?: { duration?: number }) => void;
    error: (message: string, options?: { duration?: number }) => void;
  };
};

type ExportSASEvaluationParams = {
  selectedLocations: string[];
  allLocationsForDropdown: AggregatedLocation[];
  topLocations: TopLocation[];
  selectedDateRange: DateRange | null;
  activeMetricsFilter: string;
  format: 'pdf' | 'excel';
  toast: {
    success: (message: string, options?: { duration?: number }) => void;
    error: (message: string, options?: { duration?: number }) => void;
  };
};

type ExportRevenueAnalysisParams = {
  selectedLocations: string[];
  allLocationsForDropdown: AggregatedLocation[];
  topLocations: TopLocation[];
  activeMetricsFilter: string;
  format: 'pdf' | 'excel';
  formatAmount: (amount: number) => string;
  shouldShowCurrency: () => boolean;
  toast: {
    success: (message: string, options?: { duration?: number }) => void;
    error: (message: string, options?: { duration?: number }) => void;
  };
};

/**
 * Export location overview data
 */
export async function handleExportLocationOverview({
  locations,
  metricsOverview,
  activeMetricsFilter,
  format,
  formatAmount,
  shouldShowCurrency,
  toast,
}: ExportLocationOverviewParams): Promise<void> {
  if (locations.length === 0) {
    toast.error('No location data to export', {
      duration: 3000,
    });
    return;
  }

  try {
    // Calculate totals from all locations if metricsOverview is not available
    const calculatedTotals = locations.reduce(
      (acc, loc) => {
        acc.totalGross += (loc.gross as number) || 0;
        acc.totalDrop += (loc.moneyIn as number) || 0;
        acc.totalCancelledCredits += (loc.moneyOut as number) || 0;
        acc.totalMachines += loc.totalMachines || 0;
        acc.onlineMachines += loc.onlineMachines || 0;
        return acc;
      },
      {
        totalGross: 0,
        totalDrop: 0,
        totalCancelledCredits: 0,
        totalMachines: 0,
        onlineMachines: 0,
      }
    );

    // Use metricsOverview if available, otherwise use calculated totals
    const finalTotals = metricsOverview || {
      totalGross: calculatedTotals.totalGross,
      totalDrop: calculatedTotals.totalDrop,
      totalCancelledCredits: calculatedTotals.totalCancelledCredits,
      totalMachines: calculatedTotals.totalMachines,
      onlineMachines: calculatedTotals.onlineMachines,
    };

    // Calculate overall hold percentage
    const overallHoldPercentage =
      finalTotals.totalDrop > 0
        ? ((finalTotals.totalGross / finalTotals.totalDrop) * 100).toFixed(2)
        : '0.00';

    // Prepare location data rows
    const locationRows = locations.map(loc => [
      loc.locationName || loc.name || 'Unknown',
      (loc.totalMachines || 0).toString(),
      (loc.onlineMachines || 0).toString(),
      shouldShowCurrency()
        ? formatAmount(loc.moneyIn || 0)
        : `$${((loc.moneyIn as number) || 0).toLocaleString()}`,
      shouldShowCurrency()
        ? formatAmount(loc.moneyOut || 0)
        : `$${((loc.moneyOut as number) || 0).toLocaleString()}`,
      shouldShowCurrency()
        ? formatAmount(loc.gross || 0)
        : `$${((loc.gross as number) || 0).toLocaleString()}`,
      ((loc.moneyIn as number) || 0) > 0
        ? `${((((loc.gross as number) || 0) / ((loc.moneyIn as number) || 1)) * 100).toFixed(2)}%`
        : '0%',
    ]);

    // Add totals row at the end
    const totalsRow = [
      'TOTAL',
      finalTotals.totalMachines.toString(),
      finalTotals.onlineMachines.toString(),
      shouldShowCurrency()
        ? formatAmount(finalTotals.totalDrop)
        : `$${finalTotals.totalDrop.toLocaleString()}`,
      shouldShowCurrency()
        ? formatAmount(finalTotals.totalCancelledCredits)
        : `$${finalTotals.totalCancelledCredits.toLocaleString()}`,
      shouldShowCurrency()
        ? formatAmount(finalTotals.totalGross)
        : `$${finalTotals.totalGross.toLocaleString()}`,
      `${overallHoldPercentage}%`,
    ];

    const exportDataObj: ExtendedLegacyExportData = {
      title: 'Location Overview Report',
      subtitle: `Location performance metrics for ${activeMetricsFilter || 'Today'}`,
      metadata: {
        generatedBy: 'Evolution CMS',
        generatedAt: new Date().toISOString(),
        dateRange: activeMetricsFilter || 'Today',
        tab: 'location-overview',
        selectedLocations: locations.length,
      },
      summary: [
        {
          label: 'Total Gross Revenue',
          value: shouldShowCurrency()
            ? formatAmount(finalTotals.totalGross)
            : `$${finalTotals.totalGross.toLocaleString()}`,
        },
        {
          label: 'Money In',
          value: shouldShowCurrency()
            ? formatAmount(finalTotals.totalDrop)
            : `$${finalTotals.totalDrop.toLocaleString()}`,
        },
        {
          label: 'Money Out',
          value: shouldShowCurrency()
            ? formatAmount(finalTotals.totalCancelledCredits)
            : `$${finalTotals.totalCancelledCredits.toLocaleString()}`,
        },
        {
          label: 'Online Machines',
          value: `${finalTotals.onlineMachines}/${finalTotals.totalMachines}`,
        },
        { label: 'Overall Hold %', value: `${overallHoldPercentage}%` },
      ],
      headers: [
        'Location Name',
        'Total Machines',
        'Online Machines',
        'Money In',
        'Money Out',
        'Gross Revenue',
        'Hold %',
      ],
      data: [...locationRows, totalsRow],
    };

    if (format === 'pdf') {
      await ExportUtils.exportToPDF(exportDataObj);
    } else {
      ExportUtils.exportToExcel(exportDataObj);
    }

    toast.success(
      `Successfully exported ${locations.length} locations to ${format.toUpperCase()}`,
      {
        duration: 3000,
      }
    );
  } catch (error) {
    console.error('Export failed:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    toast.error(
      `Failed to export location overview report as ${format.toUpperCase()}: ${errorMessage}`,
      {
        duration: 3000,
      }
    );
  }
}

/**
 * Export SAS evaluation data
 */
export async function handleExportSASEvaluation({
  selectedLocations,
  allLocationsForDropdown,
  topLocations,
  selectedDateRange,
  activeMetricsFilter,
  format,
  toast,
}: ExportSASEvaluationParams): Promise<void> {
  // Convert AggregatedLocation[] to LocationExportData[]
  const paginatedLocations: LocationExportData[] = allLocationsForDropdown.map(
    loc => ({
      location: (loc.location || loc._id) as string,
      locationName: (loc.locationName || loc.name || 'Unknown') as string,
      moneyIn: (loc.moneyIn || 0) as number,
      moneyOut: (loc.moneyOut || 0) as number,
      gross: (loc.gross || 0) as number,
      totalMachines: loc.totalMachines || 0,
      onlineMachines: loc.onlineMachines || 0,
      sasMachines: (loc.sasMachines || 0) as number,
      nonSasMachines: (loc.nonSasMachines || 0) as number,
      hasSasMachines: (loc.hasSasMachines ||
        (loc.sasMachines as number) > 0) as boolean,
      hasNonSasMachines: (loc.hasNonSasMachines ||
        (loc.nonSasMachines as number) > 0) as boolean,
      isLocalServer: (loc.isLocalServer || false) as boolean,
    })
  );

  // Convert TopLocation[] to TopLocationData[]
  const topLocationsData: TopLocationData[] = topLocations.map(loc => ({
    locationId: loc.locationId,
    locationName: loc.locationName,
    gross: loc.gross,
    drop: loc.drop,
    cancelledCredits: loc.cancelledCredits,
    onlineMachines: loc.onlineMachines,
    totalMachines: loc.totalMachines,
  }));

  await handleExportSASEvaluationHelper(
    selectedLocations,
    paginatedLocations,
    topLocationsData,
    selectedDateRange,
    activeMetricsFilter,
    format,
    toast
  );
}

/**
 * Export revenue analysis data
 */
export async function handleExportRevenueAnalysis({
  selectedLocations,
  allLocationsForDropdown,
  topLocations,
  activeMetricsFilter,
  format,
  formatAmount,
  shouldShowCurrency,
  toast,
}: ExportRevenueAnalysisParams): Promise<void> {
  try {
    const filteredData =
      selectedLocations.length > 0
        ? allLocationsForDropdown.filter(loc => {
            // Find the corresponding topLocation to get the correct locationId
            const topLocation = topLocations.find(
              tl => tl.locationName === (loc.name || loc.locationName)
            );
            return topLocation
              ? selectedLocations.includes(topLocation.locationId)
              : false;
          })
        : allLocationsForDropdown;

    const exportDataObj: ExtendedLegacyExportData = {
      title: 'Revenue Analysis Report',
      subtitle: `Revenue analysis for ${activeMetricsFilter || 'Today'}`,
      metadata: {
        generatedBy: 'Evolution CMS',
        generatedAt: new Date().toISOString(),
        dateRange: activeMetricsFilter || 'Today',
        tab: 'location-revenue',
        selectedLocations: selectedLocations.length,
      },
      headers: [
        'Location Name',
        'Total Machines',
        'Online Machines',
        'Money In',
        'Money Out',
        'Gross Revenue',
        'Hold %',
      ],
      data: filteredData.map(loc => [
        loc.locationName || loc.name || 'Unknown',
        (loc.totalMachines || 0).toString(),
        (loc.onlineMachines || 0).toString(),
        shouldShowCurrency()
          ? formatAmount(loc.moneyIn || 0)
          : `$${((loc.moneyIn as number) || 0).toLocaleString()}`,
        shouldShowCurrency()
          ? formatAmount(loc.moneyOut || 0)
          : `$${((loc.moneyOut as number) || 0).toLocaleString()}`,
        shouldShowCurrency()
          ? formatAmount(loc.gross || 0)
          : `$${((loc.gross as number) || 0).toLocaleString()}`,
        ((loc.moneyIn as number) || 0) > 0
          ? `${((((loc.gross as number) || 0) / ((loc.moneyIn as number) || 1)) * 100).toFixed(2)}%`
          : '0%',
      ]),
    };

    if (format === 'pdf') {
      await ExportUtils.exportToPDF(exportDataObj);
    } else {
      ExportUtils.exportToExcel(exportDataObj);
    }

    toast.success(
      `Successfully exported revenue analysis to ${format.toUpperCase()}`,
      {
        duration: 3000,
      }
    );
  } catch (error) {
    console.error('Error exporting revenue analysis:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    toast.error(
      `Failed to export revenue analysis as ${format.toUpperCase()}: ${errorMessage}`,
      {
        duration: 3000,
      }
    );
  }
}
