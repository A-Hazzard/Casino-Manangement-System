# Evolution1 CMS — Latest Work Summary

**Last Updated:** 2026-05-11  
**Status:** Collection Report V2 Feature Complete (Google Drive OAuth2) ✅

---

## What You Asked For

### 1. **Activity Logging Improvements** (Collection Report Modals)

> "When creating or editing in either modals whenever we add machines to the list the activity log doesn't log the exact machine, meter in/out and previous values and if it was ram cleared"

**Problem:** The collection modals (new, edit, mobile variants) had vague or missing activity logs.

- Add-machine logs didn't include meter values, RAM clear status, or notes
- Update-machine logs passed whole objects instead of field-level diffs
- Mobile and edit modals had NO logging at all

**What I Did:**

- Enriched all four modal hooks with **detailed activity logs** including:
  - Machine name + serialNumber for identification
  - Meters in/out, previous in/out values
  - RAM clear status + RAM clear meter values if applicable
  - Notes field
  - For updates: field-by-field diff string (e.g., "MIn: 1200 → 1350, RAM Clear: No → Yes")
- Structured `previousData`/`newData` to contain only relevant meter fields (not entire collection objects)

**Files Modified:**

- `lib/hooks/collectionReport/useNewCollectionModal.ts` — added import of `logActivity` (already had callback), enriched both add (line ~752) and update (line ~871) logs
- `lib/hooks/collectionReport/useEditCollectionModal.ts` — imported `logActivity`, added logging after update (line 766) and add (line 890) operations
- `lib/hooks/collectionReport/useMobileCollectionModal.ts` — imported `logActivity`, added logging after add/update (line 763)
- `lib/hooks/collectionReport/useMobileEditCollectionModal.ts` — imported `logActivity`, added logging before state clear (line 591)

---

### 2. **Notes Column on Report Details Page**

> "Show a notes column on the report details page when i click into a report if at least 1 machine has a note, otherwise don't show the notes column, don't forget mobile components also and view"

**Problem:** Collection machines have a `notes` field stored in the database, but it wasn't displayed on the report details page. No type support, no API projection, no UI.

**What I Did:**

- Added `notes?: string` to `MachineMetric` type (the DTO returned by the details API)
- Updated `accountingDetails.ts` helper to project and include `notes` from the collection document
- Updated desktop table: added conditional `NOTES` header and cell (appears only when `hasNotes === true`)
- Updated mobile cards: notes row shown below SAS times only when the metric has notes

**Files Modified:**

- `lib/types/api/types.ts` — added `notes?: string` to `MachineMetric` type
- `app/api/lib/helpers/accountingDetails.ts` — added `notes: collection.notes` to returned metric object (line 619)
- `components/CMS/collectionReport/details/CollectionReportDetailsCollectionsTable.tsx`:
  - Added `hasNotes` check (line 165)
  - Desktop table: conditional `NOTES` column header (line 235) and cell (line 287-293)
  - Mobile cards: conditional notes row (line 361-366)

---

### 3. **Activity Log ObjectID Resolution**

> "When i go to the activity log on the administration page i see Machine followed by the \_id modify this section to scan all the activity logs and check if anything is in the objectid string format and if it is query and get the machine serialNumber and custom.name and resave the log with the right name serialNumber and custom name please, this query should always run in the background if the user is on the activity log page and put an indicator for only developers to see on top the page saying how much docs are being updated and update the progress every 5 seconds"

**Problem:** Activity logs sometimes have raw MongoDB ObjectID strings as `resourceName` (e.g., "507f1f77bcf86cd799439011") instead of human-readable machine names like "SN1234 [MyGame]".

**What I Did:**

- Created a new admin API endpoint that:
  - Finds all activity logs where `resourceName` matches the ObjectID regex (24-char hex string)
  - Batch-queries the Machine collection to resolve serialNumber + custom.name
  - Updates logs in place with the resolved name
  - Returns progress counts: `{ updated, total, remaining }`
  - Developer-only (requires `developer` role)
