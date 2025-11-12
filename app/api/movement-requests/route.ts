import { NextRequest, NextResponse } from 'next/server';
import { MovementRequest } from '@/app/api/lib/models/movementrequests';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '../lib/helpers/users';
import { getClientIP } from '@/lib/utils/ipAddress';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const licensee = searchParams.get('licensee');

    let requests = await MovementRequest.find({
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    })
      .sort({ createdAt: -1 })
      .lean();

    // Filter by licensee if provided
    if (licensee && licensee !== 'all') {
      // Get locations that match the licensee
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

      // Filter requests to only include those from/to licensee locations
      requests = requests.filter(
        request =>
          licenseeLocationIds.includes(request.locationFrom) ||
          licenseeLocationIds.includes(request.locationTo)
      );
    }

    // Fetch all locations for lookup, sorted alphabetically by name
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
    // Transform requests: replace locationFrom/locationTo with name if it's an ID
    const transformed = requests.map(req => ({
      ...req,
      locationFrom: idToName[req.locationFrom] || req.locationFrom,
      locationTo: idToName[req.locationTo] || req.locationTo,
    }));
    return NextResponse.json(transformed);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch movement requests' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
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
    const created = await MovementRequest.create({ ...data });

    // Log activity
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
          userId: currentUser._id as string, // 🔧 FIX: Pass as direct param
          username: (currentUser.emailAddress || currentUser.username || 'unknown') as string, // 🔧 FIX: Pass as direct param
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

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Movement request creation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create movement request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 400 }
    );
  }
}
