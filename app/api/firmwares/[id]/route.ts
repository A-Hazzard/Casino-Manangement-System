/**
 * Firmware by ID API Route
 *
 * This route handles operations for a specific firmware identified by ID.
 * It supports:
 * - DELETE: Soft deleting a firmware
 *
 * @module app/api/firmwares/[id]/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import {
    downloadFirmwareFromGridFS,
    findFirmwareById,
} from '@/app/api/lib/helpers/firmware';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Firmware } from '@/app/api/lib/models/firmware';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for downloading firmware by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const { id } = await params;

    const firmware = await findFirmwareById(id);
    if (!firmware) {
      return NextResponse.json(
        { error: 'Firmware not found' },
        { status: 404 }
      );
    }

    const buffer = await downloadFirmwareFromGridFS(firmware.fileId);

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Firmware Download API] Completed in ${duration}ms`);
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
      `[Firmware Download API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * Main DELETE handler for soft deleting a firmware
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Find firmware by ID
 * 4. Soft delete firmware
 * 5. Log activity
 * 6. Return success response
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: 'Firmware ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Find firmware by ID
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
    // STEP 4: Soft delete firmware
    // ============================================================================
    await Firmware.findOneAndUpdate(
      { _id: id },
      { deletedAt: new Date() },
      { new: true }
    );

    // Log activity
    const currentUser = await getUserFromServer();
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
          ipAddress: getClientIP(req) || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
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
        console.error('Failed to log activity:', logError);
      }
    }

    return NextResponse.json({
      message: 'Firmware deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting firmware:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { message: 'Error deleting firmware', error: errorMessage },
      { status: 500 }
    );
  }
}
