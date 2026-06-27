/**
 * Metrics Helper Functions
 *
 * Provides helper functions for fetching and processing metric data from the API,
 * including aggregation, grouping by day or hour, and filling missing intervals
 * for consistent chart display. It handles various time periods and custom date ranges.
 *
 * Features:
 * - Fetches metric data from the API with time period and date range filtering.
 * - Supports licencee filtering and currency conversion.
 * - Groups data by day or hour based on time period.
 * - Fills missing intervals with zero values for consistent chart display.
 * - Handles errors gracefully with comprehensive error handling.
 */

import { ActiveFilters, dashboardData } from '@/lib/types';
import { TimePeriod } from '@/shared/types';
import {
  formatISODate,
  formatLocalDateTimeString,
} from '@/shared/utils/dateFormat';
import axios from 'axios';
import { getGranularityFromDataPoints } from '../utils/chart/granularity';

// ============================================================================
// Type Definitions
// ============================================================================

type MetricsUrlResult = {
  url: string;
  normalizedStart: Date | undefined;
  normalizedEnd: Date | undefined;
};

type MetricsRawResponseItem = {
  day: string;
  time?: string;
  drop: number;
  totalCancelledCredits: number;
  gross: number;
  location?: string;
  machine?: string;
  geoCoords?: {
    latitude?: number;
    longitude?: number;
    longtitude?: number;
  };
};

// ============================================================================
// Metrics Data Fetching and Processing
// ============================================================================

/**
 * Fetches and aggregates metric data from the API endpoint.
 *
 * Calls the `/api/metrics/meters` endpoint using a time period, and optionally a custom date range and licencee filter.
 * Normalizes the data into the dashboardData shape, groups records by day or hour, and sorts chronologically.
 *
 * @param timePeriod - The time period to fetch metrics for.
 * @param startDate - (Optional) Start date for a custom range.
 * @param endDate - (Optional) End date for a custom range.
 * @param licencee - (Optional) Licencee ID to filter metrics.
 * @param displayCurrency - (Optional) Currency code for display.
 * @returns Promise resolving to an array of aggregated dashboardData objects.
 */
export async function getMetrics(
  timePeriod: TimePeriod,
  startDate?: Date | string,
  endDate?: Date | string,
  licencee?: string,
  displayCurrency?: string,
  signal?: AbortSignal,
  granularity?: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly',
  locationId?: string | string[],
  gameType?: string | string[],
  onlineStatus?: string,
  searchTerm?: string
): Promise<dashboardData[]> {
  try {
    const { url, normalizedStart, normalizedEnd } = buildMetricsUrl(
      timePeriod,
      startDate,
      endDate,
      licencee,
      displayCurrency,
      granularity,
      locationId,
      gameType,
      onlineStatus,
      searchTerm
    );

    const { data } = await axios.get<MetricsRawResponseItem[]>(url, {
      headers: {
        'Cache-Control': 'no-cache',
      },
      signal,
    });

    return normalizeMetricsResponse(
      data,
      timePeriod,
      normalizedStart,
      normalizedEnd,
      granularity
    );
  } catch (error: unknown) {
    if (
      (axios.isCancel && axios.isCancel(error)) ||
      (error instanceof Error && error.name === 'AbortError') ||
      (error &&
        typeof error === 'object' &&
        'code' in error &&
        (error.code === 'ERR_CANCELED' || error.code === 'ECONNABORTED'))
    ) {
      throw error;
    }

    console.error('Failed to fetch metrics:', error);

    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as {
        response?: { status?: number; statusText?: string };
      };
      const status = axiosError.response?.status;
      const statusText = axiosError.response?.statusText;

      if (status === 503) {
        console.warn(
          'Metrics API temporarily unavailable (503). This may be due to server load.'
        );
        return [];
      }

      if (status && status >= 500) {
        console.error(`Server error (${status}): ${statusText}`);
        return [];
      }

      if (status === 404) {
        console.error('Metrics endpoint not found (404)');
        return [];
      }
    }

    if (
      (error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'NETWORK_ERROR') ||
      (error instanceof Error &&
        typeof error.message === 'string' &&
        error.message.includes('Network Error'))
    ) {
      console.error('Network error while fetching metrics');
      return [];
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('Full error details:', error);
    }

    return [];
  }
}

// ============================================================================
// URL Building
// ============================================================================

