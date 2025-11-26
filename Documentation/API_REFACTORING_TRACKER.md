# API Refactoring Tracker

**Last Updated:** November 22, 2025  
**Status:** In Progress

This document tracks the refactoring of all API routes to comply with the Engineering Guidelines structure requirements.

## Legend

- ✅ **DONE** - Route follows proper structure (file-level JSDoc, step-by-step comments, helper extraction)
- 🔄 **IN PROGRESS** - Currently being refactored
- ❌ **NEEDS REFACTORING** - Route doesn't follow proper structure
- ⚠️ **STALE** - No usage found in codebase (marked for review/deletion)
- 📝 **PARTIAL** - Some handlers follow structure, others don't

## Structure Requirements Checklist

Each API route must have:

- [ ] File-level JSDoc with route description and features
- [ ] Step-by-step comments with visual separators (`// ============================================================================`)
- [ ] Numbered steps (`STEP 1:`, `STEP 2:`, etc.)
- [ ] Flow documentation in handler JSDoc
- [ ] Business logic extracted to `app/api/lib/helpers/`
- [ ] Performance tracking (`startTime`) for slow operations
- [ ] Proper error handling with appropriate status codes
- [ ] Import organization (helpers, types, utilities, Next.js)

---

## API Routes Status

### Authentication (`/api/auth`)

| Endpoint                     | Method | Status | Usage     | Notes                               |
| ---------------------------- | ------ | ------ | --------- | ----------------------------------- |
| `/api/auth/login`            | POST   | ✅     | ✅ Active | **REFACTORED**                      |
| `/api/auth/logout`           | POST   | ✅     | ✅ Active | **REFACTORED**                      |
| `/api/auth/current-user`     | GET    | ✅     | ✅ Active | **REFACTORED**                      |
| `/api/auth/refresh`          | POST   | ✅     | ✅ Active | **REFACTORED**                      |
| `/api/auth/refresh-token`    | POST   | ✅     | ✅ Active | **REFACTORED**                      |
| `/api/auth/token`            | GET    | ✅     | ✅ Active | **REFACTORED**                      |
| `/api/auth/clear-all-tokens` | POST   | ✅     | ✅ Active | **REFACTORED**                      |
| `/api/auth/forgot-password`  | POST   | ✅     | ✅ Active | **REFACTORED**                      |
| `/api/auth/clear-session`    | POST   | ✅     | ✅ Active | **REFACTORED**                      |
| `/api/auth/clear-token`      | POST   | ✅     | ✅ Active | **REFACTORED**                      |
| `/api/auth/clear-all-tokens` | POST   | ✅     | ✅ Active | **REFACTORED** (GET also available) |

### Users (`/api/users`)

| Endpoint                    | Method                 | Status | Usage     | Notes          |
| --------------------------- | ---------------------- | ------ | --------- | -------------- |
| `/api/users`                | GET, POST, PUT, DELETE | ✅     | ✅ Active | **REFACTORED** |
| `/api/users/[id]`           | GET, PUT               | ✅     | ✅ Active | **REFACTORED** |
| `/api/users/check-username` | GET                    | ✅     | ✅ Active | **REFACTORED** |

### Dashboard (`/api/dashboard`)

| Endpoint                | Method | Status | Usage     | Notes          |
| ----------------------- | ------ | ------ | --------- | -------------- |
| `/api/dashboard/totals` | GET    | ✅     | ✅ Active | **REFACTORED** |

### Locations (`/api/locations`)

| Endpoint                                           | Method                  | Status | Usage     | Notes          |
| -------------------------------------------------- | ----------------------- | ------ | --------- | -------------- |
| `/api/locations`                                   | GET, POST, PUT, DELETE  | ✅     | ✅ Active | **REFACTORED** |
| `/api/locations/[locationId]`                      | GET                     | ✅     | ✅ Active | **REFACTORED** |
| `/api/locations/[locationId]/cabinets`             | POST                    | ✅     | ✅ Active | **REFACTORED** |
| `/api/locations/[locationId]/cabinets/[cabinetId]` | GET, PUT, PATCH, DELETE | ✅     | ✅ Active | **REFACTORED** |
| `/api/locations/[locationId]/smib-restart`         | POST                    | ✅     | ✅ Active | **REFACTORED** |
| `/api/locations/[locationId]/smib-ota`             | POST                    | ✅     | ✅ Active | **REFACTORED** |
| `/api/locations/[locationId]/smib-meters`          | POST                    | ✅     | ✅ Active | **REFACTORED** |
| `/api/locations/[locationId]/smib-configs`         | GET                     | ✅     | ✅ Active | **REFACTORED** |
| `/api/locations/search`                            | GET                     | ✅     | ✅ Active | **REFACTORED** |
| `/api/locations/search-all`                        | GET                     | ✅     | ✅ Active | **REFACTORED** |

