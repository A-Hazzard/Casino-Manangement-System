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

| If you change…            | These recalculate:                          |
| :------------------------ | :------------------------------------------ |
| **metersIn / metersOut**  | `gross`, `amountToCollect`, `previousBalance` |
| **taxes**                 | `amountToCollect`, `previousBalance`        |
| **advance**               | `amountToCollect`, `previousBalance`        |
| **variance**              | `amountToCollect`, `previousBalance`        |
| **balanceCorrection**     | `amountToCollect`, `previousBalance`        |
| **collectedAmount**       | `previousBalance`                           |
