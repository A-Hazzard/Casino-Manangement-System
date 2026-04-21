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
import { calculateChanges, logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserAccessibleLicenceesFromToken } from '@/app/api/lib/helpers/licenceeFilter';
import { buildLocationQueryFilter } from '@/app/api/lib/helpers/locations';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Countries } from '@/app/api/lib/models/countries';
import type { UpdateLocationData } from '@/shared/types/entities';
import type { LocationDocument } from '@/shared/types/models';
import { generateMongoId } from '@/lib/utils/id';
import { getClientIP } from '@/lib/utils/ipAddress';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '../lib/services/loggerService';

/**
 * GET /api/locations
 *
 * Returns the list of gaming locations accessible to the current user.
 * Used by the Locations page list view, dashboard licencee selector, and map pin rendering.
 *
 * Query params:
 * @param licencee      {string}  Optional. Filter results to locations belonging to this licencee ID.
 *                                When omitted, all licencees the user can access are included.
 * @param minimal       {'1'}     Optional. When '1', returns a lightweight projection
 *                                (id, name, geoCoords, licencee ref only). Used by the dashboard
 *                                map and dropdowns.
 * @param compact       {'1'}     Optional. When '1', returns a legacy-compatible lightweight array
 *                                (id, name, licenceeId). Used for fast dropdowns and profile settings.
 * @param forceAll      {'true'|'1'} Optional. Bypasses the per-location access filter so all
 *                                locations under the accessible licencees are returned. Admin/dev
 *                                only — non-admins receive 403 if this filter would expose
 *                                locations outside their assignedLocations.
 * @param archived      {'true'}  Optional. When 'true', includes soft-deleted (archived) locations
 *                                in the results. Used by the Archived Locations view.
 *
 * Flow:
 * 1. Parse query params
 * 2. Resolve user accessible licencees and location permissions
 * 3. Build query filter via helper
 * 4. Fetch locations and enrich with licencee jackpot flag
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    const startTime = Date.now();
    const context = apiLogger.createContext(request, '/api/locations');
    apiLogger.startLogging();

    try {
      const { searchParams } = new URL(request.url);
      const licencee = searchParams.get('licencee');
      const ids = searchParams.get('ids');
      const forceAll = searchParams.get('forceAll') === 'true' || searchParams.get('forceAll') === '1';
      const showArchived = searchParams.get('archived') === 'true' || searchParams.get('includeDeleted') === 'true';

      const userAccessibleLicencees = await getUserAccessibleLicenceesFromToken();
      const userLocationPermissions =
        (userPayload as { assignedLocations?: string[] })?.assignedLocations || [];

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
        const idArray = ids.split(',').map(id => id.trim()).filter(id => id);
        if (idArray.length > 0) {
          queryFilter._id = { $in: idArray };
        }
      }

      const locationsRaw = await GamingLocations.find(queryFilter)
        .sort({ name: 1 })
        .lean();
      const locations = locationsRaw as unknown as LocationDocument[];

      // Normal rich response
      const allLicenceeIds = Array.from(
        new Set(
          locations
            .map(loc => {
              const l = loc.rel?.licencee;
              return Array.isArray(l) ? l[0] : l;
            })
            .filter(Boolean)
        )
      );

      const licenceeDocs = await Licencee.find(
        { _id: { $in: allLicenceeIds } },
        { includeJackpot: 1 }
      ).lean();
      const jackpotMap = new Map(
        licenceeDocs.map(l => [String(l._id), !!l.includeJackpot])
      );

      const results = locations.map(loc => {
        const lRaw = loc.rel?.licencee;
        const lId = Array.isArray(lRaw)
          ? lRaw[0]
            ? String(lRaw[0])
            : null
          : lRaw
            ? String(lRaw)
            : null;
        return {
          ...loc,
          licenceeId: lId,
          includeJackpot: lId ? jackpotMap.get(lId) || false : false,
        };
      });

      const duration = Date.now() - startTime;
      apiLogger.logSuccess(
        context,
        `Fetched ${locations.length} in ${duration}ms`
      );
      return NextResponse.json({ locations: results }, { status: 200 });
    } catch (error) {
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
 * @param name                      {string}   Required. Display name of the location.
 * @param country                   {string}   Optional. Country ID (must exist in Countries collection).
 * @param address                   {object}   Optional. `{ street, city }` — physical address for display.
 * @param rel.licencee              {string[]} Optional. Licencee IDs this location belongs to.
 *                                             Controls which licencee users can see this location.
 * @param profitShare               {number}   Optional. Percentage profit split for this location (default 50).
 * @param gameDayOffset             {number}   Optional. Hour at which the gaming day starts (default 8 = 8 AM Trinidad time).
 *                                             Used by all financial metric queries for this location.
 * @param isLocalServer             {boolean}  Optional. Whether this location runs a local SMIB server.
 * @param geoCoords                 {object}   Optional. `{ latitude, longitude }` — used for map pin placement.
 * @param billValidatorOptions      {object}   Optional. Per-denomination bill validator enable flags
 *                                             (denom1–denom10000). Controls which bill denominations
 *                                             are accepted at this location.
 * @param membershipEnabled         {boolean}  Optional. Enables the player membership/loyalty system.
 * @param aceEnabled                {boolean}  Optional. Enables ACE (always-online) mode — machines
 *                                             at this location are treated as always online.
 * @param locationMembershipSettings {object}  Optional. Detailed membership config: points ratio,
 *                                             free play amounts, game type restrictions, etc.
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ user: currentUser, isAdminOrDev }) => {
    if (!isAdminOrDev) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
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
      } = body;

      if (!name)
        return NextResponse.json(
          { success: false, message: 'Name required' },
          { status: 400 }
        );

      if (country) {
        const countryDoc = await Countries.findOne({ _id: country }).lean();
        if (!countryDoc)
          return NextResponse.json(
            { success: false, message: 'Invalid country' },
            { status: 400 }
          );
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
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(-1),
      });

      try {
        await GamingLocations.collection.dropIndex('name_1');
      } catch {}
      await newLocation.save();

      if (currentUser && currentUser.emailAddress) {
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
          },
        });
      }

      revalidatePath('/locations');
      return NextResponse.json(
        { success: true, location: newLocation },
        { status: 201 }
      );
    } catch (error: unknown) {
      console.error(`[Locations POST API] Error:`, error);
      const message = error instanceof Error ? error.message : 'Unknown error';
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
 * @param locationName              {string}   Required. The `_id` of the location to update (field name is
 *                                             `locationName` for legacy reasons — it is the location ID).
 * @param name                      {string}   Optional. New display name.
 * @param country                   {string}   Optional. New country ID.
 * @param address                   {object}   Optional. `{ street, city }` — updated physical address.
 * @param rel.licencee              {string[]} Optional. Updated licencee IDs. Changing this affects
 *                                             which users can see this location.
 * @param profitShare               {number}   Optional. Updated profit split percentage.
 * @param gameDayOffset             {number}   Optional. Updated gaming day start hour. Affects how
 *                                             "Today" and period queries are calculated for this location.
 * @param isLocalServer             {boolean}  Optional. Updated local server flag.
 * @param geoCoords                 {object}   Optional. Updated `{ latitude, longitude }` map coordinates.
 * @param billValidatorOptions      {object}   Optional. Updated per-denomination bill validator flags.
 * @param membershipEnabled         {boolean}  Optional. Toggle player membership system on/off.
 * @param aceEnabled                {boolean}  Optional. Toggle ACE always-online mode on/off.
 * @param locationMembershipSettings {object}  Optional. Updated membership configuration.
 */
