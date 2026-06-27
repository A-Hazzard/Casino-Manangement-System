/**
 * Collection Report Validation
 *
 * Validation utilities for collection report payloads and data structures.
 *
 * @module lib/utils/validation/collectionReports
 */

import type { CreateCollectionReportPayload } from '@/lib/types/api';

// ============================================================================
// Collection Report Payload Validation
// ============================================================================

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
  if (!payload.collector) errors.push('Collector ID is required.');
  if (!payload.locationName) errors.push('Location name is required.');
  if (!payload.locationReportId) errors.push('Location report ID is required.');
  if (!payload.location) errors.push('Location ID is required.');
  if (!payload.timestamp) errors.push('Timestamp is required.');
  if (
    payload.variance !== undefined &&
    payload.variance !== null &&
    (typeof payload.variance !== 'number' || isNaN(payload.variance))
  )
    errors.push('Variance must be a number if provided.');
  if (
    payload.previousBalance !== undefined &&
    payload.previousBalance !== null &&
    (typeof payload.previousBalance !== 'number' ||
      isNaN(payload.previousBalance))
  )
    errors.push('Previous balance must be a number if provided.');
  if (
    typeof payload.amountToCollect !== 'number' ||
    isNaN(payload.amountToCollect)
  )
    errors.push('Amount to collect is required and must be a number.');
  if (
    payload.amountCollected !== undefined &&
    payload.amountCollected !== null &&
    (typeof payload.amountCollected !== 'number' ||
      isNaN(payload.amountCollected))
  )
    errors.push('Collected amount must be a number if provided.');
  if (
    payload.taxes !== undefined &&
    payload.taxes !== null &&
    (typeof payload.taxes !== 'number' || isNaN(payload.taxes))
  )
    errors.push('Taxes must be a number if provided.');
  if (
    payload.advance !== undefined &&
    payload.advance !== null &&
    (typeof payload.advance !== 'number' || isNaN(payload.advance))
  )
    errors.push('Advance must be a number if provided.');
  if (
    typeof payload.balanceCorrection !== 'number' ||
    isNaN(payload.balanceCorrection)
  )
    errors.push('Balance correction is required and must be a number.');
  if (
    payload.balanceCorrectionReas &&
    payload.balanceCorrectionReas.trim() === ''
  )
    errors.push('Balance correction reason cannot be empty if provided.');
  if (payload.varianceReason && payload.varianceReason.trim() === '')
    errors.push('Variance reason cannot be empty if provided.');
  if (
    payload.reasonShortagePayment &&
    payload.reasonShortagePayment.trim() === ''
  )
    errors.push('Reason for shortage payment cannot be empty if provided.');
  if (errors.length > 0) {
    console.group('⚠️ Collection Report Validation Errors');
    console.error('Validation failed with the following issues:', errors);
    console.log('Payload Field Types:', {
      variance: { value: payload.variance, type: typeof payload.variance },
      previousBalance: {
        value: payload.previousBalance,
        type: typeof payload.previousBalance,
      },
      amountToCollect: {
        value: payload.amountToCollect,
        type: typeof payload.amountToCollect,
      },
      amountCollected: {
        value: payload.amountCollected,
        type: typeof payload.amountCollected,
      },
      taxes: { value: payload.taxes, type: typeof payload.taxes },
      advance: { value: payload.advance, type: typeof payload.advance },
      balanceCorrection: {
        value: payload.balanceCorrection,
        type: typeof payload.balanceCorrection,
      },
    });
    console.groupEnd();
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates collection report data to ensure it's valid and complete.
 * @param data - The collection report data to validate.
 * @returns True if the data is valid, false otherwise.
 */
export function validateCollectionReportData(data: unknown): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const report = data as {
    reportId?: unknown;
    locationName?: unknown;
    collectionDate?: unknown;
    machineMetrics?: unknown;
    locationMetrics?: unknown;
  };

  return !!(
    report.reportId &&
    report.locationName &&
    report.collectionDate &&
    Array.isArray(report.machineMetrics) &&
    report.locationMetrics &&
    typeof report.locationMetrics === 'object'
  );
}
