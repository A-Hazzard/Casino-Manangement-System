import { NextRequest, NextResponse } from 'next/server';
import { getLocationsWithMetrics } from '@/app/api/lib/helpers/locationAggregation';
import { TimePeriod } from '@/app/api/lib/types';
import { getDatesForTimePeriod } from '../lib/utils/dates';
import { connectDB } from '@/app/api/lib/middleware/db';
import { LocationFilter } from '@/lib/types/location';
import {
  getCacheKey,
  getCachedData,
  setCachedData,
  clearCache,
} from '@/app/api/lib/helpers/cacheUtils';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { convertFromUSD, convertToUSD, getCountryCurrency } from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';
import { getUserFromServer } from '../lib/helpers/users';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timePeriod = (searchParams.get('timePeriod') as TimePeriod) || '7d';
    const licencee = searchParams.get('licencee') || undefined;
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';
    const machineTypeFilter =
      (searchParams.get('machineTypeFilter') as LocationFilter) || null;

    const clearCacheParam = searchParams.get('clearCache') === 'true';
    const sasEvaluationOnly = searchParams.get('sasEvaluationOnly') === 'true';
    const basicList = searchParams.get('basicList') === 'true';
    const selectedLocations = searchParams.get('selectedLocations');

    // Clear cache if requested (useful for testing)
    if (clearCacheParam) {
      clearCache();
    }

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    // For dropdown/basic lists and selectedLocations, ignore limit by passing a very large value
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 1000000;

    let startDate: Date | undefined, endDate: Date | undefined;
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
      // For custom date ranges, parse dates and let gaming day offset be applied
      // User sends: "2025-10-31" meaning Oct 31 gaming day
      // With 8 AM offset: Oct 31, 8:00 AM → Nov 1, 8:00 AM
      customStartDate = new Date(customStart + 'T00:00:00.000Z');
      customEndDate = new Date(customEnd + 'T00:00:00.000Z');
      
      // These will be used by getGamingDayRangesForLocations to calculate proper ranges
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      const { startDate: s, endDate: e } = getDatesForTimePeriod(timePeriod);
      startDate = s;
      endDate = e;
    }

    // Check cache first (unless cache was cleared)
    const cacheKey = getCacheKey({
      timePeriod,
      licencee,
      machineTypeFilter,
      startDate,
      endDate,
      page,
      limit,
      sasEvaluationOnly,
      basicList,
      selectedLocations,
      currency: displayCurrency, // Include currency in cache key
    });

    const skipCacheForSelected = Boolean(selectedLocations);

    // Check cache first
    if (!clearCacheParam && !skipCacheForSelected) {
      const cachedResult = getCachedData(cacheKey);
      if (cachedResult) {
        return NextResponse.json(cachedResult);
      }
    }

    const db = await connectDB();
    if (!db)
      return NextResponse.json(
        { error: 'DB connection failed' },
        { status: 500 }
      );

    // Quick data availability check with timeout
    const dataCheckPromise = Promise.all([
      db.collection('meters').countDocuments({}, { limit: 1 }),
      db.collection('gaminglocations').countDocuments({}, { limit: 1 }),
    ]);

    const dataCheckTimeout = new Promise(
      (_, reject) =>
        setTimeout(() => reject(new Error('Data check timeout')), 10000) // Increased timeout
    );

    try {
      await Promise.race([dataCheckPromise, dataCheckTimeout]);
    } catch (error) {
      console.warn('Data availability check failed, proceeding anyway:', error);
    }

    // Get aggregated data with optimized performance
    const { rows, totalCount } = await getLocationsWithMetrics(
      db,
      { startDate, endDate },
      licencee,
      page,
      limit,
      sasEvaluationOnly,
      basicList,
      selectedLocations || undefined,
      timePeriod,
      customStartDate,
      customEndDate
    );

    // Apply filters if needed
    let filteredRows = rows;
    if (machineTypeFilter) {
      // Handle comma-separated multiple filters
      const filters = machineTypeFilter.split(',').filter(f => f.trim() !== '');

      filteredRows = rows.filter(loc => {
        // Apply AND logic - location must match ALL selected filters
        return filters.every(filter => {
          switch (filter.trim()) {
            case 'LocalServersOnly':
              return loc.isLocalServer === true;
            case 'SMIBLocationsOnly':
              return loc.noSMIBLocation === false;
            case 'NoSMIBLocation':
              return loc.noSMIBLocation === true;
            default:
              return true;
          }
        });
      });
    }

    // Sort by money in descending order
    const sortedRows = filteredRows.sort(
      (a, b) => (b.moneyIn || 0) - (a.moneyIn || 0)
    );

    // Get current user's role to determine if currency conversion should apply
    const currentUser = await getUserFromServer();
    const currentUserRoles = (currentUser?.roles as string[]) || [];
    const isAdminOrDev = currentUserRoles.includes('admin') || currentUserRoles.includes('developer');
    
    // Apply currency conversion ONLY for Admin/Developer viewing "All Licensees"
    let convertedRows = sortedRows;
    if (isAdminOrDev && shouldApplyCurrencyConversion(licencee)) {
      // Get currency mappings
      const licenseesData = await db
        .collection('licencees')
        .find(
          {
            $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2020-01-01') } }],
          },
          { projection: { _id: 1, name: 1 } }
        )
        .toArray();

      const licenseeIdToName = new Map<string, string>();
      licenseesData.forEach(lic => {
        licenseeIdToName.set(lic._id.toString(), lic.name);
      });

      const countriesData = await db.collection('countries').find({}).toArray();
      const countryIdToName = new Map<string, string>();
      countriesData.forEach(country => {
        countryIdToName.set(country._id.toString(), country.name);
      });

      // Convert each location's financial data
      convertedRows = sortedRows.map(location => {
        const locationLicenseeId = location.rel?.licencee as string | undefined;

        if (!locationLicenseeId) {
          // Unassigned locations - determine currency from country
          const countryId = location.country as string | undefined;
          const countryName = countryId
            ? countryIdToName.get(countryId.toString())
            : undefined;
          const nativeCurrency = countryName
            ? getCountryCurrency(countryName)
            : 'USD';

          // Convert from country's native currency to display currency
          const moneyInUSD = convertToUSD(location.moneyIn || 0, nativeCurrency);
          const moneyOutUSD = convertToUSD(location.moneyOut || 0, nativeCurrency);
          const totalDropUSD = convertToUSD(location.totalDrop || 0, nativeCurrency);
          const grossUSD = convertToUSD(location.gross || 0, nativeCurrency);

          return {
            ...location,
            moneyIn: convertFromUSD(moneyInUSD, displayCurrency),
            moneyOut: convertFromUSD(moneyOutUSD, displayCurrency),
            totalDrop: convertFromUSD(totalDropUSD, displayCurrency),
            gross: convertFromUSD(grossUSD, displayCurrency),
          };
        }

        const licenseeName =
          licenseeIdToName.get(locationLicenseeId.toString()) || 'Unknown';

        // Convert from licensee's native currency to USD, then to display currency
        const moneyInUSD = convertToUSD(location.moneyIn || 0, licenseeName);
        const moneyOutUSD = convertToUSD(location.moneyOut || 0, licenseeName);
        const totalDropUSD = convertToUSD(location.totalDrop || 0, licenseeName);
        const grossUSD = convertToUSD(location.gross || 0, licenseeName);

        return {
          ...location,
          moneyIn: convertFromUSD(moneyInUSD, displayCurrency),
          moneyOut: convertFromUSD(moneyOutUSD, displayCurrency),
          totalDrop: convertFromUSD(totalDropUSD, displayCurrency),
          gross: convertFromUSD(grossUSD, displayCurrency),
        };
      });
    }

    const result = {
      data: convertedRows,
      totalCount: totalCount,
      page,
      limit,
      hasMore: false,
      currency: displayCurrency,
      converted: shouldApplyCurrencyConversion(licencee),
    };

    // Cache the result (unless cache was cleared)
    if (!clearCacheParam && !skipCacheForSelected) {
      setCachedData(cacheKey, result);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      ' LocationAggregation API Error:',
      error instanceof Error ? error.message : String(error)
    );

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
