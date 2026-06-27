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
 *   2. Call computeMovement to get prev values, movement deltas, and sasGross.
 *   3. For metersMatch false, sasMetersIn/Out are overridden with Machine.sasMeters.
 *   4. Persist the ReportedMachine document.
 *
 * Flow (PATCH):
 *   1. Build updateData from body fields.
 *   2. Re-run computeMovement whenever meters or metersMatch changes.
 *   3. Persist via findOneAndUpdate.
 *
 * @module app/api/collection-reports-v2/machines/route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import {
  extractUserFromRequest,
  logRouteCreate,
  logRouteUpdate,
  logRouteError,
} from '@/app/api/lib/utils/routeLogger';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { generateMongoId } from '@/lib/utils/id';
import { computeMovement } from '@/app/api/lib/helpers/collectionReportV2/movement';
import { NextRequest, NextResponse } from 'next/server';
import type {
  CaptureMachinePayload,
  UpdateMachinePayload,
} from '@/app/api/lib/types/collectionReportV2';
import {
  validateCapturePayload,
  validateRamClearPeak,
  buildCaptureDocumentData,
  checkChronologicalEdit,
  buildUpdateDataFromPayload,
  enforceNoRelayNullSas,
  handleImageUpdates,
  shouldRecalculateMovement,
  resolveAndRecalculateMovement,
  applyMongoUpdate,
  handlePostSubmitCascade,
} from '@/app/api/lib/helpers/collectionReportV2/machineOperations';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/collection-reports-v2/machines';
  const user = extractUserFromRequest(req);

  return withApiAuth(req, async ({ user: userPayload }) => {
    try {
    // ============================================================================
    // STEP 1: Parse and validate request body
    // ============================================================================
    const body = (await req.json()) as CaptureMachinePayload;
    const parsed = validateCapturePayload(body);
    if ('error' in parsed) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: parsed.status }
      );
    }

    // ============================================================================
    // STEP 4: Compute movement delta
    // ============================================================================
    const {
      prevMeters,
      movement,
      sasGross,
      resolvedSasMetersIn,
      resolvedSasMetersOut,
      isSupplemental,
    } = await computeMovement(
      parsed.data.machineId,
      parsed.data.sessionId,
      Number(body.sasMetersIn) || 0,
      Number(body.sasMetersOut) || 0,
      body.manualMetersIn !== undefined
        ? Number(body.manualMetersIn)
        : undefined,
      body.manualMetersOut !== undefined
        ? Number(body.manualMetersOut)
        : undefined,
      parsed.data.metersMatch,
      parsed.data.sasStartTime,
      parsed.data.sasEndTime,
      parsed.data.ramClear,
      parsed.data.ramClearIn,
      parsed.data.ramClearOut,
      body.softMetersIn !== undefined ? Number(body.softMetersIn) : undefined,
      body.softMetersOut !== undefined ? Number(body.softMetersOut) : undefined
    );

    // Enforce V1 invariant: ramClear peak >= prev
    if (parsed.data.ramClear) {
      const peakError = validateRamClearPeak(
        parsed.data.ramClearIn as number,
        parsed.data.ramClearOut as number,
        prevMeters.prevSasMetersIn,
        prevMeters.prevSasMetersOut
      );
      if (peakError) {
        return NextResponse.json(
          { success: false, error: peakError.error },
          { status: peakError.status }
        );
      }
    }

    // ============================================================================
    // STEP 5: Build and persist the document
    // ============================================================================
    const id = await generateMongoId();
    const docData = buildCaptureDocumentData(
      id,
      parsed.data,
      body,
      String(userPayload._id),
      { prevMeters, movement, sasGross, resolvedSasMetersIn, resolvedSasMetersOut, isSupplemental }
    );

    const doc = await ReportedMachine.create(docData);

    const machineName = String(body.machineCustomName || body.machineName || parsed.data.machineId);
    logActivity({
      action: 'CREATE',
      details: `Captured machine ${machineName} in V2 session ${parsed.data.sessionId}`,
      userId: String(userPayload._id),
      username: String(userPayload.emailAddress ?? userPayload._id),
      metadata: {
        userId: String(userPayload._id),
        userEmail: String(userPayload.emailAddress ?? ''),
        resource: 'collection-report-v2-machine',
        resourceId: String(doc._id),
        resourceName: machineName,
        changes: [
          { field: 'sessionId', oldValue: null, newValue: parsed.data.sessionId },
          { field: 'machineId', oldValue: null, newValue: parsed.data.machineId },
          { field: 'sasMetersIn', oldValue: null, newValue: docData.sasMetersIn },
          { field: 'sasMetersOut', oldValue: null, newValue: docData.sasMetersOut },
        ],
      },
    }).catch(logError => {
      console.error('[POST machines] Failed to log activity:', logError instanceof Error ? logError.message : 'Unknown error');
    });

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[POST /api/collection-reports-v2/machines] slow: ${duration}ms`);
    }
    logRouteCreate(functionName, 'POST', '/api/collection-reports-v2/machines', 1, user, duration);

    return NextResponse.json({ success: true, data: doc });
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Internal server error';
    logRouteError(functionName, 'POST', '/api/collection-reports-v2/machines', errorMessage, user);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
  });
}

// ============================================================================
// PATCH — Update a machine capture record
// ============================================================================

export async function PATCH(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'PATCH /api/collection-reports-v2/machines';
  const user = extractUserFromRequest(req);

  return withApiAuth(req, async ({ user: userPayload }) => {
    try {

    // ============================================================================
    // STEP 3: Parse ID and request body
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
    // STEP 4: Fetch target document and check chronological validity
    // ============================================================================
    const targetMachine = await ReportedMachine.findOne({
      _id: reportedMachineId,
    }).lean<import('@/app/api/lib/models/reportedMachines').ReportedMachineDocument>();
    if (!targetMachine) {
      return NextResponse.json(
        { success: false, error: 'Machine capture not found' },
        { status: 404 }
      );
    }

    const chronoError = await checkChronologicalEdit(targetMachine, body);
    if (chronoError) {
      return NextResponse.json(
        { success: false, error: chronoError.error },
        { status: chronoError.status }
      );
    }

    // ============================================================================
    // STEP 5: Build update data from body
    // ============================================================================
    const { updateData, unsetData } = buildUpdateDataFromPayload(body);

    // Applicable when ramClear toggled off — strip peak fields from $set
    if (Object.keys(unsetData).length > 0) {
      if ('ramClearMetersIn' in unsetData) delete updateData.ramClearMetersIn;
      if ('ramClearMetersOut' in unsetData) delete updateData.ramClearMetersOut;
    }

    // ============================================================================
    // STEP 6: Enforce null SAS for non-relay machines
    // ============================================================================
    if (targetMachine.machineId) {
      await enforceNoRelayNullSas(targetMachine.machineId, updateData);
    }

    // ============================================================================
    // STEP 7: Handle image updates
    // ============================================================================
    const removeImage = body.removeImage === true;
    await handleImageUpdates(reportedMachineId, body, updateData, removeImage);

    // ============================================================================
    // STEP 8: Recompute movement if meters, metersMatch, or RAM clear changed
    // ============================================================================
    if (shouldRecalculateMovement(body)) {
      const recalcResult = await resolveAndRecalculateMovement(
        reportedMachineId,
        body,
        updateData
      );
      if ('error' in recalcResult) {
        return NextResponse.json(
          { success: false, error: recalcResult.error },
          { status: recalcResult.status }
        );
      }

      // Merge recalculated fields into updateData
      Object.assign(updateData, recalcResult.data);
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

    // ============================================================================
    // STEP 9: Apply MongoDB update
    // ============================================================================
    const result = await applyMongoUpdate(reportedMachineId, updateData, unsetData);
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Machine capture not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 10: Cascade to Machine + Meters if session is submitted
    // ============================================================================
    if (result.sessionStatus === 'submitted') {
      handlePostSubmitCascade(result, functionName);
    }

    // ============================================================================
    // STEP 11: Log activity and return response
    // ============================================================================
    const patchMachineName = String(
      result.machineCustomName || result.machineName || reportedMachineId
    );
    logActivity({
      action: 'UPDATE',
      details: `Edited machine ${patchMachineName} in V2 session ${result.sessionId}`,
      userId: String(userPayload._id),
      username: String(userPayload.emailAddress ?? userPayload._id),
      metadata: {
        userId: String(userPayload._id),
        userEmail: String(userPayload.emailAddress ?? ''),
        resource: 'collection-report-v2-machine',
        resourceId: reportedMachineId,
        resourceName: patchMachineName,
        changes: Object.entries(updateData).map(([field, newValue]) => ({
          field,
          oldValue: null,
          newValue,
        })),
      },
    }).catch(logError => {
      console.error('[PATCH machines] Failed to log activity:', logError instanceof Error ? logError.message : 'Unknown error');
    });

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[PATCH /api/collection-reports-v2/machines] slow: ${duration}ms`);
    }
    logRouteUpdate(
      functionName,
      'PATCH',
      `/api/collection-reports-v2/machines?id=${reportedMachineId}`,
      1,
      user,
      duration
    );

    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Internal server error';
    logRouteError(functionName, 'PATCH', '/api/collection-reports-v2/machines', errorMessage, user);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
  });
}
