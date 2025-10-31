import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import { MachineAggregationMatchStage } from '@/shared/types/mongo';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../lib/middleware/db';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    // Get parameters from search params
    const locationId = searchParams.get('locationId');
    const searchTerm = searchParams.get('search')?.trim() || '';
    const licensee = searchParams.get('licensee');
    const timePeriod = searchParams.get('timePeriod');

    // Only proceed if timePeriod is provided - no fallback
    if (!timePeriod) {
      return NextResponse.json(
        { error: 'timePeriod parameter is required' },
        { status: 400 }
      );
    }
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // We'll calculate gaming day ranges per location instead of using a single range
    let timePeriodForGamingDay: string;
    let customStartDateForGamingDay: Date | undefined;
    let customEndDateForGamingDay: Date | undefined;

    if (timePeriod === 'Custom' && startDateParam && endDateParam) {
      timePeriodForGamingDay = 'Custom';
      // Parse dates - gaming day offset will be applied by getGamingDayRangeForPeriod
      customStartDateForGamingDay = new Date(startDateParam + 'T00:00:00.000Z');
      customEndDateForGamingDay = new Date(endDateParam + 'T00:00:00.000Z');
    } else {
      timePeriodForGamingDay = timePeriod;
    }

    // We only want "active" locations
    const matchStage: MachineAggregationMatchStage = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    };
    if (locationId) {
      matchStage._id = locationId;
    }

    if (licensee) {
      matchStage['rel.licencee'] = licensee;
    }

    // Get all locations with their gameDayOffset
    const locations = await GamingLocations.find({
      ...matchStage,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    }).lean();

    if (locations.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Calculate gaming day ranges for each location
    // Always use gaming day offset logic (including for custom dates)
    const gamingDayRanges = getGamingDayRangesForLocations(
      locations.map((loc: Record<string, unknown>) => ({
        _id: (loc._id as { toString: () => string }).toString(),
        gameDayOffset: (loc.gameDayOffset as number) || 0,
      })),
      timePeriodForGamingDay,
      customStartDateForGamingDay,
      customEndDateForGamingDay
    );

    // Get all machines for these locations
    const allMachines = [];

    for (const location of locations) {
      const locationIdStr = (
        location._id as { toString: () => string }
      ).toString();
      const gameDayRange = gamingDayRanges.get(locationIdStr);

      if (!gameDayRange) continue;

      // Get machines for this location (without any metrics - we'll add those next)
      const locationMachines = await Machine.find({
        gamingLocation: location._id,
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      }).lean();

      // PERFORMANCE OPTIMIZATION: Batch fetch all metrics for machines in this location
      // Instead of N+1 queries, use a single aggregation pipeline for all machines
      const machineIds = locationMachines.map(machine =>
        (machine._id as { toString: () => string }).toString()
      );

      if (machineIds.length === 0) continue;

      // Build a single aggregation pipeline for all machines in this location
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchPipeline: any[] = [];

      // Match stage with machine IDs and date filtering
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchMatchStage: any = {
        machine: { $in: machineIds },
      };

      // For "All Time", don't apply date filtering
      if (timePeriod !== 'All Time') {
        batchMatchStage.readAt = {
          $gte: gameDayRange.rangeStart,
          $lte: gameDayRange.rangeEnd,
        };
      }

      batchPipeline.push({ $match: batchMatchStage });

      // Group by machine to calculate metrics for each machine
      batchPipeline.push({
        $group: {
          _id: '$machine',
          moneyIn: { $sum: '$movement.drop' },
          moneyOut: { $sum: '$movement.totalCancelledCredits' },
          jackpot: { $sum: '$movement.jackpot' },
          coinIn: { $last: '$coinIn' },
          coinOut: { $last: '$coinOut' },
          gamesPlayed: { $last: '$gamesPlayed' },
          gamesWon: { $last: '$gamesWon' },
          handPaidCancelledCredits: { $last: '$handPaidCancelledCredits' },
          meterCount: { $sum: 1 },
        },
      });

      const batchMetricsAggregation = await Meters.aggregate(batchPipeline);

      // Create a map for O(1) lookup of metrics by machine ID
      const metricsMap = new Map();
      batchMetricsAggregation.forEach(metrics => {
        metricsMap.set(metrics._id, metrics);
      });

      // Build machine objects with their metrics
      for (const machine of locationMachines) {
        const machineId = (
          machine._id as { toString: () => string }
        ).toString();

        const metrics = metricsMap.get(machineId) || {
          moneyIn: 0,
          moneyOut: 0,
          jackpot: 0,
          coinIn: 0,
          coinOut: 0,
          gamesPlayed: 0,
          gamesWon: 0,
          handPaidCancelledCredits: 0,
          meterCount: 0,
        };

        const moneyIn = metrics.moneyIn || 0;
        const moneyOut = metrics.moneyOut || 0;
        const jackpot = metrics.jackpot || 0;
        const coinIn = metrics.coinIn || 0;
        const coinOut = metrics.coinOut || 0;
        const gamesPlayed = metrics.gamesPlayed || 0;
        const gamesWon = metrics.gamesWon || 0;

        const gross = moneyIn - moneyOut;

        // Build machine object with calculated metrics
        const machineData = {
          _id: machineId,
          locationId: locationIdStr,
          locationName: (location.name as string) || '(No Location)',
          assetNumber: machine.serialNumber || '',
          serialNumber: machine.serialNumber || '',
          smbId: machine.relayId || '',
          relayId: machine.relayId || '',
          installedGame: machine.game || '',
          game: machine.game || '',
          manufacturer:
            machine.manufacturer || machine.manuf || 'Unknown Manufacturer',
          status: machine.assetStatus || '',
          assetStatus: machine.assetStatus || '',
          cabinetType: machine.cabinetType || '',
          accountingDenomination:
            machine.gameConfig?.accountingDenomination || '1',
          collectionMultiplier: '1',
          isCronosMachine: false,
          lastOnline: machine.lastActivity,
          lastActivity: machine.lastActivity,
          createdAt: machine.createdAt,
          timePeriod: timePeriod,
          // Financial metrics from Meters collection (same as individual API)
          moneyIn,
          moneyOut,
          cancelledCredits: moneyOut,
          jackpot,
          gross,
          coinIn,
          coinOut,
          gamesPlayed,
          gamesWon,
        };

        allMachines.push(machineData);
      }
    }

    // Apply search filter if provided (search by serial number, relay ID, smib ID, or machine _id)
    let filteredMachines = allMachines;
    if (searchTerm) {
      filteredMachines = allMachines.filter(
        machine =>
          machine.serialNumber
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          machine.relayId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          machine.smbId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          machine._id === searchTerm // Exact match for _id
      );
    }

    return NextResponse.json({ success: true, data: filteredMachines });
  } catch (error) {
    console.error('Error in machineAggregation route:', error);
    return NextResponse.json(
      { success: false, error: 'Aggregation failed', details: String(error) },
      { status: 500 }
    );
  }
}
