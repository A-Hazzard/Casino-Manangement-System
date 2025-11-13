import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';
import type { MachineAnalytics } from '@/lib/types/reports';
import { PipelineStage } from 'mongoose';
import { getUserAccessibleLicenseesFromToken, getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const limit = Number(searchParams.get('limit')) || 5;
    // Support both 'licensee' and 'licencee'
    const selectedLicensee =
      searchParams.get('licensee') || searchParams.get('licencee') || undefined;
    const selectedLocation = searchParams.get('location') || undefined;

    // Derive allowed locations for current user (role-aware)
    const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
    const userPayload = await getUserFromServer();
    const userRoles = (userPayload?.roles as string[]) || [];
    const userLocationPermissions =
      (
        userPayload?.resourcePermissions as {
          'gaming-locations'?: { resources?: string[] };
        }
      )?.['gaming-locations']?.resources || [];

    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicensees,
      selectedLicensee || undefined,
      userLocationPermissions,
      userRoles
    );

    if (allowedLocationIds !== 'all') {
      // No allowed locations -> return empty list
      if (!Array.isArray(allowedLocationIds) || allowedLocationIds.length === 0) {
        return NextResponse.json({ machines: [] });
      }
      // If a specific location was requested, ensure it is allowed
      if (selectedLocation && !allowedLocationIds.includes(selectedLocation)) {
        return NextResponse.json({ machines: [] });
      }
    }

    const machinesPipeline: PipelineStage[] = [
      // Stage 1: Filter machines by allowed locations (supports legacy field names)
      ...(allowedLocationIds === 'all'
        ? []
        : [
            {
              $match: {
                $or: [
                  { locationId: { $in: allowedLocationIds } },
                  { gamingLocation: { $in: allowedLocationIds } },
                ],
              },
            } as PipelineStage,
          ]),
      // Stage 1b: Optional specific location filter (validated above)
      ...(selectedLocation
        ? [
            {
              $match: {
                $or: [
                  { locationId: selectedLocation },
                  { gamingLocation: selectedLocation },
                ],
              },
            } as PipelineStage,
          ]
        : []),

      // Stage 2: Join machines with locations to get location details
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'locationId', // legacy field name support
          foreignField: '_id',
          as: 'locationDetails',
        },
      },

      // Stage 3: Flatten the location details array (each machine now has location info)
      {
        $unwind: '$locationDetails',
      },

      // Stage 4: Filter by licensee to ensure only relevant machines are included (if provided)
      ...(selectedLicensee
        ? [
            {
              $match: {
                'locationDetails.rel.licencee': selectedLicensee,
              },
            } as PipelineStage,
          ]
        : []),

      // Stage 5: Project only the fields needed for analytics
      {
        $project: {
          _id: 1,
          name: 1,
          locationName: '$locationDetails.name',
          totalDrop: 1,
          gross: 1,
          isOnline: 1,
          hasSas: 1,
        },
      },

      // Stage 6: Sort machines by total drop in descending order (highest performers first)
      {
        $sort: {
          totalDrop: -1,
        },
      },
    ];

    if (limit) {
      machinesPipeline.push({ $limit: limit });
    }

    const machines: MachineAnalytics[] =
      await Machine.aggregate(machinesPipeline);
    return NextResponse.json({ machines });
  } catch (error: unknown) {
    console.error('Error fetching machines:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
