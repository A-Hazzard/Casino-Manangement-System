import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import { getUserAccessibleLicenseesFromToken } from '../../lib/helpers/licenseeFilter';

/**
 * GET /api/machines/[machineId]
 * Get a single machine by ID with transformed fields and financial metrics
 * Returns both active and soft-deleted machines
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ machineId: string }> }
) {
  try {
    const { machineId } = await params;
    const { searchParams } = new URL(request.url);
    const timePeriod = searchParams.get('timePeriod');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    console.warn('[DEBUG] API received parameters:', {
      machineId,
      timePeriod,
      startDateParam,
      endDateParam,
    });

    // Only proceed if timePeriod or custom date range is provided
    if (!timePeriod && !startDateParam && !endDateParam) {
      return NextResponse.json(
        { error: 'timePeriod or startDate/endDate parameters are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch machine with all necessary fields - INCLUDING soft-deleted ones
    const machine = await Machine.findOne({
      _id: machineId,
      // Removed: deletedAt: { $exists: false } because i want deleted docs,
    });

    if (!machine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // Fetch location details including gameDayOffset if machine has a gamingLocation
    let locationName = 'No Location Assigned';
    let gameDayOffset = 0;
    if (machine.gamingLocation) {
      try {
        const location = (await GamingLocations.findOne({
          _id: machine.gamingLocation,
        })
          .select('name locationName gameDayOffset rel')
          .lean()) as {
          name?: string;
          locationName?: string;
          gameDayOffset?: number;
          rel?: { licencee?: string };
        } | null;

        if (location) {
          // Validate user has access to this location's licensee
          const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
          if (userAccessibleLicensees !== 'all') {
            const locationLicensee = location.rel?.licencee;
            if (locationLicensee && !userAccessibleLicensees.includes(locationLicensee)) {
              return NextResponse.json(
                { success: false, error: 'Unauthorized: You do not have access to this cabinet' },
                { status: 403 }
              );
            }
          }
          
          locationName =
            location.name || location.locationName || 'Unknown Location';
          gameDayOffset = location.gameDayOffset ?? 8; // Default to 8 AM Trinidad time
        } else {
          locationName = 'Location Not Found';
        }
      } catch (error) {
        console.warn('Failed to fetch location name for machine:', error);
        locationName = 'Location Error';
      }
    }

    // Calculate gaming day range for this machine's location
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (timePeriod === 'Custom' && startDateParam && endDateParam) {
      // For Custom dates, parse and let gaming day offset be applied by getGamingDayRangeForPeriod
      // User sends: "2025-10-31" meaning Oct 31 gaming day
      // With 8 AM offset: Oct 31, 8:00 AM → Nov 1, 8:00 AM
      const customStart = new Date(startDateParam + 'T00:00:00.000Z');
      const customEnd = new Date(endDateParam + 'T00:00:00.000Z');
      
      const gamingDayRange = getGamingDayRangeForPeriod(
        'Custom',
        gameDayOffset,
        customStart,
        customEnd
      );
      
      startDate = gamingDayRange.rangeStart;
      endDate = gamingDayRange.rangeEnd;
    } else if (timePeriod === 'All Time') {
      // For "All Time", don't apply any date filtering - query all records
      startDate = undefined;
      endDate = undefined;
    } else {
      // For predefined time periods (Today, Yesterday, 7d, 30d), use gaming day offset
      const timePeriodForGamingDay = timePeriod || 'Today';
      const gamingDayRange = getGamingDayRangeForPeriod(
        timePeriodForGamingDay,
        gameDayOffset
      );
      startDate = gamingDayRange.rangeStart;
      endDate = gamingDayRange.rangeEnd;
    }

    // Fetch financial metrics from meters collection using aggregation for date filtering
    console.warn('[DEBUG] Querying meters with date range:', {
      timePeriod,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    });

    // Use aggregation to sum deltas (movement.* fields contain deltas, not cumulative values)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pipeline: any[] = [];

    // Add match stage with date filtering (only if dates are provided)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchStage: any = { machine: machineId };
    if (startDate && endDate) {
      matchStage.readAt = { $gte: startDate, $lte: endDate };
    }
    pipeline.push({ $match: matchStage });

    pipeline.push({
      $group: {
        _id: null,
        moneyIn: { $sum: '$movement.drop' },
        moneyOut: { $sum: '$movement.totalCancelledCredits' },
        jackpot: { $sum: '$movement.jackpot' },
        // For Live Metrics, we need cumulative values, not daily deltas
        // So we get the latest values from the most recent meter record
        coinIn: { $last: '$coinIn' },
        coinOut: { $last: '$coinOut' },
        gamesPlayed: { $last: '$gamesPlayed' },
        gamesWon: { $last: '$gamesWon' },
        handPaidCancelledCredits: { $last: '$handPaidCancelledCredits' },
        meterCount: { $sum: 1 },
      },
    });

    const metricsAggregation = await Meters.aggregate(pipeline);

    const metrics = metricsAggregation[0] || {
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
    const handPaidCancelledCredits = metrics.handPaidCancelledCredits || 0;

    console.warn('[DEBUG] Found meters:', metrics.meterCount);

    const gross = moneyIn - moneyOut;

    console.warn('[DEBUG] Calculated metrics:', {
      moneyIn,
      moneyOut,
      jackpot,
      coinIn,
      coinOut,
      gamesPlayed,
      gamesWon,
      handPaidCancelledCredits,
      gross,
    });

    // Transform the data to match frontend expectations
    const transformedMachine = {
      _id: machine._id,
      assetNumber: machine.serialNumber || '',
      serialNumber: machine.serialNumber || '',
      installedGame: machine.game || '',
      game: machine.game || '',
      gamingLocation: machine.gamingLocation || '',
      locationId: machine.gamingLocation || '',
      locationName: locationName, // Add the resolved location name
      gameDayOffset: gameDayOffset, // Add the location's gameDayOffset
      assetStatus: machine.assetStatus || '',
      status: machine.assetStatus || '',
      cabinetType: machine.cabinetType || '',
      smbId: machine.relayId || '',
      relayId: machine.relayId || '',
      accountingDenomination: machine.gameConfig?.accountingDenomination || '1',
      collectionMultiplier: machine.collectionMeters ? '1' : '1',
      isCronosMachine: false,
      createdAt: machine.createdAt,
      updatedAt: machine.updatedAt,
      deletedAt: machine.deletedAt, // Include deletedAt field
      // Financial metrics from meters collection according to financial-metrics-guide.md
      moneyIn,
      moneyOut,
      cancelledCredits: moneyOut, // Same as moneyOut (totalCancelledCredits)
      jackpot,
      gross,
      // Additional metrics for comprehensive financial tracking
      coinIn,
      coinOut,
      gamesPlayed,
      gamesWon,
      handPaidCancelledCredits,
      // Add handle (same as coinIn for betting activity)
      handle: coinIn,
      // SAS meters fallback
      sasMeters: machine.sasMeters || {},
      // Collection meters
      collectionMeters: machine.collectionMeters || {},
      // Include all the missing fields from the database
      collectionMetersHistory: machine.collectionMetersHistory || [],
      billValidator: machine.billValidator || {},
      smibConfig: machine.smibConfig || {},
      smibVersion: machine.smibVersion || {},
      billMeters: machine.billMeters || {},
      lastActivity: machine.lastActivity,
      sessionHistory: machine.sessionHistory || [],
      balances: machine.balances || {},
      tasks: machine.tasks || {},
      curProcess: machine.curProcess || {},
      protocols: machine.protocols || [],
      manufacturer: machine.manufacturer || machine.manuf,
      gameType: machine.gameType,
      validationId: machine.validationId,
      sequenceNumber: machine.sequenceNumber,
      isSasMachine: machine.isSasMachine,
      lastBillMeterAt: machine.lastBillMeterAt,
      lastSasMeterAt: machine.lastSasMeterAt,
      collectionTime: machine.collectionTime,
      previousCollectionTime: machine.previousCollectionTime,
      operationsWhileIdle: machine.operationsWhileIdle || {},
      viewingAccountDenominationHistory:
        machine.viewingAccountDenominationHistory || [],
      custom: machine.custom || {},
      isSunBoxDevice: machine.isSunBoxDevice,
      playableBalance: machine.playableBalance,
      config: machine.config || {},
      gamingBoard: machine.gamingBoard,
      manuf: machine.manuf,
      gameConfig: machine.gameConfig || {},
      origSerialNumber: machine.origSerialNumber,
      machineId: machine.machineId,
      gameNumber: machine.gameNumber,
      numberOfEnabledGames: machine.numberOfEnabledGames,
      enabledGameNumbers: machine.enabledGameNumbers || [],
      noOfGames: machine.noOfGames,
      viewingAccountDenomination: machine.viewingAccountDenomination || [],
      currentSession: machine.currentSession,
      orig: machine.orig || {},
    };

    return NextResponse.json({
      success: true,
      data: transformedMachine,
    });
  } catch (error) {
    console.error(' Error fetching machine:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch machine' },
      { status: 500 }
    );
  }
}

export function POST() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export function PUT() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export function DELETE() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
