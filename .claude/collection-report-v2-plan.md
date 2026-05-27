# Collection Report V2 — Feature Plan

## Status: Feature Complete (with Google Drive image storage + OAuth2)

## Purpose of This File

This is the **working plan** for the Collection Report V2 feature. It tracks:

- What's been done (✅)
- How the camera/overlay works end-to-end
- HTTPS/certificate requirements
- Google Drive image storage with OAuth2
- Every file involved

Use this file to:

- Onboard into the V2 feature
- Debug the camera or HTTPS setup
- Understand which files to touch for changes
- Hand off context to a new AI chat

---

## Progress

### ✅ Complete

- All API routes: POST/GET `/sessions`, GET `/sessions/[sessionId]`, POST/PATCH `/machines`, PATCH `/sessions/[sessionId]/submit`, DELETE `/sessions/[sessionId]`
- `CameraOverlay.tsx` — full-screen camera with machine info overlay, gallery fallback, keep/retake prompt
- `CollectionReportV2SessionDetail.tsx` — inline capture wizard: progress bar, photo capture, meters match toggle, manual entry, review, submit, **edit mode** for developers
- `CollectionReportV2StartSessionDialog.tsx` — location selector → starts session
- `CollectionReportV2Desktop.tsx` / `CollectionReportV2Mobile.tsx` — session list views with delete
- `CollectionReportV2SessionReport.tsx` — submitted report view with sidebar tabs (Machines / Summary), photo modal, refresh, **edit button** (developers only)
- `CollectionReportV2SessionReportMachinesTab.tsx` — searchable/sortable/paginated machine table + mobile cards
- `CollectionReportV2SessionReportSummaryTab.tsx` — aggregated stats
- `CollectionReportV2StatusBadge.tsx` — status badge component
- Edit mode reuses inline wizard — all machines pre-filled, index-based navigation, "Exit Edit" returns to refreshed report
- Google Drive image storage via OAuth2 (Desktop app) — files stored under user's personal Drive quota
- Drive folder hierarchy: Root → Location → Machine → Year → Month → Date
- `lib/utils/drive.ts` — Drive client, `ensureFolder()`, `ensureFolderPath()`, `uploadImage()`, `getDriveFileMeta()`, `deleteDriveFile()`
- Image proxy endpoint: `GET /api/collection-reports-v2/drive-files/[fileId]`
- V2 tab only visible to users with `developer` role
- Skeleton loaders for session list and session detail

### Known Gaps

- **Mobile end-to-end test** — capture wizard + camera overlay + submit flow hasn't been fully tested on a real mobile device with HTTPS
- **No location grouping** — Sessions list has no location filter/group toggle

---

## User Flow (Step by Step)

### How the collector uses it

```
Home Screen
  │
  ▼
[Start Collection Report] button
  │
  ▼
Dialog: Select a location → tap "Start Collection Report"
  │   POST /api/collection-reports-v2/sessions
  │   → creates ReportedMachine docs in DB for every machine at that location
  │   → returns sessionId
  │
  ▼
Capture Wizard opens (one machine at a time)
  │
  ├─── Machine info displayed at top (serial, name, manufacturer, meters)
  │
  ├─── [Tap to take a photo] button
  │      │
  │      ▼
  │   Full-screen camera opens (needs HTTPS)
  │      │
  │      ├── Overlay at top shows:
  │      │    Machine: SN-12345
  │      │    Name:   Slot Machine #42
  │      │    Maker:  IGT
  │      │    Meters In:  12,345
  │      │    Meters Out:  6,789
  │      │
  │      ├── [Capture button] (white circle at bottom)
  │      │      │
  │      │      ▼
  │      │   Photo saved as base64 → preview shown
  │      │   [Keep Photo] / [Retake] prompt
  │      │
  │      └── [X] Cancel (top-left) → returns to wizard
  │
  ├─── [Yes, they match] / [No, enter manually] toggle
  │      │
  │      ├── Yes → metersMatch = true, uses system values
  │      │
  │      └── No → metersMatch = false
  │                 Shows manual entry fields for Actual Meters In/Out
  │
  ├─── [Skip] → skips machine (status: skipped)
  │
  └─── [Save & Next] or [Save & Review] (last machine)
         │   PATCH /api/collection-reports-v2/machines?id=xxx
         │   → uploads base64 image to Google Drive (OAuth2 as the user)
         │   → stores driveFileId in MongoDB
         │   → saves status, metersMatch
         │
         ▼
      Next machine → repeat until all done
         │
         ▼
   [Review] screen
      │
      ├── Machine list with thumbnails, status badges, meter values
      ├── [Back to capture] button to fix any machine
      └── [Submit] button
            │  PATCH /api/collection-reports-v2/sessions/[id]/submit
            │  → sets all machines to sessionStatus: 'submitted'
            │
            ▼
      [Session Submitted] → Submitted Report View
         │  Sidebar tabs: Machines (table) / Summary (stats)
         │  Photo modal on thumbnail click
         │  Edit button (developers only)
         │  Refresh button
```

