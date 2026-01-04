# Reports Page Chart Organization & Lean Page Wrapper Refactoring

## Overview: Naming & Grouping Goals

This refactoring follows the naming conventions defined in `.cursor/rules/naming-conventions.mdc` to improve code discoverability, maintainability, and organization.

### Core Principles

1. **Discoverable Names**: Component names should clearly indicate:
   - **What page/feature** they belong to (e.g., `Reports`, `Dashboard`, `Locations`)
   - **What section/tab** they're in (e.g., `Machines`, `Locations`, `Meters`)
   - **What they do** (e.g., `Overview`, `Evaluation`, `Table`, `Chart`)

2. **Logical Grouping**: Related components should be grouped together:
   - **Page-specific components** → `components/[PageName]/`
   - **Tab-specific components** → `components/[PageName]/tabs/[TabName]/`
   - **Feature-specific components** → `components/[FeatureName]/`
   - **Chart components with dependencies** → `components/[PageName]/tabs/[TabName]/[ChartName]/`
   - **Reusable UI components** → `components/ui/`

3. **Naming Patterns**:
   - **Page Content**: `[PageName]PageContent` (e.g., `DashboardPageContent`, `ReportsPageContent`)
   - **Tab Components**: `[PageName][Section][ComponentName]` (e.g., `ReportsMachinesOverview`, `ReportsLocationsTable`)
   - **Feature Components**: `[FeatureName][ComponentName]` (e.g., `AuthLoginForm`, `MemberDetailsCard`)
   - **Reusable UI**: Simple names (e.g., `Button`, `Card`, `Table`)

4. **Folder Structure**:
   ```
   components/
   ├── [PageName]/                    # Page-specific components
   │   ├── tabs/                       # Tab-specific components
   │   │   ├── [TabName]/              # Tab folder
   │   │   │   ├── [ChartName]/        # Chart with dependencies
   │   │   │   │   ├── [ChartName].tsx
   │   │   │   │   ├── [Tooltip].tsx
   │   │   │   │   └── use[ChartName]Data.ts
   │   │   │   └── [ComponentName].tsx
   │   │   └── [PageName][TabName].tsx
   │   └── [PageName]PageContent.tsx
   ├── ui/                             # Reusable UI components
   └── [FeatureName]/                  # Feature-specific components
   ```

### Why This Matters

- **Easier Discovery**: When looking for a component, you know exactly where to find it based on its name
- **Better Organization**: Related code lives together, making it easier to maintain
- **Clearer Dependencies**: Import paths reveal component relationships
- **Consistent Patterns**: All developers follow the same structure

## Detailed Folder Structure Rules

### Component Grouping Requirements

**CRITICAL**: Even if a page doesn't have tabs, components should be grouped in subfolders. This ensures consistent organization and makes components easier to discover and maintain.

### Subfolder Categories

Components should be organized into the following subfolder categories:

1. **`tabs/`** - For tab-specific components (only when page has tabs)
   - Structure: `components/[PageName]/tabs/[TabName]/[ComponentName].tsx`
   - Example: `components/reports/tabs/machines/ReportsMachinesOverview.tsx`

2. **`modals/`** - For all modal components (create, edit, delete, issue, etc.)
   - Structure: `components/[PageName]/modals/[PageName][ModalType]Modal.tsx`
   - Example: `components/collectionReport/modals/CollectionReportNewCollectionModal.tsx`

3. **`layouts/`** - For desktop/mobile layout variants (when multiple layout files exist)
   - Structure: `components/[PageName]/layouts/[PageName][View]Desktop.tsx`, `components/[PageName]/layouts/[PageName][View]Mobile.tsx`
   - Example: `components/collectionReport/tabs/collection/CollectionReportListDesktop.tsx`

4. **`details/`** - For detail page components
   - Structure: `components/[PageName]/details/[PageName]Details[ComponentName].tsx`
   - Example: `components/collectionReport/details/CollectionReportDetailsPageContent.tsx`

