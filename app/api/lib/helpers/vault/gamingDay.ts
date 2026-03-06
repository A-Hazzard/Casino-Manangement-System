/**
 * Gaming Day Helpers for Backend
 * 
 * Logic for attributing transactions to the correct gaming day
 * based on shift opening times and location offsets.
 */

import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { getGamingDayRange } from '@/lib/utils/gamingDayRange';

/**
 * Gets the correct attribution date for a transaction.
 * If the shift is stale, returns the end of that shift's gaming day.
 * Otherwise returns the current date/time.
 * 
 * @param openedAt - Date the shift was opened
 * @param locationId - Location ID to fetch gameDayOffset
 * @returns {Date} The date to use for transaction attribution
 */
export async function getAttributionDate(openedAt: Date, locationId: string): Promise<Date> {
  const now = new Date();

  // Fetch location for offset
  const location = await GamingLocations.findById(locationId).select('gameDayOffset').lean();
  const gameDayOffset = (location as Record<string, unknown>)?.gameDayOffset as number ?? 8;

  // Get ranges for NOW and OPENED_AT
  const currentRange = getGamingDayRange(now, gameDayOffset);
  const shiftRange = getGamingDayRange(openedAt, gameDayOffset);

  // If shift started before the current gaming day, it's stale
  if (shiftRange.rangeStart.getTime() < currentRange.rangeStart.getTime()) {
    // Return the end of the shift's gaming day
    // This ensures it falls within the EOD report for that day
    return shiftRange.rangeEnd;
  }

  return now;
}

/**
 * Checks if a shift is stale based on gaming day logic
 */
export async function isShiftStaleBackend(openedAt: Date, locationId: string): Promise<boolean> {
  const now = new Date();
  const location = await GamingLocations.findById(locationId).select('gameDayOffset').lean();
  const gameDayOffset = (location as Record<string, unknown>)?.gameDayOffset as number ?? 8;

  const currentRange = getGamingDayRange(now, gameDayOffset);
  const shiftRange = getGamingDayRange(openedAt, gameDayOffset);

  return shiftRange.rangeStart.getTime() < currentRange.rangeStart.getTime();
}
