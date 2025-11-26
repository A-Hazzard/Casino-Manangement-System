/**
 * Machine Detail API Route
 *
 * This route handles fetching a single machine by ID with financial metrics.
 * It supports:
 * - Time period filtering (today, week, month, custom dates)
 * - Currency conversion (Admin/Developer only)
 * - Location-based access control
 * - Gaming day offset calculations
 * - Meter data aggregation
 * - Returns both active and soft-deleted machines
 *
 * @module app/api/machines/[machineId]/route
 */

import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
} from '@/lib/helpers/rates';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import type { MachineDocument } from '@/lib/types/mongo';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching a single machine by ID
 *
 * Flow:
 * 1. Parse route parameters and query parameters
 * 2. Validate timePeriod or date range parameters
 * 3. Connect to database
 * 4. Fetch machine by ID
 * 5. Check user access to machine's location
 * 6. Fetch location details and gameDayOffset
 * 7. Calculate gaming day range
 * 8. Aggregate meter data for the time period
 * 9. Apply currency conversion if needed
 * 10. Transform and return machine data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ machineId: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse route parameters and query parameters
    // ============================================================================
    const { machineId } = await params;
    const { searchParams } = new URL(request.url);
    const timePeriod = searchParams.get('timePeriod');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';

    // ============================================================================
    // STEP 2: Validate timePeriod or date range parameters
    // ============================================================================
    // Only proceed if timePeriod or custom date range is provided
    if (!timePeriod && !startDateParam && !endDateParam) {
      return NextResponse.json(
        { error: 'timePeriod or startDate/endDate parameters are required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Fetch machine by ID
    // ============================================================================
    // Fetch machine with all necessary fields - INCLUDING soft-deleted ones
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    // Handle both String _id (from schema) and ObjectId _id (legacy data)
    // Since aggregation endpoint converts _id to string, but DB might have ObjectId,
    // we need to try both formats
    let machine: MachineDocument | null = null;
    
    // First try as string (schema says String type)
    machine = (await Machine.findOne({
      _id: machineId,
      // Removed: deletedAt: { $exists: false } because i want deleted docs,
    }).lean()) as MachineDocument | null;

    // If not found and ID looks like ObjectId hex string, try as ObjectId
    if (!machine && machineId.length === 24 && /^[0-9a-fA-F]{24}$/.test(machineId)) {
      try {
        const { default: mongoose } = await import('mongoose');
        const objectId = new mongoose.Types.ObjectId(machineId);
        // Use native MongoDB query to bypass schema type enforcement
        const db = mongoose.connection.db;
        if (db) {
          const machinesCollection = db.collection('machines');
          const machineDoc = await machinesCollection.findOne({
            _id: objectId,
          });
          if (machineDoc) {
            // Convert to Mongoose document format
            machine = machineDoc as MachineDocument;
          }
        }
      } catch (objectIdError) {
        // Invalid ObjectId format or DB error, continue with 404
        console.warn(`[Machines API GET] Failed to query as ObjectId:`, objectIdError);
      }
    }

    if (!machine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 5: Fetch location details and gameDayOffset
    // ============================================================================
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
          // Check if user has access to this location (includes both licensee and location permissions)
          const hasAccess = await checkUserLocationAccess(
            String(machine.gamingLocation)
          );
          if (!hasAccess) {
            return NextResponse.json(
              {
                success: false,
                error: 'Unauthorized: You do not have access to this cabinet',
              },
              { status: 403 }
            );
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

    // ============================================================================
    // STEP 7: Calculate gaming day range
    // ============================================================================
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

    // ============================================================================
    // STEP 8: Aggregate meter data for the time period
    // ============================================================================
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

    const gross = moneyIn - moneyOut;

    // ============================================================================
    // STEP 9: Apply currency conversion if needed
    // ============================================================================
    // Currency conversion logic (similar to aggregation endpoint)
    let finalMoneyIn = moneyIn;
    let finalMoneyOut = moneyOut;
    let finalCancelledCredits = moneyOut;
    let finalJackpot = jackpot;
    let finalGross = gross;
    let finalCoinIn = coinIn;
    let finalCoinOut = coinOut;

    // Get user's role to determine if currency conversion should apply
    const user = await getUserFromServer();
    const userRoles = (user?.roles as string[]) || [];
    const isAdminOrDev = userRoles.some(role =>
      ['admin', 'developer'].includes(role)
    );

    // Currency conversion ONLY for Admin/Developer when viewing "All Licensees" (no specific licensee selected)
    // For detail pages, we check if currency parameter is provided (which means "All Licensees" was selected)
    if (isAdminOrDev && displayCurrency && displayCurrency !== 'USD') {
      // Get location details to determine native currency
      let locationData: {
        rel?: { licencee?: string };
        country?: string;
      } | null = null;
      if (machine.gamingLocation) {
        try {
          locationData = (await GamingLocations.findOne({
            _id: machine.gamingLocation,
          })
            .select('rel country')
            .lean()) as {
            rel?: { licencee?: string };
            country?: string;
          } | null;
        } catch (error) {
          console.warn(
            'Failed to fetch location for currency conversion:',
            error
          );
        }
      }

      // Determine native currency from licensee or country
      let nativeCurrency: string = 'USD';
      if (locationData?.rel?.licencee) {
        // Get licensee name from ID
        const { default: db } = await import('mongoose');
        const Licencee = db.connection.collection('licencees');
        const licenseeDoc = await Licencee.findOne({
          _id: new db.Types.ObjectId(locationData.rel.licencee),
        });
        const licenseeName = licenseeDoc?.name as string | undefined;

        if (licenseeName) {
          // Map licensee name to currency
          const LICENSEE_CURRENCY: Record<string, string> = {
            TTG: 'TTD',
            Cabana: 'GYD',
            Barbados: 'BBD',
          };
          nativeCurrency = LICENSEE_CURRENCY[licenseeName] || 'USD';
        }
      } else if (locationData?.country) {
        // Get country name from ID
        const { default: db } = await import('mongoose');
        const Country = db.connection.collection('countries');
        const countryDoc = await Country.findOne({
          _id: new db.Types.ObjectId(locationData.country),
        });
        const countryName = countryDoc?.name as string | undefined;

        if (countryName) {
          nativeCurrency = getCountryCurrency(countryName) || 'USD';
        }
      }

      // Convert from native currency to USD, then to display currency
      if (nativeCurrency !== 'USD') {
        const moneyInUSD = convertToUSD(moneyIn, nativeCurrency);
        const moneyOutUSD = convertToUSD(moneyOut, nativeCurrency);
        const jackpotUSD = convertToUSD(jackpot, nativeCurrency);
        const coinInUSD = convertToUSD(coinIn, nativeCurrency);
        const coinOutUSD = convertToUSD(coinOut, nativeCurrency);

        finalMoneyIn = convertFromUSD(moneyInUSD, displayCurrency);
        finalMoneyOut = convertFromUSD(moneyOutUSD, displayCurrency);
        finalCancelledCredits = finalMoneyOut;
        finalJackpot = convertFromUSD(jackpotUSD, displayCurrency);
        finalGross = finalMoneyIn - finalMoneyOut;
        finalCoinIn = convertFromUSD(coinInUSD, displayCurrency);
        finalCoinOut = convertFromUSD(coinOutUSD, displayCurrency);
      }
    }

    // ============================================================================
    // STEP 10: Transform and return machine data
    // ============================================================================
    // Get serialNumber with fallback to custom.name
    const serialNumber = (machine.serialNumber as string)?.trim() || '';
    const customName =
      ((machine.custom as Record<string, unknown>)?.name as string)?.trim() ||
      '';
    const finalSerialNumber = serialNumber || customName || '';

    // Transform the data to match frontend expectations
    const transformedMachine = {
      _id: machine._id,
      assetNumber: finalSerialNumber,
      serialNumber: finalSerialNumber,
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
      moneyIn: finalMoneyIn,
      moneyOut: finalMoneyOut,
      cancelledCredits: finalCancelledCredits, // Same as moneyOut (totalCancelledCredits)
      jackpot: finalJackpot,
      gross: finalGross,
      // Additional metrics for comprehensive financial tracking
      coinIn: finalCoinIn,
      coinOut: finalCoinOut,
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

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Machines API GET] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      data: transformedMachine,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch machine';
    console.error(
      `[Machines API GET] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Not allowed for this route
 */
export function POST() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

/**
 * PUT handler - Not allowed for this route
 */
export function PUT() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

/**
 * DELETE handler - Not allowed for this route
 */
export function DELETE() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
