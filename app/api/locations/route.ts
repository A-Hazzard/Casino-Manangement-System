/**
 * Locations API Route
 *
 * This route handles CRUD operations for gaming locations.
 * It supports:
 * - Fetching locations with role-based access control
 * - Creating new locations
 * - Updating existing locations
 * - Soft deleting locations
 * - Licencee filtering
 * - Location permission filtering
 * - Minimal projection for performance
 *
 * @module app/api/locations/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import {
  getUserAccessibleLicenceesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenceeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Countries } from '@/app/api/lib/models/countries';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { UpdateLocationData } from '@/lib/types/location';
import { generateMongoId } from '@/lib/utils/id';
import { getClientIP } from '@/lib/utils/ipAddress';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '../lib/services/loggerService';

/**
 * Main GET handler for fetching locations
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse query parameters (licencee, minimal, showAll, forceAll)
 * 3. Get user's accessible licencees and permissions
 * 4. Build query filter based on access control
 * 5. Fetch locations with optional minimal projection
 * 6. Add licenceeId field for frontend filtering
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
    // Support both 'licencee' and 'licencee' spelling for backwards compatibility
    const licencee =
      searchParams.get('licencee');
    const minimal = searchParams.get('minimal') === '1';

    // Note: Collectors can access location data via API for collection reports
    // Page-level access is restricted in ProtectedRoute, but API access is allowed
    // The minimal parameter check is no longer needed as API access is allowed
    const showAll = searchParams.get('showAll') === 'true';
    const forceAll =
      searchParams.get('forceAll') === 'true' ||
      searchParams.get('forceAll') === '1';

    // ============================================================================
    // STEP 3: Get user's accessible licencees and permissions
    // ============================================================================
    const userAccessibleLicencees = await getUserAccessibleLicenceesFromToken();
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

    const normalizedUserRoles = userRoles.map(r => String(r).toLowerCase());
    const isAdminOrDeveloper =
      normalizedUserRoles.includes('admin') || normalizedUserRoles.includes('developer');

    // Determine the licencee filter to use
    // If forceAll is true and user is admin, ignore licencee filter (show all)
    // If licencee is 'all' or empty, pass undefined to getUserLocationFilter to return all locations
    // Otherwise, use the licencee parameter from query string
    const licenceeFilterToUse =
      forceAll && isAdminOrDeveloper
        ? undefined
        : licencee && licencee !== 'all'
          ? licencee
          : undefined;

    // Apply location filtering based on licencee + location permissions
    // Always use getUserLocationFilter to ensure proper access control
    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicencees,
      licenceeFilterToUse,
      userLocationPermissions,
      userRoles
    );

    if (allowedLocationIds !== 'all') {
      if (allowedLocationIds.length === 0) {
        // No accessible locations
        queryFilter = { ...deletionFilter, _id: null };
      } else {
        queryFilter = { ...deletionFilter, _id: { $in: allowedLocationIds } };

        // CRITICAL: Add explicit licencee filter when specific licencee is selected
        // This ensures we only return locations from the selected licencee
        if (licenceeFilterToUse && licenceeFilterToUse !== 'all') {
          // Resolve licencee ID (could be ID or name)
          let resolvedLicenceeId = licenceeFilterToUse;
          try {
            const licenceeDoc = await Licencee.findOne(
              {
                $or: [
                  { _id: licenceeFilterToUse },
                  {
                    name: {
                      $regex: new RegExp(`^${licenceeFilterToUse}$`, 'i'),
                    },
                  },
                ],
              },
              { _id: 1 }
            ).lean();

            if (licenceeDoc && !Array.isArray(licenceeDoc)) {
              resolvedLicenceeId = String(licenceeDoc._id);
            }
          } catch {
            // If resolution fails, use as-is
          }

          if (!queryFilter.$and) {
            queryFilter.$and = [];
          }
          (queryFilter.$and as Array<Record<string, unknown>>).push({
            $or: [
              { 'rel.licencee': resolvedLicenceeId },
            ],
          });
          console.log(
            `[Locations API] Applied licencee filter: ${resolvedLicenceeId} (from ${licenceeFilterToUse})`
          );
        }
      }
    } else {
      // Admin with no restrictions - return all locations (with deletion filter)
      // But if a specific licencee is selected, still filter by it
      queryFilter = { ...deletionFilter };
      if (licenceeFilterToUse && licenceeFilterToUse !== 'all') {
        // Resolve licencee ID (could be ID or name)
        let resolvedLicenceeId = licenceeFilterToUse;
        try {
          const licenceeDoc = await Licencee.findOne(
            {
              $or: [
                { _id: licenceeFilterToUse },
                {
                  name: { $regex: new RegExp(`^${licenceeFilterToUse}$`, 'i') },
                },
              ],
            },
            { _id: 1 }
          ).lean();

          if (licenceeDoc && !Array.isArray(licenceeDoc)) {
            resolvedLicenceeId = String(licenceeDoc._id);
          }
        } catch (error) {
          // If resolution fails, use as-is
          console.warn(
            `[Locations API] Failed to resolve licencee ${licenceeFilterToUse}:`,
            error
          );
        }

        if (!queryFilter.$and) {
          queryFilter.$and = [];
        }
        (queryFilter.$and as Array<Record<string, unknown>>).push({
          $or: [
            { 'rel.licencee': resolvedLicenceeId },
          ],
        });
        console.log(
          `[Locations API] Applied licencee filter (admin): ${resolvedLicenceeId} (from ${licenceeFilterToUse})`
        );
      }
    }

    // ============================================================================
    // STEP 5: Fetch locations with optional minimal projection
    // ============================================================================
    const projection = minimal
      ? { _id: 1, name: 1, geoCoords: 1, 'rel.licencee': 1, useNetGross: 1 }
      : undefined;
    const locations = await GamingLocations.find(queryFilter, projection)
      .sort({ name: 1 })
      .lean();

    // ============================================================================
    // STEP 6: Add licenceeId field for frontend filtering
    // ============================================================================
    const locationsWithLicenceeId = locations.map(loc => {
      const licenceeRaw = loc.rel?.licencee;
      let licenceeId: string | null = null;

      if (Array.isArray(licenceeRaw)) {
        licenceeId =
          licenceeRaw.length > 0 && licenceeRaw[0]
            ? String(licenceeRaw[0])
            : null;
      } else if (licenceeRaw) {
        licenceeId = String(licenceeRaw);
      }

      return {
        ...loc,
        licenceeId,
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
      { locations: locationsWithLicenceeId },
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
      membershipEnabled,
      locationMembershipSettings,
      useNetGross,
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
        licencee: (rel?.licencee || rel?.licencee) as string[] | undefined || [],
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
      membershipEnabled: membershipEnabled || false,
      locationMembershipSettings: locationMembershipSettings || {
        enableFreePlays: false,
        pointsRatioMethod: '',
        gamesPlayedRatio: 0,
        pointMethodValue: 0,
        enablePoints: false,
        freePlayCreditsTimeout: 0,
        locationLimit: 0,
        freePlayAmount: 0,
        pointsMethodGameTypes: [],
        freePlayGameTypes: [],
      },
      useNetGross: useNetGross || false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(-1), // SMIB boards require all fields to be present
    });

    // ============================================================================
    // STEP 6: Clean up old unique index (Temporary fix for name reuse)
    // ============================================================================
    try {
      // Drop the old global unique index if it exists.
      // This is necessary because Mongoose won't automatically remove it when we change it to a partial index.
      await GamingLocations.collection.dropIndex('name_1');
    } catch {
      // Index might not exist, which is fine
    }

    // ============================================================================
    // STEP 7: Save location to database
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
            newValue: rel?.licencee || rel?.licencee || '',
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
          userId: currentUser._id as string,
          username: currentUser.emailAddress as string,
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

    // Force revalidation of the locations page to ensure the new location appears
    revalidatePath('/locations');

    return NextResponse.json(
      { success: true, location: newLocation },
      { status: 201 }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    let errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    let status = 500;

    // Handle MongoDB duplicate key error (code 11000)
    const mongoError = error as { code?: number; keyPattern?: Record<string, unknown>; message?: string };
    if (mongoError && typeof mongoError === 'object' && mongoError.code === 11000) {
      let fieldName = 'field';
      if (mongoError.keyPattern) {
        fieldName = Object.keys(mongoError.keyPattern)[0];
      } else if (mongoError.message && mongoError.message.includes('index:')) {
        const match = mongoError.message.match(/index: (.+?)_\d/);
        if (match && match[1]) fieldName = match[1];
      }

      const friendlyFieldMap: Record<string, string> = {
        name: 'Location Name',
        location: 'Location ID',
        'rel.licencee': 'Licencee',
      };

      const displayField = friendlyFieldMap[fieldName] || fieldName;
      errorMessage = `This ${displayField} is already taken. Please use a unique value.`;
      status = 400;
    }

    console.error(
      `[Locations API POST] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status }
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
      membershipEnabled,
      locationMembershipSettings,
      useNetGross,
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
      const licenceeVal = rel.licencee || rel.licencee;
      if (licenceeVal !== undefined) {
        updateData.rel.licencee = licenceeVal;
      }
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

    if (billValidatorOptions) {
      updateData.billValidatorOptions = Object.fromEntries(
        Object.entries(billValidatorOptions).map(([k, v]) => [k, Boolean(v)])
      ) as UpdateLocationData['billValidatorOptions'];
    }

    if (membershipEnabled !== undefined) {
      updateData.membershipEnabled = Boolean(membershipEnabled);
    }

    if (locationMembershipSettings) {
      updateData.locationMembershipSettings = locationMembershipSettings;
    }
    
    if (useNetGross !== undefined) {
      updateData.useNetGross = Boolean(useNetGross);
    }

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();

    // ============================================================================
    // STEP 6.5: Clean up old unique index (Temporary fix for name reuse)
    // ============================================================================
    try {
      // Drop the old global unique index if it exists.
      // This is necessary because Mongoose won't automatically remove it when we change it to a partial index.
      await GamingLocations.collection.dropIndex('name_1');
    } catch {
      // Index might not exist, which is fine
    }

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
        if (membershipEnabled !== undefined) {
          updateChanges.push({
            field: 'membershipEnabled',
            oldValue: location.membershipEnabled,
            newValue: membershipEnabled,
          });
        }
        if (locationMembershipSettings !== undefined) {
          updateChanges.push({
            field: 'locationMembershipSettings',
            oldValue: location.locationMembershipSettings,
            newValue: locationMembershipSettings,
          });
        }

        await logActivity({
          action: 'UPDATE',
          details: `Updated location "${location.name}" (${updateChanges.length} change${updateChanges.length !== 1 ? 's' : ''})`,
          ipAddress: getClientIP(request as NextRequest) || undefined,
          userAgent:
            (request as NextRequest).headers.get('user-agent') || undefined,
          userId: currentUser._id as string,
          username: currentUser.emailAddress as string,
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
    // Force revalidation of the locations page
    revalidatePath('/locations');

    return NextResponse.json(
      {
        success: true,
        message: 'Location updated successfully',
        locationId,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    let errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    let status = 500;

    // Handle MongoDB duplicate key error (code 11000)
    const mongoError = error as { code?: number; keyPattern?: Record<string, unknown>; message?: string };
    if (mongoError && typeof mongoError === 'object' && mongoError.code === 11000) {
      let fieldName = 'field';
      if (mongoError.keyPattern) {
        fieldName = Object.keys(mongoError.keyPattern)[0];
      } else if (mongoError.message && mongoError.message.includes('index:')) {
        const match = mongoError.message.match(/index: (.+?)_\d/);
        if (match && match[1]) fieldName = match[1];
      }

      const friendlyFieldMap: Record<string, string> = {
        name: 'Location Name',
        location: 'Location ID',
        'rel.licencee': 'Licencee',
      };

      const displayField = friendlyFieldMap[fieldName] || fieldName;
      errorMessage = `This ${displayField} is already taken. Please use a unique value.`;
      status = 400;
    }

    console.error(
      `[Locations API PUT] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status }
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
          userId: currentUser._id as string,
          username: currentUser.emailAddress as string,
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
    // Force revalidation of the locations page
    revalidatePath('/locations');

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

