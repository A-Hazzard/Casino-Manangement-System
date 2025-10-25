import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';
import { Document } from 'mongodb';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { convertFromUSD } from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';

/**
 * Gets overall dashboard totals (Money In, Money Out, Gross) across ALL locations
 * using the same aggregation logic as the working MongoDB shell queries.
 * Always returns a result with 0 values if no data exists.
 */
export async function GET(req: NextRequest) {
  try {
    const db = await connectDB();
    if (!db) {
      console.error('Database connection not established');
      return NextResponse.json(
        { error: 'Database connection not established' },
        { status: 500 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const timePeriod = searchParams.get('timePeriod');
    const licencee = searchParams.get('licencee');
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';

    // Log currency conversion parameters
    console.warn('=== DASHBOARD TOTALS API CURRENCY DEBUG ===');
    console.warn('Request parameters:', {
      timePeriod,
      licencee,
      displayCurrency,
      shouldApplyConversion: shouldApplyCurrencyConversion(licencee),
    });
    console.warn('Full URL:', req.url);
    console.warn(
      'Search params:',
      Object.fromEntries(req.nextUrl.searchParams)
    );

    // Only proceed if timePeriod is provided
    if (!timePeriod) {
      return NextResponse.json(
        { error: 'timePeriod parameter is required' },
        { status: 400 }
      );
    }

    // Parse custom dates if provided (for gaming day offset calculations)
    let customStartDate: Date | undefined, customEndDate: Date | undefined;
    if (timePeriod === 'Custom') {
      const customStart = searchParams.get('startDate');
      const customEnd = searchParams.get('endDate');
      if (!customStart || !customEnd) {
        return NextResponse.json(
          { error: 'Missing startDate or endDate' },
          { status: 400 }
        );
      }
      customStartDate = new Date(customStart);
      customEndDate = new Date(customEnd);
    }

    let totals: { moneyIn: number; moneyOut: number; gross: number };

    // Check if we need to apply currency conversion (All Licensee mode)
    if (shouldApplyCurrencyConversion(licencee)) {
      console.warn('=== APPLYING CURRENCY CONVERSION FOR ALL LICENSEE ===');

      // Get all licensee IDs
      const allLicenseeIds = await db
        .collection('gaminglocations')
        .distinct('rel.licencee', {
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2020-01-01') } },
          ],
        });

      console.warn('Found licensee IDs:', allLicenseeIds);

      // Fetch licensee details to get their names
      const licenseesData = await db
        .collection('licencees')
        .find(
          {
            _id: { $in: allLicenseeIds },
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2020-01-01') } },
            ],
          },
          { projection: { _id: 1, name: 1 } }
        )
        .toArray();

      // Create a map of licensee ID to name
      const licenseeIdToName = new Map<string, string>();
      licenseesData.forEach(lic => {
        licenseeIdToName.set(lic._id.toString(), lic.name);
      });

      console.warn(
        'Licensee ID to Name mapping:',
        Object.fromEntries(licenseeIdToName)
      );

      let totalMoneyInUSD = 0;
      let totalMoneyOutUSD = 0;
      let totalGrossUSD = 0;

      // Process each licensee separately
      for (const licenseeId of allLicenseeIds) {
        if (!licenseeId) continue;

        const licenseeName =
          licenseeIdToName.get(licenseeId.toString()) || 'Unknown';
        console.warn(`Processing licensee: ${licenseeId} (${licenseeName})`);

        // Get locations for this licensee
        const locations = await db
          .collection('gaminglocations')
          .find(
            {
              $or: [
                { deletedAt: null },
                { deletedAt: { $lt: new Date('2020-01-01') } },
              ],
              'rel.licencee': licenseeId,
            },
            { projection: { _id: 1 } }
          )
          .toArray();

        const locationIds = locations.map(l => l._id);

        if (locationIds.length === 0) continue;

        // Get machines for these locations
        const machines = await db
          .collection('machines')
          .find(
            {
              gamingLocation: { $in: locationIds },
              $or: [
                { deletedAt: null },
                { deletedAt: { $lt: new Date('2020-01-01') } },
              ],
            },
            { projection: { _id: 1 } }
          )
          .toArray();

        const machineIds = machines.map(m => m._id);

        if (machineIds.length === 0) continue;

        // Get locations with their gameDayOffset for this licensee
        const locationsWithOffset = await db
          .collection('gaminglocations')
          .find(
            {
              $or: [
                { deletedAt: null },
                { deletedAt: { $lt: new Date('2020-01-01') } },
              ],
              'rel.licencee': licenseeId,
            },
            { projection: { _id: 1, gameDayOffset: 1 } }
          )
          .toArray();

        // Calculate gaming day ranges for each location
        const gamingDayRanges = getGamingDayRangesForLocations(
          locationsWithOffset.map(loc => ({
            _id: loc._id.toString(),
            gameDayOffset: loc.gameDayOffset || 0,
          })),
          timePeriod,
          customStartDate,
          customEndDate
        );

        let licenseeMoneyIn = 0;
        let licenseeMoneyOut = 0;
        let licenseeGross = 0;

        // Process each location separately with its gaming day range
        for (const location of locationsWithOffset) {
          const locationId = location._id.toString();
          const gameDayRange = gamingDayRanges.get(locationId);

          if (!gameDayRange) continue;

          // Get machines for this specific location
          const locationMachines = await db
            .collection('machines')
            .find(
              {
                gamingLocation: locationId,
                $or: [
                  { deletedAt: null },
                  { deletedAt: { $lt: new Date('2020-01-01') } },
                ],
              },
              { projection: { _id: 1 } }
            )
            .toArray();

          const locationMachineIds = locationMachines.map(m => m._id);

          if (locationMachineIds.length === 0) continue;

          // Aggregate data for this location using its gaming day range
          const locationPipeline: Document[] = [
            {
              $match: {
                machine: { $in: locationMachineIds },
                readAt: {
                  $gte: gameDayRange.rangeStart,
                  $lte: gameDayRange.rangeEnd,
                },
              },
            },
            {
              $group: {
                _id: null,
                totalDrop: { $sum: '$movement.drop' },
                totalCancelled: { $sum: '$movement.totalCancelledCredits' },
              },
            },
            {
              $project: {
                _id: 0,
                moneyIn: { $ifNull: ['$totalDrop', 0] },
                moneyOut: { $ifNull: ['$totalCancelled', 0] },
                gross: {
                  $subtract: [
                    { $ifNull: ['$totalDrop', 0] },
                    { $ifNull: ['$totalCancelled', 0] },
                  ],
                },
              },
            },
          ];

          const locationResult = await db
            .collection('meters')
            .aggregate(locationPipeline)
            .toArray();
          const locationTotals = locationResult[0] || {
            moneyIn: 0,
            moneyOut: 0,
            gross: 0,
          };

          licenseeMoneyIn += locationTotals.moneyIn;
          licenseeMoneyOut += locationTotals.moneyOut;
          licenseeGross += locationTotals.gross;
        }

        const licenseeTotals = {
          moneyIn: licenseeMoneyIn,
          moneyOut: licenseeMoneyOut,
          gross: licenseeGross,
        };

        console.warn(
          `Licensee ${licenseeName} (${licenseeId}) raw values:`,
          licenseeTotals
        );

        // Convert this licensee's values to USD using their name for currency mapping
        const { convertToUSD } = await import('@/lib/helpers/rates');

        const moneyInUSD = convertToUSD(licenseeTotals.moneyIn, licenseeName);
        const moneyOutUSD = convertToUSD(licenseeTotals.moneyOut, licenseeName);
        const grossUSD = convertToUSD(licenseeTotals.gross, licenseeName);

        console.warn(
          `Licensee ${licenseeName} (${licenseeId}) converted to USD:`,
          {
            moneyIn: moneyInUSD,
            moneyOut: moneyOutUSD,
            gross: grossUSD,
          }
        );

        // Add to totals
        totalMoneyInUSD += moneyInUSD;
        totalMoneyOutUSD += moneyOutUSD;
        totalGrossUSD += grossUSD;
      }

      console.warn('Total USD values before final conversion:', {
        moneyIn: Math.round(totalMoneyInUSD * 100) / 100,
        moneyOut: Math.round(totalMoneyOutUSD * 100) / 100,
        gross: Math.round(totalGrossUSD * 100) / 100,
      });

      // Convert from USD to display currency

      console.warn('Converting from USD to display currency:', {
        displayCurrency,
        totalMoneyInUSD,
        totalMoneyOutUSD,
        totalGrossUSD,
      });

      const convertedMoneyIn = convertFromUSD(totalMoneyInUSD, displayCurrency);
      const convertedMoneyOut = convertFromUSD(
        totalMoneyOutUSD,
        displayCurrency
      );
      const convertedGross = convertFromUSD(totalGrossUSD, displayCurrency);

      console.warn('After convertFromUSD:', {
        convertedMoneyIn,
        convertedMoneyOut,
        convertedGross,
        rate:
          displayCurrency === 'TTD'
            ? 6.75
            : displayCurrency === 'GYD'
              ? 209.5
              : displayCurrency === 'BBD'
                ? 2.0
                : 1.0,
      });

      // Manual calculation to verify
      const manualTTD = totalMoneyInUSD * 6.75;
      console.warn('Manual TTD calculation:', {
        totalMoneyInUSD,
        manualTTD,
        convertedMoneyIn,
        areEqual: Math.abs(convertedMoneyIn - manualTTD) < 0.01,
      });

      totals = {
        moneyIn: Math.round(convertedMoneyIn * 100) / 100,
        moneyOut: Math.round(convertedMoneyOut * 100) / 100,
        gross: Math.round(convertedGross * 100) / 100,
      };

      console.warn('Final converted values:', totals);
    } else {
      // Single licensee or no conversion needed - use original logic
      console.warn('=== SINGLE LICENSEE MODE - NO CONVERSION ===');

      // If licencee filter is provided, we need to filter by locations with gaming day offsets
      if (licencee && licencee !== 'all') {
        // Get all locations for this licencee with their gameDayOffset
        const locations = await db
          .collection('gaminglocations')
          .find(
            {
              $or: [
                { deletedAt: null },
                { deletedAt: { $lt: new Date('2020-01-01') } },
              ],
              'rel.licencee': licencee,
            },
            { projection: { _id: 1, gameDayOffset: 1 } }
          )
          .toArray();

        if (locations.length === 0) {
          // No locations for this licencee, return 0 values
          return NextResponse.json({
            moneyIn: 0,
            moneyOut: 0,
            gross: 0,
          });
        }

        // Calculate gaming day ranges for each location
        const gamingDayRanges = getGamingDayRangesForLocations(
          locations.map(loc => ({
            _id: loc._id.toString(),
            gameDayOffset: loc.gameDayOffset || 0,
          })),
          timePeriod,
          customStartDate,
          customEndDate
        );

        let totalMoneyIn = 0;
        let totalMoneyOut = 0;
        let totalGross = 0;

        // Process each location separately with its gaming day range
        for (const location of locations) {
          const locationId = location._id.toString();
          const gameDayRange = gamingDayRanges.get(locationId);

          if (!gameDayRange) continue;

          // Get machines for this specific location
          const locationMachines = await db
            .collection('machines')
            .find(
              {
                gamingLocation: locationId,
                $or: [
                  { deletedAt: null },
                  { deletedAt: { $lt: new Date('2020-01-01') } },
                ],
              },
              { projection: { _id: 1 } }
            )
            .toArray();

          const locationMachineIds = locationMachines.map(m => m._id);

          if (locationMachineIds.length === 0) continue;

          // Aggregate data for this location using its gaming day range
          const locationPipeline: Document[] = [
            {
              $match: {
                machine: { $in: locationMachineIds },
                readAt: {
                  $gte: gameDayRange.rangeStart,
                  $lte: gameDayRange.rangeEnd,
                },
              },
            },
            {
              $group: {
                _id: null,
                totalDrop: { $sum: '$movement.drop' },
                totalCancelled: { $sum: '$movement.totalCancelledCredits' },
              },
            },
            {
              $project: {
                _id: 0,
                moneyIn: { $ifNull: ['$totalDrop', 0] },
                moneyOut: { $ifNull: ['$totalCancelled', 0] },
                gross: {
                  $subtract: [
                    { $ifNull: ['$totalDrop', 0] },
                    { $ifNull: ['$totalCancelled', 0] },
                  ],
                },
              },
            },
          ];

          const locationResult = await db
            .collection('meters')
            .aggregate(locationPipeline)
            .toArray();
          const locationTotals = locationResult[0] || {
            moneyIn: 0,
            moneyOut: 0,
            gross: 0,
          };

          totalMoneyIn += locationTotals.moneyIn;
          totalMoneyOut += locationTotals.moneyOut;
          totalGross += locationTotals.gross;
        }

        // Round to 2 decimal places
        totals = {
          moneyIn: Math.round(totalMoneyIn * 100) / 100,
          moneyOut: Math.round(totalMoneyOut * 100) / 100,
          gross: Math.round(totalGross * 100) / 100,
        };
      } else {
        // No licensee filter - process all locations with their individual gaming day offsets
        const allLocations = await db
          .collection('gaminglocations')
          .find(
            {
              $or: [
                { deletedAt: null },
                { deletedAt: { $lt: new Date('2020-01-01') } },
              ],
            },
            { projection: { _id: 1, gameDayOffset: 1 } }
          )
          .toArray();

        // Calculate gaming day ranges for each location
        const gamingDayRanges = getGamingDayRangesForLocations(
          allLocations.map(loc => ({
            _id: loc._id.toString(),
            gameDayOffset: loc.gameDayOffset || 0,
          })),
          timePeriod,
          customStartDate,
          customEndDate
        );

        let totalMoneyIn = 0;
        let totalMoneyOut = 0;
        let totalGross = 0;

        // Process each location separately with its gaming day range
        for (const location of allLocations) {
          const locationId = location._id.toString();
          const gameDayRange = gamingDayRanges.get(locationId);

          if (!gameDayRange) continue;

          // Get machines for this specific location
          const locationMachines = await db
            .collection('machines')
            .find(
              {
                gamingLocation: locationId,
                $or: [
                  { deletedAt: null },
                  { deletedAt: { $lt: new Date('2020-01-01') } },
                ],
              },
              { projection: { _id: 1 } }
            )
            .toArray();

          const locationMachineIds = locationMachines.map(m => m._id);

          if (locationMachineIds.length === 0) continue;

          // Aggregate data for this location using its gaming day range
          const locationPipeline: Document[] = [
            {
              $match: {
                machine: { $in: locationMachineIds },
                readAt: {
                  $gte: gameDayRange.rangeStart,
                  $lte: gameDayRange.rangeEnd,
                },
              },
            },
            {
              $group: {
                _id: null,
                totalDrop: { $sum: '$movement.drop' },
                totalCancelled: { $sum: '$movement.totalCancelledCredits' },
              },
            },
            {
              $project: {
                _id: 0,
                moneyIn: { $ifNull: ['$totalDrop', 0] },
                moneyOut: { $ifNull: ['$totalCancelled', 0] },
                gross: {
                  $subtract: [
                    { $ifNull: ['$totalDrop', 0] },
                    { $ifNull: ['$totalCancelled', 0] },
                  ],
                },
              },
            },
          ];

          const locationResult = await db
            .collection('meters')
            .aggregate(locationPipeline)
            .toArray();
          const locationTotals = locationResult[0] || {
            moneyIn: 0,
            moneyOut: 0,
            gross: 0,
          };

          totalMoneyIn += locationTotals.moneyIn;
          totalMoneyOut += locationTotals.moneyOut;
          totalGross += locationTotals.gross;
        }

        // Round to 2 decimal places
        totals = {
          moneyIn: Math.round(totalMoneyIn * 100) / 100,
          moneyOut: Math.round(totalMoneyOut * 100) / 100,
          gross: Math.round(totalGross * 100) / 100,
        };
      }
    }

    // Log final values
    console.warn('Final API response values:', {
      moneyIn: totals.moneyIn,
      moneyOut: totals.moneyOut,
      gross: totals.gross,
      currency: displayCurrency,
      converted: shouldApplyCurrencyConversion(licencee),
    });

    return NextResponse.json({
      ...totals,
      currency: displayCurrency,
      converted: shouldApplyCurrencyConversion(licencee),
    });
  } catch (error) {
    console.error('Error in dashboard totals API:', error);

    // Handle specific MongoDB connection errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      // MongoDB connection timeout
      if (
        errorMessage.includes('mongonetworktimeouterror') ||
        (errorMessage.includes('connection') &&
          errorMessage.includes('timed out'))
      ) {
        return NextResponse.json(
          {
            error: 'Database connection timeout',
            message:
              'The database is currently experiencing high load. Please try again in a few moments.',
            type: 'CONNECTION_TIMEOUT',
            retryable: true,
          },
          { status: 503 }
        );
      }

      // MongoDB server selection error
      if (
        errorMessage.includes('mongoserverselectionerror') ||
        errorMessage.includes('server selection')
      ) {
        return NextResponse.json(
          {
            error: 'Database server unavailable',
            message:
              'Unable to connect to the database server. Please try again later.',
            type: 'SERVER_UNAVAILABLE',
            retryable: true,
          },
          { status: 503 }
        );
      }

      // Generic MongoDB connection error
      if (
        errorMessage.includes('mongodb') ||
        errorMessage.includes('connection')
      ) {
        return NextResponse.json(
          {
            error: 'Database connection failed',
            message:
              'Unable to establish connection to the database. Please try again.',
            type: 'CONNECTION_ERROR',
            retryable: true,
          },
          { status: 503 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your request.',
        type: 'INTERNAL_ERROR',
        retryable: false,
      },
      { status: 500 }
    );
  }
}