- Updated the admin Activity Logs table to:
  - Call the resolve endpoint immediately on component mount
  - Poll every 5 seconds while logs remain unresolved
  - Display a violet `[DEV]` progress banner at the top showing: "Resolving machine names: X updated this pass, Y remaining…"
  - Banner disappears when all logs are resolved
  - Auto-refreshes the logs table when updates occur

**Files Created & Modified:**

- `app/api/admin/resolve-machine-names/route.ts` — new GET endpoint, developer-only, processes 100 logs per call
- `components/CMS/administration/tables/AdministrationActivityLogsTable.tsx`:
  - Added `resolveProgress` state tracking (line 109-110)
  - Added polling effect (line 515-543)
  - Added developer-only progress banner in JSX (line 558-571)

---

---

### 6. **Collection Report V2 — Session-Based Capture Wizard**

> "Build a new V2 capture flow: session-based, one machine at a time, with photo capture, meter verification, and review/submit."

**What I Did:**

- Built **6 API routes** under `/api/collection-reports-v2/`:
  - `POST/GET sessions` — start a session (creates ReportedMachine docs) + list all sessions
  - `GET sessions/[sessionId]` — fetch full session detail with machines
  - `PATCH sessions/[sessionId]/submit` — submit all machines
  - `POST/PATCH machines` — create/update capture data (status, meters, base64 image)

- Built **inline capture wizard** (`CollectionReportV2SessionDetail.tsx`):
  - Machine-by-machine progression with progress bar
  - Photo capture via custom `CameraOverlay` (live feed + machine info overlay)
  - "Yes, they match" / "No, enter manually" toggle for meter verification
  - "Save & Next" → advances to next pending machine
  - Review phase: thumbnails, status badges, meter values, submit
  - Submitted view with success checkmark

- Built **custom CameraOverlay** (`CameraOverlay.tsx`):
  - Uses `navigator.mediaDevices.getUserMedia` for live camera feed
  - Overlays machine info (serial, name, manufacturer, meters in/out) at top
  - Capture button draws video frame to hidden canvas → exports as base64 JPEG
  - Falls back to `<input type="file" capture="environment">` when camera API unavailable
  - **Requires HTTPS** — `getUserMedia` is blocked on non-secure contexts

- Built **session list views** (`CollectionReportV2Desktop.tsx` / `CollectionReportV2Mobile.tsx`):
  - Desktop: table with session ID, location, status, machine counts, date
  - Mobile: card layout with same data
  - Skeleton loader for both

- Built **Start Session dialog** (`CollectionReportV2StartSessionDialog.tsx`):
  - Location selector → POST to create session → redirects to session detail page

- **Fixed** `params` Promise error (Next.js 15 requires `await params` in route handlers)
- **Fixed** 404 on session detail — POST route was returning machine data but NOT inserting into DB
- **Label** "Start Session" → "Start Collection Report" throughout

**HTTPS Setup for Mobile Testing:**

```bash
# Run with HTTPS (for camera access on mobile)
bun run dev:https
# or: next dev --experimental-https -H 0.0.0.0 -p 3000
# Access: https://192.168.0.39:3000 on mobile
# Accept self-signed cert warning → camera works
```

**Files Created (all new):**
- `app/api/collection-reports-v2/sessions/route.ts` — POST + GET sessions
- `app/api/collection-reports-v2/sessions/[sessionId]/route.ts` — GET session detail
- `app/api/collection-reports-v2/sessions/[sessionId]/submit/route.ts` — PATCH submit
- `app/api/collection-reports-v2/machines/route.ts` — POST + PATCH machines
- `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2SessionDetail.tsx` — main wizard
- `components/CMS/collectionReport/tabs/collection-v2/CameraOverlay.tsx` — camera with overlay
- `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2Desktop.tsx` — session list table
- `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2Mobile.tsx` — session list cards
- `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2StartSessionDialog.tsx` — start dialog
- `components/ui/skeletons/CollectionReportV2SessionsSkeleton.tsx` — skeleton

