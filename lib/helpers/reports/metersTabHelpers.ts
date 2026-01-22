/**
 * Meters Tab Helpers
 *
 * Helper functions for the Meters tab including:
 * - Export functionality (PDF/Excel)
 * - Data filtering
 * - Top machines calculation
 *
 * @module lib/helpers/reports/metersTabHelpers
 */

import { colorPalette } from '@/lib/constants';
import type { TopPerformingItem } from '@/lib/types';
import { DateRange } from '@/lib/utils/date';
import {
  exportMetersReportExcel,
  exportMetersReportPDF,
} from '@/lib/utils/export';
import type { MetersReportData } from '@/shared/types/meters';
import axios from 'axios';
import { toast } from 'sonner';

/**
 * Format machine ID for display
 *
 * Formats as: serialNumber || custom.name (custom.name if different, game)
 * Shows "(game name not provided)" in red if game is missing
 */
export function formatMachineIdForDisplay(
  item: MetersReportData
): {
  mainIdentifier: string;
  displayParts: Array<{ text: string; isError: boolean }>;
  hasLink: boolean;
  machineDocumentId?: string;
} {
  const itemRecord = item as Record<string, unknown>;
  const serialNumberRaw = itemRecord.serialNumber as string | undefined;
  const serialNumber = serialNumberRaw?.trim() || '';
  const hasSerialNumber = serialNumber !== '';

  const customNameRaw = itemRecord.customName as string | undefined;
  const customName = customNameRaw?.trim() || '';
  const hasCustomName = customName !== '';

  const mainIdentifier = hasSerialNumber
    ? serialNumber
    : hasCustomName
      ? customName
      : item.machineId;

  const usedSerialNumber = hasSerialNumber;

  const game = item.game?.trim() || '';
  const hasGame = game !== '';

  const parts: Array<{ text: string; isError: boolean }> = [];

  if (usedSerialNumber && hasCustomName && customName !== serialNumber) {
    parts.push({ text: customName, isError: false });
  }

  if (hasGame) {
    parts.push({ text: game, isError: false });
  } else {
    parts.push({ text: '(game name not provided)', isError: true });
  }

  return {
    mainIdentifier,
    displayParts: parts,
    hasLink: !!item.machineDocumentId,
    machineDocumentId: item.machineDocumentId,
  };
}

/**
 * Filter meters data based on search term
 *
 * Searches in machineId, location, serialNumber, and custom name
 */
