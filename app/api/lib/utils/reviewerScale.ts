/**
 * Reviewer Scale Utility
 *
 * Centralises the reviewer multiplier calculation used across collection report APIs.
 * Reviewers see a scaled-down view of all financial data based on their multiplier.
 *
 * Formula:  scale = 1 - multiplier   (e.g. multiplier 0.30 → scale 0.70)
 * Non-reviewers always receive scale = 1 (no transformation).
 *
 * @module app/api/lib/utils/reviewerScale
 */

// Minimal shape needed — avoids coupling to a specific JWT/DB type.
type UserForScale = {
  moneyInMultiplier?: number | null;
  moneyOutAndJackpotMultiplier?: number | null;
  reviewerMultiplierStartTime?: Date | string | null;
  roles?: string[] | unknown[];
};

// ============================================================================
// Scale factors for dual multiplier system
// ============================================================================

export const DEFAULT_REVIEWER_MULTIPLIER_START_DATE = '2026-04-01';

const DEFAULT_REVIEWER_MULTIPLIER_START_TIMESTAMP = new Date(
  `${DEFAULT_REVIEWER_MULTIPLIER_START_DATE}T00:00:00.000Z`
).getTime();

function parseTimestamp(
  value: Date | string | null | undefined
): number | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const dateTimestamp = value.getTime();
    return Number.isNaN(dateTimestamp) ? null : dateTimestamp;
  }

  if (typeof value === 'string') {
    const parsedTimestamp = new Date(value).getTime();
    return Number.isNaN(parsedTimestamp) ? null : parsedTimestamp;
  }

  return null;
}

function resolveReferenceTimestamp(referenceDate?: Date | string | null): number {
  const parsedReferenceTimestamp = parseTimestamp(referenceDate);
  return parsedReferenceTimestamp ?? Date.now();
}

export function shouldApplyReviewerMultipliers(
  user: UserForScale,
  referenceDate?: Date | string | null
): boolean {
  if (!user || typeof user !== 'object') {
    return false;
  }

  const isReviewer = (user.roles as string[])?.includes('reviewer') ?? false;
  if (!isReviewer) {
    return false;
  }

  const configuredStartTimestamp =
    parseTimestamp(user.reviewerMultiplierStartTime) ??
    DEFAULT_REVIEWER_MULTIPLIER_START_TIMESTAMP;
  const dataTimestamp = resolveReferenceTimestamp(referenceDate);
  return dataTimestamp >= configuredStartTimestamp;
}

/**
 * Computes the money-in view scale factor for the given user.
 *
 * Returns `1 - moneyInMultiplier` for reviewer-role users with a non-zero multiplier,
 * or `1` for everyone else.
 *
 * @example
 * getMoneyInScale({ roles: ['reviewer'], moneyInMultiplier: 0.3 }) // → 0.7
 * getMoneyInScale({ roles: ['admin'],    moneyInMultiplier: 0.3 }) // → 1
 * getMoneyInScale({ roles: ['reviewer'], moneyInMultiplier: 0   }) // → 1
 */
export function getMoneyInScale(
  user: UserForScale,
  referenceDate?: Date | string | null
): number {
  if (!user || typeof user !== 'object') {
    console.error('[getMoneyInScale] user is required and must be an object');
    return 1;
  }

  const multiplier = user.moneyInMultiplier ?? 0;
  return shouldApplyReviewerMultipliers(user, referenceDate) && multiplier
    ? 1 - multiplier
    : 1;
}

/**
 * Computes the money-out & jackpot view scale factor for the given user.
 *
 * Returns `1 - moneyOutAndJackpotMultiplier` for reviewer-role users with a non-zero multiplier,
 * or `1` for everyone else.
 *
 * @example
 * getMoneyOutAndJackpotScale({ roles: ['reviewer'], moneyOutAndJackpotMultiplier: 0.5 }) // → 0.5
 * getMoneyOutAndJackpotScale({ roles: ['admin'],    moneyOutAndJackpotMultiplier: 0.5 }) // → 1
 * getMoneyOutAndJackpotScale({ roles: ['reviewer'], moneyOutAndJackpotMultiplier: 0   }) // → 1
 */
export function getMoneyOutAndJackpotScale(
  user: UserForScale,
  referenceDate?: Date | string | null
): number {
  if (!user || typeof user !== 'object') {
    console.error(
      '[getMoneyOutAndJackpotScale] user is required and must be an object'
    );
    return 1;
  }

  const multiplier = user.moneyOutAndJackpotMultiplier ?? 0;
  return shouldApplyReviewerMultipliers(user, referenceDate) && multiplier
    ? 1 - multiplier
    : 1;
}

/**
 * @deprecated Use getMoneyInScale() and getMoneyOutAndJackpotScale() instead.
 *
 * Kept for backward compatibility. Defaults to money-in scale behavior.
 */
export function getReviewerScale(
  user: UserForScale,
  referenceDate?: Date | string | null
): number {
  return getMoneyInScale(user, referenceDate);
}

// ============================================================================
// Per-machine financial values
// ============================================================================