**Files Modified:**
- `app/api/lib/models/reportedMachines.ts` — added `imageData?: string` field
- `lib/constants/collection.ts` — added `collection-v2` tab config
- `lib/constants/maintenance.ts` — added `collection-v2` to maintenance config
- `components/CMS/collectionReport/CollectionReportPageContent.tsx` — V2 tab rendering, `isDeveloper` filter
- `next.config.ts` — added `allowedDevOrigins: ['192.168.0.39']`
- `package.json` — cleaned up scripts, fixed trailing comma

---

## Technical Notes

### Activity Logging Signature

All activity logs now use this signature from `newCollectionModalHelpers.ts`:

```typescript
logActivity(
  action: 'create' | 'update',
  resource: 'collection',
  resourceId: string,
  resourceName: string,  // human-readable name
  details: string,       // detailed change info
  userId: string,        // from user._id
  username: string,      // from user.username
  previousData?: object, // before state (relevant fields only)
  newData?: object       // after state (relevant fields only)
)
```

### ObjectID Detection

Pattern: `/^[a-fA-F0-9]{24}$/` (24 hexadecimal characters)

### Notes Field Availability

- Already stored in `Collection` schema as `notes: { type: String }`
- Now projected in API responses via `accountingDetails.ts`
- Now visible in UI when present on any machine in the report

---

### 4. **Shared Types Migration & Build Reconciliation**

> Standardize all core data structures into a single source of truth and eliminate all `any` usage.

**What I Did:**

- Migrated all core types (Models, Activity Logs, Machines, Reports, Movement) into `shared/types/`.
- expanded `CollectionData` with concrete fields to resolve `{}` type inference errors from Mongoose `.lean()` queries.
- Refactored Performance Charts and tooltips to use centralized `PerformanceMetrics` interfaces.
- Verified codebase with `bun run type-check` (passes clean).

**Files Modified:**

- `shared/types/reports.ts`, `shared/types/models.ts`
- All reporting components and aggregation helpers.

---

### 5. **Financial Color Coding Standardization**

> Implement consistent color coding (Green/Red/Neutral) across all reporting tabs.

**What I Did:**

- Standardized the Monthly Report tab (Desktop and Mobile) to match the Collection Report.
- Implemented `getGrossColorClass` for Drop, Win, Gross, and SAS Gross metrics.
- Updated `nextjs-rules.md` with a mandatory rule for financial data presentation.
- Created `type-safety.md` and rules `ARCHITECTURE.md` to define the project's engineering constitution.

**Files Modified:**

- `components/CMS/collectionReport/tabs/monthly/CollectionReportMonthlySummaryTable.tsx`
- `components/CMS/collectionReport/tabs/monthly/CollectionReportMonthlyDetailsTable.tsx`
- `components/CMS/collectionReport/tabs/monthly/CollectionReportMonthlyMobile.tsx`
- `.instructions/rules/nextjs-rules.md`, `.instructions/rules/type-safety.md`

---

## What's Working

✅ **Collection Report V2** — Full session-based capture wizard with camera overlay, meter verification, review, and submit  
✅ **Camera overlay** — Live camera feed with machine info overlay, fallback to file input when HTTPS unavailable  
✅ **HTTPS dev setup** — `bun run dev:https` with mkcert for mobile camera testing  
✅ **Shared types** — Single source of truth in `shared/types/`  
✅ **Financial Color Coding** — Standardized green/red logic across all reports  
✅ **Rules Constitution** — New `ARCHITECTURE` and `type-safety` rules active  
✅ **Collection modal activity logs** — detailed, structured  
✅ **Notes column** — desktop and mobile support  
✅ **ObjectID resolution** — background polling for developers  
✅ **Type safety** — all TypeScript types pass (`bun run type-check`)  
✅ **Linting** — all files pass ESLint (`bun run lint`)  
✅ **Build** — production build compiles cleanly

