/**
 * Machine Chart Helper Functions
 *
 * Provides helper functions for fetching machine data and metrics.
 * For now, we'll use the machine detail API to get metrics.
 * Chart data can be fetched separately if needed.
 *
 * Features:
 * - Fetches machine details and metrics
 * - Returns formatted machine data for display
 * - Fetches chart data for a single machine
 */

import type { dashboardData } from '@/lib/types';
import { formatISODate } from '@/shared/utils/dateFormat';
import { TimePeriod } from '@shared/types';
import axios from 'axios';

/**
 * Machine data with metrics
 */
export type MachineMetricsData = {
  _id: string;
  serialNumber: string;
  game?: string;
  locationName: string;
  locationId: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  jackpot: number;
  gamesPlayed: number;
  coinIn: number;
  coinOut: number;
};

/**
 * Fetches machine data and metrics
 *
 * @param machineId - The machine ID to fetch data for
 * @param timePeriod - The time period to fetch metrics for
 * @param startDate - (Optional) Start date for a custom range
 * @param endDate - (Optional) End date for a custom range
 * @param displayCurrency - (Optional) Currency code for display
 * @returns Promise resolving to machine metrics data
 */
export async function getMachineMetrics(
  machineId: string,
  timePeriod: TimePeriod,
  startDate?: Date | string,
  endDate?: Date | string,
  displayCurrency?: string
): Promise<MachineMetricsData | null> {
  try {
    let url = `/api/machines/${machineId}?timePeriod=${timePeriod}`;

    if (timePeriod === 'Custom' && startDate && endDate) {
      const sd = startDate instanceof Date ? startDate : new Date(startDate);
      const ed = endDate instanceof Date ? endDate : new Date(endDate);
      url += `&startDate=${sd.toISOString().split('T')[0]}&endDate=${ed.toISOString().split('T')[0]}`;
    }

    if (displayCurrency) {
      url += `&currency=${displayCurrency}`;
    }

    const response = await axios.get(url);
    const machine = response.data?.data;

    if (!machine) {
      return null;
    }

    return {
      _id: machine._id || machineId,
      serialNumber: machine.serialNumber || machine.assetNumber || 'N/A',
      game: machine.game || machine.installedGame,
      locationName: machine.locationName || 'Unknown Location',
      locationId: machine.gamingLocation || machine.locationId || '',
      moneyIn: machine.moneyIn || 0,
      moneyOut: machine.moneyOut || 0,
      gross: machine.gross || 0,
      jackpot: machine.jackpot || 0,
      gamesPlayed: machine.gamesPlayed || 0,
      coinIn: machine.coinIn || 0,
      coinOut: machine.coinOut || 0,
    };
  } catch (error: unknown) {
    console.error('Failed to fetch machine metrics:', error);
    return null;
  }
}

/**
 * Fetches chart data for a single machine
 *
 * @param machineId - The machine ID to fetch chart data for
 * @param timePeriod - The time period to fetch metrics for
 * @param startDate - (Optional) Start date for a custom range
 * @param endDate - (Optional) End date for a custom range
 * @param displayCurrency - (Optional) Currency code for display
 * @returns Promise resolving to an array of dashboardData objects
 */
