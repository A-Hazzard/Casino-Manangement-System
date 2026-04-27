# Error Logging Fix Script

Reference: [Type-Safety Rules - Section 12: Error Logging](../.instructions/rules/type-safety.md#12-error-logging-in-catch-blocks)

## Pattern to Fix

Find:
```typescript
} catch (e: unknown) {
  console.error(...e...);  // Logging entire error
  const message = ...
  return NextResponse.json({ ...error: message...}, {...});
}
```

Replace with:
```typescript
} catch (e) {
  console.error('[FunctionName] Error:', e instanceof Error ? e.message : 'Unknown error');
  return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
}
```

## Files to Scan

### app/api/lib/
```
app\api\lib\helpers\accountingDetails.ts
app\api\lib\helpers\activityLogger.ts
app\api\lib\helpers\apiWrapper.ts
app\api\lib\helpers\cacheUtils.ts
app\api\lib\helpers\firmware.ts
app\api\lib\helpers\licenceeFilter.ts
app\api\lib\helpers\licencees.ts
app\api\lib\helpers\locationAggregation.ts
app\api\lib\helpers\locations.ts
app\api\lib\helpers\logistics.ts
app\api\lib\helpers\machineConfig.ts
app\api\lib\helpers\machineInvestigation.ts
app\api\lib\helpers\membershipAggregation.ts
app\api\lib\helpers\meterSync.ts
app\api\lib\helpers\mqtt.ts
app\api\lib\helpers\profileValidation.ts
app\api\lib\helpers\sessions.ts
app\api\lib\helpers\smibDiscovery.ts
app\api\lib\helpers\sms.ts
app\api\lib\helpers\auth\adminEvents.ts
app\api\lib\helpers\auth\adminMetrics.ts
app\api\lib\helpers\auth\auth.ts
app\api\lib\helpers\auth\index.ts
app\api\lib\helpers\auth\totp.ts
app\api\lib\helpers\collectionReport\bulkHistoryFix.ts
app\api\lib\helpers\collectionReport\bulkReportsFix.ts
app\api\lib\helpers\collectionReport\calculations.ts
app\api\lib\helpers\collectionReport\creation.ts
app\api\lib\helpers\collectionReport\fixOperations.ts
app\api\lib\helpers\collectionReport\historyUpdate.ts
app\api\lib\helpers\collectionReport\issueChecker.ts
app\api\lib\helpers\collectionReport\machineHistoryFix.ts
app\api\lib\helpers\collectionReport\operations.ts
app\api\lib\helpers\collectionReport\queries.ts
app\api\lib\helpers\collectionReport\recalculation.ts
app\api\lib\helpers\collectionReport\reportCreation.ts
app\api\lib\helpers\collectionReport\reports.ts
app\api\lib\helpers\collectionReport\service.ts
app\api\lib\helpers\collectionReport\fixes\adminRepair.ts
app\api\lib\helpers\collectionReport\fixes\bulkSasTimes.ts
app\api\lib\helpers\collectionReport\fixes\checkAllIssues.ts
app\api\lib\helpers\collectionReport\fixes\sasTimes.ts
app\api\lib\helpers\currency\helper.ts
app\api\lib\helpers\currency\location.ts
app\api\lib\helpers\currency\topPerforming.ts
app\api\lib\helpers\reports\analytics.ts
app\api\lib\helpers\reports\general.ts
app\api\lib\helpers\reports\locations.ts
app\api\lib\helpers\reports\machines.ts
app\api\lib\helpers\reports\manufacturerPerformance.ts
app\api\lib\helpers\reports\meters.ts
app\api\lib\helpers\reports\metersCurrency.ts
app\api\lib\helpers\reports\topMachines.ts
app\api\lib\helpers\reports\topPerforming.ts
app\api\lib\helpers\trends\general.ts
app\api\lib\helpers\trends\hourly.ts
app\api\lib\helpers\trends\locations.ts
app\api\lib\helpers\trends\machineHourly.ts
app\api\lib\helpers\trends\meters.ts
app\api\lib\helpers\users\index.ts
app\api\lib\helpers\users\metrics.ts
app\api\lib\helpers\users\users.ts
app\api\lib\helpers\vault\authorization.ts
app\api\lib\helpers\vault\cashMonitoring.ts
app\api\lib\helpers\vault\endOfDay.ts
app\api\lib\helpers\vault\finalizeFloat.ts
app\api\lib\helpers\vault\floatRequests.ts
app\api\lib\helpers\vault\gamingDay.ts
app\api\lib\helpers\vault\inventory.ts
app\api\lib\helpers\vault\payouts.ts
app\api\lib\helpers\vault\shifts.ts
app\api\lib\middleware\db.ts
app\api\lib\models\acceptedBills.ts
app\api\lib\models\activityLog.ts
app\api\lib\models\cashDeskPayouts.ts
app\api\lib\models\cashierShift.ts
app\api\lib\models\collectionReport.ts
app\api\lib\models\collections.ts
app\api\lib\models\countries.ts
app\api\lib\models\denominations.ts
app\api\lib\models\feedback.ts
app\api\lib\models\firmware.ts
app\api\lib\models\floatRequest.ts
app\api\lib\models\floatRequests.ts
app\api\lib\models\gaminglocations.ts
app\api\lib\models\interLocationTransfer.ts
app\api\lib\models\licencee.ts
app\api\lib\models\machineEvents.ts
app\api\lib\models\machines.ts
app\api\lib\models\machineSessions.ts
app\api\lib\models\members.ts
app\api\lib\models\meters.ts
app\api\lib\models\movementrequests.ts
app\api\lib\models\payout.ts
app\api\lib\models\scheduler.ts
app\api\lib\models\shifts.ts
app\api\lib\models\softCount.ts
app\api\lib\models\user.ts
app\api\lib\models\vault-collection-session.ts
app\api\lib\models\vaultNotification.ts
app\api\lib\models\vaultShift.ts
app\api\lib\models\vaultTransaction.ts
app\api\lib\services\loggerService.ts
app\api\lib\services\mqttService.ts
app\api\lib\types\index.ts
app\api\lib\utils\apiResponse.ts
app\api\lib\utils\dates.ts
app\api\lib\utils\licenceKey.ts
app\api\lib\utils\reviewerScale.ts
app\api\lib\utils\validation.ts
```

### app/api/ (routes)
```
app\api\...\route.ts files with catch blocks
```

### lib/
```
lib\helpers\*.ts
lib\hooks\*.ts
lib\services\*.ts
lib\utils\*.ts
```

### shared/
```
shared\utils\*.ts
```

## Task
1. Scan each file
2. Find `catch (e: unknown)` patterns
3. Replace with proper error logging
4. Update file in place
5. Report progress