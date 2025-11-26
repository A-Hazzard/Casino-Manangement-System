/**
 * Movement Requests API Route
 *
 * This route handles operations related to movement requests for cabinets/machines.
 * It supports:
 * - GET: Fetching all movement requests with optional licensee filtering
 * - POST: Creating a new movement request
 *
 * @module app/api/movement-requests/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { MovementRequest } from '@/app/api/lib/models/movementrequests';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching movement requests
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Fetch all non-deleted movement requests
 * 3. Filter by licensee if provided
 * 4. Fetch location names for lookup
 * 5. Transform requests with location names
 * 6. Return transformed requests
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const licensee = searchParams.get('licensee') || searchParams.get('licencee');

    // ============================================================================
    // STEP 2: Fetch all non-deleted movement requests
    // ============================================================================
    let requests = await MovementRequest.find({
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    })
      .sort({ createdAt: -1 })
      .lean();

    // ============================================================================
    // STEP 3: Filter by licensee if provided
    // ============================================================================
    if (licensee && licensee !== 'all') {
      const licenseeLocations = await GamingLocations.find(
        {
          'rel.licencee': licensee,
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2020-01-01') } },
          ],
        },
        { _id: 1, name: 1 }
      ).lean();

      const licenseeLocationIds = licenseeLocations.map(loc =>
        (loc as { _id: string })._id.toString()
      );

      requests = requests.filter(
        request =>
          licenseeLocationIds.includes(request.locationFrom) ||
          licenseeLocationIds.includes(request.locationTo)
      );
    }

    // ============================================================================
    // STEP 4: Fetch location names for lookup
    // ============================================================================
    const locations = await GamingLocations.find(
      {
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('1970-01-01') } },
        ],
      },
      { _id: 1, name: 1 }
    )
      .sort({ name: 1 })
      .lean();
    const idToName = Object.fromEntries(
      locations.map(l => [String(l._id), l.name])
    );

    // ============================================================================
    // STEP 5: Transform requests with location names
    // ============================================================================
    const transformed = requests.map(req => ({
      ...req,
      locationFrom: idToName[req.locationFrom] || req.locationFrom,
      locationTo: idToName[req.locationTo] || req.locationTo,
    }));

    // ============================================================================
    // STEP 6: Return transformed requests
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Movement Requests API] Completed in ${duration}ms`);
    }
    return NextResponse.json(transformed);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch movement requests';
    console.error(
      `[Movement Requests GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request body
    // ============================================================================
    let data;
    try {
      data = await req.json();
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid JSON in request body',
          details: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Create movement request
    // ============================================================================
    const created = await MovementRequest.create({ ...data });

    // ============================================================================
    // STEP 3: Log activity
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const createChanges = [
          { field: 'cabinetIn', oldValue: null, newValue: data.cabinetIn },
          {
            field: 'locationFrom',
            oldValue: null,
            newValue: data.locationFrom,
          },
          { field: 'locationTo', oldValue: null, newValue: data.locationTo },
          { field: 'reason', oldValue: null, newValue: data.reason || '' },
          {
            field: 'status',
            oldValue: null,
            newValue: data.status || 'pending',
          },
        ];

        await logActivity({
          action: 'CREATE',
          details: `Created movement request for cabinet ${data.cabinetIn} from ${data.locationFrom} to ${data.locationTo}`,
          userId: currentUser._id as string,
          username: (currentUser.emailAddress || currentUser.username || 'unknown') as string,
          ipAddress: getClientIP(req) || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'movement_request',
            resourceId: created._id.toString(),
            resourceName: `Cabinet ${data.cabinetIn}`,
            changes: createChanges,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    // ============================================================================
    // STEP 4: Return created request
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Movement Requests API POST] Completed in ${duration}ms`);
    }
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create movement request';
    console.error(
      `[Movement Requests POST API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        error: 'Failed to create movement request',
        details: errorMessage,
      },
      { status: 400 }
    );
  }
}