### Developer Edit Mode

When viewing a submitted session report as a developer:

1. Click **Edit Session** button
2. Wizard opens with all machines pre-filled (first machine shown)
3. **Save & Next** → PATCHs current machine, advances to next
4. **Save & Exit** → saves current machine, fetches fresh session data, exits edit mode
5. No Skip, no Cancel, no standalone Next in edit mode
6. Navigation is by index (not pending-status) — all machines editable

---

## Camera Details

### What happens when you tap "Take a photo"

1. **Button click** → `showCamera = true` → `CameraOverlay` component mounts
2. **Camera starts** — React calls `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`
   - This asks the browser to open the **rear camera**
   - The browser shows a permission prompt (first time only)
   - If granted, a live video stream starts flowing
3. **Video displayed** — The stream is plugged into a `<video>` element with `autoPlay` and `playsInline`
   - `object-cover` CSS makes the video fill the screen while keeping aspect ratio
4. **Overlay drawn** — On top of the video (using absolute positioning + `z-50`), we draw a semi-transparent black box with white text showing:
   - Machine serial number and name
   - Manufacturer
   - Latest Meters In and Meters Out (from SMIB)
   - This is all **plain HTML/CSS on top of the video** — no image processing
5. **User taps capture button** (white circle) → `handleCapture()`:
   - Pauses the video
   - Draws the current video frame onto a hidden `<canvas>` element
   - Exports the canvas as a **JPEG base64 string** (`canvas.toDataURL('image/jpeg', 0.8)`)
   - Stops the camera stream (frees the camera for other apps)
   - Returns the base64 string to the parent component via `onCapture()`
6. **Keep/Retake prompt** — Shows "Keep Photo" / "Retake" overlay
7. **Gallery fallback** — If camera API fails (e.g., not on HTTPS), `<input type="file" capture="environment">` shown. Resized client-side (max 1200px) before `toDataURL`

### Key code pieces

```
CameraOverlay.tsx
├── useEffect → getUserMedia → starts camera, stores stream
├── <video> → shows live feed (object-cover fills screen)
├── <div absolute top-0 bg-black/60> → overlay text (machine info)
├── <button bottom-center> → capture button (draws video to canvas)
├── <button top-left> → cancel button (closes overlay)
└── <canvas hidden> → used to capture the still image
```

### Data flow with Drive

```
Tap photo → CameraOverlay mounts → camera starts → overlay shows machine info
  → Tap capture → frame drawn to canvas → exported as base64 JPEG
  → CameraOverlay unmounts (camera stops)
  → imageData stored in state → shown as preview
  → "Save & Next" sends base64 to API
  → PATCH /api/collection-reports-v2/machines:
      1. Ensure folder hierarchy on Drive (Root → Location → Machine → Year → Month → Date)
      2. Upload image to Drive via OAuth2 (acts as the authenticated user)
      3. Store only driveFileId in MongoDB
      4. If editing, delete old Drive file before uploading new one
  → Frontend stores proxy URL as imageData for display
```

---

## HTTPS & Certificates — Important Notes

### Why the camera didn't work on HTTP

The browser's `getUserMedia` API (camera access) **requires a secure context**:

- `https://` — works everywhere
- `http://localhost` or `http://127.0.0.1` — treated as secure (exception for local dev)
- `http://192.168.x.x` — **NOT** treated as secure → camera API is blocked

This is a browser security rule — you cannot bypass it.

### How we fixed it

**Option 1 (chosen): Self-signed certificate with mkcert**

1. Next.js `--experimental-https` flag uses `mkcert` to generate SSL certs
2. `mkcert -install` needs **Administrator** rights (UAC prompt) — installs a local Certificate Authority
3. Certs are stored in `certificates/localhost.pem` and `certificates/localhost-key.pem`
4. Run: `bun run dev --experimental-https`
5. Access `https://192.168.0.39:3000` on mobile
6. Accept the "Not Secure" warning (tap Advanced → Proceed)
7. Camera API now works because the page is served over HTTPS

**Option 2: Caddy reverse proxy (used in production)**

Caddy at `https://192.168.0.39` (port 443) proxies to `http://localhost:3000`:

```
192.168.0.39 {
    reverse_proxy localhost:3000
}
```

### Compatibility matrix

