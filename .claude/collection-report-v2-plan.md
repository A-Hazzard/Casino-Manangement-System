# Collection Report V2 — Feature Plan

## Status: Feature Complete (Polish Phase)

## Purpose of This File
This is the **working plan** for the Collection Report V2 feature. It tracks:
- What's been done (✅)
- What's pending
- How the camera/overlay works end-to-end
- HTTPS/certificate requirements
- Every file involved

Use this file to:
- Onboard into the V2 feature
- Debug the camera or HTTPS setup
- Understand which files to touch for changes
- Hand off context to a new AI chat

---

## Progress

### ✅ Done

- Created POST/GET `/api/collection-reports-v2/sessions` — start a session (creates ReportedMachine docs in DB) and list sessions
- Created GET `/api/collection-reports-v2/sessions/[sessionId]` — fetch session detail with all machines
- Created PATCH `/api/collection-reports-v2/machines?id=xxx` — update machine capture (status, meters, imageData)
- Created POST `/api/collection-reports-v2/machines` — create machine capture record
- Created PATCH `/api/collection-reports-v2/sessions/[sessionId]/submit` — submit all machines in session
- Built `CameraOverlay.tsx` — custom full-screen camera using MediaDevices API with machine info overlay
- Built `CollectionReportV2SessionDetail.tsx` — inline capture wizard with progress bar, photo capture, meter verification, review, and submit
- Built `CollectionReportV2StartSessionDialog.tsx` — location selector → starts session
- Built `CollectionReportV2Desktop.tsx` / `CollectionReportV2Mobile.tsx` — session list views
- Built `CollectionReportV2SessionsSkeleton.tsx` — skeleton loader for session list
- Added `imageData?: string` to `ReportedMachine` model (base64 storage, not GridFS)
- Added `collection-v2` tab to maintenance config and collection tab config
- V2 tab only visible to users with `developer` role
- Fixed `params` Promise error (Next.js 15 requires `await params` in route handlers)
- Fixed POST sessions route: now persists ReportedMachine documents in DB (was returning data without saving — caused 404 on session detail)
- Label changes: "Start Session" → "Start Collection Report"
- Mobile responsive tweaks: stacked layout for meters match buttons, action bar, review header, summary bar
- Added `allowedDevOrigins` to next.config.ts for cross-origin mobile dev access
- HTTPS dev setup with mkcert for camera API access on mobile
- Camera fallback: "Choose Photo" file input when `getUserMedia` unavailable (e.g., HTTP)
- Cleaned up package.json: removed redundant scripts, fixed trailing comma JSON error, fixed analyze script
- Created `.claude/collection-report-v2-plan.md` — full feature plan with camera docs and HTTPS notes

### ✅ Polish & Bug Fixes (2026-05-09)

