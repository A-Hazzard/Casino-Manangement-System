# API Logging & Refactoring Tracker

**Purpose:** Track logging cleanup and code refactoring across all API routes to optimize production performance and maintainability.

**Goals:**

1. Remove unnecessary console.log statements from production code
2. Keep only essential error logging for debugging critical issues
3. Standardize import statements and code organization
4. Ensure consistent error handling patterns

---

## Logging Standards

### ✅ KEEP (Production-Safe Logging)

- **Critical Errors:** Database connection failures, authentication errors
- **Security Events:** Failed login attempts, unauthorized access
- **Data Integrity Issues:** Missing required data, validation failures
- **External Service Failures:** MQTT errors, third-party API failures

### ❌ REMOVE (Unnecessary/Verbose Logging)

- `console.log()` for debugging (use only during development)
- Request parameter logging (already in Next.js logs)
- Success messages for routine operations
- Performance timing logs (unless investigating specific issues)
- Verbose data dumps or object logging

### 🔄 Best Practices

```typescript
// ❌ BAD - Too verbose for production
console.log('Fetching data for user:', userId);
console.log('Query params:', params);
console.log('Result:', result);

// ✅ GOOD - Only log critical errors
try {
  const result = await fetchData(userId);
  return NextResponse.json(result);
} catch (err) {
  console.error(
    '[Critical] Failed to fetch user data:',
    err instanceof Error ? err.message : 'Unknown error'
  );
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

---

## Helper Files Audit Status

### Core Helper Files (Used by Multiple Routes)

| File                                             | Status  | Logging Issues | Refactor Notes                                        |
| ------------------------------------------------ | ------- | -------------- | ----------------------------------------------------- |
| `lib/helpers/licenseeFilter.ts`                  | ✅ DONE | Cleaned        | Removed 50+ verbose debug logs for location filtering |
| `lib/helpers/users.ts`                           | ✅ DONE | Cleaned        | Removed updateUser debug logging                      |
| `lib/middleware/db.ts`                           | ✅ DONE | Cleaned        | Removed connection status logging, kept error logging |
| `lib/helpers/auth.ts`                            | ✅ DONE | Clean          | Dev-only logging wrapped in NODE_ENV check            |
| `lib/helpers/locationAggregation.ts`             | ✅ DONE | Cleaned        | Removed verbose location/batch processing logs        |
| `lib/helpers/topPerformingCurrencyConversion.ts` | ✅ DONE | Cleaned        | Removed currency conversion debug logging             |

---

## API Routes Audit Status

### 🔴 High Priority (User-Facing, Frequent Calls)

#### Analytics APIs

| Route                                         | Status  | Logging Issues | Refactor Notes                                               |
| --------------------------------------------- | ------- | -------------- | ------------------------------------------------------------ |
| `analytics/dashboard/route.ts`                | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors |
| `analytics/machines/route.ts`                 | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors |
| `analytics/machines/stats/route.ts`           | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors |
| `analytics/charts/route.ts`                   | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors |
| `analytics/hourly-revenue/route.ts`           | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors |
| `analytics/location-trends/route.ts`          | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors |
| `analytics/locations/route.ts`                | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors |
| `analytics/logistics/route.ts`                | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors |
| `analytics/handle-trends/route.ts`            | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors |
| `analytics/jackpot-trends/route.ts`           | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors |
| `analytics/machine-hourly/route.ts`           | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors |
| `analytics/top-machines/route.ts`             | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors |
| `analytics/manufacturer-performance/route.ts` | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors |
| `analytics/plays-trends/route.ts`             | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors |
| `analytics/winloss-trends/route.ts`           | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors |
| `analytics/reports/route.ts`                  | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors |

#### Metrics APIs

| Route                             | Status  | Logging Issues | Refactor Notes                                                 |
| --------------------------------- | ------- | -------------- | -------------------------------------------------------------- |
| `metrics/top-performing/route.ts` | ✅ DONE | Cleaned        | Removed verbose console.log for params and currency conversion |
| `metrics/top-performers/route.ts` | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors   |
| `metrics/top-machines/route.ts`   | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors   |
| `metrics/metricsByUser/route.ts`  | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors   |
| `metrics/meters/route.ts`         | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors   |
| `metrics/hourly-trends/route.ts`  | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors   |

#### Dashboard & Reports APIs

| Route                           | Status  | Logging Issues | Refactor Notes                                                         |
| ------------------------------- | ------- | -------------- | ---------------------------------------------------------------------- |
| `reports/meters/route.ts`       | ✅ DONE | Cleaned        | Removed debug logging for specific machine, simplified completion log  |
| `reports/machines/route.ts`     | ✅ DONE | Cleaned        | Removed debug logging for custom dates and multi-currency              |
| `reports/locations/route.ts`    | ✅ DONE | Cleaned        | Removed verbose debug logging (50+ lines), added slow response warning |
| `reports/daily-counts/route.ts` | ✅ DONE | Clean          | Only has console.warn for slow ops, console.error for errors           |

---

### 🟡 Medium Priority (Important but Less Frequent)

#### Locations APIs

| Route                                                  | Status  | Logging Issues | Refactor Notes                                          |
| ------------------------------------------------------ | ------- | -------------- | ------------------------------------------------------- |
| `locations/route.ts`                                   | ✅ DONE | Clean          | No console.log found                                    |
| `locations/[locationId]/route.ts`                      | ✅ DONE | Clean          | No console.log found                                    |
| `locations/[locationId]/cabinets/route.ts`             | ✅ DONE | Clean          | No console.log found                                    |
| `locations/[locationId]/cabinets/[cabinetId]/route.ts` | ✅ DONE | Cleaned        | Removed verbose update logging                          |
| `locations/search/route.ts`                            | ✅ DONE | Clean          | No console.log found                                    |
| `locations/search-all/route.ts`                        | ✅ DONE | Clean          | No console.log found                                    |
| `locationAggregation/route.ts`                         | ✅ DONE | Cleaned        | Removed 30+ debug logs for user permissions and caching |
| `gaming-locations/route.ts`                            | ✅ DONE | Clean          | No console.log found                                    |

#### Machines/Cabinets APIs

| Route                                              | Status  | Logging Issues | Refactor Notes                     |
| -------------------------------------------------- | ------- | -------------- | ---------------------------------- |
| `machines/route.ts`                                | ✅ DONE | Clean          | No console.log found               |
| `machines/locations/route.ts`                      | ✅ DONE | Clean          | No console.log found               |
| `machines/status/route.ts`                         | ✅ DONE | Cleaned        | Removed dev mode and debug logging |
| `machines/aggregation/route.ts`                    | ✅ DONE | Clean          | No console.log found               |
| `machines/by-id/route.ts`                          | ✅ DONE | Clean          | No console.log found               |
| `machines/by-id/events/route.ts`                   | ✅ DONE | Clean          | No console.log found               |
| `machines/[machineId]/route.ts`                    | ✅ DONE | Clean          | No console.log found               |
| `machines/[machineId]/chart/route.ts`              | ✅ DONE | Clean          | No console.log found               |
| `machines/[machineId]/collection-history/route.ts` | ✅ DONE | Clean          | No console.log found               |
| `cabinets/[cabinetId]/route.ts`                    | ✅ DONE | Clean          | No console.log found               |
| `cabinets/[cabinetId]/metrics/route.ts`            | ✅ DONE | Clean          | No console.log found               |
| `cabinets/[cabinetId]/refresh/route.ts`            | ✅ DONE | Clean          | No console.log found               |
| `bill-validator/[machineId]/route.ts`              | ✅ DONE | Clean          | No console.log found               |

#### Members APIs

| Route                                               | Status  | Logging Issues | Refactor Notes                                        |
| --------------------------------------------------- | ------- | -------------- | ----------------------------------------------------- |
| `members/route.ts`                                  | ✅ DONE | Clean          | No console.log found                                  |
| `members/summary/route.ts`                          | ✅ DONE | Cleaned        | Removed dev-only debug logging for counts and filters |
| `members/check-unique/route.ts`                     | ✅ DONE | Clean          | No console.log found                                  |
| `members/debug/route.ts`                            | ✅ DONE | Clean          | Debug route - logging expected                        |
| `members/[id]/route.ts`                             | ✅ DONE | Clean          | No console.log found                                  |
| `members/[id]/sessions/route.ts`                    | ✅ DONE | Clean          | No console.log found                                  |
| `members/[id]/sessions/[machineId]/events/route.ts` | ✅ DONE | Clean          | No console.log found                                  |
| `members-summary/route.ts`                          | ✅ DONE | Clean          | No console.log found                                  |

#### Sessions APIs

| Route                                              | Status  | Logging Issues | Refactor Notes                  |
| -------------------------------------------------- | ------- | -------------- | ------------------------------- |
| `sessions/route.ts`                                | ✅ DONE | Clean          | No console.log found            |
| `sessions/[sessionId]/route.ts`                    | ✅ DONE | Cleaned        | Removed session query debugging |
| `sessions/[sessionId]/[machineId]/events/route.ts` | ✅ DONE | Clean          | No console.log found            |

---

### 🟢 Low Priority (Admin/Infrequent Operations)

#### Auth APIs

| Route                            | Status  | Logging Issues | Refactor Notes               |
| -------------------------------- | ------- | -------------- | ---------------------------- |
| `auth/login/route.ts`            | ✅ DONE | Cleaned        | Removed cookie debug logging |
| `auth/logout/route.ts`           | ✅ DONE | Clean          | No console.log found         |
| `auth/refresh/route.ts`          | ✅ DONE | Clean          | No console.log found         |
| `auth/refresh-token/route.ts`    | ✅ DONE | Clean          | No console.log found         |
| `auth/current-user/route.ts`     | ✅ DONE | Clean          | No console.log found         |
| `auth/forgot-password/route.ts`  | ✅ DONE | Clean          | Kept security logs           |
| `auth/token/route.ts`            | ✅ DONE | Clean          | No console.log found         |
| `auth/clear-token/route.ts`      | ✅ DONE | Clean          | No console.log found         |
| `auth/clear-session/route.ts`    | ✅ DONE | Clean          | No console.log found         |
| `auth/clear-all-tokens/route.ts` | ✅ DONE | Clean          | No console.log found         |

#### Users APIs

| Route                                  | Status  | Logging Issues | Refactor Notes       |
| -------------------------------------- | ------- | -------------- | -------------------- |
| `users/route.ts`                       | ✅ DONE | Clean          | No console.log found |
| `users/[id]/route.ts`                  | ✅ DONE | Clean          | No console.log found |
| `users/[id]/test-assignments/route.ts` | ✅ DONE | Clean          | No console.log found |
| `users/check-username/route.ts`        | ✅ DONE | Clean          | No console.log found |
| `test-current-user/route.ts`           | ✅ DONE | Clean          | No console.log found |

#### Collection Reports APIs

| Route                                                          | Status  | Logging Issues | Refactor Notes                 |
| -------------------------------------------------------------- | ------- | -------------- | ------------------------------ |
| `collection-reports/route.ts`                                  | ✅ DONE | Clean          | No console.log found           |
| `collection-reports/investigate-machine/route.ts`              | ✅ DONE | Kept           | Investigation logs needed      |
| `collection-reports/investigate-issues/route.ts`               | ✅ DONE | Kept           | Investigation logs needed      |
| `collection-reports/fix-report/route.ts`                       | ✅ DONE | Kept           | Fix operation logs needed      |
| `collection-reports/fix-machine-collection-history/route.ts`   | ✅ DONE | Kept           | Fix operation logs needed      |
| `collection-reports/fix-all-sas-times/route.ts`                | ✅ DONE | Kept           | Fix operation logs needed      |
| `collection-reports/fix-all-reports/route.ts`                  | ✅ DONE | Kept           | Fix operation logs needed      |
| `collection-reports/fix-all-collection-history/route.ts`       | ✅ DONE | Kept           | Fix operation logs needed      |
| `collection-reports/check-all-issues/route.ts`                 | ✅ DONE | Kept           | Check operation logs needed    |
| `collection-reports/[reportId]/update-history/route.ts`        | ✅ DONE | Kept           | Update history logs needed     |
| `collection-report/route.ts`                                   | ✅ DONE | Clean          | No console.log found           |
| `collection-report/locations/route.ts`                         | ✅ DONE | Cleaned        | Removed success logging        |
| `collection-report/[reportId]/route.ts`                        | ✅ DONE | Cleaned        | Removed success/timing logging |
| `collection-report/[reportId]/sync-meters/route.ts`            | ✅ DONE | Kept           | Sync operation logs needed     |
| `collection-report/[reportId]/fix-sas-times/route.ts`          | ✅ DONE | Kept           | Fix operation logs needed      |
| `collection-report/[reportId]/fix-collection-history/route.ts` | ✅ DONE | Kept           | Fix operation logs needed      |
| `collection-report/[reportId]/check-sas-times/route.ts`        | ✅ DONE | Kept           | Check operation logs needed    |
| `collectionReport/route.ts`                                    | ✅ DONE | Cleaned        | Removed success/timing logging |
| `collectionReport/locations/route.ts`                          | ✅ DONE | Cleaned        | Removed success logging        |

#### Collections APIs

| Route                                         | Status  | Logging Issues | Refactor Notes                       |
| --------------------------------------------- | ------- | -------------- | ------------------------------------ |
| `collections/route.ts`                        | ✅ DONE | Cleaned        | Removed POST/PATCH/DELETE debug logs |
| `collections/[id]/route.ts`                   | ✅ DONE | Clean          | No console.log found                 |
| `collections/by-report/[reportId]/route.ts`   | ✅ DONE | Clean          | No console.log found                 |
| `collections/delete-by-report/route.ts`       | ✅ DONE | Kept           | Delete operation logs needed         |
| `collections/check-first-collection/route.ts` | ✅ DONE | Clean          | No console.log found                 |

#### SMIB/Hardware APIs

| Route                                          | Status  | Logging Issues | Refactor Notes             |
| ---------------------------------------------- | ------- | -------------- | -------------------------- |
| `smib/meters/route.ts`                         | ✅ DONE | Kept           | Hardware operation logs    |
| `smib/nvs-action/route.ts`                     | ✅ DONE | Kept           | Hardware operation logs    |
| `smib/ota-update/route.ts`                     | ✅ DONE | Kept           | Hardware operation logs    |
| `smib/restart/route.ts`                        | ✅ DONE | Kept           | Hardware operation logs    |
| `locations/[locationId]/smib-restart/route.ts` | ✅ DONE | Kept           | Hardware operation logs    |
| `locations/[locationId]/smib-ota/route.ts`     | ✅ DONE | Kept           | Hardware operation logs    |
| `locations/[locationId]/smib-meters/route.ts`  | ✅ DONE | Kept           | Hardware operation logs    |
| `locations/[locationId]/smib-configs/route.ts` | ✅ DONE | Clean          | No console.log found       |
| `cabinets/[cabinetId]/sync-meters/route.ts`    | ✅ DONE | Kept           | Sync operation logs needed |
| `cabinets/[cabinetId]/smib-config/route.ts`    | ✅ DONE | Clean          | No console.log found       |

#### MQTT APIs

| Route                                 | Status  | Logging Issues | Refactor Notes                  |
| ------------------------------------- | ------- | -------------- | ------------------------------- |
| `mqtt/config/route.ts`                | ✅ DONE | Kept           | MQTT connection logs needed     |
| `mqtt/config/subscribe/route.ts`      | ✅ DONE | Kept           | MQTT subscription logs needed   |
| `mqtt/config/request/route.ts`        | ✅ DONE | Kept           | MQTT request logs needed        |
| `mqtt/config/publish/route.ts`        | ✅ DONE | Kept           | MQTT publish logs needed        |
| `mqtt/discover-smibs/route.ts`        | ✅ DONE | Kept           | Discovery operation logs needed |
| `mqtt/update-machine-config/route.ts` | ✅ DONE | Kept           | Config update logs needed       |

#### Other Admin APIs

| Route                                   | Status  | Logging Issues | Refactor Notes                  |
| --------------------------------------- | ------- | -------------- | ------------------------------- |
| `profile/route.ts`                      | ✅ DONE | Clean          | No console.log found            |
| `licensees/route.ts`                    | ✅ DONE | Clean          | No console.log found            |
| `collectors/route.ts`                   | ✅ DONE | Clean          | No console.log found            |
| `countries/route.ts`                    | ✅ DONE | Clean          | No console.log found            |
| `manufacturers/route.ts`                | ✅ DONE | Clean          | No console.log found            |
| `rates/route.ts`                        | ✅ DONE | Clean          | No console.log found            |
| `schedulers/route.ts`                   | ✅ DONE | Clean          | No console.log found            |
| `feedback/route.ts`                     | ✅ DONE | Cleaned        | Removed PATCH/PUT debug logging |
| `firmwares/route.ts`                    | ✅ DONE | Clean          | No console.log found            |
| `firmwares/migrate/route.ts`            | ✅ DONE | Kept           | Migration logs needed           |
| `firmwares/download/[version]/route.ts` | ✅ DONE | Clean          | No console.log found            |
| `firmwares/[id]/route.ts`               | ✅ DONE | Clean          | No console.log found            |
| `firmwares/[id]/serve/route.ts`         | ✅ DONE | Clean          | No console.log found            |
| `firmwares/[id]/download/route.ts`      | ✅ DONE | Clean          | No console.log found            |
| `movement-requests/route.ts`            | ✅ DONE | Clean          | No console.log found            |
| `movement-requests/[id]/route.ts`       | ✅ DONE | Clean          | No console.log found            |

---

## Common Refactoring Patterns

### 1. Import Organization

```typescript
// ✅ GOOD - Organized imports
// External libraries
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Internal helpers
import { connectDB } from '@/app/api/lib/helpers/db';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';

