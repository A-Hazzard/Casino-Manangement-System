# rel.licencee Usage by Schema

This document categorizes all `rel.licencee` references in the codebase by schema type.

## ✅ USER Schema - COMPLETED (All Removed)

All user-related `rel.licencee` references have been removed and replaced with `assignedLicensees`.

**Files Updated:**
- `app/api/users/route.ts`
- `app/api/activity-logs/route.ts` (user queries only)
- `components/administration/UserModal.tsx`
- `components/administration/UserDetailsModal.tsx`
- `components/administration/AddUserModal.tsx`
- `components/layout/Header.tsx`
- `app/(auth)/login/page.tsx`
- `app/collection-report/page.tsx`
- All user-related helpers and types

---

## 🔒 GAMINGLOCATIONS Schema - DO NOT CHANGE

These files use `rel.licencee` for **GamingLocations schema** and must remain unchanged.

### API Routes - Location Queries

#### 1. `app/api/locations/route.ts` - **4 matches**
- **Line 138**: Projection: `'rel.licencee': 1` - Location projection
- **Line 148**: `loc.rel?.licencee` - Extracting licensee from location object
- **Line 299**: `rel.licencee` - Location update field
- **Line 354**: `'rel.licencee'` - Activity log field for location
- **Line 568**: `rel.licencee` - Location update field
- **Line 734**: `locationToDelete.rel?.licencee` - Location deletion log
- **Usage**: Querying/updating GamingLocations by licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 2. `app/api/locations/[locationId]/route.ts` - **2 matches**
- **Usage**: Location-specific queries by licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 3. `app/api/locations/search/route.ts` - **2 matches**
- **Usage**: Location search filtering by licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 4. `app/api/locations/search-all/route.ts` - **1 match**
- **Usage**: Location search by licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 5. `app/api/gaming-locations/route.ts` - **3 matches**
- **Line 62**: `query['rel.licencee'] = { $in: licenseeArray }` - Location query filter
- **Line 66**: `query['rel.licencee'] = licensee` - Single licensee filter
- **Line 75**: `'rel.licencee': 1` - Location projection
- **Line 84**: `loc.rel?.licencee` - Extracting licensee from location
- **Usage**: GamingLocations collection queries
- **Status**: ✅ CORRECT - Keep as-is

### Backend Helpers - Location Filtering

#### 6. `app/api/lib/helpers/licenseeFilter.ts` - **6 matches**
- **Line 162**: `licenseeFieldPath: string = 'rel.licencee'` - Default path for location queries
- **Line 185**: `licenseeFieldPath: string = 'rel.licencee'` - Pipeline filter default
- **Line 263**: `'rel.licencee': { $in: userAccessibleLicensees }` - GamingLocations query
- **Line 269**: `'rel.licencee': 1` - Location projection
- **Line 285**: `loc.rel?.licencee` - Location licensee extraction
- **Line 416**: Comment: `// rel.licencee is stored as a String, so we can query directly`
- **Line 419**: `'rel.licencee': licenseeId` - GamingLocations query
- **Usage**: Filtering GamingLocations by licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 7. `app/api/lib/helpers/locationAggregation.ts` - **1 match**
- **Line 80**: `'rel.licencee': licencee` - GamingLocations query filter
- **Usage**: Location aggregation by licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 8. `lib/helpers/locationAggregation.ts` - **1 match**
- **Line 41**: `'rel.licencee': licencee` - GamingLocations query filter
- **Usage**: Frontend location aggregation helper
- **Status**: ✅ CORRECT - Keep as-is

### Backend Helpers - Collection Reports (Location Data)

#### 9. `app/api/lib/helpers/collectionReports.ts` - **1 match**
- **Line 71**: `'rel.licencee': { $in: licensees }` - GamingLocations query
- **Usage**: Finding locations for collection reports
- **Status**: ✅ CORRECT - Keep as-is

#### 10. `app/api/lib/helpers/collectionReportQueries.ts` - **1 match**
- **Line 300**: `'rel.licencee': { $in: userLicensees }` - GamingLocations query
- **Usage**: Collection report location queries
- **Status**: ✅ CORRECT - Keep as-is

