/**
 * Browser Gaming Day Offset Validation Script
 *
 * This script tests the UI in the browser to ensure all pages align:
 * - Dashboard (metrics cards and chart)
 * - Locations page
 * - Location details page
 * - Cabinets page
 *
 * It validates that all numbers match across pages for each time period.
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';

type TimePeriod = 'Today' | 'Yesterday' | '7d' | '30d' | 'Custom';

interface ExpectedValues {
  moneyIn: number;
  moneyOut: number;
  gross: number;
}

interface LocationExpected {
  locationId: string;
  locationName: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
}

/**
 * Calculate expected dashboard totals
 */
async function getExpectedDashboardTotals(
  timePeriod: TimePeriod,
  customStartDate?: Date,
  customEndDate?: Date
): Promise<ExpectedValues> {
  await connectDB();

  const locations = await GamingLocations.find({})
    .select('_id gameDayOffset')
    .lean();

  let totalMoneyIn = 0;
  let totalMoneyOut = 0;

  for (const location of locations) {
    const locationId = (location._id as { toString: () => string }).toString();
    const gameDayOffset = (location as { gameDayOffset?: number }).gameDayOffset ?? 8;

    let range: { rangeStart: Date; rangeEnd: Date };
    if (timePeriod === 'Custom' && customStartDate && customEndDate) {
      range = getGamingDayRangeForPeriod(
        'Custom',
        gameDayOffset,
        customStartDate,
        customEndDate
      );
    } else {
      range = getGamingDayRangeForPeriod(timePeriod, gameDayOffset);
    }

    // Get machines for this location
    const machines = await Machine.find({
      gamingLocation: locationId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $exists: false } },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    })
      .select('_id')
      .lean();

    if (machines.length === 0) continue;

    const machineIds = machines.map(m => (m._id as { toString: () => string }).toString());

    // Aggregate meters
    const metrics = await Meters.aggregate([
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
        $group: {
          _id: null,
          moneyIn: { $sum: '$movement.drop' },
          moneyOut: { $sum: '$movement.totalCancelledCredits' },
        },
      },
    ]);

    if (metrics.length > 0) {
      totalMoneyIn += Number(metrics[0].moneyIn) || 0;
      totalMoneyOut += Number(metrics[0].moneyOut) || 0;
    }
  }

  return {
    moneyIn: totalMoneyIn,
    moneyOut: totalMoneyOut,
    gross: totalMoneyIn - totalMoneyOut,
  };
}

/**
 * Calculate expected location totals
 */
async function getExpectedLocationTotals(
  locationId: string,
  timePeriod: TimePeriod,
  customStartDate?: Date,
  customEndDate?: Date
): Promise<LocationExpected | null> {
  await connectDB();

  const location = await GamingLocations.findOne({ _id: locationId })
    .select('_id name gameDayOffset')
    .lean();

  if (!location) return null;

  const gameDayOffset = (location as { gameDayOffset?: number }).gameDayOffset ?? 8;

  let range: { rangeStart: Date; rangeEnd: Date };
  if (timePeriod === 'Custom' && customStartDate && customEndDate) {
    range = getGamingDayRangeForPeriod(
      'Custom',
      gameDayOffset,
      customStartDate,
      customEndDate
    );
  } else {
    range = getGamingDayRangeForPeriod(timePeriod, gameDayOffset);
  }

  // Get machines for this location
  const machines = await Machine.find({
    gamingLocation: locationId,
    $or: [
      { deletedAt: null },
      { deletedAt: { $exists: false } },
      { deletedAt: { $lt: new Date('2020-01-01') } },
    ],
  })
    .select('_id')
    .lean();

  if (machines.length === 0) {
    return {
      locationId,
      locationName: ((location as { name?: string }).name as string) || 'Unknown',
      moneyIn: 0,
      moneyOut: 0,
      gross: 0,
    };
  }

  const machineIds = machines.map(m => (m._id as { toString: () => string }).toString());

  // Aggregate meters
  const metrics = await Meters.aggregate([
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
      $group: {
        _id: null,
        moneyIn: { $sum: '$movement.drop' },
        moneyOut: { $sum: '$movement.totalCancelledCredits' },
      },
    },
  ]);

  const moneyIn = metrics.length > 0 ? Number(metrics[0].moneyIn) || 0 : 0;
  const moneyOut = metrics.length > 0 ? Number(metrics[0].moneyOut) || 0 : 0;

  return {
    locationId,
    locationName: ((location as { name?: string }).name as string) || 'Unknown',
    moneyIn,
    moneyOut,
    gross: moneyIn - moneyOut,
  };
}

/**
 * Calculate expected cabinets totals
 */
async function getExpectedCabinetsTotals(
  timePeriod: TimePeriod,
  customStartDate?: Date,
  customEndDate?: Date
): Promise<ExpectedValues> {
  // Same as dashboard totals
  return getExpectedDashboardTotals(timePeriod, customStartDate, customEndDate);
}

export { getExpectedDashboardTotals, getExpectedLocationTotals, getExpectedCabinetsTotals };


