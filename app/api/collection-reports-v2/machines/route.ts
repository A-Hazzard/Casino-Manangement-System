/**
 * Collection Report V2 — Machine Capture API
 *
 * POST  /api/collection-reports-v2/machines
 * Saves a single machine capture record after the user confirms the photo
 * and answers the meters-match question.
 *
 * PATCH /api/collection-reports-v2/machines?id=xxx
 * Updates a machine capture record (status, meters, photo, etc.)
 *
 * ## Movement Calculation
 * See: app/api/lib/helpers/collectionReportV2/movement.ts
 *
 * Flow (POST):
 *   1. Validate required fields and status.
 *   2. Call computeMovement to get prevSas values, movement deltas, and sasGross.
 *   3. For metersMatch false, sasMetersIn/Out are overridden with Machine.sasMeters values.
 *   4. Persist the ReportedMachine document.
 *
 * Flow (PATCH):
 *   1. Build updateData from body fields.
 *   2. Re-run computeMovement whenever meters or metersMatch changes.
 *   3. Persist via findOneAndUpdate.
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import {
  extractUserFromRequest,
  logRouteCreate,
  logRouteUpdate,
  logRouteError,
} from '@/app/api/lib/utils/routeLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { generateMongoId } from '@/lib/utils/id';
import { deleteDriveFile } from '@/lib/utils/drive';
import { NextRequest, NextResponse } from 'next/server';
import type {
  ReportedMachineStatus,
  ReportedMachineDocument,
} from '@/app/api/lib/models/reportedMachines';
import {
  CaptureMachinePayload,
  UpdateMachinePayload,
} from '@/app/api/lib/types/collectionReportV2';
import { computeMovement } from '@/app/api/lib/helpers/collectionReportV2/movement';
import { cascadeMachineEdit, propagateV2MetersToNextSession } from '@/app/api/lib/helpers/collectionReportV2/recalculation';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/collection-reports-v2/machines';
  const user = extractUserFromRequest(req);

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
    const body = (await req.json()) as CaptureMachinePayload;
    const {
      sessionId,
      machineId,
      locationId,
      locationName,
      status,
      metersMatch,
    } = body;

    if (!sessionId || !machineId || !locationId || !locationName) {
      return NextResponse.json(
        {
          success: false,
          error: 'sessionId, machineId, locationId, locationName are required',
        },
        { status: 400 }
      );
    }

    const validStatuses: ReportedMachineStatus[] = [
      'pending',
      'captured',
      'confirmed',
      'skipped',
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: RAM clear validation
    // ============================================================================
    // When ramClear is true, both peak meter values are required.
    const ramClear = body.ramClear === true;
    const ramClearIn =
      body.ramClearMetersIn !== undefined && body.ramClearMetersIn !== null
        ? Number(body.ramClearMetersIn)
        : undefined;
    const ramClearOut =
      body.ramClearMetersOut !== undefined && body.ramClearMetersOut !== null
        ? Number(body.ramClearMetersOut)
        : undefined;
    if (ramClear && (ramClearIn === undefined || ramClearOut === undefined)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'ramClearMetersIn and ramClearMetersOut are required when ramClear is true',
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 5: Build the base document
    // ============================================================================
    const id = await generateMongoId();

    const sasStartTime = body.sasStartTime
      ? new Date(body.sasStartTime)
      : undefined;
    const sasEndTime = body.sasEndTime ? new Date(body.sasEndTime) : new Date();

    // ============================================================================
    // STEP 6: Compute movement delta (current - previous submitted session)
    // ============================================================================
    const {
      prevMeters,
      movement,
      sasGross,
      resolvedSasMetersIn,
      resolvedSasMetersOut,
      isSupplemental,
    } = await computeMovement(
      machineId,
      sessionId,
      Number(body.sasMetersIn) || 0,
      Number(body.sasMetersOut) || 0,
      body.manualMetersIn !== undefined
        ? Number(body.manualMetersIn)
        : undefined,
      body.manualMetersOut !== undefined
        ? Number(body.manualMetersOut)
        : undefined,
      metersMatch,
      sasStartTime,
      sasEndTime,
      ramClear,
      ramClearIn,
      ramClearOut
    );

    // Now that prev values are known, enforce the V1 invariant:
    //   ramClearMetersIn  >= prevSasMetersIn
    //   ramClearMetersOut >= prevSasMetersOut
    if (ramClear) {
      if (
        (ramClearIn as number) < prevMeters.prevSasMetersIn ||
        (ramClearOut as number) < prevMeters.prevSasMetersOut
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'ramClearMetersIn/Out must be greater than or equal to previous meters',
          },
          { status: 400 }
        );
      }
    }

    // ============================================================================
    // STEP 7: Log computed values
    // ============================================================================
    console.log(
      `[${functionName}] POST captured machine:`,
      JSON.stringify(
        {
          machineId,
          sessionId,
          status,
          metersMatch,
          bodySasIn: body.sasMetersIn,
          bodySasOut: body.sasMetersOut,
          bodyManualIn: body.manualMetersIn,
          bodyManualOut: body.manualMetersOut,
          resolvedSasIn: resolvedSasMetersIn,
          resolvedSasOut: resolvedSasMetersOut,
          prevSasIn: prevMeters.prevSasMetersIn,
          prevSasOut: prevMeters.prevSasMetersOut,
          movement,
          sasGross,
          sasStartTime: sasStartTime?.toISOString(),
          sasEndTime: sasEndTime?.toISOString(),
        },
        null,
        2
      )
    );

    // ============================================================================
    // STEP 8: Build the final document
    // ============================================================================
    const docData: Omit<ReportedMachineDocument, 'createdAt' | 'updatedAt'> = {
      _id: id,
      sessionId,
      sessionStatus: 'in-progress',
      locationId,
      locationName,
      licencee: body.licencee || '',
      machineId,
      machineName: body.machineName || '',
      machineCustomName: body.machineCustomName || '',
      serialNumber: body.serialNumber || '',
      manufacturer: body.manufacturer || '',
      game: body.game || '',
      collector: body.collector || String(userPayload._id),
      collectorName: body.collectorName || '',
      sasMetersIn: resolvedSasMetersIn,
      sasMetersOut: resolvedSasMetersOut,
      sasGross,
      // For noSMIB, resolvedSasMetersIn/Out are null (no relay), so manual
      // meters must come from the body directly — not from the null SAS value.
      manualMetersIn:
        body.manualMetersIn !== undefined
          ? Number(body.manualMetersIn)
          : metersMatch === true
            ? resolvedSasMetersIn
            : undefined,
      manualMetersOut:
        body.manualMetersOut !== undefined
          ? Number(body.manualMetersOut)
          : metersMatch === true
            ? resolvedSasMetersOut
            : undefined,
      prevSasMetersIn: prevMeters.prevSasMetersIn,
      prevSasMetersOut: prevMeters.prevSasMetersOut,
      movement,
      isSupplemental,
      ramClear,
      ramClearMetersIn: ramClear ? ramClearIn : undefined,
      ramClearMetersOut: ramClear ? ramClearOut : undefined,
      sasStartTime,
      sasEndTime,
      metersMatch: body.metersMatch ?? undefined,
      sequenceOrder: Number(body.sequenceOrder) || 0,
      status,
      deletedAt: null,
      // Store base64 image temporarily until session is submitted,
      // at which point it gets uploaded to Google Drive and this field is cleared.
      tempImageData: body.imageData?.startsWith('data:image/')
        ? body.imageData
        : undefined,
    };

    // ============================================================================
    // STEP 9: Save document and log activity
    // ============================================================================
    const doc = await ReportedMachine.create(docData);

    const duration = Date.now() - startTime;
    logRouteCreate(
      functionName,
      'POST',
      '/api/collection-reports-v2/machines',
      1,
      user,
      duration
    );

    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'POST',
      '/api/collection-reports-v2/machines',
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH — Update a machine capture record
// ============================================================================

export async function PATCH(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'PATCH /api/collection-reports-v2/machines';
  const user = extractUserFromRequest(req);

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
    const { searchParams } = new URL(req.url);
    const reportedMachineId = searchParams.get('id');
    if (!reportedMachineId) {
      return NextResponse.json(
        { success: false, error: 'id query param is required' },
        { status: 400 }
      );
    }

    const body = (await req.json()) as UpdateMachinePayload;

    // ============================================================================
    // STEP 3.5: Chronological edit check
    // ============================================================================
    const targetMachine = await ReportedMachine.findOne({ _id: reportedMachineId }).lean<ReportedMachineDocument>();
    if (!targetMachine) {
      return NextResponse.json(
        { success: false, error: 'Machine capture not found' },
        { status: 404 }
      );
    }

    const keyFields = [
      'sasMetersIn',
      'sasMetersOut',
      'manualMetersIn',
      'manualMetersOut',
      'ramClear',
      'ramClearMetersIn',
      'ramClearMetersOut',
      'sasStartTime',
      'sasEndTime',
    ];
    const isModifyingKeyFields = keyFields.some(key => body[key as keyof UpdateMachinePayload] !== undefined);

    if (isModifyingKeyFields && targetMachine.machineId) {
      const targetTime = body.sasEndTime ? new Date(body.sasEndTime as string) : (targetMachine.sasEndTime || new Date());
      
      const nextReport = await ReportedMachine.findOne({
        machineId: targetMachine.machineId,
        sessionStatus: 'submitted',
        sessionId: { $ne: targetMachine.sessionId },
        sasEndTime: { $gt: targetTime },
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
      }).lean();

      if (nextReport) {
        const prevReport = await ReportedMachine.findOne({
          machineId: targetMachine.machineId,
          sessionStatus: 'submitted',
          sessionId: { $ne: targetMachine.sessionId },
          sasEndTime: { $lt: targetTime },
          $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
        }).lean();

        if (prevReport) {
          return NextResponse.json(
            {
              success: false,
              error: 'Chronological check failed: cannot edit into a middle-date report. A more recent collection session has already been submitted for this machine. To make changes, you must revert or delete the newer session(s) first.',
            },
            { status: 400 }
          );
        }
      }
    }


    const updateData: Partial<ReportedMachineDocument> = {};
    const dateFields = [
      'sasStartTime',
      'sasEndTime',
      'imageCapturedAt',
    ] as const;

    for (const field of dateFields) {
      if (body[field]) {
        updateData[field] = new Date(body[field] as string);
      }
    }

    if (body.status !== undefined) updateData.status = body.status;
    if (body.sasMetersIn !== undefined)
      updateData.sasMetersIn = body.sasMetersIn;
    if (body.sasMetersOut !== undefined)
      updateData.sasMetersOut = body.sasMetersOut;
    if (body.manualMetersIn !== undefined)
      updateData.manualMetersIn = body.manualMetersIn;
    if (body.manualMetersOut !== undefined)
      updateData.manualMetersOut = body.manualMetersOut;
    if (body.metersMatch !== undefined)
      updateData.metersMatch = body.metersMatch;
    if (body.notes !== undefined) updateData.notes = body.notes;

    // RAM clear toggle handling. When body.ramClear is explicitly false we
    // also unset the peak fields so the doc matches V1's $unset behavior on
    // toggle-off (see collections/[id]/route.ts).
    const unsetData: Record<string, 1> = {};
    if (body.ramClear !== undefined) {
      updateData.ramClear = body.ramClear;
      if (body.ramClear === false) {
        unsetData.ramClearMetersIn = 1;
        unsetData.ramClearMetersOut = 1;
      }
    }
    if (body.ramClearMetersIn !== undefined && body.ramClearMetersIn !== null) {
      updateData.ramClearMetersIn = Number(body.ramClearMetersIn);
    }
    if (
      body.ramClearMetersOut !== undefined &&
      body.ramClearMetersOut !== null
    ) {
      updateData.ramClearMetersOut = Number(body.ramClearMetersOut);
    }

    // ============================================================================
    // STEP 4: For noSMIB locations enforce null on all SAS fields
    // ============================================================================
    // regardless of what the payload or stored document contains. Stale non-null SAS values
    // from sessions captured before this rule existed must be wiped on every
    // edit so they never leak into SAS columns.
    {
      if (targetMachine?.locationId) {
        const { GamingLocations } =
          await import('@/app/api/lib/models/gaminglocations');
        const locForCheck = await GamingLocations.findOne(
          { _id: targetMachine.locationId },
          'noSMIBLocation'
        ).lean<{ noSMIBLocation?: boolean }>();

        if (locForCheck?.noSMIBLocation === true) {
          updateData.sasMetersIn = null;
          updateData.sasMetersOut = null;
          updateData.sasGross = null;
        }
      }
    }

    // ============================================================================
    // STEP 5: Handle image updates
    // ============================================================================
    // Handle removeImage flag — delete existing Drive file and clear temp data
    const removeImage = body.removeImage === true;
    if (removeImage) {
      const existing = await ReportedMachine.findOne(
        { _id: reportedMachineId },
        'driveFileId'
      ).lean();

      const oldDriveFileId = existing?.driveFileId as string | undefined;
      if (oldDriveFileId) {
        await deleteDriveFile(oldDriveFileId).catch(deleteError => {
          console.error(
            '[PATCH machines] Failed to delete Drive file on remove:',
            deleteError
          );
        });
        updateData.driveFileId = null;
        updateData.driveFolderId = null;
      }
      // Also clear any temporary base64 image stored during in-progress capture
      updateData.tempImageData = undefined;
    }

    // Handle imageData — store base64 temporarily in MongoDB until session submit
    if (!removeImage && body.imageData !== undefined) {
      if (body.imageData?.startsWith('data:image/')) {
        updateData.tempImageData = body.imageData;
      }
    }

    // ============================================================================
    // STEP 6: Recompute movement if meters, metersMatch, or RAM clear changed
    // ============================================================================
    const shouldRecalcMovement =
      body.status === 'confirmed' ||
      body.status === 'captured' ||
      body.sasMetersIn !== undefined ||
      body.sasMetersOut !== undefined ||
      body.manualMetersIn !== undefined ||
      body.manualMetersOut !== undefined ||
      body.metersMatch !== undefined ||
      body.ramClear !== undefined ||
      body.ramClearMetersIn !== undefined ||
      body.ramClearMetersOut !== undefined;

    if (shouldRecalcMovement) {
      // Fetch the current document to get machineId, sessionId, and latest meters
      const currentDoc = await ReportedMachine.findOne(
        { _id: reportedMachineId },
        'machineId sessionId sasMetersIn sasMetersOut manualMetersIn manualMetersOut metersMatch sasStartTime sasEndTime ramClear ramClearMetersIn ramClearMetersOut'
      ).lean<{
        machineId: string;
        sessionId: string;
        sasMetersIn: number;
        sasMetersOut: number;
        manualMetersIn?: number;
        manualMetersOut?: number;
        metersMatch?: boolean;
        sasStartTime?: Date;
        sasEndTime?: Date;
        ramClear?: boolean;
        ramClearMetersIn?: number;
        ramClearMetersOut?: number;
      }>();

      if (currentDoc) {
        // Merge incoming values with existing stored values.
        // Use explicit null check instead of ?? so that an intentional null
        // (noSMIB enforcement above) is honoured rather than falling back to
        // the stale stored value.
        const resolvedSasIn =
          updateData.sasMetersIn !== undefined
            ? updateData.sasMetersIn
            : currentDoc.sasMetersIn;
        const resolvedSasOut =
          updateData.sasMetersOut !== undefined
            ? updateData.sasMetersOut
            : currentDoc.sasMetersOut;
        const resolvedMetersMatch =
          updateData.metersMatch ?? currentDoc.metersMatch;
        // For noSMIB metersMatch===true but sasMetersIn is null (no relay).
        // Prefer the explicit body value, then existing stored manual meters,
        // and only fall back to SAS meters when they are non-null (SMIB case).
        const resolvedManualIn =
          updateData.manualMetersIn !== undefined
            ? updateData.manualMetersIn
            : resolvedMetersMatch === true && resolvedSasIn !== null
              ? resolvedSasIn
              : (currentDoc.manualMetersIn ?? undefined);
        const resolvedManualOut =
          updateData.manualMetersOut !== undefined
            ? updateData.manualMetersOut
            : resolvedMetersMatch === true && resolvedSasOut !== null
              ? resolvedSasOut
              : (currentDoc.manualMetersOut ?? undefined);
        const resolvedSasStart =
          updateData.sasStartTime ?? currentDoc.sasStartTime;
        const resolvedSasEnd = updateData.sasEndTime ?? currentDoc.sasEndTime;

        // Resolve RAM clear: explicit body value wins, else use stored value.
        // When ramClear ends up false, peak values are ignored downstream.
        const resolvedRamClear =
          body.ramClear !== undefined
            ? body.ramClear
            : (currentDoc.ramClear ?? false);
        const resolvedRamClearIn = resolvedRamClear
          ? (updateData.ramClearMetersIn ?? currentDoc.ramClearMetersIn)
          : undefined;
        const resolvedRamClearOut = resolvedRamClear
          ? (updateData.ramClearMetersOut ?? currentDoc.ramClearMetersOut)
          : undefined;

        const {
          prevMeters,
          movement,
          sasGross,
          resolvedSasMetersIn,
          resolvedSasMetersOut,
          isSupplemental,
        } = await computeMovement(
          currentDoc.machineId,
          currentDoc.sessionId,
          resolvedSasIn ?? 0,
          resolvedSasOut ?? 0,
          resolvedManualIn ?? undefined,
          resolvedManualOut ?? undefined,
          resolvedMetersMatch,
          resolvedSasStart,
          resolvedSasEnd,
          resolvedRamClear,
          resolvedRamClearIn,
          resolvedRamClearOut
        );

        // Enforce ramClear peak >= prev invariant (mirrors V1).
        if (
          resolvedRamClear &&
          resolvedRamClearIn !== undefined &&
          resolvedRamClearOut !== undefined &&
          (resolvedRamClearIn < prevMeters.prevSasMetersIn ||
            resolvedRamClearOut < prevMeters.prevSasMetersOut)
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                'ramClearMetersIn/Out must be greater than or equal to previous meters',
            },
            { status: 400 }
          );
        }

        console.log(
          `[${functionName}] PATCH recomputed movement:`,
          JSON.stringify(
            {
              reportedMachineId,
              resolvedSasIn,
              resolvedSasOut,
              resolvedManualIn,
              resolvedManualOut,
              resolvedMetersMatch,
              prevMeters,
              resolvedSasMetersIn,
              resolvedSasMetersOut,
              movement,
              sasGross,
            },
            null,
            2
          )
        );

        updateData.sasMetersIn = resolvedSasMetersIn;
        updateData.sasMetersOut = resolvedSasMetersOut;
        updateData.sasGross = sasGross;
        updateData.isSupplemental = isSupplemental;
        updateData.prevSasMetersIn = prevMeters.prevSasMetersIn;
        updateData.prevSasMetersOut = prevMeters.prevSasMetersOut;
        updateData.movement = movement;
        // For SMIB locations with metersMatch===true, mirror SAS into manual.
        // Skip for noSMIB (resolvedSasMetersIn is null) — manual meters were
        // already set correctly from the payload above.
        if (resolvedMetersMatch === true && resolvedSasMetersIn !== null) {
          updateData.manualMetersIn = resolvedSasMetersIn;
          updateData.manualMetersOut = resolvedSasMetersOut;
        }
      }
    }

    if (
      Object.keys(updateData).length === 0 &&
      Object.keys(unsetData).length === 0 &&
      !removeImage
    ) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // When toggling ramClear off the peak fields are also being set above by
    // recalc — strip them from updateData so $unset is the only operation
    // applied to those keys (otherwise Mongo would error on conflict).
    if (Object.keys(unsetData).length > 0) {
      if ('ramClearMetersIn' in unsetData)
        delete updateData.ramClearMetersIn;
      if ('ramClearMetersOut' in unsetData)
        delete updateData.ramClearMetersOut;
    }

    const updateOps: Record<string, unknown> = {};
    if (Object.keys(updateData).length > 0) updateOps.$set = updateData;
    if (Object.keys(unsetData).length > 0) updateOps.$unset = unsetData;

    // ============================================================================
    // STEP 7: Update document
    // ============================================================================
    let result = await ReportedMachine.findOneAndUpdate(
      { _id: reportedMachineId },
      updateOps,
      { new: true }
    ).lean();

    // Legacy fallback: documents created with insertMany + _id: undefined
    // may have ObjectId _id instead of string. Try native query.
    if (!result) {
      const mongoose = (await import('mongoose')).default;
      if (mongoose.Types.ObjectId.isValid(reportedMachineId)) {
        const nativeResult = await ReportedMachine.collection.findOneAndUpdate(
          { _id: new mongoose.Types.ObjectId(reportedMachineId) },
          updateOps,
          { returnDocument: 'after' }
        );
        if (nativeResult) {
          result = JSON.parse(JSON.stringify(nativeResult));
        }
      }
    }

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Machine capture not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 8: Cascade to Machine + Meters if session is submitted (edit mode)
    // ============================================================================
    if (result.sessionStatus === 'submitted') {
      cascadeMachineEdit({
        machineId: result.machineId,
        sessionId: result.sessionId,
        locationId: result.locationId,
        locationName: result.locationName,
        sasEndTime: result.sasEndTime,
        manualMetersIn: result.manualMetersIn,
        manualMetersOut: result.manualMetersOut,
        sasMetersIn: result.sasMetersIn,
        sasMetersOut: result.sasMetersOut,
        prevSasMetersIn: result.prevSasMetersIn,
        prevSasMetersOut: result.prevSasMetersOut,
        ramClear: result.ramClear,
        ramClearMetersIn: result.ramClearMetersIn,
        ramClearMetersOut: result.ramClearMetersOut,
      }).catch(cascadeErr => {
        console.error(`[${functionName}] Cascade failed:`, cascadeErr);
      });

      // Propagate updated meters forward to the next session if this was a middle-date edit
      propagateV2MetersToNextSession(
        result.machineId,
        result.sessionId,
        result.manualMetersIn ?? result.sasMetersIn,
        result.manualMetersOut ?? result.sasMetersOut,
        result.sasEndTime
      ).catch(propErr => {
        console.error(`[${functionName}] Propagation failed:`, propErr);
      });
    }

    // ============================================================================
    // STEP 9: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteUpdate(
      functionName,
      'PATCH',
      `/api/collection-reports-v2/machines?id=${reportedMachineId}`,
      1,
      user,
      duration
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'PATCH',
      '/api/collection-reports-v2/machines',
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
