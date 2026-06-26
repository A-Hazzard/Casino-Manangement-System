# Collection Report: Financial Formulas & Code Reference

This document provides a technical reference for all financial calculations in the Collection Report module, using exact code variable names.

---

## 0. gross (Base Revenue)

**Variable**: `reportTotalData.gross`
**Source**: Computed — sum of `movement.gross` across all collected machine entries for this report.
**Role**: The starting point for every financial calculation in the report. All deductions, profit share, and adjustments derive from this value.

---

## 1. taxes

**Variable**: `financials.taxes`
**Source**: Manual Input.
**Role in formula**: Subtracted from the computed `partnerProfit`, NOT from `gross` directly.

```
partnerProfit = ((gross - variance - advance) × profitShare / 100) − taxes
```

Increasing taxes reduces the partner's cut (`partnerProfit`), which in turn increases `amountToCollect` — the collector hands more to the house.

---

## 2. advance

**Variable**: `financials.advance`
**Source**: Manual Input.
**Role in formula**: Deducted in two places:

1. Reduces the profit-share base: `(gross − variance − advance) × profitShare / 100`
2. Directly deducted from `amountToCollect`

The net effect is that an advance reduces both what the partner earns and what the collector must hand over.

---

## 3. variance

**Variable**: `financials.variance`
**Source**: Manual Input.
**Role in formula**: Identical to `advance` — deducted in two places:

1. Reduces the profit-share base: `(gross − variance − advance) × profitShare / 100`
2. Directly deducted from `amountToCollect`

Use this field to account for meter discrepancies or adjustments that should not be split with the partner.

---

## 4. amountToCollect

**Variable**: `financials.amountToCollect`
**Source**: Computed automatically whenever any input changes.
**Full formula**:

```
partnerProfit   = ((gross − variance − advance) × profitShare / 100) − taxes
amountToCollect = gross − variance − advance − partnerProfit
                + locationPreviousBalance + balanceCorrection
```

This is the target amount the collector is expected to hand over.

---

## 5. locationPreviousBalance

**Variable**: `locationPreviousBalance` (sourced from `locationCollectionBalance`)
**Source**: Database — the `previousBalance` carried forward from the most recent finalized collection report for this location.
**Role**: Added to `amountToCollect`. A positive value (collector previously handed over more than required) credits the collector this round; a negative value (collector previously fell short) increases what is owed now.

> This is **NOT** the `GamingLocations` opening balance field. It is the `previousBalance` computed at the end of the prior collection report and stored as the carry-over.

---

## 6. balanceCorrection

**Variable**: `financials.balanceCorrection`
**Source**: Manual Input.
**Role**: Added to `amountToCollect` as a one-time manual override. Use this to correct an unexpected discrepancy in the carry-over balance (e.g., a previously unrecorded cash adjustment).
**Gate**: `collectedAmount` is locked until `balanceCorrection` has been set — enforcing the sequence: confirm balance adjustments before recording physical cash.

---

## 7. collectedAmount

**Variable**: `financials.collectedAmount`
**Source**: Manual Input — physical cash retrieved from the location.
**Constraint**: Locked until `balanceCorrection` is populated.

---

## 8. previousBalance (New Carry-over)

**Variable**: `financials.previousBalance`
**Formula**:

```
previousBalance = collectedAmount − amountToCollect
```

A positive value means the collector handed over more than required (overage) — this credit carries forward. A negative value means the collector fell short (shortage) — this debt is added to the next `amountToCollect`.

---

## Field Dependencies

| If you change…           | These recalculate:                            |
| :----------------------- | :-------------------------------------------- |
| **metersIn / metersOut** | `gross`, `amountToCollect`, `previousBalance` |
| **taxes**                | `amountToCollect`, `previousBalance`          |
| **advance**              | `amountToCollect`, `previousBalance`          |
| **variance**             | `amountToCollect`, `previousBalance`          |
| **balanceCorrection**    | `amountToCollect`, `previousBalance`          |
| **collectedAmount**      | `previousBalance`                             |

---

## 9. Machine Gross vs SAS Gross vs Variation

In addition to the base `gross` (movement-based), the collection report detail page computes two independent figures per machine and a variation between them.

### 9.1 Machine Gross

**Source**: Movement-based — derived from the collection's `movement.gross` field (preferred) or recomputed from raw meter deltas.

```
Machine Gross = movement.drop - movement.totalCancelledCredits
              = (metersIn - prevIn) - (metersOut - prevOut)
```

For RAM-cleared machines:
```
Machine Gross = (ramClearMetersIn - prevIn) - (ramClearMetersOut - prevOut)
              + (metersIn - 0) - (metersOut - 0)
```

### 9.2 SAS Gross

**Source**: Queried from the `Meters` collection over the SAS time window (`sasStartTime` exclusive to `sasEndTime` inclusive).

```
SAS Gross = windowedDrop - windowedCancelledCredits
```

- For **SAS_READ** meters: windowed values = sum of `movement.drop` / `movement.totalCancelledCredits` across all readings in window.
- For **WOW_SYNC** meters: windowed values = `(last.drop - first.drop)` / `(last.totalCancelledCredits - first.totalCancelledCredits)` — movement sum is always 0, so absolute delta from first/last cumulative values is used.
- **Jackpot adjustment**: When `includeJackpot` is true, SAS Gross = `SAS Gross - windowedJackpot` (jackpot subtracted after the drop/cancelled sum).
- **No SAS data**: If no meters exist in the SAS window, SAS Gross = 0.

### 9.3 Variation

**Formula**:
```
Variation = Machine Gross - SAS Gross (jackpot-adjusted)
```

- Computed for machines that have `hasSmib === true` (physical relay, WOW sync, or no-SMIB location).
- For non-SMIB machines: variation = null (not applicable).
- For offline SMIB machines (supplemental meter): effective SAS gross = machine gross (variation forced to $0) because the collector's manual values are the truth.
- Stored as `totalVariation` on the report detail page for location-level rollup.

### 9.4 includeJackpot Flag

The `includeJackpot` flag lives on the **Licencee** record and controls whether jackpots are subtracted from SAS Gross before computing variation:

```
includeJackpot = true:  SAS Gross = (drop - cancelled) - jackpot → higher variation (jackpot subtracted)
includeJackpot = false: SAS Gross = (drop - cancelled)         → lower variation
```

This flag is fetched **live** from the Licencee on every query (not from the stale copy on the CollectionReport document). The fix for Bug 1 (see variation-fix.md) replaced a `$lookup` join to the Licencee collection to get the live value.

### 9.5 Reviewer Scale Application

Financial values on the detail page pass through `getReviewerScale(user)` before display:

```typescript
const scale = getReviewerScale(user: { multiplier?: number | null, roles?: string[] });
// For reviewer with multiplier 0.30 → scale = 0.70
// For non-reviewer → scale = 1 (no-op)
```

Scaled fields: `moneyIn`, `moneyOut`, `jackpot`, `gross`, `netGross`, `variation`, `sasGross`.
