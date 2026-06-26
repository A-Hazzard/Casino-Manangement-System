/**
 * Firmware by ID API Route
 *
 * This route handles operations for a specific firmware identified by ID.
 * It supports:
 * - GET: Download the raw firmware binary
 * - DELETE: Soft deleting a firmware
 *
 * @module app/api/firmwares/[id]/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import {
  downloadFirmwareFromGridFS,
  findFirmwareById,
} from '@/app/api/lib/helpers/firmware';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { Firmware } from '@/app/api/lib/models/firmware';
import { getClientIP } from '@/lib/utils/ipAddress';
import {
  logRouteFetch,
  logRouteDelete,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/firmwares/[id]
 *
 * Downloads the raw firmware binary for a given firmware document ID. Called
 * when a client needs to retrieve the file directly by its database record ID.
 *
 * URL params:
 * @param id {string} Required (path). The MongoDB ID of the Firmware document to download.
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async () => {
    const startTime = Date.now();
    const functionName = 'GET /api/firmwares/[id]';
    const user = extractUserFromRequest(request);
    const { pathname } = request.nextUrl;
    const id = pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { error: 'Firmware ID is required' },
        { status: 400 }
      );
    }

    try {
      const firmware = await findFirmwareById(id);
      if (!firmware) {
        return NextResponse.json(
          { error: 'Firmware not found' },
          { status: 404 }
        );
      }

      const buffer = await downloadFirmwareFromGridFS(firmware.fileId);

      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/firmwares/[id]',
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
        '/api/firmwares/[id]',
        errorMessage,
        user
      );
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  });
}

/**
 * DELETE /api/firmwares/[id]
 *
 * Soft-deletes a firmware document by setting its `deletedAt` timestamp. Called
 * when an operator removes a firmware version from the management panel; the
 * binary is retained in GridFS but the record is no longer surfaced in listings.
 *
 * URL params:
 * @param id {string} Required (path). The MongoDB ID of the Firmware document to delete.
 */
export async function DELETE(request: NextRequest) {
  return withApiAuth(request, async ({ user: currentUser }) => {
    const startTime = Date.now();
    const functionName = 'DELETE /api/firmwares/[id]';
    const user = extractUserFromRequest(request);
    const { pathname } = request.nextUrl;
    const id = pathname.split('/').pop();

    try {
      if (!id) {
        return NextResponse.json(
          { message: 'Firmware ID is required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 1: Find firmware by ID
      // ============================================================================
      const firmwareToDeleteData = await findFirmwareById(id);
      if (!firmwareToDeleteData) {
        return NextResponse.json(
          { message: 'Firmware not found' },
          { status: 404 }
        );
      }

      // Get the full document for logging details
      const firmwareToDelete = await Firmware.findOne({ _id: id });

      // ============================================================================
      // STEP 2: Soft delete firmware
      // ============================================================================
      const softDeletedFirmware = await Firmware.findOneAndUpdate(
        { _id: id },
        { deletedAt: new Date() },
        { new: true }
      );
      if (!softDeletedFirmware) {
        return NextResponse.json(
          { success: false, error: 'Failed to delete firmware' },
          { status: 500 }
        );
      }

      const duration = Date.now() - startTime;
      logRouteDelete(
        functionName,
        'DELETE',
        '/api/firmwares/[id]',
        1,
        user,
        duration
      );

      // ============================================================================
      // STEP 3: Log activity
      // ============================================================================
      if (currentUser && currentUser.emailAddress) {
        try {
          const deleteChanges = [
            {
              field: 'product',
              oldValue: firmwareToDelete.product,
              newValue: null,
            },
            {
              field: 'version',
              oldValue: firmwareToDelete.version,
              newValue: null,
            },
            {
              field: 'versionDetails',
              oldValue: firmwareToDelete.versionDetails,
              newValue: null,
            },
            {
              field: 'fileName',
              oldValue: firmwareToDelete.fileName,
              newValue: null,
            },
            {
              field: 'fileSize',
              oldValue: firmwareToDelete.fileSize,
              newValue: null,
            },
          ];

          await logActivity({
            action: 'DELETE',
            details: `Deleted firmware "${firmwareToDelete.product} v${firmwareToDelete.version}" (${firmwareToDelete.fileName})`,
            ipAddress: getClientIP(request) || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
            metadata: {
              userId: currentUser._id as string,
              userEmail: currentUser.emailAddress as string,
              userRole: (currentUser.roles as string[])?.[0] || 'user',
              resource: 'Firmware',
              resourceId: id,
              resourceName: `${firmwareToDelete.product} v${firmwareToDelete.version}`,
              changes: deleteChanges,
            },
          });
        } catch (logError) {
          console.error('[DELETE /api/firmwares/[id]] Failed to log activity:', logError instanceof Error ? logError.message : 'Unknown error');
        }
      }

      if (Date.now() - startTime > 1000)
        console.warn(`[${functionName}] slow: ${Date.now() - startTime}ms`);

      return NextResponse.json({
        message: 'Firmware deleted successfully',
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'An unknown error occurred';
      logRouteError(
        functionName,
        'DELETE',
        '/api/firmwares/[id]',
        errorMessage,
        user
      );
      return NextResponse.json(
        { message: 'Error deleting firmware', error: errorMessage },
        { status: 500 }
      );
    }
  });
}
