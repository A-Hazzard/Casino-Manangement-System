# Function Parameter Guards Checklist

Reference: [Type Safety Rules - Section 10](../.instructions/rules/type-safety.md#10-function-parameter-guards)

## Rules
- All functions MUST validate mandatory parameters at the top of the function body
- Check IDs, objects, arrays, and dates immediately after function signature
- Log errors with `[FunctionName]` prefix
- Return early on validation failure

---

## app/api/lib/helpers/

### activityLogger.ts
- [ ] `logActivity`
- [ ] `getActivityLogs`

### apiWrapper.ts
- [ ] `withApiHandler`

### firmware.ts
- [ ] (functions to identify)

### locationAggregation.ts
- [ ] (functions to identify)

### locations.ts
- [ ] (functions to identify)

### licenceeFilter.ts
- [ ] (functions to identify)

### licencees.ts
- [ ] (functions to identify)

### logistics.ts
- [ ] (functions to identify)

### machineConfig.ts
- [ ] (functions to identify)

### machineInvestigation.ts
- [ ] (functions to identify)

### membershipAggregation.ts
- [ ] (functions to identify)

### meterSync.ts
- [ ] (functions to identify)

### mqtt.ts
- [ ] (functions to identify)

### profileValidation.ts
- [ ] (functions to identify)

### sessions.ts
- [ ] (functions to identify)

### smibDiscovery.ts
- [ ] (functions to identify)

### sms.ts
- [ ] (functions to identify)

### accountingDetails.ts
- [ ] (functions to identify)

---

### auth/

#### adminEvents.ts
- [ ] (functions to identify)

#### adminMetrics.ts
- [ ] (functions to identify)

#### auth.ts
- [ ] (functions to identify)

#### index.ts
- [ ] (functions to identify)

#### totp.ts
- [ ] (functions to identify)

---

### collectionReport/

#### bulkHistoryFix.ts
- [ ] (functions to identify)

#### bulkReportsFix.ts
- [ ] (functions to identify)

#### calculations.ts
- [ ] (functions to identify)

#### creation.ts
- [ ] (functions to identify)

#### fixOperations.ts
- [ ] (functions to identify)

#### fixes/
- [ ] (functions to identify)

#### historyUpdate.ts
- [ ] (functions to identify)

#### issueChecker.ts
- [ ] (functions to identify)

#### machineHistoryFix.ts
- [ ] (functions to identify)

#### operations.ts
- [ ] (functions to identify)

#### queries.ts
- [ ] (functions to identify)

#### recalculation.ts
- [ ] (functions to identify)

#### reportCreation.ts ✅ (DONE)
- [x] `validateCollectionReportPayload`
- [x] `sanitizeCollectionReportPayload`
- [x] `createCollectionReport`
- [ ] `updateCollectionsWithReportId`
- [ ] `updateRegularAndRamClearMeters`
- [ ] `updateMachineCollectionData`
- [ ] `appendMeterIdsToCollections`
- [ ] `createManualMetersForEachMachine`

#### reports.ts
- [ ] (functions to identify)

#### service.ts
- [ ] (functions to identify)

---

### currency/

#### helper.ts
- [ ] (functions to identify)

#### location.ts
- [ ] (functions to identify)

#### topPerforming.ts
- [ ] (functions to identify)

---

### reports/

#### analytics.ts
- [ ] (functions to identify)

#### general.ts
- [ ] (functions to identify)

#### locations.ts
- [ ] (functions to identify)

#### machines.ts
- [ ] (functions to identify)

#### manufacturerPerformance.ts
- [ ] (functions to identify)

#### meters.ts
- [ ] (functions to identify)

#### metersCurrency.ts
- [ ] (functions to identify)

#### topMachines.ts
- [ ] (functions to identify)

#### topPerforming.ts
- [ ] (functions to identify)

---

### trends/

#### general.ts
- [ ] (functions to identify)

#### hourly.ts
- [ ] (functions to identify)

#### locations.ts
- [ ] (functions to identify)

#### machineHourly.ts
- [ ] (functions to identify)

#### meters.ts
- [ ] (functions to identify)

---

### users/

#### index.ts
- [ ] (functions to identify)

#### metrics.ts
- [ ] (functions to identify)

#### users.ts
- [ ] (functions to identify)

---

### vault/

#### authorization.ts
- [ ] (functions to identify)

#### cashMonitoring.ts
- [ ] (functions to identify)

#### endOfDay.ts
- [ ] (functions to identify)

#### finalizeFloat.ts
- [ ] (functions to identify)

#### floatRequests.ts
- [ ] (functions to identify)

#### gamingDay.ts
- [ ] (functions to identify)

#### inventory.ts
- [ ] (functions to identify)

#### payout.ts
- [ ] (functions to identify)

#### payouts.ts
- [ ] (functions to identify)

#### shifts.ts
- [ ] (functions to identify)

---

## app/api/lib/utils/

- [ ] `cacheUtils.ts`
- [ ] `dates.ts`
- [ ] `licenceKey.ts`
- [ ] `reviewerScale.ts`
- [ ] `validation.ts`
- [ ] `apiResponse.ts`

## app/api/lib/services/

- [ ] `loggerService.ts`
- [ ] `mqttService.ts`

## lib/

### services/
- [ ] `emailService.ts`
- [ ] `userCacheService.ts`

### utils/
- [ ] (all utility files with exported functions)

### constants/
- [ ] (all constant files - typically no guards needed)

## shared/

### utils/
- [ ] `dateFormat.ts`

### types/
- [ ] (type files - no guards needed)

---

## Status Summary

| Folder | Total Files | Checked | Remaining |
|--------|-----------|---------|----------|
| app/api/lib/helpers/ | ~70 | 1 | ~69 |
| app/api/lib/utils/ | ~5 | 0 | ~5 |
| app/api/lib/services/ | ~2 | 0 | ~2 |
| lib/ | ~100 | 0 | ~100 |
| shared/ | ~20 | 0 | ~20 |
| **TOTAL** | **~197** | **1** | **~196** |