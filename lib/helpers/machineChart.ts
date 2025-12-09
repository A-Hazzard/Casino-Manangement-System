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
import {
  formatISODate,
  formatLocalDateTimeString,
} from '@/shared/utils/dateFormat';
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
  displayCurrency?: string,
  selectedLicencee?: string | null
): Promise<MachineMetricsData | null> {
  try {
    let url = `/api/machines/${machineId}?timePeriod=${timePeriod}`;

    if (timePeriod === 'Custom' && startDate && endDate) {
      const sd = startDate instanceof Date ? startDate : new Date(startDate);
      const ed = endDate instanceof Date ? endDate : new Date(endDate);

      // Check if dates have time components (not midnight)
      const hasTime =
        sd.getHours() !== 0 ||
        sd.getMinutes() !== 0 ||
        sd.getSeconds() !== 0 ||
        ed.getHours() !== 0 ||
        ed.getMinutes() !== 0 ||
        ed.getSeconds() !== 0;

      if (hasTime) {
        // Send local time with timezone offset to preserve user's time selection
        url += `&startDate=${formatLocalDateTimeString(sd, -4)}&endDate=${formatLocalDateTimeString(ed, -4)}`;
      } else {
        // Date-only: send ISO date format for gaming day offset to apply
        url += `&startDate=${sd.toISOString().split('T')[0]}&endDate=${ed.toISOString().split('T')[0]}`;
      }
    }

    if (displayCurrency) {
      url += `&currency=${displayCurrency}`;
    }

    if (selectedLicencee) {
      url += `&licensee=${encodeURIComponent(selectedLicencee)}`;
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
  displayCurrency?: string,
  selectedLicencee?: string | null,
  granularity?: 'hourly' | 'minute',
  signal?: AbortSignal
): Promise<dashboardData[]> {
  try {
    // Build URL for machine chart API
    let url = `/api/machines/${machineId}/chart?timePeriod=${timePeriod}`;

    if (timePeriod === 'Custom' && startDate && endDate) {
      const sd = startDate instanceof Date ? startDate : new Date(startDate);
      const ed = endDate instanceof Date ? endDate : new Date(endDate);

      // Check if dates have time components (not midnight)
      const hasTime =
        sd.getHours() !== 0 ||
        sd.getMinutes() !== 0 ||
        sd.getSeconds() !== 0 ||
        ed.getHours() !== 0 ||
        ed.getMinutes() !== 0 ||
        ed.getSeconds() !== 0;

      if (hasTime) {
        // Send local time with timezone offset to preserve user's time selection
        url += `&startDate=${formatLocalDateTimeString(sd, -4)}&endDate=${formatLocalDateTimeString(ed, -4)}`;
      } else {
        // Date-only: send ISO date format for gaming day offset to apply
        url += `&startDate=${sd.toISOString().split('T')[0]}&endDate=${ed.toISOString().split('T')[0]}`;
      }
    }

    if (displayCurrency) {
      url += `&currency=${displayCurrency}`;
    }

    // Pass selectedLicencee to API so it can check if "all licensees" is selected
    if (selectedLicencee !== undefined && selectedLicencee !== null) {
      url += `&licensee=${encodeURIComponent(selectedLicencee)}`;
    }

    // Pass granularity preference if specified
    if (granularity) {
      url += `&granularity=${granularity}`;
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
      signal,
    });

    if (!response.data.success || !Array.isArray(response.data.data)) {
      return [];
    }

    const rawData = response.data.data;

    // Check if API response contains minute-level data (time format is "HH:MM" with non-zero minutes)
    const hasMinuteLevelData = rawData.some(item => {
      if (!item.time) return false;
      const timeParts = item.time.split(':');
      if (timeParts.length !== 2) return false;
      const minutes = parseInt(timeParts[1], 10);
      return !isNaN(minutes) && minutes !== 0; // Has non-zero minutes
    });

    // Determine if we should use hourly or minute aggregation
    // If granularity was manually specified, use it
    let useHourly = false;
    let useMinute = false;

    if (granularity) {
      // Manual granularity override (from selector)
      if (granularity === 'hourly') {
        useHourly = true;
        useMinute = false;
      } else if (granularity === 'minute') {
        useHourly = false;
        useMinute = true;
      }
    } else {
      // Auto-detect granularity based on API response and time period
      // Default to hourly for Today, Yesterday, and Custom ranges <= 1 day
      const shouldUseHourly =
        timePeriod === 'Today' || timePeriod === 'Yesterday';

      // For custom ranges: default to hourly if <= 1 day (unless API returns minute data and user wants to preserve it)
      const isCustomRangeOneDayOrLess =
        timePeriod === 'Custom' &&
        startDate &&
        endDate &&
        (() => {
          const sd =
            startDate instanceof Date ? startDate : new Date(startDate);
          const ed = endDate instanceof Date ? endDate : new Date(endDate);
          const diffInMs = ed.getTime() - sd.getTime();
          const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
          return diffInDays <= 1;
        })();

      // Default to hourly for Today, Yesterday, and Custom ranges <= 1 day
      // Only use minute if API explicitly returns minute-level data (user can manually select minute granularity)
      useHourly = Boolean(shouldUseHourly || isCustomRangeOneDayOrLess);

      // Only use minute-level if API explicitly returned minute data
      // This preserves minute data when user manually selects minute granularity
      if (hasMinuteLevelData) {
        useMinute = true;
        useHourly = false;
      }
    }

    // Transform to dashboardData format
    const chartData: dashboardData[] = rawData.map(item => {
      const day = item.day;
      let time = '';

      if (item.time) {
        if (useHourly) {
          // For hourly: strip minutes (convert "14:15" to "14:00")
          const [hh] = item.time.split(':');
          time = `${hh.padStart(2, '0')}:00`;
        } else if (useMinute) {
          // For minute-level: preserve original time from API (e.g., "14:15")
          time = item.time;
        } else {
          // For daily: preserve time as-is (may be empty or "00:00")
          time = item.time || '';
        }
      }

      // xValue: use time for hourly/minute charts, day for daily charts
      const xValue = useHourly || useMinute ? time : day;

      return {
        xValue,
        day,
        time,
        moneyIn: item.drop,
        moneyOut: item.totalCancelledCredits,
        gross: item.gross,
      };
    });

    // Group by day/hour/minute if needed (in case API returns duplicate entries)
    const grouped: Record<string, dashboardData> = {};
    chartData.forEach(item => {
      // Use different grouping keys for hourly, minute, and daily
      let key: string;
      if (useHourly) {
        key = `${item.day}_${item.time}`; // e.g., "2025-12-07_14:00"
      } else if (useMinute) {
        key = `${item.day}_${item.time}`; // e.g., "2025-12-07_14:15"
      } else {
        key = item.day; // Daily grouping
      }

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
      useHourly,
      useMinute
    );
  } catch (error: unknown) {
    // Handle cancelled/aborted requests first - these are expected when user changes filters
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error.code === 'ERR_CANCELED' || error.code === 'ECONNABORTED')
    ) {
      // Silently handle cancelled requests - this is expected when user changes filters
      return [];
    }

    // Check for axios.isCancel() to properly detect cancelled requests
    const axios = (await import('axios')).default;
    if (axios.isCancel && axios.isCancel(error)) {
      // Silently handle cancelled requests
      return [];
    }

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
  isHourly?: boolean,
  isMinute?: boolean
): dashboardData[] {
  if (data.length === 0) return [];

  const filledData: dashboardData[] = [];

  // For ALL minute granularity (Custom, Today, Yesterday): Only show actual data points (don't fill zeros)
  // User wants to see ONLY times that are in the JSON response, not filled-in zeros
  if (
    isMinute &&
    (timePeriod === 'Custom' ||
      timePeriod === 'Today' ||
      timePeriod === 'Yesterday')
  ) {
    // Return data as-is - no filling for any minute granularity
    // This ensures only actual data points from the API response are displayed
    return data;
  }

  // Store original data length for safety check (after early returns)
  const originalDataLength = data.length;

  // Hourly filling logic
  if (isHourly) {
    // Hourly filling for predefined periods
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
    // Daily filling for longer periods
    let start: Date;
    let end: Date;

    if (timePeriod === 'Custom' && startDate && endDate) {
      start = startDate instanceof Date ? startDate : new Date(startDate);
      end = endDate instanceof Date ? endDate : new Date(endDate);
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

  // Safety check: if we somehow ended up with no data but had input data,
  // return the original data to prevent data loss
  if (filledData.length === 0 && originalDataLength > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'fillMissingIntervals: Returning original data to prevent data loss',
        {
          timePeriod,
          isHourly,
          isMinute,
          dataLength: originalDataLength,
          startDate,
          endDate,
        }
      );
    }
    return data;
  }

  return filledData;
}
