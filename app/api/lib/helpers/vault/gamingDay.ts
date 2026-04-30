/**
 * Gaming Day Helpers for Backend
 * 
 * Logic for attributing transactions to the correct gaming day
 * based on shift opening times and location offsets.
 */

import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { getGamingDayRange } from '@/lib/utils/gamingDayRange';
import type { GamingLocationDocument } from '@shared/types';

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
  if (!openedAt || !(openedAt instanceof Date) || !locationId || typeof locationId !== 'string') {
    console.error('[getAttributionDate] openedAt (Date) and locationId (string) are required');
    return new Date();
  }

  const now = new Date();

  // Fetch location for offset
  const location = await GamingLocations.findOne({ _id: locationId }).select('gameDayOffset').lean<GamingLocationDocument>();
  const gameDayOffset = location?.gameDayOffset ?? 8;

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
  if (!openedAt || !(openedAt instanceof Date) || !locationId || typeof locationId !== 'string') {
    console.error('[isShiftStaleBackend] openedAt (Date) and locationId (string) are required');
    return false;
  }

  const now = new Date();
  const location = await GamingLocations.findOne({ _id: locationId }).select('gameDayOffset').lean<GamingLocationDocument>();
  const gameDayOffset = location?.gameDayOffset ?? 8;

  const currentRange = getGamingDayRange(now, gameDayOffset);
  const shiftRange = getGamingDayRange(openedAt, gameDayOffset);

  return shiftRange.rangeStart.getTime() < currentRange.rangeStart.getTime();
}
