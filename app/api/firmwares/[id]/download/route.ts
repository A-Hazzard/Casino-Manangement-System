/**
 * Firmware Download by ID API Route
 *
 * This route handles downloading firmware files from GridFS by firmware ID.
 * It supports:
 * - Finding firmware by ID
 * - Downloading firmware file from GridFS
 * - Returning file with appropriate headers
 *
 * @module app/api/firmwares/[id]/download/route
 */

import {
  downloadFirmwareFromGridFS,
  findFirmwareById,
} from '@/app/api/lib/helpers/firmware';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for downloading firmware by ID
 *
 * Flow:
 * 2. Find firmware document by ID
 * 3. Download firmware file from GridFS
 * 4. Return file with appropriate headers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { id } = await params;

    // ============================================================================
    // STEP 2: Find firmware document by ID
    // ============================================================================
    const firmware = await findFirmwareById(id);
    if (!firmware) {
      return NextResponse.json(
        { error: 'Firmware not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 3: Download firmware file from GridFS
    // ============================================================================
    const buffer = await downloadFirmwareFromGridFS(firmware.fileId);

    // ============================================================================
    // STEP 4: Return file with appropriate headers
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Firmware Download by ID API] Completed in ${duration}ms`);
    }
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${firmware.fileName}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to download firmware';
    console.error(
      `[Firmware Download by ID API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
