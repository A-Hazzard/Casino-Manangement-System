/**
 * Cabinet Totals & Aggregation Helpers
 *
 * Fetches and calculates financial totals for cabinets/machines.
 *
 * Features:
 * - Fetch aggregated cabinet totals with time period, location, and game type filters
 * - Calculate moneyIn, moneyOut, gross, jackpot, and netGross sums
 */

import axios from 'axios';
import { isAbortError } from '@/lib/utils/errors';
import { formatLocalDateTimeString } from '@/shared/utils/dateFormat';

// ============================================================================
// Cabinet Totals & Aggregation
// ============================================================================

/**
 * Fetches cabinet/machine totals using the machines aggregation API.
 * This ensures consistency between cabinets page and other pages.
 */
export async function fetchCabinetTotals(
  activeMetricsFilter: string,
  customDateRange: import('@/lib/types').dateRange | undefined,
  selectedLicencee: string | undefined,
  displayCurrency?: string,
  signal?: AbortSignal,
  locationId?: string | string[],
  gameType?: string | string[],
  onlineStatus?: string,
  searchTerm?: string,
  membership?: string,
  smibStatus?: string
): Promise<{
  moneyIn: number;
  moneyOut: number;
  gross: number;
  jackpot: number;
  netGross: number;
} | null> {
  try {
    let url = `/api/cabinets/aggregation?timePeriod=${activeMetricsFilter}`;

    if (activeMetricsFilter === 'Custom' && customDateRange) {
      const fromDate =
        customDateRange.startDate ||
        customDateRange.from ||
        customDateRange.start;
      const toDate =
        customDateRange.endDate || customDateRange.to || customDateRange.end;

      if (fromDate && toDate) {
        const fDate = fromDate instanceof Date ? fromDate : new Date(fromDate);
        const tDate = toDate instanceof Date ? toDate : new Date(toDate);

        const hasTime =
          fDate.getHours() !== 0 ||
          fDate.getMinutes() !== 0 ||
          fDate.getSeconds() !== 0 ||
          tDate.getHours() !== 0 ||
          tDate.getMinutes() !== 0 ||
          tDate.getSeconds() !== 0;

        if (hasTime) {
          const fromStr = formatLocalDateTimeString(fDate, -4);
          const toStr = formatLocalDateTimeString(tDate, -4);
          url += `&startDate=${fromStr}&endDate=${toStr}`;
        } else {
          const fromStr = fDate.toISOString().split('T')[0] + 'T00:00:00.000Z';
          const toStr = tDate.toISOString().split('T')[0] + 'T00:00:00.000Z';
          url += `&startDate=${fromStr}&endDate=${toStr}`;
        }
      }
    }

    if (selectedLicencee && selectedLicencee !== 'all') {
      url += `&licencee=${selectedLicencee}`;
    }

    if (displayCurrency) {
      url += `&currency=${displayCurrency}`;
    }

    if (membership && membership !== 'all') {
      url += `&membership=${encodeURIComponent(membership)}`;
    }

    if (smibStatus && smibStatus !== 'all') {
      url += `&smibStatus=${encodeURIComponent(smibStatus)}`;
    }

    if (
      locationId &&
      locationId !== 'all' &&
      (Array.isArray(locationId) ? locationId.length > 0 : true)
    ) {
      const locIds = Array.isArray(locationId)
        ? locationId.join(',')
        : locationId;
      url += `&locationId=${encodeURIComponent(locIds)}`;
    }

    if (
      gameType &&
      gameType !== 'all' &&
      (Array.isArray(gameType) ? gameType.length > 0 : true)
    ) {
      const gTypes = Array.isArray(gameType) ? gameType.join(',') : gameType;
      url += `&gameType=${encodeURIComponent(gTypes)}`;
    }

    if (onlineStatus && onlineStatus !== 'all') {
      url += `&onlineStatus=${encodeURIComponent(onlineStatus)}`;
    }

    if (searchTerm) {
      url += `&search=${encodeURIComponent(searchTerm)}`;
    }

    const response = await axios.get(url, { signal });
    const machineData = response.data.data || [];

    if (machineData.length > 0) {
      const sample = machineData.slice(0, 3);
      console.warn(
        '[fetchCabinetTotals] Sample machine data:',
        JSON.stringify(
          sample.map((machineItem: Record<string, unknown>) => ({
            _id: machineItem._id,
            moneyOut: machineItem.moneyOut,
            jackpot: machineItem.jackpot,
            includeJackpot: machineItem.includeJackpot,
            gross: machineItem.gross,
          })),
          null,
          2
        )
      );
    }

    const totals = machineData.reduce(
      (
        acc: {
          moneyIn: number;
          moneyOut: number;
          gross: number;
          jackpot: number;
          netGross: number;
        },
        machine: {
          moneyIn?: number;
          moneyOut?: number;
          gross?: number;
          jackpot?: number;
          netGross?: number;
          includeJackpot?: boolean;
        }
      ) => {
        const moneyIn = Number(machine.moneyIn) || 0;
        const moneyOut = Number(machine.moneyOut) || 0;
        const gross =
          machine.gross !== undefined
            ? Number(machine.gross)
            : moneyIn - moneyOut;
        const jackpot = Number(machine.jackpot) || 0;

        const netGross =
          machine.netGross !== undefined ? Number(machine.netGross) : 0;

        return {
          moneyIn: acc.moneyIn + moneyIn,
          moneyOut: acc.moneyOut + moneyOut,
          gross: acc.gross + gross,
          jackpot: acc.jackpot + jackpot,
          netGross: acc.netGross + netGross,
        };
      },
      { moneyIn: 0, moneyOut: 0, gross: 0, jackpot: 0, netGross: 0 }
    );

    console.warn(
      '[fetchCabinetTotals] Final totals:',
      JSON.stringify(
        {
          moneyIn: totals.moneyIn,
          moneyOut: totals.moneyOut,
          jackpot: totals.jackpot,
          gross: totals.gross,
          baseCancelledCredits: totals.moneyOut - totals.jackpot,
        },
        null,
        2
      )
    );

    return totals;
  } catch (error) {
    if (isAbortError(error)) {
      return null;
    }
    console.error('Error fetching cabinet totals:', error);
    return null;
  }
}
