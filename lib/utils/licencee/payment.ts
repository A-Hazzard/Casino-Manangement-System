/**
 * Licencee Payment Utilities
 *
 * Utility functions for managing licencee payment status and dates.
 *
 * Features:
 * - Payment status checking
 * - Payment status change eligibility
 * - Date calculations (next 30 days)
 * - Date formatting for display
 */

import type { Licencee } from '@/lib/types/common';
import { formatFullDate } from '@/lib/utils/date';

// ============================================================================
// Payment Status Functions
// ============================================================================
/**
 * Determines if a licencee is paid based on the isPaid field from the API.
 * The backend is the source of truth and already contains fallback logic for the expiry date.
 *
 * @param licencee - The licencee object, which should have an `isPaid` boolean.
 * @returns Boolean indicating if the licencee is paid.
 */
export function isLicenceePaid(licencee: Licencee): boolean {
  // The backend now provides a definitive isPaid boolean.
  // This function simply returns that value, with a fallback to false if it's missing.
  return licencee.isPaid ?? false;
}

/**
 * Determines if the payment status can be changed (only if expired)
 * @param licencee - The licencee object
 * @returns boolean
 */
export function canChangePaymentStatus(licencee: Licencee): boolean {
  if (!licencee.expiryDate) return false;
  return new Date() > new Date(licencee.expiryDate);
}

// ============================================================================
// Date Functions
// ============================================================================
/**
 * Gets the next 30 days from the current date.
 *
 * @returns Date object 30 days from now.
 */
export function getNext30Days(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
}

/**
 * Formats a date for display (licencee date formatting)
 * @param date - Date to format
 * @returns Formatted date string or "-" if no date
 */
export function formatLicenceeDate(date: Date | string | undefined): string {
  return formatFullDate(date);
}