export function filterMetersData(
  data: MetersReportData[],
  search: string
): MetersReportData[] {
  if (!search.trim()) {
    return data;
  }

  const searchLower = search.toLowerCase().trim();
  return data.filter(item => {
    const machineId = item.machineId?.toLowerCase() || '';
    const location = item.location?.toLowerCase() || '';

    const itemRecord = item as Record<string, unknown>;
    const serialNumber =
      (itemRecord.serialNumber as string)?.toLowerCase() || '';
    const customName =
      (
        (itemRecord.custom as Record<string, unknown>)?.name as string
      )?.toLowerCase() || '';

    const machineIdMatch = machineId.includes(searchLower);
    const locationMatch = location.includes(searchLower);
    const serialNumberMatch = serialNumber.includes(searchLower);
    const customNameMatch = customName.includes(searchLower);

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
}

/**
 * Calculate top performing machines from meters data
 *
 * Groups by machineDocumentId, sorts by billIn (drop) descending, and returns top 10
 */
export function calculateTopMachines(
  allMetersData: MetersReportData[]
): TopPerformingItem[] {
  if (allMetersData.length === 0) {
    return [];
  }

  try {
    const machineMap = new Map<
      string,
      {
        machineId: string;
        machineDocumentId: string;
        totalDrop: number;
        location: string;
        locationId: string;
        game?: string;
        serialNumber?: string;
        custom?: Record<string, unknown>;
      }
    >();

    allMetersData.forEach(item => {
      const existing = machineMap.get(item.machineDocumentId);
      const dropValue = item.billIn || 0;
      if (existing) {
        existing.totalDrop = Math.max(existing.totalDrop, dropValue);
      } else {
        const itemRecord = item as Record<string, unknown>;
        machineMap.set(item.machineDocumentId, {
          machineId: item.machineId,
          machineDocumentId: item.machineDocumentId,
          totalDrop: dropValue,
          location: item.location,
          locationId: item.locationId,
          game: item.game,
          serialNumber: itemRecord.serialNumber as string | undefined,
          custom: itemRecord.custom as Record<string, unknown> | undefined,
        });
      }
    });

    const topMachines = Array.from(machineMap.values())
      .sort((a, b) => b.totalDrop - a.totalDrop)
      .slice(0, 10)
      .map((item, index) => {
        const serialNumber = item.serialNumber?.trim() || '';
        const hasSerialNumber = serialNumber !== '';

        const customName =
          (item.custom as Record<string, unknown>)?.name as string | undefined;
        const customNameTrimmed = customName?.trim() || '';
        const hasCustomName = customNameTrimmed !== '';

        const mainIdentifier = hasSerialNumber
          ? serialNumber
          : hasCustomName
            ? customNameTrimmed
            : item.machineId;

        const game = item.game?.trim() || '';
        const hasGame = game !== '';

        const bracketParts: string[] = [];

        if (hasCustomName && customNameTrimmed !== mainIdentifier) {
          bracketParts.push(customNameTrimmed);
        }

        if (hasGame) {
          bracketParts.push(game);
        } else {
          bracketParts.push('(game name not provided)');
        }

        const displayName = `${mainIdentifier} (${bracketParts.join(', ')})`;

        return {
          id: item.machineDocumentId,
          _id: item.machineDocumentId,
          name: displayName,
          performance: 0,
          revenue: item.totalDrop,
          total: item.totalDrop,
          totalDrop: item.totalDrop,
          color: colorPalette[index % colorPalette.length],
          location: item.location,
          locationId: item.locationId,
          machine: item.machineId,
          machineId: item.machineId,
          game: item.game,
        };
      });

    return topMachines;
  } catch (error) {
    console.error('Failed to calculate top machines:', error);
    return [];
  }
}

/**
 * Export meters report to PDF or Excel
 *
 * Fetches all data for export (not just loaded batches) and exports in the specified format
 */
export async function handleExportMeters({
  selectedLocations,
  locations,
  activeMetricsFilter,
  customDateRange,
  selectedLicencee,
  displayCurrency,
  searchTerm,
  format,
}: {
  selectedLocations: string[];
  locations: Array<{ id: string; name: string }>;
  activeMetricsFilter: string;
  customDateRange?: DateRange | null;
  selectedLicencee?: string | null;
  displayCurrency?: string | null;
  searchTerm: string;
  format: 'pdf' | 'excel';
}): Promise<void> {
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
    const params = new URLSearchParams({
      locations: selectedLocations.join(','),
      timePeriod: activeMetricsFilter,
      page: '1',
      limit: '10000',
      search: searchTerm || '',
      ...(selectedLicencee &&
        selectedLicencee !== 'all' && {
          licencee: selectedLicencee,
        }),
      ...(displayCurrency && { currency: displayCurrency }),
      ...(activeMetricsFilter === 'Custom' &&
        customDateRange &&
        (customDateRange.startDate || customDateRange.start) &&
        (customDateRange.endDate || customDateRange.end) && {
          startDate: (
            customDateRange.startDate || customDateRange.start
          )!
            .toISOString()
            .split('T')[0],
          endDate: (
            customDateRange.endDate || customDateRange.end
          )!
            .toISOString()
            .split('T')[0],
        }),
    });

    const response = await axios.get<{
      data: MetersReportData[];
    }>(`/api/reports/meters?${params}`);

    const allData = response.data.data || [];

    if (allData.length === 0) {
      toast.error('No data found for export', {
        duration: 3000,
      });
      return;
    }

    const start = customDateRange?.startDate || customDateRange?.start;
    const end = customDateRange?.endDate || customDateRange?.end;

    const dateRangeStr =
      activeMetricsFilter === 'Custom' && start && end
        ? `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
        : activeMetricsFilter;

    const metadata = {
      locations: selectedLocationNames,
      dateRange: dateRangeStr,
      searchTerm: searchTerm || undefined,
      totalCount: allData.length,
    };

    const exportData = allData.map(item => {
      const customName = item.customName?.trim() || undefined;
      const serialNumber = item.serialNumber?.trim() || undefined;
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
        serialNumber: customName ? undefined : serialNumber,
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
}


