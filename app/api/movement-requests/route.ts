/**
 * Movement Requests API Route
 *
 * This route handles operations related to movement requests for cabinets/machines.
 * It supports:
 * - GET: Fetching all movement requests with optional licencee filtering
 * - POST: Creating a new movement request
 *
 * @module app/api/movement-requests/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
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
 * 3. Filter by licencee if provided
 * 4. Fetch location names for lookup
 * 5. Transform requests with location names
 * 6. Return transformed requests
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database and authenticate user
    // ============================================================================
    await connectDB();
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (userPayload?.roles as string[]) || [];
    const isAdminOrDev =
      userRoles.includes('admin') || userRoles.includes('developer');

    // ============================================================================
    // STEP 2: Get user location permissions
    // ============================================================================
    // Use only new field
    let userAccessibleLicencees: string[] = [];
    if (
      Array.isArray(
        (userPayload as { assignedLicencees?: string[] })?.assignedLicencees
      )
    ) {
      userAccessibleLicencees = (userPayload as { assignedLicencees: string[] })
        .assignedLicencees;
    }
    // Use only new field
    let userLocationPermissions: string[] = [];
    if (
      Array.isArray(
        (userPayload as { assignedLocations?: string[] })?.assignedLocations
      )
    ) {
      userLocationPermissions = (userPayload as { assignedLocations: string[] })
        .assignedLocations;
    }

    // Get user's accessible locations
    const { searchParams } = new URL(req.url);
    const licencee =
      searchParams.get('licencee');
    const allowedLocationIds = await getUserLocationFilter(
      isAdminOrDev ? 'all' : userAccessibleLicencees,
      licencee && licencee !== 'all' ? licencee : undefined,
      userLocationPermissions,
      userRoles
    );

    // ============================================================================
    // STEP 3: Fetch all non-deleted movement requests with Aggregation
    // ============================================================================
    let requests = await MovementRequest.aggregate([
      // Match non-deleted requests
      {
        $match: {
          $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        }
      },
      // Lookup recipient user
      {
        $lookup: {
          from: 'users',
          localField: 'requestTo',
          foreignField: '_id',
          as: 'recipientDetails'
        }
      },
      // Lookup creator user
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creatorDetails'
        }
      },
      // Lookup machine details if selectedMachines exists
      {
        $lookup: {
          from: 'machines',
          localField: 'selectedMachines',
          foreignField: '_id',
          as: 'machineDetails'
        }
      },
      // Unwind details
      {
        $unwind: {
          path: '$recipientDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$creatorDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      // Calculate names and machine details
      {
        $addFields: {
          recipientName: {
            $cond: {
              if: { $and: ['$recipientDetails.profile.firstName', '$recipientDetails.profile.lastName'] },
              then: { $concat: ['$recipientDetails.profile.firstName', ' ', '$recipientDetails.profile.lastName'] },
              else: { $ifNull: ['$recipientDetails.username', '$requestTo'] }
            }
          },
          creatorName: {
            $cond: {
              if: { $and: ['$creatorDetails.profile.firstName', '$creatorDetails.profile.lastName'] },
              then: { $concat: ['$creatorDetails.profile.firstName', ' ', '$creatorDetails.profile.lastName'] },
              else: { $ifNull: ['$creatorDetails.username', '$createdBy'] }
            }
          },
          machineDetails: {
            $map: {
              input: '$machineDetails',
              as: 'm',
              in: {
                _id: '$$m._id',
                serialNumber: '$$m.serialNumber',
                displayName: {
                  $cond: {
                    if: { $and: ['$$m.custom.name', { $ne: ['$$m.custom.name', ''] }] },
                    then: '$$m.custom.name',
                    else: { $ifNull: ['$$m.serialNumber', '$$m._id'] }
                  }
                }
              }
            }
          }
        }
      },
      // Sort by newest first
      { $sort: { createdAt: -1 } }
    ]);

    // ============================================================================
    // STEP 4: Filter by user location permissions and direct recipient
    // ============================================================================
    const userEmail = userPayload.emailAddress as string;

    if (allowedLocationIds !== 'all') {
      // Filter requests to only include those where:
      // 1. locationFromId, locationToId, or locationId is in the user's accessible locations
      // 2. OR the user is the direct recipient (requestTo)
      // 3. OR the user is the creator (createdBy) — creators can always see their own requests
      const currentUserId = String(userPayload._id);
      requests = requests.filter(
        request =>
          allowedLocationIds.includes(String(request.locationFromId)) ||
          allowedLocationIds.includes(String(request.locationToId)) ||
          allowedLocationIds.includes(String(request.locationId)) ||
          // Fallback for names if IDs are missing (legacy compatibility)
          allowedLocationIds.includes(String(request.locationFrom)) ||
          allowedLocationIds.includes(String(request.locationTo)) ||
          request.requestTo === currentUserId ||
          request.requestTo === userEmail ||
          request.createdBy === currentUserId ||
          request.createdBy === userEmail
      );
    }

    // ============================================================================
    // STEP 5: Filter by licencee if provided (additional filter)
    // ============================================================================
    if (licencee && licencee !== 'all') {
      const licenceeLocations = await GamingLocations.find(
        {
          $and: [
            {
              $or: [
                { 'rel.licencee': licencee  }, { 'rel.licencee': licencee  }
              ]
            },
            {
              $or: [
                { deletedAt: null },
                { deletedAt: { $lt: new Date('2025-01-01') } },
              ]
            }
          ]
        },
        { _id: 1, name: 1 }
      ).lean();

      const licenceeLocationIds = licenceeLocations.map((loc: { _id: unknown }) =>
        String(loc._id)
      );

      requests = requests.filter(
        request =>
          licenceeLocationIds.includes(String(request.locationFrom)) ||
          licenceeLocationIds.includes(String(request.locationTo))
      );
    }

    // ============================================================================
    // STEP 6: Fetch location names for lookup
    // ============================================================================
    const locations = await GamingLocations.find(
      {},
      { _id: 1, name: 1 }
    )
      .sort({ name: 1 })
      .lean();
    const idToName = Object.fromEntries(
      locations.map(l => [String(l._id), l.name])
    );

    // ============================================================================
    // STEP 7: Transform requests with location names and map legacy statuses
    // ============================================================================
    const transformed = requests.map((req: Record<string, unknown>) => {
      const r = req;

      // Map legacy statuses to purely pending/completed
      let mappedStatus = r.status;
      if (mappedStatus === 'approved') mappedStatus = 'completed';
      if (mappedStatus === 'in progress') mappedStatus = 'pending';
      if (mappedStatus === 'rejected') mappedStatus = 'completed'; // Or pending? Leave rejected as pending for safety if it shouldn't be completed

      return {
        ...req,
        status: mappedStatus === 'approved' ? 'completed' : mappedStatus === 'in progress' ? 'pending' : (mappedStatus || 'pending'),
        locationFrom: idToName[String(r.locationFrom)] || String(r.locationFrom),
        locationTo: idToName[String(r.locationTo)] || String(r.locationTo),
        recipientName: req.recipientName || req.requestTo, // Fallback
        creatorName: req.creatorName || req.createdBy // Fallback
      };
    });

    // ============================================================================
    // STEP 8: Return transformed requests
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Movement Requests API] Completed in ${duration}ms`);
    }
    return NextResponse.json(transformed);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to fetch movement requests';
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
    // STEP 1: Connect to database and authenticate user
    // ============================================================================
    await connectDB();
    const currentUser = await getUserFromServer();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check: Only technicians, developers, managers, and location admins can create requests
    const userRoles = (currentUser.roles as string[]) || [];
    const authorizedRoles = ['technician', 'developer', 'manager', 'location admin'];
    const isAuthorized = userRoles.some(role => authorizedRoles.includes(role.toLowerCase()));

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Forbidden', details: 'You do not have permission to create movement requests' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 2: Parse and validate request body
    // ============================================================================
    interface MovementRequestData {
      cabinetIn: string;
      selectedMachines?: string[];
      locationFrom: string;
      locationTo: string;
      locationFromId?: string;
      locationToId?: string;
      reason?: string;
      status?: string;
    }
    let data: MovementRequestData;
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
    // STEP 3: Create movement request
    // ============================================================================
    const created = await MovementRequest.create({
      ...data,
      createdBy: currentUser._id, // Store creator ID
      timestamp: new Date()
    });

    // ============================================================================
    // STEP 4: Log activity
    // ============================================================================
    if (currentUser.emailAddress) {
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
          username: (currentUser.emailAddress ||
            currentUser.username ||
            'unknown') as string,
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
    // STEP 5: Return created request
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Movement Requests API POST] Completed in ${duration}ms`);
    }
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to create movement request';
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