export async function PUT(request: NextRequest) {
  return withApiAuth(request, async ({ user: currentUser, isAdminOrDev }) => {
    if (!isAdminOrDev) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
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
      } = body;

      if (!locationName)
        return NextResponse.json(
          { success: false, message: 'ID required' },
          { status: 400 }
        );

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
        };
      }
      if (billValidatorOptions) {
        updateData.billValidatorOptions = Object.fromEntries(
          Object.entries(billValidatorOptions).map(([k, v]) => [k, Boolean(v)])
        ) as Record<string, boolean>;
      }
      if (membershipEnabled !== undefined)
        updateData.membershipEnabled = Boolean(membershipEnabled);
      if (aceEnabled !== undefined)
        updateData.aceEnabled = Boolean(aceEnabled);
      if (locationMembershipSettings)
        updateData.locationMembershipSettings = locationMembershipSettings;

      try {
        await GamingLocations.collection.dropIndex('name_1');
      } catch {}
      await GamingLocations.updateOne(
        { _id: location._id },
        { $set: updateData },
        { strict: false }
      );

      console.log(`[Locations PUT] Updated location "${location.name}" (${location._id})`);
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
      console.error(`[Locations PUT API] Error:`, error);
      const message = error instanceof Error ? error.message : 'Unknown error';
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
 * @param id         {string}  Required. The `_id` of the location to delete.
 * @param hardDelete {'true'}  Optional. When 'true', permanently removes the location and all its
 *                             machines from the database. Only available to developer/owner roles.
 *                             Without this flag, a soft-delete (sets `deletedAt`) is performed,
 *                             which moves the location to the Archived view instead of deleting it.
 */
