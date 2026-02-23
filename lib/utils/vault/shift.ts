/**
 * Vault Shift Utilities
 *
 * Centralized logic for shift state detection (Cashier & Vault Manager).
 */

/**
 * Checks if a shift is "stale" (from a previous calendar day).
 * 
 * @param openedAt - The ISO string or Date object when the shift was opened.
 * @returns boolean - True if the shift started on a different calendar date than "now".
 */
export function isShiftStale(openedAt: Date | string | null | undefined): boolean {
  if (!openedAt) return false;
  
  const openedAtDate = typeof openedAt === 'string' ? new Date(openedAt) : openedAt;
  const now = new Date();
  
  // Normalize comparison to calendar date strings to detect "tomorrow" vs "today"
  // Note: This matches the existing logic in VaultPayoutsPageContent.tsx
  return openedAtDate.toDateString() !== now.toDateString();
}