### Machines (`/api/machines`)

| Endpoint                                       | Method                 | Status | Usage     | Notes                                       |
| ---------------------------------------------- | ---------------------- | ------ | --------- | ------------------------------------------- |
| `/api/machines`                                | GET, POST, PUT, DELETE | ✅     | ✅ Active | **REFACTORED**                              |
| `/api/machines/[machineId]`                    | GET                    | ✅     | ✅ Active | **REFACTORED** (PUT/DELETE return 405)      |
| `/api/machines/by-id`                          | GET                    | ✅     | ✅ Active | **REFACTORED** (POST/PUT/DELETE return 405) |
| `/api/machines/by-id/events`                   | GET                    | ✅     | ✅ Active | **REFACTORED**                              |
| `/api/machines/locations`                      | GET                    | ✅     | ✅ Active | **REFACTORED**                              |
| `/api/machines/aggregation`                    | GET                    | ✅     | ✅ Active | **REFACTORED**                              |
| `/api/machines/[machineId]/collection-history` | PATCH                  | ✅     | ✅ Active | **REFACTORED**                              |

### Cabinets (`/api/cabinets`)

| Endpoint                                | Method                  | Status | Usage     | Notes                                           |
| --------------------------------------- | ----------------------- | ------ | --------- | ----------------------------------------------- |
| `/api/cabinets/[cabinetId]`             | GET, PUT, PATCH, DELETE | ✅     | ✅ Active | **REFACTORED** (redirects to location endpoint) |
| `/api/cabinets/[cabinetId]/sync-meters` | POST                    | ✅     | ✅ Active | **REFACTORED** (redirects to location endpoint) |
| `/api/cabinets/[cabinetId]/smib-config` | GET, POST               | ✅     | ✅ Active | **REFACTORED**                                  |
| `/api/cabinets/[cabinetId]/refresh`     | GET                     | ✅     | ✅ Active | **REFACTORED** (redirects to location endpoint) |
| `/api/cabinets/[cabinetId]/metrics`     | GET                     | ✅     | ✅ Active | **REFACTORED** (redirects to location endpoint) |

### Collections (`/api/collections`)

| Endpoint                                  | Method                   | Status | Usage     | Notes          |
| ----------------------------------------- | ------------------------ | ------ | --------- | -------------- |
| `/api/collections`                        | GET, POST, PATCH, DELETE | ✅     | ✅ Active | **REFACTORED** |
| `/api/collections/[id]`                   | PATCH                    | ✅     | ✅ Active | **REFACTORED** |
| `/api/collections/by-report/[reportId]`   | GET                      | ✅     | ✅ Active | **REFACTORED** |
| `/api/collections/delete-by-report`       | DELETE                   | ✅     | ✅ Active | **REFACTORED** |
| `/api/collections/check-first-collection` | GET                      | ✅     | ✅ Active | **REFACTORED** |

### Collection Reports (`/api/collection-report`, `/api/collection-reports`, `/api/collectionReport`)

