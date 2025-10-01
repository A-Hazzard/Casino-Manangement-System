import { UserDocument } from "@/shared/types/auth";
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
 * Validates if a password meets strength requirements.
 *
 * @param password - The password to validate.
 * @returns True if valid, false otherwise.
 */
export function validatePassword(password: UserDocument["password"]): boolean {
  // Minimum 8 characters, at least one uppercase, one lowercase, one number
  const strongPasswordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
}

/**
 * Validates password strength and returns detailed feedback.
 *
 * @param password - The password to validate.
 * @returns Object with validation result and feedback.
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number; // 0-4 scale
  feedback: string[];
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
} {
  const feedback: string[] = [];
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
  };

  let score = 0;

  if (requirements.length) {
    score++;
  } else {
    feedback.push("Password must be at least 8 characters long");
  }

  if (requirements.uppercase) {
    score++;
  } else {
    feedback.push("Password must contain at least one uppercase letter");
  }

  if (requirements.lowercase) {
    score++;
  } else {
    feedback.push("Password must contain at least one lowercase letter");
  }

  if (requirements.number) {
    score++;
  } else {
    feedback.push("Password must contain at least one number");
  }

  if (requirements.special) {
    score++;
  } else {
    feedback.push(
      "Password should contain at least one special character (@$!%*?&)"
    );
  }

  const isValid = score >= 4; // Require at least 4 out of 5 criteria

  return {
    isValid,
    score,
    feedback,
    requirements,
  };
}

/**
 * Gets password strength label based on score.
 *
 * @param score - Password strength score (0-4).
 * @returns String label for password strength.
 */
export function getPasswordStrengthLabel(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return "Very Weak";
    case 2:
      return "Weak";
    case 3:
      return "Good";
    case 4:
    case 5:
      return "Strong";
    default:
      return "Unknown";
  }
}

/**
 * Validates if a string contains special characters that are not allowed in usernames, firstnames, or lastnames.
 * Also checks for phone number patterns.
 *
 * @param value - The string to validate.
 * @returns True if valid (no special characters or phone patterns), false otherwise.
 */
export function validateProfileField(value: string): boolean {
  // Allow letters, numbers, spaces, hyphens, and apostrophes
  const allowedPattern = /^[a-zA-Z0-9\s\-']+$/;

  // Check for phone number patterns
  const phonePattern =
    /^[\+]?[1-9][\d]{0,15}$|^[\+]?[(]?[\d\s\-\(\)]{7,}$|^[\+]?[1-9][\d\s\-\(\)]{6,}$/;

  return allowedPattern.test(value) && !phonePattern.test(value.trim());
}

/**
 * Validates if a string contains only letters and spaces (for names).
 * Also checks for phone number patterns.
 *
 * @param value - The string to validate.
 * @returns True if valid (only letters and spaces, no phone patterns), false otherwise.
 */
export function validateNameField(value: string): boolean {
  // Allow only letters and spaces
  const allowedPattern = /^[a-zA-Z\s]+$/;

  // Check for phone number patterns
  const phonePattern =
    /^[\+]?[1-9][\d]{0,15}$|^[\+]?[(]?[\d\s\-\(\)]{7,}$|^[\+]?[1-9][\d\s\-\(\)]{6,}$/;

  return allowedPattern.test(value) && !phonePattern.test(value.trim());
}

/**
 * Checks if a string contains phone number patterns.
 *
 * @param value - The string to check.
 * @returns True if contains phone number patterns, false otherwise.
 */
export function containsPhonePattern(value: string): boolean {
  // Various phone number patterns
  const phonePatterns = [
    /^[\+]?[1-9][\d]{0,15}$/, // International format: +1234567890
    /^[\+]?[(]?[\d\s\-\(\)]{7,}$/, // With parentheses: (123) 456-7890
    /^[\+]?[1-9][\d\s\-\(\)]{6,}$/, // With dashes: 123-456-7890
    /^\d{3}[\s\-]?\d{3}[\s\-]?\d{4}$/, // US format: 123-456-7890 or 123 456 7890
    /^\(\d{3}\)\s?\d{3}[\s\-]?\d{4}$/, // US format with parentheses: (123) 456-7890
    /^\d{10}$/, // 10 digits: 1234567890
    /^\d{11}$/, // 11 digits: 11234567890
  ];

  const trimmedValue = value.trim();
  return phonePatterns.some((pattern) => pattern.test(trimmedValue));
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
  // Only validate variance if it's provided (optional field)
  if (
    payload.variance !== undefined &&
    payload.variance !== null &&
    (typeof payload.variance !== "number" || isNaN(payload.variance))
  )
    errors.push("Variance must be a number if provided.");
  // Only validate previous balance if it's provided (optional field)
  if (
    payload.previousBalance !== undefined &&
    payload.previousBalance !== null &&
    (typeof payload.previousBalance !== "number" ||
      isNaN(payload.previousBalance))
  )
    errors.push("Previous balance must be a number if provided.");
  if (
    typeof payload.amountToCollect !== "number" ||
    isNaN(payload.amountToCollect)
  )
    errors.push("Amount to collect is required and must be a number.");
  // Only validate collected amount if it's provided (optional field)
  if (
    payload.amountCollected !== undefined &&
    payload.amountCollected !== null &&
    (typeof payload.amountCollected !== "number" ||
      isNaN(payload.amountCollected))
  )
    errors.push("Collected amount must be a number if provided.");
  // Only validate taxes if it's provided (optional field)
  if (
    payload.taxes !== undefined &&
    payload.taxes !== null &&
    (typeof payload.taxes !== "number" || isNaN(payload.taxes))
  )
    errors.push("Taxes must be a number if provided.");
  // Only validate advance if it's provided (optional field)
  if (
    payload.advance !== undefined &&
    payload.advance !== null &&
    (typeof payload.advance !== "number" || isNaN(payload.advance))
  )
    errors.push("Advance must be a number if provided.");
  if (
    typeof payload.balanceCorrection !== "number" ||
    isNaN(payload.balanceCorrection)
  )
    errors.push("Balance correction is required and must be a number.");
  if (
    payload.balanceCorrectionReas &&
    payload.balanceCorrectionReas.trim() === ""
  )
    errors.push("Balance correction reason cannot be empty if provided.");
  if (payload.varianceReason && payload.varianceReason.trim() === "")
    errors.push("Variance reason cannot be empty if provided.");
  if (
    payload.reasonShortagePayment &&
    payload.reasonShortagePayment.trim() === ""
  )
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
