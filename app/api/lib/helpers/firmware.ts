/**
 * Firmware Helper Functions
 *
 * This module contains helper functions for firmware API routes.
 * It handles GridFS operations, firmware file downloads, and file serving.
 *
 * @module app/api/lib/helpers/firmware
 */

import { Firmware } from '@/lib/types/firmware';
import { Db, GridFSBucket, ObjectId } from 'mongodb';
import { connectDB } from '../middleware/db';
import { Firmware as FirmwareModel } from '../models/firmware';

/**
 * Firmware file data
 */
export type FirmwareFileData = {
  fileId: string | ObjectId;
  fileName: string;
};

/**
 * Downloads firmware file from GridFS as buffer
 *
 * @param fileId - GridFS file ID (as stored in the Firmware document)
 * @returns Buffer containing firmware file data
 */
export async function downloadFirmwareFromGridFS(
  fileId: string | ObjectId
): Promise<Buffer> {
  const db = await connectDB();
  if (!db) {
    throw new Error('Database connection failed');
  }

  const bucket = new GridFSBucket(db as unknown as Db, {
    bucketName: 'firmwares',
  });

  // GridFSBucket.openDownloadStream accepts ObjectId or string.
  // Casting to 'any' here only for the driver call to bypass complex internal typing
  // if necessary, but we've defined the input type strictly.
  const downloadStream = bucket.openDownloadStream(fileId as ObjectId);

  const chunks: Buffer[] = [];
  try {
    for await (const chunk of downloadStream) {
      chunks.push(chunk);
    }
  } catch (err) {
    console.error(`Error downloading from GridFS: ${err instanceof Error ? err.message : String(err)}`, { 
      fileId: fileId.toString(),
      bucketName: 'firmwares'
    });
    throw err;
  }

  return Buffer.concat(chunks);
}

/**
 * Finds firmware document by ID
 *
 * @param firmwareId - Firmware document ID (String)
 * @returns Firmware file data or null if not found
 */
export async function findFirmwareById(
  firmwareId: string
): Promise<FirmwareFileData | null> {
  await connectDB();
  
  // Use .lean<Firmware>() to get a typed object
  const firmwareDoc = await FirmwareModel.findOne({ _id: firmwareId }).lean<Firmware>();

  if (!firmwareDoc) {
    return null;
  }

  return {
    fileId: firmwareDoc.fileId,
    fileName: firmwareDoc.fileName,
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
  await connectDB();
  
  const firmwareDoc = await FirmwareModel.findOne({
    version: version,
    $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }],
  }).lean<Firmware>();

  if (!firmwareDoc) {
    return null;
  }

  return {
    fileId: firmwareDoc.fileId,
    fileName: firmwareDoc.fileName,
  };
}
