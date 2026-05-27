/**
 * @module lib/utils/drive
 * Google Drive client utilities for uploading and managing files in the Evolution One CMS.
 */

import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

// ============================================================================
// Client
// ============================================================================

function getDriveClient(): drive_v3.Drive {
  const clientId = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'GOOGLE_DRIVE_OAUTH_CLIENT_ID, GOOGLE_DRIVE_OAUTH_CLIENT_SECRET, and GOOGLE_DRIVE_REFRESH_TOKEN must be set'
    );
  }

  const auth = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost'
  );
  auth.setCredentials({ refresh_token: refreshToken });

  return google.drive({ version: 'v3', auth });
}

// ============================================================================
// Folder helpers
// ============================================================================

async function ensureFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId: string
): Promise<string> {
  // Check if folder already exists under parent
  const res = await drive.files.list({
    q: `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 1,
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Create folder
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });

  return created.data.id!;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Ensure the location-level folder exists under the root.
 * Call this ONCE per submit, before any parallel machine uploads,
 * to avoid a race condition where concurrent uploads each try to
 * create the same location folder simultaneously.
 */
async function ensureLocationFolder(locationName: string): Promise<string> {
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID env var is not set');
  }
  const drive = getDriveClient();
  return ensureFolder(drive, locationName, rootFolderId);
}

/**
 * Ensure the full path for a single machine's capture under an already-existing
 * location folder: machineName / year / monthName / YYYY-MM-DD
 * Returns the ID of the date-level folder.
 */
async function ensureMachineDateFolder(params: {
  locationFolderId: string;
  machineName: string;
  capturedAt: Date;
}): Promise<string> {
  const drive = getDriveClient();

  const year = params.capturedAt.getFullYear().toString();
  const month = MONTH_NAMES[params.capturedAt.getMonth()];
  const dateStr = params.capturedAt.toISOString().split('T')[0];

  const machineFolderId = await ensureFolder(
    drive,
    params.machineName,
    params.locationFolderId
  );
  const yearFolderId = await ensureFolder(drive, year, machineFolderId);
  const monthFolderId = await ensureFolder(drive, month, yearFolderId);
  const dateFolderId = await ensureFolder(drive, dateStr, monthFolderId);

  return dateFolderId;
}

/**
 * Convenience wrapper used by single-machine paths (e.g. legacy calls).
 * Creates the location folder + machine date folder in one call.
 * Do NOT use this in batch submissions — use ensureLocationFolder +
 * ensureMachineDateFolder separately to avoid parallel race conditions.
 */
async function ensureFolderPath(params: {
  locationName: string;
  machineName: string;
  capturedAt: Date;
}): Promise<string> {
  const locationFolderId = await ensureLocationFolder(params.locationName);
  return ensureMachineDateFolder({
    locationFolderId,
    machineName: params.machineName,
    capturedAt: params.capturedAt,
  });
}

// ============================================================================
// Upload
// ============================================================================

async function uploadImage(params: {
  base64Data: string;
  fileName: string;
  folderId: string;
}): Promise<string> {
  const drive = getDriveClient();

  // base64Data is like "data:image/jpeg;base64,/9j..."
  const matches = params.base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 image data');
  }

  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const stream = Readable.from(buffer);

  const res = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [params.folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id',
  });

  return res.data.id!;
}

// ============================================================================
// Read
// ============================================================================

async function getDriveFileMeta(
  fileId: string
): Promise<{ data: Buffer; mimeType: string; name: string }> {
  const drive = getDriveClient();

  const meta = await drive.files.get({
    fileId,
    fields: 'name, mimeType',
  });

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  return {
    data: Buffer.from(res.data as ArrayBuffer),
    mimeType: (meta.data.mimeType as string) || 'image/jpeg',
    name: (meta.data.name as string) || 'photo',
  };
}

// ============================================================================
// Delete
// ============================================================================

async function deleteDriveFile(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}

/**
 * Delete a Google Drive folder and all its contents.
 * The Drive API treats folders and files the same for deletion —
 * deleting a folder moves it and all children to trash.
 */
async function deleteDriveFolder(folderId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId: folderId });
}

// ============================================================================
// Move / Relocate
// ============================================================================

/**
 * Move a Drive file from one parent folder to another.
 * Uses the Drive files.update API with addParents / removeParents.
 * If oldParentId is not provided, the file is added to newParentId only.
 */
async function moveDriveFile(
  fileId: string,
  newParentId: string,
  oldParentId?: string
): Promise<void> {
  const drive = getDriveClient();
  await drive.files.update({
    fileId,
    addParents: newParentId,
    removeParents: oldParentId,
    fields: 'id, parents',
    requestBody: {},
  });
}

/**
 * Check whether a Drive folder contains any non-trashed items.
 * Returns true if the folder is empty (safe to delete).
 */
async function isFolderEmpty(folderId: string): Promise<boolean> {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id)',
    pageSize: 1,
  });
  return !res.data.files || res.data.files.length === 0;
}

export {
  ensureFolder,
  ensureLocationFolder,
  ensureMachineDateFolder,
  ensureFolderPath,
  uploadImage,
  getDriveFileMeta,
  deleteDriveFile,
  deleteDriveFolder,
  moveDriveFile,
  isFolderEmpty,
};
