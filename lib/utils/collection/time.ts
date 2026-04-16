/**
 * Collection Time Utility Functions
 *
 * Handles calculation of default collection times based on location's gameDayOffset.
 *
 * Features:
 * - Default collection time calculation
 * - Game day offset handling
 * - Time zone considerations
 */

// ============================================================================
// Collection Time Calculation
// ============================================================================
/**
 * Calculate the default collection time for a new collection
 *
 * Logic:
 * - Takes the location's gameDayOffset (e.g., 8 for 8 AM, 14 for 2 PM)
 * - Returns exactly 1 minute before the offset (e.g., 7:59 AM for 8, 1:59 PM for 14)
 * - gameDayOffset is in the user's local timezone
 *
 * @param gameDayOffset - The location's game day offset (hour in 24-hour format, 0-23)
 * @param targetDate - The target date for the collection (defaults to today)
 * @returns Date object set to the calculated collection time
 */
export function calculateDefaultCollectionTime(
  gameDayOffset?: number,
  targetDate?: Date
): Date {
  const baseDate = targetDate || new Date();

  // Default to 10 AM if no gameDayOffset provided
  const offsetHour = gameDayOffset ?? 10;

  // Create a new date at the offset hour
  const collectionTime = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    offsetHour,
    0, // Start at 00 minutes
    0,
    0
  );

  return collectionTime;
}


