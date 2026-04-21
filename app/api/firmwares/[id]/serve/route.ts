/**
 * Firmware Serve API Route
 *
 * This route handles serving firmware files from GridFS.
 * It supports:
 * - Downloading firmware from GridFS to /public/firmwares/
 * - Returning static URL for the firmware file
 * - Auto-cleaning up files after 30 minutes
 *
 * @module app/api/firmwares/[id]/serve/route
 */

import { downloadFirmwareFromGridFS } from '@/app/api/lib/helpers/firmware';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Firmware } from '@/app/api/lib/models/firmware';
import fs from 'fs';
import { GridFSBucket } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

/**
 * GET /api/firmwares/[id]/serve
 *
 * Extracts a firmware binary from GridFS onto disk at `/public/firmwares/` and
 * returns a static URL pointing to that file. Called by the OTA update flow
 * before broadcasting the download URL to SMIBs via MQTT; the file is
 * automatically deleted from disk after 30 minutes.
 *
 * URL params:
 * @param id {string} Required (path). The MongoDB ID of the Firmware document to serve.
 */
export async function GET(
  request: NextRequest
) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const id = pathname.split('/').at(-2); // Extract [id] from /api/firmwares/[id]/serve

  try {
    // ============================================================================
    // STEP 1: Connect to database and initialize GridFS bucket
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      throw new Error('Database connection failed');
    }
    // ============================================================================
    // STEP 2: Parse and validate request parameters
    // ============================================================================

    // ============================================================================
    // STEP 3: Find firmware document
    // ============================================================================
    const firmwareDoc = await Firmware.findOne({ _id: id }).lean();
    if (!firmwareDoc) {
      return NextResponse.json(
        { error: 'Firmware not found' },
        { status: 404 }
      );
    }

    const firmware = firmwareDoc as unknown as {
      fileId: Parameters<GridFSBucket['openDownloadStream']>[0];
      fileName: string;
    };

    // ============================================================================
    // STEP 4: Create /public/firmwares directory if needed
    // ============================================================================
    const firmwaresDir = path.join(process.cwd(), 'public', 'firmwares');
    if (!fs.existsSync(firmwaresDir)) {
      fs.mkdirSync(firmwaresDir, { recursive: true });
    }

    const filePath = path.join(firmwaresDir, firmware.fileName);

    // ============================================================================
    // STEP 5: Download firmware from GridFS
    // ============================================================================
    const buffer = await downloadFirmwareFromGridFS(firmware.fileId);

    // ============================================================================
    // STEP 6: Write file to /public/firmwares/
    // ============================================================================
    fs.writeFileSync(filePath, buffer);

    // ============================================================================
    // STEP 7: Schedule auto-cleanup after 30 minutes
    // ============================================================================
    setTimeout(
      () => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (cleanupError) {
          console.error('Firmware cleanup failed:', cleanupError);
        }
      },
      30 * 60 * 1000
    );

    // ============================================================================
    // STEP 8: Return static URL
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Firmware Serve API] Completed in ${duration}ms`);
    }
    const staticUrl = `/firmwares/${firmware.fileName}`;

    return NextResponse.json({
      success: true,
      fileName: firmware.fileName,
      staticUrl,
      size: buffer.length,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to serve firmware';
    console.error(
      `[Firmware Serve API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