- **Bug fix: Skip persistence** — `handleSkip` now POSTs a new ReportedMachine doc with `status: 'skipped'` when `reportedMachineId` is absent (previously skipped unsaved machines silently — they'd reappear on page reload)
- **Bug fix: Loading flash** — `fetchSession` now accepts `background=true` param to skip setting `loading: true` during save/refresh operations, preventing the UI from flashing "Loading session..." on every save
- **Skeleton loader** — Created `CollectionReportV2SessionDetailSkeleton.tsx` matching the wizard card layout, replaces "Loading session..." text
- **Gallery button** — Added "Gallery" button alongside the capture button in CameraOverlay, opens native file picker to select existing photos even when camera is available
- **Keep/Retake prompt** — After capture, shows explicit confirmation overlay with "Keep Photo" / "Retake" buttons instead of immediately returning to wizard
- **Image resize** — Client-side resize before `toDataURL` (max 1200px dimension), reduces base64 size ~4x
- **Error recovery** — Added `saveError` state + error banner with dismiss button in capture wizard on save failure
- **Session deletion** — Added `DELETE /api/collection-reports-v2/sessions/[sessionId]` (dev/admin only, in-progress only). Delete buttons on desktop table, mobile cards, and session detail page with confirmation dialog
- **Label** — "Collection Report V2" → "V2 Capture" in tab config
- **Pending count fix** — Review view now correctly separates `pending` vs `captured` machines in summary
- **Manual meters reset** — Fixed `useEffect` dependency from `reportedMachineId` to `currentIndex` to properly reset manual meter inputs when switching machines

### What's Left / Known Gaps

- **Mobile end-to-end test** — capture wizard + camera overlay + submit flow hasn't been fully tested on a real mobile device with HTTPS
- **"Resolve now" button** — ObjectID resolution banner from Activity Logs could use a manual trigger button (from earlier session, not V2-specific)
- **`imageData` fallback** — Review view shows `imageData` but could also support `imageFileId` as fallback for backward compat
- **No location grouping** — Sessions list groups by sessionId but has no location filter/group toggle

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
  │      │   [X] to retake
  │      │   (No explicit "keep or retake" prompt — just shows preview)
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
         │   POST or PATCH /api/collection-reports-v2/machines
         │   → saves status, metersMatch, imageData to DB
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
      [Session Submitted] screen
         ✓ Checkmark, location name, summary (X confirmed, Y skipped)
         [Back to Reports] → returns to session list
```

### Comparison with original requirements

| Original Requirement | Status | Notes |
|---------------------|--------|-------|
| Collector logs in on mobile/tablet | ✅ Works | Standard auth, responsive layout |
| Select from camera roll (not physically at location) | ❌ **Missing** | Only camera capture, no gallery/file picker from within the overlay |
| Photo metadata timing concerns | ❌ **Missing** | No EXIF/metadata reading from photos |
| Start a Collection Report V2 | ✅ Works | Dialog → POST session → redirect |
| Browser asks for camera permissions | ✅ Works | Browser handles this natively |
| Camera with overlay | ✅ Works | Custom CameraOverlay component |
| Overlay: Serial, Name, Manufacturer, Meters In/Out | ✅ Works | All five fields displayed |
| Take picture of meters | ✅ Works | Capture button draws frame to canvas |
| Confirm/retake after capture | ⚠️ Partial | Preview shown with X to retake, but no explicit "Keep or Retake?" prompt |
| Ask if meters match system (Yes/No) | ✅ Works | Two-button toggle |
| Move to next machine, update overlay | ✅ Works | findNextPending() + re-render |
| Repeat until all machines complete | ✅ Works | Loop through machines array |
| Review before submitting | ✅ Works | ReviewView component |
| Store in DB including images | ✅ Works | base64 in ReportedMachine.imageData |
| Tablet-friendly interface | ⚠️ Partial | Responsive tweaks done, but no tablet-specific optimizations |

### Gaps to address

1. **Gallery/photo roll selection** — CameraOverlay's fallback error screen has a "Choose Photo" file input, but there's no option to pick from gallery when the camera IS available. Should add a gallery button alongside the capture button.

2. **Photo metadata (EXIF)** — If user selects from gallery, we could read the photo's taken-at timestamp using `canvas` or a library. Not implemented.

3. **Explicit "Keep or Retake"** — Currently the preview shows the photo with a remove button. Original spec asks for a clear "Keep / Retake" prompt step between capture and meter confirmation. The current flow skips this and shows both photo and meters toggle at once.

4. **Tablet layout** — Currently uses mobile-first responsive. Layout works on phones, but could benefit from a split-pane tablet mode (camera on left, overlay on right).

---

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
6. **Preview shown** — The capture wizard shows the photo thumbnail with a red X to retake
7. **User can "Choose Photo" instead** — If the camera API fails (e.g., not on HTTPS), a fallback `<input type="file" capture="environment">` button appears. This opens the native OS camera app instead (works on HTTP but has NO overlay)

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

### Data flow

```
Tap photo → CameraOverlay mounts → camera starts → overlay shows machine info
  → Tap capture → frame drawn to canvas → exported as base64 JPEG
  → CameraOverlay unmounts (camera stops)
  → imageData stored in state → shown as preview
  → "Save & Next" sends base64 to API → stored in MongoDB
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

**Option 2: Tunnel service (no cert setup)**

- `npx ngrok http 3000` — gives you a public `https://xxxx.ngrok.io` URL
- Works immediately, no certs needed
- Downside: external URL, rate limits on free tier

### Important notes for future development

| Scenario                          | Works?            | Why                                |
| --------------------------------- | ----------------- | ---------------------------------- |
| Desktop `localhost:3000`          | ✅ Camera works   | localhost is secure context        |
| Desktop `127.0.0.1:3000`          | ✅ Camera works   | loopback is secure context         |
| Mobile `192.168.x.x:3000` (HTTP)  | ❌ Camera blocked | non-localhost HTTP is insecure     |
| Mobile `192.168.x.x:3000` (HTTPS) | ✅ Works          | HTTPS is secure (self-signed cert) |
| ngrok tunnel URL                  | ✅ Works          | ngrok provides valid HTTPS         |
| Production (HTTPS)                | ✅ Works          | production should always be HTTPS  |

### How to restart HTTPS dev server

```bash
bun run dev --experimental-https
```

If certs need regeneration:

```bash
mkcert -install   # run as Administrator once
```

### next.config.ts note

`allowedDevOrigins: ['192.168.0.39']` was added to prevent cross-origin warnings when accessing from a network IP in dev mode.

---

## File Map

| File                                                                                          | Purpose                                    |
| --------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `app/api/collection-reports-v2/sessions/route.ts`                                             | POST (start session) + GET (list sessions) |
| `app/api/collection-reports-v2/sessions/[sessionId]/route.ts`                                 | GET session detail                         |
| `app/api/collection-reports-v2/sessions/[sessionId]/submit/route.ts`                          | PATCH submit session                       |
| `app/api/collection-reports-v2/machines/route.ts`                                             | POST/PATCH machine capture data            |
| `app/api/lib/models/reportedMachines.ts`                                                      | ReportedMachine Mongoose model             |
| `components/CMS/collectionReport/tabs/collection-v2/CameraOverlay.tsx`                        | Full-screen camera with overlay            |
| `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2SessionDetail.tsx`      | Capture wizard + review + submit views     |
| `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2Desktop.tsx`            | Session list (desktop table)               |
| `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2Mobile.tsx`             | Session list (mobile cards)                |
| `components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2StartSessionDialog.tsx` | Start session dialog                       |
| `components/ui/skeletons/CollectionReportV2SessionsSkeleton.tsx`                              | Session list skeleton loader               |
| `components/ui/skeletons/CollectionReportV2SessionDetailSkeleton.tsx`                         | Session detail wizard skeleton loader      |
| `lib/constants/collection.ts`                                                                 | Tab config                                 |
| `lib/constants/maintenance.ts`                                                                | Maintenance env var toggle                 |
| `next.config.ts`                                                                              | `allowedDevOrigins` config                 |
