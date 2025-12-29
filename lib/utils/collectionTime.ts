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
 * - Takes the location's gameDayOffset (e.g., 10 for 10 AM, 16 for 4 PM)
 * - Subtracts 2 hours to get the collection time
 * - Sets the time to the target date at the calculated hour
 * - gameDayOffset is in the user's local timezone (not UTC)
 *
 * Example:
 * - Target date: October 8th, 2025
 * - gameDayOffset: 10 (10 AM)
 * - Calculated time: 8:00 AM (10 - 2)
 * - Result: October 8th, 2025 at 8:00 AM
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

  // Subtract 2 hours from the gameDayOffset
  const collectionHour = offsetHour - 2;

  // Create a new date for the target date at the calculated hour
  const collectionTime = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    collectionHour,
    0, // Minutes: 0
    0, // Seconds: 0
    0 // Milliseconds: 0
  );

  return collectionTime;
}

