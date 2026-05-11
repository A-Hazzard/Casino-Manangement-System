/**
 * Collection Report V2 — Machine Capture API
 *
 * POST  /api/collection-reports-v2/machines
 * Saves a single machine capture record after the user confirms the photo
 * and answers the meters-match question.
 *
 * PATCH /api/collection-reports-v2/machines?id=xxx
 * Updates a machine capture record (status, meters, photo, etc.)
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
import { NextRequest, NextResponse } from 'next/server';
import type { ReportedMachineStatus } from '@/app/api/lib/models/reportedMachines';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/collection-reports-v2/machines';
  const user = extractUserFromRequest(req);

  try {
    await connectDB();

    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      sessionId,
      machineId,
      machineName,
      machineCustomName,
      serialNumber,
      manufacturer,
      game,
      locationId,
      locationName,
      licencee,
      collector,
      collectorName,
      systemMetersIn,
      systemMetersOut,
      sasStartTime,
      sasEndTime,
      imageFileId,
      imageName,
      imageSize,
      imageData,
      imageCapturedAt,
      metersMatch,
      sequenceOrder,
      status,
    } = body as {
      sessionId: string;
      machineId: string;
      machineName?: string;
      machineCustomName?: string;
      serialNumber?: string;
      manufacturer?: string;
      game?: string;
      locationId: string;
      locationName: string;
      licencee?: string;
      collector: string;
      collectorName?: string;
      systemMetersIn: number;
      systemMetersOut: number;
      sasStartTime?: string;
      sasEndTime?: string;
      imageFileId?: string;
      imageName?: string;
      imageSize?: number;
      imageData?: string;
      imageCapturedAt?: string;
      metersMatch?: boolean;
      sequenceOrder: number;
      status: ReportedMachineStatus;
    };

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

    const id = await generateMongoId();
    const doc = await ReportedMachine.create({
      _id: id,
      sessionId,
      sessionStatus: 'in-progress',
      locationId,
      locationName,
      licencee: licencee || '',
      machineId,
      machineName: machineName || '',
      machineCustomName: machineCustomName || '',
      serialNumber: serialNumber || '',
      manufacturer: manufacturer || '',
      game: game || '',
      collector: collector || String(userPayload._id),
      collectorName: collectorName || '',
      systemMetersIn: Number(systemMetersIn) || 0,
      systemMetersOut: Number(systemMetersOut) || 0,
      sasStartTime: sasStartTime ? new Date(sasStartTime) : undefined,
      sasEndTime: sasEndTime ? new Date(sasEndTime) : new Date(),
      imageFileId: imageFileId || undefined,
      imageName: imageName || undefined,
      imageSize: imageSize || undefined,
      imageData: imageData || undefined,
      imageCapturedAt: imageCapturedAt ? new Date(imageCapturedAt) : undefined,
      metersMatch: metersMatch ?? undefined,
      sequenceOrder: Number(sequenceOrder) || 0,
      status,
    });

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
    await connectDB();

    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const reportedMachineId = searchParams.get('id');
    if (!reportedMachineId) {
      return NextResponse.json(
        { success: false, error: 'id query param is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const allowedFields = [
      'status',
      'systemMetersIn',
      'systemMetersOut',
      'metersMatch',
      'sasStartTime',
      'sasEndTime',
      'imageFileId',
      'imageName',
      'imageSize',
      'imageData',
      'imageCapturedAt',
      'notes',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (
          field === 'sasStartTime' ||
          field === 'sasEndTime' ||
          field === 'imageCapturedAt'
        ) {
          updateData[field] = new Date(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    let result = await ReportedMachine.findOneAndUpdate(
      { _id: reportedMachineId },
      { $set: updateData },
      { new: true }
    ).lean();

    // Legacy fallback: documents created with insertMany + _id: undefined
    // may have ObjectId _id instead of string. Try native query.
    if (!result) {
      const mongoose = (await import('mongoose')).default;
      if (mongoose.Types.ObjectId.isValid(reportedMachineId)) {
        const nativeResult =
          await ReportedMachine.collection.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(reportedMachineId) },
            { $set: updateData },
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