// Types
import type { Machine, Location } from '@/shared/types/entities';
```

### 2. Error Handling Pattern

```typescript
// ✅ GOOD - Consistent error handling
export async function GET(req: NextRequest) {
  try {
    // Business logic
    return NextResponse.json(result);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Internal server error';
    console.error('[API Error] Route name:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

### 3. Remove Verbose Logging

```typescript
// ❌ BAD
console.log('Starting request...');
console.log('Params:', params);
console.log('User:', user);
console.log('Query result:', result);
console.log('Success!');

// ✅ GOOD
// Only log if there's a critical error
try {
  const result = await query();
  return NextResponse.json(result);
} catch (err) {
  console.error(
    '[Critical] Database query failed:',
    err instanceof Error ? err.message : 'Unknown error'
  );
  return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
}
```

---

## Progress Tracking

### Summary Statistics

- **Total API Routes:** 134+
- **Audited:** 134+ ✅
- **Cleaned:** 25+ (Removed verbose logging)
- **Helper Files Cleaned:** 6
- **High Priority Remaining:** 0 ✅
- **Medium Priority Remaining:** 0 ✅
- **Low Priority Remaining:** 0 ✅

### Completion Checklist

- [x] All high priority APIs audited ✅ (Dec 4, 2025)
- [x] All medium priority APIs audited ✅ (Dec 4, 2025)
- [x] All low priority APIs audited ✅ (Dec 4, 2025)
- [x] Helper files audited ✅ (Dec 4, 2025)
- [x] Logging standards documented ✅
- [x] Build passes after all changes ✅
- [ ] Production deployment tested

---

## Notes

- Focus on high-traffic user-facing APIs first (analytics, metrics, dashboard)
- Keep error logging for debugging production issues
- Remove all `console.log()` statements used for development
- Standardize error responses across all APIs
- Document any special logging requirements per API
- MQTT/SMIB/Hardware routes keep operational logs for debugging hardware issues
- Fix/Investigate/Check routes keep operational logs for admin troubleshooting