#### 11. `app/api/lib/helpers/collectionReportService.ts` - **1 match**
- **Line 74**: `"locationDetails.rel.licencee": licenceeId` - Aggregation match on location data
- **Usage**: Filtering collection reports by location's licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 12. `app/api/lib/helpers/collectionReportBackend.ts` - **1 match**
- **Line 65**: `'locationDetails.rel.licencee': licenceeId` - Aggregation match on location data
- **Usage**: Backend collection report filtering by location licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 13. `lib/helpers/collectionReport.ts` - **6 matches**
- **Line 65**: `"locationDetails.rel.licencee": licenceeId` - Aggregation match
- **Line 181**: Comment: `// Aggregate: join with gaminglocations and filter by rel.licencee`
- **Line 192**: `{ $match: { "locationDetails.rel.licencee": licenceeId } }` - Location filter
- **Line 237**: `{ $match: { "locationDetails.rel.licencee": licenceeId } }` - Location filter
- **Line 294**: `{ $match: { "locationDetails.rel.licencee": licencee, ...match } }` - Location filter
- **Line 383**: `{ $match: { "locationDetails.rel.licencee": licencee, ...match } }` - Location filter
- **Usage**: Frontend collection report helpers filtering by location licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 14. `lib/helpers/collectionReportBackend.ts` - **1 match**
- **Line 90**: `'locationDetails.rel.licencee': licenceeId` - Aggregation match
- **Usage**: Frontend collection report backend helper
- **Status**: ✅ CORRECT - Keep as-is

### Backend Helpers - Analytics & Reports (Location Data)

#### 15. `app/api/lib/helpers/analytics.ts` - **6 matches**
- **Line 49**: `'locationDetails.rel.licencee': licensee` - Aggregation match on location data
- **Line 151**: `'locationDetails.rel.licencee': licensee` - Match stage for location filtering
- **Line 228**: `'locationInfo.rel.licencee': licensee` - Location info filtering
- **Line 317**: `'locationDetails.rel.licencee': selectedLicensee` - Location filter
- **Line 540**: `'locationDetails.rel.licencee': licensee` - Location filter
- **Line 809**: `'locationDetails.rel.licencee': licensee` - Location filter
- **Line 951**: `location.rel?.licencee` - Extracting licensee from location object
- **Usage**: Analytics aggregations filtering by location's licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 16. `lib/helpers/analytics.ts` - **3 matches**
- **Line 45**: `'locationDetails.rel.licencee': licensee` - Aggregation match
- **Line 146**: `'locationDetails.rel.licencee': licensee` - Match stage
- **Line 223**: `'locationInfo.rel.licencee': licensee` - Location info filter
- **Usage**: Frontend analytics helpers
- **Status**: ✅ CORRECT - Keep as-is

#### 17. `app/api/lib/helpers/meterTrends.ts` - **2 matches**
- **Line 342**: `location.rel?.licencee` - Extracting licensee from location object
- **Line 615**: `locationQuery['rel.licencee'] = licencee` - GamingLocations query filter
- **Usage**: Meter trends filtering by location licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 18. `app/api/lib/helpers/topMachines.ts` - **1 match**
- **Line 234**: `'locationDetails.rel.licencee': licencee` - Aggregation match on location data
- **Usage**: Top machines filtering by location licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 19. `app/api/lib/helpers/machineHourly.ts` - **2 matches**
- **Line 71**: `'locationDetails.rel.licencee': licencee` - Aggregation match on location data
- **Line 257**: `loc.rel?.licencee` - Extracting licensee from location object
- **Usage**: Machine hourly data filtering by location licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 20. `app/api/lib/helpers/locationTrends.ts` - **2 matches**
- **Line 101**: `'locationDetails.rel.licencee': licencee` - Aggregation match on location data
- **Line 208**: `loc.rel?.licencee` - Extracting licensee from location object
- **Usage**: Location trends filtering by location licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 21. `app/api/lib/helpers/trends.ts` - **4 matches**
- **Line 70**: `'locationDetails.rel.licencee': licencee` - Aggregation match
- **Line 160**: `'locationDetails.rel.licencee': licencee` - Aggregation match
- **Line 496**: `'locationDetails.rel.licencee': licencee` - Aggregation match
- **Line 621**: `'locationDetails.rel.licencee': licencee` - Aggregation match
- **Usage**: Trends filtering by location licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 22. `app/api/lib/helpers/manufacturerPerformance.ts` - **1 match**
- **Line 124**: `'locationDetails.rel.licencee': licencee` - Aggregation match on location data
- **Usage**: Manufacturer performance filtering by location licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 23. `app/api/lib/helpers/hourlyTrends.ts` - **1 match**
- **Line 206**: `'locationDetails.rel.licencee': licencee` - Aggregation match on location data
- **Usage**: Hourly trends filtering by location licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 24. `app/api/lib/helpers/metersReport.ts` - **1 match**
- **Line 372**: `.find({ 'rel.licencee': licencee })` - GamingLocations query
- **Usage**: Meters report location filtering
- **Status**: ✅ CORRECT - Keep as-is

