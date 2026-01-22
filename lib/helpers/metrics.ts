/**
 * Metrics Helper Functions
 *
 * Provides helper functions for fetching and processing metric data from the API,
 * including aggregation, grouping by day or hour, and filling missing intervals
 * for consistent chart display. It handles various time periods and custom date ranges.
 *
 * Features:
 * - Fetches metric data from the API with time period and date range filtering.
 * - Supports licensee filtering and currency conversion.
 * - Groups data by day or hour based on time period.
 * - Fills missing intervals with zero values for consistent chart display.
 * - Handles errors gracefully with comprehensive error handling.
 */

import { dashboardData } from '@/lib/types';
import { TimePeriod } from '@/shared/types';
import {
  formatISODate,
  formatLocalDateTimeString,
} from '@/shared/utils/dateFormat';
import axios from 'axios';
import { getGranularityFromDataPoints } from '../utils/chart/granularity';

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
  granularity?: 'hourly' | 'minute',
  locationId?: string | string[],
  gameType?: string | string[],
  onlineStatus?: string
): Promise<dashboardData[]> {
  try {
    let url = `/api/metrics/meters?timePeriod=${timePeriod}`;
    let normalizedStart: Date | undefined;
    let normalizedEnd: Date | undefined;
    if (timePeriod === 'Custom' && startDate && endDate) {
      const sd = startDate instanceof Date ? startDate : new Date(startDate);
      const ed = endDate instanceof Date ? endDate : new Date(endDate);
      normalizedStart = sd;
      normalizedEnd = ed;

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
    if (licencee && licencee !== 'all') {
      url += `&licencee=${licencee}`;
    }
    if (displayCurrency) {
      url += `&currency=${displayCurrency}`;
    }
    if (granularity) {
      url += `&granularity=${granularity}`;
    }
    
    // Add location filter if provided
    if (locationId && locationId !== 'all' && (Array.isArray(locationId) ? locationId.length > 0 : true)) {
      const locIds = Array.isArray(locationId) ? locationId.join(',') : locationId;
      url += `&locationId=${encodeURIComponent(locIds)}`;
    }
    
    // Add game type filter if provided
    if (gameType && gameType !== 'all' && (Array.isArray(gameType) ? gameType.length > 0 : true)) {
      const gTypes = Array.isArray(gameType) ? gameType.join(',') : gameType;
      url += `&gameType=${encodeURIComponent(gTypes)}`;
    }
    
    // Add status filter if provided
    if (onlineStatus && onlineStatus !== 'all') {
      url += `&onlineStatus=${encodeURIComponent(onlineStatus)}`;
    }

    const { data } = await axios.get<
      Array<{
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
      }>
    >(url, {
      headers: {
        'Cache-Control': 'no-cache',
      },
      signal,
    });
    // if (!Array.isArray(data) || data.length === 0) return [];

    // Check if API response contains minute-level data (time format is "HH:MM" with non-zero minutes)
    const hasMinuteLevelData = Array.isArray(data) && data.some(item => {
      if (!item.time) return false;
      const timeParts = item.time.split(':');
      if (timeParts.length !== 2) return false;
      const minutes = parseInt(timeParts[1], 10);
      return !isNaN(minutes) && minutes !== 0; // Has non-zero minutes
    });

    // Determine if we should group by hour or minute
    // If granularity was manually specified (from selector), use it
    let groupByHour = false;
    let useMinute = false;

    if (granularity) {
      // Manual granularity override (from selector)
      if (granularity === 'hourly') {
        groupByHour = true;
        useMinute = false;
      } else if (granularity === 'minute') {
        groupByHour = false;
        useMinute = true;
      }
    } else {
      // Auto-detect granularity based on actual data points' time range
      // Check all meters and if they span more than 5 hours, default to hourly
      const dataBasedGranularity = getGranularityFromDataPoints(
        data.map(doc => ({
          day: doc.day,
          time: doc.time || '',
        }))
      );

      // Use the data-based granularity
      if (dataBasedGranularity === 'minute') {
        useMinute = true;
        groupByHour = false;
      } else {
        // Data spans > 5 hours, use hourly
          useMinute = false;
          groupByHour = true;
      }
    }

    const rawData = data.map((doc): dashboardData => {
      const day = doc.day;
      let time = '';

      if (doc.time) {
        if (groupByHour) {
          // For hourly: strip minutes (convert "14:15" to "14:00")
          const [hh] = doc.time.split(':');
          time = `${hh.padStart(2, '0')}:00`;
        } else if (useMinute) {
          // For minute-level: preserve original time from API (e.g., "14:15")
          time = doc.time;
        } else {
          // For daily: preserve time as-is (may be empty or "00:00")
          time = doc.time || '';
        }
      }

      // xValue: use time for hourly/minute charts, day for daily charts
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

    const grouped: Record<string, dashboardData> = {};
    rawData.forEach(item => {
      // Use different grouping keys for hourly, minute, and daily
      let key: string;
      if (groupByHour) {
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

    // Filter data to only include times within the selected custom range (if applicable)
    let filteredData = sortedData;
    if (
      timePeriod === 'Custom' &&
      normalizedStart &&
      normalizedEnd &&
      (useMinute || groupByHour)
    ) {
      const sd =
        normalizedStart instanceof Date
          ? normalizedStart
          : new Date(normalizedStart);
      const ed =
        normalizedEnd instanceof Date ? normalizedEnd : new Date(normalizedEnd);

      // Check if dates have time components (not midnight)
      const hasTime =
        sd.getHours() !== 0 ||
        sd.getMinutes() !== 0 ||
        sd.getSeconds() !== 0 ||
        ed.getHours() !== 0 ||
        ed.getMinutes() !== 0 ||
        ed.getSeconds() !== 0;

      if (hasTime) {
        // Convert local time to UTC for comparison (AST is UTC-4)
        // API returns times in UTC format
        const startLocal = new Date(sd);
        const endLocal = new Date(ed);

        // Convert to UTC by creating a Date object with UTC components
        const startUTC = new Date(
          Date.UTC(
            startLocal.getFullYear(),
            startLocal.getMonth(),
            startLocal.getDate(),
            startLocal.getHours() + 4, // AST is UTC-4, so add 4 for UTC
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
            endLocal.getHours() + 4, // AST is UTC-4, so add 4 for UTC
            endLocal.getMinutes(),
            0,
            0
          )
        );

        // Format UTC times for comparison (HH:MM format)
        const startUTCHour = startUTC.getUTCHours();
        const startUTCMinute = startUTC.getUTCMinutes();
        const endUTCHour = endUTC.getUTCHours();
        const endUTCMinute = endUTC.getUTCMinutes();

        const startUTCTime = `${startUTCHour.toString().padStart(2, '0')}:${startUTCMinute.toString().padStart(2, '0')}`;
        const endUTCTime = `${endUTCHour.toString().padStart(2, '0')}:${endUTCMinute.toString().padStart(2, '0')}`;

        // Helper function to convert HH:MM time string to total minutes for comparison
        const timeToMinutes = (timeStr: string): number => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          return hours * 60 + minutes;
        };

        // Check if range spans multiple days
        const rangeStartDay = sd.toISOString().split('T')[0];
        const rangeEndDay = ed.toISOString().split('T')[0];
        const isMultiDay = rangeStartDay !== rangeEndDay;

        // Filter data points that fall within the time range
        filteredData = sortedData.filter(item => {
          if (!item.time) return false;

          // Get the day from the item
          const itemDay = item.day;

          // Handle single-day vs multi-day ranges
          if (!isMultiDay) {
            // Single day: only include items from the same day
            if (itemDay !== rangeStartDay) {
              return false;
            }
          } else {
            // Multi-day: include items from any day within the range
            if (itemDay < rangeStartDay || itemDay > rangeEndDay) {
              return false;
            }
          }

          // Convert times to minutes for accurate comparison
          const itemTimeMinutes = timeToMinutes(item.time);
          const startTimeMinutes = timeToMinutes(startUTCTime);
          const endTimeMinutes = timeToMinutes(endUTCTime);

          // For multi-day ranges, apply time filtering only to start and end days
          if (isMultiDay) {
            // For items on start day, only include if time >= startTime
            if (itemDay === rangeStartDay) {
              if (groupByHour && !useMinute) {
                const itemHour = Math.floor(itemTimeMinutes / 60);
                const startHour = Math.floor(startTimeMinutes / 60);
                return itemHour >= startHour;
              }
              return itemTimeMinutes >= startTimeMinutes;
            }

            // For items on end day, only include if time <= endTime
            if (itemDay === rangeEndDay) {
              if (groupByHour && !useMinute) {
                const itemHour = Math.floor(itemTimeMinutes / 60);
                const endHour = Math.floor(endTimeMinutes / 60);
                return itemHour <= endHour;
              }
              return itemTimeMinutes <= endTimeMinutes;
            }

            // For items in between start and end days, include all
            // (no time filtering needed for middle days)
            return true;
          }

          // Single-day range: apply time filtering as before
          // For hourly data, check if the hour falls within range
          if (groupByHour && !useMinute) {
            const itemHour = Math.floor(itemTimeMinutes / 60);
            const startHour = Math.floor(startTimeMinutes / 60);
            const endHour = Math.floor(endTimeMinutes / 60);

            // If range crosses midnight (end < start), handle wrap-around
            if (endHour < startHour) {
              return itemHour >= startHour || itemHour <= endHour;
            }
            return itemHour >= startHour && itemHour <= endHour;
          }

          // For minute-level data, compare exact times (inclusive range)
          // Include times >= startTime and <= endTime
          if (endTimeMinutes < startTimeMinutes) {
            // Handle wrap-around (shouldn't happen for same day, but just in case)
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
            filteredCount: filteredData.length,
            useMinute,
            groupByHour,
          });
        }
      }
    }

    // Safety check: if filtering removed all data but we had data, use unfiltered data
    // This prevents data loss when filtering is too aggressive
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
      // Use sortedData instead of filteredData to prevent data loss
      filteredData = sortedData;
    }

    // Fill missing intervals to ensure consistent chart display
    const filledData = fillMissingIntervals(
      filteredData,
      timePeriod,
      normalizedStart,
      normalizedEnd,
      groupByHour,
      useMinute
    );

    // Debug: Log if we're losing data
    if (process.env.NODE_ENV === 'development') {
      if (sortedData.length > 0 && filledData.length === 0) {
        console.error('Data lost in fillMissingIntervals:', {
          timePeriod,
          sortedDataLength: sortedData.length,
          normalizedStart,
          normalizedEnd,
          groupByHour,
          useMinute,
          hasMinuteLevelData,
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
  } catch (error: unknown) {
    // First, check if the error is due to a cancelled request.
    // These are expected and should be handled silently by the calling hook.
    if (
      (axios.isCancel && axios.isCancel(error)) ||
      (error instanceof Error && error.name === 'AbortError') ||
      (error &&
        typeof error === 'object' &&
        'code' in error &&
        (error.code === 'ERR_CANCELED' || error.code === 'ECONNABORTED'))
    ) {
      // Re-throw cancelled requests so the caller (e.g., useAbortableRequest) can handle them.
      throw error;
    }

    // If the error is not a cancellation, it's unexpected. Log it.
    console.error('Failed to fetch metrics:', error);

    // Handle specific HTTP error types for more granular feedback
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
        // Return empty array for 503 errors to prevent UI blocking
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

    // Handle network errors
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

    // Log the full error in development for better debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('Full error details:', error);
    }

    // Fallback to returning an empty array for any other unexpected errors.
    return [];
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

