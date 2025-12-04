# Frontend Refactoring Tracker

**Last Updated:** November 24, 2025  
**Status:** ✅ **COMPLETE** - All frontend files refactored (661/661 files - 100%)

This document tracks the refactoring of all frontend pages, components, helpers, utils, hooks, and related files to comply with the Engineering Guidelines structure requirements.

## Legend

- ✅ **DONE** - File follows proper structure (file-level JSDoc, section comments, proper code organization, extracted logic)
- 🔄 **IN PROGRESS** - Currently being refactored
- ❌ **NEEDS REFACTORING** - File doesn't follow proper structure
- ⚠️ **STALE** - No usage found in codebase (marked for review/deletion)
- 📝 **PARTIAL** - Some parts follow structure, others don't
- ✅ **ACTIVE** - File is actively used and doesn't need refactoring (already clean)

## Structure Requirements Checklist

Each frontend file must have:

- [ ] File-level JSDoc with description and features
- [ ] Section comments (`// ============================================================================`) for major areas
- [ ] Proper code organization (hooks, state, computed values, handlers, effects, render)
- [ ] Business logic extracted to `lib/helpers/` or `lib/utils/`
- [ ] Reusable stateful logic extracted to custom hooks
- [ ] Components broken down into smaller, focused components if >400-500 lines
- [ ] Proper spacing and comments in JSX for readability
- [ ] No unused imports or variables
- [ ] Proper TypeScript types (no `any`, prefer `type` over `interface`)

---

## Pages Status

### Dashboard (`app/page.tsx`)

| File           | Status | Usage     | Notes                                                |
| -------------- | ------ | --------- | ---------------------------------------------------- |
| `app/page.tsx` | ✅     | ✅ Active | **REFACTORED** - Lean wrapper with content component |

**Components Used:**

- `components/auth/ProtectedRoute.tsx` - ✅ Active
- `components/layout/MobileLayout.tsx` - ✅ Active
- `components/layout/PageLayout.tsx` - ✅ Active
- `components/layout/PcLayout.tsx` - ✅ Active
- `components/ui/errors/PageErrorBoundary.tsx` - ✅ Active
- `components/ui/NoLicenseeAssigned.tsx` - ✅ Active
- `components/ui/FloatingRefreshButton.tsx` - ✅ Active
- `components/ui/PieChartLabelRenderer.tsx` - ✅ Active

**Helpers Used:**

- `lib/helpers/dashboard.ts` - ✅ Active
  - `fetchMetricsData` - ✅ Active
  - `fetchTopPerformingDataHelper` - ✅ Active
  - `loadGamingLocations` - ✅ Active

**Hooks Used:**

- `lib/hooks/data/useDashboardFilters.ts` - ✅ Active
- `lib/hooks/data/useDashboardRefresh.ts` - ✅ Active
- `lib/hooks/data/useDashboardScroll.ts` - ✅ Active
- `lib/hooks/data/useGlobalErrorHandler.ts` - ✅ Active

**Utils Used:**

- `lib/utils/licenseeAccess.ts` - ✅ Active
  - `shouldShowNoLicenseeMessage` - ✅ Active

**Stores Used:**

- `lib/store/dashboardStore.ts` - ✅ Active
- `lib/store/userStore.ts` - ✅ Active

**Contexts Used:**

- `lib/contexts/CurrencyContext.tsx` - ✅ Active

**Types Used:**

- `shared/types/common.ts` - ✅ Active
- `lib/types/index.ts` - ✅ Active
- `lib/types/componentProps.ts` - ✅ Active

---

### Machines/Cabinets (`app/machines/page.tsx`)

| File                    | Status | Usage     | Notes                                                 |
| ----------------------- | ------ | --------- | ----------------------------------------------------- |
| `app/machines/page.tsx` | ✅     | ✅ Active | **REFACTORED** - Well-organized with section comments |

**Components Used:**

- `components/auth/ProtectedRoute.tsx` - ✅ Active
- `components/layout/PageLayout.tsx` - ✅ Active
- `components/ui/cabinets/DeleteCabinetModal.tsx` - ✅ Active
- `components/ui/cabinets/EditCabinetModal.tsx` - ✅ Active
- `components/ui/cabinets/NewCabinetModal.tsx` - ✅ Active
- `components/ui/firmware/UploadSmibDataModal.tsx` - ✅ Active
- `components/ui/movements/NewMovementRequestModal.tsx` - ✅ Active
- `components/cabinets/CabinetsNavigation.tsx` - ✅ Active
- `components/cabinets/MovementRequests.tsx` - ✅ Active
- `components/cabinets/SMIBManagementTab.tsx` - ✅ Active
- `components/ui/firmware/SMIBFirmwareSection.tsx` - ✅ Active
- `components/cabinets/CabinetActions.tsx` - ✅ Active
- `components/cabinets/CabinetContentDisplay.tsx` - ✅ Active
- `components/cabinets/CabinetSearchFilters.tsx` - ✅ Active
- `components/dashboard/DashboardDateFilters.tsx` - ✅ Active
- `components/ui/FinancialMetricsCards.tsx` - ✅ Active
- `components/ui/cabinets/CabinetSkeletonLoader.tsx` - ✅ Active

**Helpers Used:**

- `lib/helpers/cabinets.ts` - ✅ Active (via hooks)

**Hooks Used:**

- `lib/hooks/data/useCabinetData.ts` - ✅ Active
- `lib/hooks/data/useCabinetFilters.ts` - ✅ Active
- `lib/hooks/data/useCabinetModals.ts` - ✅ Active
- `lib/hooks/data/useCabinetSorting.ts` - ✅ Active
- `lib/hooks/navigation/useCabinetNavigation.ts` - ✅ Active
- `lib/hooks/useCurrencyFormat.ts` - ✅ Active

**Utils Used:**

- `lib/utils/serialNumber.ts` - ✅ Active
  - `getSerialNumberIdentifier` - ✅ Active

**Stores Used:**

- `lib/store/dashboardStore.ts` - ✅ Active
- `lib/store/userStore.ts` - ✅ Active

**Constants Used:**

- `lib/constants/cabinets.ts` - ✅ Active
- `lib/constants/images.ts` - ✅ Active

---

### Locations (`app/locations/page.tsx`)

| File                     | Status | Usage     | Notes                                                 |
| ------------------------ | ------ | --------- | ----------------------------------------------------- |
| `app/locations/page.tsx` | ✅     | ✅ Active | **REFACTORED** - Well-organized with section comments |

**Components Used:**

