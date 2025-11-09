import { NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { NextRequest } from 'next/server';
import { getUserAccessibleLicenseesFromToken, getUserLocationFilter } from '../../lib/helpers/licenseeFilter';
import { getUserFromServer } from '../../lib/helpers/users';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get licencee from query params
    const { searchParams } = new URL(request.url);
    const licencee = searchParams.get('licencee');
    const licensee = searchParams.get('licensee'); // Also check for "licensee" parameter

    // Get user's accessible licensees, roles, and location permissions from JWT
    const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
    const userPayload = await getUserFromServer();
    const userRoles = (userPayload?.roles as string[]) || [];
    const userLocationPermissions = 
      (userPayload?.resourcePermissions as { 'gaming-locations'?: { resources?: string[] } })?.['gaming-locations']?.resources || [];

    console.log('[MACHINES/LOCATIONS] User accessible licensees:', userAccessibleLicensees);
    console.log('[MACHINES/LOCATIONS] User roles:', userRoles);
    console.log('[MACHINES/LOCATIONS] User location permissions:', userLocationPermissions);
    console.log('[MACHINES/LOCATIONS] Requested licensee filter:', licencee || licensee);

    // Get allowed location IDs (intersection of licensee + location permissions, respecting roles)
    const finalLicencee = licencee || licensee;
    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicensees,
      finalLicencee || undefined,
      userLocationPermissions,
      userRoles
    );

    console.log('[MACHINES/LOCATIONS] Allowed location IDs:', allowedLocationIds);

    // If user has no accessible locations, return empty
    if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0) {
      console.log('[MACHINES/LOCATIONS] No accessible locations - returning empty array');
      return NextResponse.json({ locations: [] }, { status: 200 });
    }

    // Define the type for matchStage
    type MatchStage = Record<string, unknown>;

    // Initialize matchStage with type
    const matchStage: MatchStage = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    };

    // Apply location filter based on user permissions
    if (allowedLocationIds !== 'all') {
      matchStage._id = { $in: allowedLocationIds };
    }

    // Aggregate locations with their country names
    const locations = await GamingLocations.aggregate([
      // Only include non-deleted locations and match licencee if provided
      { $match: matchStage },
      // Lookup country details
      {
        $lookup: {
          from: 'countries',
          localField: 'country',
          foreignField: '_id',
          as: 'countryDetails',
        },
      },
      // Unwind the countryDetails array
      {
        $unwind: {
          path: '$countryDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Project only needed fields
      {
        $project: {
          _id: 1,
          name: 1,
          countryName: '$countryDetails.name',
        },
      },
      // Sort by name
      {
        $sort: { name: 1 },
      },
    ]);

    return NextResponse.json({ locations }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/machines/locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}
