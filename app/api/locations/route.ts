/**
 * Locations API Route
 *
 * This route handles CRUD operations for gaming locations.
 * It supports:
 * - Fetching locations with role-based access control
 * - Creating new locations
 * - Updating existing locations
 * - Soft deleting locations
 * - Licensee filtering
 * - Location permission filtering
 * - Minimal projection for performance
 *
 * @module app/api/locations/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import {
  getUserAccessibleLicenseesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Countries } from '@/app/api/lib/models/countries';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { apiLogger } from '@/app/api/lib/utils/logger';
import { UpdateLocationData } from '@/lib/types/location';
import { generateMongoId } from '@/lib/utils/id';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching locations
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse query parameters (licensee, minimal, showAll, forceAll)
 * 3. Get user's accessible licensees and permissions
 * 4. Build query filter based on access control
 * 5. Fetch locations with optional minimal projection
 * 6. Add licenseeId field for frontend filtering
 * 7. Return locations
 */
export async function GET(request: Request) {
  const startTime = Date.now();
  const context = apiLogger.createContext(
    request as NextRequest,
    '/api/locations'
  );
  apiLogger.startLogging();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    // Support both 'licensee' and 'licencee' spelling for backwards compatibility
    const licencee =
      searchParams.get('licensee') || searchParams.get('licencee');
    const minimal = searchParams.get('minimal') === '1';

    // Note: Collectors can access location data via API for collection reports
    // Page-level access is restricted in ProtectedRoute, but API access is allowed
    // The minimal parameter check is no longer needed as API access is allowed
    const showAll = searchParams.get('showAll') === 'true';
    const forceAll =
      searchParams.get('forceAll') === 'true' ||
      searchParams.get('forceAll') === '1';

    // ============================================================================
    // STEP 3: Get user's accessible licensees and permissions
    // ============================================================================
    const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
    const userPayload = await getUserFromServer();
    const userRoles = (userPayload?.roles as string[]) || [];

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

    // ============================================================================
    // STEP 4: Build query filter based on access control
    // ============================================================================
    const deletionFilter = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    };

    let queryFilter: Record<string, unknown>;

    const isAdminOrDeveloper =
      userRoles.includes('admin') || userRoles.includes('developer');

    // Determine the licensee filter to use
    // If forceAll is true and user is admin, ignore licensee filter (show all)
    // If licencee is 'all' or empty, pass undefined to getUserLocationFilter to return all locations
    // Otherwise, use the licensee parameter from query string
    const licenseeFilterToUse =
      forceAll && isAdminOrDeveloper
        ? undefined
        : licencee && licencee !== 'all'
          ? licencee
          : undefined;

    // Apply location filtering based on licensee + location permissions
    // Always use getUserLocationFilter to ensure proper access control
      const allowedLocationIds = await getUserLocationFilter(
        userAccessibleLicensees,
      licenseeFilterToUse,
        userLocationPermissions,
        userRoles
      );

      if (allowedLocationIds !== 'all') {
        if (allowedLocationIds.length === 0) {
          // No accessible locations
          queryFilter = { ...deletionFilter, _id: null };
        } else {
          queryFilter = { ...deletionFilter, _id: { $in: allowedLocationIds } };

        // CRITICAL: Add explicit licensee filter when specific licensee is selected
        // This ensures we only return locations from the selected licensee
        if (licenseeFilterToUse && licenseeFilterToUse !== 'all') {
          // Resolve licensee ID (could be ID or name)
          let resolvedLicenseeId = licenseeFilterToUse;
          try {
            const licenseeDoc = await Licencee.findOne(
              {
                $or: [
                  { _id: licenseeFilterToUse },
                  {
                    name: {
                      $regex: new RegExp(`^${licenseeFilterToUse}$`, 'i'),
                    },
                  },
                ],
              },
              { _id: 1 }
            ).lean();

            if (licenseeDoc && !Array.isArray(licenseeDoc)) {
              resolvedLicenseeId = String(licenseeDoc._id);
            }
          } catch {
            // If resolution fails, use as-is
          }

          queryFilter['rel.licencee'] = resolvedLicenseeId;
          console.log(
            `[Locations API] Applied licensee filter: ${resolvedLicenseeId} (from ${licenseeFilterToUse})`
          );
        }
        }
      } else {
      // Admin with no restrictions - return all locations (with deletion filter)
      // But if a specific licensee is selected, still filter by it
      queryFilter = { ...deletionFilter };
      if (licenseeFilterToUse && licenseeFilterToUse !== 'all') {
        // Resolve licensee ID (could be ID or name)
        let resolvedLicenseeId = licenseeFilterToUse;
        try {
          const licenseeDoc = await Licencee.findOne(
            {
              $or: [
                { _id: licenseeFilterToUse },
                {
                  name: { $regex: new RegExp(`^${licenseeFilterToUse}$`, 'i') },
                },
              ],
            },
            { _id: 1 }
          ).lean();

          if (licenseeDoc && !Array.isArray(licenseeDoc)) {
            resolvedLicenseeId = String(licenseeDoc._id);
          }
        } catch (error) {
          // If resolution fails, use as-is
          console.warn(
            `[Locations API] Failed to resolve licensee ${licenseeFilterToUse}:`,
            error
          );
        }

        queryFilter['rel.licencee'] = resolvedLicenseeId;
        console.log(
          `[Locations API] Applied licensee filter (admin): ${resolvedLicenseeId} (from ${licenseeFilterToUse})`
        );
      }
    }

    // ============================================================================
    // STEP 5: Fetch locations with optional minimal projection
    // ============================================================================
    const projection = minimal
      ? { _id: 1, name: 1, geoCoords: 1, 'rel.licencee': 1 }
      : undefined;
    const locations = await GamingLocations.find(queryFilter, projection)
      .sort({ name: 1 })
      .lean();

    // ============================================================================
    // STEP 6: Add licenseeId field for frontend filtering
    // ============================================================================
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

    // ============================================================================
    // STEP 7: Return locations
    // ============================================================================
    const duration = Date.now() - startTime;
    apiLogger.logSuccess(
      context,
      `Successfully fetched ${locations.length} locations (minimal: ${minimal}, showAll: ${showAll}) in ${duration}ms`
    );
    return NextResponse.json(
      { locations: locationsWithLicenseeId },
      { status: 200 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    apiLogger.logError(
      context,
      `Failed to fetch locations after ${duration}ms`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Main POST handler for creating a new location
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse and validate request body
 * 3. Validate required fields and business rules
 * 4. Verify country exists if provided
 * 5. Create new location document
 * 6. Save location to database
 * 7. Log activity
 * 8. Return created location
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse and validate request body
    // ============================================================================
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

    // ============================================================================
    // STEP 3: Validate required fields and business rules
    // ============================================================================
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

    // ============================================================================
    // STEP 4: Verify country exists if provided
    // ============================================================================
    if (country && typeof country === 'string' && country.trim().length > 0) {
      // CRITICAL: Use findOne with _id instead of findById (repo rule)
      const countryDoc = await Countries.findOne({ _id: country }).lean();
      if (!countryDoc) {
        return NextResponse.json(
          { success: false, message: 'Invalid country ID' },
          { status: 400 }
        );
      }
    }

    // ============================================================================
    // STEP 5: Create new location document
    // ============================================================================
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
        licencee: (rel?.licencee as string[] | undefined) || [],
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

    // ============================================================================
    // STEP 6: Save location to database
    // ============================================================================
    await newLocation.save();

    // ============================================================================
    // STEP 7: Log activity
    // ============================================================================
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

    // ============================================================================
    // STEP 8: Return created location
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Locations API POST] Completed in ${duration}ms`);
    }
    return NextResponse.json(
      { success: true, location: newLocation },
      { status: 201 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error(
      `[Locations API POST] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Main PUT handler for updating an existing location
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse and validate request body
 * 3. Find location by ID
 * 4. Validate update fields and business rules
 * 5. Verify country exists if provided
 * 6. Build update data object
 * 7. Update location in database
 * 8. Return update result
 */
export async function PUT(request: Request) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse and validate request body
    // ============================================================================
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

    // ============================================================================
    // STEP 3: Find location by ID
    // ============================================================================
    const location = await GamingLocations.findOne({
      _id: locationName,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    });

    if (!location) {
      return NextResponse.json(
        { success: false, message: 'Location not found' },
        { status: 404 }
      );
    }

    const locationId = location._id.toString();

    // ============================================================================
    // STEP 4: Validate update fields and business rules
    // ============================================================================
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
      (typeof profitShare !== 'number' || profitShare < 0 || profitShare > 100)
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

    // ============================================================================
    // STEP 5: Verify country exists if provided
    // ============================================================================
    if (country && typeof country === 'string' && country.trim().length > 0) {
      // CRITICAL: Use findOne with _id instead of findById (repo rule)
      const countryDoc = await Countries.findOne({ _id: country }).lean();
      if (!countryDoc) {
        return NextResponse.json(
          { success: false, message: 'Invalid country ID' },
          { status: 400 }
        );
      }
    }

    // ============================================================================
    // STEP 6: Build update data object
    // ============================================================================
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

    // ============================================================================
    // STEP 7: Update location in database
    // ============================================================================
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

    // ============================================================================
    // STEP 8: Log activity with accurate change tracking
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        // Build changes array - ONLY for fields that were actually updated
        const updateChanges: Array<{
          field: string;
          oldValue: unknown;
          newValue: unknown;
        }> = [];

        if (name !== undefined) {
          updateChanges.push({
            field: 'name',
            oldValue: location.name,
            newValue: name,
          });
        }
        if (country !== undefined) {
          updateChanges.push({
            field: 'country',
            oldValue: location.country,
            newValue: country,
          });
        }
        if (address?.street !== undefined) {
          updateChanges.push({
            field: 'address.street',
            oldValue: location.address?.street,
            newValue: address.street,
          });
        }
        if (address?.city !== undefined) {
          updateChanges.push({
            field: 'address.city',
            oldValue: location.address?.city,
            newValue: address.city,
          });
        }
        if (rel?.licencee !== undefined) {
          updateChanges.push({
            field: 'rel.licencee',
            oldValue: location.rel?.licencee,
            newValue: rel.licencee,
          });
        }
        if (profitShare !== undefined) {
          updateChanges.push({
            field: 'profitShare',
            oldValue: location.profitShare,
            newValue: profitShare,
          });
        }
        if (gameDayOffset !== undefined) {
          updateChanges.push({
            field: 'gameDayOffset',
            oldValue: location.gameDayOffset,
            newValue: gameDayOffset,
          });
        }
        if (isLocalServer !== undefined) {
          updateChanges.push({
            field: 'isLocalServer',
            oldValue: location.isLocalServer,
            newValue: isLocalServer,
          });
        }
        if (geoCoords?.latitude !== undefined) {
          updateChanges.push({
            field: 'geoCoords.latitude',
            oldValue: location.geoCoords?.latitude,
            newValue: geoCoords.latitude,
          });
        }
        if (geoCoords?.longitude !== undefined) {
          updateChanges.push({
            field: 'geoCoords.longitude',
            oldValue: location.geoCoords?.longitude,
            newValue: geoCoords.longitude,
          });
        }

        await logActivity({
          action: 'UPDATE',
          details: `Updated location "${location.name}" (${updateChanges.length} change${updateChanges.length !== 1 ? 's' : ''})`,
          ipAddress: getClientIP(request as NextRequest) || undefined,
          userAgent:
            (request as NextRequest).headers.get('user-agent') || undefined,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'location',
            resourceId: locationId,
            resourceName: location.name,
            changes: updateChanges,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    // ============================================================================
    // STEP 9: Return update result
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Locations API PUT] Completed in ${duration}ms`);
    }
    return NextResponse.json(
      {
        success: true,
        message: 'Location updated successfully',
        locationId,
      },
      { status: 200 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error(
      `[Locations API PUT] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Main DELETE handler for soft deleting a location
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse location ID from query parameters
 * 3. Find location to delete
 * 4. Perform soft delete
 * 5. Log activity
 * 6. Return deletion result
 */
export async function DELETE(request: Request) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse location ID from query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Location ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Find location to delete
    // ============================================================================
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const locationToDelete = await GamingLocations.findOne({ _id: id });
    if (!locationToDelete) {
      return NextResponse.json(
        { success: false, message: 'Location not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Perform soft delete
    // ============================================================================
    // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
    await GamingLocations.findOneAndUpdate(
      { _id: id },
      { deletedAt: new Date() },
      { new: true }
    );

    // ============================================================================
    // STEP 5: Log activity
    // ============================================================================
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

    // ============================================================================
    // STEP 6: Return deletion result
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Locations API DELETE] Completed in ${duration}ms`);
    }
    return NextResponse.json(
      { success: true, message: 'Location deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error(
      `[Locations API DELETE] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
