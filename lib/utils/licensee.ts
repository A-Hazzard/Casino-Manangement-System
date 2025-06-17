import type { Licensee } from "@/lib/types/licensee";

/**
 * Determines if a licensee is paid based on isPaid field or expiry date
 * @param licensee - The licensee object
 * @returns boolean indicating if the licensee is paid
 */
export function isLicenseePaid(licensee: Licensee): boolean {
  if (typeof licensee.isPaid === "boolean") {
    return licensee.isPaid;
  }
  if (!licensee.expiryDate) return false;
  return new Date(licensee.expiryDate) > new Date();
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

/**
 * Gets the next 30 days from the current date
 * @returns Date object 30 days from now
 */
export function getNext30Days(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
}

/**
 * Formats a date for display
 * @param date - Date to format
 * @returns Formatted date string or "-" if no date
 */
export function formatLicenseeDate(date: Date | string | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
}
