/**
 * Float Request Detail API Route
 *
 * This route handles individual float request operations.
 * It supports:
 * - Getting float request details
 * - Updating float request (limited: FLOAT_DECREASE only)
 *
 * @module app/api/vault/float-requests/[id]/route
 */

// Helpers
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import {
  getFloatRequestById,
  editFloatRequest,
  transformFloatRequestForResponse,
} from '@/app/api/lib/helpers/vault/floatRequests';
import { canEditFloatRequest } from '@/app/api/lib/helpers/vault/authorization';

// Types
import type { DenominationBreakdown } from '@/app/api/lib/types/vault';

// Utilities
import { connectDB } from '@/app/api/lib/middleware/db';

// Next.js
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for float request details
 *
 * Flow:
 * 1. Extract float request ID from URL
 * 2. Connect to database and authenticate user
 * 3. Get float request by ID
 * 4. Return float request details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Extract float request ID from URL
    // ============================================================================
    const requestId = params.id;

    if (!requestId) {
      return NextResponse.json(
        { error: 'Float request ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Connect to database and authenticate user
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ============================================================================
    // STEP 3: Get float request by ID
    // ============================================================================
    const floatRequest = await getFloatRequestById(requestId);

    if (!floatRequest) {
      return NextResponse.json(
        { error: 'Float request not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Return float request details
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Float Request Detail API] Completed in ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      data: {
        floatRequest: transformFloatRequestForResponse(floatRequest),
      },
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[Float Request Detail API] Failed after ${duration}ms:`, err);
    const errorMessage = err instanceof Error ? err.message : 'Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * Main PUT handler for updating float requests
 * Only allows editing FLOAT_DECREASE requests by vault managers
 *
 * Flow:
 * 1. Extract float request ID from URL
 * 2. Parse and validate request body
 * 3. Connect to database and authenticate user
 * 4. Get float request and verify edit permissions
 * 5. Edit float request
 * 6. Return updated request
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Extract float request ID from URL
    // ============================================================================
    const requestId = params.id;

    if (!requestId) {
      return NextResponse.json(
        { error: 'Float request ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Parse and validate request body
    // ============================================================================
    const body = (await req.json()) as { requestedDenom: DenominationBreakdown };

    if (!body.requestedDenom) {
      return NextResponse.json(
        { error: 'requestedDenom is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Connect to database and authenticate user
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPayload = user as {
      _id: string;
      roles?: string[];
      assignedLocations?: string[];
    };

    // ============================================================================
    // STEP 4: Get float request and verify edit permissions
    // ============================================================================
    const floatRequest = await getFloatRequestById(requestId);

    if (!floatRequest) {
      return NextResponse.json(
        { error: 'Float request not found' },
        { status: 404 }
      );
    }

    const canEdit = await canEditFloatRequest(userPayload, floatRequest);
    if (!canEdit) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot edit this float request' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 5: Edit float request
    // ============================================================================
    const updated = await editFloatRequest(
      requestId,
      body.requestedDenom
    );

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update float request' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 6: Return updated request
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Float Request Update API] Completed in ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      data: {
        floatRequest: transformFloatRequestForResponse(updated),
      },
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[Float Request Update API] Failed after ${duration}ms:`, err);
    const errorMessage = err instanceof Error ? err.message : 'Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