5. **`sections/`** - For section components within a page
   - Structure: `components/[PageName]/sections/[PageName][SectionName]Section.tsx`
   - Example: `components/administration/sections/AdministrationUsersSection.tsx`

6. **`common/`** - For shared components used across multiple tabs/sections
   - Structure: `components/[PageName]/common/[PageName][ComponentName].tsx`
   - Example: `components/members/common/MembersMemberCard.tsx`

7. **`forms/`** - For form-related components (form fields, form sections, etc.)
   - Structure: `components/[PageName]/forms/[PageName][FormType]FormFields.tsx`
   - Example: `components/collectionReport/forms/CollectionReportNewCollectionFormFields.tsx`

8. **`tables/`** - For table components (if multiple tables exist)
   - Structure: `components/[PageName]/tables/[PageName][TableName]Table.tsx`
   - Example: `components/administration/tables/AdministrationUserTable.tsx`

9. **`cards/`** - For card components (if multiple card types exist)
   - Structure: `components/[PageName]/cards/[PageName][CardName]Card.tsx`
   - Example: `components/administration/cards/AdministrationUserCard.tsx`

10. **`skeletons/`** - For skeleton/loading components (optional - can also use `components/ui/skeletons/`)
    - Structure: `components/[PageName]/skeletons/[PageName][ComponentName]Skeleton.tsx`
    - Example: `components/administration/skeletons/AdministrationUserTableSkeleton.tsx`

