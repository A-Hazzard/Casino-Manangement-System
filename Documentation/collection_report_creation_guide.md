# Creating a Collection Report: Component Architecture Guide

This guide breaks down every step involved in creating a new Collection Report and directs you to the exact PC, Mobile, and underlying Logic files where the respective functionality lives.

## 1. Location Search and Select
Handles rendering the list of valid locations and saving the selected target location.

- **PC Component:** `components/CMS/collectionReport/forms/CollectionReportNewCollectionLocationMachineSelection.tsx`
- **Mobile Component:** `components/CMS/collectionReport/mobile/CollectionReportMobileEditLocationSelector.tsx`
- **Underlying Logic (Hook):** `lib/hooks/collectionReport/useNewCollectionModal.ts`
  - **Key Variables:**
    - `locations`: Array of available locations.
    - `selectedLocationId`: User's current selection.
  - **Key Functions:**
    - `getLocationIdFromMachine(machineId)`: Determines machine's location.

## 2. Machine List
Displays machines for the selected location, filtered by search term.

- **PC Component:** `components/CMS/collectionReport/forms/CollectionReportNewCollectionLocationMachineSelection.tsx`
- **Mobile Component:** `components/CMS/collectionReport/mobile/CollectionReportMobileMachineList.tsx`
- **Underlying Logic (Hook):** `lib/hooks/collectionReport/useNewCollectionModal.ts`
  - **Key Variables:**
    - `filteredMachines`: Computed list based on `machineSearchTerm`.

## 3. Machine Form & Validation
Captures and validates 'Meters In', 'Meters Out', Notes, and RAM clear status.

- **PC Component:** `components/CMS/collectionReport/forms/CollectionReportFormMachineDataEntry.tsx`
- **Mobile Component:** `components/CMS/collectionReport/mobile/CollectionReportMobileFormPanel.tsx`
- **Underlying Logic (Hook):** `lib/hooks/collectionReport/useNewCollectionModal.ts`
  - **Variables:** `currentMetersIn`, `currentMetersOut`, `isAddMachineEnabled`.
  - **Validation:** `lib/utils/validation.ts` -> `validateCollectionReportPayload`.

## 4. Previous Values & Calculations
Determines previous meters and calculates financial movement.

- **Underlying Logic (Hook):** `lib/hooks/collectionReport/useNewCollectionModal.ts`
  - **Variables:** `prevIn`, `prevOut` (fetched from machine records).
- **Calculation:** `lib/utils/movement.ts` -> `calculateMachineMovement`.

## 5. Add / Edit Machine in List
Methods for drafting individual machine collections into the main report.

- **Underlying Logic (Hook):** `useNewCollectionModal.ts`
  - **Functions:** `handleAddEntry()`, `executeAddEntry()`, `confirmUpdateEntry()`.
- **API Helpers:** `lib/helpers/collectionReport/newCollectionModalHelpers.ts`.

## 6. Financial Summary Form (PC & Mobile)
When finalizing the report, this section summarizes the total gross and allows manual adjustments.

### PC Component
- **File:** `components/CMS/collectionReport/forms/CollectionReportNewCollectionFinancials.tsx`
- **Shared UI:** `components/CMS/collectionReport/forms/CollectionReportFormSharedFinancials.tsx`

### Mobile Component
- **File:** `components/CMS/collectionReport/mobile/CollectionReportMobileFormPanel.tsx` (Single machine flow)
- **File:** `components/CMS/collectionReport/mobile/CollectionReportMobileCollectedListPanel.tsx` (Summary overview)

### Underlying Logic (Hook): `useNewCollectionModal.ts`
- **Manually Entered Fields (User Input):**
  - `taxes`: Location-specific tax deductions.
  - `advance`: Cash advances given to the operator.
  - `variance`: Manual adjustment for physical cash count differences (e.g., spilled coins).
  - `collectedAmount`: The actual physical cash collected from the machine bucket.
  - `balanceCorrection`: Manual override for the location's debt balance.
  - `varianceReason` / `balanceCorrectionReason`: Required explanation for manual overrides.
- **Auto-Calculated Fields (Read-Only on UI):**
  - **Total Gross:** Sum of (Meter In - Meter Out) across all drafted machines.
  - **Amount to Collect:** Calculated as: `(Total Gross - Variance - Advance - Taxes) * ProfitShare % + Previous Balance`.
  - **Previous Balance:** Carried forward from the location's last historical report.
- **Key Functions:**
  - `calculateAmountToCollect()`: Orchestrates the math between manual inputs and aggregated totals.
