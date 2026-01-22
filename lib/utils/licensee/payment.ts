/**
 * Licensee Payment Utilities
 *
 * Utility functions for managing licensee payment status and dates.
 *
 * Features:
 * - Payment status checking
 * - Payment status change eligibility
 * - Date calculations (next 30 days)
 * - Date formatting for display
 */

import type { Licensee } from '@/lib/types/common';
import { formatFullDate } from '@/lib/utils/date';

// ============================================================================
// Payment Status Functions
// ============================================================================
/**
 * Determines if a licensee is paid based on the isPaid field from the API.
 * The backend is the source of truth and already contains fallback logic for the expiry date.
 *
 * @param licensee - The licensee object, which should have an `isPaid` boolean.
 * @returns Boolean indicating if the licensee is paid.
 */
export function isLicenseePaid(licensee: Licensee): boolean {
  // The backend now provides a definitive isPaid boolean.
  // This function simply returns that value, with a fallback to false if it's missing.
  return licensee.isPaid ?? false;
}

/**
 * Determines if the payment status can be changed (only if expired)
 * @param licensee - The licensee object
 * @returns boolean
 */
export function canChangePaymentStatus(licensee: Licensee): boolean {
  if (!licensee.expiryDate) return false;
  return new Date() > new Date(licensee.expiryDate);
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
 * Formats a date for display (licensee date formatting)
 * @param date - Date to format
 * @returns Formatted date string or "-" if no date
 */
export function formatLicenseeDate(date: Date | string | undefined): string {
  return formatFullDate(date);
}

