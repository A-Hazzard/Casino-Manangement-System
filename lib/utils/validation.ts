import type { CreateCollectionReportPayload } from "@/lib/types/api";

/**
 * Validates if a string is a valid email address.
 *
 * @param email - The email address to validate.
 * @returns True if valid, false otherwise.
 */
export function validateEmail(email: string): boolean {
  return /\S+@\S+\.\S+/.test(email);
}

/**
 * Validates if a password is at least 6 characters.
 *
 * @param password - The password to validate.
 * @returns True if valid, false otherwise.
 */
export function validatePassword(password: string): boolean {
  return password.length >= 6;
}

/**
 * Validates a CreateCollectionReportPayload object.
 * @param payload - The payload to validate.
 * @returns { isValid: boolean, errors: string[] }
 */
export function validateCollectionReportPayload(
  payload: CreateCollectionReportPayload
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!payload.collectorName) errors.push("Collector name is required.");
  if (!payload.locationName) errors.push("Location name is required.");
  if (!payload.locationReportId) errors.push("Location report ID is required.");
  if (!payload.location) errors.push("Location ID is required.");
  if (!payload.timestamp) errors.push("Timestamp is required.");
  if (typeof payload.variance !== "number" || isNaN(payload.variance))
    errors.push("Variance is required and must be a number.");
  if (
    typeof payload.previousBalance !== "number" ||
    isNaN(payload.previousBalance)
  )
    errors.push("Previous balance is required and must be a number.");
  if (
    typeof payload.amountToCollect !== "number" ||
    isNaN(payload.amountToCollect)
  )
    errors.push("Amount to collect is required and must be a number.");
  if (
    typeof payload.amountCollected !== "number" ||
    isNaN(payload.amountCollected)
  )
    errors.push("Collected amount is required and must be a number.");
  if (typeof payload.taxes !== "number" || isNaN(payload.taxes))
    errors.push("Taxes is required and must be a number.");
  if (typeof payload.advance !== "number" || isNaN(payload.advance))
    errors.push("Advance is required and must be a number.");
  if (
    typeof payload.balanceCorrection !== "number" ||
    isNaN(payload.balanceCorrection)
  )
    errors.push("Balance correction is required and must be a number.");
  if (!payload.balanceCorrectionReas)
    errors.push("Balance correction reason is required.");
  if (!payload.varianceReason) errors.push("Variance reason is required.");
  if (!payload.reasonShortagePayment)
    errors.push("Reason for shortage payment is required.");
  return { isValid: errors.length === 0, errors };
}