---

## Files Summary

### Previous Work
**Created:** 1 admin endpoint
`app/api/admin/resolve-machine-names/route.ts`

**Modified:** 8 files
- 4 modal hooks (useNewCollectionModal, useEditCollectionModal, useMobileCollectionModal, useMobileEditCollectionModal)
- 1 type file (lib/types/api/types.ts)
- 1 helper (app/api/lib/helpers/accountingDetails.ts)
- 1 component (CollectionReportDetailsCollectionsTable.tsx)
- 1 admin table (AdministrationActivityLogsTable.tsx)

### CR V2 Work (Latest)
**Created:** 10 new files
- `app/api/collection-reports-v2/` — 4 route files (sessions POST/GET, session detail GET, submit PATCH, machines POST/PATCH)
- `components/CMS/collectionReport/tabs/collection-v2/` — 5 components (SessionDetail, CameraOverlay, Desktop, Mobile, StartDialog)
- `components/ui/skeletons/CollectionReportV2SessionsSkeleton.tsx`

**Modified:** 5 files
- `app/api/lib/models/reportedMachines.ts` — added `imageData`
- `lib/constants/collection.ts` — tab config
- `lib/constants/maintenance.ts` — maintenance toggle
- `components/CMS/collectionReport/CollectionReportPageContent.tsx` — V2 tab rendering
- `next.config.ts` — allowedDevOrigins

### Google Drive OAuth2 Migration (2026-05-11)
**Problem:** Service account had no Drive storage quota. Google requires Shared Drives for SA file creation, but personal `@gmail.com` accounts can't create Shared Drives.

**Solution:** Migrated from Service Account (JWT) to OAuth2 Desktop app:
- Created new OAuth 2.0 Client ID (Desktop app) in GCP Console
- One-time auth flow: consent URL → authorization code → exchange for refresh token
- `getDriveClient()` in `lib/utils/drive.ts` now uses `google.auth.OAuth2` with refresh token instead of `GoogleAuth` with JWT credentials
- Files count against the user's personal Drive quota

**Files changed:**
- `lib/utils/drive.ts` — replaced JWT auth with OAuth2
- `.env` — removed 8 service account vars, added `GOOGLE_DRIVE_OAUTH_CLIENT_ID`, `GOOGLE_DRIVE_OAUTH_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`
- `scripts/exchange-drive-code.js` — reads from `.env`, exchanges auth code for refresh token
- `Documentation/google-drive-image-storage.md` — rewritten to document OAuth2 flow
- `.claude/collection-report-v2-plan.md` — updated with Drive storage, edit mode, submitted report view

---

## How to Test

1. **Activity Logs:** Open a collection modal (new, edit, mobile variants), add or edit a machine with meters and notes. Check the Activity Logs admin page — should see rich details.

2. **Notes Column:** Create/edit a collection report where at least one machine has a note. Click into the report details page. On desktop: look for the `NOTES` column header. On mobile: scroll to see notes below SAS times.

3. **ObjectID Resolution:** Go to Activity Logs admin page as a developer. Watch the top of the page for a violet `[DEV]` banner showing progress. After 5-10 seconds, you should see "resolved" message or 0 remaining.

---

## Next Steps (if needed)

### CR V2
- End-to-end mobile test: start session → capture photos → verify meters → review → submit
- Better error recovery: retry on save failure, network timeout handling
- Session deletion/cancel for in-progress sessions
- Location filter/group toggle on sessions list

### General
- Monitor for any edge cases in activity log details formatting
- Consider adding a manual "refresh/resolve now" button to the admin ObjectID banner
- May want to add a timestamp to show when ObjectID resolution last ran
