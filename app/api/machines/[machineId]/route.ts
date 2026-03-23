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

import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenceeFilter';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
  getLicenceeCurrency,
} from '@/lib/helpers/rates';
import type {
  LicenceeDocument,
  LocationDocument,
  MachineDocument,
} from '@/lib/types/common';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import type { PipelineStage } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { TimePeriod } from '../../lib/types';

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
  request: NextRequest
) {
  const { pathname } = request.nextUrl;
  const machineId = pathname.split('/')[3];

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    const startTime = Date.now();

    try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    let timePeriod = searchParams.get('timePeriod') as TimePeriod;

    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';

    // ============================================================================
    // STEP 2: Validate timePeriod or date range parameters
    // ============================================================================
    if (!timePeriod && (!startDateParam || !endDateParam)) {
      return NextResponse.json(
        {
          error:
            "Ensure that you've passed the timeperiod, or startDate and endDate parameters",
        },
        { status: 400 }
      );
    }

    const isCashier = userRoles.includes('cashier');
    const isVaultManager = userRoles.includes('vault-manager');
    const isStaff = isCashier || isVaultManager;

    // ============================================================================
    // STEP 3.5: Technician Restriction - Force last hour meter data
    // ============================================================================
    const isOnlyTechnician =
      userRoles.includes('technician') && userRoles.length === 1;
    if (isOnlyTechnician) timePeriod = 'LastHour';

    // ============================================================================
    // STEP 4: Fetch machine by ID
    // ============================================================================
    const machine = (await Machine.findOne({
      _id: machineId,
    }).lean()) as MachineDocument;

    if (!machine)
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );

    // ============================================================================
    // STEP 5: Fetch location details and gameDayOffset
    // ============================================================================
    let locationName = '';
    let gameDayOffset = 0;
    let includeJackpotSetting = false;

    if (machine.gamingLocation) {
      try {
        const location = (await GamingLocations.findOne({
          _id: machine.gamingLocation,
        })
          .select('name gameDayOffset rel')
          .lean()) as Pick<
          LocationDocument,
          'name' | 'gameDayOffset' | 'rel'
        > | null;

        if (location) {
          // Check if user has access to this location (includes both licencee and location permissions)
          const hasAccess = await checkUserLocationAccess(
            machine.gamingLocation
          );

          if (!hasAccess)
            return NextResponse.json(
              {
                success: false,
                error: 'Unauthorized: You do not have access to this cabinet',
              },
              { status: 403 }
            );

          locationName = location.name || 'Unknown Location';
          gameDayOffset = location.gameDayOffset ?? 8; // Default to 8 AM Trinidad time

          // STEP 6: Fetch licensee-level includeJackpot setting to see if we should append jackpot to moneyIn
          let includeJackpot = false;
          // rel?.licencee is string[] per the schema — use the first one.
          const licenceeIdRel = location.rel?.licencee;
          const licenceeId = Array.isArray(licenceeIdRel)
            ? licenceeIdRel[0]
            : licenceeIdRel;

          if (licenceeId) {
            const licencee = (await Licencee.findOne({
              _id: licenceeId,
            }).lean()) as Record<string, unknown> | null;
            if (licencee) includeJackpot = !!licencee.includeJackpot;
          }
          includeJackpotSetting = includeJackpot;
        } else locationName = 'Location Not Found';
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

    if (timePeriod === 'Custom') {
      if (!startDateParam || !endDateParam) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Custom time period requires startDate and endDate parameters',
          },
          { status: 400 }
        );
      }
      // Parse dates from parameters
      // Frontend always sends dates with time component (e.g., "2025-12-07T11:45:00-04:00" or "2025-12-07T00:00:00.000Z")
      const customStart = new Date(startDateParam);
      const customEnd = new Date(endDateParam);

      if (isNaN(customStart.getTime()) || isNaN(customEnd.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid custom dates provided' },
          { status: 400 }
        );
      }

      // Use getGamingDayRangeForPeriod to handle both specific times and date-only expansion
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
    const pipeline: PipelineStage[] = [];
    const matchStage = {
      machine: machineId,
      readAt: { $gte: startDate, $lte: endDate },
    };
    pipeline.push({ $match: matchStage });

    pipeline.push({
      $group: {
        _id: null,
        moneyIn: { $sum: '$movement.drop' },
        moneyOut: { $sum: '$movement.totalCancelledCredits' },
        jackpot: { $sum: '$movement.jackpot' },
        coinIn: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
        coinOut: { $sum: { $ifNull: ['$movement.coinOut', 0] } },
        gamesPlayed: { $sum: { $ifNull: ['$movement.gamesPlayed', 0] } },
        gamesWon: { $sum: { $ifNull: ['$movement.gamesWon', 0] } },
        handPaidCancelledCredits: {
          $sum: { $ifNull: ['$movement.handPaidCancelledCredits', 0] },
        },
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

    let moneyIn = metrics.moneyIn;
    const rawMoneyOut = metrics.moneyOut; // movement.totalCancelledCredits — base cancelled credits (no jackpot)
    let jackpot = metrics.jackpot;

    // rawMoneyOut is the base cancelled credits without jackpot.
    // Add jackpot only when includeJackpot=true for this licencee.
    let moneyOut = rawMoneyOut + (includeJackpotSetting ? jackpot : 0);

    let coinIn = metrics.coinIn;
    let coinOut = metrics.coinOut;
    const gamesPlayed = metrics.gamesPlayed;
    const gamesWon = metrics.gamesWon;
    const handPaidCancelledCredits = metrics.handPaidCancelledCredits;

    let gross = moneyIn - moneyOut;

    // ============================================================================
    // STEP 9: Apply currency conversion if needed
    // ============================================================================
    // For cabinet detail pages we ALWAYS convert from the machine's native currency
    // into the selected display currency, regardless of licencee filter.
    // EXCEPT for cashiers and vault managers who should always see raw values.
    const shouldConvert = Boolean(displayCurrency) && !isStaff;

    if (shouldConvert) {
      // Get location details to determine native currency
      let locationData: Pick<LocationDocument, 'rel' | 'country'> | null = null;

      if (machine.gamingLocation) {
        try {
          locationData = (await GamingLocations.findOne({
            _id: machine.gamingLocation,
          })
            .select('rel country')
            .lean()) as Pick<LocationDocument, 'rel' | 'country'> | null;
        } catch (error) {
          console.warn(
            'Failed to fetch location for currency conversion:',
            error
          );
        }
      }

      // Determine native currency from licencee or country
      let nativeCurrency: CurrencyCode = 'USD';
      const licenceeId = locationData?.rel?.licencee;

      if (licenceeId) {
        try {
          const licenceeDoc = (await Licencee.findOne({
            _id: licenceeId,
          })
            .select('name')
            .lean()) as Pick<LicenceeDocument, 'name'> | null;

          if (licenceeDoc && licenceeDoc.name)
            nativeCurrency = getLicenceeCurrency(licenceeDoc.name);
        } catch (licenceeError: unknown) {
          console.warn(
            'Failed to resolve licencee for currency conversion:',
            licenceeError instanceof Error
              ? licenceeError.message
              : licenceeError
          );
        }
      } else if (locationData?.country) {
        try {
          nativeCurrency = getCountryCurrency(locationData.country);
        } catch (countryError: unknown) {
          console.warn(
            'Failed to resolve country for currency conversion:',
            countryError instanceof Error ? countryError.message : countryError
          );
        }
      }

      // Convert from native currency to USD, then to display currency
      const moneyInUSD = convertToUSD(moneyIn, nativeCurrency);
      const moneyOutUSD = convertToUSD(moneyOut, nativeCurrency);
      const jackpotUSD = convertToUSD(jackpot, nativeCurrency);
      const coinInUSD = convertToUSD(coinIn, nativeCurrency);
      const coinOutUSD = convertToUSD(coinOut, nativeCurrency);

      moneyIn = convertFromUSD(moneyInUSD, displayCurrency);
      moneyOut = convertFromUSD(moneyOutUSD, displayCurrency);
      jackpot = convertFromUSD(jackpotUSD, displayCurrency);
      coinIn = convertFromUSD(coinInUSD, displayCurrency);
      coinOut = convertFromUSD(coinOutUSD, displayCurrency);
      gross = moneyIn - moneyOut;
    } else {
      // When not converting, recalculate moneyOut with raw values
      moneyOut = rawMoneyOut + (includeJackpotSetting ? jackpot : 0);
    }

    // ============================================================================
    // STEP 9.5: Apply reviewer multiplier if applicable
    // ============================================================================
    const userPayloadTyped = userPayload as { multiplier?: number | null };
    const userMultiplier = userPayloadTyped?.multiplier ?? null;
    const userRolesReviewer = userRoles.map(
      r => r?.toLowerCase?.() ?? String(r).toLowerCase()
    );
    const isReviewer = userRolesReviewer.includes('reviewer');
    const reviewerMult =
      isReviewer && userMultiplier !== null ? userMultiplier : null;

    const rawMI = moneyIn;
    const rawMO = moneyOut;
    const rawJP = jackpot;
    const rawGross = gross;

    if (reviewerMult !== null) {
      moneyIn = moneyIn * reviewerMult;
      moneyOut = moneyOut * reviewerMult;
      jackpot = jackpot * reviewerMult;
      coinIn = coinIn * reviewerMult;
      coinOut = coinOut * reviewerMult;
      gross = moneyIn - moneyOut;
    }

    // ============================================================================
    // STEP 10: Transform and return machine data
    // ============================================================================
    // Get serialNumber with fallback to custom.name
    const serialNumber = (machine.serialNumber as string)?.trim() || '';
    const customName =
      (machine.custom as { name?: string })?.name?.trim() || '';
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
      collectorDenomination: machine.collectorDenomination || 1,
      collectionMultiplier: String(machine.collectorDenomination || 1),
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
      includeJackpot: includeJackpotSetting,
      netGross: includeJackpotSetting ? gross : gross - (jackpot || 0),
      // Raw values for reviewer debug
      _raw:
        reviewerMult !== null
          ? {
              moneyIn: rawMI,
              moneyOut: rawMO,
              jackpot: rawJP,
              gross: rawGross,
            }
          : undefined,
      _reviewerMultiplier: reviewerMult,
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
    console.error(`[Machines API GET] Error after ${duration}ms:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
  });
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
