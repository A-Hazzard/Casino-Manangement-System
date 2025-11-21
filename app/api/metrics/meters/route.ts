import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import type { ParamsType } from '@shared/types';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
} from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';
import { ObjectId } from 'mongodb';
import {
  assertAnyPageAccess,
  assertLicenseeScope,
  buildApiAuthContext,
  handleApiError,
  resolveAllowedLocations,
} from '@/lib/utils/apiAuth';

/**
 * Retrieves **meter trend data** for gaming locations based on a specified **time period** or a **Custom date range**.
 *
 * **Request Parameters**
 * - `timePeriod` (optional) - **"today"**, **"yesterday"**, **"7d"**, **"30d"**, or `"all"`.
 * - `startDate` (optional) - A **Custom start date** (`YYYY-MM-DD` format). Must be used with `endDate`.
 * - `endDate` (optional) - A **Custom end date** (`YYYY-MM-DD` format). Must be used with `startDate`.
 * - `licencee` (optional) - A **licencee ID** to filter gaming locations.
 *
 * **Response Format**
 *
 * For a licencee-filtered query, the response will be in the form:
 * ```json
 * {
 *    "result": [
 *      {
 *         "location": "240614a7ad184038a6ef0347",
 *         "drop": 477,
 *         "totalCancelledCredits": 100,
 *         "gross": 377
 *      },
 *      ...
 *    ]
 * }
 * ```
 *
 * @param req - The incoming HTTP request object
 * @returns JSON response containing the requested **meter trend data** or an error message
 */
