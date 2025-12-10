/**
 * Firmware Helper Functions
 *
 * This module contains helper functions for firmware API routes.
 * It handles GridFS operations, firmware file downloads, and file serving.
 *
 * @module app/api/lib/helpers/firmware
 */

import { GridFSBucket } from 'mongodb';
import { connectDB } from '../middleware/db';
import { Firmware } from '../models/firmware';

/**
 * Firmware file data
 */
export type FirmwareFileData = {
  fileId: Parameters<GridFSBucket['openDownloadStream']>[0];
  fileName: string;
};

/**
 * Downloads firmware file from GridFS as buffer
 *
 * @param fileId - GridFS file ID
 * @returns Buffer containing firmware file data
 */
export async function downloadFirmwareFromGridFS(
  fileId: Parameters<GridFSBucket['openDownloadStream']>[0]
): Promise<Buffer> {
  const db = await connectDB();
  if (!db) {
    throw new Error('Database connection failed');
  }

  const bucket = new GridFSBucket(db, { bucketName: 'firmwares' });
  const downloadStream = bucket.openDownloadStream(fileId);

  const chunks: Buffer[] = [];
  for await (const chunk of downloadStream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

/**
 * Finds firmware document by ID
 *
 * @param firmwareId - Firmware document ID
 * @returns Firmware file data or null if not found
 */
export async function findFirmwareById(
  firmwareId: string
): Promise<FirmwareFileData | null> {
  const db = await connectDB();
  if (!db) {
    throw new Error('Database connection failed');
  }

  const firmwareDoc = await Firmware.findOne({ _id: firmwareId }).lean();

  if (!firmwareDoc) {
    return null;
  }

  const firmware = firmwareDoc as unknown as FirmwareFileData;

  return {
    fileId: firmware.fileId,
    fileName: firmware.fileName,
  };
}

/**
 * Finds firmware document by version
 *
 * @param version - Firmware version string
 * @returns Firmware file data or null if not found
 */
export async function findFirmwareByVersion(
  version: string
): Promise<FirmwareFileData | null> {
  const firmwareDoc = await Firmware.findOne({
    version: version,
    $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }],
  }).lean();

  if (!firmwareDoc) {
    return null;
  }

  const firmware = firmwareDoc as unknown as FirmwareFileData;

  return {
    fileId: firmware.fileId,
    fileName: firmware.fileName,
  };
}
