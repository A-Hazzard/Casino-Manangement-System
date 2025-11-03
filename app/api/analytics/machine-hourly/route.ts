import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { getDatesForTimePeriod } from '@/lib/utils/dates';
import { TimePeriod } from '@/shared/types';
import type { PipelineStage } from 'mongoose';
import type { StackedData } from '@/shared/types/analytics';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import type { CurrencyCode } from '@/shared/types/currency';

type HourlyDataItem = {
  hour: number;
  machine: string;
  location: string;
  handle: number;
  winLoss: number;
  jackpot: number;
  plays: number;
  drop: number;
  totalCancelledCredits: number;
  gross: number;
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
    const machineIds = searchParams.get('machineIds'); // New parameter for specific machines
    const timePeriod =
      (searchParams.get('timePeriod') as TimePeriod) || 'Today';
    const licencee = searchParams.get('licencee');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';

    if (!locationIds && !machineIds) {
      return NextResponse.json(
        { error: 'Location IDs or Machine IDs are required' },
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
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to last 24 hours
    }

    const targetLocations = locationIds
      ? locationIds.split(',').map(id => id.trim())
      : [];
    const targetMachines = machineIds
      ? machineIds.split(',').map(id => id.trim())
      : [];

    // Build aggregation pipeline for hourly machine data
    const pipeline = [
      {
        $match: {
          readAt: { $gte: startDate, $lte: endDate },
          ...(targetLocations.length > 0 && {
            location: { $in: targetLocations },
          }),
          ...(targetMachines.length > 0 && {
            machine: { $in: targetMachines },
          }),
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

    // Continue with aggregation
    (pipeline as PipelineStage[]).push(
      {
        $group: {
          _id: {
            hour: { $hour: '$readAt' },
            machine: '$machine',
            location: '$location',
          },
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
          // Add proper financial metrics according to financial-metrics-guide.md
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
      { $sort: { '_id.hour': 1, '_id.machine': 1 } } as PipelineStage,
      {
        $project: {
          _id: 0,
          hour: '$_id.hour',
          machine: '$_id.machine',
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

    const hourlyData = (await db
      .collection('meters')
      .aggregate(pipeline)
      .toArray()) as HourlyDataItem[];

    // Group data by location and hour
    const locationHourlyData: Record<string, HourlyDataItem[]> = {};
    hourlyData.forEach((item: HourlyDataItem) => {
      const locationKey = item.location;
      if (!locationHourlyData[locationKey]) {
        locationHourlyData[locationKey] = [];
      }
      locationHourlyData[locationKey].push(item);
    });

    // Create 24-hour array with stacked data
    const hourlyTrends = Array.from({ length: 24 }, (_, hour) => {
      const hourData = hourlyData.filter(item => item.hour === hour);
      const stackedData: StackedData = {
        hour: `${hour.toString().padStart(2, '0')}:00`,
      };

      // Add data for each location
      Object.keys(locationHourlyData).forEach(locationKey => {
        const locationHourData = hourData.filter(
          item => item.location === locationKey
        );

        // Sum up all machines for this location in this hour
        const totalHandle = locationHourData.reduce(
          (sum, item) => sum + item.handle,
          0
        );
        const totalWinLoss = locationHourData.reduce(
          (sum, item) => sum + item.winLoss,
          0
        );
        const totalJackpot = locationHourData.reduce(
          (sum, item) => sum + item.jackpot,
          0
        );
        const totalPlays = locationHourData.reduce(
          (sum, item) => sum + item.plays,
          0
        );

        stackedData[locationKey] = {
          handle: Math.round(totalHandle),
          winLoss: Math.round(totalWinLoss),
          jackpot: Math.round(totalJackpot),
          plays: Math.round(totalPlays),
        };
      });

      return stackedData;
    });

    // Calculate totals
    const totals = hourlyTrends.reduce(
      (acc, item) => {
        Object.keys(item).forEach(key => {
          if (key !== 'hour' && typeof item[key] === 'object') {
            if (!acc[key])
              acc[key] = { handle: 0, winLoss: 0, jackpot: 0, plays: 0 };
            acc[key].handle += item[key].handle;
            acc[key].winLoss += item[key].winLoss;
            acc[key].jackpot += item[key].jackpot;
            acc[key].plays += item[key].plays;
          }
        });
        return acc;
      },
      {} as Record<
        string,
        { handle: number; winLoss: number; jackpot: number; plays: number }
      >
    );

    // Fetch location names for the location IDs
    // Note: In this database, location _id fields are stored as strings, not ObjectIds
    const locationStringIds = Object.keys(locationHourlyData);
    
    const locationsData = await db
      .collection('gaminglocations')
      .find(
        { _id: { $in: locationStringIds } } as never,
        { projection: { _id: 1, name: 1, rel: 1, country: 1 } }
      )
      .toArray();

    // Create location ID to name mapping
    const locationNames: Record<string, string> = {};
    locationsData.forEach((loc) => {
      // _id is already a string in this database
      const locationId = String(loc._id);
      locationNames[locationId] = loc.name as string;
    });

    // Apply currency conversion if needed (All Licensee mode)
    let convertedHourlyTrends = hourlyTrends;
    let convertedTotals = totals;

    if (shouldApplyCurrencyConversion(licencee)) {
      // Get licensee and country mappings for currency conversion
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
          locationCurrencies.set(loc._id.toString(), licenseeName);
        } else {
          // Unassigned location - use country currency
          const countryId = loc.country;
          const countryName = countryId
            ? countryIdToName.get(countryId.toString())
            : undefined;
          const nativeCurrency = countryName
            ? getCountryCurrency(countryName)
            : 'USD';
          locationCurrencies.set(loc._id.toString(), nativeCurrency);
        }
      });

      // Convert hourly trends
      convertedHourlyTrends = hourlyTrends.map(hourData => {
        const converted: StackedData = { hour: hourData.hour };
        Object.keys(hourData).forEach(key => {
          if (key !== 'hour' && typeof hourData[key] === 'object') {
            const data = hourData[key] as {
              handle: number;
              winLoss: number;
              jackpot: number;
              plays: number;
            };
            const nativeCurrency = locationCurrencies.get(key) || 'USD';
            converted[key] = {
              handle: convertFromUSD(
                convertToUSD(data.handle, nativeCurrency),
                displayCurrency
              ),
              winLoss: convertFromUSD(
                convertToUSD(data.winLoss, nativeCurrency),
                displayCurrency
              ),
              jackpot: convertFromUSD(
                convertToUSD(data.jackpot, nativeCurrency),
                displayCurrency
              ),
              plays: data.plays, // plays is not a currency value
            };
          }
        });
        return converted;
      });

      // Convert totals
      convertedTotals = {};
      Object.keys(totals).forEach(locationId => {
        const nativeCurrency = locationCurrencies.get(locationId) || 'USD';
        convertedTotals[locationId] = {
          handle: convertFromUSD(
            convertToUSD(totals[locationId].handle, nativeCurrency),
            displayCurrency
          ),
          winLoss: convertFromUSD(
            convertToUSD(totals[locationId].winLoss, nativeCurrency),
            displayCurrency
          ),
          jackpot: convertFromUSD(
            convertToUSD(totals[locationId].jackpot, nativeCurrency),
            displayCurrency
          ),
          plays: totals[locationId].plays, // plays is not a currency value
        };
      });
    }

    return NextResponse.json({
      locationIds: targetLocations,
      machineIds: targetMachines,
      timePeriod,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      hourlyTrends: convertedHourlyTrends,
      totals: convertedTotals,
      locations: Object.keys(locationHourlyData),
      locationNames, // Add location names mapping
      currency: displayCurrency,
      converted: shouldApplyCurrencyConversion(licencee),
    });
  } catch (error) {
    console.error('Error fetching machine hourly data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch machine hourly data' },
      { status: 500 }
    );
  }
}