export type MachineValuesInput = {
  /** Coins/bills in  — prevIn */
  drop: number;
  /** Coins/bills out — prevOut */
  cancelled: number;
  /** movement.gross from the collection document */
  meterGross: number;
  jackpot: number;
  /** meterGross - jackpot */
  netGross: number;
  /**
   * Raw SAS gross for the display column (meterData.drop - meterData.cancelled).
   * This is the pre-jackpot-adjustment value. When hasNoSasData is true this
   * field is irrelevant — the output will be 0.
   */
  sasGross: number;
  /** meterGross − adjustedSasGross (already computed in the caller) */
  variation: number;
  /** True when no SAS time window exists or no meter records were found */
  hasNoSasData: boolean;
};

export type MachineValuesScaled = {
  drop: number;
  cancelled: number;
  meterGross: number;
  jackpot: number;
  netGross: number;
  /** 0 when hasNoSasData is true, scaled sasGross otherwise */
  sasGross: number;
  variation: number;
};

/**
 * Applies the reviewer scale factors to all per-machine financial values in one call.
 *
 * Scales money-in values (drop, meterGross) with moneyInScale.
 * Scales money-out and jackpot values (cancelled, jackpot) with moneyOutScale.
 * NetGross is recalculated from scaled components.
 * Variation uses moneyInScale.
 *
 * When `hasNoSasData` is true the output `sasGross` is forced to `0` regardless of scale.
 */
export function scaleMachineValues(
  values: MachineValuesInput,
  moneyInScale: number,
  moneyOutScale: number
): MachineValuesScaled {
  if (
    !values ||
    typeof values !== 'object' ||
    typeof moneyInScale !== 'number' ||
    typeof moneyOutScale !== 'number'
  ) {
    console.error(
      '[scaleMachineValues] values (object), moneyInScale (number), and moneyOutScale (number) are required'
    );
    return {
      drop: 0,
      cancelled: 0,
      meterGross: 0,
      jackpot: 0,
      netGross: 0,
      sasGross: 0,
      variation: 0,
    };
  }

  const {
    drop,
    cancelled,
    meterGross,
    jackpot,
    sasGross,
    variation,
    hasNoSasData,
  } = values;

  const scaledDrop = drop * moneyInScale;
  const scaledCancelled = cancelled * moneyOutScale;
  const scaledMeterGross = meterGross * moneyInScale;
  const scaledJackpot = jackpot * moneyOutScale;

  return {
    drop: scaledDrop,
    cancelled: scaledCancelled,
    meterGross: scaledMeterGross,
    jackpot: scaledJackpot,
    netGross: scaledMeterGross - scaledJackpot,
    sasGross: hasNoSasData ? 0 : sasGross * moneyInScale,
    variation: variation * moneyInScale,
  };
}

// ============================================================================
// Report-level summary fields  (used by the collection-reports list API)
// ============================================================================

export type ReportFinancials = {
  amountCollected?: number | null;
  amountToCollect?: number | null;
  amountUncollected?: number | null;
  partnerProfit?: number | null;
  taxes?: number | null;
  advance?: number | null;
  previousBalance?: number | null;
  balanceCorrection?: number | null;
  currentBalance?: number | null;
  /** May be a number or a display string such as '-' */
  variance?: number | string | null;
};

/**
 * Applies the reviewer scale factors to report-level summary financial fields.
 *
 * Scales money-in related fields (amountCollected, amountToCollect, amountUncollected, partnerProfit, variance) with moneyInScale.
 * Scales money-out related fields (taxes, advance, previousBalance, balanceCorrection, currentBalance) with moneyOutScale.
 *
 * Fast-paths when both scales === 1 so non-reviewer traffic pays no allocation cost.
 * Non-numeric `variance` values (display strings) are passed through unchanged.
 */
export function scaleReportFinancials<T extends ReportFinancials>(
  report: T,
  moneyInScale: number,
  moneyOutScale: number
): T {
  if (
    !report ||
    typeof report !== 'object' ||
    typeof moneyInScale !== 'number' ||
    typeof moneyOutScale !== 'number'
  ) {
    console.error(
      '[scaleReportFinancials] report (object), moneyInScale (number), and moneyOutScale (number) are required'
    );
    return report;
  }

  if (moneyInScale === 1 && moneyOutScale === 1) return report;

  return {
    ...report,
    amountCollected: (report.amountCollected ?? 0) * moneyInScale,
    amountToCollect: (report.amountToCollect ?? 0) * moneyInScale,
    amountUncollected: (report.amountUncollected ?? 0) * moneyInScale,
    partnerProfit: (report.partnerProfit ?? 0) * moneyInScale,
    taxes: (report.taxes ?? 0) * moneyOutScale,
    advance: (report.advance ?? 0) * moneyOutScale,
    previousBalance: (report.previousBalance ?? 0) * moneyOutScale,
    balanceCorrection: (report.balanceCorrection ?? 0) * moneyOutScale,
    currentBalance: (report.currentBalance ?? 0) * moneyOutScale,
    variance:
      typeof report.variance === 'number'
        ? report.variance * moneyInScale
        : report.variance,
  };
}