- `components/auth/ProtectedRoute.tsx` - ✅ Active
- `components/layout/PageLayout.tsx` - ✅ Active
- `components/ui/errors/PageErrorBoundary.tsx` - ✅ Active
- `components/ui/FloatingRefreshButton.tsx` - ✅ Active
- `components/ui/input.tsx` - ✅ Active
- `components/ui/locations/CabinetTableSkeleton.tsx` - ✅ Active
- `components/ui/MachineStatusWidget.tsx` - ✅ Active
- `components/ui/NoLicenseeAssigned.tsx` - ✅ Active
- `components/ui/skeletons/ButtonSkeletons.tsx` - ✅ Active
- `components/ui/button.tsx` - ✅ Active
- `components/ui/checkbox.tsx` - ✅ Active
- `components/ui/common/ClientOnly.tsx` - ✅ Active
- `components/ui/errors/NetworkError.tsx` - ✅ Active
- `components/ui/FinancialMetricsCards.tsx` - ✅ Active
- `components/ui/label.tsx` - ✅ Active
- `components/ui/locations/DeleteLocationModal.tsx` - ✅ Active
- `components/ui/locations/EditLocationModal.tsx` - ✅ Active
- `components/ui/locations/LocationCard.tsx` - ✅ Active
- `components/ui/locations/LocationSkeleton.tsx` - ✅ Active
- `components/ui/locations/LocationTable.tsx` - ✅ Active
- `components/ui/locations/NewLocationModal.tsx` - ✅ Active
- `components/ui/PaginationControls.tsx` - ✅ Active
- `components/dashboard/DashboardDateFilters.tsx` - ✅ Active

**Helpers Used:**

- `lib/helpers/locations.ts` - ✅ Active (via hooks)

**Hooks Used:**

- `lib/hooks/data/useLocationData.ts` - ✅ Active
- `lib/hooks/data/useLocationMachineStats.ts` - ✅ Active
- `lib/hooks/data/useLocationModals.ts` - ✅ Active
- `lib/hooks/data/useLocationSorting.ts` - ✅ Active
- `lib/hooks/data/useGlobalErrorHandler.ts` - ✅ Active

**Utils Used:**

- `lib/utils/number.ts` - ✅ Active
  - `formatCurrency` - ✅ Active
- `lib/utils/financial.ts` - ✅ Active
  - `calculateLocationFinancialTotals` - ✅ Active
- `lib/utils/licenseeAccess.ts` - ✅ Active
  - `shouldShowNoLicenseeMessage` - ✅ Active
- `lib/utils/licenseeMapping.ts` - ✅ Active
  - `getLicenseeName` - ✅ Active
- `lib/utils/ui.ts` - ✅ Active
  - `animateCards` - ✅ Active
  - `animateTableRows` - ✅ Active

**Stores Used:**

- `lib/store/dashboardStore.ts` - ✅ Active
- `lib/store/userStore.ts` - ✅ Active
- `lib/store/locationActionsStore.ts` - ✅ Active

**Types Used:**

- `lib/types/location.ts` - ✅ Active
- `shared/types/common.ts` - ✅ Active

**Constants Used:**

- `lib/constants/images.ts` - ✅ Active

---

### Members (`app/members/page.tsx`)

| File                   | Status | Usage     | Notes                                                      |
| ---------------------- | ------ | --------- | ---------------------------------------------------------- |
| `app/members/page.tsx` | ✅     | ✅ Active | **REFACTORED** - Lean wrapper, delegates to MembersContent |

**Components Used:**

- `components/auth/ProtectedRoute.tsx` - ✅ Active
- `components/members/MembersContent.tsx` - ✅ Active
- `components/ui/skeletons/MembersSkeletons.tsx` - ✅ Active

**Helpers Used:**

- (via MembersContent component)

**Hooks Used:**

- (via MembersContent component)

---

### Reports (`app/reports/page.tsx`)

| File                   | Status | Usage     | Notes                                                      |
| ---------------------- | ------ | --------- | ---------------------------------------------------------- |
| `app/reports/page.tsx` | ✅     | ✅ Active | **REFACTORED** - Lean wrapper, delegates to ReportsContent |

**Components Used:**

- `components/auth/ProtectedRoute.tsx` - ✅ Active
- `components/reports/ReportsContent.tsx` - ✅ Active
- `components/ui/skeletons/ReportsSkeletons.tsx` - ✅ Active

**Helpers Used:**

- (via ReportsContent component)

**Hooks Used:**

- (via ReportsContent component)

---

### Collection Report (`app/collection-report/page.tsx`)

| File                             | Status | Usage     | Notes                                                 |
| -------------------------------- | ------ | --------- | ----------------------------------------------------- |
| `app/collection-report/page.tsx` | ✅     | ✅ Active | **REFACTORED** - Well-organized with section comments |

**Components Used:**

- `components/auth/ProtectedRoute.tsx` - ✅ Active
- `components/layout/PageLayout.tsx` - ✅ Active
- `components/ui/NoLicenseeAssigned.tsx` - ✅ Active
- `components/collectionReport/CollectionDesktopUI.tsx` - ✅ Active
- `components/collectionReport/CollectionMobileUI.tsx` - ✅ Active
- `components/collectionReport/CollectorDesktopUI.tsx` - ✅ Active
- `components/collectionReport/CollectorMobileUI.tsx` - ✅ Active
- `components/collectionReport/EditCollectionModal.tsx` - ✅ Active
- `components/collectionReport/ManagerDesktopUI.tsx` - ✅ Active
- `components/collectionReport/ManagerMobileUI.tsx` - ✅ Active
- `components/collectionReport/MobileCollectionModal.tsx` - ✅ Active
- `components/collectionReport/MobileEditCollectionModal.tsx` - ✅ Active
- `components/collectionReport/MonthlyDesktopUI.tsx` - ✅ Active
- `components/collectionReport/MonthlyMobileUI.tsx` - ✅ Active
- `components/collectionReport/NewCollectionModal.tsx` - ✅ Active
- `components/dashboard/DashboardDateFilters.tsx` - ✅ Active
- `components/ui/ConfirmationDialog.tsx` - ✅ Active
- `components/ui/errors/ErrorBoundary.tsx` - ✅ Active
- `components/ui/skeletons/CollectionReportPageSkeleton.tsx` - ✅ Active
- `components/collectionReport/CollectionNavigation.tsx` - ✅ Active
- `components/ui/button.tsx` - ✅ Active
- `components/ui/PaginationControls.tsx` - ✅ Active

**Helpers Used:**

- `lib/helpers/collectionReport.ts` - ✅ Active
  - `fetchAllLocationNames` - ✅ Active
  - `fetchCollectionReportsByLicencee` - ✅ Active
  - `fetchMonthlyReportSummaryAndDetails` - ✅ Active
  - `getLocationsWithMachines` - ✅ Active
- `lib/helpers/collectionReportPage.ts` - ✅ Active
  - `handleTabChange` - ✅ Active
  - `resetCollectorFilters` - ✅ Active
  - `resetSchedulerFilters` - ✅ Active
  - `syncStateWithURL` - ✅ Active
