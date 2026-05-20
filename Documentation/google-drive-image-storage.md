# Google Drive Image Storage for Collection Reports V2

## Overview
Meter photos captured during collection report sessions are stored in **Google Drive** instead of the MongoDB database. The images are organized in a structured folder hierarchy to support audits, dispute resolution, and management review.

---

## Folder Structure
Images are stored using the following hierarchy:
```
[Root Folder]
  → Location (e.g., "Mapau South")
    → Machine (e.g., "Machine 104")
      → Year (e.g., "2026")
        → Month (e.g., "April")
          → Date (e.g., "2026-04-13")
            → image-file.jpg
```

---

## Prerequisites

### 1. Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com).
2. Create a new project (or select an existing one).
3. Enable the **Google Drive API** for the project.
   - Go to **APIs & Services** > **Library**.
   - Search for "Google Drive API".
   - Click **Enable**.

### 2. OAuth 2.0 Client ID (instead of Service Account)
1. Go to **Credentials** in the left sidebar.
2. Click **+ Create Credentials** → **OAuth client ID**.
3. Application type: **Desktop app**.
4. Name: `Drive Upload Client` (or any name).
5. Click **Create**.
6. Copy the **Client ID** and **Client Secret**.

### 3. Root Folder in Google Drive
1. Go to **drive.google.com** and create a new folder (e.g., `Collection Report Photos`).
2. Copy the **Folder ID** from the URL bar when the folder is open:
   - URL: `https://drive.google.com/drive/folders/12wczyMpgz1hQqDEiSdkF7H59zlrUc4E7`
   - Folder ID: `12wczyMpgz1hQqDEiSdkF7H59zlrUc4E7`

---

## One-Time Auth Setup (Run Once)

Since this is a **Desktop app** OAuth client, you need to authorize once to get a refresh token.

### Step 1: Visit the consent URL
Replace `YOUR_CLIENT_ID` in this URL and visit it in your browser:
```
https://accounts.google.com/o/oauth2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost&response_type=code&scope=https://www.googleapis.com/auth/drive.file
```

### Step 2: Approve and copy the code
After approving, the browser redirects to `http://localhost/?code=...`. Copy the code from the URL bar (starts with `4/0A...`).

### Step 3: Exchange code for refresh token
Run the exchange script from the project root:
```
node scripts/exchange-drive-code.js <CODE>
```
This prints the refresh token. Add it to `.env` as `GOOGLE_DRIVE_REFRESH_TOKEN`.

---

## Environment Variables
Add the following to your `.env` file:

```env
# Google Drive (collection report V2 images) — OAuth2
GOOGLE_DRIVE_OAUTH_CLIENT_ID=your-oauth-client-id.apps.googleusercontent.com
GOOGLE_DRIVE_OAUTH_CLIENT_SECRET=your-oauth-client-secret
GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token

# The root folder ID where all images will be stored
GOOGLE_DRIVE_ROOT_FOLDER_ID=abc123xyz
```

---

## Architecture

### Upload Flow
```
Camera → base64 → PATCH /api/collection-reports-v2/machines
  → ensure folder hierarchy on Drive
  → upload image to Drive (OAuth2 as the user)
  → store driveFileId (not base64) in MongoDB
```

### View Flow
```
GET /api/collection-reports-v2/sessions/[sessionId]
  → if driveFileId exists → return imageData as proxy URL
  → else if base64 imageData exists (legacy) → return as before
  → else if imageFileId exists (legacy GridFS) → return file endpoint URL
```

### Image Proxy
Images are proxied through the backend at:
```
GET /api/collection-reports-v2/drive-files/[fileId]
```
This fetches the file from Google Drive and streams it to the browser. No credentials are exposed to the client.

---

## Backward Compatibility
- Existing sessions with base64 `imageData` continue to work unchanged.
- New sessions will store `driveFileId` and serve images through the proxy endpoint.
- Legacy GridFS `imageFileId` fallback is preserved.

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/utils/drive.ts` | Drive client, folder management, upload/download/delete |
| `app/api/collection-reports-v2/drive-files/[fileId]/route.ts` | Image proxy endpoint (streams from Drive) |
| `scripts/exchange-drive-code.js` | One-time token exchange script |
