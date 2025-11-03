import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { getDatesForTimePeriod } from '@/lib/utils/dates';
import { TimePeriod } from '@/shared/types';
import type { PipelineStage } from 'mongoose';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import type { CurrencyCode } from '@/shared/types/currency';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';

type DailyTrendItem = {
  day: string;
  time?: string;
  location: string;
  handle: number;
  winLoss: number;
  jackpot: number;
  plays: number;
  drop: number;
  totalCancelledCredits: number;
  gross: number;
};

type LocationTrendData = {
  day: string;
  time?: string;
  [locationId: string]:
    | {
        handle: number;
        winLoss: number;
        jackpot: number;
        plays: number;
        drop: number;
        gross: number;
      }
    | string
    | undefined;
};

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

    const { searchParams } = new URL(req.url);
    const locationIds = searchParams.get('locationIds');
    const timePeriod =
      (searchParams.get('timePeriod') as TimePeriod) || 'Today';
    const licencee = searchParams.get('licencee');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';

    if (!locationIds) {
      return NextResponse.json(
        { error: 'Location IDs are required' },
        { status: 400 }
      );
    }

    // Get date range
    let startDate: Date | undefined, endDate: Date | undefined;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      const dateRange = getDatesForTimePeriod(timePeriod);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    }

    if (!startDate || !endDate) {
      const now = new Date();
      endDate = now;
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const targetLocations = locationIds.split(',').map(id => id.trim());

    // Fetch locations to get their gaming day offsets
    const locationsData = await db
      .collection('gaminglocations')
      .find(
        { _id: { $in: targetLocations } } as never,
        { projection: { _id: 1, name: 1, gameDayOffset: 1, rel: 1, country: 1 } }
      )
      .toArray();

    // Calculate gaming day ranges for all locations
    const locationsList = locationsData.map((loc) => ({
      _id: String(loc._id),
      gameDayOffset: loc.gameDayOffset || 0,
    }));

    const gamingDayRanges = getGamingDayRangesForLocations(
      locationsList,
      timePeriod,
      timePeriod === 'Custom' ? startDate : undefined,
      timePeriod === 'Custom' ? endDate : undefined
    );

    // Use the first location's gaming day range (they should all be similar)
    const firstLocationRange = gamingDayRanges.get(targetLocations[0]);
    const queryStartDate = firstLocationRange?.rangeStart || startDate;
    const queryEndDate = firstLocationRange?.rangeEnd || endDate;

    // Determine if we should use hourly or daily aggregation
    let shouldUseHourlyAggregation = false;

    if (timePeriod === 'Today' || timePeriod === 'Yesterday') {
      shouldUseHourlyAggregation = true;
    } else if (timePeriod === 'Custom' && startDate && endDate) {
      const diffInMs = endDate.getTime() - startDate.getTime();
      const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
      shouldUseHourlyAggregation = diffInDays <= 1;
    }

    // Build aggregation pipeline with gaming day range
    const pipeline = [
      {
        $match: {
          readAt: { $gte: queryStartDate, $lte: queryEndDate },
          location: { $in: targetLocations },
        },
      },
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'location',
          foreignField: '_id',
          as: 'locationDetails',
        },
      },
      {
        $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true },
      },
    ];

    // Add licensee filter if specified
    if (licencee && licencee !== 'all') {
      (pipeline as PipelineStage[]).push({
        $match: {
          'locationDetails.rel.licencee': licencee,
        },
      });
    }

    // Group by location and time interval (day or day+hour)
    const groupId: Record<string, unknown> = {
      location: '$location',
      day: {
        $dateToString: {
          format: '%Y-%m-%d',
          date: '$readAt',
        },
      },
    };

    if (shouldUseHourlyAggregation) {
      groupId.time = {
        $dateToString: {
          format: '%H:00',
          date: '$readAt',
        },
      };
    }

    (pipeline as PipelineStage[]).push(
      {
        $group: {
          _id: groupId,
          handle: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
          winLoss: {
            $sum: {
              $subtract: [
                { $ifNull: ['$movement.coinIn', 0] },
                { $ifNull: ['$movement.coinOut', 0] },
              ],
            },
          },
          jackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
          plays: { $sum: { $ifNull: ['$movement.gamesPlayed', 0] } },
          drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
          totalCancelledCredits: {
            $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
          },
          gross: {
            $sum: {
              $subtract: [
                { $ifNull: ['$movement.drop', 0] },
                { $ifNull: ['$movement.totalCancelledCredits', 0] },
              ],
            },
          },
        },
      } as PipelineStage,
      { $sort: { '_id.day': 1, '_id.time': 1 } } as PipelineStage,
      {
        $project: {
          _id: 0,
          day: '$_id.day',
          time: '$_id.time',
          location: '$_id.location',
          handle: 1,
          winLoss: 1,
          jackpot: 1,
          plays: 1,
          drop: 1,
          totalCancelledCredits: 1,
          gross: 1,
        },
      } as PipelineStage
    );

    const dailyData = (await db
      .collection('meters')
      .aggregate(pipeline)
      .toArray()) as DailyTrendItem[];

    // Create location names mapping (locationsData already fetched above)
    const locationNames: Record<string, string> = {};
    locationsData.forEach(loc => {
      locationNames[String(loc._id)] = loc.name as string;
    });

    // Apply currency conversion if needed
    let convertedData = dailyData;

    if (shouldApplyCurrencyConversion(licencee)) {
      const { convertFromUSD, convertToUSD, getCountryCurrency } = await import(
        '@/lib/helpers/rates'
      );

      const licenseesData = await db
        .collection('licencees')
        .find(
          {
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2020-01-01') } },
            ],
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

      // Create a map of location ID to native currency
      const locationCurrencies = new Map<string, string>();
      locationsData.forEach(loc => {
        const locationLicenseeId = loc.rel?.licencee;
        if (locationLicenseeId) {
          const licenseeName =
            licenseeIdToName.get(locationLicenseeId.toString()) || 'Unknown';
          locationCurrencies.set(String(loc._id), licenseeName);
        } else {
          const countryId = loc.country;
          const countryName = countryId
            ? countryIdToName.get(countryId.toString())
            : undefined;
          const nativeCurrency = countryName
            ? getCountryCurrency(countryName)
            : 'USD';
          locationCurrencies.set(String(loc._id), nativeCurrency);
        }
      });

      // Convert the data
      convertedData = dailyData.map(item => {
        const nativeCurrency = locationCurrencies.get(item.location) || 'USD';
        return {
          ...item,
          handle: convertFromUSD(
            convertToUSD(item.handle, nativeCurrency),
            displayCurrency
          ),
          winLoss: convertFromUSD(
            convertToUSD(item.winLoss, nativeCurrency),
            displayCurrency
          ),
          jackpot: convertFromUSD(
            convertToUSD(item.jackpot, nativeCurrency),
            displayCurrency
          ),
          drop: convertFromUSD(
            convertToUSD(item.drop, nativeCurrency),
            displayCurrency
          ),
          totalCancelledCredits: convertFromUSD(
            convertToUSD(item.totalCancelledCredits, nativeCurrency),
            displayCurrency
          ),
          gross: convertFromUSD(
            convertToUSD(item.gross, nativeCurrency),
            displayCurrency
          ),
          // plays is not a currency value
        };
      });
    }

    // Format data for charts - group by time interval and create nested structure
    const trends: LocationTrendData[] = [];

    if (shouldUseHourlyAggregation) {
      // Hourly format
      for (let hour = 0; hour < 24; hour++) {
        const timeKey = `${hour.toString().padStart(2, '0')}:00`;
        const dayKey = convertedData[0]?.day || new Date().toISOString().split('T')[0];
        const trendItem: LocationTrendData = {
          day: dayKey,
          time: timeKey,
        };

        targetLocations.forEach(locationId => {
          const locationData = convertedData.find(
            item =>
              item.location === locationId &&
              item.day === dayKey &&
              item.time === timeKey
          );
          // Store all metrics as a nested object
          trendItem[locationId] = {
            handle: locationData?.handle || 0,
            winLoss: locationData?.winLoss || 0,
            jackpot: locationData?.jackpot || 0,
            plays: locationData?.plays || 0,
            drop: locationData?.drop || 0,
            gross: locationData?.gross || 0,
          };
        });

        trends.push(trendItem);
      }
    } else {
      // Daily format
      const current = new Date(queryStartDate);
      while (current <= queryEndDate) {
        const dayKey = current.toISOString().split('T')[0];
        const trendItem: LocationTrendData = {
          day: dayKey,
        };

        targetLocations.forEach(locationId => {
          const locationData = convertedData.find(
            item => item.location === locationId && item.day === dayKey
          );
          // Store all metrics as a nested object
          trendItem[locationId] = {
            handle: locationData?.handle || 0,
            winLoss: locationData?.winLoss || 0,
            jackpot: locationData?.jackpot || 0,
            plays: locationData?.plays || 0,
            drop: locationData?.drop || 0,
            gross: locationData?.gross || 0,
          };
        });

        trends.push(trendItem);
        current.setDate(current.getDate() + 1);
      }
    }

    // Calculate totals by location
    const totals: Record<string, { handle: number; winLoss: number; jackpot: number; plays: number; drop: number; gross: number }> = {};
    targetLocations.forEach(locationId => {
      totals[locationId] = {
        handle: 0,
        winLoss: 0,
        jackpot: 0,
        plays: 0,
        drop: 0,
        gross: 0,
      };
    });

    convertedData.forEach(item => {
      if (totals[item.location]) {
        totals[item.location].handle += item.handle;
        totals[item.location].winLoss += item.winLoss;
        totals[item.location].jackpot += item.jackpot;
        totals[item.location].plays += item.plays;
        totals[item.location].drop += item.drop;
        totals[item.location].gross += item.gross;
      }
    });

    return NextResponse.json({
      locationIds: targetLocations,
      timePeriod,
      startDate: queryStartDate.toISOString(),
      endDate: queryEndDate.toISOString(),
      trends,
      totals,
      locations: targetLocations,
      locationNames,
      currency: displayCurrency,
      converted: shouldApplyCurrencyConversion(licencee),
      isHourly: shouldUseHourlyAggregation,
    });
  } catch (error) {
    console.error('Error fetching location trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location trends' },
      { status: 500 }
    );
  }
}

