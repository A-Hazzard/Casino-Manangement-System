# Editing a Collection Report: Component Architecture Guide

This guide breaks down every step involved in modifying an existing Collection Report, detailing the functionality, components, and underlying logic for both PC and Mobile views.

## 1. Location Search and Select
In edit mode, the location is locked to the report's owner, but the machine list is still contextually loaded.

- **PC Component:** `components/CMS/collectionReport/forms/CollectionReportEditLocationMachineSelection.tsx`
- **Mobile Component:** `components/CMS/collectionReport/mobile/CollectionReportMobileEditLocationSelector.tsx`
- **Underlying Logic (Hook):** `lib/hooks/collectionReport/useEditCollectionModal.ts`
  - **Variables:** `lockedLocationId`, `selectedLocationName`.
  - **Functions:** `fetchOriginalReport(reportId)` - loads the historical draft.

## 2. Machine List
Shows existing collections in the report and other machines available at the location.

- **PC Component:** `components/CMS/collectionReport/forms/CollectionReportEditLocationMachineSelection.tsx`
- **Mobile Component:** `components/CMS/collectionReport/mobile/CollectionReportMobileEditMachineList.tsx`
- **Underlying Logic (Hook):** `useEditCollectionModal.ts`
  - **Variables:** `collectedMachineEntries` (initialized from the original report).

## 3. Machine Form & Validation
Corrects historical meter entries for specific machines in the report.

- **PC Component:** `components/CMS/collectionReport/forms/CollectionReportFormMachineDataEntry.tsx`
- **Mobile Component:** `components/CMS/collectionReport/mobile/CollectionReportMobileFormPanel.tsx`
- **Underlying Logic (Hook):** `useEditCollectionModal.ts`
  - **Variables:** `editingEntryId` (tracks which line item is being modified).

## 4. Previous Values & Calculations
Maintains historical baseline meters while allowing updates to the 'Current' reading.

- **Logic:** `lib/utils/movement.ts` -> `calculateMachineMovement`.
- **Reflow:** `lib/helpers/collectionReport/editCollectionModalHelpers.ts` -> `recalculateAmountToCollect`.

## 5. Add / Edit Machine (Retroactive)
Allows adding a missed machine or correcting an existing entry in a finalized report.

- **Logic Hook:** `useEditCollectionModal.ts`
  - **Functions:** `executeAddEntry()`, `confirmUpdateEntry()`.

## 6. Financial Summary Form (PC & Mobile)
Summarizes calculations and allows historical corrections to manual financial fields.

### PC Component
- **File:** `components/CMS/collectionReport/forms/CollectionReportEditFinancials.tsx`
- **Shared UI:** `components/CMS/collectionReport/forms/CollectionReportFormSharedFinancials.tsx`

### Mobile Component
- **File:** `components/CMS/collectionReport/mobile/CollectionReportMobileCollectedListPanel.tsx` (Summary overview)

### Underlying Logic (Hook): `useEditCollectionModal.ts`
- **Manually Edited Fields (User Input):**
  - `taxes`, `advance`, `variance`, `varianceReason`, `collectedAmount`, `balanceCorrection`, `reasonForShortagePayment`.
  - These can be updated to correct accounting errors without changing machine meters.
- **Auto-Calculated Fields (Derived):**
  - **Amount to Collect:** Dynamically reflows whenever a manual field or machine entry is corrected.
  - **Location Balance:** Historical baseline fetched from the point of report creation.
- **Key Functions:**
  - `recalculateAmountToCollect()`: Fired automatically on any financial field change.
  - `confirmUpdateFinancials()`: Persists the macro-financial changes to the database.

### Technical Calculation Logic
The Edit modal uses an `useEffect` hook to recalculate financials whenever the machine list or manual financial fields change.

1. **Total Machine Gross:** Sum of individual machine grosses (calculated via `calculateMachineMovement`).
2. **Partner Profit:** `Math.floor(((Total Gross - Variance - Advance) * Profit Share %) / 100) - Taxes`.
3. **Amount to Collect:** `Total Gross - Variance - Advance - Partner Profit + Location Previous Balance`.

**Code Reference:**
- **Logic Hook:** `lib/hooks/collectionReport/useEditCollectionModal.ts`
  - Recalculation Effect: `useEffect` (Lines 1064-1181)
  - Calculation Logic: Lines 1112-1172
- **Persistence:** `handleUpdateReport` function (Lines 775-928)