export async function DELETE(request: NextRequest) {
  return withApiAuth(request, async ({ user: currentUser, userRoles, isAdminOrDev }) => {
    if (!isAdminOrDev) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id)
        return NextResponse.json(
          { success: false, message: 'ID required' },
          { status: 400 }
        );

      const locationToDelete = await GamingLocations.findOne({ _id: id });
      if (!locationToDelete)
        return NextResponse.json(
          { success: false, message: 'Not found' },
          { status: 404 }
        );

      const hardDelete = searchParams.get('hardDelete') === 'true';
      const isDev = userRoles
        .map(r => r.toLowerCase())
        .some(r => r === 'developer' || r === 'owner');

      const archiveTimestamp = new Date();

      if (hardDelete && isDev) {
        await GamingLocations.deleteOne({ _id: id });
        await Machine.deleteMany({ gamingLocation: id });
      } else {
        await GamingLocations.findOneAndUpdate(
          { _id: id },
          { deletedAt: archiveTimestamp }
        );
        // Archive all machines belonging to this location
        await Machine.updateMany(
          { gamingLocation: id },
          { deletedAt: archiveTimestamp }
        );
      }

      if (currentUser && currentUser.emailAddress) {
        await logActivity({
          action: 'DELETE',
          details: `Deleted location "${locationToDelete.name}"`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          userId: currentUser._id,
          username: currentUser.emailAddress,
          metadata: {
            resource: 'location',
            resourceId: id,
            resourceName: locationToDelete.name,
          },
        });
      }

      revalidatePath('/locations');
      return NextResponse.json(
        { success: true, message: 'Deleted' },
        { status: 200 }
      );
    } catch (error: unknown) {
      console.error(`[Locations DELETE API] Error:`, error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ success: false, message }, { status: 500 });
    }
  });
}

/**
 * PATCH /api/locations
 *
 * Restores a soft-deleted (archived) location and all its machines.
 * Restricted to admin/developer roles. Triggered by the "Restore" button in the Archived Locations view.
 *
 * Body fields:
 * @param id     {string}    Required. The `_id` of the location to restore.
 * @param action {'restore'} Required. Must be exactly `'restore'` — guards against accidental partial updates.
 */
export async function PATCH(request: NextRequest) {
  return withApiAuth(request, async ({ user: currentUser, isAdminOrDev }) => {
    if (!isAdminOrDev) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }
    try {
      const { id, action } = await request.json();

      if (!id || action !== 'restore')
        return NextResponse.json(
          { success: false, message: 'Invalid' },
          { status: 400 }
        );

      const location = await GamingLocations.findOne({ _id: id });
      if (!location)
        return NextResponse.json(
          { success: false, message: 'Not found' },
          { status: 404 }
        );

      await GamingLocations.findOneAndUpdate(
        { _id: id },
        { $unset: { deletedAt: 1 } }
      );
      // Restore all machines belonging to this location
      await Machine.updateMany(
        { gamingLocation: id },
        { $unset: { deletedAt: 1 } }
      );

      if (currentUser && currentUser.emailAddress) {
        await logActivity({
          action: 'RESTORE',
          details: `Restored location "${location.name}"`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          userId: currentUser._id,
          username: currentUser.emailAddress,
          metadata: {
            resource: 'location',
            resourceId: id,
            resourceName: location.name,
          },
        });
      }

      revalidatePath('/locations');
      return NextResponse.json(
        { success: true, message: 'Restored' },
        { status: 200 }
      );
    } catch (error: unknown) {
      console.error(`[Locations PATCH API] Error:`, error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ success: false, message }, { status: 500 });
    }
  });
}