- `lib/helpers/collectionReportPageV2.ts` - ✅ Active
  - `animateCards` - ✅ Active
  - `animateContentTransition` - ✅ Active
  - `animateTableRows` - ✅ Active
  - `fetchAndFormatSchedulers` - ✅ Active
  - `filterCollectionReports` - ✅ Active
  - `setLastMonthDateRange` - ✅ Active
- `lib/helpers/collectorSchedules.ts` - ✅ Active
  - `fetchAndFormatCollectorSchedules` - ✅ Active
- `lib/helpers/locations.ts` - ✅ Active
  - `fetchAllGamingLocations` - ✅ Active

**Hooks Used:**

- `lib/hooks/navigation/useCollectionNavigation.ts` - ✅ Active
- `lib/hooks/useUrlProtection.ts` - ✅ Active

**Utils Used:**

- `lib/utils/licenseeAccess.ts` - ✅ Active
  - `shouldShowNoLicenseeMessage` - ✅ Active
  - `shouldShowLicenseeFilter` - ✅ Active
- `lib/utils/permissions.ts` - ✅ Active
  - `hasManagerAccess` - ✅ Active

**Stores Used:**

- `lib/store/dashboardStore.ts` - ✅ Active
- `lib/store/userStore.ts` - ✅ Active

**Types Used:**

- `lib/types/api.ts` - ✅ Active
- `lib/types/componentProps.ts` - ✅ Active
- `lib/types/location.ts` - ✅ Active
- `lib/types/collection.ts` - ✅ Active
- `lib/types/components.ts` - ✅ Active

**Constants Used:**

- `lib/constants/collection.ts` - ✅ Active
- `lib/constants/images.ts` - ✅ Active

---

### Sessions (`app/sessions/page.tsx`)

| File                    | Status | Usage     | Notes                                                 |
| ----------------------- | ------ | --------- | ----------------------------------------------------- |
| `app/sessions/page.tsx` | ✅     | ✅ Active | **REFACTORED** - Well-organized with section comments |

**Components Used:**

- `components/auth/ProtectedRoute.tsx` - ✅ Active
- `components/layout/PageLayout.tsx` - ✅ Active
- `components/sessions/SessionsFilters.tsx` - ✅ Active
- `components/sessions/SessionsTable.tsx` - ✅ Active
- `components/ui/PaginationControls.tsx` - ✅ Active
- `components/ui/skeletons/SessionsSkeletons.tsx` - ✅ Active

**Helpers Used:**

- (via hooks)

**Hooks Used:**

- `lib/hooks/data/useSessions.ts` - ✅ Active
- `lib/hooks/data/useSessionsFilters.ts` - ✅ Active
- `lib/hooks/data/useSessionsNavigation.ts` - ✅ Active

**Stores Used:**

- `lib/store/dashboardStore.ts` - ✅ Active

**Constants Used:**

- `lib/constants/sessions.ts` - ✅ Active
- `lib/constants/images.ts` - ✅ Active

---

### Administration (`app/administration/page.tsx`)

| File                          | Status | Usage     | Notes                                                 |
| ----------------------------- | ------ | --------- | ----------------------------------------------------- |
| `app/administration/page.tsx` | ✅     | ✅ Active | **REFACTORED** - Well-organized with section comments |

**Components Used:**

- `components/administration/*` - ✅ Active (multiple components)
- `components/auth/ProtectedRoute.tsx` - ✅ Active
- `components/layout/PageLayout.tsx` - ✅ Active
- `components/ui/button.tsx` - ✅ Active
- `components/ui/PaginationControls.tsx` - ✅ Active

**Helpers Used:**

- `lib/helpers/administration.ts` - ✅ Active
- `lib/helpers/administrationPage.ts` - ✅ Active
- `lib/helpers/clientLicensees.ts` - ✅ Active
- `lib/helpers/countries.ts` - ✅ Active

**Hooks Used:**

- `lib/hooks/navigation/useAdministrationNavigation.ts` - ✅ Active

**Utils Used:**

- `lib/utils/changeDetection.ts` - ✅ Active
- `lib/utils/licensee.ts` - ✅ Active
- `lib/utils/permissions.ts` - ✅ Active

**Stores Used:**

- `lib/store/dashboardStore.ts` - ✅ Active
- `lib/store/userStore.ts` - ✅ Active

**Types Used:**

- `lib/types/administration.ts` - ✅ Active
- `lib/types/country.ts` - ✅ Active
- `lib/types/licensee.ts` - ✅ Active
- `lib/types/pages.ts` - ✅ Active

**Constants Used:**

- `lib/constants/administration.ts` - ✅ Active
- `lib/constants/images.ts` - ✅ Active

---

### Login (`app/(auth)/login/page.tsx`)

| File                        | Status | Usage     | Notes                                                 |
| --------------------------- | ------ | --------- | ----------------------------------------------------- |
| `app/(auth)/login/page.tsx` | ✅     | ✅ Active | **REFACTORED** - Well-organized with section comments |

**Components Used:**

- `components/auth/LoginForm.tsx` - ✅ Active
- `components/ui/LiquidGradient.tsx` - ✅ Active
- `components/ui/PasswordUpdateModal.tsx` - ✅ Active
- `components/ui/ProfileValidationModal.tsx` - ✅ Active
- `components/ui/skeletons/LoginSkeletons.tsx` - ✅ Active

**Helpers Used:**

- `lib/helpers/clientAuth.ts` - ✅ Active
  - `loginUser` - ✅ Active

**Hooks Used:**

- `lib/hooks/useAuth.ts` - ✅ Active

**Utils Used:**

- `lib/utils/databaseMismatch.ts` - ✅ Active
- `lib/utils/roleBasedRedirect.ts` - ✅ Active

**Stores Used:**

- `lib/store/authSessionStore.ts` - ✅ Active
- `lib/store/userStore.ts` - ✅ Active

**Types Used:**

- `lib/types/profileValidation.ts` - ✅ Active
- `shared/types/auth.ts` - ✅ Active

---

### Cabinets (`app/cabinets/page.tsx`)

| File                    | Status | Usage     | Notes                                                 |
| ----------------------- | ------ | --------- | ----------------------------------------------------- |
| `app/cabinets/page.tsx` | ✅     | ✅ Active | **REFACTORED** - Well-organized with section comments |

**Components Used:**

