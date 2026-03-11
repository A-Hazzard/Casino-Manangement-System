# Collection Report Detail Page: Component Architecture Guide

This guide breaks down every step involved in viewing a finalized Collection Report, detailing the functionality, components, and underlying logic for both PC and Mobile views.

## 1. Machine Metrics (Individual Collections)
This section displays the detailed collection data for each individual machine included in the report.

- **PC Component:** `components/CMS/collectionReport/details/CollectionReportDetailsCollectionsTable.tsx`
- **Mobile Component:** `components/CMS/collectionReport/details/CollectionReportDetailsMobileMachineList.tsx` (Inferred/Common pattern)
- **Underlying Logic (Hook):** `lib/hooks/collectionReport/useCollectionReportDetailsData.ts`
  - **Key Variables:**
    - `collections`: Array of all individual machine collection documents belonging to this report.
    - `paginatedMetricsData`: The slice of collections currently visible based on search/pagination.
    - `searchTerm`: Search term for filtering machines by name or ID.
  - **Key Functions:**
    - `setSearchTerm(term)`: Updates the search filter.
    - `setMachinePage(page)`: Manages pagination for the machine list.
    - `handleSort(field)`: Sets the sorting field and direction for the table.

## 2. Location Metrics (Aggregated Summary)
This section provides a high-level summary of the financials for the entire location for the report period.

- **PC Component:** `components/CMS/collectionReport/details/CollectionReportDetailsLocationMetricsTab.tsx`
- **Mobile Component:** Usually integrated into the main overview or a summary card in the mobile view.
- **Underlying Logic (Hook):** `lib/hooks/collectionReport/useCollectionReportDetailsData.ts`
  - **Key Variables:**
    - `reportData`: The parent report document containing macro-level financials.
    - `locationTotal`: The calculated total gross for the entire location.
  - **Key Functions:**
    - `calculateLocationTotal(collections)`: Aggregates the gross from all included machines.

## 3. SAS Metrics Compare
This section allows users to compare the recorded meters with SAS system data and identify discrepancies in timing or values.

- **PC Component:** `components/CMS/collectionReport/details/CollectionReportDetailsSasCompareTab.tsx`
- **Mobile Component:** Usually a simplified comparison view or modal.
- **Underlying Logic (Hook):** `lib/hooks/collectionReport/useCollectionReportDetailsData.ts`
  - **Key Variables:**
    - `hasSasTimeIssues`: Boolean flag indicating if any machines have timing discrepancies with the SAS system.
    - `sasTimeIssues`: List of specific issues found.
  - **Key Functions:**
    - `handleFixReportClick()`: Opens the confirmation dialog for auto-correcting report timing issues.
    - `handleFixReportConfirm()`: Executes the API call to resolve identified issues.

## 4. Financial Summary (Final Results)
Explains the final calculation logic shown on the report detail.

- **Underlying Logic (Hook):** `lib/hooks/collectionReport/useCollectionReportDetailsData.ts`
  - **Key Variables:**
    - `reportData.financials`:
      - **Manually Entered (at creation/edit):** `taxes`, `advance`, `variance`, `collectedAmount`, `balanceCorrection`.
      - **Auto-Calculated:** `amountToCollect` (Derived from Total Gross - Variance - Advance - Taxes + Profit Split - Previous Balance).
    - `reportData.previousBalance`: The balance carried over from the previous report.
    - `reportData.summary.totalGross`: The sum of all machine-level gross amounts.

### Technical Calculation Logic (High-Level)
The finalized financials are persisted in the `LocationReport` document. The derivation follows this logic:

1. **Total Gross:** Calculated as `Sum(Meters In - Meters Out)` across all machines.
2. **Partner Profit:** `Floor((Total Gross - Variance - Advance) * Profit Share % / 100) - Taxes`.
3. **Amount to Collect:** `Total Gross - Variance - Advance - Partner Profit + Previous Balance + Balance Correction`.

**Code Reference:**
- **Display Component:** `components/CMS/collectionReport/details/CollectionReportDetailsLocationMetricsTab.tsx` (Lines 21-582)
- **Data Hook:** `lib/hooks/collectionReport/useCollectionReportDetailsData.ts` (Lines 107-173)

## 5. Issue Detection & Fixing
Handles the identification of collection history gaps or meter jumps.

- **Component:** `components/CMS/collectionReport/modals/CollectionReportIssueModal.tsx`
- **Underlying Logic (Hook):** `lib/hooks/collectionReport/useCollectionReportDetailsData.ts`
  - **Key Variables:**
    - `showCollectionIssueModal`: Boolean to control visibility of the issue detail modal.
    - `selectedIssue`: The specific machine/issue being drilled into.
  - **Key Functions:**
    - `handleIssueClick(machineId)`: selects a machine to view its historical issues.
