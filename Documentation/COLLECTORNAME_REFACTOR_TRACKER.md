# CollectorName Field Refactor Tracker

**Goal**: Remove `collectorName` field from most places and only use `collector` field. `collectorName` should only be used for display purposes on the collection report page and as the last fallback in search queries.

**Date Started**: December 5, 2025

---

## Summary Statistics
- **Total Files with `collectorName`**: 27 files
- **Total Occurrences**: 86 references
- **Status**: ✅ **COMPLETED** - Backend refactored, frontend updated
- **Date Completed**: December 5, 2025

---

## Refactoring Rules

### ✅ **KEEP `collectorName`**:
1. **Display only** on collection reports page (frontend)
2. **Last fallback** in search queries (after `collector`)
3. **Database schema** (keep field but don't use for writes)

### ❌ **REMOVE `collectorName`**:
1. All write operations (use `collector` instead)
2. All validation rules
3. All API payloads (except as optional/deprecated)
4. All frontend forms and modals
5. All aggregation pipelines (use `collector` instead)

---

## File Breakdown

### 🔴 Backend - API Routes (Priority: HIGH)

#### 1. `app/api/collection-report/[reportId]/route.ts` - 6 occurrences
- [ ] Line ~240: `if (body.collectorName !== undefined)` - **REMOVE**: Write operation check
- [ ] `field: 'collectorName'` - **REMOVE**: Change tracking field
- [ ] `oldValue: existingReport.collectorName` - **REMOVE**: Change comparison
- [ ] `newValue: body.collectorName` - **REMOVE**: Change comparison
- [ ] Template literals with `collectorName` (2x) - **REMOVE**: Logging/messaging
- **Action**: Stop accepting `collectorName` in request body, don't track changes

#### 2. `app/api/collectionReport/route.ts` - 4 occurrences
- [ ] `field: 'collectorName'` - **REMOVE**: Field tracking
- [ ] `newValue: body.collectorName` - **REMOVE**: Value assignment
- [ ] `body.collectorName` - **REMOVE**: Direct access
- [ ] Template literal with `collectorName` - **REMOVE**: Logging
- **Action**: Remove from payload handling

#### 3. `app/api/lib/helpers/collectionReports.ts` - 2 occurrences
- [ ] Comment: `// 2. collectorName (case-insensitive parti...` - **UPDATE**: Change to last fallback
- [ ] `{ collectorName: { $regex: searchTerm, $o...` - **KEEP**: Move to last position in search
- **Action**: Keep for search but make it LAST fallback (after `collector`)

---

### 🔴 Backend - Helpers (Priority: HIGH)

#### 4. `app/api/lib/helpers/collectionIssueChecker.ts` - 3 occurrences
- [ ] `collectorName: string;` - **EVALUATE**: Type definition
- [ ] `collectorName: mostRecentReport.collect...` (2x) - **REMOVE**: Use `collector` instead
- **Action**: Update type to use `collector`, remove assignments

#### 5. `app/api/lib/helpers/collectionReportBackend.ts` - 1 occurrence
- [ ] `collector: (doc.collectorName as string) ||` - **REMOVE**: Use `doc.collector` instead
- **Action**: Change to read from `collector` field

#### 6. `app/api/lib/helpers/collectionReportCreation.ts` - 1 occurrence
- [ ] `'collectorName',` - **REMOVE**: Required field validation
- **Action**: Remove from required fields list

#### 7. `app/api/lib/helpers/collectionReportService.ts` - 3 occurrences
- [ ] `collectorName?: string;` - **EVALUATE**: Type definition
- [ ] `: (doc.collectorName as string) || "";` - **REMOVE**: Use `doc.collector`
- [ ] `...hasCollectorDetails && !!doc.collectorN...` - **REMOVE**: Use `doc.collector`
- **Action**: Update to use `collector` field

---

### 🟡 Backend - Models & Schema (Priority: MEDIUM)

#### 8. `app/api/lib/models/collectionReport.ts` - 1 occurrence
- [ ] `collectorName: { type: String},` - **KEEP**: Schema field (for legacy data)
- **Action**: Keep schema but mark as optional/deprecated in comments

---

### 🔴 Backend - Validation (Priority: HIGH)

#### 9. `app/api/lib/utils/validation.ts` - 1 occurrence
- [ ] `if (!payload.collectorName) errors.push('C..` - **REMOVE**: Validation check
- **Action**: Remove validation, validate `collector` instead

---

### 🔴 Frontend - Components (Priority: HIGH)

#### 10. `components/collectionReport/CollectorScheduleCards.tsx` - 1 occurrence
- [ ] `...schedule.collector || schedule.collectorN..` - **REMOVE**: Fallback logic
- **Action**: Use only `schedule.collector`

#### 11. `components/collectionReport/CollectorScheduleTable.tsx` - 1 occurrence
- [ ] `...schedule.collector || schedule.collectorN..` - **REMOVE**: Fallback logic
- **Action**: Use only `schedule.collector`

#### 12. `components/collectionReport/NewCollectionModal.tsx` - 3 occurrences
- [ ] `const getCollectorName = useCallback()...` - **REMOVE**: Function declaration
- [ ] `collector: getCollectorName() || ",` - **UPDATE**: Use `userId` directly
- [ ] `getCollectorName,` - **REMOVE**: Dependency
- **Action**: Remove function, use `collector: userId` directly

#### 13. `components/collectionReport/MobileCollectionModal.tsx` - 3 occurrences
- [ ] `collectorName: getUserDisplayName(user),` - **REMOVE**: Property assignment
- [ ] `hasCollectorName: !!payload.collectorNa...` (2x) - **REMOVE**: Validation checks
- **Action**: Remove all references, use `collector` with user ID

#### 14. `components/collectionReport/MobileEditCollectionModal.tsx` - 1 occurrence
- [ ] `collectorName: getUserDisplayName(user),` - **REMOVE**: Property assignment
- **Action**: Remove property, use `collector` with user ID

---

### 🟢 Frontend - Display (Priority: LOW - KEEP)

#### 15. Collection Reports Display Page
- [ ] **KEEP**: Use `collectorName` for display purposes ONLY
- [ ] **Action**: Fetch `collectorName` from backend for display, but never send it in writes

---

### 🟡 Helper Files (Priority: MEDIUM)

#### 16. `lib/helpers/collectionReport.ts` - 2 occurrences
- [ ] `collector: (doc.collectorName as string)` - **REMOVE**: Use `doc.collector`
- [ ] `...string>(CollectionReport, "collectorNa...` - **REMOVE**: Distinct query
- **Action**: Update to use `collector` field

---

### 📄 Documentation (Priority: LOW)

#### 17. `Documentation/backend/cabinets-api.md` - 1 occurrence
- [ ] `"collectorName": "John Smith"` - **UPDATE**: Mark as deprecated

#### 18. `Documentation/backend/collection-report-details.md` - 1 occurrence
- [ ] `collectorName: string;` - **UPDATE**: Mark as deprecated/display-only

#### 19. `Documentation/backend/collection-report.md` - 5 occurrences
- [ ] Multiple references - **UPDATE**: Mark as deprecated, document to use `collector`

#### 20. `Documentation/backend/machines-api.md` - 1 occurrence
- [ ] `"collectorName":"John Smith"` - **UPDATE**: Mark as deprecated

#### 21. `Documentation/collection-report.md` - 1 occurrence
- [ ] `collectorName: string;` - **UPDATE**: Mark as deprecated

---

### 📊 Data Files (Priority: INFO ONLY)

#### 22. `migration-report.json` - 7 occurrences
- [ ] **INFO ONLY**: Historical migration data
- **Action**: No changes needed

---

## Implementation Order

### Phase 1: Backend API Routes & Validation (CRITICAL) ✅ COMPLETED
1. ✅ Update search query in `collectionReports.ts` - move `collectorName` to LAST position
2. ✅ Remove `collectorName` validation from `validation.ts` - now validates `collector`
3. ✅ Remove `collectorName` from `collectionReportCreation.ts` required fields - now requires `collector`
4. ✅ Stop accepting `collectorName` in `[reportId]/route.ts` - tracks `collector` instead
5. ✅ Stop accepting `collectorName` in `collectionReport/route.ts` - logs `collector`

### Phase 2: Backend Helpers & Processing ✅ COMPLETED
6. ✅ Update `collectionReportBackend.ts` to use `collector` (added `collectorFullName` for display)
7. ✅ Update `collectionReportService.ts` to use `collector` (added `collectorFullName` for display)
8. ✅ Update `collectionIssueChecker.ts` to use `collector`
9. ✅ Update `lib/helpers/collectionReport.ts` to use `collector` (added `collectorFullName` for display)

### Phase 3: Frontend Components ✅ COMPLETED
10. ✅ Remove from `NewCollectionModal.tsx` - now uses `userId` directly
11. ✅ Already removed from `MobileCollectionModal.tsx` (not found)
12. ✅ Already removed from `MobileEditCollectionModal.tsx` (not found)
13. ✅ Remove from `CollectorScheduleCards.tsx` - uses `collector` only
14. ✅ Remove from `CollectorScheduleTable.tsx` - uses `collector` only

### Phase 4: Documentation ⏭️ SKIPPED
15. ⏭️ Documentation files left as-is (low priority)

### Phase 5: Testing & Verification ✅ READY
16. ✅ Collection report creation uses `collector` (user ID)
17. ✅ Collection report search: `collector` → `locationReportId` → `_id` → `collectorName` (last)
18. ✅ Collection report display: `collectorFullName` available for display
19. ✅ No write operations use `collectorName` - all use `collector`

---

## Search Query Order (FINAL)

```typescript
// Correct order for collection report search
query.$or = [
  { collector: { $regex: searchTerm, $options: 'i' } },           // 1st: User ID
  { locationReportId: { $regex: searchTerm, $options: 'i' } },   // 2nd: Report ID
  { _id: { $regex: searchTerm, $options: 'i' } },                // 3rd: Document ID
  { collectorName: { $regex: searchTerm, $options: 'i' } },      // 4th: LAST FALLBACK (display name)
];
```

---

## Notes
- `collector` field should store the **user ID**
- `collectorName` is derived/computed for **display purposes only**
- Backend should never write `collectorName` - it should be computed from `collector` (user ID) when needed
- Keep schema field for backward compatibility with existing data

