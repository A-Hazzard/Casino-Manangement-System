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
        normalizedRoles.includes('developer') ||
        normalizedRoles.includes('owner');
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

      const reviewerMult = (userPayload as { multiplier?: number | null })?.multiplier ?? null;
      const reviewerScale = reviewerMult !== null ? 1 - reviewerMult : 1;

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

      let filteredMachines = machines;
      if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        filteredMachines = machines.filter(
          machine =>
            machine.serialNumber?.toLowerCase().includes(lowerSearchTerm) ||
            machine.relayId?.toLowerCase().includes(lowerSearchTerm) ||
            machine.smibBoard?.toLowerCase().includes(lowerSearchTerm) ||
            (machine.custom as unknown as { name?: string })?.name
              ?.toLowerCase()
              .includes(lowerSearchTerm) ||
            String(machine._id).toLowerCase().includes(lowerSearchTerm)
        );
      }

      const filteredMachineIds = filteredMachines.map(machine => String(machine._id));
      const rawMachineMetrics: Array<{
        _id: string;
        moneyIn: number;
        moneyOut: number;
        jackpot: number;
        gamesPlayed: number;
        gamesWon: number;
        gross: number;
      }> = [];
      const metricsCursor = Meters.aggregate([
        {
          $match: {
            $and: [
              { location: locationId },
              { machine: { $in: filteredMachineIds } },
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
      for await (const doc of metricsCursor) rawMachineMetrics.push(doc);

      const machineMetricsMap = new Map(rawMachineMetrics.map(metric => [String(metric._id), metric]));
      const machinesWithMeters = filteredMachines.map(machine => {
        const currentMachineId = String(machine._id);
        const machineMeters = machineMetricsMap.get(currentMachineId) || {
          moneyIn: 0,
          moneyOut: 0,
          gross: 0,
          jackpot: 0,
          gamesPlayed: 0,
          gamesWon: 0,
        };
        const serialNumber = (machine.serialNumber as string)?.trim() || '';
        const customName =
          (
            (machine.custom as unknown as { name?: string })?.name as string
          )?.trim() || '';
        const assetNumber = serialNumber || customName || '';
        const lastActivityDate = machine.lastActivity as Date | null;
        const isOnline = locationCheck.aceEnabled || (lastActivityDate && new Date(lastActivityDate) > new Date(Date.now() - 3 * 60 * 1000));
        const rawMoneyIn = (Number(machineMeters.moneyIn) || 0) * reviewerScale;
        const rawMoneyOut = (Number(machineMeters.moneyOut) || 0) * reviewerScale;
        const rawJackpot = (Number(machineMeters.jackpot) || 0) * reviewerScale;
        const adjustedMoneyOut = rawMoneyOut + (includeJackpotSetting ? rawJackpot : 0);
        const grossProfit = rawMoneyIn - adjustedMoneyOut;

        return {
          _id: currentMachineId,
          locationId,
          locationName: locationCheck.name || 'Location',
          assetNumber: assetNumber,
          serialNumber: assetNumber,
          custom: machine.custom || {},
          relayId: (machine.relayId as string) || '',
          smibBoard: (machine.smibBoard as string) || '',
          smbId: (machine.smibBoard as string) || (machine.relayId as string) || '',
          lastActivity: lastActivityDate,
          lastOnline: lastActivityDate,
          game: (machine.game as string) || '',
          installedGame: (machine.game as string) || '',
          manufacturer:
            (machine.manufacturer as string) || (machine.manuf as string) || 'Unknown',
          cabinetType: (machine.cabinetType as string) || '',
          status: (machine.assetStatus as string) || '',
          gameType: (machine.gameType as string) || '',
          isCronosMachine: !!machine.isCronosMachine,
          moneyIn: rawMoneyIn,
          moneyOut: adjustedMoneyOut,
          gross: grossProfit,
          jackpot: rawJackpot,
          gamesPlayed: Number(machineMeters.gamesPlayed) || 0,
          gamesWon: Number(machineMeters.gamesWon) || 0,
          cancelledCredits: adjustedMoneyOut,
          sasMeters: machine.sasMeters || null,
          online: !!isOnline,
          includeJackpot: includeJackpotSetting,
          deletedAt: (machine as { deletedAt?: Date }).deletedAt || null,
        };
      });

      if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        machinesWithMeters.sort((a, b) =>
          a.serialNumber.toLowerCase().startsWith(lowerSearchTerm) &&
          !b.serialNumber.toLowerCase().startsWith(lowerSearchTerm)
            ? -1
            : 0
        );
      }

      const total = machinesWithMeters.length;
      const paginated = limit
        ? machinesWithMeters.slice(skip, skip + limit)
        : machinesWithMeters;

      const transformed: TransformedCabinet[] = paginated.map(transformedMachine => {
        const currentGross = Number(transformedMachine.gross) || 0;
        const currentJackpot = Number(transformedMachine.jackpot) || 0;
        const base: TransformedCabinet = {
          ...transformedMachine,
          netGross: transformedMachine.includeJackpot ? currentGross - currentJackpot : undefined,
          metersData: null,
        } as unknown as TransformedCabinet;

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
