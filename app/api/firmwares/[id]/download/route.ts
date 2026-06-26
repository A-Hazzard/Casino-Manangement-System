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
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/firmwares/[id]/download
 *
 * Streams the firmware binary from GridFS as an `application/octet-stream`
 * attachment. Called when a user manually triggers a firmware download from
 * the firmware management UI.
 *
 * URL params:
 * @param id {string} Required (path). The MongoDB ID of the Firmware document to download.
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async () => {
    const startTime = Date.now();
    const functionName = 'GET /api/firmwares/[id]/download';
    const user = extractUserFromRequest(request);
    const { pathname } = request.nextUrl;
    const id = pathname.split('/').at(-2); // Extract [id] from /api/firmwares/[id]/download

    if (!id) {
      return NextResponse.json(
        { error: 'Firmware ID is required' },
        { status: 400 }
      );
    }

    try {
      // ============================================================================
      // STEP 1: Find firmware document by ID
      // ============================================================================
      const firmware = await findFirmwareById(id);
      if (!firmware) {
        return NextResponse.json(
          { error: 'Firmware not found' },
          { status: 404 }
        );
      }

      // ============================================================================
      // STEP 2: Download firmware file from GridFS
      // ============================================================================
      const buffer = await downloadFirmwareFromGridFS(firmware.fileId);

      // ============================================================================
      // STEP 3: Return file with appropriate headers
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        `/api/firmwares/${id}/download`,
        1,
        user,
        duration
      );
      if (Date.now() - startTime > 1000)
        console.warn(`[${functionName}] slow: ${Date.now() - startTime}ms`);

      return new NextResponse(buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${firmware.fileName}"`,
          'Content-Length': buffer.length.toString(),
        },
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to download firmware';
      logRouteError(
        functionName,
        'GET',
        `/api/firmwares/${id}/download`,
        errorMessage,
        user
      );
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  });
}
