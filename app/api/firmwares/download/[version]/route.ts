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
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/firmwares/download/[version]
 *
 * Streams a firmware binary from GridFS using a version string as the lookup
 * key instead of a document ID. Used by SMIB devices during OTA updates to
 * fetch a specific firmware version by its human-readable version number;
 * response headers disable caching to ensure devices always receive the
 * latest binary.
 *
 * URL params:
 * @param version {string} Required (path). The firmware version string to look up (e.g. "1.2.3").
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async () => {
    const startTime = Date.now();
    const functionName = 'GET /api/firmwares/download/[version]';
    const user = extractUserFromRequest(request);
    const { pathname } = request.nextUrl;
    const version = pathname.split('/').pop();

    if (!version) {
      return NextResponse.json(
        { error: 'Firmware version is required' },
        { status: 400 }
      );
    }

    try {
      // ============================================================================
      // STEP 1: Find firmware document by version
      // ============================================================================
      const firmware = await findFirmwareByVersion(version);
      if (!firmware) {
        return NextResponse.json(
          { error: `Firmware version ${version} not found` },
          { status: 404 }
        );
      }

      // ============================================================================
      // STEP 2: Download firmware file from GridFS
      // ============================================================================
      const buffer = await downloadFirmwareFromGridFS(firmware.fileId);

      // ============================================================================
      // STEP 3: Return file with appropriate headers for SMIB OTA
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/firmwares/download/[version]',
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
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to download firmware';
      logRouteError(
        functionName,
        'GET',
        '/api/firmwares/download/[version]',
        errorMessage,
        user
      );
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  });
}