export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());

    const { startDate, endDate } = params;
    const timePeriod = params.timePeriod;
    const rawLicencee =
      params.licencee || params.licensee || params.licenceeId || '';
    const licencee =
      rawLicencee && rawLicencee !== 'all' ? String(rawLicencee) : '';
    const displayCurrency =
      (params.currency as CurrencyCode | undefined) || 'USD';

    const auth = await buildApiAuthContext();
    assertAnyPageAccess(auth.roles, ['dashboard', 'collection-report', 'reports']);
    assertLicenseeScope(licencee, auth.accessibleLicensees);

    const accessibleLicensees = auth.accessibleLicensees;
    const userRoles = auth.roles;
    const userLocationPermissions = auth.locationPermissions;

    const db = await connectDB();
    if (!db) {
      console.error('Database connection not established');
      return NextResponse.json(
        { error: 'Database connection not established' },
        { status: 500 }
      );
    }

    // Only proceed if timePeriod is provided - no fallback
    if (!timePeriod) {
      return NextResponse.json(
        { error: 'timePeriod parameter is required' },
        { status: 400 }
      );
    }

    const isAdminOrDev =
      userRoles.includes('admin') || userRoles.includes('developer');
    const shouldConvert =
      isAdminOrDev && shouldApplyCurrencyConversion(licencee || 'all');

    // Ensure type safety for timePeriod and licencee
    const apiParams: ParamsType = {
      timePeriod: timePeriod as ParamsType['timePeriod'],
      licencee: licencee || '',
    };
    let customStartDate: Date | undefined;
    let customEndDate: Date | undefined;

    if (timePeriod === 'Custom') {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'Custom startDate and endDate are required' },
          { status: 400 }
        );
      }
      customStartDate = new Date(startDate);
      customEndDate = new Date(endDate);
      if (Number.isNaN(customStartDate.getTime()) || Number.isNaN(customEndDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid custom date range.' },
          { status: 400 }
        );
      }
    }

    // Determine accessible locations
    const locationsCollection = db.collection('gaminglocations');
    const locationQuery: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    };

    if (licencee) {
      locationQuery['rel.licencee'] = licencee;
    }

    let locations = await locationsCollection
      .find(locationQuery, {
        projection: {
          _id: 1,
          gameDayOffset: 1,
          country: 1,
          geoCoords: 1,
          rel: 1,
        },
      })
      .toArray();

    const isManager = userRoles.includes('manager');
    const isAdmin =
      accessibleLicensees === 'all' ||
      userRoles.includes('admin') ||
      userRoles.includes('developer');

      if (licencee) {
        if (!isAdmin && !isManager) {
          if (userLocationPermissions.length === 0) {
            return NextResponse.json([]);
          }
          const permissionSet = new Set(
            userLocationPermissions.map(id => id.toString())
          );
          locations = locations.filter(location =>
            permissionSet.has(location._id.toString())
          );
        }
      } else {
        const allowedLocationIds = await resolveAllowedLocations(auth);

        if (allowedLocationIds === 'all') {
          // no filtering
        } else if (allowedLocationIds.length === 0) {
          return NextResponse.json([]);
        } else {
          const allowedSet = new Set(
            allowedLocationIds.map(id => id.toString())
          );
          locations = locations.filter(location =>
            allowedSet.has(location._id.toString())
          );
        }
      }

    if (locations.length === 0) {
      return NextResponse.json([]);
    }

    const locationRangeInput = locations.map(location => ({
      _id: location._id.toString(),
      gameDayOffset: location.gameDayOffset ?? 8,
    }));

    const gamingDayRanges = getGamingDayRangesForLocations(
      locationRangeInput,
      timePeriod,
      customStartDate,
      customEndDate
    );

    const shouldUseHourlyAggregation =
      timePeriod === 'Today' ||
      timePeriod === 'Yesterday' ||
      (timePeriod === 'Custom' &&
        customStartDate &&
        customEndDate &&
        Math.ceil(
          (customEndDate.getTime() - customStartDate.getTime()) /
            (1000 * 60 * 60 * 24)
        ) <= 1);

    const locationIds = locations.map(location => location._id.toString());
    const machineDocs = await db
      .collection('machines')
      .find(
        {
          gamingLocation: { $in: locationIds },
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2020-01-01') } },
          ],
        },
        { projection: { _id: 1, gamingLocation: 1 } }
      )
      .toArray();

    const machinesByLocation = new Map<string, string[]>();
    for (const machine of machineDocs) {
      const locId =
        typeof machine.gamingLocation === 'string'
          ? machine.gamingLocation
          : machine.gamingLocation?.toString();
      if (!locId) continue;
      if (!machinesByLocation.has(locId)) {
        machinesByLocation.set(locId, []);
      }
      machinesByLocation.get(locId)!.push(machine._id.toString());
    }

    const metricsPerLocation: Array<{
      day: string;
      time: string;
      drop: number;
      totalCancelledCredits: number;
      gross: number;
      gamesPlayed: number;
      jackpot: number;
      licencee?: string | null;
      country?: string | null;
      location?: string;
      geoCoords?: Record<string, unknown> | null;
    }> = [];

    const BATCH_SIZE = 20;
    for (let i = 0; i < locations.length; i += BATCH_SIZE) {
      const batch = locations.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async location => {
          const locationId = location._id.toString();
          const machineIds = machinesByLocation.get(locationId);
          if (!machineIds || machineIds.length === 0) {
            return [];
          }

          const range = gamingDayRanges.get(locationId);
          if (!range) {
            return [];
          }

          const pipeline = [
            {
              $match: {
                machine: { $in: machineIds },
                readAt: {
                  $gte: range.rangeStart,
                  $lte: range.rangeEnd,
                },
              },
            },
            {
              $addFields: {
                day: {
                  $dateToString: {
                    date: '$readAt',
                    format: '%Y-%m-%d',
                    timezone: 'UTC',
                  },
                },
                time: shouldUseHourlyAggregation
                  ? {
                      $dateToString: {
                        date: '$readAt',
                        format: '%H:%M',
                        timezone: 'UTC',
                      },
                    }
                  : '00:00',
              },
            },
            {
              $group: {
                _id: {
                  day: '$day',
                  time: '$time',
                },
                totalDrop: { $sum: '$movement.drop' },
                totalCancelledCredits: {
                  $sum: '$movement.totalCancelledCredits',
                },
                totalJackpot: { $sum: '$movement.jackpot' },
                totalGamesPlayed: { $sum: '$movement.gamesPlayed' },
              },
            },
            {
              $project: {
                _id: 0,
                day: '$_id.day',
                time: '$_id.time',
                drop: { $ifNull: ['$totalDrop', 0] },
                totalCancelledCredits: {
                  $ifNull: ['$totalCancelledCredits', 0],
                },
                gross: {
                  $subtract: [
                    {
                      $subtract: [
                        { $ifNull: ['$totalDrop', 0] },
                        { $ifNull: ['$totalJackpot', 0] },
                      ],
                    },
                    { $ifNull: ['$totalCancelledCredits', 0] },
                  ],
                },
                gamesPlayed: { $ifNull: ['$totalGamesPlayed', 0] },
                jackpot: { $ifNull: ['$totalJackpot', 0] },
              },
            },
            { $sort: { day: 1, time: 1 } },
          ];

          type PipelineMetric = {
            day: string;
            time: string;
            drop: number;
            totalCancelledCredits: number;
            gross: number;
            gamesPlayed: number;
            jackpot: number;
          };

          const results = await db
            .collection('meters')
            .aggregate<PipelineMetric>(pipeline, {
              allowDiskUse: true,
              hint: { machine: 1, readAt: 1 },
            })
            .toArray();

          return results.map(metric => ({
            ...metric,
            licencee:
              typeof location.rel?.licencee === 'string'
                ? location.rel.licencee
                : Array.isArray(location.rel?.licencee)
                  ? location.rel?.licencee?.[0]?.toString() ?? null
                  : null,
            country: location.country ? location.country.toString() : null,
            location: locationId,
            geoCoords: location.geoCoords ?? null,
          }));
        })
      );

      metricsPerLocation.push(...batchResults.flat());
    }

    if (metricsPerLocation.length === 0) {
      return NextResponse.json([]);
    }

    if (apiParams.licencee) {
      if (metricsPerLocation.length > 0) {
        // console.log("Metrics successfully retrieved for licencee");
      } else {
        console.error(
          `No metrics data found for licencee ${apiParams.licencee}`
        );
      }
    } else {
      // console.log("Metrics successfully retrieved");
    }

    // Aggregate by day/time, applying currency conversion when necessary
    type AggregatedMetric = {
      day: string;
      time: string;
      drop: number;
      totalCancelledCredits: number;
      gross: number;
      gamesPlayed: number;
      jackpot: number;
    };

    const aggregatedMap = new Map<string, AggregatedMetric>();

    // Preload licensee and country metadata when conversion is needed
    const licenseeIdToName = new Map<string, string>();
    const countryIdToName = new Map<string, string>();

    if (shouldConvert) {
      const licenceeIds = Array.from(
        new Set(
          metricsPerLocation
            .map(metric => metric.licencee)
            .filter((id): id is string => Boolean(id))
        )
      );
      if (licenceeIds.length > 0) {
        const licenseeDocs = await db
          .collection('licencees')
          .find(
            {
              _id: {
                $in: licenceeIds.map(id => {
                  try {
                    return new ObjectId(id);
                  } catch {
                    return null;
                  }
                }).filter((id): id is ObjectId => id !== null),
              },
            },
            { projection: { name: 1 } }
          )
          .toArray();
        licenseeDocs.forEach(doc => {
          licenseeIdToName.set(doc._id.toString(), doc.name);
        });
      }

      const countryIds = Array.from(
        new Set(
          metricsPerLocation
            .map(metric => metric.country)
            .filter((id): id is string => Boolean(id))
        )
      );
      if (countryIds.length > 0) {
        const countryDocs = await db
          .collection('countries')
          .find(
            {
              _id: {
                $in: countryIds.map(id => {
                  try {
                    return new ObjectId(id);
                  } catch {
                    return null;
                  }
                }).filter((id): id is ObjectId => id !== null),
              },
            },
            { projection: { name: 1 } }
          )
          .toArray();
        countryDocs.forEach(doc => {
          countryIdToName.set(doc._id.toString(), doc.name);
        });
      }
    }

    const accumulator = (
      key: string,
      day: string,
      time: string,
      dropValue: number,
      cancelledValue: number,
      grossValue: number,
      gamesPlayedValue: number,
      jackpotValue: number
    ) => {
      const existing = aggregatedMap.get(key);
      if (existing) {
        existing.drop += dropValue;
        existing.totalCancelledCredits += cancelledValue;
        existing.gross += grossValue;
        existing.gamesPlayed += gamesPlayedValue;
        existing.jackpot += jackpotValue;
      } else {
        aggregatedMap.set(key, {
          day,
          time,
          drop: dropValue,
          totalCancelledCredits: cancelledValue,
          gross: grossValue,
          gamesPlayed: gamesPlayedValue,
          jackpot: jackpotValue,
        });
      }
    };

    for (const metric of metricsPerLocation) {
      const day = metric.day;
      const time = metric.time ?? '00:00';
      const key = `${day}__${time}`;
      const gamesPlayedValue = Number(metric.gamesPlayed ?? 0);

      if (shouldConvert) {
        let nativeCurrency = 'USD';
        if (metric.licencee) {
          nativeCurrency =
            licenseeIdToName.get(metric.licencee) || metric.licencee || 'USD';
        } else if (metric.country) {
          const countryName = countryIdToName.get(metric.country);
          nativeCurrency = countryName
            ? getCountryCurrency(countryName) || 'USD'
            : 'USD';
        }

        const dropUSD = convertToUSD(Number(metric.drop) || 0, nativeCurrency);
        const cancelledUSD = convertToUSD(
          Number(metric.totalCancelledCredits) || 0,
          nativeCurrency
        );
        const grossUSD = convertToUSD(
          Number(metric.gross) || 0,
          nativeCurrency
        );
        const jackpotUSD = convertToUSD(
          Number(metric.jackpot) || 0,
          nativeCurrency
        );

        const convertedDrop = convertFromUSD(dropUSD, displayCurrency);
        const convertedCancelled = convertFromUSD(
          cancelledUSD,
          displayCurrency
        );
        const convertedGross = convertFromUSD(grossUSD, displayCurrency);
        const convertedJackpot = convertFromUSD(jackpotUSD, displayCurrency);

        accumulator(
          key,
          day,
          time,
          convertedDrop,
          convertedCancelled,
          convertedGross,
          gamesPlayedValue,
          convertedJackpot
        );
      } else {
        accumulator(
          key,
          day,
          time,
          Number(metric.drop) || 0,
          Number(metric.totalCancelledCredits) || 0,
          Number(metric.gross) || 0,
          gamesPlayedValue,
          Number(metric.jackpot) || 0
        );
      }
    }

    const aggregatedMetrics = Array.from(aggregatedMap.values()).sort(
      (a, b) => {
        if (a.day === b.day) {
          return a.time.localeCompare(b.time);
        }
        return a.day.localeCompare(b.day);
      }
    );

    return NextResponse.json(aggregatedMetrics);
  } catch (error) {
    const handled = handleApiError(error);
    if (handled) {
      return handled;
    }
    console.error('Error in metrics API:', error);

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
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? { message: error.message, stack: error.stack }
            : undefined,
      },
      { status: 500 }
    );
  }
}
