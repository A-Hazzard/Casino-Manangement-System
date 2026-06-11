/**
 * Bill Validator Operations
 *
 * Helpers for processing bill validator data — V1 (value field) and V2 (movement object)
 * bill data formats, denomination filtering based on location settings, and data aggregation.
 *
 * @module app/api/lib/helpers/billValidator/validatorOperations
 */

import type { AcceptedBillDocument } from '@/shared/types/models';
import type { TimePeriod } from '@/shared/types/common';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';

// ============================================================================
// Types
// ============================================================================

export type BillDocument = AcceptedBillDocument & {
  toObject?: () => Record<string, unknown>;
};

type DenominationOption = {
  key: string;
  value: number;
  optionKey: string;
};

export type ProcessedBillData = {
  version: string;
  denominations: Array<{
    denomination: number;
    label: string;
    quantity: number;
    subtotal: number;
  }>;
  totalAmount: number;
  totalQuantity: number;
  unknownBills: number;
  currentBalance: number;
  totalKnownAmount?: number;
  totalUnknownAmount?: number;
};

// ============================================================================
// Constants
// ============================================================================

const ALL_DENOMINATIONS: DenominationOption[] = [
  { key: 'dollar1', value: 1, optionKey: 'denom1' },
  { key: 'dollar2', value: 2, optionKey: 'denom2' },
  { key: 'dollar5', value: 5, optionKey: 'denom5' },
  { key: 'dollar10', value: 10, optionKey: 'denom10' },
  { key: 'dollar20', value: 20, optionKey: 'denom20' },
  { key: 'dollar50', value: 50, optionKey: 'denom50' },
  { key: 'dollar100', value: 100, optionKey: 'denom100' },
  { key: 'dollar200', value: 200, optionKey: 'denom200' },
  { key: 'dollar500', value: 500, optionKey: 'denom500' },
  { key: 'dollar1000', value: 1000, optionKey: 'denom1000' },
  { key: 'dollar2000', value: 2000, optionKey: 'denom2000' },
  { key: 'dollar5000', value: 5000, optionKey: 'denom5000' },
  { key: 'dollar10000', value: 10000, optionKey: 'denom10000' },
];

export const DEFAULT_BILL_VALIDATOR_OPTIONS: Record<string, boolean> = {
  denom1: true,
  denom2: true,
  denom5: true,
  denom10: true,
  denom20: true,
  denom50: true,
  denom100: true,
  denom200: true,
  denom500: true,
  denom1000: true,
  denom2000: true,
  denom5000: true,
  denom10000: true,
};

// ============================================================================
// Date Filter
// ============================================================================

/**
 * Creates a MongoDB date filter for bill queries.
 * Supports both custom date ranges and predefined time periods.
 */
export function createDateFilter(
  startDate: string | null,
  endDate: string | null,
  timePeriod: TimePeriod | string,
  dateField: 'createdAt' | 'readAt',
  gameDayOffset: number
): Record<string, unknown> {
  if (startDate && endDate) {
    const customStart = new Date(startDate);
    const customEnd = new Date(endDate);
    return { [dateField]: { $gte: customStart, $lte: customEnd } };
  }

  if (timePeriod && timePeriod !== 'All Time') {
    const gamingDayRange = getGamingDayRangeForPeriod(
      timePeriod as TimePeriod,
      gameDayOffset
    );
    return {
      [dateField]: {
        $gte: gamingDayRange.rangeStart,
        $lte: gamingDayRange.rangeEnd,
      },
    };
  }

  return {};
}

// ============================================================================
// Denomination Helpers
// ============================================================================

/**
 * Gets the filtered denominations based on enabled options.
 */
function getEnabledDenominations(
  billValidatorOptions: Record<string, boolean>
): DenominationOption[] {
  return ALL_DENOMINATIONS.filter(
    ({ optionKey }) => billValidatorOptions[optionKey] === true
  );
}

// ============================================================================
// Empty State
// ============================================================================

/**
 * Returns an empty denomination structure for machines with no bills.
 * Uses enabled denominations from validator options for the denomination list.
 *
 * @param {number} currentBalance - Current machine balance
 * @param {Record<string, boolean>} billValidatorOptions - Enabled denomination options
 * @returns {ProcessedBillData} Empty processed bill data
 */
export function getEmptyDenominations(
  currentBalance: number,
  billValidatorOptions: Record<string, boolean>
): ProcessedBillData {
  const emptyDenominations = getEnabledDenominations(billValidatorOptions).map(
    ({ value }) => ({
      denomination: value,
      label: `$${value}`,
      quantity: 0,
      subtotal: 0,
    })
  );

  return {
    version: 'v2',
    denominations: emptyDenominations,
    totalAmount: 0,
    totalQuantity: 0,
    unknownBills: 0,
    currentBalance,
  };
}

// ============================================================================
// V1 Data Processing
// ============================================================================