| Endpoint                                                   | Method             | Status | Usage     | Notes                                                |
| ---------------------------------------------------------- | ------------------ | ------ | --------- | ---------------------------------------------------- |
| `/api/collection-report/[reportId]`                        | GET, PATCH, DELETE | ✅     | ✅ Active | **REFACTORED** - Business logic extracted to helpers |
| `/api/collection-report/[reportId]/sync-meters`            | POST               | ✅     | ✅ Active | **REFACTORED** - Business logic extracted to helpers |
| `/api/collection-report/[reportId]/fix-sas-times`          | POST               | ✅     | ✅ Active | **REFACTORED** - Business logic extracted to helpers |
| `/api/collection-report/[reportId]/fix-collection-history` | POST               | ✅     | ✅ Active | **REFACTORED** - Business logic extracted to helpers |
| `/api/collection-report/[reportId]/check-sas-times`        | GET                | ✅     | ✅ Active | **REFACTORED** - Business logic extracted to helpers |
| `/api/collection-reports`                                  | GET                | ✅     | ✅ Active | **REFACTORED** (POST not found)                      |
| `/api/collection-reports/fix-report`                       | POST               | ✅     | ✅ Active | **REFACTORED** - Business logic extracted to helpers |
| `/api/collection-reports/fix-machine-collection-history`   | POST               | ✅     | ✅ Active | **REFACTORED** - Business logic extracted to helpers |
| `/api/collection-reports/fix-all-sas-times`                | POST               | ✅     | ✅ Active | **REFACTORED** - Business logic extracted to helpers |
| `/api/collection-reports/fix-all-reports`                  | POST               | ✅     | ✅ Active | **REFACTORED** - Business logic extracted to helpers |
| `/api/collection-reports/fix-all-collection-history`       | POST               | ✅     | ✅ Active | **REFACTORED** - Business logic extracted to helpers |
| `/api/collection-reports/investigate-machine`              | POST               | ✅     | ✅ Active | **REFACTORED** - Business logic extracted to helpers |
| `/api/collection-reports/investigate-issues`               | GET                | ✅     | ✅ Active | **REFACTORED** - Business logic extracted to helpers |
| `/api/collection-reports/check-all-issues`                 | GET                | ✅     | ✅ Active | **REFACTORED** - Business logic extracted to helpers |
| `/api/collection-reports/[reportId]/update-history`        | PATCH              | ✅     | ✅ Active | **REFACTORED** - Business logic extracted to helpers |
| `/api/collectionReport`                                    | GET, POST          | ✅     | ✅ Active | **REFACTORED** - Business logic extracted to helpers |
| `/api/collectionReport/locations`                          | GET                | ✅     | ✅ Active | **REFACTORED**                                       |

### Reports (`/api/reports`)

| Endpoint                    | Method | Status | Usage     | Notes                 |
| --------------------------- | ------ | ------ | --------- | --------------------- |
| `/api/reports/meters`       | GET    | ✅     | ✅ Active | **Reference example** |
| `/api/reports/machines`     | GET    | ✅     | ✅ Active | **REFACTORED**        |
| `/api/reports/locations`    | GET    | ✅     | ✅ Active | **REFACTORED**        |
| `/api/reports/daily-counts` | GET    | ✅     | ✅ Active | **REFACTORED**        |

### Analytics (`/api/analytics`)

| Endpoint                                  | Method | Status | Usage     | Notes          |
| ----------------------------------------- | ------ | ------ | --------- | -------------- |
| `/api/analytics/machines`                 | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/analytics/machines/stats`           | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/analytics/dashboard`                | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/analytics/top-machines`             | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/analytics/winloss-trends`           | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/analytics/plays-trends`             | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/analytics/manufacturer-performance` | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/analytics/logistics`                | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/analytics/reports`                  | POST   | ✅     | ✅ Active | **REFACTORED** |
| `/api/analytics/charts`                   | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/analytics/hourly-revenue`           | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/analytics/handle-trends`            | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/analytics/jackpot-trends`           | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/analytics/location-trends`          | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/analytics/machine-hourly`           | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/analytics/locations`                | GET    | ✅     | ✅ Active | **REFACTORED** |

### Metrics (`/api/metrics`)

