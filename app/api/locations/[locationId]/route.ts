/**
 * Location Detail API Route
 */

import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenceeFilter';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { TimePeriod } from '@/app/api/lib/types';
import { LocationDocument, TransformedCabinet } from '@/lib/types/common';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler
 */
export async function GET(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locationId = pathname.split('/').pop();

  if (!locationId) {
    return NextResponse.json({ success: false, message: 'Location ID required' }, { status: 400 });
  }

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {

    try {
      const { searchParams } = new URL(request.url);
      const nameOnly = searchParams.get('nameOnly') === 'true';
      const basicInfo = searchParams.get('basicInfo') === 'true';

      if (nameOnly) {
        const location = (await GamingLocations.findOne(
          { _id: locationId },
          { _id: 1, name: 1, 'rel.licencee': 1 }
        ).lean()) as unknown as Pick<
          LocationDocument,
          '_id' | 'name' | 'rel'
        > | null;
        if (!location)
          return NextResponse.json(
            { success: false, message: 'Not found' },
            { status: 404 }
          );

        const licIdRaw = location.rel?.licencee || location.rel?.licencee;
        const licIdArr = licIdRaw
          ? Array.isArray(licIdRaw)
            ? licIdRaw
            : [licIdRaw]
          : [];
        let includeJackpot = false;
        if (licIdArr.length > 0) {
          const licDoc = await Licencee.findOne(
            { _id: licIdArr[0] },
            { includeJackpot: 1 }
          ).lean();
          includeJackpot = Boolean(
            (licDoc as unknown as { includeJackpot?: boolean })?.includeJackpot
          );
        }

        return NextResponse.json({
          success: true,
          location: {
            _id: location._id,
            name: location.name,
            licenceeId: licIdArr,
            includeJackpot,
          },
        });
      }

      const normalizedRoles = userRoles.map(r => String(r).toLowerCase());
      const isAdmin =
        normalizedRoles.includes('admin') ||
        normalizedRoles.includes('developer');
      const reviewerMultRaw =
        normalizedRoles.includes('reviewer') &&
        (userPayload as unknown as { multiplier?: number | null })
          ?.multiplier != null
          ? (userPayload as unknown as { multiplier?: number | null })
              .multiplier
          : null;
      const reviewerMult = reviewerMultRaw !== null ? (1 - reviewerMultRaw!) : null;

      if (!isAdmin && !(await checkUserLocationAccess(locationId))) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 403 }
        );
      }

      const locationCheck = (await GamingLocations.findOne({
        _id: locationId,
      }).lean()) as unknown as LocationDocument | null;
      if (!locationCheck)
        return NextResponse.json(
          { success: false, message: 'Not found' },
          { status: 404 }
        );

      if (basicInfo || !searchParams.toString().length) {
        const licId = locationCheck.rel?.licencee;
        const firstLicId = Array.isArray(licId) ? licId[0] : licId;
        let includeJackpot = false;
        if (firstLicId) {
          const licDoc = await Licencee.findOne(
            { _id: firstLicId },
            { includeJackpot: 1 }
          ).lean();
          includeJackpot = Boolean(
            (licDoc as unknown as { includeJackpot?: boolean })?.includeJackpot
          );
        }
        return NextResponse.json({
          success: true,
          location: { ...locationCheck, includeJackpot },
        });
      }

      const licencee = searchParams.get('licencee');
      const searchTerm = searchParams.get('search');
      const timePeriod = searchParams.get('timePeriod') as TimePeriod;
      const customStart = searchParams.get('startDate');
      const customEnd = searchParams.get('endDate');
      const onlineStatus = searchParams.get('onlineStatus') || 'all';
      const limitParam = searchParams.get('limit');
      const limit = limitParam ? parseInt(limitParam) : undefined;
      const page = parseInt(searchParams.get('page') || '1');
      const skip = limit ? (page - 1) * limit : 0;

      if (!timePeriod)
        return NextResponse.json(
          { error: 'timePeriod required' },
          { status: 400 }
        );

      if (!isAdmin && licencee && licencee !== 'all') {
        const locLicId = locationCheck.rel?.licencee;
        if (
          locLicId !== licencee &&
          (!Array.isArray(locLicId) || !locLicId.includes(licencee))
        ) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }

      const gameDayOffset = locationCheck.gameDayOffset ?? 8;
      const gdr = getGamingDayRangeForPeriod(
        timePeriod,
        gameDayOffset,
        customStart ? new Date(customStart) : undefined,
        customEnd ? new Date(customEnd) : undefined
      );

      const locLicId = locationCheck.rel?.licencee;
      let includeJackpotSetting = false;
      if (locLicId) {
        const licDoc = await Licencee.findOne(
          { _id: Array.isArray(locLicId) ? locLicId[0] : locLicId },
          { includeJackpot: 1 }
        ).lean();
        includeJackpotSetting = !!(
          licDoc as unknown as { includeJackpot?: boolean }
        )?.includeJackpot;
      }

      const includeArchived = searchParams.get('includeArchived') === 'true';
      const mMatch: Record<string, unknown> = {
        $and: [
          { gamingLocation: locationId },
        ] as unknown[],
      };

      if (!includeArchived) {
        // Active: null OR < 2025
        (mMatch.$and as unknown[]).push({
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2025-01-01') } },
          ],
        });
      } else {
        // Archived View: Show ALL machines
        // (If there's a third state to hide, we'd add another filter here)
        (mMatch.$and as unknown[]).push({
          $or: [
            { deletedAt: null },
            { deletedAt: { $exists: true } },
          ],
        });
      }

      if (onlineStatus !== 'all') {
        const threeMin = new Date(Date.now() - 3 * 60 * 1000);
        if (locationCheck.aceEnabled) {
          if (onlineStatus === 'online') {
            // all active machines are online
          } else if (onlineStatus === 'offline' || onlineStatus === 'never-online') {
            (mMatch.$and as unknown[]).push({ _id: null });
          }
        } else {
          if (onlineStatus === 'online') mMatch.lastActivity = { $gte: threeMin };
          else if (onlineStatus === 'offline')
            (mMatch.$and as unknown[]).push({
              $or: [
                { lastActivity: { $lt: threeMin } },
                { lastActivity: { $exists: false } },
                { lastActivity: null },
              ],
            });
          else if (onlineStatus === 'never-online')
            (mMatch.$and as unknown[]).push({
              $or: [{ lastActivity: { $exists: false } }, { lastActivity: null }],
            });
        }
      }

      const machines = await Machine.find(mMatch, {
        _id: 1,
        serialNumber: 1,
        relayId: 1,
        smibBoard: 1,
        'custom.name': 1,
        lastActivity: 1,
        game: 1,
        manufacturer: 1,
        manuf: 1,
        cabinetType: 1,
        gameType: 1,
        isCronosMachine: 1,
        sasMeters: 1,
        assetStatus: 1,
        deletedAt: 1,
      }).lean();
      if (!machines.length)
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit: limit || 0,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        });

      let filtered = machines;
      if (searchTerm) {
        const st = searchTerm.toLowerCase();
        filtered = machines.filter(
          m =>
            m.serialNumber?.toLowerCase().includes(st) ||
            m.relayId?.toLowerCase().includes(st) ||
            m.smibBoard?.toLowerCase().includes(st) ||
            (m.custom as unknown as { name?: string })?.name
              ?.toLowerCase()
              .includes(st) ||
            String(m._id).toLowerCase().includes(st)
        );
      }

      const mIds = filtered.map(m => String(m._id));
      const mMetrics: Array<{
        _id: string;
        moneyIn: number;
        moneyOut: number;
        jackpot: number;
        gamesPlayed: number;
        gamesWon: number;
        gross: number;
      }> = [];
      const mCursor = Meters.aggregate([
        {
          $match: {
            $and: [
              { location: locationId },
              { machine: { $in: mIds } },
              { readAt: { $gte: gdr.rangeStart, $lte: gdr.rangeEnd } },
            ],
          },
        },
        {
          $group: {
            _id: '$machine',
            moneyIn: { $sum: '$movement.drop' },
            moneyOut: { $sum: '$movement.totalCancelledCredits' },
            jackpot: { $sum: '$movement.jackpot' },
            gamesPlayed: { $sum: '$movement.gamesPlayed' },
            gamesWon: { $sum: '$movement.gamesWon' },
          },
        },
        { $addFields: { gross: { $subtract: ['$moneyIn', '$moneyOut'] } } },
      ]).cursor({ batchSize: 1000 });
      for await (const doc of mCursor) mMetrics.push(doc);

      const mMaps = new Map(mMetrics.map(m => [String(m._id), m]));
      const cabWithMeters = filtered.map(m => {
        const mId = String(m._id);
        const me = mMaps.get(mId) || {
          moneyIn: 0,
          moneyOut: 0,
          gross: 0,
          jackpot: 0,
          gamesPlayed: 0,
          gamesWon: 0,
        };
        const sn = (m.serialNumber as string)?.trim() || '';
        const cn =
          (
            (m.custom as unknown as { name?: string })?.name as string
          )?.trim() || '';
        const an = sn || cn || '';
        const la = m.lastActivity as Date | null;
        const on = locationCheck.aceEnabled || (la && new Date(la) > new Date(Date.now() - 3 * 60 * 1000));
        const mi = Number(me.moneyIn) || 0;
        const rmo = Number(me.moneyOut) || 0;
        const jp = Number(me.jackpot) || 0;
        const mo = rmo + (includeJackpotSetting ? jp : 0);
        const gr = mi - mo;

        return {
          _id: mId,
          locationId,
          locationName: locationCheck.name || 'Location',
          assetNumber: an,
          serialNumber: an,
          custom: m.custom || {},
          relayId: (m.relayId as string) || '',
          smibBoard: (m.smibBoard as string) || '',
          smbId: (m.smibBoard as string) || (m.relayId as string) || '',
          lastActivity: la,
          lastOnline: la,
          game: (m.game as string) || '',
          installedGame: (m.game as string) || '',
          manufacturer:
            (m.manufacturer as string) || (m.manuf as string) || 'Unknown',
          cabinetType: (m.cabinetType as string) || '',
          status: (m.assetStatus as string) || '',
          gameType: (m.gameType as string) || '',
          isCronosMachine: !!m.isCronosMachine,
          moneyIn: mi,
          moneyOut: mo,
          gross: gr,
          jackpot: jp,
          gamesPlayed: Number(me.gamesPlayed) || 0,
          gamesWon: Number(me.gamesWon) || 0,
          cancelledCredits: mo,
          sasMeters: m.sasMeters || null,
          online: !!on,
          includeJackpot: includeJackpotSetting,
          deletedAt: (m as { deletedAt?: Date }).deletedAt || null,
        };
      });

      if (searchTerm) {

        const st = searchTerm.toLowerCase();
        cabWithMeters.sort((a, b) =>
          a.serialNumber.toLowerCase().startsWith(st) &&
          !b.serialNumber.toLowerCase().startsWith(st)
            ? -1
            : 0
        );
      }

      const total = cabWithMeters.length;
      const paginated = limit
        ? cabWithMeters.slice(skip, skip + limit)
        : cabWithMeters;

      const transformed: TransformedCabinet[] = paginated.map(c => {
        const mi = Number(c.moneyIn) || 0;
        const mo = Number(c.moneyOut) || 0;
        const jp = Number(c.jackpot) || 0;
        const gr = Number(c.gross) || 0;
        const base: TransformedCabinet = {
          ...c,
          netGross: c.includeJackpot ? gr - jp : undefined,
          metersData: null,
        } as unknown as TransformedCabinet;

        const mult = reviewerMult ?? null;
        if (mult !== null) {
          return {
            ...base,
            moneyIn: mi * mult,
            moneyOut: mo * mult,
            jackpot: jp * mult,
            gross: (mi - mo) * mult,
            netGross: c.includeJackpot ? (mi - mo - jp) * mult : undefined,
            cancelledCredits: mo * mult,
            _raw: { moneyIn: mi, moneyOut: mo, jackpot: jp, gross: gr },
            _reviewerMultiplier: mult,
          };
        }
        return base;
      });

      const totalPages = limit ? Math.ceil(total / limit) : 1;
      return NextResponse.json({
        success: true,
        data: transformed,
        pagination: {
          page,
          limit: limit || total,
          total,
          totalPages,
          hasNextPage: limit ? page < totalPages : false,
          hasPrevPage: page > 1,
        },
      });
    } catch (error: unknown) {
      console.error(`[Location Detail API] Error:`, error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
