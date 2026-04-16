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
  multiplier?: number | null;
  roles?: string[] | unknown[];
};

// ============================================================================
// Scale factor
// ============================================================================

/**
 * Computes the view scale factor for the given user.
 *
 * Returns `1 - multiplier` for reviewer-role users with a non-zero multiplier,
 * or `1` for everyone else (admin, manager, cashier, etc.).
 *
 * @example
 * getReviewerScale({ roles: ['reviewer'], multiplier: 0.3 }) // → 0.7
 * getReviewerScale({ roles: ['admin'],    multiplier: 0.3 }) // → 1
 * getReviewerScale({ roles: ['reviewer'], multiplier: 0   }) // → 1
 */
export function getReviewerScale(user: UserForScale): number {
  const multiplier = user.multiplier ?? 0;
  const isReviewer = (user.roles as string[])?.includes('reviewer') ?? false;
  return isReviewer && multiplier ? 1 - multiplier : 1;
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
 * Applies the reviewer scale factor to all per-machine financial values in one call.
 *
 * When `hasNoSasData` is true the output `sasGross` is forced to `0` regardless of scale,
 * matching the existing "No SAS Data" guard used in the response formatter.
 */
export function scaleMachineValues(
  values: MachineValuesInput,
  scale: number
): MachineValuesScaled {
  const {
    drop,
    cancelled,
    meterGross,
    jackpot,
    netGross,
    sasGross,
    variation,
    hasNoSasData,
  } = values;

  return {
    drop: drop * scale,
    cancelled: cancelled * scale,
    meterGross: meterGross * scale,
    jackpot: jackpot * scale,
    netGross: netGross * scale,
    sasGross: hasNoSasData ? 0 : sasGross * scale,
    variation: variation * scale,
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
 * Applies the reviewer scale factor to report-level summary financial fields.
 *
 * Fast-paths when `scale === 1` so non-reviewer traffic pays no allocation cost.
 * Non-numeric `variance` values (display strings) are passed through unchanged.
 */
export function scaleReportFinancials<T extends ReportFinancials>(
  report: T,
  scale: number
): T {
  if (scale === 1) return report;

  return {
    ...report,
    amountCollected:  (report.amountCollected  ?? 0) * scale,
    amountToCollect:  (report.amountToCollect  ?? 0) * scale,
    amountUncollected:(report.amountUncollected ?? 0) * scale,
    partnerProfit:    (report.partnerProfit    ?? 0) * scale,
    taxes:            (report.taxes            ?? 0) * scale,
    advance:          (report.advance          ?? 0) * scale,
    previousBalance:  (report.previousBalance  ?? 0) * scale,
    balanceCorrection:(report.balanceCorrection ?? 0) * scale,
    currentBalance:   (report.currentBalance   ?? 0) * scale,
    variance:
      typeof report.variance === 'number'
        ? report.variance * scale
        : report.variance,
  };
}