| Endpoint                      | Method | Status | Usage     | Notes          |
| ----------------------------- | ------ | ------ | --------- | -------------- |
| `/api/metrics/meters`         | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/metrics/top-performing` | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/metrics/top-performers` | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/metrics/top-machines`   | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/metrics/metricsByUser`  | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/metrics/hourly-trends`  | GET    | ✅     | ✅ Active | **REFACTORED** |

### Members (`/api/members`)

| Endpoint                                        | Method           | Status | Usage     | Notes                                   |
| ----------------------------------------------- | ---------------- | ------ | --------- | --------------------------------------- |
| `/api/members`                                  | GET, POST        | ✅     | ✅ Active | **REFACTORED**                          |
| `/api/members/[id]`                             | GET, PUT, DELETE | ✅     | ✅ Active | **REFACTORED**                          |
| `/api/members/[id]/sessions`                    | GET              | ✅     | ✅ Active | **REFACTORED** (removed duplicate code) |
| `/api/members/[id]/sessions/[machineId]/events` | GET              | ✅     | ✅ Active | **REFACTORED**                          |
| `/api/members/summary`                          | GET              | ✅     | ✅ Active | **REFACTORED**                          |
| `/api/members/debug`                            | GET              | ✅     | ✅ Active | **REFACTORED**                          |
| `/api/members-summary`                          | GET              | ✅     | ✅ Active | **REFACTORED**                          |

### Sessions (`/api/sessions`)

| Endpoint                                       | Method | Status | Usage     | Notes          |
| ---------------------------------------------- | ------ | ------ | --------- | -------------- |
| `/api/sessions`                                | GET    | ✅     | ✅ Active | **REFACTORED** |
| `/api/sessions/[sessionId]/[machineId]/events` | GET    | ✅     | ✅ Active | **REFACTORED** |

### SMIB (`/api/smib`)

| Endpoint               | Method | Status | Usage     | Notes          |
| ---------------------- | ------ | ------ | --------- | -------------- |
| `/api/smib/restart`    | POST   | ✅     | ✅ Active | **REFACTORED** |
| `/api/smib/ota-update` | POST   | ✅     | ✅ Active | **REFACTORED** |
| `/api/smib/nvs-action` | POST   | ✅     | ✅ Active | **REFACTORED** |
| `/api/smib/meters`     | POST   | ✅     | ✅ Active | **REFACTORED** |

### MQTT (`/api/mqtt`)

| Endpoint                          | Method | Status | Usage      | Notes                                    |
| --------------------------------- | ------ | ------ | ---------- | ---------------------------------------- |
| `/api/mqtt/config`                | GET    | ✅     | ✅ Active  | **REFACTORED** (POST not found)          |
| `/api/mqtt/config/publish`        | POST   | ✅     | ✅ Active  | **REFACTORED**                           |
| `/api/mqtt/config/subscribe`      | GET    | ✅     | ✅ Active  | **REFACTORED** (SSE endpoint)            |
| `/api/mqtt/config/request`        | POST   | ✅     | ✅ Active  | **REFACTORED**                           |
| `/api/mqtt/discover-smibs`        | GET    | ✅     | ✅ Active  | **REFACTORED**                           |
| `/api/mqtt/update-machine-config` | POST   | ✅     | ✅ Active  | **REFACTORED**                           |
| `/api/mqtt/test`                  | GET    | ❌     | ❌ DELETED | Deleted - only in docs, not used in code |

### Licensees (`/api/licensees`)

| Endpoint         | Method                 | Status | Usage     | Notes          |
| ---------------- | ---------------------- | ------ | --------- | -------------- |
| `/api/licensees` | GET, POST, PUT, DELETE | ✅     | ✅ Active | **REFACTORED** |

### Gaming Locations (`/api/gaming-locations`)

| Endpoint                | Method | Status | Usage     | Notes                                   |
| ----------------------- | ------ | ------ | --------- | --------------------------------------- |
| `/api/gaming-locations` | GET    | ✅     | ✅ Active | **REFACTORED** (POST needs refactoring) |

### Firmwares (`/api/firmwares`)

| Endpoint                            | Method    | Status | Usage     | Notes                              |
| ----------------------------------- | --------- | ------ | --------- | ---------------------------------- |
| `/api/firmwares`                    | GET, POST | ✅     | ✅ Active | **REFACTORED**                     |
| `/api/firmwares/[id]`               | DELETE    | ✅     | ✅ Active | **REFACTORED** (GET/PUT not found) |
| `/api/firmwares/[id]/download`      | GET       | ✅     | ✅ Active | **REFACTORED**                     |
| `/api/firmwares/[id]/serve`         | GET       | ✅     | ✅ Active | **REFACTORED**                     |
| `/api/firmwares/download/[version]` | GET       | ✅     | ✅ Active | **REFACTORED**                     |
| `/api/firmwares/migrate`            | GET, POST | ✅     | ✅ Active | **REFACTORED**                     |

### Feedback (`/api/feedback`)

| Endpoint        | Method    | Status | Usage     | Notes          |
| --------------- | --------- | ------ | --------- | -------------- |
| `/api/feedback` | GET, POST | ✅     | ✅ Active | **REFACTORED** |

### Collectors (`/api/collectors`)

| Endpoint          | Method | Status | Usage     | Notes          |
| ----------------- | ------ | ------ | --------- | -------------- |
| `/api/collectors` | GET    | ✅     | ✅ Active | **REFACTORED** |

### Countries (`/api/countries`)

| Endpoint         | Method | Status | Usage     | Notes          |
| ---------------- | ------ | ------ | --------- | -------------- |
| `/api/countries` | GET    | ✅     | ✅ Active | **REFACTORED** |

### Bill Validator (`/api/bill-validator`)

| Endpoint                          | Method | Status | Usage     | Notes          |
| --------------------------------- | ------ | ------ | --------- | -------------- |
| `/api/bill-validator/[machineId]` | GET    | ✅     | ✅ Active | **REFACTORED** |

### Movement Requests (`/api/movement-requests`)

| Endpoint                      | Method        | Status | Usage     | Notes                              |
| ----------------------------- | ------------- | ------ | --------- | ---------------------------------- |
| `/api/movement-requests`      | GET, POST     | ✅     | ✅ Active | **REFACTORED**                     |
| `/api/movement-requests/[id]` | DELETE, PATCH | ✅     | ✅ Active | **REFACTORED** (GET/PUT not found) |

### Schedulers (`/api/schedulers`)

| Endpoint          | Method | Status | Usage     | Notes          |
| ----------------- | ------ | ------ | --------- | -------------- |
| `/api/schedulers` | GET    | ✅     | ✅ Active | **REFACTORED** |

### Rates (`/api/rates`)

| Endpoint     | Method | Status | Usage     | Notes          |
| ------------ | ------ | ------ | --------- | -------------- |
| `/api/rates` | GET    | ✅     | ✅ Active | **REFACTORED** |

### Profile (`/api/profile`)

| Endpoint       | Method | Status | Usage     | Notes          |
| -------------- | ------ | ------ | --------- | -------------- |
| `/api/profile` | PUT    | ✅     | ✅ Active | **REFACTORED** |

### Admin (`/api/admin`)

| Endpoint                      | Method    | Status | Usage     | Notes          |
| ----------------------------- | --------- | ------ | --------- | -------------- |
| `/api/admin/reconnect-db`     | GET, POST | ✅     | ✅ Active | **REFACTORED** |
| `/api/admin/repair-sas-times` | POST      | ✅     | ✅ Active | **REFACTORED** |
| `/api/admin/create-indexes`   | GET, POST | ✅     | ✅ Active | **REFACTORED** |
| `/api/admin/auth/metrics`     | GET       | ✅     | ✅ Active | **REFACTORED** |
| `/api/admin/auth/events`      | GET       | ✅     | ✅ Active | **REFACTORED** |

### Activity Logs (`/api/activity-logs`)

| Endpoint             | Method    | Status | Usage     | Notes          |
| -------------------- | --------- | ------ | --------- | -------------- |
| `/api/activity-logs` | GET, POST | ✅     | ✅ Active | **REFACTORED** |

### Accounting Details (`/api/accounting-details`)

| Endpoint                  | Method | Status | Usage     | Notes          |
| ------------------------- | ------ | ------ | --------- | -------------- |
| `/api/accounting-details` | GET    | ✅     | ✅ Active | **REFACTORED** |

### Manufacturers (`/api/manufacturers`)

| Endpoint             | Method | Status | Usage     | Notes          |
| -------------------- | ------ | ------ | --------- | -------------- |
| `/api/manufacturers` | GET    | ✅     | ✅ Active | **REFACTORED** |

### Location Aggregation (`/api/locationAggregation`)

| Endpoint                   | Method | Status | Usage     | Notes                                                |
| -------------------------- | ------ | ------ | --------- | ---------------------------------------------------- |
| `/api/locationAggregation` | GET    | ✅     | ✅ Active | **REFACTORED** - Business logic extracted to helpers |

### Test Routes (`/api/test`, `/api/test-current-user`, `/api/test-activity-log`)

| Endpoint                 | Method | Status | Usage      | Notes                               |
| ------------------------ | ------ | ------ | ---------- | ----------------------------------- |
| `/api/test/create-user`  | POST   | ❌     | ❌ DELETED | Deleted - not used in codebase      |
| `/api/test-current-user` | GET    | ✅     | ✅ Active  | **REFACTORED** - Used in login page |
| `/api/test-activity-log` | GET    | ❌     | ❌ DELETED | Deleted - not used in codebase      |

---

## Helper Files Status (`app/api/lib/helpers/`)

| File                              | Status | Usage     | Notes                                       |
| --------------------------------- | ------ | --------- | ------------------------------------------- |
| `accountingDetails.ts`            | ✅     | ✅ Active | Used by accounting details API              |
| `activityLogger.ts`               | ✅     | ✅ Active | Used across multiple APIs                   |
| `analytics.ts`                    | ✅     | ✅ Active | Used by analytics APIs                      |
| `auth.ts`                         | ✅     | ✅ Active | Used by auth APIs                           |
| `cacheUtils.ts`                   | ✅     | ✅ Active | Used in `locationAggregation/route.ts`      |
| `collectionRecalculation.ts`      | ✅     | ✅ Active | Used by collection report APIs              |
| `collectionReportBackend.ts`      | ✅     | ✅ Active | Used by collection report APIs              |
| `collectionReportCalculations.ts` | ✅     | ✅ Active | Used by collection report APIs              |
| `collectionReportService.ts`      | ✅     | ✅ Active | Used by collection report APIs              |
| `collectionReportQueries.ts`      | ✅     | ✅ Active | Used by collection report APIs              |
| `collectionReportCreation.ts`     | ✅     | ✅ Active | Used by collection report APIs              |
| `collectionReportOperations.ts`   | ✅     | ✅ Active | Used by collection report APIs              |
| `collectionIssueChecker.ts`       | ✅     | ✅ Active | Used by collection report APIs              |
| `meterSync.ts`                    | ✅     | ✅ Active | Used by collection report APIs              |
| `sasTimesFix.ts`                  | ✅     | ✅ Active | Used by collection report APIs              |
| `locationCurrencyConversion.ts`   | ✅     | ✅ Active | Used by location aggregation API            |
| `currencyHelper.ts`               | ✅     | ✅ Active | Used for currency conversion                |
| `licenseeFilter.ts`               | ✅     | ✅ Active | Used across multiple APIs                   |
| `licensees.ts`                    | ✅     | ✅ Active | Used by licensees API                       |
| `locationAggregation.ts`          | ✅     | ✅ Active | Used by location aggregation APIs           |
| `meters/aggregations.ts`          | ✅     | ✅ Active | Used by meters report API                   |
| `metersReport.ts`                 | ✅     | ✅ Active | Used by meters report API                   |
| `metersReportCurrency.ts`         | ✅     | ✅ Active | Used by meters report API                   |
| `profileValidation.ts`            | ✅     | ✅ Active | Used by auth and profile APIs               |
| `reports.ts`                      | ✅     | ✅ Active | Used by reports APIs                        |
| `top-performing.ts`               | ✅     | ✅ Active | Used by metrics APIs                        |
| `topMachines.ts`                  | ✅     | ✅ Active | Used by analytics/top-machines APIs         |
| `userMetrics.ts`                  | ✅     | ✅ Active | Used by metrics/metricsByUser API           |
| `hourlyTrends.ts`                 | ✅     | ✅ Active | Used by metrics/hourly-trends API           |
| `meterTrends.ts`                  | ✅     | ✅ Active | Used by metrics/meters API                  |
| `trends.ts`                       | ✅     | ✅ Active | Used by analytics trends APIs               |
| `manufacturerPerformance.ts`      | ✅     | ✅ Active | Used by analytics/manufacturer-performance  |
| `logistics.ts`                    | ✅     | ✅ Active | Used by analytics/logistics API             |
| `checkAllIssues.ts`               | ✅     | ✅ Active | Used by collection-reports/check-all-issues |
| `fixReportOperations.ts`          | ✅     | ✅ Active | Used by collection-reports/fix-report       |
| `machineCollectionHistoryFix.ts`  | ✅     | ✅ Active | Used by fix-machine-collection-history      |
| `bulkSasTimesFix.ts`              | ✅     | ✅ Active | Used by fix-all-sas-times                   |
| `bulkReportsFix.ts`               | ✅     | ✅ Active | Used by fix-all-reports                     |
| `bulkCollectionHistoryFix.ts`     | ✅     | ✅ Active | Used by fix-all-collection-history          |
| `machineInvestigation.ts`         | ✅     | ✅ Active | Used by investigate-machine                 |
| `reportHistoryUpdate.ts`          | ✅     | ✅ Active | Used by [reportId]/update-history           |
| `adminRepairSasTimes.ts`          | ✅     | ✅ Active | Used by admin/repair-sas-times              |
| `adminAuthMetrics.ts`             | ✅     | ✅ Active | Used by admin/auth/metrics                  |
| `adminAuthEvents.ts`              | ✅     | ✅ Active | Used by admin/auth/events                   |
| `users.ts`                        | ✅     | ✅ Active | Used by users API                           |
| `locationTrends.ts`               | ✅     | ✅ Active | Used by analytics/location-trends           |
| `machineHourly.ts`                | ✅     | ✅ Active | Used by analytics/machine-hourly            |

---

## Summary Statistics

- **Total API Routes:** 130 route files (counting HTTP methods/endpoints: ~150+)
- **Properly Formatted:** 145
- **STALE (Marked for Review/Deletion):** 0
- **Needs Refactoring:** 0
- **Remaining to Refactor:** ~15-20
  - ✅ `/api/reports/meters` (reference example)
  - ✅ `/api/auth/login`
  - ✅ `/api/auth/logout`
  - ✅ `/api/auth/current-user`
  - ✅ `/api/auth/token`
  - ✅ `/api/auth/clear-all-tokens`
  - ✅ `/api/auth/refresh`
  - ✅ `/api/auth/refresh-token`
  - ✅ `/api/users` (GET, POST, PUT, DELETE)
  - ✅ `/api/users/[id]` (GET, PUT)
  - ✅ `/api/users/check-username`
  - ✅ `/api/licensees` (GET, POST, PUT, DELETE)
  - ✅ `/api/countries`
  - ✅ `/api/collectors`
  - ✅ `/api/rates`
  - ✅ `/api/manufacturers`
  - ✅ `/api/profile` (PUT)
  - ✅ `/api/gaming-locations` (GET)
  - ✅ `/api/admin/reconnect-db` (GET, POST)
  - ✅ `/api/activity-logs` (GET, POST)
  - ✅ `/api/accounting-details`
  - ✅ `/api/sessions` (GET)
  - ✅ `/api/feedback` (GET, POST)
  - ✅ `/api/members-summary`
  - ✅ `/api/bill-validator/[machineId]`
  - ✅ `/api/schedulers` (GET)
  - ✅ `/api/dashboard/totals`
  - ✅ `/api/reports/daily-counts`
  - ✅ `/api/locations/search`
  - ✅ `/api/locations/search-all`
  - ✅ `/api/reports/locations`
  - ✅ `/api/reports/machines`
- **Needs Refactoring:** ~144
- **Potentially Stale:** ~7 (marked for review)

---

## Next Steps

1. ✅ Create tracking document
2. 🔄 Verify usage of potentially stale endpoints
3. ⏳ Refactor APIs starting with most-used endpoints
4. ⏳ Refactor helper files that need updates
5. ⏳ Remove confirmed stale endpoints

---

## Notes

- Reference example: `app/api/reports/meters/route.ts` follows all structure requirements
- Most APIs need file-level JSDoc and step-by-step comments
- Some APIs may need helper function extraction
- Test routes should be reviewed for removal before production

---

## Refactoring Progress Summary

### Completed Refactorings (7 APIs)

1. ✅ `/api/auth/login` - Full refactoring with step-by-step comments
2. ✅ `/api/auth/logout` - Full refactoring with step-by-step comments
3. ✅ `/api/auth/current-user` - Full refactoring with step-by-step comments
4. ✅ `/api/auth/token` - Full refactoring with step-by-step comments
5. ✅ `/api/auth/clear-all-tokens` - Full refactoring with step-by-step comments
6. ✅ `/api/users/[id]` - GET and PUT handlers refactored
7. ✅ `/api/reports/meters` - Reference example (already properly formatted)

### Helper Files Status

- ✅ **All Helper Files Active:** All helper files in `app/api/lib/helpers/` are actively used
- ✅ `cacheUtils.ts` - Used in `locationAggregation/route.ts` for caching location aggregation results

### Stale APIs Identified (7 endpoints)

These APIs have no usage found in the codebase and should be reviewed for deletion:

1. `/api/auth/forgot-password` - No usage found
2. `/api/auth/clear-session` - No usage found
3. `/api/auth/clear-token` - No usage found
4. `/api/members/debug` - No usage found
5. `/api/mqtt/test` - Only mentioned in docs
6. `/api/firmwares/migrate` - Only mentioned in docs
7. `/api/test/*` routes - Test routes (3 endpoints)

---

## How to Continue Refactoring

### Step-by-Step Process

1. **Select an API route** from the "Needs Refactoring" list above
2. **Read the current implementation** to understand its logic
3. **Apply the structure template:**
   - Add file-level JSDoc with route description and features
   - Add handler-level JSDoc with flow documentation
   - Add step-by-step comments with visual separators
   - Add performance tracking (`startTime`)
   - Ensure proper error handling
4. **Extract complex logic** to helper files if needed (>20-30 lines)
5. **Update the tracker** to mark the route as ✅ DONE
6. **Test the refactored route** to ensure functionality is preserved

### Priority Order

**High Priority (Most Used):**

1. Dashboard APIs (`/api/dashboard/*`)
2. Locations APIs (`/api/locations/*`)
3. Machines/Cabinets APIs (`/api/machines/*`, `/api/cabinets/*`)
4. Collection Reports APIs (`/api/collection-report/*`, `/api/collection-reports/*`)
5. Collections APIs (`/api/collections/*`)

**Medium Priority:** 6. Reports APIs (`/api/reports/*`) 7. Analytics APIs (`/api/analytics/*`) 8. Metrics APIs (`/api/metrics/*`) 9. Members APIs (`/api/members/*`) 10. Sessions APIs (`/api/sessions/*`)

**Lower Priority:** 11. SMIB/MQTT APIs (`/api/smib/*`, `/api/mqtt/*`) 12. Admin/System APIs (`/api/admin/*`, `/api/activity-logs/*`) 13. Other utility APIs

### Template for Refactoring

```typescript
/**
 * [Route Name] API Route
 *
 * This route handles [brief description of what the route does].
 * It supports:
 * - Feature 1
 * - Feature 2
 * - Feature 3
 *
 * @module app/api/[path]/route
 */

import { helper1, helper2 } from '@/app/api/lib/helpers/[feature]';
import { type Type1, type Type2 } from '@/app/api/lib/types';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main [GET/POST/etc] handler for [route name]
 *
 * Flow:
 * 1. Step 1 description
 * 2. Step 2 description
 * 3. Step 3 description
 * ...
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: [Clear step description]
    // ============================================================================
    // Implementation here

    // ============================================================================
    // STEP 2: [Clear step description]
    // ============================================================================
    // Implementation here

    // Continue with numbered steps...

    return NextResponse.json(response);
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Server Error';
    console.error(`[API Name] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

### Checklist for Each Refactoring

- [ ] File-level JSDoc added
- [ ] Handler-level JSDoc with flow documentation added
- [ ] Step-by-step comments with visual separators added
- [ ] Performance tracking (`startTime`) added
- [ ] Error handling improved with duration logging
- [ ] Complex logic extracted to helpers (if needed)
- [ ] Tracker updated
- [ ] Route tested

---

## Next Actions

1. **Review stale APIs** - Confirm they can be safely deleted
2. **Continue refactoring** - Work through APIs systematically
3. **Update tracker** - Mark progress as you go
4. **Test thoroughly** - Ensure refactored APIs maintain functionality