/**
 * Builds the API URL with all query parameters for fetching metrics.
 *
 * @param timePeriod - The time period to fetch metrics for.
 * @param startDate - (Optional) Start date for a custom range.
 * @param endDate - (Optional) End date for a custom range.
 * @param licencee - (Optional) Licencee ID to filter metrics.
 * @param displayCurrency - (Optional) Currency code for display.
 * @param granularity - (Optional) Granularity override.
 * @param locationId - (Optional) Location ID(s) to filter.
 * @param gameType - (Optional) Game type(s) to filter.
 * @param onlineStatus - (Optional) Online status filter.
 * @param searchTerm - (Optional) Search term filter.
 * @returns Object containing the URL and normalized date objects.
 */
function buildMetricsUrl(
  timePeriod: TimePeriod,
  startDate?: Date | string,
  endDate?: Date | string,
  licencee?: string,
  displayCurrency?: string,
  granularity?: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly',
  locationId?: string | string[],
  gameType?: string | string[],
  onlineStatus?: string,
  searchTerm?: string
): MetricsUrlResult {
  let url = `/api/metrics/meters?timePeriod=${timePeriod}`;
  let normalizedStart: Date | undefined;
  let normalizedEnd: Date | undefined;

  if (timePeriod === 'Custom' && startDate && endDate) {
    const sd = startDate instanceof Date ? startDate : new Date(startDate);
    const ed = endDate instanceof Date ? endDate : new Date(endDate);
    normalizedStart = sd;
    normalizedEnd = ed;

    const hasTime =
      sd.getHours() !== 0 ||
      sd.getMinutes() !== 0 ||
      sd.getSeconds() !== 0 ||
      ed.getHours() !== 0 ||
      ed.getMinutes() !== 0 ||
      ed.getSeconds() !== 0;

    if (hasTime) {
      url += `&startDate=${formatLocalDateTimeString(sd, -4)}&endDate=${formatLocalDateTimeString(ed, -4)}`;
    } else {
      url += `&startDate=${sd.toISOString().split('T')[0]}T00:00:00.000Z&endDate=${ed.toISOString().split('T')[0]}T00:00:00.000Z`;
    }
  }

  if (licencee && licencee !== 'all') {
    url += `&licencee=${licencee}`;
  }

  if (displayCurrency) {
    url += `&currency=${displayCurrency}`;
  }

  if (granularity) {
    url += `&granularity=${granularity}`;
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

  return { url, normalizedStart, normalizedEnd };
}

// ============================================================================
// Response Processing and Normalization
// ============================================================================

/**
 * Normalizes raw API response data into dashboardData format by detecting
 * granularity, mapping, grouping, sorting, and filling missing intervals.
 *
 * @param data - Raw API response items.
 * @param timePeriod - The time period for the data.
 * @param normalizedStart - Normalized start date for custom ranges.
 * @param normalizedEnd - Normalized end date for custom ranges.
 * @param granularity - (Optional) Manual granularity override.
 * @returns Array of aggregated dashboardData objects.
 */
function normalizeMetricsResponse(
  data: MetricsRawResponseItem[],
  timePeriod: TimePeriod,
  normalizedStart: Date | undefined,
  normalizedEnd: Date | undefined,
  granularity?: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly'
): dashboardData[] {
  // Detect granularity from data or manual override
  let groupByHour = false;
  let useMinute = false;

  if (granularity) {
    if (granularity === 'hourly') {
      groupByHour = true;
    } else if (granularity === 'minute') {
      useMinute = true;
    }
  } else {
    const dataBasedGranularity = getGranularityFromDataPoints(
      data.map(doc => ({
        day: doc.day,
        time: doc.time || '',
      }))
    );

    if (dataBasedGranularity === 'minute') {
      useMinute = true;
    } else {
      groupByHour = true;
    }
  }

  // Map raw API response to dashboardData format
  const rawData = data.map((doc): dashboardData => {
    const day = doc.day;
    let time = '';

    if (doc.time) {
      if (groupByHour) {
        const [hour] = doc.time.split(':');
        time = `${hour.padStart(2, '0')}:00`;
      } else if (useMinute) {
        time = doc.time;
      } else {
        time = doc.time || '';
      }
    }

    const xValue = groupByHour || useMinute ? time : day;
    return {
      xValue,
      day,
      time,
      moneyIn: doc.drop,
      moneyOut: doc.totalCancelledCredits,
      gross: doc.gross,
      location: doc.location,
      machine: doc.machine,
      geoCoords: doc.geoCoords,
    };
  });

  // Group by day or day+time key
  const grouped: Record<string, dashboardData> = {};
  rawData.forEach(item => {
    let key: string;
    if (groupByHour || useMinute) {
      key = `${item.day}_${item.time}`;
    } else {
      key = item.day;
    }

    if (!grouped[key]) {
      grouped[key] = { ...item };
    } else {
      grouped[key].moneyIn += item.moneyIn;
      grouped[key].moneyOut += item.moneyOut;
      grouped[key].gross += item.gross;
    }
  });

  // Sort chronologically by day then xValue
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

  // Apply custom time range filtering
  let filteredData = sortedData;
  if (
    timePeriod === 'Custom' &&
    normalizedStart &&
    normalizedEnd &&
    (useMinute || groupByHour)
  ) {
    filteredData = filterByTimeRange(
      sortedData,
      normalizedStart,
      normalizedEnd,
      groupByHour,
      useMinute
    );
  }

  // Safety check: prevent data loss from over-aggressive filtering
  if (filteredData.length === 0 && sortedData.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Metrics] Time filtering removed all data, using unfiltered data instead',
        {
          timePeriod,
          sortedDataLength: sortedData.length,
          normalizedStart,
          normalizedEnd,
          groupByHour,
          useMinute,
        }
      );
    }
    filteredData = sortedData;
  }

  // Fill missing intervals for consistent chart display
  const filledData = fillMissingIntervals(
    filteredData,
    timePeriod,
    normalizedStart,
    normalizedEnd,
    groupByHour,
    useMinute
  );

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    if (sortedData.length > 0 && filledData.length === 0) {
      console.error('Data lost in fillMissingIntervals:', {
        timePeriod,
        sortedDataLength: sortedData.length,
        normalizedStart,
        normalizedEnd,
        groupByHour,
        useMinute,
        hasMinuteLevelData:
          Array.isArray(data) &&
          data.some(item => {
            if (!item.time) return false;
            const timeParts = item.time.split(':');
            if (timeParts.length !== 2) return false;
            const minutes = parseInt(timeParts[1], 10);
            return !isNaN(minutes) && minutes !== 0;
          }),
        sampleData: sortedData.slice(0, 3),
      });
    }
    if (timePeriod === 'Custom' && sortedData.length > 0) {
      console.log('Custom range data processing:', {
        sortedDataLength: sortedData.length,
        filledDataLength: filledData.length,
        groupByHour,
        useMinute,
        sampleData: sortedData.slice(0, 3),
      });
    }
  }

  return filledData;
}

