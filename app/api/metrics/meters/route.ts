import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';
import { getDatesForTimePeriod } from '@/app/api/lib/utils/dates';
import { getMetricsForLocations } from '@/app/api/lib/helpers/meters/aggregations';
import type { ParamsType } from '@shared/types';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
} from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';
import { getUserAccessibleLicenseesFromToken } from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { ObjectId } from 'mongodb';

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
    const db = await connectDB();
    if (!db) {
      console.error('Database connection not established');
      return NextResponse.json(
        { error: 'Database connection not established' },
        { status: 500 }
      );
    }
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());

    let { startDate, endDate } = params;
    const timePeriod = params.timePeriod;
    const rawLicencee =
      params.licencee || params.licensee || params.licenceeId || '';
    const licencee =
      rawLicencee && rawLicencee !== 'all' ? String(rawLicencee) : '';
    const displayCurrency =
      (params.currency as CurrencyCode | undefined) || 'USD';

    // Only proceed if timePeriod is provided - no fallback
    if (!timePeriod) {
      return NextResponse.json(
        { error: 'timePeriod parameter is required' },
        { status: 400 }
      );
    }

    // Determine user access and roles for conversion rules
    const accessibleLicensees = await getUserAccessibleLicenseesFromToken();
    const userPayload = await getUserFromServer();
    const userRoles = (userPayload?.roles as string[]) || [];
    const isAdminOrDev =
      userRoles.includes('admin') || userRoles.includes('developer');
    const shouldConvert =
      isAdminOrDev && shouldApplyCurrencyConversion(licencee || 'all');

    // Validate specific licensee access if provided
    if (licencee && accessibleLicensees !== 'all') {
      if (!accessibleLicensees.includes(licencee)) {
        return NextResponse.json(
          { error: 'Unauthorized: You do not have access to this licensee' },
          { status: 403 }
        );
      }
    }

    // Ensure type safety for timePeriod and licencee
    const apiParams: ParamsType = {
      timePeriod: timePeriod as ParamsType['timePeriod'],
      licencee: licencee || '',
    };
    if (startDate && endDate) {
      // For custom date ranges, the frontend sends dates that already represent Trinidad time
      // We need to convert them to UTC for database queries by adding 4 hours
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Convert Trinidad time to UTC by adding 4 hours
      startDate = new Date(start.getTime() + 4 * 60 * 60 * 1000).toISOString();
      endDate = new Date(end.getTime() + 4 * 60 * 60 * 1000).toISOString();
    } else {
      const dates = getDatesForTimePeriod(apiParams.timePeriod);
      startDate = dates.startDate?.toISOString() || 'All Time';
      endDate = dates.endDate?.toISOString() || 'All Time';
    }

    if (!startDate || !endDate) {
      console.error('Invalid date range provided.');
      return NextResponse.json(
        { error: 'Invalid date range.' },
        { status: 400 }
      );
    }

    // console.log(`Fetching meters for ${apiParams.timePeriod}...`);

    // Handle "All Time" case - pass undefined dates for "All Time" periods
    let dateFilter: { startDate: Date | undefined; endDate: Date | undefined };
    if (startDate !== 'All Time' && endDate !== 'All Time') {
      dateFilter = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };
    } else {
      dateFilter = { startDate: undefined, endDate: undefined };
    }

    const metrics = await getMetricsForLocations(
      db,
      dateFilter,
      false,
      licencee || undefined,
      apiParams.timePeriod
    );

    if (metrics.length === 0) {
      return NextResponse.json([]);
    }

    if (apiParams.licencee) {
      if (metrics.length > 0) {
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
          metrics
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
          metrics
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

    for (const metric of metrics) {
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
      },
      { status: 500 }
    );
  }
}
