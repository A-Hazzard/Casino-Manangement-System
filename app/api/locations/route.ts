/**
 * Locations API Route
 *
 * Handles CRUD operations for gaming locations.
 * Admin/developer access is required for write operations (POST, PUT, DELETE, PATCH).
 *
 * GET    /api/locations  - List locations filtered by user permissions and licencee
 * POST   /api/locations  - Create a new location
 * PUT    /api/locations  - Update an existing location
 * DELETE /api/locations  - Soft-delete or hard-delete a location (and its machines)
 * PATCH  /api/locations  - Restore a soft-deleted location (and its machines)
 */
import {
  calculateChanges,
  logActivity,
  mapDeletedFieldsToChanges,
} from '@/app/api/lib/helpers/activityLogger';
import { getUserAccessibleLicenceesFromToken } from '@/app/api/lib/helpers/licenceeFilter';
import { buildLocationQueryFilter } from '@/app/api/lib/helpers/locations';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Countries } from '@/app/api/lib/models/countries';
import type { CountryDocument, LicenceeDocument } from '@/shared/types';
import type { UpdateLocationData } from '@/shared/types/entities';
import type { LocationDocument } from '@/shared/types/models';
import { generateMongoId } from '@/lib/utils/id';
import { getClientIP } from '@/lib/utils/ipAddress';
import { revalidatePath } from 'next/cache';
import {
  logRouteFetch,
  logRouteCreate,
  logRouteUpdate,
  logRouteDelete,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '../lib/services/loggerService';

/**
 * GET /api/locations
 *
 * Returns the list of gaming locations accessible to the current user.
 * Used by the Locations page list view, dashboard licencee selector, and map pin rendering.
 *
 * Query params:
 * @param {string} [licencee] - Optional. Filter results to locations belonging to this licencee ID.
 *                                When omitted, all licencees the user can access are included.
 * @param {'1'} [minimal] - Optional. When '1', returns a lightweight projection
 *                                (id, name, geoCoords, licencee ref only). Used by the dashboard
 *                                map and dropdowns.
 * @param {'1'} [compact] - Optional. When '1', returns a legacy-compatible lightweight array
 *                                (id, name, licenceeId). Used for fast dropdowns and profile settings.
 * @param {'true'|'1'} [forceAll] - Optional. Bypasses the per-location access filter so all
 *                                locations under the accessible licencees are returned. Admin/dev
 *                                only — non-admins receive 403 if this filter would expose
 *                                locations outside their assignedLocations.
 * @param {'true'} [archived] - Optional. When 'true', includes soft-deleted (archived) locations
 *                                in the results. Used by the Archived Locations view.
 *
 * Flow:
 * 1. Parse query params
 * 2. Resolve user accessible licencees and location permissions
 * 3. Build query filter via helper
 * 4. Fetch locations and enrich with licencee jackpot flag
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/locations';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    const context = apiLogger.createContext(request, '/api/locations');
    apiLogger.startLogging();

    try {
      const { searchParams } = new URL(request.url);
      const licencee = searchParams.get('licencee');
      const ids = searchParams.get('ids');
      const forceAll =
        searchParams.get('forceAll') === 'true' ||
        searchParams.get('forceAll') === '1';
      const showArchived =
        searchParams.get('archived') === 'true' ||
        searchParams.get('includeDeleted') === 'true';

      const userAccessibleLicencees =
        await getUserAccessibleLicenceesFromToken();
      const userLocationPermissions =
        (userPayload as { assignedLocations?: string[] })?.assignedLocations ||
        [];

      // Build the query filter using all permission and licencee context
      const queryFilter = await buildLocationQueryFilter({
        licencee: licencee || null,
        forceAll,
        showArchived,
        userRoles,
        userAccessibleLicencees,
        userLocationPermissions,
      });

      if (ids) {
        const idArray = ids
          .split(',')
          .map(id => id.trim())
          .filter(id => id);
        if (idArray.length > 0) {
          queryFilter._id = { $in: idArray };
        }
      }

      const locations = await GamingLocations.find(queryFilter)
        .sort({ name: 1 })
        .lean<LocationDocument[]>();

      // Normal rich response
      const allLicenceeIds = Array.from(
        new Set(
          locations
            .map(location => {
              const licenceeRef = location.rel?.licencee;
              return Array.isArray(licenceeRef) ? licenceeRef[0] : licenceeRef;
            })
            .filter(Boolean)
        )
      );

      const licenceeDocs = await Licencee.find(
        { _id: { $in: allLicenceeIds } },
        { includeJackpot: 1 }
      ).lean<LicenceeDocument[]>();
      const jackpotMap = new Map(
        licenceeDocs.map(licenceeDoc => [
          String(licenceeDoc._id),
          !!licenceeDoc.includeJackpot,
        ])
      );

      const results = locations.map(location => {
        const licenceeRef = location.rel?.licencee;
        const licenceeId = Array.isArray(licenceeRef)
          ? licenceeRef[0]
            ? String(licenceeRef[0])
            : null
          : licenceeRef
            ? String(licenceeRef)
            : null;
        return {
          ...location,
          licenceeId: licenceeId,
          includeJackpot: licenceeId
            ? jackpotMap.get(licenceeId) || false
            : false,
        };
      });

      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/locations',
        results.length,
        user,
        duration
      );
      apiLogger.logSuccess(
        context,
        `Fetched ${locations.length} in ${duration}ms`
      );
      return NextResponse.json({ locations: results }, { status: 200 });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch locations';
      logRouteError(functionName, 'GET', '/api/locations', errorMessage, user);
      console.error(`[Locations GET API] Error:`, error);
      return NextResponse.json(
        { success: false, message: 'Failed' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/locations
 *
 * Creates a new gaming location. Restricted to admin/developer roles.
 * Triggered by the "Add Location" modal on the Locations page.
 *
 * Body fields:
 * @param {string} name - Required. Display name of the location.
 * @param {string} [country] - Optional. Country ID (must exist in Countries collection).
 * @param {object} [address] - Optional. `{ street, city }` — physical address for display.
 * @param {string[]} [rel.licencee] - Optional. Licencee IDs this location belongs to.
 *                                             Controls which licencee users can see this location.
 * @param {number} [profitShare] - Optional. Percentage profit split for this location (default 50).
 * @param {number} [gameDayOffset] - Optional. Hour at which the gaming day starts (default 8 = 8 AM Trinidad time).
 *                                             Used by all financial metric queries for this location.
 * @param {boolean} [isLocalServer] - Optional. Whether this location runs a local SMIB server.
 * @param {object} [geoCoords] - Optional. `{ latitude, longitude }` — used for map pin placement.
 * @param {object} [billValidatorOptions] - Optional. Per-denomination bill validator enable flags
 *                                             (denom1–denom10000). Controls which bill denominations
 *                                             are accepted at this location.
 * @param {boolean} [membershipEnabled] - Optional. Enables the player membership/loyalty system.
 * @param {boolean} [aceEnabled] - Optional. Enables ACE (always-online) mode — machines
 *                                             at this location are treated as always online.
 * @param {object} [locationMembershipSettings] - Optional. Detailed membership config: points ratio,
 *                                             free play amounts, game type restrictions, etc.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/locations';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: currentUser, isAdminOrDev }) => {
    if (!isAdminOrDev) {
      logRouteError(
        functionName,
        'POST',
        '/api/locations',
        'Access denied',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    try {
      const body = await request.json();
      const {
        name,
        country,
        profitShare,
        gameDayOffset,
        rel,
        isLocalServer,
        geoCoords,
        billValidatorOptions,
        membershipEnabled,
        aceEnabled,
        locationMembershipSettings,
        googleMapsLink,
        googleMapsIframe,
        previousCollectionTime,
      } = body;

      if (!name) {
        logRouteError(
          functionName,
          'POST',
          '/api/locations',
          'Name required',
          user
        );
        return NextResponse.json(
          { success: false, message: 'Name required' },
          { status: 400 }
        );
      }

      if (country) {
        const countryDoc = await Countries.findOne({
          _id: country,
        }).lean<CountryDocument>();
        if (!countryDoc) {
          logRouteError(
            functionName,
            'POST',
            '/api/locations',
            'Invalid country',
            user
          );
          return NextResponse.json(
            { success: false, message: 'Invalid country' },
            { status: 400 }
          );
        }
      }

      const locationId = await generateMongoId();
      const newLocation = new GamingLocations({
        _id: locationId,
        name,
        country,
        address: {
          street: body.address?.street || '',
          city: body.address?.city || '',
        },
        rel: { licencee: (rel?.licencee || []) as string[] },
        profitShare: profitShare || 50,
        gameDayOffset: gameDayOffset ?? 8,
        isLocalServer: isLocalServer || false,
        previousCollectionTime: previousCollectionTime ? new Date(previousCollectionTime) : undefined,
        geoCoords: {
          latitude: geoCoords?.latitude || 0,
          longitude: geoCoords?.longitude || 0,
          longtitude: geoCoords?.longitude || 0, // For legacy compatibility
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
        aceEnabled: aceEnabled || false,
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
        googleMapsLink: googleMapsLink || '',
        googleMapsIframe: googleMapsIframe || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(-1),
      });

      try {
        await GamingLocations.collection.dropIndex('name_1');
      } catch {}
      await newLocation.save();

      if (currentUser && currentUser.emailAddress) {
        const changes = Object.entries(newLocation.toObject())
          .filter(([key]) => !['_id', '__v', 'createdAt', 'updatedAt', 'deletedAt'].includes(key))
          .map(([key, val]) => {
            let stringVal = String(val);
            if (val instanceof Date) {
              stringVal = val.toISOString();
            } else if (typeof val === 'object' && val !== null) {
              stringVal = JSON.stringify(val);
            }
            return {
              field: key,
              oldValue: null,
              newValue: stringVal,
            };
          });

        await logActivity({
          action: 'CREATE',
          details: `Created location "${name}"`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          userId: currentUser._id,
          username: currentUser.emailAddress,
          metadata: {
            resource: 'location',
            resourceId: locationId,
            resourceName: name,
            changes,
          },
        });
      }

      const duration = Date.now() - startTime;
      logRouteCreate(functionName, 'POST', '/api/locations', 1, user, duration);

      revalidatePath('/locations');
      return NextResponse.json(
        { success: true, location: newLocation },
        { status: 201 }
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logRouteError(functionName, 'POST', '/api/locations', message, user);
      console.error(`[Locations POST API] Error:`, error);
      return NextResponse.json({ success: false, message }, { status: 500 });
    }
  });
}

/**
 * PUT /api/locations
 *
 * Updates an existing gaming location. Restricted to admin/developer roles.
 * Triggered by the "Edit Location" modal on the Locations page.
 *
 * Body fields:
 * @param {string} locationName - Required. The `_id` of the location to update (field name is
 *                                             `locationName` for legacy reasons — it is the location ID).
 * @param {string} [name] - Optional. New display name.
 * @param {string} [country] - Optional. New country ID.
 * @param {object} [address] - Optional. `{ street, city }` — updated physical address.
 * @param {string[]} [rel.licencee] - Optional. Updated licencee IDs. Changing this affects
 *                                             which users can see this location.
 * @param {number} [profitShare] - Optional. Updated profit split percentage.
 * @param {number} [gameDayOffset] - Optional. Updated gaming day start hour. Affects how
 *                                             "Today" and period queries are calculated for this location.
 * @param {boolean} [isLocalServer] - Optional. Updated local server flag.
 * @param {object} [geoCoords] - Optional. Updated `{ latitude, longitude }` map coordinates.
 * @param {object} [billValidatorOptions] - Optional. Updated per-denomination bill validator flags.
 * @param {boolean} [membershipEnabled] - Optional. Toggle player membership system on/off.
 * @param {boolean} [aceEnabled] - Optional. Toggle ACE always-online mode on/off.
 * @param {object} [locationMembershipSettings] - Optional. Updated membership configuration.
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'PUT /api/locations';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: currentUser, isAdminOrDev }) => {
    if (!isAdminOrDev) {
      logRouteError(
        functionName,
        'PUT',
        '/api/locations',
        'Access denied',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    try {
      const body = await request.json();
      const {
        locationName,
        name,
        country,
        profitShare,
        gameDayOffset,
        rel,
        isLocalServer,
        geoCoords,
        billValidatorOptions,
        membershipEnabled,
        aceEnabled,
        locationMembershipSettings,
        googleMapsLink,
        googleMapsIframe,
      } = body;

      if (!locationName) {
        logRouteError(
          functionName,
          'PUT',
          '/api/locations',
          'ID required',
          user
        );
        return NextResponse.json(
          { success: false, message: 'ID required' },
          { status: 400 }
        );
      }

      const location = await GamingLocations.findOne({
        _id: locationName,
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ],
      });
      if (!location)
        return NextResponse.json(
          { success: false, message: 'Not found' },
          { status: 404 }
        );

      const updateData: UpdateLocationData = { updatedAt: new Date() };
      if (name) updateData.name = name;
      if (country) updateData.country = country;
      if (body.address)
        updateData.address = {
          street: body.address.street,
          city: body.address.city,
        };
      if (rel) updateData.rel = { licencee: rel.licencee };
      if (typeof profitShare === 'number') updateData.profitShare = profitShare;
      if (typeof gameDayOffset === 'number')
        updateData.gameDayOffset = gameDayOffset;
      if (typeof isLocalServer === 'boolean')
        updateData.isLocalServer = isLocalServer;

      if (geoCoords && geoCoords.latitude && geoCoords.longitude) {
        updateData.geoCoords = {
          latitude: geoCoords.latitude,
          longitude: geoCoords.longitude,
          longtitude: geoCoords.longitude, // For legacy compatibility
        };
      }
      if (billValidatorOptions) {
        updateData.billValidatorOptions = Object.fromEntries(
          Object.entries(billValidatorOptions).map(([k, v]) => [k, Boolean(v)])
        ) as Record<string, boolean>;
      }
      if (membershipEnabled !== undefined)
        updateData.membershipEnabled = Boolean(membershipEnabled);
      if (aceEnabled !== undefined) updateData.aceEnabled = Boolean(aceEnabled);
      if (locationMembershipSettings)
        updateData.locationMembershipSettings = locationMembershipSettings;
      if (googleMapsLink !== undefined)
        updateData.googleMapsLink = googleMapsLink;
      if (googleMapsIframe !== undefined)
        updateData.googleMapsIframe = googleMapsIframe;

      try {
        await GamingLocations.collection.dropIndex('name_1');
      } catch {}
      await GamingLocations.updateOne(
        { _id: location._id },
        { $set: updateData },
        { strict: false }
      );

      const duration = Date.now() - startTime;
      logRouteUpdate(functionName, 'PUT', '/api/locations', 1, user, duration);
      console.log(
        `[Locations PUT] Updated location "${location.name}" (${location._id})`
      );
      if (currentUser && currentUser.emailAddress) {
        await logActivity({
          action: 'UPDATE',
          details: `Updated location "${location.name}"`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          userId: currentUser._id,
          username: currentUser.emailAddress,
          metadata: {
            resource: 'location',
            resourceId: String(location._id),
            resourceName: location.name,
            changes: calculateChanges(
              location.toObject() as Record<string, unknown>,
              updateData as Record<string, unknown>
            ),
            previousData: location.toObject(),
            newData: updateData,
          },
        });
      }

      revalidatePath('/locations');
      return NextResponse.json(
        { success: true, message: 'Updated', locationId: String(location._id) },
        { status: 200 }
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logRouteError(functionName, 'PUT', '/api/locations', message, user);
      console.error(`[Locations PUT API] Error:`, error);
      return NextResponse.json({ success: false, message }, { status: 500 });
    }
  });
}

/**
 * DELETE /api/locations
 *
 * Soft-deletes or permanently hard-deletes a location and all its machines.
 * Restricted to admin/developer roles. Triggered by the delete action on the Locations page.
 *
 * Query params:
 * @param {string} id - Required. The `_id` of the location to delete.
 * @param {'true'} [hardDelete] - Optional. When 'true', permanently removes the location and all its
 *                             machines from the database. Only available to developer/owner roles.
 *                             Without this flag, a soft-delete (sets `deletedAt`) is performed,
 *                             which moves the location to the Archived view instead of deleting it.
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'DELETE /api/locations';
  const user = extractUserFromRequest(request);

  return withApiAuth(
    request,
    async ({ user: currentUser, userRoles, isAdminOrDev }) => {
      const isLocAdmin = userRoles
        .map(r => r.toLowerCase())
        .some(r => r === 'location admin');
      if (!isAdminOrDev && !isLocAdmin) {
        logRouteError(
          functionName,
          'DELETE',
          '/api/locations',
          'Access denied',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }
      try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
          logRouteError(
            functionName,
            'DELETE',
            '/api/locations',
            'ID required',
            user
          );
          return NextResponse.json(
            { success: false, message: 'ID required' },
            { status: 400 }
          );
        }

        const locationToDelete = await GamingLocations.findOne({ _id: id });
        if (!locationToDelete) {
          logRouteError(
            functionName,
            'DELETE',
            '/api/locations',
            'Not found',
            user
          );
          return NextResponse.json(
            { success: false, message: 'Not found' },
            { status: 404 }
          );
        }

        const hardDelete = searchParams.get('hardDelete') === 'true';
        const isDevOrAdminOrLocAdmin = userRoles
          .map(r => r.toLowerCase())
          .some(r =>
            ['developer', 'owner', 'admin', 'location admin'].includes(r)
          );

        const archiveTimestamp = new Date();

        const associatedMachines = await Machine.find({ gamingLocation: id }).lean();

        if (hardDelete && isDevOrAdminOrLocAdmin) {
          const deleteLocationResult = await GamingLocations.deleteOne({
            _id: id,
          });
          if (deleteLocationResult.deletedCount === 0) {
            logRouteError(
              functionName,
              'DELETE',
              '/api/locations',
              'Location not found',
              user
            );
            return NextResponse.json(
              { success: false, message: 'Location not found' },
              { status: 404 }
            );
          }
          const deleteMachinesResult = await Machine.deleteMany({
            gamingLocation: id,
          });
          if (deleteMachinesResult.deletedCount === 0) {
            console.warn(
              `[Locations DELETE] No machines found for location ${id}`
            );
          }
        } else {
          const archiveLocationResult = await GamingLocations.findOneAndUpdate(
            { _id: id },
            { deletedAt: archiveTimestamp },
            { new: true }
          );
          if (!archiveLocationResult) {
            logRouteError(
              functionName,
              'DELETE',
              '/api/locations',
              'Location not found',
              user
            );
            return NextResponse.json(
              { success: false, message: 'Location not found' },
              { status: 404 }
            );
          }
          // Archive all machines belonging to this location
          const archiveMachinesResult = await Machine.updateMany(
            { gamingLocation: id },
            { deletedAt: archiveTimestamp }
          );
          if (archiveMachinesResult.modifiedCount === 0) {
            console.warn(
              `[Locations DELETE] No machines archived for location ${id}`
            );
          }
        }

        if (currentUser && currentUser.emailAddress) {
          const changes = mapDeletedFieldsToChanges(locationToDelete.toObject ? locationToDelete.toObject() : locationToDelete);
          await logActivity({
            action: hardDelete && isDevOrAdminOrLocAdmin ? 'DELETE' : 'ARCHIVE',
            details: `${hardDelete && isDevOrAdminOrLocAdmin ? 'Permanently deleted' : 'Archived'} location "${locationToDelete.name}"`,
            ipAddress: getClientIP(request) || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
            userId: currentUser._id,
            username: currentUser.emailAddress,
            metadata: {
              resource: 'location',
              resourceId: id,
              resourceName: locationToDelete.name,
              isHardDelete: hardDelete && isDevOrAdminOrLocAdmin,
              changes,
              previousData: locationToDelete.toObject ? locationToDelete.toObject() : locationToDelete,
              newData: null,
            },
          });

          // Log each associated machine being deleted or archived
          for (const m of associatedMachines) {
            if (hardDelete && isDevOrAdminOrLocAdmin) {
              const machineChanges = mapDeletedFieldsToChanges(m);
              await logActivity({
                action: 'DELETE',
                details: `Permanently deleted machine "${m.custom?.name || m.serialNumber || m.machineId || m._id}" as part of location permanent deletion`,
                ipAddress: getClientIP(request) || undefined,
                userAgent: request.headers.get('user-agent') || undefined,
                userId: currentUser._id,
                username: currentUser.emailAddress,
                metadata: {
                  resource: 'machine',
                  resourceId: m._id,
                  resourceName: m.custom?.name || m.serialNumber || m.machineId || m._id,
                  changes: machineChanges,
                  previousData: m,
                  newData: null,
                },
              });
            } else {
              const machineChanges = [
                {
                  field: 'deletedAt',
                  oldValue: m.deletedAt ? m.deletedAt.toISOString() : null,
                  newValue: archiveTimestamp.toISOString(),
                },
              ];
              await logActivity({
                action: 'ARCHIVE',
                details: `Archived machine "${m.custom?.name || m.serialNumber || m.machineId || m._id}" as part of location archiving`,
                ipAddress: getClientIP(request) || undefined,
                userAgent: request.headers.get('user-agent') || undefined,
                userId: currentUser._id,
                username: currentUser.emailAddress,
                metadata: {
                  resource: 'machine',
                  resourceId: m._id,
                  resourceName: m.custom?.name || m.serialNumber || m.machineId || m._id,
                  changes: machineChanges,
                  previousData: m,
                  newData: { ...m, deletedAt: archiveTimestamp },
                },
              });
            }
          }
        }

        const duration = Date.now() - startTime;
        logRouteDelete(
          functionName,
          'DELETE',
          '/api/locations',
          1,
          user,
          duration
        );

        revalidatePath('/locations');
        return NextResponse.json(
          { success: true, message: 'Deleted' },
          { status: 200 }
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        logRouteError(functionName, 'DELETE', '/api/locations', message, user);
        console.error(`[Locations DELETE API] Error:`, error);
        return NextResponse.json({ success: false, message }, { status: 500 });
      }
    }
  );
}

/**
 * PATCH /api/locations
 *
 * Restores a soft-deleted (archived) location and all its machines.
 * Restricted to admin/developer roles. Triggered by the "Restore" button in the Archived Locations view.
 *
 * Body fields:
 * @param {string} id - Required. The `_id` of the location to restore.
 * @param {'restore'} action - Required. Must be exactly `'restore'` — guards against accidental partial updates.
 */
export async function PATCH(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'PATCH /api/locations';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: currentUser, isAdminOrDev }) => {
    if (!isAdminOrDev) {
      logRouteError(
        functionName,
        'PATCH',
        '/api/locations',
        'Access denied',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    try {
      const { id, action } = await request.json();

      if (!id || action !== 'restore') {
        logRouteError(
          functionName,
          'PATCH',
          '/api/locations',
          'Invalid request',
          user
        );
        return NextResponse.json(
          { success: false, message: 'Invalid' },
          { status: 400 }
        );
      }

      const location = await GamingLocations.findOne({ _id: id });
      if (!location)
        return NextResponse.json(
          { success: false, message: 'Not found' },
          { status: 404 }
        );

      const restoreLocationResult = await GamingLocations.findOneAndUpdate(
        { _id: id },
        { $unset: { deletedAt: 1 } },
        { new: true }
      );
      if (!restoreLocationResult) {
        logRouteError(
          functionName,
          'PATCH',
          '/api/locations',
          'Location not found',
          user
        );
        return NextResponse.json(
          { success: false, message: 'Location not found' },
          { status: 404 }
        );
      }
      // Restore all machines belonging to this location
      const associatedMachines = await Machine.find({ gamingLocation: id }).lean();
      const restoreMachinesResult = await Machine.updateMany(
        { gamingLocation: id },
        { $unset: { deletedAt: 1 } }
      );
      if (restoreMachinesResult.modifiedCount === 0) {
        console.warn(
          `[Locations PATCH] No machines restored for location ${id}`
        );
      }

      if (currentUser && currentUser.emailAddress) {
        await logActivity({
          action: 'restore',
          details: `Restored location "${location.name}"`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          userId: currentUser._id,
          username: currentUser.emailAddress,
          metadata: {
            resource: 'location',
            resourceId: id,
            resourceName: location.name,
            previousData: location.toObject ? location.toObject() : location,
            newData: { ...location, deletedAt: undefined },
          },
        });

        // Log each associated machine being restored
        for (const m of associatedMachines) {
          const machineChanges = [
            {
              field: 'deletedAt',
              oldValue: m.deletedAt ? m.deletedAt.toISOString() : null,
              newValue: null,
            },
          ];
          await logActivity({
            action: 'restore',
            details: `Restored machine "${m.custom?.name || m.serialNumber || m.machineId || m._id}" as part of location restoration`,
            ipAddress: getClientIP(request) || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
            userId: currentUser._id,
            username: currentUser.emailAddress,
            metadata: {
              resource: 'machine',
              resourceId: m._id,
              resourceName: m.custom?.name || m.serialNumber || m.machineId || m._id,
              changes: machineChanges,
              previousData: m,
              newData: { ...m, deletedAt: undefined },
            },
          });
        }
      }

      const duration = Date.now() - startTime;
      logRouteUpdate(
        functionName,
        'PATCH',
        '/api/locations',
        1,
        user,
        duration
      );

      revalidatePath('/locations');
      return NextResponse.json(
        { success: true, message: 'Restored' },
        { status: 200 }
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logRouteError(functionName, 'PATCH', '/api/locations', message, user);
      console.error(`[Locations PATCH API] Error:`, error);
      return NextResponse.json({ success: false, message }, { status: 500 });
    }
  });
}
