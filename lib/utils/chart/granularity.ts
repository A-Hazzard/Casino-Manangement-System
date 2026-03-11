/**
 * Chart Granularity Utility
 *
 * Determines the default chart granularity (minute vs hourly) based on time range.
 * Uses a 5-hour threshold: if data range is <= 5 hours, defaults to 'minute', otherwise 'hourly'.
 */

import type { TimePeriod } from '@/shared/types/common';

/**
 * Determines default chart granularity based on time range
 * - If data range is <= 5 hours: default to 'minute'
 * - If data range is > 5 hours: default to 'hourly'
 *
 * @param timePeriod - The time period filter (Today, Yesterday, Week, Month, Custom, etc.)
 * @param startDate - Optional start date for Custom time period
 * @param endDate - Optional end date for Custom time period
 * @returns 'minute' if range <= 5 hours, 'hourly' otherwise
 */
export function getDefaultChartGranularity(
  timePeriod: TimePeriod,
  startDate?: Date | string,
  endDate?: Date | string
): 'minute' | 'hourly' | 'daily' | 'weekly' | 'monthly' {
  const HOURS_THRESHOLD = 5;

  // For predefined periods, calculate the actual time range
  if (timePeriod === 'Today') {
    // Calculate hours elapsed since start of day (midnight)
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    // Calculate exact hours elapsed since midnight (including minutes/seconds)
    const hoursElapsed =
      (now.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);

    // If <= 5 hours have elapsed, use minute granularity
    // If > 5 hours have elapsed, use hourly granularity
    return hoursElapsed <= HOURS_THRESHOLD ? 'minute' : 'hourly';
  }

  if (timePeriod === 'Yesterday') {
    // Yesterday is always 24 hours, which is > 5 hours, so use hourly
    return 'hourly';
  }

  if (timePeriod === '7d' || timePeriod === 'last7days') {
    return 'daily';
  }

  if (timePeriod === '30d' || timePeriod === 'last30days') {
    return 'daily';
  }

  if (timePeriod === 'Quarterly') {
    // Quarterly is 90 days, defaults to monthly
    return 'monthly';
  }

  if (timePeriod === 'All Time') {
    // All Time defaults to monthly
    return 'monthly';
  }

  // For Custom time period, use provided dates
  if (timePeriod === 'Custom' && startDate && endDate) {
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);

    // Check for invalid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'hourly';
    }

    const diffMs = end.getTime() - start.getTime();
    const hoursDiff = diffMs / (1000 * 60 * 60);
    const daysDiff = diffMs / (1000 * 60 * 60 * 24);

    if (hoursDiff <= HOURS_THRESHOLD) return 'minute';
    if (daysDiff <= 1) return 'hourly';
    if (daysDiff <= 31) return 'daily';
    if (daysDiff <= 90) return 'weekly';
    return 'monthly';
  }

  // Default to hourly
  return 'hourly';
}

/**
 * Calculates the actual time range from data points and determines granularity
 * Checks all meters/data points and if they span more than 5 hours, returns 'hourly'
 * Otherwise returns 'minute'
 *
 * @param data - Array of data objects with day and time fields
 * @returns 'minute' if range <= 5 hours, 'hourly' otherwise
 */
export function getGranularityFromDataPoints(
  data: Array<{ day: string; time?: string }>
): 'minute' | 'hourly' {
  const HOURS_THRESHOLD = 5;

  if (!data || data.length === 0) {
    return 'hourly'; // Default to hourly if no data
  }

  // Extract all timestamps from data points
  const timestamps: Date[] = [];

  data.forEach(item => {
    if (item.day && item.time) {
      // Combine day and time to create a full timestamp
      // day format: "YYYY-MM-DD", time format: "HH:MM" or "HH:MM:SS"
      try {
        const timeParts = item.time.split(':');
        const hours = timeParts[0] || '00';
        const minutes = timeParts[1] || '00';
        const dateTimeString = `${item.day}T${hours}:${minutes}:00`;
        const timestamp = new Date(dateTimeString);
        if (!isNaN(timestamp.getTime())) {
          timestamps.push(timestamp);
        }
      } catch {
        // Skip invalid timestamps
        console.warn('Invalid timestamp in data:', {
          day: item.day,
          time: item.time,
        });
      }
    }
  });

  if (timestamps.length === 0) {
    return 'hourly'; // Default to hourly if no valid timestamps
  }

  // Find earliest and latest timestamps
  const earliest = new Date(Math.min(...timestamps.map(t => t.getTime())));
  const latest = new Date(Math.max(...timestamps.map(t => t.getTime())));

  // Calculate hours difference
  const hoursDiff = (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60);

  // If <= 5 hours, use minute granularity, otherwise use hourly
  return hoursDiff <= HOURS_THRESHOLD ? 'minute' : 'hourly';
}