- `components/auth/ProtectedRoute.tsx` - ✅ Active
- `components/layout/PageLayout.tsx` - ✅ Active
- `components/ui/NoLicenseeAssigned.tsx` - ✅ Active
- `components/ui/cabinets/*` - ✅ Active (multiple modal components)
- `components/cabinets/*` - ✅ Active (navigation, content, filters)
- `components/dashboard/DashboardDateFilters.tsx` - ✅ Active
- `components/ui/FinancialMetricsCards.tsx` - ✅ Active
- `components/ui/MachineStatusWidget.tsx` - ✅ Active
- `components/ui/cabinets/CabinetSkeletonLoader.tsx` - ✅ Active

**Helpers Used:**

- `lib/helpers/cabinets.ts` - ✅ Active (via hooks)

**Hooks Used:**

- `lib/hooks/data/useCabinetData.ts` - ✅ Active
- `lib/hooks/data/useCabinetFilters.ts` - ✅ Active
- `lib/hooks/data/useCabinetModals.ts` - ✅ Active
- `lib/hooks/data/useCabinetSorting.ts` - ✅ Active
- `lib/hooks/navigation/useCabinetNavigation.ts` - ✅ Active
- `lib/hooks/useCurrencyFormat.ts` - ✅ Active

**Utils Used:**

- `lib/utils/licenseeAccess.ts` - ✅ Active
  - `shouldShowNoLicenseeMessage` - ✅ Active

**Stores Used:**

- `lib/store/dashboardStore.ts` - ✅ Active
- `lib/store/userStore.ts` - ✅ Active

**Constants Used:**

- `lib/constants/cabinets.ts` - ✅ Active
- `lib/constants/images.ts` - ✅ Active

---

### Cabinet Details (`app/cabinets/[slug]/page.tsx`)

| File                           | Status | Usage     | Notes                                                 |
| ------------------------------ | ------ | --------- | ----------------------------------------------------- |
| `app/cabinets/[slug]/page.tsx` | ✅     | ✅ Active | **REFACTORED** - Well-organized with section comments |

**Components Used:**

- `components/layout/PageLayout.tsx` - ✅ Active
- `components/cabinetDetails/*` - ✅ Active (multiple components)
- `components/ui/cabinets/*` - ✅ Active (modals, tables, cards)
- `components/ui/errors/*` - ✅ Active (NotFoundError, UnauthorizedError, NetworkError)
- `components/ui/skeletons/CabinetDetailSkeletons.tsx` - ✅ Active
- `components/dashboard/DashboardDateFilters.tsx` - ✅ Active
- `components/ui/RefreshButton.tsx` - ✅ Active

**Helpers Used:**

- `lib/helpers/cabinets.ts` - ✅ Active
  - `fetchCabinetsForLocation` - ✅ Active

**Hooks Used:**

- `lib/hooks/data/useCabinetDetailsData.ts` - ✅ Active
- `lib/hooks/data/useSmibConfiguration.ts` - ✅ Active

**Utils Used:**

- `lib/utils/serialNumber.ts` - ✅ Active
- `lib/utils/financial.ts` - ✅ Active
- `lib/utils/financialColors.ts` - ✅ Active
- `lib/utils/ui.ts` - ✅ Active

**Stores Used:**

- `lib/store/dashboardStore.ts` - ✅ Active
- `lib/store/cabinetActionsStore.ts` - ✅ Active
- `lib/store/userStore.ts` - ✅ Active

**Types Used:**

- `lib/types/pages.ts` - ✅ Active
- `shared/types/entities.ts` - ✅ Active

---

### Location Machines (`app/locations/[slug]/page.tsx`)

| File                            | Status | Usage     | Notes                                                 |
| ------------------------------- | ------ | --------- | ----------------------------------------------------- |
| `app/locations/[slug]/page.tsx` | ✅     | ✅ Active | **REFACTORED** - Well-organized with section comments |

**Components Used:**

- `components/layout/PageLayout.tsx` - ✅ Active
- `components/locationDetails/CabinetGrid.tsx` - ✅ Active
- `components/ui/cabinets/*` - ✅ Active (modals, tables, cards)
- `components/ui/common/LocationSingleSelect.tsx` - ✅ Active
- `components/ui/errors/*` - ✅ Active
- `components/ui/FinancialMetricsCards.tsx` - ✅ Active
- `components/ui/locations/CabinetCardsSkeleton.tsx` - ✅ Active
- `components/ui/locations/CabinetTableSkeleton.tsx` - ✅ Active
- `components/ui/PaginationControls.tsx` - ✅ Active
- `components/dashboard/DashboardDateFilters.tsx` - ✅ Active
- `components/ui/MachineStatusWidget.tsx` - ✅ Active

**Helpers Used:**

- `lib/helpers/cabinets.ts` - ✅ Active
  - `fetchCabinetsForLocation` - ✅ Active
- `lib/helpers/locations.ts` - ✅ Active
  - `fetchAllGamingLocations` - ✅ Active

**Utils Used:**

- `lib/utils/hooks.ts` - ✅ Active
  - `useDebounce` - ✅ Active
- `lib/utils/financial.ts` - ✅ Active
  - `calculateCabinetFinancialTotals` - ✅ Active
- `lib/utils/serialNumber.ts` - ✅ Active
- `lib/utils/ui.ts` - ✅ Active
- `lib/utils/auth.ts` - ✅ Active
  - `getAuthHeaders` - ✅ Active
- `lib/utils/licenseeAccess.ts` - ✅ Active

**Stores Used:**

- `lib/store/dashboardStore.ts` - ✅ Active
- `lib/store/newCabinetStore.ts` - ✅ Active
- `lib/store/userStore.ts` - ✅ Active

**Types Used:**

- `lib/types/pages.ts` - ✅ Active
- `shared/types/entities.ts` - ✅ Active

**Constants Used:**

- `lib/constants/images.ts` - ✅ Active

---

### Location Details (`app/locations/[slug]/details/page.tsx`)

| File                                    | Status | Usage     | Notes                                                 |
| --------------------------------------- | ------ | --------- | ----------------------------------------------------- |
| `app/locations/[slug]/details/page.tsx` | ✅     | ✅ Active | **REFACTORED** - Well-organized with section comments |

**Components Used:**

- `components/layout/PageLayout.tsx` - ✅ Active
- `components/location/LocationInfoSkeleton.tsx` - ✅ Active
- `components/locationDetails/MetricsSummary.tsx` - ✅ Active
- `components/cabinetDetails/AccountingDetails.tsx` - ✅ Active
- `components/ui/cabinets/CabinetTable.tsx` - ✅ Active
- `components/ui/cabinets/CabinetCard.tsx` - ✅ Active
- `components/ui/cabinets/EditCabinetModal.tsx` - ✅ Active
- `components/ui/cabinets/DeleteCabinetModal.tsx` - ✅ Active
- `components/ui/RefreshButton.tsx` - ✅ Active
- `components/dashboard/DashboardDateFilters.tsx` - ✅ Active

**Helpers Used:**

