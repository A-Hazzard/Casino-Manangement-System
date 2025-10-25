import { NextRequest, NextResponse } from 'next/server';
import { getLocationsWithMetrics } from '@/app/api/lib/helpers/locationAggregation';
import { TimePeriod } from '@/app/api/lib/types';
import { getDatesForTimePeriod } from '../lib/utils/dates';
import { trinidadTimeToUtc } from '../lib/utils/timezone';
import { connectDB } from '@/app/api/lib/middleware/db';
import { LocationFilter } from '@/lib/types/location';
import {
  getCacheKey,
  getCachedData,
  setCachedData,
  clearCache,
} from '@/app/api/lib/helpers/cacheUtils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timePeriod = (searchParams.get('timePeriod') as TimePeriod) || '7d';
    const licencee = searchParams.get('licencee') || undefined;
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
      // For custom date ranges, convert from Trinidad time to UTC
      startDate = trinidadTimeToUtc(new Date(customStart));
      endDate = trinidadTimeToUtc(new Date(customEnd));
      customStartDate = new Date(customStart);
      customEndDate = new Date(customEnd);
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

    const result = {
      data: sortedRows,
      totalCount: totalCount,
      page,
      limit,
      hasMore: false,
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