function processV1Data(
  bills: BillDocument[],
  currentBalance: number,
  billValidatorOptions: Record<string, boolean>
): ProcessedBillData {
  const denominationTotals: Record<number, number> = {};

  for (const bill of bills) {
    const billObj = bill.toObject ? bill.toObject() : bill;

    if (billObj.value !== undefined) {
      const value = Number(billObj.value);

      if (!denominationTotals[value]) {
        denominationTotals[value] = 0;
      }

      const denominationKey = getDenominationKey(value);
      const isEnabled = billValidatorOptions[denominationKey] === true;

      if (isEnabled) {
        denominationTotals[value]++;
      }
    }
  }

  const allDenominations = getEnabledDenominations(billValidatorOptions);

  const denominations = allDenominations.map(({ value }) => ({
    denomination: value,
    label: `$${value}`,
    quantity: denominationTotals[value] || 0,
    subtotal: (denominationTotals[value] || 0) * value,
  }));

  const totalAmount = denominations.reduce(
    (sum, item) => sum + item.subtotal,
    0
  );
  const totalQuantity = denominations.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return {
    version: 'v1',
    denominations,
    totalAmount,
    totalQuantity,
    unknownBills: 0,
    currentBalance,
  };
}

// ============================================================================
// V2 Data Processing
// ============================================================================

function processV2Data(
  bills: BillDocument[],
  currentBalance: number,
  billValidatorOptions: Record<string, boolean>
): ProcessedBillData {
  const denominationTotals: Record<
    string,
    { quantity: number; subtotal: number }
  > = {};

  for (const bill of bills) {
    const billObj = bill.toObject ? bill.toObject() : bill;

    if (billObj.movement) {
      for (const { key, value, optionKey } of ALL_DENOMINATIONS) {
        const quantity =
          (billObj.movement as Record<string, number>)?.[key] || 0;

        if (!denominationTotals[key]) {
          denominationTotals[key] = { quantity: 0, subtotal: 0 };
        }

        if (quantity > 0) {
          const isEnabled = billValidatorOptions[optionKey] === true;

          if (isEnabled) {
            denominationTotals[key].quantity += quantity;
            denominationTotals[key].subtotal += quantity * value;
          }
        }
      }
    }
  }

  const allDenominations = getEnabledDenominations(billValidatorOptions);

  const denominations = allDenominations
    .map(({ key, value }) => {
      const data = denominationTotals[key] || { quantity: 0, subtotal: 0 };
      return {
        denomination: value,
        label: `$${value}`,
        quantity: data.quantity,
        subtotal: data.subtotal,
      };
    })
    .sort((a, b) => a.denomination - b.denomination);

  const totalAmount = denominations.reduce(
    (sum, item) => sum + item.subtotal,
    0
  );
  const totalQuantity = denominations.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const totalKnownAmount = bills.reduce(
    (sum: number, bill: BillDocument) => {
      const billObj = bill.toObject ? bill.toObject() : bill;
      const movement = billObj.movement as
        | (Record<string, number> & { dollarTotal?: number })
        | undefined;

      if (!movement) return sum;

      let billKnownAmount = 0;
      for (const { key, optionKey } of ALL_DENOMINATIONS) {
        const quantity = movement[key] || 0;
        const denominationValue = parseInt(key.replace('dollar', ''), 10);
        if (quantity > 0 && billValidatorOptions[optionKey] === true) {
          billKnownAmount += quantity * denominationValue;
        }
      }

      return sum + billKnownAmount;
    },
    0
  );

  const totalUnknownAmount = bills.reduce(
    (sum: number, bill: BillDocument) => {
      const billObj = bill.toObject ? bill.toObject() : bill;
      const movement = billObj.movement as
        | (Record<string, number> & { dollarTotalUnknown?: number })
        | undefined;
      return sum + (movement?.dollarTotalUnknown || 0);
    },
    0
  );

  return {
    version: 'v2',
    denominations,
    totalAmount,
    totalQuantity,
    totalKnownAmount,
    totalUnknownAmount,
    unknownBills: totalUnknownAmount,
    currentBalance,
  };
}

// ============================================================================
// Main Processor
// ============================================================================

/**
 * Detects the bill data version (V1 or V2) from the first document.
 */
function detectBillVersion(
  sampleDoc: BillDocument
): 'v1' | 'v2' {
  const obj = sampleDoc.toObject ? sampleDoc.toObject() : sampleDoc;
  const hasValue = obj.value !== undefined;
  const hasMovement = obj.movement && typeof obj.movement === 'object';

  if (hasValue) return 'v1';
  if (hasMovement) return 'v2';
  return 'v1';
}

/**
 * Processes a batch of bill documents into aggregated denomination data.
 * Handles both V1 (value field) and V2 (movement object) formats.
 */
export function processBillsData(
  bills: BillDocument[],
  currentBalance: number,
  billValidatorOptions: Record<string, boolean>
): ProcessedBillData {
  if (bills.length === 0) {
    return getEmptyDenominations(currentBalance, billValidatorOptions);
  }

  const version = detectBillVersion(bills[0]);

  if (version === 'v1') {
    return processV1Data(bills, currentBalance, billValidatorOptions);
  }

  return processV2Data(bills, currentBalance, billValidatorOptions);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Maps a numeric denomination value to its option key string.
 * Used for V1 data to check billValidatorOptions.
 */
export function getDenominationKey(value: number): string {
  const map: Record<number, string> = {
    1: 'denom1',
    2: 'denom2',
    5: 'denom5',
    10: 'denom10',
    20: 'denom20',
    50: 'denom50',
    100: 'denom100',
    500: 'denom500',
    1000: 'denom1000',
    2000: 'denom2000',
    5000: 'denom5000',
  };
  return map[value] || '';
}