export async function getMachineChartData(
  machineId: string,
  timePeriod: TimePeriod,
  startDate?: Date | string,
  endDate?: Date | string,
  displayCurrency?: string
): Promise<dashboardData[]> {
  try {
    // Build URL for machine chart API
    let url = `/api/machines/${machineId}/chart?timePeriod=${timePeriod}`;

    if (timePeriod === 'Custom' && startDate && endDate) {
      const sd = startDate instanceof Date ? startDate : new Date(startDate);
      const ed = endDate instanceof Date ? endDate : new Date(endDate);
      url += `&startDate=${sd.toISOString().split('T')[0]}&endDate=${ed.toISOString().split('T')[0]}`;
    }

    if (displayCurrency) {
      url += `&currency=${displayCurrency}`;
    }

    const response = await axios.get<{
      success: boolean;
      data: Array<{
        day: string;
        time?: string;
        drop: number;
        totalCancelledCredits: number;
        gross: number;
      }>;
    }>(url, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.data.success || !Array.isArray(response.data.data)) {
      return [];
    }

    const rawData = response.data.data;

    // Determine if we should use hourly aggregation
    const shouldUseHourly =
      timePeriod === 'Today' || timePeriod === 'Yesterday';
    const isCustomHourly =
      timePeriod === 'Custom' &&
      startDate &&
      endDate &&
      (() => {
        const sd = startDate instanceof Date ? startDate : new Date(startDate);
        const ed = endDate instanceof Date ? endDate : new Date(endDate);
        const diffInMs = ed.getTime() - sd.getTime();
        const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
        return diffInDays <= 1;
      })();

    const useHourly = shouldUseHourly || isCustomHourly;

    // Transform to dashboardData format
    const chartData: dashboardData[] = rawData.map(item => {
      const day = item.day;
      let time = '';
      if (useHourly && item.time) {
        const [hh] = item.time.split(':');
        time = `${hh.padStart(2, '0')}:00`;
      }
      const xValue = useHourly ? time : day;

      return {
        xValue,
        day,
        time,
        moneyIn: item.drop,
        moneyOut: item.totalCancelledCredits,
        gross: item.gross,
      };
    });

    // Group by day/hour if needed (in case API returns duplicate entries)
    const grouped: Record<string, dashboardData> = {};
    chartData.forEach(item => {
      const key = useHourly ? `${item.day}_${item.time}` : item.day;
      if (!grouped[key]) {
        grouped[key] = { ...item };
      } else {
        grouped[key].moneyIn += item.moneyIn;
        grouped[key].moneyOut += item.moneyOut;
        grouped[key].gross += item.gross;
      }
    });

    const sortedData = Object.values(grouped).sort((a, b) => {
      const dayA = a.day ?? '';
      const dayB = b.day ?? '';
      if (dayA === dayB) {
        const xA = a.xValue ?? '';
        const xB = b.xValue ?? '';
        return xA.localeCompare(xB);
      }
      return dayA.localeCompare(dayB);
    });

    // Fill missing intervals
    return fillMissingIntervals(
      sortedData,
      timePeriod,
      startDate instanceof Date
        ? startDate
        : startDate
          ? new Date(startDate)
          : undefined,
      endDate instanceof Date
        ? endDate
        : endDate
          ? new Date(endDate)
          : undefined,
      useHourly || false
    );
  } catch (error: unknown) {
    console.error('Failed to fetch machine chart data:', error);
    return [];
  }
}

/**
 * Fills missing time intervals in chart data with zero values
 */
function fillMissingIntervals(
  data: dashboardData[],
  timePeriod: TimePeriod,
  startDate?: Date,
  endDate?: Date,
  isHourly?: boolean
): dashboardData[] {
  if (data.length === 0) return [];

  const filledData: dashboardData[] = [];

  if (isHourly) {
    const baseDay = data[0]?.day || formatISODate(new Date());
    for (let hour = 0; hour < 24; hour++) {
      const timeKey = `${hour.toString().padStart(2, '0')}:00`;
      const existingData = data.find(
        item => item.time === timeKey && item.day === baseDay
      );
      if (existingData) {
        filledData.push(existingData);
      } else {
        filledData.push({
          xValue: timeKey,
          day: baseDay,
          time: timeKey,
          moneyIn: 0,
          moneyOut: 0,
          gross: 0,
        });
      }
    }
  } else {
    let start: Date;
    let end: Date;

    if (timePeriod === 'Custom' && startDate && endDate) {
      start = startDate;
      end = endDate;
    } else if (timePeriod === '7d') {
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 6);
    } else if (timePeriod === '30d') {
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 29);
    } else {
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 6);
    }

    const current = new Date(start);
    while (current <= end) {
      const dayKey = current.toISOString().split('T')[0];
      const existingData = data.find(item => item.day === dayKey);
      if (existingData) {
        filledData.push(existingData);
      } else {
        filledData.push({
          xValue: dayKey,
          day: dayKey,
          time: '',
          moneyIn: 0,
          moneyOut: 0,
          gross: 0,
        });
      }
      current.setDate(current.getDate() + 1);
    }
  }

  return filledData;
}