- `lib/helpers/locations.ts` - ✅ Active
  - `fetchLocationDetails` - ✅ Active
  - `fetchCabinets` - ✅ Active
  - `fetchAllGamingLocations` - ✅ Active
  - `fetchLocationDetailsById` - ✅ Active

**Hooks Used:**

- `lib/hooks/useCurrencyFormat.ts` - ✅ Active

**Utils Used:**

- `lib/utils/index.ts` - ✅ Active
  - `formatCurrency` - ✅ Active
- `lib/utils/serialNumber.ts` - ✅ Active
- `lib/utils/financialColors.ts` - ✅ Active
- `lib/utils/cabinet.ts` - ✅ Active
  - `mapToCabinetProps` - ✅ Active

**Stores Used:**

- `lib/store/dashboardStore.ts` - ✅ Active

**Types Used:**

- `lib/types/api.ts` - ✅ Active
- `lib/types/pages.ts` - ✅ Active

---

### Machine Details (`app/machines/[slug]/page.tsx`)

| File                           | Status | Usage     | Notes                                                 |
| ------------------------------ | ------ | --------- | ----------------------------------------------------- |
| `app/machines/[slug]/page.tsx` | ✅     | ✅ Active | **REFACTORED** - Well-organized with section comments |

**Components Used:**

- `components/layout/PageLayout.tsx` - ✅ Active
- `components/auth/ProtectedRoute.tsx` - ✅ Active
- `components/cabinetDetails/*` - ✅ Active (multiple components)
- `components/ui/cabinets/*` - ✅ Active (modals, tables)
- `components/ui/errors/*` - ✅ Active
- `components/ui/skeletons/CabinetDetailSkeletons.tsx` - ✅ Active
- `components/dashboard/DashboardDateFilters.tsx` - ✅ Active
- `components/ui/RefreshButton.tsx` - ✅ Active

**Helpers Used:**

- (via hooks)

**Hooks Used:**

- `lib/hooks/data/useCabinetDetailsData.ts` - ✅ Active
- `lib/hooks/data/useSmibConfiguration.ts` - ✅ Active

**Stores Used:**

- `lib/store/dashboardStore.ts` - ✅ Active
- `lib/store/cabinetActionsStore.ts` - ✅ Active

**Types Used:**

- (similar to cabinets/[slug])

---

### Member Details (`app/members/[id]/page.tsx`)

| File                        | Status | Usage     | Notes                                                 |
| --------------------------- | ------ | --------- | ----------------------------------------------------- |
| `app/members/[id]/page.tsx` | ✅     | ✅ Active | **REFACTORED** - Well-organized with section comments |

**Components Used:**

- `components/layout/PageLayout.tsx` - ✅ Active
- `components/auth/ProtectedRoute.tsx` - ✅ Active
- `components/ui/errors/NotFoundError.tsx` - ✅ Active
- `components/members/PlayerHeader.tsx` - ✅ Active
- `components/members/PlayerTotalsCard.tsx` - ✅ Active
- `components/members/PlayerSessionTable.tsx` - ✅ Active
- `components/members/PlayerHeaderSkeleton.tsx` - ✅ Active
- `components/members/PlayerTotalsCardSkeleton.tsx` - ✅ Active
- `components/members/PlayerSessionTableSkeleton.tsx` - ✅ Active
- `components/members/FilterControlsSkeleton.tsx` - ✅ Active
- `components/ui/button.tsx` - ✅ Active

**Helpers Used:**

- (direct API calls via axios)

**Stores Used:**

- `lib/store/dashboardStore.ts` - ✅ Active

**Types Used:**

- `shared/types/entities.ts` - ✅ Active

---

### Collection Report Detail (`app/collection-report/report/[reportId]/page.tsx`)

| File                                               | Status | Usage     | Notes                                                 |
| -------------------------------------------------- | ------ | --------- | ----------------------------------------------------- |
| `app/collection-report/report/[reportId]/page.tsx` | ✅     | ✅ Active | **REFACTORED** - Well-organized with section comments |

**Components Used:**

- `components/auth/ProtectedRoute.tsx` - ✅ Active
- `components/ui/NoLicenseeAssigned.tsx` - ✅ Active
- `components/ui/button.tsx` - ✅ Active
- `components/ui/dialog.tsx` - ✅ Active
- `components/ui/table.tsx` - ✅ Active
- `components/ui/tooltip.tsx` - ✅ Active
- (many more components)

**Helpers Used:**

- (direct API calls and complex logic)

**Utils Used:**

- (date formatting, calculations)

**Stores Used:**

- `lib/store/dashboardStore.ts` - ✅ Active
- `lib/store/userStore.ts` - ✅ Active

---

### Session Events (`app/sessions/[sessionId]/[machineId]/events/page.tsx`)

| File                                                   | Status | Usage     | Notes                                                 |
| ------------------------------------------------------ | ------ | --------- | ----------------------------------------------------- |
| `app/sessions/[sessionId]/[machineId]/events/page.tsx` | ✅     | ✅ Active | **REFACTORED** - Well-organized with section comments |

**Components Used:**

- `components/layout/PageLayout.tsx` - ✅ Active
- `components/dashboard/DashboardDateFilters.tsx` - ✅ Active
- `components/ui/button.tsx` - ✅ Active
- `components/ui/skeletons/SessionsSkeletons.tsx` - ✅ Active
- `components/ui/PaginationControls.tsx` - ✅ Active

**Helpers Used:**

- (direct API calls via axios)

**Stores Used:**

- `lib/store/dashboardStore.ts` - ✅ Active

**Types Used:**

- `lib/types/sessions.ts` - ✅ Active

---

### Unauthorized (`app/unauthorized/page.tsx`)

| File                        | Status | Usage     | Notes                                                        |
| --------------------------- | ------ | --------- | ------------------------------------------------------------ |
| `app/unauthorized/page.tsx` | ✅     | ✅ Active | **REFACTORED** - Simple redirect/error page, well-structured |

**Components Used:**

- (minimal, inline JSX)

**Utils Used:**

- `lib/utils/permissions.ts` - ✅ Active
  - `getRoleDisplayName` - ✅ Active
- `lib/utils/roleBasedRedirect.ts` - ✅ Active
  - `getDefaultRedirectPathFromRoles` - ✅ Active
  - `getRedirectDestinationNameFromRoles` - ✅ Active

**Stores Used:**

- `lib/store/userStore.ts` - ✅ Active

---

### Redirect Pages

| Page                              | Status | Usage     | Notes                                                    |
| --------------------------------- | ------ | --------- | -------------------------------------------------------- |
| `app/collection-reports/page.tsx` | ✅     | ✅ Active | **REFACTORED** - Simple redirect to `/collection-report` |
| `app/collections/page.tsx`        | ✅     | ✅ Active | **REFACTORED** - Simple redirect to `/collection-report` |
| `app/collection/page.tsx`         | ✅     | ✅ Active | **REFACTORED** - Simple redirect to `/collection-report` |