// ============================================================================
// Custom Date Range Time Filtering
// ============================================================================

/**
 * Filters sorted dashboard data by a custom time range, handling hourly/minute
 * granularity, multi-day ranges, and UTC conversion.
 *
 * @param sortedData - Chronologically sorted dashboard data.
 * @param startDate - Start of the custom time range.
 * @param endDate - End of the custom time range.
 * @param groupByHour - Whether data is grouped hourly.
 * @param useMinute - Whether data uses minute granularity.
 * @returns Filtered dashboard data array.
 */
function filterByTimeRange(
  sortedData: dashboardData[],
  startDate: Date,
  endDate: Date,
  groupByHour: boolean,
  useMinute: boolean
): dashboardData[] {
  const startLocal =
    startDate instanceof Date ? startDate : new Date(startDate);
  const endLocal = endDate instanceof Date ? endDate : new Date(endDate);

  const hasTime =
    startLocal.getHours() !== 0 ||
    startLocal.getMinutes() !== 0 ||
    startLocal.getSeconds() !== 0 ||
    endLocal.getHours() !== 0 ||
    endLocal.getMinutes() !== 0 ||
    endLocal.getSeconds() !== 0;

  if (!hasTime) {
    return sortedData;
  }

  const startUTC = new Date(
    Date.UTC(
      startLocal.getFullYear(),
      startLocal.getMonth(),
      startLocal.getDate(),
      startLocal.getHours() + 4,
      startLocal.getMinutes(),
      0,
      0
    )
  );
  const endUTC = new Date(
    Date.UTC(
      endLocal.getFullYear(),
      endLocal.getMonth(),
      endLocal.getDate(),
      endLocal.getHours() + 4,
      endLocal.getMinutes(),
      0,
      0
    )
  );

  const startUTCHour = startUTC.getUTCHours();
  const startUTCMinute = startUTC.getUTCMinutes();
  const endUTCHour = endUTC.getUTCHours();
  const endUTCMinute = endUTC.getUTCMinutes();

  const startUTCTime = `${startUTCHour.toString().padStart(2, '0')}:${startUTCMinute.toString().padStart(2, '0')}`;
  const endUTCTime = `${endUTCHour.toString().padStart(2, '0')}:${endUTCMinute.toString().padStart(2, '0')}`;

  const rangeStartDay = startLocal.toISOString().split('T')[0];
  const rangeEndDay = endLocal.toISOString().split('T')[0];
  const isMultiDay = rangeStartDay !== rangeEndDay;

  const startTimeMinutes = timeToMinutes(startUTCTime);
  const endTimeMinutes = timeToMinutes(endUTCTime);

  const filtered = sortedData.filter(item => {
    if (!item.time) return false;

    const itemDay = item.day;

    if (!isMultiDay) {
      if (itemDay !== rangeStartDay) {
        return false;
      }
    } else {
      if (itemDay < rangeStartDay || itemDay > rangeEndDay) {
        return false;
      }
    }

    const itemTimeMinutes = timeToMinutes(item.time);

    if (isMultiDay) {
      if (itemDay === rangeStartDay) {
        if (groupByHour && !useMinute) {
          return (
            Math.floor(itemTimeMinutes / 60) >=
            Math.floor(startTimeMinutes / 60)
          );
        }
        return itemTimeMinutes >= startTimeMinutes;
      }

      if (itemDay === rangeEndDay) {
        if (groupByHour && !useMinute) {
          return (
            Math.floor(itemTimeMinutes / 60) <=
            Math.floor(endTimeMinutes / 60)
          );
        }
        return itemTimeMinutes <= endTimeMinutes;
      }

      return true;
    }

    if (groupByHour && !useMinute) {
      const itemHour = Math.floor(itemTimeMinutes / 60);
      const startHour = Math.floor(startTimeMinutes / 60);
      const endHour = Math.floor(endTimeMinutes / 60);

      if (endHour < startHour) {
        return itemHour >= startHour || itemHour <= endHour;
      }
      return itemHour >= startHour && itemHour <= endHour;
    }

    if (endTimeMinutes < startTimeMinutes) {
      return (
        itemTimeMinutes >= startTimeMinutes ||
        itemTimeMinutes <= endTimeMinutes
      );
    }

    return (
      itemTimeMinutes >= startTimeMinutes &&
      itemTimeMinutes <= endTimeMinutes
    );
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('[Metrics] Filtered data by custom time range:', {
      startUTCTime,
      endUTCTime,
      originalCount: sortedData.length,
      filteredCount: filtered.length,
      useMinute,
      groupByHour,
    });
  }

  return filtered;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts an "HH:MM" time string to total minutes since midnight.
 *
 * @param timeStr - Time string in "HH:MM" format.
 * @returns Total minutes.
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// ============================================================================
// Filter Switch Functions
// ============================================================================

/**
 * Fetches new metrics data based on selected filter.
 */
export async function switchFilter(
  filter: TimePeriod,
  setTotals: (state: dashboardData | null) => void,
  setChartData: (state: dashboardData[]) => void,
  startDate?: Date,
  endDate?: Date,
  licencee?: string,
  setActiveFilters?: (filters: ActiveFilters) => void,
  setShowDatePicker?: (state: boolean) => void,
  displayCurrency?: string,
  signal?: AbortSignal,
  granularity?: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly'
): Promise<void> {
  try {
    if (setActiveFilters) {
      const newFilters: ActiveFilters = {
        Today: filter === 'Today',
        Yesterday: filter === 'Yesterday',
        last7days: filter === '7d',
        last30days: filter === '30d',
        Custom: filter === 'Custom',
      };
      setActiveFilters(newFilters);
    }

    if (setShowDatePicker) {
      setShowDatePicker(filter === 'Custom');
    }

    const data: dashboardData[] = await getMetrics(
      filter,
      startDate,
      endDate,
      licencee,
      displayCurrency,
      signal,
      granularity
    );

    if (data.length > 0) {
      setChartData(data);
      setTotals({
        xValue: 'total',
        day: 'total',
        time: 'total',
        moneyIn: data.reduce(
          (accumulator, current) => accumulator + current.moneyIn,
          0
        ),
        moneyOut: data.reduce(
          (accumulator, current) => accumulator + current.moneyOut,
          0
        ),
        gross: data.reduce(
          (accumulator, current) => accumulator + current.gross,
          0
        ),
        location: undefined,
        geoCoords: undefined,
      });
    } else {
      setTotals(null);
      setChartData([]);
    }
  } catch (e) {
    console.error(
      '[switchFilter] Error:',
      e instanceof Error ? e.message : 'Unknown error'
    );
  }
}

// ============================================================================
// Data Processing and Interval Filling
// ============================================================================

/**
 * Fills missing time intervals in chart data with zero values
 * @param data - The existing chart data
 * @param timePeriod - The time period to determine interval type
 * @param startDate - Start date for the period
 * @param endDate - End date for the period
 * @returns Complete chart data with filled intervals
 */
function fillMissingIntervals(
  data: dashboardData[],
  timePeriod: TimePeriod,
  startDate?: Date,
  endDate?: Date,
  isHourly?: boolean,
  isMinute?: boolean
): dashboardData[] {
  // if (data.length === 0) return [];

  // Store original data length for safety check
  const originalDataLength = data.length;

  const filledData: dashboardData[] = [];

  // Declare start and end at function scope so they're available in all code paths
  let start: Date;
  let end: Date;

  // Minute-level filling for Custom ranges, Today, and Yesterday
  // For ALL minute granularity: Only show actual data points (don't fill zeros)
  // This matches user preference - they want to see only times that exist in the JSON response
  if (
    isMinute &&
    (timePeriod === 'Custom' ||
      timePeriod === 'Today' ||
      timePeriod === 'Yesterday')
  ) {
    // For ALL minute granularity (Custom, Today, Yesterday): Don't fill missing intervals
    // Only show actual data points - this creates a chart with spikes at actual data times
    // User wants to see ONLY times that are in the JSON response, not filled-in zeros
    return data;
  }

  // Hourly filling logic
  if (isHourly) {
    // Fill hourly intervals (0:00 to 23:00)
    // Get all unique days from data
    const allDays = new Set(data.map(item => item.day).filter(Boolean));
    const baseDay = data[0]?.day || formatISODate(new Date());
    const daysToFill = allDays.size > 0 ? Array.from(allDays) : [baseDay];

    // Fill hours for each day
    for (const dayToFill of daysToFill) {
      for (let hour = 0; hour < 24; hour++) {
        const timeKey = `${hour.toString().padStart(2, '0')}:00`;
        const existingData = data.find(
          item => item.time === timeKey && item.day === dayToFill
        );

        if (existingData) {
          filledData.push(existingData);
        } else {
          filledData.push({
            xValue: timeKey,
            day: dayToFill,
            time: timeKey,
            moneyIn: 0,
            moneyOut: 0,
            gross: 0,
          });
        }
      }
    }
  } else {
    // Fill daily intervals OR handle custom ranges that don't match other patterns
    // For custom ranges with time inputs that weren't caught above, preserve the data
    if (timePeriod === 'Custom' && startDate && endDate) {
      const sd = startDate instanceof Date ? startDate : new Date(startDate);
      const ed = endDate instanceof Date ? endDate : new Date(endDate);

      // Check if this is a time-based custom range that should have been handled by minute/hourly
      const hasTime =
        sd.getHours() !== 0 ||
        sd.getMinutes() !== 0 ||
        sd.getSeconds() !== 0 ||
        ed.getHours() !== 0 ||
        ed.getMinutes() !== 0 ||
        ed.getSeconds() !== 0;

      // If it has time components but wasn't handled by minute/hourly filling,
      // just return the data as-is to preserve it (don't filter it out)
      if (hasTime) {
        // Return data as-is - don't try to fill daily intervals for time-based ranges
        return data;
      }

      // Date-only custom range: fill daily intervals
      start = new Date(startDate);
      end = new Date(endDate);
    } else if (timePeriod === '7d') {
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 6);
    } else if (timePeriod === '30d') {
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 29);
    } else {
      // Default to 7 days if unknown
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 6);
    }

    const current = new Date(start);
    while (current <= end) {
      // Use the date directly as YYYY-MM-DD format to avoid timezone conversion issues
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
