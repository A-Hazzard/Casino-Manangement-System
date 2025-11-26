# Financial Metrics Colors Implementation Tracking

This document tracks the implementation of green/red color rules for financial metrics across all pages and components.

## Color Rules

1. **Money In**: Always green (`text-green-600`)
2. **Money Out**: 
   - Green if less than Money In (`text-green-600`)
   - Red if more than Money In (`text-red-600`)
3. **Gross**: 
   - Green if positive (`text-green-600`)
   - Red if negative (`text-red-600`)

## Pages & Components Status

### ✅ Completed
- [x] Dashboard (PcLayout.tsx) - Dashboard metrics cards
- [x] Dashboard (FinancialMetricsCards.tsx) - Reusable metrics cards component
- [x] `components/ui/locations/LocationCard.tsx` - Location card metrics
- [x] `components/ui/locations/LocationTable.tsx` - Location table metrics
- [x] `components/locationDetails/MetricsSummary.tsx` - Location details metrics
- [x] `components/locationDetails/CabinetGrid.tsx` - Cabinet cards in location details
- [x] `components/ui/cabinets/CabinetCard.tsx` - Cabinet card metrics
- [x] `components/ui/cabinets/CabinetTable.tsx` - Cabinet table metrics
- [x] `components/cabinetDetails/AccountingMetricsSection.tsx` - Cabinet details metrics
- [x] `components/members/PlayerSessionTable.tsx` - Member session table
- [x] `components/reports/tabs/LocationsTab.tsx` - Locations tab summary cards
- [x] `components/reports/tabs/MachinesTab.tsx` - Machines tab metrics cards
- [x] `components/reports/common/RevenueAnalysisTable.tsx` - Revenue analysis table
- [x] `components/reports/common/EnhancedLocationTable.tsx` - Enhanced location table
- [x] `components/collectionReport/CollectionReportCards.tsx` - Collection report cards
- [x] `components/collectionReport/CollectionReportTable.tsx` - Collection report table

### ⏳ In Progress
- Checking remaining page files and other components

### 📋 To Do

#### Pages (may use components already updated)
- [ ] `app/locations/[slug]/page.tsx` - Locations list page (uses LocationCard/LocationTable)
- [ ] `app/locations/[slug]/details/page.tsx` - Location details page (uses MetricsSummary/CabinetGrid)
- [ ] `app/cabinets/page.tsx` - Cabinets list page (uses CabinetCard/CabinetTable)
- [ ] `app/cabinets/[cabinetId]/page.tsx` - Cabinet details page (uses AccountingMetricsSection)
- [ ] `app/members/page.tsx` - Members list page
- [ ] `app/members/[id]/page.tsx` - Member details page (uses PlayerSessionTable)
- [ ] `app/sessions/page.tsx` - Sessions list page
- [ ] `app/reports/page.tsx` - Reports main page
- [ ] `app/collection-report/page.tsx` - Collection reports list
- [ ] `app/collection-report/report/[reportId]/page.tsx` - Collection report details

#### Reports Tabs
- [ ] `components/reports/tabs/MetersTab.tsx` - Meters tab
- [ ] `components/reports/tabs/MachinesOverviewTab.tsx` - Machines overview tab
- [ ] `components/reports/tabs/MachinesOfflineTab.tsx` - Machines offline tab
- [ ] `components/reports/tabs/MachinesEvaluationTab.tsx` - Machines evaluation tab

#### Other Components
- [ ] `components/cabinetDetails/AccountingDetails.tsx` - Cabinet accounting details
- [ ] `components/collectionReport/MonthlyReportSummaryTable.tsx` - Monthly summary table
- [ ] `components/collectionReport/MonthlyReportDetailsTable.tsx` - Monthly details table
- [ ] `components/ui/MapPreview.tsx` - Map preview metrics
- [ ] `components/ui/ManufacturerPerformanceChart.tsx` - Manufacturer performance
- [ ] `components/ui/LocationTrendChart.tsx` - Location trend chart
- [ ] `components/ui/GamesPerformanceRevenueChart.tsx` - Games performance revenue
- [ ] `components/ui/GamesPerformanceChart.tsx` - Games performance chart
- [ ] `components/reports/charts/HandleChart.tsx` - Handle chart
- [ ] `components/reports/modals/CompareLocationsModal.tsx` - Compare locations modal

## Implementation Notes

- All components should use the utility functions from `lib/utils/financialColors.ts`
- Money Out color depends on Money In value, so both values must be available
- Gross color is based on its own value (positive/negative)

## Utility Functions

Located in: `lib/utils/financialColors.ts`

- `getMoneyInColorClass()` - Returns green for Money In
- `getMoneyOutColorClass(moneyOut, moneyIn)` - Returns green/red based on comparison
- `getGrossColorClass(gross)` - Returns green/red based on positive/negative

