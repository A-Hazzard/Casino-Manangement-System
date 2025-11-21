import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { NextRequest, NextResponse } from 'next/server';

import { connectDB } from '@/app/api/lib/middleware/db';
import { apiLogger } from '@/app/api/lib/utils/logger';
import { UpdateLocationData } from '@/lib/types/location';
import { generateMongoId } from '@/lib/utils/id';

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { Countries } from '@/app/api/lib/models/countries';
import { getClientIP } from '@/lib/utils/ipAddress';
import { getUserFromServer } from '../lib/helpers/users';
import {
  assertAnyPageAccess,
  buildApiAuthContext,
  handleApiError,
  resolveAllowedLocations,
} from '@/lib/utils/apiAuth';

export async function GET(request: Request) {
  const context = apiLogger.createContext(
    request as NextRequest,
    '/api/locations'
  );
  apiLogger.startLogging();

  try {
    await connectDB();

    const auth = await buildApiAuthContext();
    assertAnyPageAccess(auth.roles, [
      'dashboard',
      'locations',
      'machines',
      'collection-report',
      'reports',
    ]);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    // Support both 'licensee' and 'licencee' spelling for backwards compatibility
    const licencee = searchParams.get('licensee') || searchParams.get('licencee');
    const minimal = searchParams.get('minimal') === '1';
    const showAll = searchParams.get('showAll') === 'true';
    const forceAll =
      searchParams.get('forceAll') === 'true' ||
      searchParams.get('forceAll') === '1';

    const userAccessibleLicensees = auth.accessibleLicensees;
    const userRoles = auth.roles;
    const userLocationPermissions = auth.locationPermissions;

    // Build base query filter
    const deletionFilter = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    };

    let queryFilter: Record<string, unknown>;

    const isAdminOrDeveloper =
      userRoles.includes('admin') || userRoles.includes('developer');

    // Apply location filtering based on licensee + location permissions
    if (
      (showAll &&
        userAccessibleLicensees === 'all' &&
        userLocationPermissions.length === 0) ||
      (forceAll && isAdminOrDeveloper)
    ) {
      // Admin with no restrictions requesting all locations - no filter needed
      queryFilter = deletionFilter;
    } else {
      // Apply intersection of licensee access + location permissions (respecting roles)
      const allowedLocationIds = await resolveAllowedLocations(
        auth,
        licencee || undefined
      );

      if (allowedLocationIds !== 'all') {
        if (allowedLocationIds.length === 0) {
          // No accessible locations
          queryFilter = { ...deletionFilter, _id: null };
        } else {
          queryFilter = { ...deletionFilter, _id: { $in: allowedLocationIds } };
        }
      } else {
        queryFilter = deletionFilter;
      }
    }

    // Fetch locations. If minimal is requested, project minimal fields only.
    const projection = minimal
      ? { _id: 1, name: 1, geoCoords: 1, 'rel.licencee': 1 }
      : undefined;
    const locations = await GamingLocations.find(queryFilter, projection)
      .sort({ name: 1 })
      .lean();

    // Add licenseeId field for each location (for frontend filtering)
    const locationsWithLicenseeId = locations.map(loc => {
      const licenceeRaw = loc.rel?.licencee;
      let licenseeId: string | null = null;

      if (Array.isArray(licenceeRaw)) {
        licenseeId =
          licenceeRaw.length > 0 && licenceeRaw[0]
            ? String(licenceeRaw[0])
            : null;
      } else if (licenceeRaw) {
        licenseeId = String(licenceeRaw);
      }

      return {
        ...loc,
        licenseeId,
      };
    });

    apiLogger.logSuccess(
      context,
      `Successfully fetched ${locations.length} locations (minimal: ${minimal}, showAll: ${showAll})`
    );
    return NextResponse.json({ locations: locationsWithLicenseeId }, { status: 200 });
  } catch (error) {
    const handled = handleApiError(error);
    if (handled) {
      apiLogger.logError(
        context,
        'Failed to fetch locations',
        error instanceof Error ? error.message : 'API_ERROR'
      );
      return handled;
    }
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    apiLogger.logError(context, 'Failed to fetch locations', errorMessage);
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    const {
      name,
      address,
      country,
      profitShare,
      gameDayOffset,
      rel,
      isLocalServer,
      geoCoords,
      billValidatorOptions,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Location name is required' },
        { status: 400 }
      );
    }

    // Additional backend validations mirroring frontend
    if (
      typeof profitShare === 'number' &&
      (profitShare < 0 || profitShare > 100)
    ) {
      return NextResponse.json(
        { success: false, message: 'Profit share must be between 0 and 100' },
        { status: 400 }
      );
    }
    if (
      typeof gameDayOffset === 'number' &&
      (gameDayOffset < 0 || gameDayOffset > 23)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Day start time (gameDayOffset) must be between 0 and 23',
        },
        { status: 400 }
      );
    }
    if (country && typeof country !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Country must be a country ID string' },
        { status: 400 }
      );
    }

    // If a country ID is provided, verify it exists (country is optional)
    if (country && typeof country === 'string' && country.trim().length > 0) {
      const countryDoc = await Countries.findById(country).lean();
      if (!countryDoc) {
        return NextResponse.json(
          { success: false, message: 'Invalid country ID' },
          { status: 400 }
        );
      }
    }

    // Create new location with proper MongoDB ObjectId-style hex string
    const locationId = await generateMongoId();
    const newLocation = new GamingLocations({
      _id: locationId,
      name,
      country,
      address: {
        street: address?.street || '',
        city: address?.city || '',
      },
      rel: {
        licencee: rel?.licencee || '',
      },
      profitShare: profitShare || 50,
      gameDayOffset: gameDayOffset ?? 8,
      isLocalServer: isLocalServer || false,
      geoCoords: {
        latitude: geoCoords?.latitude || 0,
        longitude: geoCoords?.longitude || 0,
      },

      billValidatorOptions: billValidatorOptions || {
        denom1: true,
        denom2: true,
        denom5: true,
        denom10: true,
        denom20: true,
        denom50: true,
        denom100: true,
        denom200: true,
        denom500: true,
        denom1000: false,
        denom2000: false,
        denom5000: false,
        denom10000: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(-1), // SMIB boards require all fields to be present
    });

    // Save the new location
    await newLocation.save();

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const createChanges = [
          { field: 'name', oldValue: null, newValue: name },
          { field: 'country', oldValue: null, newValue: country },
          {
            field: 'address.street',
            oldValue: null,
            newValue: address?.street || '',
          },
          {
            field: 'address.city',
            oldValue: null,
            newValue: address?.city || '',
          },
          {
            field: 'rel.licencee',
            oldValue: null,
            newValue: rel?.licencee || '',
          },
          { field: 'profitShare', oldValue: null, newValue: profitShare || 50 },
          {
            field: 'gameDayOffset',
            oldValue: null,
            newValue: gameDayOffset ?? 8,
          },
          {
            field: 'isLocalServer',
            oldValue: null,
            newValue: isLocalServer || false,
          },
          {
            field: 'geoCoords.latitude',
            oldValue: null,
            newValue: geoCoords?.latitude || 0,
          },
          {
            field: 'geoCoords.longitude',
            oldValue: null,
            newValue: geoCoords?.longitude || 0,
          },
        ];

        await logActivity({
          action: 'CREATE',
          details: `Created new location "${name}" in ${country}`,
          ipAddress: getClientIP(request as NextRequest) || undefined,
          userAgent:
            (request as NextRequest).headers.get('user-agent') || undefined,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'location',
            resourceId: locationId,
            resourceName: name,
            changes: createChanges,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    return NextResponse.json(
      { success: true, location: newLocation },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('API Error in POST /api/locations:', errorMessage);
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    const {
      locationName, // This should be the location ID
      name,
      address,
      country,
      profitShare,
      gameDayOffset,
      rel,
      isLocalServer,
      geoCoords,
      billValidatorOptions,
    } = body;

    if (!locationName) {
      return NextResponse.json(
        { success: false, message: 'Location ID is required' },
        { status: 400 }
      );
    }

    try {
      // Find the location by ID (not by name) and ensure it's not deleted
      const location = await GamingLocations.findOne({
        _id: locationName,
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      });

      if (!location) {
        return NextResponse.json(
          { success: false, message: 'Location not found' },
          { status: 404 }
        );
      }

      const locationId = location._id.toString();

      // Backend validations mirroring frontend for provided fields
      if (name !== undefined && typeof name !== 'string') {
        return NextResponse.json(
          { success: false, message: 'Location name must be a string' },
          { status: 400 }
        );
      }
      if (country !== undefined && typeof country !== 'string') {
        return NextResponse.json(
          { success: false, message: 'Country must be a country ID string' },
          { status: 400 }
        );
      }
      if (
        profitShare !== undefined &&
        (typeof profitShare !== 'number' ||
          profitShare < 0 ||
          profitShare > 100)
      ) {
        return NextResponse.json(
          { success: false, message: 'Profit share must be between 0 and 100' },
          { status: 400 }
        );
      }
      if (
        gameDayOffset !== undefined &&
        (typeof gameDayOffset !== 'number' ||
          gameDayOffset < 0 ||
          gameDayOffset > 23)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: 'Day start time (gameDayOffset) must be between 0 and 23',
          },
          { status: 400 }
        );
      }

      // Verify country exists when updating (country is optional)
      if (country && typeof country === 'string' && country.trim().length > 0) {
        const countryDoc = await Countries.findById(country).lean();
        if (!countryDoc) {
          return NextResponse.json(
            { success: false, message: 'Invalid country ID' },
            { status: 400 }
          );
        }
      }

      // Create update data object with only the fields that are present in the request
      const updateData: UpdateLocationData = {};

      // Only include fields that are present in the request
      if (name) updateData.name = name;
      if (country) updateData.country = country;

      // Handle nested objects
      if (address) {
        updateData.address = {};
        if (address.street !== undefined)
          updateData.address.street = address.street;
        if (address.city !== undefined) updateData.address.city = address.city;
      }

      if (rel) {
        updateData.rel = {};
        if (rel.licencee !== undefined) updateData.rel.licencee = rel.licencee;
      }

      // Handle primitive types with explicit checks to handle zero values
      if (typeof profitShare === 'number') updateData.profitShare = profitShare;
      if (typeof gameDayOffset === 'number')
        updateData.gameDayOffset = gameDayOffset;
      if (typeof isLocalServer === 'boolean')
        updateData.isLocalServer = isLocalServer;

      // Handle nested geoCoords object - only save valid coordinates
      if (geoCoords) {
        const lat = geoCoords.latitude;
        const lng = geoCoords.longitude;

        // Only save if both coordinates are valid numbers (not NaN, not 0, not undefined)
        if (
          typeof lat === 'number' &&
          typeof lng === 'number' &&
          !Number.isNaN(lat) &&
          !Number.isNaN(lng) &&
          lat !== 0 &&
          lng !== 0
        ) {
          updateData.geoCoords = {
            latitude: lat,
            longitude: lng,
          };
        }
      }

      // Handle billValidatorOptions
      if (billValidatorOptions) {
        updateData.billValidatorOptions = Object.fromEntries(
          Object.entries(billValidatorOptions).map(([k, v]) => [k, Boolean(v)])
        ) as UpdateLocationData['billValidatorOptions'];
      }

      // Always update the updatedAt timestamp
      updateData.updatedAt = new Date();

      // Update the location
      const result = await GamingLocations.updateOne(
        { _id: locationId },
        { $set: updateData }
      );

      if (result.modifiedCount === 0) {
        return NextResponse.json(
          { success: false, message: 'No changes were made to the location' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Location updated successfully',
          locationId,
        },
        { status: 200 }
      );
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, message: 'Database operation failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Location ID is required' },
        { status: 400 }
      );
    }

    // Get location data before deletion for logging
    const locationToDelete = await GamingLocations.findById(id);
    if (!locationToDelete) {
      return NextResponse.json(
        { success: false, message: 'Location not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting deletedAt
    await GamingLocations.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    );

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const deleteChanges = [
          { field: 'name', oldValue: locationToDelete.name, newValue: null },
          {
            field: 'country',
            oldValue: locationToDelete.country,
            newValue: null,
          },
          {
            field: 'address.street',
            oldValue: locationToDelete.address?.street || '',
            newValue: null,
          },
          {
            field: 'address.city',
            oldValue: locationToDelete.address?.city || '',
            newValue: null,
          },
          {
            field: 'rel.licencee',
            oldValue: locationToDelete.rel?.licencee || '',
            newValue: null,
          },
          {
            field: 'profitShare',
            oldValue: locationToDelete.profitShare,
            newValue: null,
          },
          {
            field: 'isLocalServer',
            oldValue: locationToDelete.isLocalServer,
            newValue: null,
          },
          {
            field: 'geoCoords.latitude',
            oldValue: locationToDelete.geoCoords?.latitude || 0,
            newValue: null,
          },
          {
            field: 'geoCoords.longitude',
            oldValue: locationToDelete.geoCoords?.longitude || 0,
            newValue: null,
          },
        ];

        await logActivity({
          action: 'DELETE',
          details: `Deleted location "${locationToDelete.name}"`,
          ipAddress: getClientIP(request as NextRequest) || undefined,
          userAgent:
            (request as NextRequest).headers.get('user-agent') || undefined,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'location',
            resourceId: id,
            resourceName: locationToDelete.name,
            changes: deleteChanges,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    return NextResponse.json(
      { success: true, message: 'Location deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('API Error in DELETE /api/locations:', errorMessage);
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
