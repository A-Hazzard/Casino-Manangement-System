# TypeScript Errors Tracker

## Summary

- **Total Errors**: 51 errors in 49 files
- **Error Types**:
  1. Unused React imports (49 files)
  2. Object.entries null handling (2 errors in CollectionIssueModal.tsx)

## Progress

- [x] Fix unused React imports (49 files) - COMPLETED
- [x] Fix Object.entries null handling in CollectionIssueModal.tsx - COMPLETED

## Files to Fix

### Unused React Imports (49 files)

- [ ] components/cabinetDetails/CollectionHistorySkeleton.tsx:12
- [ ] components/cabinetDetails/SmibConfigSkeleton.tsx:9
- [ ] components/cabinets/CabinetsSkeleton.tsx:1
- [ ] components/collectionReport/CollectionIssueModal.tsx:17
- [ ] components/collectionReport/CollectionReportCardSkeleton.tsx:14
- [ ] components/collectionReport/CollectionReportTableSkeleton.tsx:11
- [ ] components/collectionReport/CollectorScheduleCards.tsx:17
- [ ] components/collectionReport/CollectorScheduleFilters.tsx:24
- [ ] components/collectionReport/CollectorScheduleTable.tsx:16
- [ ] components/collectionReport/ManagerScheduleCards.tsx:15
- [ ] components/collectionReport/ManagerScheduleFilters.tsx:24
- [ ] components/collectionReport/ManagerScheduleTable.tsx:15
- [ ] components/collectionReport/mobile/MobileCollectionModalSkeleton.tsx:1
- [ ] components/collectionReport/MonthlyReportDetailsTable.tsx:16
- [ ] components/collectionReport/MonthlyReportFilters.tsx:11
- [ ] components/collectionReport/MonthlyReportSummaryTable.tsx:13
- [ ] components/location/LocationInfoSkeleton.tsx:10
- [ ] components/members/FilterControlsSkeleton.tsx:9
- [ ] components/members/PlayerHeader.tsx:13
- [ ] components/members/PlayerHeaderSkeleton.tsx:9
- [ ] components/members/PlayerSessionTableSkeleton.tsx:12
- [ ] components/members/PlayerTotalsCard.tsx:18
- [ ] components/members/PlayerTotalsCardSkeleton.tsx:9
- [ ] components/reports/modals/CompareLocationsModal.tsx:3
- [ ] components/sessions/SessionEventsSkeleton.tsx:1
- [ ] components/ui/common/PieChartLabel.tsx:13
- [ ] components/ui/CurrencyDisplay.tsx:3
- [ ] components/ui/CurrencyIndicator.tsx:3
- [ ] components/ui/DateRangeIndicator.tsx:16
- [ ] components/ui/errors/ConnectionError.tsx:3
- [ ] components/ui/errors/NetworkError.tsx:3
- [ ] components/ui/errors/NotFoundError.tsx:3
- [ ] components/ui/locations/DeleteLocationModal.tsx:3
- [ ] components/ui/MachineEvaluationSummary.tsx:14
- [ ] components/ui/MachineStatusWidget.tsx:18
- [ ] components/ui/movements/MovementRequestsSkeleton.tsx:1
- [ ] components/ui/RefreshButton.tsx:22
- [ ] components/ui/skeletons/CollectionNavigationSkeleton.tsx:1
- [ ] components/ui/skeletons/CollectionReportDetailSkeletons.tsx:1
- [ ] components/ui/skeletons/CollectionReportFiltersSkeleton.tsx:1
- [ ] components/ui/skeletons/CollectionReportPageSkeleton.tsx:1
- [ ] components/ui/skeletons/CollectionReportSkeletons.tsx:1
- [ ] components/ui/skeletons/DashboardDateFiltersSkeleton.tsx:1
- [ ] components/ui/skeletons/DashboardSkeletons.tsx:1
- [ ] components/ui/skeletons/LoginSkeletons.tsx:1
- [ ] components/ui/skeletons/MembersSkeletons.tsx:1
- [ ] components/ui/skeletons/MobileCollectionModalSkeleton.tsx:1
- [ ] components/ui/skeletons/NewCollectionModalSkeleton.tsx:1
- [ ] components/ui/StackedChart.tsx:23

### Object.entries Null Handling (2 errors)

- [ ] components/collectionReport/CollectionIssueModal.tsx:178
- [ ] components/collectionReport/CollectionIssueModal.tsx:199

## Notes

- All React imports should be removed as Next.js 16+ doesn't require them
- Object.entries needs null checks before calling
