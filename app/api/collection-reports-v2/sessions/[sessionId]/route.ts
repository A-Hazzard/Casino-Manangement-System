/**
 * Collection Report V2 — Session Detail API
 *
 * GET /api/collection-reports-v2/sessions/[sessionId]
 * Returns all reported machines for a single session, ordered by sequenceOrder.
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import { Machine } from '@/app/api/lib/models/machines';
import UserModel from '@/app/api/lib/models/user';
import { Meters } from '@/app/api/lib/models/meters';
import { determineAllowedLocationIds } from '@/app/api/lib/helpers/collectionReport/queries';
import { deleteDriveFile, deleteDriveFolder } from '@/lib/utils/drive';
import {
  extractUserFromRequest,
  logRouteFetch,
  logRouteError,
} from '@/app/api/lib/utils/routeLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import {
  logRouteDelete,
  logRouteUpdate,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const startTime = Date.now();
  const functionName = 'GET /api/collection-reports-v2/sessions/[sessionId]';
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
    // STEP 3: Parse session ID
    // ============================================================================
    sessionId = (await params).sessionId;
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Fetch all machines for this session
    // ============================================================================
    const machines = await ReportedMachine.find({
      sessionId,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    })
      .sort({ sequenceOrder: 1 })
      .lean();

    if (machines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 5: Verify user can access this session's location
    // ============================================================================
    const sessionLocationId = machines[0].locationId;
    const userPayloadRecord = userPayload as unknown as Record<string, unknown>;
    const userRoles = (userPayloadRecord.roles as string[]) || [];
    const userLicencees =
      (userPayloadRecord.assignedLicencees as string[]) || [];
    const userLocations =
      (userPayloadRecord.assignedLocations as string[]) || [];
    const allowedLocationIds = await determineAllowedLocationIds(
      userRoles,
      userLicencees,
      userLocations
    );
    if (
      allowedLocationIds !== 'all' &&
      !allowedLocationIds.includes(sessionLocationId)
    ) {
      logRouteError(
        functionName,
        'GET',
        `/api/collection-reports-v2/sessions/${sessionId}`,
        'Location access denied',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 6: Look up last collection time per machine
    // ============================================================================
    // Uses only V2 ReportedMachine records: the sasEndTime of the most recent
    // submitted report for that machine (excluding the current session).
    // This sasEndTime represents the end of the previous SAS collection period
    // and is used as the sasStartTime for the next collection.
    const machineIds = [...new Set(machines.map(m => m.machineId))];
    const currentMachineIds = machines.map(m =>
      (m as { _id: string })._id.toString()
    );

    const previousSubmissions = await ReportedMachine.aggregate([
      {
        $match: {
          machineId: { $in: machineIds },
          sessionStatus: 'submitted',
          _id: { $nin: currentMachineIds },
          $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        },
      },
      { $sort: { sasEndTime: -1 } },
      { $group: { _id: '$machineId', sasEndTime: { $first: '$sasEndTime' } } },
    ]);

    const lastCollectionMap = new Map(
      previousSubmissions.map(s => [s._id as string, s.sasEndTime as Date])
    );

    // Fetch Machine collectionTimes + live sasMeters for fallback when
    // legacy ReportedMachine docs don't have sasMetersIn/Out stored.
    const machineDocs = await Machine.find({
      _id: { $in: machineIds },
    })
      .select('collectionTime sasMeters')
      .lean<
        {
          _id: string;
          collectionTime?: Date;
          sasMeters?: { drop?: number; totalCancelledCredits?: number };
        }[]
      >();

    const machineCollectionTimeMap = new Map(
      machineDocs.map(m => [
        String(m._id),
        m.collectionTime as Date | undefined,
      ])
    );

    // Maps machineId → live sasMeters so we can fall back for legacy sessions
    const liveSasMetersMap = new Map(
      machineDocs.map(m => [
        String(m._id),
        {
          drop: m.sasMeters?.drop,
          totalCancelledCredits: m.sasMeters?.totalCancelledCredits,
        },
      ])
    );

    const getLastCollectionTime = (machineId: string): Date | null =>
      lastCollectionMap.get(machineId) ??
      machineCollectionTimeMap.get(machineId) ??
      null;

    // ============================================================================
    // STEP 7: Look up collector details
    // ============================================================================
    const collectorId = machines[0].collector;
    let collectorFirstName: string | undefined;
    let collectorLastName: string | undefined;
    let collectorEmail: string | undefined;
    if (collectorId) {
      const collectorUser = await UserModel.findOne({ _id: collectorId })
        .select('profile.firstName profile.lastName emailAddress')
        .lean<{
          profile?: { firstName?: string; lastName?: string };
          emailAddress?: string;
        }>();
      if (collectorUser) {
        collectorFirstName = collectorUser.profile?.firstName;
        collectorLastName = collectorUser.profile?.lastName;
        collectorEmail = collectorUser.emailAddress;
      }
    }

    // ============================================================================
    // STEP 8: Look up location to check noSMIBLocation
    // ============================================================================
    const { GamingLocations } =
      await import('@/app/api/lib/models/gaminglocations');
    const locationDoc = await GamingLocations.findOne({
      _id: sessionLocationId,
    })
      .select('noSMIBLocation')
      .lean<{ noSMIBLocation?: boolean }>();
    const noSMIBLocation = locationDoc?.noSMIBLocation ?? false;

    // ============================================================================
    // STEP 9: Build session summary and return
    // ============================================================================
    const sessionData = {
      sessionId,
      sessionStatus: machines[0].sessionStatus,
      locationId: sessionLocationId,
      locationName: machines[0].locationName,
      noSMIBLocation,
      licencee: machines[0].licencee,
      collector: collectorId,
      collectorName: machines[0].collectorName,
      collectorFirstName,
      collectorLastName,
      collectorEmail,
      sessionStartTime: machines[0].sessionStartTime,
      sessionEndTime: machines[0].sessionEndTime,
      machinesTotal: machines.length,
      machinesCaptured: machines.filter(m =>
        ['captured', 'confirmed'].includes(m.status)
      ).length,
      // For noSMIB locations every captured/confirmed machine is implicitly matched
      // since there are no SAS meters to compare against.
      machinesConfirmed: noSMIBLocation
        ? machines.filter(m => ['captured', 'confirmed'].includes(m.status))
            .length
        : machines.filter(m => m.status === 'confirmed').length,
      machinesSkipped: machines.filter(m => m.status === 'skipped').length,
      createdAt: machines[0].createdAt,
      machines: machines.map(m => {
        // Fall back to live machine sasMeters when the stored value is null/undefined
        // (legacy sessions created before sasMetersIn/Out were persisted on ReportedMachine).
        // For no-SMIB locations, fall back to manualMetersIn/Out since live SAS is null.
        const liveSas = liveSasMetersMap.get(m.machineId);
        const resolvedSasMetersIn =
          m.sasMetersIn != null
            ? m.sasMetersIn
            : noSMIBLocation
              ? (m.manualMetersIn ?? null)
              : (liveSas?.drop ?? null);
        const resolvedSasMetersOut =
          m.sasMetersOut != null
            ? m.sasMetersOut
            : noSMIBLocation
              ? (m.manualMetersOut ?? null)
              : (liveSas?.totalCancelledCredits ?? null);

        // Effective manual meters (machine perspective)
        const effectiveManualIn =
          m.metersMatch === true
            ? (resolvedSasMetersIn ?? 0)
            : (m.manualMetersIn ?? resolvedSasMetersIn ?? 0);
        const effectiveManualOut =
          m.metersMatch === true
            ? (resolvedSasMetersOut ?? 0)
            : (m.manualMetersOut ?? resolvedSasMetersOut ?? 0);

        // sasGross: use persisted value; fall back to arithmetic only when
        // both SAS meter values are non-null (i.e. a real SMIB reading exists).
        // For noSMIB sessions both are null, so sasGross stays null.
        const sasGross =
          m.sasGross !== undefined && m.sasGross !== null
            ? m.sasGross
            : resolvedSasMetersIn !== null && resolvedSasMetersOut !== null
              ? resolvedSasMetersIn - resolvedSasMetersOut
              : null;
        // machineGross: prefer movement.machineGross, fallback to manual delta
        const machineGross =
          m.movement?.machineGross ?? effectiveManualIn - effectiveManualOut;

        return {
          reportedMachineId: m._id,
          machineId: m.machineId,
          machineName: m.machineName,
          machineCustomName: m.machineCustomName,
          serialNumber: m.serialNumber,
          manufacturer: m.manufacturer,
          game: m.game,
          status: m.status,
          sequenceOrder: m.sequenceOrder,
          sasMetersIn: resolvedSasMetersIn,
          sasMetersOut: resolvedSasMetersOut,
          sasGross,
          manualMetersIn: m.manualMetersIn,
          manualMetersOut: m.manualMetersOut,
          prevSasMetersIn: m.prevSasMetersIn,
          prevSasMetersOut: m.prevSasMetersOut,
          movement: m.movement,
          machineGross,
          // grossDifference is null when sasGross is null (noSMIB sessions
          // have no SAS relay to compare against).
          grossDifference: sasGross !== null ? machineGross - sasGross : null,
          sasStartTime: m.sasStartTime,
          sasEndTime: m.sasEndTime,
          sessionStartTime: m.sessionStartTime,
          sessionEndTime: m.sessionEndTime,
          imageData: m.driveFileId
            ? `/api/collection-reports-v2/drive-files/${m.driveFileId}`
            : m.tempImageData || undefined,
          metersMatch: noSMIBLocation ? true : m.metersMatch,
          ramClear: m.ramClear === true,
          ramClearMetersIn: m.ramClearMetersIn,
          ramClearMetersOut: m.ramClearMetersOut,
          lastCollectionTime: getLastCollectionTime(m.machineId),
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        };
      }),
    };

    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      `/api/collection-reports-v2/sessions/${sessionId}`,
      machines.length,
      user,
      duration
    );

    return NextResponse.json({ success: true, data: sessionData });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'GET',
      `/api/collection-reports-v2/sessions/${sessionId}`,
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
// DELETE — Permanently delete or archive a session (dev/admin only)
// ============================================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const startTime = Date.now();
  const functionName = 'DELETE /api/collection-reports-v2/sessions/[sessionId]';
  const user = extractUserFromRequest(req);

  let sessionId = '';

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Authenticate user and check permissions
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only developers and admins can delete sessions
    const userPayloadRecord = userPayload as unknown as Record<string, unknown>;
    const userRoles = (userPayloadRecord.roles as string[]) || [];
    if (!userRoles.includes('developer') && !userRoles.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 3: Parse request params
    // ============================================================================
    sessionId = (await params).sessionId;
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Check if session exists
    // ============================================================================
    const existing = await ReportedMachine.findOne({ sessionId })
      .select('sessionStatus')
      .lean();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Parse action from query param (default: permanent)
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'permanent';

    // ============================================================================
    // STEP 5: Clean up Google Drive assets
    // ============================================================================
    // Clean up Google Drive assets for this session before deleting/archiving.
    // Prefer folder-level deletion (deletes folder + all contents in one call).
    // Fall back to individual file deletion for older records without driveFolderId.
    const sessionMachines = await ReportedMachine.find(
      { sessionId },
      'driveFileId driveFolderId'
    ).lean();

    const deletionTasks = sessionMachines.map(async machine => {
      const folderId = machine.driveFolderId as string | undefined;
      const fileId = machine.driveFileId as string | undefined;

      if (folderId) {
        // Delete the entire date folder — removes all photos in that folder
        await deleteDriveFolder(folderId).catch(err =>
          console.error(
            `[DELETE session] Failed to delete Drive folder ${folderId}:`,
            err
          )
        );
      } else if (fileId) {
        // Legacy: delete individual file
        await deleteDriveFile(fileId).catch(err =>
          console.error(
            `[DELETE session] Failed to delete Drive file ${fileId}:`,
            err
          )
        );
      }
    });

    await Promise.allSettled(deletionTasks);

    let count = 0;

    // ============================================================================
    // STEP 6: Execute delete or archive action
    // ============================================================================
    if (action === 'archive') {
      // Soft delete — set deletedAt timestamp
      const updateResult = await ReportedMachine.updateMany(
        { sessionId },
        { $set: { deletedAt: new Date() } }
      );
      count = updateResult.modifiedCount;

      // Soft delete manual meters associated with this V2 session
      await Meters.updateMany(
        { locationSession: sessionId },
        { $set: { deletedAt: new Date() } }
      );
    } else {
      // Permanent delete — remove from database
      const deleteResult = await ReportedMachine.deleteMany({ sessionId });
      count = deleteResult.deletedCount;

      // Permanent delete manual meters associated with this V2 session
      await Meters.deleteMany({ locationSession: sessionId });
    }

    const duration = Date.now() - startTime;
    logRouteDelete(
      functionName,
      'DELETE',
      `/api/collection-reports-v2/sessions/${sessionId}`,
      count,
      user,
      duration
    );

    // ============================================================================
    // STEP 7: Return success response
    // ============================================================================
    return NextResponse.json({
      success: true,
      data: { sessionId, action, count },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'DELETE',
      `/api/collection-reports-v2/sessions/${sessionId}`,
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
// PATCH — Update session-level fields (start/end time)
// ============================================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const startTime = Date.now();
  const functionName = 'PATCH /api/collection-reports-v2/sessions/[sessionId]';
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
    // STEP 3: Parse request params and body
    // ============================================================================
    sessionId = (await params).sessionId;
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { sessionStartTime, sessionEndTime, action } = body as {
      sessionStartTime?: string;
      sessionEndTime?: string;
      action?: string;
    };

    // ============================================================================
    // STEP 4: Restore path — unset deletedAt on ReportedMachine and Meters
    // ============================================================================
    if (action === 'restore') {
      const restoreMachinesResult = await ReportedMachine.updateMany(
        { sessionId },
        { $unset: { deletedAt: 1 } }
      );

      await Meters.updateMany(
        { locationSession: sessionId },
        { $unset: { deletedAt: 1 } }
      );

      const duration = Date.now() - startTime;
      logRouteUpdate(
        functionName,
        'PATCH',
        `/api/collection-reports-v2/sessions/${sessionId}`,
        restoreMachinesResult.modifiedCount,
        user,
        duration
      );

      return NextResponse.json({
        success: true,
        data: { sessionId, action: 'restore' },
      });
    }

    // ============================================================================
    // STEP 5: Update session time fields
    // ============================================================================
    const updateFields: Record<string, unknown> = {};
    if (sessionStartTime) {
      updateFields.sessionStartTime = new Date(sessionStartTime);
    }
    if (sessionEndTime) {
      updateFields.sessionEndTime = new Date(sessionEndTime);
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const result = await ReportedMachine.updateMany(
      { sessionId },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const duration = Date.now() - startTime;
    logRouteUpdate(
      functionName,
      'PATCH',
      `/api/collection-reports-v2/sessions/${sessionId}`,
      result.modifiedCount,
      user,
      duration
    );

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        machinesUpdated: result.modifiedCount,
        sessionStartTime: sessionStartTime || undefined,
        sessionEndTime: sessionEndTime || undefined,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'PATCH',
      `/api/collection-reports-v2/sessions/${sessionId}`,
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
