import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import {
  getUserAccessibleLicenceesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenceeFilter';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { Countries } from '@/app/api/lib/models/countries';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { UpdateLocationData } from '@/lib/types/location';
import type { LocationDocument } from '@/lib/types/common';
import { generateMongoId } from '@/lib/utils/id';
import { getClientIP } from '@/lib/utils/ipAddress';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '../lib/services/loggerService';

/**
 * Main GET handler for fetching locations
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    const startTime = Date.now();
    const context = apiLogger.createContext(request, '/api/locations');
    apiLogger.startLogging();

    try {
      const { searchParams } = new URL(request.url);
      const licencee = searchParams.get('licencee');
      const minimal = searchParams.get('minimal') === '1';
      const forceAll =
        searchParams.get('forceAll') === 'true' ||
        searchParams.get('forceAll') === '1';
      const showArchived = searchParams.get('archived') === 'true';

      const userAccessibleLicencees =
        await getUserAccessibleLicenceesFromToken();
      const userLocationPermissions =
        (userPayload as { assignedLocations?: string[] })?.assignedLocations ||
        [];

      const deletionFilter = showArchived
        ? { deletedAt: { $gte: new Date('2025-01-01') } }
        : {
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2025-01-01') } },
            ],
          };

      const normalizedRoles = userRoles.map(r => String(r).toLowerCase());
      const isAdminOrDev =
        normalizedRoles.includes('admin') ||
        normalizedRoles.includes('developer');

      const licenceeFilterToUse =
        forceAll && isAdminOrDev
          ? undefined
          : licencee && licencee !== 'all'
            ? licencee
            : undefined;

      const allowedLocationIds = await getUserLocationFilter(
        userAccessibleLicencees,
        licenceeFilterToUse,
        userLocationPermissions,
        userRoles
      );

      const queryFilter: Record<string, unknown> = { ...deletionFilter };

      if (allowedLocationIds !== 'all') {
        if (allowedLocationIds.length === 0) {
          queryFilter._id = null;
        } else {
          queryFilter._id = { $in: allowedLocationIds };
          if (licenceeFilterToUse && licenceeFilterToUse !== 'all') {
            let resId = licenceeFilterToUse;
            try {
              const lDoc = await Licencee.findOne(
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
              if (lDoc && !Array.isArray(lDoc)) resId = String(lDoc._id);
            } catch {}
            const andArray =
              (queryFilter.$and as Array<Record<string, unknown>>) || [];
            andArray.push({ $or: [{ 'rel.licencee': resId }] });
            queryFilter.$and = andArray;
          }
        }
      } else if (licenceeFilterToUse && licenceeFilterToUse !== 'all') {
        let resId = licenceeFilterToUse;
        try {
          const lDoc = await Licencee.findOne(
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
          if (lDoc && !Array.isArray(lDoc)) resId = String(lDoc._id);
        } catch {}
        const andArray =
          (queryFilter.$and as Array<Record<string, unknown>>) || [];
        andArray.push({ $or: [{ 'rel.licencee': resId }] });
        queryFilter.$and = andArray;
      }

      const projection = minimal
        ? { _id: 1, name: 1, geoCoords: 1, 'rel.licencee': 1 }
        : undefined;
      const locationsRaw = await GamingLocations.find(queryFilter, projection)
        .sort({ name: 1 })
        .lean();
      const locations = locationsRaw as unknown as LocationDocument[];

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
 * Main POST handler for creating a new location
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ user: currentUser }) => {
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
 * Main PUT handler for updating an existing location
 */
export async function PUT(request: NextRequest) {
  return withApiAuth(request, async ({ user: currentUser }) => {
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
      if (locationMembershipSettings)
        updateData.locationMembershipSettings = locationMembershipSettings;

      try {
        await GamingLocations.collection.dropIndex('name_1');
      } catch {}
      await GamingLocations.updateOne(
        { _id: location._id },
        { $set: updateData }
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
 * Main DELETE handler
 */
export async function DELETE(request: NextRequest) {
  return withApiAuth(request, async ({ user: currentUser, userRoles }) => {
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
      const isDev = userRoles.map(r => r.toLowerCase()).includes('developer');

      if (hardDelete && isDev) {
        await GamingLocations.deleteOne({ _id: id });
      } else {
        await GamingLocations.findOneAndUpdate(
          { _id: id },
          { deletedAt: new Date() }
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
 * PATCH handler for restore
 */
export async function PATCH(request: NextRequest) {
  return withApiAuth(request, async ({ user: currentUser }) => {
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
