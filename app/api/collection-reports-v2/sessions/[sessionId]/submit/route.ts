/**
 * Collection Report V2 — Submit Session
 *
 * PATCH /api/collection-reports-v2/sessions/[sessionId]/submit
 * Marks all reportedMachine documents for this session as submitted.
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import {
  extractUserFromRequest,
  logRouteError,
} from '@/app/api/lib/utils/routeLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const functionName =
    'PATCH /api/collection-reports-v2/sessions/[sessionId]/submit';
  const user = extractUserFromRequest(req);

  let sessionId = '';

  try {
    await connectDB();

    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    sessionId = (await params).sessionId;
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const result = await ReportedMachine.updateMany(
      { sessionId, sessionStatus: 'in-progress' },
      { $set: { sessionStatus: 'submitted' } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Session not found or already submitted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { sessionId, machinesUpdated: result.modifiedCount },
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
