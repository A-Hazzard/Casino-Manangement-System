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
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
  getLicenseeCurrency,
} from '@/lib/helpers/rates';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import type { GamingMachine } from '@/shared/types/entities';
import { PipelineStage } from 'mongoose';
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
    const granularity = searchParams.get('granularity') as
      | 'hourly'
      | 'minute'
      | 'daily'
      | 'weekly'
      | 'monthly'
      | null;

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
    let machine = await Machine.findOne({
      _id: machineId,
    }).lean<GamingMachine | null>();

    if (
      !machine &&
      machineId.length === 24 &&
      /^[0-9a-fA-F]{24}$/.test(machineId)
    ) {
      try {
        const { default: mongoose } = await import('mongoose');
        const objectId = new mongoose.Types.ObjectId(machineId);
        // Use Mongoose model with ObjectId for legacy data
        const machineDoc = await Machine.findOne({
          _id: objectId as unknown as string,
        }).lean<GamingMachine | null>();
        if (machineDoc) {
          machine = machineDoc;
        }
      } catch (objectIdError) {
        console.warn(
          `[Machine Chart API] Failed to query as ObjectId:`,
          objectIdError
        );
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
        const location = await GamingLocations.findOne({
          _id: machine.gamingLocation,
        })
          .select('gameDayOffset rel country')
          .lean<{
            gameDayOffset?: number;
            rel?: { licencee?: string };
            country?: string;
          } | null>();

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
      // Parse ISO timestamps with timezone offset (sent from frontend with local time + offset)
      // Frontend sends with times: "2025-12-07T11:45:00-04:00" (Trinidad local time with offset)
      // Frontend sends date-only: "2025-12-07" (for gaming day offset to apply)
      // new Date() correctly parses timezone-aware strings and converts to UTC internally
      // For custom time periods, use the exact times provided without gaming day expansion
      // This ensures the chart and metrics match the user's selected time range exactly
      const customStart = new Date(startDateParam);
      const customEnd = new Date(endDateParam);

      // Validate dates
      if (isNaN(customStart.getTime()) || isNaN(customEnd.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid date parameters' },
          { status: 400 }
        );
      }

      // Use exact times provided - no gaming day expansion for custom ranges
      // Date objects are already in UTC internally (JavaScript Date always stores UTC)
      // This is correct for MongoDB queries which expect UTC dates
      startDate = customStart;
      endDate = customEnd;
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
    // For Quarterly and All Time, detect actual data span from Meters collection
    // Note: For Quarterly, we limit the query to the last 90 days, but detect the actual
    // data span WITHIN that 90-day range for granularity calculation.
    // For All Time, we use the full data span.
    let actualDataSpan: { minDate: Date | null; maxDate: Date | null } | null =
      null;
    if (timePeriod === 'Quarterly' || timePeriod === 'All Time') {
      // For Quarterly, query within the 90-day range
      // For All Time, query all data
      const matchStage: Record<string, unknown> = { machine: machineId };
      if (timePeriod === 'Quarterly' && startDate && endDate) {
        // Limit to the 90-day range for Quarterly
        matchStage.readAt = { $gte: startDate, $lte: endDate };
      }

      const dateRangeResult = await Meters.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            minDate: { $min: '$readAt' },
            maxDate: { $max: '$readAt' },
          },
        },
      ]).exec();

      if (
        dateRangeResult.length > 0 &&
        dateRangeResult[0].minDate &&
        dateRangeResult[0].maxDate
      ) {
        const minDate = dateRangeResult[0].minDate as Date;
        const maxDate = dateRangeResult[0].maxDate as Date;
        actualDataSpan = {
          minDate,
          maxDate,
        };

        // For All Time, use the full data span
        // For Quarterly, keep the 90-day limit (startDate/endDate already set above)
        if (timePeriod === 'All Time') {
          startDate = minDate;
          endDate = maxDate;
        }
        // For Quarterly, startDate and endDate are already set to 90 days above, so we don't overwrite them
      }
    }

    // Determine aggregation granularity based on time range and manual granularity
    let useHourly = false;
    let useMinute = false;
    let useMonthly = false;
    const useYearly = false;
    let useWeekly = false;
    let useDaily = false;

    // If granularity is manually specified, use it
    if (granularity) {
      if (granularity === 'minute') {
        useMinute = true;
      } else if (granularity === 'hourly') {
        useHourly = true;
      } else if (granularity === 'daily') {
        useDaily = true;
      } else if (granularity === 'weekly') {
        useWeekly = true;
      } else if (granularity === 'monthly') {
        useMonthly = true;
      }
    } else {
      // Auto-detect granularity
      if (timePeriod === 'Today' || timePeriod === 'Yesterday') {
        useHourly = true;
      } else if (timePeriod === 'Custom' && startDate && endDate) {
        // Check if date strings have time components (not date-only)
        const hasTimeComponents =
          startDateParam &&
          endDateParam &&
          (startDateParam.includes('T') || endDateParam.includes('T'));

        if (hasTimeComponents) {
          const diffInMs = endDate.getTime() - startDate.getTime();
          const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

          // For custom ranges with time inputs:
          // - Default to hourly for all ranges <= 1 day
          // - Use daily if > 1 day
          if (diffInDays <= 1) {
            useHourly = true;
          } else {
            useDaily = true;
          }
        } else {
          // Date-only custom range: use hourly if <= 1 day
          const diffInMs = endDate.getTime() - startDate.getTime();
          const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
          if (diffInDays <= 1) {
            useHourly = true;
          } else {
            useDaily = true;
          }
        }
      } else if (timePeriod === 'Quarterly' || timePeriod === 'All Time') {
        // For Quarterly and All Time, default to daily aggregation if no manual granularity
        useDaily = true;
      } else {
        // For other periods (7d, 30d), default to daily
        useDaily = true;
      }
    }

    // Build aggregation pipeline
    const pipeline: PipelineStage[] = [];

    // Match stage
    const matchStage: Record<string, unknown> = { machine: machineId };
    if (startDate && endDate) {
      matchStage.readAt = { $gte: startDate, $lte: endDate };
    }
    pipeline.push({ $match: matchStage });

    // Add fields for day and time based on granularity
    const groupId: Record<string, unknown> = {};

    if (useYearly) {
      groupId.year = {
        $dateToString: {
          date: '$readAt',
          format: '%Y',
          timezone: 'UTC',
        },
      };
    } else if (useMonthly) {
      groupId.month = {
        $dateToString: {
          date: '$readAt',
          format: '%Y-%m',
          timezone: 'UTC',
        },
      };
    } else if (useWeekly) {
      // Group by week - use start of week (Monday)
      // $dayOfWeek returns 1 (Sunday) to 7 (Saturday)
      // We want Monday (2) to be day 0, so subtract (dayOfWeek - 2) days
      // For Sunday (1), we need to subtract 6 days to get previous Monday
      groupId.day = {
        $dateToString: {
          date: {
            $subtract: [
              '$readAt',
              {
                $multiply: [
                  {
                    $cond: {
                      if: { $eq: [{ $dayOfWeek: '$readAt' }, 1] },
                      then: 6, // Sunday: subtract 6 days to get previous Monday
                      else: {
                        $subtract: [{ $dayOfWeek: '$readAt' }, 2],
                      }, // Monday-Saturday: subtract (dayOfWeek - 2) days
                    },
                  },
                  24 * 60 * 60 * 1000,
                ],
              },
            ],
          },
          format: '%Y-%m-%d',
          timezone: 'UTC',
        },
      };
      groupId.week = { $week: '$readAt' };
    } else if (useDaily) {
      groupId.day = {
        $dateToString: {
          date: '$readAt',
          format: '%Y-%m-%d',
          timezone: 'UTC',
        },
      };
    }

    // Add fields based on granularity
    if (useMinute || useHourly) {
      pipeline.push({
        $addFields: {
          day: {
            $dateToString: {
              date: '$readAt',
              format: '%Y-%m-%d',
              timezone: 'UTC',
            },
          },
          time: useMinute
            ? {
                $dateToString: {
                  date: '$readAt',
                  format: '%H:%M',
                  timezone: 'UTC',
                },
              }
            : {
                $dateToString: {
                  date: '$readAt',
                  format: '%H:00',
                  timezone: 'UTC',
                },
              },
        },
      });
    } else {
      // For daily/weekly/monthly/yearly, add appropriate fields
      const addFieldsStage: Record<string, unknown> = {
        time: '00:00',
      };

      if (useYearly && groupId.year) {
        addFieldsStage.year = groupId.year;
        addFieldsStage.day = {
          $dateToString: {
            date: '$readAt',
            format: '%Y-01-01',
            timezone: 'UTC',
          },
        };
      } else if (useMonthly && groupId.month) {
        addFieldsStage.month = groupId.month;
        addFieldsStage.day = {
          $dateToString: {
            date: '$readAt',
            format: '%Y-%m-01',
            timezone: 'UTC',
          },
        };
      } else if (useWeekly && groupId.day) {
        addFieldsStage.day = groupId.day;
        addFieldsStage.week = groupId.week;
      } else if (useDaily && groupId.day) {
        addFieldsStage.day = groupId.day;
      } else {
        // Fallback to daily
        addFieldsStage.day = {
          $dateToString: {
            date: '$readAt',
            format: '%Y-%m-%d',
            timezone: 'UTC',
          },
        };
      }

      pipeline.push({ $addFields: addFieldsStage });
    }

    // Group by appropriate fields, summing movement fields
    const groupStageId: Record<string, unknown> = {
      day: '$day',
      time: '$time',
    };

    // Add additional grouping fields if needed
    if (useYearly && groupId.year) {
      groupStageId.year = '$year';
    } else if (useMonthly && groupId.month) {
      groupStageId.month = '$month';
    } else if (useWeekly && groupId.week) {
      groupStageId.week = '$week';
    }

    pipeline.push({
      $group: {
        _id: groupStageId,
        drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
        totalCancelledCredits: {
          $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
        },
        jackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
      },
    });

    // Project final format
    const projectStage: Record<string, unknown> = {
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
    };

    // Include month field for monthly aggregation to ensure proper grouping
    if (useMonthly && groupId.month) {
      projectStage.month = '$_id.month';
    }

    pipeline.push({
      $project: projectStage,
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
          totalCancelledCredits: convertFromUSD(cancelledUSD, displayCurrency),
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
      dataSpan:
        actualDataSpan && actualDataSpan.minDate && actualDataSpan.maxDate
          ? {
              minDate: actualDataSpan.minDate.toISOString(),
              maxDate: actualDataSpan.maxDate.toISOString(),
            }
          : undefined,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to fetch machine chart data';
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