#### 25. `app/api/lib/helpers/top-performing.ts` - **2 matches**
- **Line 74**: `'locationDetails.rel.licencee': licensee` - Aggregation match
- **Line 151**: `'locationDetails.rel.licencee': licensee` - Aggregation match
- **Usage**: Top performing filtering by location licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 26. `app/api/lib/helpers/meters/aggregations.ts` - **4 matches**
- **Line 164**: `'rel.licencee': licencee` - GamingLocations lookup match
- **Line 301**: `{ $isArray: ['$locationDetails.rel.licencee'] }` - Location data check
- **Line 302**: `{ $arrayElemAt: ['$locationDetails.rel.licencee', 0] }` - Location data extraction
- **Line 303**: `'$locationDetails.rel.licencee'` - Location data reference
- **Usage**: Meters aggregation filtering by location licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 27. `lib/helpers/meters/aggregations.ts` - **1 match**
- **Line 293**: `'locationDetails.rel.licencee': licencee` - Aggregation match
- **Usage**: Frontend meters aggregation helper
- **Status**: ✅ CORRECT - Keep as-is

### API Routes - Reports (Location Data)

#### 28. `app/api/reports/machines/route.ts` - **20 matches**
- **Line 256**: `locationMatchStage['rel.licencee'] = licencee` - Location match stage
- **Line 355**: `'rel.licencee' in locationMatchStage` - Location match check
- **Line 359**: `'locationDetails.rel.licencee'` - Aggregation match on location data
- **Line 407**: `'rel.licencee' in locationMatchStage` - Location match check
- **Multiple other matches**: All related to location filtering in machine reports
- **Usage**: Machine reports filtering by location licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 29. `app/api/reports/locations/route.ts` - **2 matches**
- **Usage**: Location reports by licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 30. `app/api/machines/aggregation/route.ts` - **1 match**
- **Usage**: Machine aggregation by location licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 31. `app/api/machines/[machineId]/route.ts` - **1 match**
- **Usage**: Machine queries by location licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 32. `app/api/movement-requests/route.ts` - **1 match**
- **Usage**: Movement requests by location licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 33. `app/api/sessions/route.ts` - **2 matches**
- **Usage**: Sessions by location licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 34. `app/api/sessions/[sessionId]/[machineId]/events/route.ts` - **2 matches**
- **Usage**: Session events by location licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 35. `app/api/members/summary/route.ts` - **1 match**
- **Usage**: Members summary by location licensee
- **Status**: ✅ CORRECT - Keep as-is

#### 36. `app/api/metrics/top-performers/route.ts` - **1 match**
- **Usage**: Top performers by location licensee
- **Status**: ✅ CORRECT - Keep as-is

### Frontend Components (Location Data)

#### 37. `components/administration/UserDetailsModal.tsx` - **1 match**
- **Line 248**: `loc.rel?.licencee` - Extracting licensee from location object
- **Usage**: Displaying location licensee in user details modal
- **Status**: ✅ CORRECT - Keep as-is

#### 38. `components/layout/ProfileModal.tsx` - **1 match**
- **Line 348**: `location.rel?.licencee` - Extracting licensee from location object
- **Usage**: Profile modal location display
- **Status**: ✅ CORRECT - Keep as-is

#### 39. `components/ui/MapPreview.tsx` - **1 match**
- **Line 296**: `metadata.rel?.licencee` - Location metadata licensee
- **Usage**: Map preview location metadata
- **Status**: ✅ CORRECT - Keep as-is

#### 40. `components/ui/locations/EditLocationModal.tsx` - **1 match**
- **Usage**: Editing location licensee
- **Status**: ✅ CORRECT - Keep as-is

### Models & Types

#### 41. `app/api/lib/models/gaminglocations.ts` - **1 match**
- **Usage**: GamingLocations schema definition
- **Status**: ✅ CORRECT - Keep as-is

#### 42. `lib/types/location.ts` - **3 matches**
- **Usage**: Location type definitions
- **Status**: ✅ CORRECT - Keep as-is

#### 43. `lib/types/mongo.ts` - **1 match**
- **Usage**: MongoDB query type definitions
- **Status**: ✅ CORRECT - Keep as-is

### Test Files

#### 44. `test/verify-correct-total.js` - **2 matches**
- **Usage**: Testing location queries
- **Status**: ✅ CORRECT - Keep as-is

#### 45. `test/investigate-location-totals.js` - **1 match**
- **Usage**: Location investigation test
- **Status**: ✅ CORRECT - Keep as-is

#### 46. Other test files - **Multiple matches**
- **Usage**: Various location-related tests
- **Status**: ✅ CORRECT - Keep as-is

### Utilities

#### 47. `lib/utils/mongoQueries.ts` - **2 matches**
- **Usage**: MongoDB query utilities for locations
- **Status**: ✅ CORRECT - Keep as-is

---

## Summary

- **Total `rel.licencee` references**: ~272
- **User schema references**: 0 (all removed ✅)
- **GamingLocations schema references**: ~272 (all correct ✅)
- **Other schema references**: 0

**All remaining `rel.licencee` references are for GamingLocations schema and must remain unchanged.**