| Scenario                         | Works?            | Why                               |
| -------------------------------- | ----------------- | --------------------------------- |
| Desktop `localhost:3000`         | ✅ Camera works   | localhost is secure context       |
| Desktop `127.0.0.1:3000`         | ✅ Camera works   | loopback is secure context        |
| Mobile `192.168.x.x:3000` (HTTP) | ❌ Camera blocked | non-localhost HTTP is insecure    |
| Mobile `192.168.x.x` via Caddy   | ✅ Works          | HTTPS via Caddy reverse proxy     |
| Production (HTTPS)               | ✅ Works          | production should always be HTTPS |

---

## Google Drive Image Storage

### Why OAuth2 (not Service Account)

- **Service accounts have no Drive storage quota** — they cannot create files in Google Drive unless the files live in a Shared Drive (requires Google Workspace).
- **OAuth2 (Desktop app)** — acts as the authenticated user. Files count against the user's personal Drive quota. Works with `@gmail.com` accounts.
- The initial one-time auth flow authorizes the app, returns a refresh token stored in `.env`, and the backend uses it silently thereafter.

### Folder Structure on Drive

```
Root Folder (GOOGLE_DRIVE_ROOT_FOLDER_ID)
  → Location Name (e.g., "Mapau South")
    → Machine Name (e.g., "Machine 104")
      → Year (e.g., "2026")
        → Month (e.g., "April")
          → Date (e.g., "2026-04-13")
            → image-file.jpg
```

### Environment Variables

```env
GOOGLE_DRIVE_OAUTH_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_DRIVE_OAUTH_CLIENT_SECRET=GOCSPX-...
GOOGLE_DRIVE_REFRESH_TOKEN=1//0xxx...
GOOGLE_DRIVE_ROOT_FOLDER_ID=abc123xyz
```

### Key Files

| File                                                          | Purpose                                                          |
| ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `lib/utils/drive.ts`                                          | Drive client (OAuth2), folder management, upload/download/delete |
| `app/api/collection-reports-v2/drive-files/[fileId]/route.ts` | Image proxy endpoint (streams from Drive to browser)             |
| `scripts/exchange-drive-code.js`                              | One-time token exchange (reads from .env, outputs refresh token) |

---

## File Map

| File                                                                                                | Purpose                                                    |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `app/api/collection-reports-v2/sessions/route.ts`                                                   | POST (start session) + GET (list sessions)                 |
| `app/api/collection-reports-v2/sessions/[sessionId]/route.ts`                                       | GET session detail + DELETE session                        |
| `app/api/collection-reports-v2/sessions/[sessionId]/submit/route.ts`                                | PATCH submit session                                       |
| `app/api/collection-reports-v2/machines/route.ts`                                                   | POST/PATCH machine capture data (image upload to Drive)    |
| `app/api/collection-reports-v2/drive-files/[fileId]/route.ts`                                       | GET proxy — streams image from Drive                       |
| `app/api/lib/models/reportedMachines.ts`                                                            | ReportedMachine Mongoose model (with `driveFileId`)        |
| `lib/utils/drive.ts`                                                                                | Drive client, folder management, upload/download/delete    |
| `lib/utils/cookieSecurity.ts`                                                                       | Cookie security helpers                                    |
| `scripts/exchange-drive-code.js`                                                                    | One-time OAuth2 token exchange                             |
| `components/CMS/collectionReport/tabs/collection-v2/CameraOverlay.tsx`                              | Full-screen camera with overlay                            |
| `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2SessionDetail.tsx`            | Capture wizard + review + edit mode                        |
| `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2SessionReport.tsx`            | Submitted report view (Machines/Summary tabs, edit button) |
| `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2SessionReportMachinesTab.tsx` | Searchable/sortable/paginated machine table                |
| `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2SessionReportSummaryTab.tsx`  | Aggregated stats                                           |
| `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2StatusBadge.tsx`              | Status badge                                               |
| `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2Desktop.tsx`                  | Session list (desktop table)                               |
| `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2Mobile.tsx`                   | Session list (mobile cards)                                |
| `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2StartSessionDialog.tsx`       | Start session dialog                                       |
| `components/CMS/collectionReport/CollectionReportPageContent.tsx`                                   | V2 tab rendering + refresh handling                        |
| `components/CMS/collectionReport/CollectionReportHeader.tsx`                                        | Global refresh + create buttons                            |
| `lib/hooks/collectionReport/useCollectionReportV2Data.ts`                                           | V2 data hook                                               |
| `lib/constants/collection.ts`                                                                       | Tab config                                                 |
| `lib/constants/maintenance.ts`                                                                      | Maintenance toggle                                         |
| `components/ui/skeletons/CollectionReportV2SessionsSkeleton.tsx`                                    | Session list skeleton                                      |
| `components/ui/skeletons/CollectionReportV2SessionDetailSkeleton.tsx`                               | Wizard skeleton                                            |
| `next.config.ts`                                                                                    | `allowedDevOrigins` config                                 |
| `lib/store/userStore.ts`                                                                            | Zustand user store (for `isDeveloper` check)               |
