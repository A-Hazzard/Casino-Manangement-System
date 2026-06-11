/**
 * Collection Report V2 — Submit Session
 *
 * PATCH /api/collection-reports-v2/sessions/[sessionId]/submit
 *
 * Marks all reportedMachine documents for this session as submitted.
 * Persists sessionStartTime (if provided) and auto-sets sessionEndTime.
 * Handles image uploads to Google Drive, relocates photos when dates change,
 * persists machine meters to the Machine document, and logs activity.
 *
 * @module app/api/collection-reports-v2/sessions/[sessionId]/submit/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import {
  extractUserFromRequest,
  logRouteError,
} from '@/app/api/lib/utils/routeLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import {
  validateChronologicalSubmit,
  uploadSessionImages,
  relocateDrivePhotos,
  persistMachineMetersOnSubmit,
  logSubmitActivity,
} from '@/app/api/lib/helpers/collectionReportV2/submitOperations';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PATCH handler for submitting a collection report V2 session.
 *
 * Flow:
 * 1. Connect to database and authenticate user
 * 2. Parse request body and validate session ID
 * 3. Validate chronological submit (no middle-date insertions)
 * 4. Mark session as submitted
 * 5. Upload images to Google Drive
 * 6. Relocate Drive photos if sasEndTime date changed
 * 7. Persist machine meters to Machine document
 * 8. Update GamingLocation previousCollectionTime
 * 9. Log activity
 *
 * @param {NextRequest} req - The incoming request
 * @param {{ params: Promise<{ sessionId: string }> }} context - Route params containing sessionId
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const functionName =
    'PATCH /api/collection-reports-v2/sessions/[sessionId]/submit';
  const user = extractUserFromRequest(req);

  let sessionId = '';

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Authenticate user
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ============================================================================
    // STEP 3: Parse request body
    // ============================================================================
    sessionId = (await params).sessionId;
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const requestStartTime = body.sessionStartTime as string | undefined;
    const frontendImages =
      (body.images as
        | Array<{
            reportedMachineId: string;
            imageData: string;
            imageCapturedAt?: string;
          }>
        | undefined) ?? [];
    const sessionEndTime = new Date();
    const sessionStartTime = requestStartTime
      ? new Date(requestStartTime)
      : new Date();

    // ============================================================================
    // STEP 4: Chronological submit check (Middle-Date Block per Machine)
    // ============================================================================
    const chronologicalError = await validateChronologicalSubmit(
      sessionId,
      sessionEndTime
    );
    if (chronologicalError) {
      return NextResponse.json(
        { success: false, error: chronologicalError },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 5: Mark session as submitted
    // ============================================================================
    console.log(
      `[${functionName}] Submitting session:`,
      JSON.stringify(
        {
          sessionId,
          sessionStartTime: sessionStartTime.toISOString(),
          sessionEndTime: sessionEndTime.toISOString(),
          frontendImagesCount: frontendImages.length,
        },
        null,
        2
      )
    );

    const result = await ReportedMachine.updateMany(
      { sessionId },
      {
        $set: {
          sessionStatus: 'submitted',
          sessionStartTime,
          sessionEndTime,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    console.log(
      `[${functionName}] Session marked as submitted:`,
      JSON.stringify(
        {
          sessionId,
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
        },
        null,
        2
      )
    );

    // ============================================================================
    // STEP 6: Upload images to Google Drive
    // ============================================================================
    const allUploadedImages = await uploadSessionImages(
      sessionId,
      frontendImages
    );

    // ============================================================================
    // STEP 7: Relocate existing Drive photos when sasEndTime changed date
    // ============================================================================
    const freshlyUploadedIds = new Set(
      allUploadedImages.map(img => img.reportedMachineId)
    );
    await relocateDrivePhotos(sessionId, freshlyUploadedIds);

    // ============================================================================
    // STEP 8: Update Machine.collectionMeters and collectionTime
    // ============================================================================
    const submittedMachines = await ReportedMachine.find(
      {
        sessionId,
        status: { $in: ['captured', 'confirmed'] },
      },
      'machineId sasMetersIn sasMetersOut sasEndTime locationName locationId prevSasMetersIn prevSasMetersOut manualMetersIn manualMetersOut ramClear ramClearMetersIn ramClearMetersOut isSupplemental'
    ).lean<
      Array<{
        machineId: string;
        sasMetersIn: number | null;
        sasMetersOut: number | null;
        sasEndTime?: Date;
        locationName: string;
        locationId?: string;
        prevSasMetersIn?: number;
        prevSasMetersOut?: number;
        manualMetersIn?: number;
        manualMetersOut?: number;
        ramClear?: boolean;
        ramClearMetersIn?: number;
        ramClearMetersOut?: number;
        isSupplemental?: boolean;
      }>
    >();

    if (submittedMachines.length > 0) {
      await persistMachineMetersOnSubmit(
        sessionId,
        submittedMachines,
        sessionEndTime
      );
    }

    // ============================================================================
    // STEP 9: Log Activity
    // ============================================================================
    try {
      await logSubmitActivity(sessionId, req, {
        _id: userPayload._id as string,
        emailAddress: userPayload.emailAddress as string,
        roles: userPayload.roles as string[],
      });
    } catch (logError) {
      console.error(
        'Failed to log collection report V2 submit activity:',
        logError
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        machinesUpdated: result.modifiedCount,
        sessionStartTime: sessionStartTime?.toISOString(),
        sessionEndTime: sessionEndTime.toISOString(),
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'PATCH',
      `/api/collection-reports-v2/sessions/${sessionId}/submit`,
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