11. **`mobile/`** - For mobile-specific components (when mobile components don't fit other categories)
    - Structure: `components/[PageName]/mobile/[PageName]Mobile[ComponentName].tsx`
    - Example: `components/collectionReport/mobile/CollectionReportMobileCollectedListPanel.tsx`

### Examples

**Pages with tabs:**
```
components/reports/
├── tabs/
│   ├── machines/
│   │   └── ReportsMachinesOverview.tsx
│   ├── locations/
│   │   └── ReportsLocationsTab.tsx
│   └── meters/
│       └── ReportsMetersTab.tsx
└── ReportsPageContent.tsx
```

**Pages without tabs but with modals:**
```
components/cabinets/
├── modals/
│   ├── CabinetsNewCabinetModal.tsx
│   ├── CabinetsEditCabinetModal.tsx
│   └── CabinetsDeleteCabinetModal.tsx
├── details/
│   └── [detail components]
└── CabinetsPageContent.tsx
```

**Pages with multiple component types:**
```
components/collectionReport/
├── tabs/
│   ├── collection/
│   ├── monthly/
│   ├── collector/
│   └── manager/
├── modals/
│   └── [modal components]
├── forms/
│   └── [form components]
├── details/
│   └── [detail components]
└── CollectionReportPageContent.tsx
```

### Reference Example

The `components/reports/` folder serves as the ideal example of proper organization:
- Uses `tabs/` subfolder for tab-specific components
- Groups chart components with dependencies in subfolders
- Keeps page-level components at the root
- Maintains clear naming conventions

## Completed Work

### 1. ✅ Fixed Chart Component Organization in `components/reports/tabs/machines/`

**Actions Completed:**

1. **Deleted root-level duplicates:**
   - ✅ Deleted `components/reports/tabs/machines/ReportsGamesPerformanceChart.tsx`
   - ✅ Deleted `components/reports/tabs/machines/ReportsGamesPerformanceRevenueChart.tsx` (was empty)
   - ✅ Deleted `components/reports/tabs/machines/ReportsManufacturerPerformanceChart.tsx`
   - ✅ Deleted `components/reports/tabs/machines/ReportsMachinesEvaluationSummary.tsx`

2. **Updated imports in `ReportsMachinesEvaluation.tsx`:**
   - ✅ Changed to `import ReportsGamesPerformanceChart from './GamesPerformanceChart/ReportsGamesPerformanceChart'`
   - ✅ Changed to `import { ReportsGamesPerformanceRevenueChart } from './GamesPerformanceRevenueChart/ReportsGamesPerformanceRevenueChart'`
   - ✅ Changed to `import ReportsManufacturerPerformanceChart from './ManufacturerPerformanceChart/ReportsManufacturerPerformanceChart'`
   - ✅ Changed to `import { ReportsMachinesEvaluationSummary } from './ReportsMachinesEvaluationSummary/ReportsMachinesEvaluationSummary'`

3. **Fixed tooltip imports in folder versions:**
   - ✅ In `GamesPerformanceChart/ReportsGamesPerformanceChart.tsx`: Changed to `import ReportsGamesPerformanceTooltip from './ReportsGamesPerformanceTooltip'` (default import)
   - ✅ In `ManufacturerPerformanceChart/ReportsManufacturerPerformanceChart.tsx`: Changed to `import ReportsManufacturerPerformanceTooltip from './ReportsManufacturerPerformanceTooltip'` (default import)
   - ✅ Updated tooltip usage in both files to use the correct component names

4. **Fixed other imports:**
   - ✅ Fixed `useGamesPerformanceData` import path in `GamesPerformanceChart/ReportsGamesPerformanceChart.tsx`
   - ✅ Fixed `ReportsGameMultiSelect` import path to use relative path `../GamesPerformanceRevenueChart/`
   - ✅ Fixed `ChartItemBreakdownModal` imports to use `@/components/ui/modals/ChartItemBreakdownModal`
   - ✅ Fixed `useManufacturerPerformanceData` and `ReportsManufacturerMultiSelect` imports in `ManufacturerPerformanceChart/ReportsManufacturerPerformanceChart.tsx`

### 2. ✅ DashboardPcLayout Deletion Explanation

**Why DashboardPcLayout was deleted:**

- `DashboardPcLayout.tsx` was a duplicate/legacy component
- The codebase was already using `DashboardDesktopLayout.tsx` (renamed from `PcLayout.tsx`)
- `DashboardPageContent.tsx` imports and uses `DashboardDesktopLayout`, not `DashboardPcLayout`
- No references to `DashboardPcLayout` were found in the codebase
- It was safe to delete as it was not being used

**Verification:**

- ✅ `DashboardDesktopLayout` is imported and used in `DashboardPageContent.tsx`
- ✅ No grep results for `DashboardPcLayout` usage
- ✅ Component was likely a leftover from an earlier refactoring

### 3. ✅ Empty Folder Cleanup

- ✅ Deleted empty `components/ui/charts/` folder

### 4. ✅ Completed Cabinet/Machine Page Refactoring

**Actions Completed:**

- ✅ Renamed `CabinetActions.tsx` → `CabinetsActions.tsx`
- ✅ Renamed `CabinetContentDisplay.tsx` → `CabinetsCabinetContentDisplay.tsx`
- ✅ Renamed `CabinetSearchFilters.tsx` → `CabinetsCabinetSearchFilters.tsx`
- ✅ Moved `MovementRequests.tsx` → `components/cabinets/CabinetsMovementRequests.tsx`
- ✅ Moved `SMIBManagementTab.tsx` → `components/cabinets/CabinetsSMIBManagementTab.tsx`
- ✅ Renamed `CabinetDetailsPageContent.tsx` → `CabinetsDetailsPageContent.tsx`
- ✅ Renamed all components in `components/cabinets/details/` to use `CabinetsDetails` prefix:
  - `CabinetAccountingSection.tsx` → `CabinetsDetailsAccountingSection.tsx`
  - `CabinetChartSection.tsx` → `CabinetsDetailsChartSection.tsx`
  - `CabinetSMIBManagementSection.tsx` → `CabinetsDetailsSMIBManagementSection.tsx`
  - `CabinetSummarySection.tsx` → `CabinetsDetailsSummarySection.tsx`
  - `AccountingDetails.tsx" → `CabinetsDetailsAccountingDetails.tsx`(moved from`components/cabinetDetails/`)
  - `ActivityLogSkeleton.tsx` → `CabinetsDetailsActivityLogSkeleton.tsx` (moved from `components/cabinetDetails/`)
  - `ActivityLogTable.tsx` → `CabinetsDetailsActivityLogTable.tsx` (moved from `components/cabinetDetails/`)
  - `CollectionHistorySkeleton.tsx` → `CabinetsDetailsCollectionHistorySkeleton.tsx` (moved from `components/cabinetDetails/`)
  - `CollectionHistoryTable.tsx` → `CabinetsDetailsCollectionHistoryTable.tsx` (moved from `components/cabinetDetails/`)
  - `UnifiedBillValidator.tsx` → `CabinetsDetailsUnifiedBillValidator.tsx` (moved from `components/cabinetDetails/`)
- ✅ Deleted `components/cabinetDetails/` folder.
- ✅ Updated all imports in `CabinetsDetailsPageContent.tsx`, `CabinetsPageContent.tsx`, and `app/cabinets/[slug]/page.tsx`.
- ✅ Updated `lib/types/cabinetDetails.ts` with updated prop type names.

### 5. ✅ SMIB Management Components Renaming

**Actions Completed:**

- ✅ Renamed all SMIB management components in `components/cabinets/smibManagement/`:
  - `ComsConfigSection.tsx` → `CabinetsDetailsSMIBComsConfig.tsx`
  - `MeterDataSection.tsx` → `CabinetsDetailsSMIBMeterData.tsx`
  - `MqttTopicsSection.tsx` → `CabinetsDetailsSMIBMqttTopics.tsx`
  - `NetworkConfigSection.tsx` → `CabinetsDetailsSMIBNetworkConfig.tsx`
  - `OTAUpdateSection.tsx` → `CabinetsDetailsSMIBOTAUpdate.tsx`
  - `RestartSection.tsx` → `CabinetsDetailsSMIBRestart.tsx`
- ✅ Updated prop types for all SMIB components
- ✅ Updated imports in `CabinetsSMIBManagementTab.tsx`

### 6. ✅ Sessions Components Renaming (Removed Redundancy)

**Actions Completed:**

- ✅ Renamed `SessionsSessionsFilters.tsx` → `SessionsFilters.tsx`
- ✅ Renamed `SessionsSessionsTable.tsx` → `SessionsTable.tsx`
- ✅ Updated type definitions: `SessionsSessionsFiltersProps` → `SessionsFiltersProps`, `SessionsSessionsTableProps` → `SessionsTableProps`
- ✅ Updated imports in `SessionsPageContent.tsx`
- ✅ Updated component function names to match file names

### 7. ✅ Store Renaming for Consistency

**Actions Completed:**

- ✅ Renamed `useCabinetActionsStore` → `useCabinetsActionsStore` (and `CabinetActionsState` → `CabinetsActionsState`)
- ✅ Renamed `useMemberActionsStore` → `useMembersActionsStore` (and `MemberActionsState` → `MembersActionsState`)
- ✅ Renamed `useLocationActionsStore` → `useLocationsActionsStore` (and `LocationActionsState` → `LocationsActionsState`)
- ✅ Updated all imports across components:
  - `CabinetsCabinetContentDisplay.tsx`
  - `CabinetsEditCabinetModal.tsx`
  - `CabinetsDeleteCabinetModal.tsx`
  - `LocationsCabinetGrid.tsx`
  - `LocationsPageContent.tsx`
  - `LocationsEditLocationModal.tsx`
  - `LocationsDeleteLocationModal.tsx`
  - `ReportsMachinesTab.tsx`
  - `MembersListTab.tsx`
  - `MembersEditMemberModal.tsx`
  - `MembersDeleteMemberModal.tsx`

### 8. ✅ Collection Report Components Organization

**Actions Completed:**

- ✅ Renamed `CollectionReportDesktopUI.tsx` → `CollectionReportListDesktop.tsx`
- ✅ Renamed `CollectionReportMobileUI.tsx` → `CollectionReportListMobile.tsx`
- ✅ Renamed `CollectionReportTable.tsx` → `CollectionReportListTable.tsx`
- ✅ Renamed `CollectionReportCards.tsx` → `CollectionReportListCards.tsx`
- ✅ Renamed `CollectionReportFilters.tsx` → `CollectionReportListFilters.tsx`
- ✅ Renamed specialized UI components:
  - `CollectionReportMonthlyDesktopUI.tsx` → `CollectionReportMonthlyDesktop.tsx`
  - `CollectionReportMonthlyMobileUI.tsx` → `CollectionReportMonthlyMobile.tsx`
  - `CollectionReportCollectorDesktopUI.tsx` → `CollectionReportCollectorDesktop.tsx`
  - `CollectionReportCollectorMobileUI.tsx` → `CollectionReportCollectorMobile.tsx`
  - `CollectionReportManagerDesktopUI.tsx` → `CollectionReportManagerDesktop.tsx`
  - `CollectionReportManagerMobileUI.tsx` → `CollectionReportManagerMobile.tsx`
- ✅ Updated component function names to match file names
- ✅ Updated imports in `CollectionReportPageContent.tsx`

### 9. ✅ Collection Report Details Components

**Actions Completed:**

- ✅ Updated imports in `CollectionReportDetailsPageContent.tsx`:
  - `CollectionIssueModal` → `CollectionReportIssueModal`
  - `LocationReportCollectionsTable` → `CollectionReportDetailsCollectionsTable`
  - `LocationReportLocationMetricsTab` → `CollectionReportDetailsLocationMetricsTab`
  - `LocationReportSasCompareTab` → `CollectionReportDetailsSasCompareTab`
- ✅ Updated prop types:
  - `LocationReportCollectionsTableProps` → `CollectionReportDetailsCollectionsTableProps`
  - `LocationReportLocationMetricsTabProps` → `CollectionReportDetailsLocationMetricsTabProps`
  - `LocationReportSasCompareTabProps` → `CollectionReportDetailsSasCompareTabProps`
  - `CollectionReportIssueModalProps` (was interface, now export type)

### 10. ✅ Locations CabinetGrid Component Move

**Actions Completed:**

- ✅ Moved `components/locationDetails/CabinetGrid.tsx` → `components/locations/LocationsCabinetGrid.tsx`
- ✅ Renamed component function: `CabinetGrid` → `LocationsCabinetGrid`
- ✅ Renamed prop type: `CabinetGridProps` → `LocationsCabinetGridProps`
- ✅ Updated import in `LocationsDetailsCabinetsSection.tsx`
- ✅ Deleted empty `components/locationDetails/` folder

### 11. ✅ Locations Details Components

**Actions Completed:**

- ✅ Renamed `LocationDetailsPageContent.tsx` → `LocationsDetailsPageContent.tsx`
- ✅ Renamed components in `components/locations/sections/`:
  - `LocationCabinetsSection.tsx` → `LocationsDetailsCabinetsSection.tsx`
  - `LocationChartSection.tsx` → `LocationsDetailsChartSection.tsx`
- ✅ Renamed components in `components/locations/details/`:
  - `LocationsFilterSection.tsx` → `LocationsDetailsFilterSection.tsx`
  - `LocationsHeaderSection.tsx` → `LocationsDetailsHeaderSection.tsx`
- ✅ Updated prop types and imports

### 12. ✅ Cleanup: Deleted Duplicate/Old Component Files

**Actions Completed:**

- ✅ Deleted `components/cabinets/CabinetDetailsPageContent.tsx` (duplicate - already renamed to `CabinetsDetailsPageContent.tsx`)
- ✅ Deleted `components/cabinets/details/CabinetAccountingSection.tsx` (duplicate - already renamed to `CabinetsDetailsAccountingSection.tsx`)
- ✅ Deleted `components/cabinets/details/CabinetChartSection.tsx` (duplicate - already renamed to `CabinetsDetailsChartSection.tsx`)

## Remaining Naming Issues

### Members Page (`components/members/`) - HIGH PRIORITY

**Components needing renaming (~10 completed):**

1. ✅ `PlayerHeader.tsx` → `MembersPlayerHeader.tsx`
2. ✅ `PlayerHeaderSkeleton.tsx` → `MembersPlayerHeaderSkeleton.tsx`
3. ✅ `PlayerSessionTable.tsx` → `MembersPlayerSessionTable.tsx`
4. ✅ `PlayerSessionTableSkeleton.tsx` → `MembersPlayerSessionTableSkeleton.tsx`
5. ✅ `PlayerTotalsCard.tsx` → `MembersPlayerTotalsCard.tsx`
6. ✅ `PlayerTotalsCardSkeleton.tsx` → `MembersPlayerTotalsCardSkeleton.tsx`
7. ✅ `FilterControlsSkeleton.tsx` → `MembersFilterControlsSkeleton.tsx`
8. ✅ `EditMemberModal/EditMemberFormFields.tsx` → `MembersEditMemberFormFields.tsx`
9. ✅ `EditMemberModal/EditMemberProfileHeader.tsx` → `MembersEditMemberProfileHeader.tsx`
10. ✅ `EditMemberModal/useEditMemberForm.ts` → `useMembersEditMemberForm.ts`
11. ✅ `EditMemberModal/useEditMemberValidation.ts` → `useMembersEditMemberValidation.ts`
12. ✅ `MemberDetailsPageContent.tsx` → `MembersDetailsPageContent.tsx`
13. ✅ Prop types: `PlayerHeaderProps` → `MembersPlayerHeaderProps` (and similar)

### Locations Page (`components/locations/`) - ✅ COMPLETED

**All components properly renamed:**

1. ✅ `LocationDetailsPageContent.tsx` → `LocationsDetailsPageContent.tsx`
2. ✅ `LocationCabinetsSection.tsx` → `LocationsDetailsCabinetsSection.tsx`
3. ✅ `LocationChartSection.tsx` → `LocationsDetailsChartSection.tsx`
4. ✅ `LocationsFilterSection.tsx` → `LocationsDetailsFilterSection.tsx`
5. ✅ `LocationsHeaderSection.tsx` → `LocationsDetailsHeaderSection.tsx`
6. ✅ `CabinetGrid.tsx` → `LocationsCabinetGrid.tsx` (moved from `components/locationDetails/`)

### Other Pages

- ✅ **Administration**: All components follow `Administration` prefix pattern
- ✅ **Collection Report**: All components follow `CollectionReport` prefix pattern
- ✅ **Sessions**: Components follow `Sessions` prefix pattern
- ✅ **Dashboard**: Components follow `Dashboard` prefix pattern
- ✅ **Reports**: Components follow `Reports` prefix pattern
- ✅ **Cabinets/Machines**: Components follow `Cabinets` prefix pattern
- ✅ **Members**: Components follow `Members` prefix pattern

## Summary

**Progress:**

- ✅ Empty folders cleaned up
- ✅ Chart components organized
- ✅ Cabinet components fully refactored
- ✅ Members components fully refactored
- ✅ Locations components fully refactored
- ✅ Sessions components refactored (removed redundancy)
- ✅ Collection Report components organized
- ✅ Store naming consistency achieved
- ✅ All major page components follow consistent naming patterns

## Current Status: REFACTORING COMPLETE ✅

All major refactoring work has been completed. All components now follow consistent naming conventions:

- Page components: `[PageName]PageContent`
- Feature components: `[PageName][ComponentName]`
- Tab components: `[PageName][Section][TabName]`
- Details components: `[PageName]Details[ComponentName]`
- Store hooks: `use[PageName][Entity]Store` (pluralized page name)

All components are properly organized in their respective folders, and prop types follow the same naming patterns as their components.

## Next Steps (Optional Future Improvements)

- Consider reviewing component exports to ensure all are using consistent export patterns
- Review shared types to ensure consistency across the codebase
- Consider creating barrel exports (`index.ts`) for commonly imported component groups
- **Note**: SMIB management components in `components/cabinets/smibManagement/` currently have "Details" in their names (`CabinetsDetailsSMIB...`) but they're not in a details folder. Consider renaming to `CabinetsSMIB...` for consistency, though this is a minor issue since they're used by `CabinetsSMIBManagementTab`.