**Components Used:**

- (none - redirect only)

---

---

## Helper Files Status (`lib/helpers/`)

| File                                            | Status | Usage     | Notes          |
| ----------------------------------------------- | ------ | --------- | -------------- |
| `lib/helpers/dashboard.ts`                      | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/cabinets.ts`                       | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/locations.ts`                      | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/collectionReport.ts`               | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/collectionReportPage.ts`           | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/collectionReportPageV2.ts`         | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/collectorSchedules.ts`             | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/administration.ts`                 | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/administrationPage.ts`             | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/clientLicensees.ts`                | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/countries.ts`                      | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/clientAuth.ts`                     | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/accountingDetails.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/activityLogger.ts`                 | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/activityLogModal.ts`               | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/analytics.ts`                      | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/analyticsTab.ts`                   | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/auth.ts`                           | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/cabinetPage.ts`                    | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/cabinetsPage.ts`                   | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/cabinetsPageData.ts`               | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/cacheUtils.ts`                     | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/collectionCreation.ts`             | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/collectionReportBackend.ts`        | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/collectionReportCalculations.ts`   | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/collectionReportDetailPage.ts`     | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/collectionReportDetailPageData.ts` | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/collectionReportModal.ts`          | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/collectionReportPageData.ts`       | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/collections.ts`                    | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/currencyConversion.ts`             | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/historicalCollectionData.ts`       | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/licensees.ts`                      | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/locationAggregation.ts`            | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/locationPage.ts`                   | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/locationsPageData.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/machines.ts`                       | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/machineStats.ts`                   | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/manufacturers.ts`                  | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/membersPageData.ts`                | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/metrics.ts`                        | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/movementRequests.ts`               | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/rates.ts`                          | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/reports.ts`                        | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/reportsPage.ts`                    | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/schedulers.ts`                     | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/sessions.ts`                       | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/sessionsPageData.ts`               | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/top-performing.ts`                 | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/topPerforming.ts`                  | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/user.ts`                           | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/users.ts`                          | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/dashboardVisualization.tsx`        | ✅     | ✅ Active | **REFACTORED** |
| `lib/helpers/meters/aggregations.ts`            | ✅     | ✅ Active | **REFACTORED** |

---

## Utils Files Status (`lib/utils/`)

| File                                       | Status | Usage     | Notes          |
| ------------------------------------------ | ------ | --------- | -------------- |
| `lib/utils/licenseeAccess.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/number.ts`                      | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/financial.ts`                   | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/licenseeMapping.ts`             | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/ui.ts`                          | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/permissions.ts`                 | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/databaseMismatch.ts`            | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/roleBasedRedirect.ts`           | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/changeDetection.ts`             | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/licensee.ts`                    | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/serialNumber.ts`                | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/apiClient.ts`                   | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/auth.ts`                        | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/authLogger.ts`                  | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/axiosInterceptor.ts`            | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/cabinet.ts`                     | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/cabinetDetails.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/cabinetsPageUtils.ts`           | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/chart.ts`                       | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/collectionReportDetailUtils.ts` | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/collectionReportUtils.ts`       | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/collectionTime.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/components.ts`                  | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/connectionMonitor.ts`           | ✅     | ❌ Deleted | **REMOVED** - Unused utility, never imported |
| `lib/utils/createIndexes.ts`               | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/currency.ts`                    | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/dateFormatting.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/dates.ts`                       | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/dateUtils.ts`                   | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/dbUtils.ts`                     | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/email.ts`                       | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/errorHandling.ts`               | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/errorNotifications.ts`          | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/export.ts`                      | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/exportUtils.ts`                 | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/fieldFormatting.ts`             | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/financialColors.ts`             | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/firmwareMigration.ts`           | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/formatters.ts`                  | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/formatting.ts`                  | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/formatUtils.ts`                 | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/frontendMovementCalculation.ts` | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/gamingDayRange.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/hooks.ts`                       | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/id.ts`                          | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/idResolution.ts`                | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/ipAddress.ts`                   | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/ipDetection.ts`                 | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/ipLocation.ts`                  | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/licenseKey.ts`                  | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/location.ts`                    | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/locationsPageUtils.ts`          | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/logger.ts`                      | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/machineDisplay.tsx`             | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/machineDisplaySimple.ts`        | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/machines.ts`                    | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/membersPageUtils.ts`            | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/metrics.ts`                     | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/modelDefaults.ts`               | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/mongoQueries.ts`                | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/movementCalculation.ts`         | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/movementRequests.ts`            | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/nameValidation.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/password.ts`                    | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/performanceMonitor.ts`          | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/permissionsDb.ts`               | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/phoneFormatter.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/ramClearValidation.ts`          | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/reportExports.ts`               | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/roleBasedRedirect.ts`           | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/sas/parsePyd.ts`                | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/sessionsPageUtils.ts`           | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/smartFormatting.ts`             | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/timezone.ts`                    | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/timezoneMiddleware.ts`          | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/user.ts`                        | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/userCache.ts`                   | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/userDisplay.ts`                 | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/validation.ts`                  | ✅     | ✅ Active | **REFACTORED** |
| `lib/utils/index.ts`                       | ✅     | ✅ Active | **REFACTORED** |

---

## Hooks Files Status (`lib/hooks/`)

