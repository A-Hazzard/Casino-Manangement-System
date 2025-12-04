/**
 * Firmware Download by Version API Route
 *
 * This route handles downloading firmware files from GridFS by version.
 * It supports:
 * - Finding firmware by version
 * - Downloading firmware file from GridFS
 * - Returning file with appropriate headers for SMIB OTA updates
 *
 * @module app/api/firmwares/download/[version]/route
 */

import {
  downloadFirmwareFromGridFS,
  findFirmwareByVersion,
} from '@/app/api/lib/helpers/firmware';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for downloading firmware by version
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Find firmware document by version
 * 3. Download firmware file from GridFS
 * 4. Return file with appropriate headers for SMIB OTA
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { version } = await params;

    // ============================================================================
    // STEP 2: Find firmware document by version
    // ============================================================================
    const firmware = await findFirmwareByVersion(version);
    if (!firmware) {
      return NextResponse.json(
        { error: `Firmware version ${version} not found` },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 3: Download firmware file from GridFS
    // ============================================================================
    const buffer = await downloadFirmwareFromGridFS(firmware.fileId);

    // ============================================================================
    // STEP 4: Return file with appropriate headers for SMIB OTA
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Firmware Download by Version API] Completed in ${duration}ms`);
    }
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${firmware.fileName}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to download firmware';
    console.error(
      `[Firmware Download by Version API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
