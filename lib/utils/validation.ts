import { UserDocument } from "@/app/api/lib/types/auth";
import type { CreateCollectionReportPayload } from "@/lib/types/api";

/**
 * Validates if a string is a valid email address.
 *
 * @param emailAddress - The email address to validate.
 * @returns True if valid, false otherwise.
 */
export function validateEmail(
  emailAddress: UserDocument["emailAddress"]
): boolean {
  return /\S+@\S+\.\S+/.test(emailAddress);
}

/**
 * Validates if a password is at least 6 characters.
 *
 * @param password - The password to validate.
 * @returns True if valid, false otherwise.
 */
export function validatePassword(password: UserDocument["password"]): boolean {
  return password.length >= 6;
}

/**
 * Validates a CreateCollectionReportPayload object (backend).
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
  if (payload.balanceCorrectionReas && payload.balanceCorrectionReas.trim() === "")
    errors.push("Balance correction reason cannot be empty if provided.");
  if (payload.varianceReason && payload.varianceReason.trim() === "")
    errors.push("Variance reason cannot be empty if provided.");
  if (payload.reasonShortagePayment && payload.reasonShortagePayment.trim() === "")
    errors.push("Reason for shortage payment cannot be empty if provided.");
  return { isValid: errors.length === 0, errors };
}

/**
 * Validates collection report data to ensure it's valid and complete.
 * @param data - The collection report data to validate.
 * @returns True if the data is valid, false otherwise.
 */
export function validateCollectionReportData(data: unknown): boolean {
  if (!data || typeof data !== "object") {
    return false;
  }
  
  const report = data as Record<string, unknown>;
  
  // Check for essential fields that indicate a valid collection report
  // Note: API returns transformed data with different field names than database
  return !!(
    report.reportId &&
    report.locationName &&
    report.collectionDate &&
    Array.isArray(report.machineMetrics) &&
    report.locationMetrics &&
    typeof report.locationMetrics === "object"
  );
}

