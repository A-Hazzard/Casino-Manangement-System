/**
 * Cabinets API Route
 *
 * This route handles CRUD operations for gaming cabinets (machines).
 * It supports:
 * - Fetching cabinets by ID or location
 * - Creating new cabinets with initial baselines
 * - Updating existing cabinets
 * - Soft deleting cabinets
 * - Availability checks (serial, SMIB, custom name)
 * - Location-based access control
 *
 * @module app/api/cabinets/route
 */

import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenceeFilter';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { Machine } from '@/app/api/lib/models/machines';
import { generateMongoId } from '@/lib/utils/id';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { NextRequest, NextResponse } from 'next/server';
import type { GamingMachine } from '@/shared/types';
import type { MachinePayload } from '@/shared/types/machines';
import {
  logRouteFetch,
  logRouteCreate,
  logRouteUpdate,
  logRouteDelete,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';

// Validation helpers
function normalizeSerialNumber(value: string): string {
  return value.toUpperCase();
}

function normalizeSmibBoard(value: string | undefined): string | undefined {
  if (!value) return value;
  return value.toLowerCase();
}

/**
 * GET handler for fetching cabinets
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/cabinets';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async () => {
    try {
      const { searchParams } = request.nextUrl;
      const id = searchParams.get('id');
      const locationId = searchParams.get('locationId');
      const serialNumberToCheck = searchParams.get('checkSerial');
      const smibToCheck = searchParams.get('checkSmib');
      const customNameToCheck = searchParams.get('checkCustomName');
      const excludeId = searchParams.get('excludeId');
      const showArchived = searchParams.get('archived') === 'true';

      if (serialNumberToCheck || smibToCheck || customNameToCheck) {
        const query: Record<
          string,
          | string
          | number
          | boolean
          | object
          | null
          | (string | number | boolean | object | null)[]
        > = {
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2025-01-01') } },
          ],
        };
        if (serialNumberToCheck)
          query.serialNumber = normalizeSerialNumber(serialNumberToCheck);
        else if (smibToCheck)
          query.relayId = normalizeSmibBoard(smibToCheck) || '';
        else if (customNameToCheck)
          query['custom.name'] = customNameToCheck.trim();

        if (excludeId) query._id = { $ne: excludeId };
        const existing = await Machine.findOne(
          query
        ).lean<GamingMachine | null>();
        logRouteFetch(
          functionName,
          'GET',
          '/api/cabinets',
          1,
          user,
          Date.now() - startTime
        );
        return NextResponse.json({ success: true, available: !existing });
      }

      if (!id && !locationId) {
        logRouteError(
          functionName,
          'GET',
          '/api/cabinets',
          'ID or locationId required',
          user
        );
        return NextResponse.json(
          { success: false, error: 'ID or locationId required' },
          { status: 400 }
        );
      }

      if (id) {
        const cabinet = await Machine.findOne({
          _id: id,
        }).lean<GamingMachine | null>();
        if (!cabinet) {
          logRouteError(
            functionName,
            'GET',
            '/api/cabinets',
            `Not found: ${id}`,
            user
          );
          return NextResponse.json(
            { success: false, error: 'Not found' },
            { status: 404 }
          );
        }
        logRouteFetch(
          functionName,
          'GET',
          '/api/cabinets',
          1,
          user,
          Date.now() - startTime
        );
        return NextResponse.json({ success: true, data: cabinet });
      }

      const hasAccess = await checkUserLocationAccess(locationId as string);
      if (!hasAccess) {
        logRouteError(functionName, 'GET', '/api/cabinets', 'Forbidden', user);
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      const query: Record<
        string,
        | string
        | number
        | boolean
        | object
        | null
        | (string | number | boolean | object | null)[]
      > = { gamingLocation: locationId as string };
      if (showArchived) {
        query.deletedAt = { $gte: new Date('2025-01-01') };
      } else {
        query.$or = [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ];
      }
      const cabinets = await Machine.find(query).lean<GamingMachine[]>();

      // Sort: Online first (lastActivity within 3 minutes), then Gross descending
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      const sortedCabinets = [...cabinets].sort((a, b) => {
        const aOnline =
          a.lastActivity && new Date(a.lastActivity) >= threeMinutesAgo;
        const bOnline =
          b.lastActivity && new Date(b.lastActivity) >= threeMinutesAgo;

        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;

        const aGross =
          (a.sasMeters?.drop || 0) - (a.sasMeters?.totalCancelledCredits || 0);
        const bGross =
          (b.sasMeters?.drop || 0) - (b.sasMeters?.totalCancelledCredits || 0);

        return bGross - aGross;
      });

      logRouteFetch(
        functionName,
        'GET',
        '/api/cabinets',
        sortedCabinets.length,
        user,
        Date.now() - startTime
      );
      return NextResponse.json({ success: true, data: sortedCabinets });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch cabinets';
      logRouteError(functionName, 'GET', '/api/cabinets', errorMessage, user);
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  });
}

/**
 * POST handler - Create new cabinet
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/cabinets';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async () => {
    try {
      const data = (await request.json()) as MachinePayload;
      if (!data.gamingLocation && data.locationId)
        data.gamingLocation = data.locationId;

      if (!data.gamingLocation) {
        logRouteError(
          functionName,
          'POST',
          '/api/cabinets',
          'Location required',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Location required' },
          { status: 400 }
        );
      }

      // Deduplication
      const normalizedSerial = normalizeSerialNumber(data.serialNumber);
      const normalizedSmib =
        normalizeSmibBoard(data.smibBoard || data.relayId) ?? '';

      const existing = await Machine.findOne({
        $and: [
          {
            $or: [
              { serialNumber: normalizedSerial },
              ...(normalizedSmib ? [{ relayId: normalizedSmib }] : []),
            ],
          },
          {
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2025-01-01') } },
            ],
          },
        ],
      }).lean<GamingMachine | null>();

      if (existing) {
        logRouteError(
          functionName,
          'POST',
          '/api/cabinets',
          'Cabinet already exists (Serial or SMIB duplicate)',
          user
        );
        return NextResponse.json(
          {
            success: false,
            error: 'Cabinet already exists (Serial or SMIB duplicate)',
          },
          { status: 400 }
        );
      }

      const machineId = await generateMongoId();
      const smibValue = normalizedSmib;

      const newCabinet = new Machine({
        _id: machineId,
        serialNumber: normalizedSerial,
        game: data.game || data.installedGame || '',
        gameType: data.gameType || 'slot',
        isSasMachine: data.isCronosMachine ? false : true,
        gamingLocation: data.gamingLocation,
        assetStatus: data.assetStatus || data.status || 'Active',
        cabinetType: data.cabinetType || '',
        relayId: smibValue,
        smibBoard: smibValue,
        smbId: smibValue,
        collectorDenomination: Number(
          data.collectorDenomination || data.collectionMultiplier || 1
        ),
        gameConfig: {
          accountingDenomination: Number(data.accountingDenomination || 0),
          theoreticalRtp: Number(data.gameConfig?.theoreticalRtp || 0),
          maxBet: String(data.gameConfig?.maxBet || ''),
          payTableId: String(data.gameConfig?.payTableId || ''),
          additionalId: String(data.gameConfig?.additionalId || ''),
          gameOptions: String(data.gameConfig?.gameOptions || ''),
          progressiveGroup: String(data.gameConfig?.progressiveGroup || ''),
        },
        collectionTime:
          data.collectionSettings?.lastCollectionTime || data.collectionTime,
        collectionMeters: {
          metersIn: Number(
            data.collectionSettings?.lastMetersIn ||
              data.collectionMeters?.metersIn ||
              0
          ),
          metersOut: Number(
            data.collectionSettings?.lastMetersOut ||
              data.collectionMeters?.metersOut ||
              0
          ),
        },
        custom: { name: data.custom?.name || normalizedSerial },
        manuf: data.manufacturer || data.manuf || '',
        manufacturer: data.manufacturer || data.manuf || '',
        sasVersion: String(data.sasVersion || data.sas_version || ''),
        currentSession: String(data.currentSession || data.current_session || ''),
        loggedIn: Boolean(data.loggedIn || data.logged_in || false),
        lastActivity:
          data.lastActivity || data.last_activity
            ? new Date((data.lastActivity || data.last_activity) as string)
            : new Date(),
        lastSasMeterAt:
          data.lastSasMeterAt || data.last_sas_meter_at
            ? new Date((data.lastSasMeterAt || data.last_sas_meter_at) as string)
            : new Date(),
        lastBillMeterAt:
          data.lastBillMeterAt || data.last_bill_meter_at
            ? new Date((data.lastBillMeterAt || data.last_bill_meter_at) as string)
            : new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(-1),
        gamingBoard: String(data.gamingBoard || ''),
        machineStatus: String(data.assetStatus || data.status || 'Active'),
        machineType: String(data.cabinetType || ''),
        smibVersion: {
          firmware: String(data.smibVersion?.firmware || ''),
          version: String(data.smibVersion?.version || ''),
        },
        machineMembershipSettings: {
          isPointsAllowed: Boolean(
            data.machineMembershipSettings?.isPointsAllowed ||
              data.machineMembershipSettings?.is_points_allowed ||
              false
          ),
          isFreePlayAllowed: Boolean(
            data.machineMembershipSettings?.isFreePlayAllowed ||
              data.machineMembershipSettings?.is_free_play_allowed ||
              false
          ),
          pointsAwardMethod: String(
            data.machineMembershipSettings?.pointsAwardMethod ||
              data.machineMembershipSettings?.points_award_method ||
              ''
          ),
          freePlayAmount: Number(
            data.machineMembershipSettings?.freePlayAmount ||
              data.machineMembershipSettings?.free_play_amount ||
              0
          ),
          freePlayCreditsTimeout: Number(
            data.machineMembershipSettings?.freePlayCreditsTimeout ||
              data.machineMembershipSettings?.free_play_credits_timeout ||
              0
          ),
        },
        billMeters: {
          dollar1: Number(
            data.billMeters?.dollar1 || data.billMeters?.dollar_1 || 0
          ),
          dollar2: Number(
            data.billMeters?.dollar2 || data.billMeters?.dollar_2 || 0
          ),
          dollar5: Number(
            data.billMeters?.dollar5 || data.billMeters?.dollar_5 || 0
          ),
          dollar10: Number(
            data.billMeters?.dollar10 || data.billMeters?.dollar_10 || 0
          ),
          dollar20: Number(
            data.billMeters?.dollar20 || data.billMeters?.dollar_20 || 0
          ),
          dollar50: Number(
            data.billMeters?.dollar50 || data.billMeters?.dollar_50 || 0
          ),
          dollar100: Number(
            data.billMeters?.dollar100 || data.billMeters?.dollar_100 || 0
          ),
          dollar500: Number(
            data.billMeters?.dollar500 || data.billMeters?.dollar_500 || 0
          ),
          dollar1000: Number(
            data.billMeters?.dollar1000 || data.billMeters?.dollar_1000 || 0
          ),
          dollar2000: Number(
            data.billMeters?.dollar2000 || data.billMeters?.dollar_2000 || 0
          ),
          dollar5000: Number(
            data.billMeters?.dollar5000 || data.billMeters?.dollar_5000 || 0
          ),
          dollarTotal: Number(
            data.billMeters?.dollarTotal || data.billMeters?.dollar_total || 0
          ),
          dollarTotalUnknown: Number(
            data.billMeters?.dollarTotalUnknown ||
              data.billMeters?.dollar_total_unknown ||
              0
          ),
        },
        // Default SAS meters to sync with initial collection meters
        sasMeters: {
          drop: Number(
            data.collectionSettings?.lastMetersIn ||
              data.sasMeters?.drop ||
              0
          ),
          totalCancelledCredits: Number(
            data.collectionSettings?.lastMetersOut ||
              data.sasMeters?.totalCancelledCredits ||
              data.sasMeters?.total_cancelled_credits ||
              0
          ),
          gamesPlayed: Number(
            data.sasMeters?.gamesPlayed || data.sasMeters?.games_played || 0
          ),
          moneyOut: Number(
            data.sasMeters?.moneyOut || data.sasMeters?.money_out || 0
          ),
          slotDoorOpened: Number(
            data.sasMeters?.slotDoorOpened || data.sasMeters?.slot_door_opened || 0
          ),
          powerReset: Number(
            data.sasMeters?.powerReset || data.sasMeters?.power_reset || 0
          ),
          totalHandPaidCancelledCredits: Number(
            data.sasMeters?.totalHandPaidCancelledCredits ||
              data.sasMeters?.total_hand_paid_cancelled_credits ||
              0
          ),
          coinIn: Number(
            data.sasMeters?.coinIn || data.sasMeters?.coin_in || 0
          ),
          coinOut: Number(
            data.sasMeters?.coinOut || data.sasMeters?.coin_out || 0
          ),
          totalWonCredits: Number(
            data.sasMeters?.totalWonCredits || data.sasMeters?.total_won_credits || 0
          ),
          jackpot: Number(
            data.sasMeters?.jackpot || 0
          ),
          currentCredits: Number(
            data.sasMeters?.currentCredits || data.sasMeters?.current_credits || 0
          ),
          gamesWon: Number(
            data.sasMeters?.gamesWon || data.sasMeters?.games_won || 0
          ),
        },
      });

      await newCabinet.save();

      // Fetch location name for better logging
      const locDoc = await (await import('@/app/api/lib/models/gaminglocations')).GamingLocations.findOne({ _id: data.gamingLocation }, 'name').lean<{ name: string }>();
      const locName = locDoc?.name || data.gamingLocation;

      // Log activity
      const currentUser = await getUserFromServer();
      if (currentUser) {
        const changes = Object.entries(newCabinet.toObject())
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

        logActivity({
          action: 'CREATE',
          details: `Created cabinet "${normalizedSerial}" at "${locName}"`,
          userId: currentUser._id as string,
          username: currentUser.emailAddress as string,
          metadata: {
            resource: 'cabinet',
            resourceId: machineId,
            resourceName: normalizedSerial,
            changes,
          },
        }).catch((err: unknown) => console.error('Failed to log create:', err));
      }

      revalidatePath('/cabinets');
      const duration = Date.now() - startTime;
      logRouteCreate(functionName, 'POST', '/api/cabinets', 1, user, duration);
      return NextResponse.json(
        { success: true, data: newCabinet },
        { status: 201 }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create cabinet';
      logRouteError(functionName, 'POST', '/api/cabinets', errorMessage, user);
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT handler for updating cabinets
 * (Legacy support - typically use /api/cabinets/[cabinetId])
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'PUT /api/cabinets';
  const user = extractUserFromRequest(request);

  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');
  if (!id) {
    logRouteError(functionName, 'PUT', '/api/cabinets', 'ID required', user);
    return NextResponse.json(
      { success: false, error: 'ID required' },
      { status: 400 }
    );
  }

  // Forward to new implementation logic or implement briefly here
  // For now, let's just implement the basic update to maintain root PUT support
  return withApiAuth(request, async () => {
    try {
      const data = await request.json();
      const updated = await Machine.findOneAndUpdate(
        { _id: id },
        { $set: { ...data, updatedAt: new Date() } },
        { new: true }
      );
      revalidatePath('/cabinets');
      const duration = Date.now() - startTime;
      logRouteUpdate(functionName, 'PUT', '/api/cabinets', 1, user, duration);
      return NextResponse.json({ success: true, data: updated });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update cabinet';
      logRouteError(functionName, 'PUT', '/api/cabinets', errorMessage, user);
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE handler
 * (Legacy support - typically use /api/cabinets/[cabinetId])
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'DELETE /api/cabinets';
  const user = extractUserFromRequest(request);

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    logRouteError(functionName, 'DELETE', '/api/cabinets', 'ID required', user);
    return NextResponse.json(
      { success: false, error: 'ID required' },
      { status: 400 }
    );
  }

  return withApiAuth(request, async () => {
    try {
      await Machine.findOneAndUpdate(
        { _id: id },
        { $set: { deletedAt: new Date(), updatedAt: new Date() } }
      );
      revalidatePath('/cabinets');
      const duration = Date.now() - startTime;
      logRouteDelete(
        functionName,
        'DELETE',
        '/api/cabinets',
        1,
        user,
        duration
      );
      return NextResponse.json({ success: true, message: 'Deleted' });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete cabinet';
      logRouteError(
        functionName,
        'DELETE',
        '/api/cabinets',
        errorMessage,
        user
      );
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  });
}