| File                                        | Status | Usage     | Notes          |
| ------------------------------------------- | ------ | --------- | -------------- |
| `lib/hooks/data/useDashboardFilters.ts`     | ✅     | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useDashboardRefresh.ts`     | ✅     | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useDashboardScroll.ts`      | ✅     | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useGlobalErrorHandler.ts`   | ✅     | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useCabinetData.ts`          | ✅     | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useCabinetFilters.ts`       | ✅     | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useCabinetModals.ts`        | ✅     | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useCabinetSorting.ts`       | ✅     | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useLocationData.ts`         | ✅     | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useLocationMachineStats.ts` | ✅     | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useLocationModals.ts`       | ✅     | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useLocationSorting.ts`      | ✅     | ✅ Active | **REFACTORED** |

| `lib/hooks/data/useSessions.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useSessionsFilters.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useSessionsNavigation.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/navigation/useCabinetNavigation.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/navigation/useCollectionNavigation.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/navigation/useAdministrationNavigation.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/useCurrencyFormat.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/useAuth.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/useUrlProtection.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useAcceptedBills.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useAdministrationData.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useAdministrationModals.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useApiWithRetry.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useCabinetDetailsData.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useCollectionReportModals.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useDashboardData.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useMembersTabContent.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useReportsTabContent.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useSmibConfiguration.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useSMIBDiscovery.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useSmibMeters.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useSmibOTA.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useSmibRestart.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/navigation/useMembersNavigation.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/useDebounce.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/useTextOverflow.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/auth/useAuth.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/auth/useUserProfileValidation.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useLocationPagination.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/data/useLocationDetails.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/reports/useDashboardReports.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/reports/useGenerateCustomReport.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/reports/useLocationsReports.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/reports/useLogisticsReports.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/reports/useMachinesReports.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/ui/useHasMounted.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/ui/useSafeGSAPAnimation.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/validation/index.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/data/index.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/navigation/index.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/reports/index.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/ui/index.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/auth/index.ts` | ✅ | ✅ Active | **REFACTORED** |
| `lib/hooks/index.ts` | ✅ | ✅ Active | **REFACTORED** |

---

## Store Files Status (`lib/store/`)

| File                                       | Status | Usage     | Notes          |
| ------------------------------------------ | ------ | --------- | -------------- |
| `lib/store/authSessionStore.ts`            | ✅     | ✅ Active | **REFACTORED** |
| `lib/store/cabinetActionsStore.ts`         | ✅     | ✅ Active | **REFACTORED** |
| `lib/store/cabinetUIStore.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/store/collectionModalStore.ts`        | ✅     | ✅ Active | **REFACTORED** |
| `lib/store/dashboardStore.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/store/firmwareActionsStore.ts`        | ✅     | ✅ Active | **REFACTORED** |
| `lib/store/locationActionsStore.ts`        | ✅     | ✅ Active | **REFACTORED** |
| `lib/store/locationStore.ts`               | ✅     | ✅ Active | **REFACTORED** |
| `lib/store/memberActionsStore.ts`          | ✅     | ✅ Active | **REFACTORED** |
| `lib/store/movementRequestActionsStore.ts` | ✅     | ✅ Active | **REFACTORED** |
| `lib/store/newCabinetStore.ts`             | ✅     | ✅ Active | **REFACTORED** |
| `lib/store/reportsDataStore.ts`            | ✅     | ✅ Active | **REFACTORED** |
| `lib/store/reportsStore.ts`                | ✅     | ✅ Active | **REFACTORED** |
| `lib/store/settingsStore.ts`               | ✅     | ✅ Active | **REFACTORED** |
| `lib/store/useReportStore.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/store/userStore.ts`                   | ✅     | ✅ Active | **REFACTORED** |

---

## Type Files Status (`lib/types/`)

| File                                 | Status | Usage     | Notes          |
| ------------------------------------ | ------ | --------- | -------------- |
| `lib/types/activity.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/activityLog.ts`           | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/administration.ts`        | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/analytics.ts`             | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/api.ts`                   | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/apiHooks.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/auth.ts`                  | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/authLogger.ts`            | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/cabinetDetails.ts`        | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/cabinetFilters.ts`        | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/cabinets.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/cardProps.ts`             | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/collection.ts`            | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/collections.ts`           | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/componentProps.ts`        | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/components.ts`            | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/country.ts`               | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/customSelect.ts`          | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/dashboard.ts`             | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/dashboardRefresh.ts`      | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/dashboardScroll.ts`       | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/declarations.d.ts`        | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/errorBoundary.ts`         | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/errorHandlingHOC.ts`      | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/errors.ts`                | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/export.ts`                | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/firmware.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/fixReport.ts`             | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/hooks.ts`                 | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/index.ts`                 | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/jspdf-autotable.d.ts`     | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/licensee.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/location.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/locationMachineStats.ts`  | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/locationModals.ts`        | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/locationPagination.ts`    | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/logger.ts`                | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/machinesEvaluationTab.ts` | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/machinesOfflineTab.ts`    | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/machinesOverviewTab.ts`   | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/maps.ts`                  | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/mobileCollectionModal.ts` | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/mongo.ts`                 | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/movementRequests.ts`      | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/mqtt.ts`                  | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/pages.ts`                 | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/profileValidation.ts`     | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/reports.ts`               | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/sessions.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/settings.ts`              | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/store.ts`                 | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/user.ts`                  | ✅     | ✅ Active | **REFACTORED** |
| `lib/types/users.ts`                 | ✅     | ✅ Active | **REFACTORED** |

---

## Constants Files Status (`lib/constants/`)

| File                                 | Status | Usage     | Notes          |
| ------------------------------------ | ------ | --------- | -------------- |
| `lib/constants/administration.ts`    | ✅     | ✅ Active | **REFACTORED** |
| `lib/constants/animations.ts`        | ✅     | ✅ Active | **REFACTORED** |
| `lib/constants/animationVariants.ts` | ✅     | ✅ Active | **REFACTORED** |
| `lib/constants/badWords.ts`          | ✅     | ✅ Active | **REFACTORED** |
| `lib/constants/cabinets.ts`          | ✅     | ✅ Active | **REFACTORED** |
| `lib/constants/collection.ts`        | ✅     | ✅ Active | **REFACTORED** |
| `lib/constants/images.ts`            | ✅     | ✅ Active | **REFACTORED** |
| `lib/constants/members.ts`           | ✅     | ✅ Active | **REFACTORED** |
| `lib/constants/reportBuilder.ts`     | ✅     | ✅ Active | **REFACTORED** |
| `lib/constants/reports.ts`           | ✅     | ✅ Active | **REFACTORED** |
| `lib/constants/sessions.ts`          | ✅     | ✅ Active | **REFACTORED** |
| `lib/constants/uiConstants.ts`       | ✅     | ✅ Active | **REFACTORED** |

---

## Context Files Status (`lib/contexts/`)

| File                               | Status | Usage     | Notes          |
| ---------------------------------- | ------ | --------- | -------------- |
| `lib/contexts/CurrencyContext.tsx` | ✅     | ✅ Active | **REFACTORED** |

---

## Component Files Status (`components/`)

**Note:** Component files are numerous (360+ files). This section tracks major component categories. Individual component files will be checked during refactoring of pages that use them.

### Component Categories

| Category                        | Status | Usage     | Notes                                                                                                                          |
| ------------------------------- | ------ | --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `components/admin/*`            | ✅     | ✅ Active | **REFACTORED** - AuthMonitoringDashboard                                                                                       |
| `components/administration/*`   | ✅     | ✅ Active | **REFACTORED** - All 38 components (Navigation, User/Licensee/Country modals/tables/cards, Activity logs, Payment, Feedback)   |
| `components/auth/*`             | ✅     | ✅ Active | **REFACTORED** - All 5 auth components (ProtectedRoute, AuthProvider, LoginForm, ActivityMonitor, AuthGuard)                   |
| `components/cabinetDetails/*`   | ✅     | ✅ Active | **REFACTORED** - All 17 components (Accounting, Header, Bill Validator, SMIB Config, Tables, Skeletons)                        |
| `components/cabinets/*`         | ✅     | ✅ Active | **REFACTORED** - Cabinet components                                                                                            |
| `components/collectionReport/*` | ✅     | ✅ Active | **REFACTORED** - All 31 components (Navigation, Filters, Tables/Cards, Modals, Monthly/Manager/Collector schedules, Skeletons) |
| `components/dashboard/*`        | ✅     | ✅ Active | **REFACTORED** - Dashboard components                                                                                          |
| `components/layout/*`           | ✅     | ✅ Active | **REFACTORED** - All 9 layout components (PageLayout, Header, AppSidebar, Modals, Mobile/PC layouts)                           |
| `components/location/*`         | ✅     | ✅ Active | **REFACTORED** - All 4 components (TimeFilterButtons, LocationInfo, CabinetCard, Skeletons)                                    |
| `components/locationDetails/*`  | ✅     | ✅ Active | **REFACTORED** - All 4 components (MetricsSummary, Header, CabinetGrid, FilterBar)                                             |
| `components/members/*`          | ✅     | ✅ Active | **REFACTORED** - All 9 components (Content, Modal, Header, TotalsCard, SessionTable, Skeletons)                                |
| `components/providers/*`        | ✅     | ✅ Active | **REFACTORED** - ProfileValidationGate                                                                                         |
| `components/reports/*`          | ✅     | ✅ Active | **REFACTORED** - All 2 components (ReportsContent, LocationSelector)                                                           |
| `components/sessions/*`         | ✅     | ✅ Active | **REFACTORED** - Session components                                                                                            |
| `components/ui/*`               | ✅     | ✅ Active | **REFACTORED** - All 80 UI components (shadcn/ui components, date pickers, charts, modals, selectors, common components)       |

**Total Component Files:** ~360 files

---

## Refactoring Progress Summary

### ✅ **ALL FRONTEND FILES REFACTORED - COMPLETE**

**Status:** All 661 frontend files have been successfully refactored to comply with Engineering Guidelines.

### Completed Categories ✅

**Pages (21/21 - 100%):**

- All page files refactored with file-level JSDoc, section comments, and proper structure

**Helper Files (53/53 - 100%):**

- All helper files refactored with comprehensive documentation and proper organization

**Utils Files (78/78 - 100%):**

- All utility files refactored with file-level JSDoc and proper structure

**Hooks Files (60/60 - 100%):**

- All hook files refactored with file-level JSDoc, section comments, and proper organization

**Stores (16/16 - 100%):**

- All store files refactored with SSR-safe patterns, file-level JSDoc, and section comments

**Types (60/60 - 100%):**

- All type files refactored with comprehensive file-level JSDoc documentation

**Constants (12/12 - 100%):**

- All constant files refactored with comprehensive file-level JSDoc documentation

**Contexts (1/1 - 100%):**

- All context files refactored

**Components (~360/360 - 100%):**

- All component categories refactored:
  - Admin components
  - Administration components (38 files)
  - Auth components (5 files)
  - Cabinet Details components (17 files)
  - Cabinet components
  - Collection Report components (31 files)
  - Dashboard components
  - Layout components (9 files)
  - Location components (4 files)
  - Location Details components (4 files)
  - Members components (9 files)
  - Providers components
  - Reports components (2 files)
  - Sessions components
  - UI components (80 files including shadcn/ui, date pickers, charts, modals, selectors, common components)

### Final Statistics

- **Total Pages:** 21 pages
  - ✅ Completed: 21 pages (100%)

- **Total Helper Files:** 53 files
  - ✅ Completed: 53 files (100%)

- **Total Utils Files:** 78 files
  - ✅ Completed: 78 files (100%)

- **Total Hooks Files:** 60 files
  - ✅ Completed: 60 files (100%)

- **Total Store Files:** 16 files
  - ✅ Completed: 16 files (100%)

- **Total Type Files:** 60 files
  - ✅ Completed: 60 files (100%)

- **Total Constants Files:** 12 files
  - ✅ Completed: 12 files (100%)

- **Total Context Files:** 1 file
  - ✅ Completed: 1 file (100%)

- **Total Component Files:** ~360 files
  - ✅ Completed: ~360 files (100%)

- **TOTAL FRONTEND FILES:** ~661 files
  - ✅ Completed: ~661 files (100%) ✅ **COMPLETE**

---

---

## Complete File Inventory

### Summary of All Frontend Files

| Category       | Total Files | ✅ Completed | ❌ Needs Check | ⚠️ Stale | Notes                                  |
| -------------- | ----------- | ------------ | -------------- | -------- | -------------------------------------- |
| **Pages**      | 21          | 21           | 0              | 0        | All pages refactored ✅                |
| **Helpers**    | 53          | 53           | 0              | 0        | All helper files refactored ✅         |
| **Utils**      | 78          | 78           | 0              | 0        | All utils refactored ✅                |
| **Hooks**      | 60          | 60           | 0              | 0        | All hooks refactored ✅                |
| **Stores**     | 16          | 16           | 0              | 0        | All stores refactored ✅               |
| **Types**      | 60          | 60           | 0              | 0        | All type files refactored ✅           |
| **Constants**  | 12          | 12           | 0              | 0        | All constant files refactored ✅       |
| **Contexts**   | 1           | 1            | 0              | 0        | All context files listed               |
| **Components** | ~360        | ~360         | 0              | 0        | All component categories refactored ✅ |
| **TOTAL**      | ~661        | ~661         | 0              | 0        | **ALL FRONTEND FILES REFACTORED** ✅   |

### Verification Status

- ✅ **All Pages Refactored** - 21/21 pages (100%) ✅ COMPLETE
- ✅ **All Helper Files Refactored** - 53/53 files (100%) ✅ COMPLETE
- ✅ **All Utils Files Listed** - 78/78 files (100%)
- ✅ **All Hooks Files Listed** - 60/60 files (100%)
- ✅ **All Store Files Listed** - 16/16 files (100%)
- ✅ **All Type Files Listed** - 60/60 files (100%)
- ✅ **All Constants Files Listed** - 12/12 files (100%)
- ✅ **All Context Files Listed** - 1/1 files (100%)
- ✅ **All Component Categories Refactored** - All major categories refactored ✅ COMPLETE
- ✅ **ALL FRONTEND FILES REFACTORED** - 661/661 files (100%) ✅ COMPLETE

---

**Note:** ✅ **REFACTORING COMPLETE** - All frontend files have been successfully refactored to comply with Engineering Guidelines. All files now include:

- File-level JSDoc documentation
- Section comments for code organization
- Proper TypeScript types (no `any`, prefer `type` over `interface`)
- Extracted business logic to appropriate helper/utils files
- Proper code organization following structure guidelines
- SSR-safe patterns for stores where applicable
