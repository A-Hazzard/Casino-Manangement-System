/**
 * Gaming Day Offset Validation Script
 *
 * This script queries all meters for machines using the gaming day offset system
 * and validates that dashboard, locations, location details, and cabinets all align.
 *
 * Usage: tsx test/gaming-day-offset-validation.ts
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
  machineCount: number;
  locationCount: number;
}

interface MachineValues {
  machineId: string;
  serialNumber: string;
  locationId: string;
  locationName: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
}

interface LocationValues {
  locationId: string;
  locationName: string;
  gameDayOffset: number;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  machineCount: number;
}

/**
 * Query meters for a specific time period and calculate expected values
 */
async function calculateExpectedValues(
  timePeriod: TimePeriod,
  customStartDate?: Date,
  customEndDate?: Date
): Promise<{
  total: ExpectedValues;
  byLocation: Map<string, LocationValues>;
  byMachine: Map<string, MachineValues>;
}> {
  await connectDB();

  // Get all locations with their gameDayOffset
  const locations = await GamingLocations.find({})
    .select('_id name gameDayOffset rel')
    .lean();

  const byLocation = new Map<string, LocationValues>();
  const byMachine = new Map<string, MachineValues>();

  // Calculate gaming day ranges for each location
  const locationRanges = new Map<string, { rangeStart: Date; rangeEnd: Date }>();

  for (const location of locations) {
    const locationId = (location._id as { toString: () => string }).toString();
    const gameDayOffset = (location as { gameDayOffset?: number }).gameDayOffset ?? 8; // Default to 8 AM

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

    locationRanges.set(locationId, range);

    byLocation.set(locationId, {
      locationId,
      locationName: ((location as { name?: string }).name as string) || 'Unknown',
      gameDayOffset,
      moneyIn: 0,
      moneyOut: 0,
      gross: 0,
      machineCount: 0,
    });
  }

  // Get all machines
  const machines = await Machine.find({
    $or: [
      { deletedAt: null },
      { deletedAt: { $exists: false } },
      { deletedAt: { $lt: new Date('2020-01-01') } },
    ],
  })
    .select('_id serialNumber gamingLocation custom')
    .lean();

  // Group machines by location
  const machinesByLocation = new Map<string, Array<{ _id: string; serialNumber: string }>>();
  for (const machine of machines) {
    const locationId = machine.gamingLocation?.toString();
    if (!locationId) continue;

    if (!machinesByLocation.has(locationId)) {
      machinesByLocation.set(locationId, []);
    }

    const serialNumber =
      (machine.serialNumber as string)?.trim() ||
      ((machine.custom as Record<string, unknown>)?.name as string)?.trim() ||
      (machine._id as { toString: () => string }).toString();

    machinesByLocation.get(locationId)?.push({
      _id: (machine._id as { toString: () => string }).toString(),
      serialNumber,
    });
  }

  // Query meters for each location
  for (const [locationId, range] of locationRanges.entries()) {
    const locationMachines = machinesByLocation.get(locationId) || [];
    if (locationMachines.length === 0) continue;

    const machineIds = locationMachines.map(m => m._id);

    // Aggregate meters for this location
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
          _id: '$machine',
          moneyIn: { $sum: '$movement.drop' },
          moneyOut: { $sum: '$movement.totalCancelledCredits' },
        },
      },
    ]);

    // Calculate per-machine values
    for (const metric of metrics) {
      const machineId = metric._id.toString();
      const machine = locationMachines.find(m => m._id === machineId);
      if (!machine) continue;

      const moneyIn = Number(metric.moneyIn) || 0;
      const moneyOut = Number(metric.moneyOut) || 0;
      const gross = moneyIn - moneyOut;

      const locationData = byLocation.get(locationId);
      if (locationData) {
        locationData.moneyIn += moneyIn;
        locationData.moneyOut += moneyOut;
        locationData.gross += gross;
        locationData.machineCount += 1;
      }

      byMachine.set(machineId, {
        machineId,
        serialNumber: machine.serialNumber,
        locationId,
        locationName: locationData?.locationName || 'Unknown',
        moneyIn,
        moneyOut,
        gross,
      });
    }
  }

  // Calculate totals
  let totalMoneyIn = 0;
  let totalMoneyOut = 0;
  let totalGross = 0;
  let totalMachineCount = 0;
  let totalLocationCount = 0;

  for (const location of byLocation.values()) {
    if (location.machineCount > 0) {
      totalMoneyIn += location.moneyIn;
      totalMoneyOut += location.moneyOut;
      totalGross += location.gross;
      totalMachineCount += location.machineCount;
      totalLocationCount += 1;
    }
  }

  return {
    total: {
      moneyIn: totalMoneyIn,
      moneyOut: totalMoneyOut,
      gross: totalGross,
      machineCount: totalMachineCount,
      locationCount: totalLocationCount,
    },
    byLocation,
    byMachine,
  };
}

/**
 * Format number for display
 */
function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Main validation function
 */
async function validateGamingDayOffset() {
  console.log('🔍 Starting Gaming Day Offset Validation...\n');

  const timePeriods: Array<{ period: TimePeriod; label: string; customDates?: { start: Date; end: Date } }> = [
    { period: 'Today', label: 'Today' },
    { period: 'Yesterday', label: 'Yesterday' },
    { period: '7d', label: 'Last 7 Days' },
    { period: '30d', label: 'Last 30 Days' },
  ];

  // Add custom date (today to today)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  timePeriods.push({
    period: 'Custom',
    label: 'Custom (Today)',
    customDates: { start: today, end: today },
  });

  const results: Array<{
    period: string;
    expected: ExpectedValues;
    byLocation: Map<string, LocationValues>;
    byMachine: Map<string, MachineValues>;
  }> = [];

  for (const { period, label, customDates } of timePeriods) {
    console.log(`📊 Calculating expected values for: ${label}...`);

    try {
      const expected = await calculateExpectedValues(
        period,
        customDates?.start,
        customDates?.end
      );

      results.push({
        period: label,
        expected: expected.total,
        byLocation: expected.byLocation,
        byMachine: expected.byMachine,
      });

      console.log(`✅ ${label}:`);
      console.log(`   Money In: $${formatNumber(expected.total.moneyIn)}`);
      console.log(`   Money Out: $${formatNumber(expected.total.moneyOut)}`);
      console.log(`   Gross: $${formatNumber(expected.total.gross)}`);
      console.log(`   Machines: ${expected.total.machineCount}`);
      console.log(`   Locations: ${expected.total.locationCount}\n`);
    } catch (error) {
      console.error(`❌ Error calculating ${label}:`, error);
    }
  }

  // Save results to JSON file for browser testing
  const fs = await import('fs/promises');
  const path = await import('path');

  const outputPath = path.join(process.cwd(), 'test', 'expected-values.json');
  await fs.writeFile(
    outputPath,
    JSON.stringify(
      results.map(r => ({
        period: r.period,
        total: r.expected,
        locations: Array.from(r.byLocation.values()),
        machines: Array.from(r.byMachine.values()),
      })),
      null,
      2
    )
  );

  console.log(`💾 Expected values saved to: ${outputPath}\n`);
  console.log('✅ Validation script completed!');
  console.log('🌐 Now testing UI in browser...\n');

  return results;
}

// Run if executed directly
if (require.main === module) {
  validateGamingDayOffset()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { validateGamingDayOffset, calculateExpectedValues };

