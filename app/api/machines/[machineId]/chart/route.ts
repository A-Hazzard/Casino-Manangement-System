/**
 * Machine Chart Data API Route
 *
 * This route handles fetching chart data for a single machine.
 * It supports:
 * - Time period filtering (today, week, month, custom dates)
 * - Currency conversion (Admin/Developer only)
 * - Gaming day offset calculations
 * - Hourly or daily aggregation based on time period
 *
 * @module app/api/machines/[machineId]/chart/route
 */

import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenseeFilter';
import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { Licencee } from '@/app/api/lib/models/licencee';
import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
  getLicenseeCurrency,
} from '@/lib/helpers/rates';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching chart data for a single machine
 *
 * Flow:
 * 1. Parse route parameters and query parameters
 * 2. Validate timePeriod or date range parameters
 * 3. Connect to database
 * 4. Fetch machine by ID
 * 5. Check user access to machine's location
 * 6. Fetch location details and gameDayOffset
 * 7. Calculate gaming day range
 * 8. Aggregate meter data by hour/day for chart
 * 9. Apply currency conversion if needed
 * 10. Transform and return chart data
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let machine: any = await Machine.findOne({
      _id: machineId,
    }).lean();

    if (!machine && machineId.length === 24 && /^[0-9a-fA-F]{24}$/.test(machineId)) {
      try {
        const { default: mongoose } = await import('mongoose');
        const objectId = new mongoose.Types.ObjectId(machineId);
        const db = mongoose.connection.db;
        if (db) {
          const machinesCollection = db.collection('machines');
          const machineDoc = await machinesCollection.findOne({
            _id: objectId,
          });
          if (machineDoc) {
            machine = machineDoc;
          }
        }
      } catch (objectIdError) {
        console.warn(`[Machine Chart API] Failed to query as ObjectId:`, objectIdError);
      }
    }

    if (!machine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 5: Check user access to machine's location
    // ============================================================================
    if (machine.gamingLocation) {
      const hasAccess = await checkUserLocationAccess(
        String(machine.gamingLocation)
      );
      if (!hasAccess) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized: You do not have access to this machine',
          },
          { status: 403 }
        );
      }
    }

    // ============================================================================
    // STEP 6: Fetch location details and gameDayOffset
    // ============================================================================
    let gameDayOffset = 8; // Default to 8 AM
    if (machine.gamingLocation) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const location: any = await GamingLocations.findOne({
          _id: machine.gamingLocation,
        })
          .select('gameDayOffset rel country')
          .lean();

        if (location) {
          gameDayOffset = location.gameDayOffset ?? 8;
        }
      } catch (error) {
        console.warn('Failed to fetch location for gameDayOffset:', error);
      }
    }

    // ============================================================================
    // STEP 7: Calculate gaming day range
    // ============================================================================
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (timePeriod === 'Custom' && startDateParam && endDateParam) {
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
      startDate = undefined;
      endDate = undefined;
    } else {
      const timePeriodForGamingDay = timePeriod || 'Today';
      const gamingDayRange = getGamingDayRangeForPeriod(
        timePeriodForGamingDay,
        gameDayOffset
      );
      startDate = gamingDayRange.rangeStart;
      endDate = gamingDayRange.rangeEnd;
    }

    // ============================================================================
    // STEP 8: Aggregate meter data by hour/day for chart
    // ============================================================================
    // Determine if we should use hourly aggregation
    const shouldUseHourly = timePeriod === 'Today' || timePeriod === 'Yesterday';
    const isCustomHourly =
      timePeriod === 'Custom' &&
      startDate &&
      endDate &&
      (() => {
        const diffInMs = endDate.getTime() - startDate.getTime();
        const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
        return diffInDays <= 1;
      })();

    const useHourly = shouldUseHourly || isCustomHourly;

    // Build aggregation pipeline
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pipeline: any[] = [];

    // Match stage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchStage: any = { machine: machineId };
    if (startDate && endDate) {
      matchStage.readAt = { $gte: startDate, $lte: endDate };
    }
    pipeline.push({ $match: matchStage });

    // Add fields for day and time
    pipeline.push({
      $addFields: {
        day: {
          $dateToString: {
            date: '$readAt',
            format: '%Y-%m-%d',
            timezone: 'UTC',
          },
        },
        time: useHourly
          ? {
              $dateToString: {
                date: '$readAt',
                format: '%H:00',
                timezone: 'UTC',
              },
            }
          : '00:00',
      },
    });

    // Group by day and time, summing movement fields
    pipeline.push({
      $group: {
        _id: {
          day: '$day',
          time: '$time',
        },
        drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
        totalCancelledCredits: {
          $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
        },
        jackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
      },
    });

    // Project final format
    pipeline.push({
      $project: {
        _id: 0,
        day: '$_id.day',
        time: '$_id.time',
        drop: 1,
        totalCancelledCredits: 1,
        gross: {
          $subtract: [
            { $subtract: ['$drop', '$jackpot'] },
            '$totalCancelledCredits',
          ],
        },
      },
    });

    // Sort by day and time
    pipeline.push({ $sort: { day: 1, time: 1 } });

    const chartData = await Meters.aggregate(pipeline);

    // ============================================================================
    // STEP 9: Apply currency conversion if needed
    // ============================================================================
    // For cabinet detail charts we ALWAYS convert from the machine's native currency
    // into the selected display currency (including USD), regardless of licensee filter or role.
    let convertedChartData = chartData;

    const shouldConvert = Boolean(displayCurrency);

    if (shouldConvert) {
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
      let nativeCurrency: CurrencyCode = 'USD';
      if (locationData?.rel?.licencee) {
        try {
          const licenseeDoc = await Licencee.findOne({
            _id: locationData.rel.licencee,
          })
            .select('name')
            .lean();

          if (licenseeDoc && !Array.isArray(licenseeDoc) && licenseeDoc.name) {
            nativeCurrency = getLicenseeCurrency(licenseeDoc.name);
          }
        } catch (licenseeError) {
          console.warn(
            '[Machine Chart API] Failed to resolve licensee for currency conversion:',
            licenseeError
          );
        }
      } else if (locationData?.country) {
        try {
          nativeCurrency = getCountryCurrency(locationData.country);
        } catch (countryError) {
          console.warn(
            '[Machine Chart API] Failed to resolve country for currency conversion:',
            countryError
          );
        }
      }

      // Convert from native currency to USD, then to display currency
      convertedChartData = chartData.map(item => {
        const dropUSD = convertToUSD(item.drop || 0, nativeCurrency);
        const cancelledUSD = convertToUSD(
          item.totalCancelledCredits || 0,
          nativeCurrency
        );
        const grossUSD = convertToUSD(item.gross || 0, nativeCurrency);

        return {
          ...item,
          drop: convertFromUSD(dropUSD, displayCurrency),
          totalCancelledCredits: convertFromUSD(
            cancelledUSD,
            displayCurrency
          ),
          gross: convertFromUSD(grossUSD, displayCurrency),
        };
      });
    }

    // ============================================================================
    // STEP 10: Transform and return chart data
    // ============================================================================
    const transformedData = convertedChartData.map(item => ({
      day: item.day,
      time: item.time || '',
      drop: item.drop || 0,
      totalCancelledCredits: item.totalCancelledCredits || 0,
      gross: item.gross || 0,
    }));

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Machine Chart API] Completed in ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch machine chart data';
    console.error(
      `[Machine Chart API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}



