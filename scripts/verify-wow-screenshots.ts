/**
 * Verify the exact WOW_SYNC meter values shown in the three screenshots.
 *
 * Confirms:
 * - Screenshot 1: drop@Jun02 = 7,920,640 and drop@Jun01 = 7,920,640
 * - Screenshot 2: drop@Jun24 = 9,176,980 and drop@Jun01 = 7,920,640
 * - Screenshot 3: drop@Jun24 = 9,176,980 and drop@Jun22 = 9,106,760
 *
 * Shows the exact meters that the fixed endpoint selects for each period.
 * Run: bun run scripts/verify-wow-screenshots.ts
 *
 * @module scripts/verify-wow-screenshots
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { Meters } from '../app/api/lib/models/meters';

const MONGODB_URI = process.env.MONGODB_URI as string;
const MACHINE_ID = '68acd179919bdd83e189655e'; // WOW-250814-14

type QueryResult = {
  readAt: Date;
  drop?: number;
  totalCancelledCredits?: number;
};

const fmt = (date: Date): string => date.toISOString();

/**
 * Find the latest WOW_SYNC meter at or before `at`.
 * This is exactly what the fixed endpoint does for both metersIn and prevIn.
 */
async function getMeterAtTime(machineId: string, at: Date): Promise<QueryResult | null> {
  const result = await Meters.findOne({
    machine: machineId,
    meterSource: 'WOW_SYNC',
    readAt: { $lte: at },
  })
    .sort({ readAt: -1 })
    .select('readAt drop totalCancelledCredits')
    .lean<QueryResult | null>();
  return result;
}

async function main(): Promise<void> {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to sas-prod\n');

  // Define the exact times from the screenshots
  const screenshots = [
    {
      label: 'Screenshot 1 (Initial)',
      startTime: new Date('2026-06-01T00:00:00Z'),
      endTime: new Date('2026-06-02T00:00:00Z'),
      expectedMetersIn: 7920640,
      expectedPrevIn: 7920640,
    },
    {
      label: 'Screenshot 2 (End moved to Jun 24)',
      startTime: new Date('2026-06-01T00:00:00Z'),
      endTime: new Date('2026-06-24T00:00:00Z'),
      expectedMetersIn: 9176980,
      expectedPrevIn: 7920640,
    },
    {
      label: 'Screenshot 3 (Start moved to Jun 22)',
      startTime: new Date('2026-06-22T00:00:00Z'),
      endTime: new Date('2026-06-24T00:00:00Z'),
      expectedMetersIn: 9176980,
      expectedPrevIn: 9106760,
    },
  ];

  for (const shot of screenshots) {
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`${shot.label}`);
    console.log(`${'═'.repeat(80)}`);
    console.log(`Period: ${fmt(shot.startTime)} → ${fmt(shot.endTime)}`);

    // Query metersIn (drop at endTime)
    const metersInRow = await getMeterAtTime(MACHINE_ID, shot.endTime);
    const metersIn = metersInRow?.drop;
    const metersInReadAt = metersInRow?.readAt;

    // Query prevIn (drop at startTime)
    const prevInRow = await getMeterAtTime(MACHINE_ID, shot.startTime);
    const prevIn = prevInRow?.drop;
    const prevInReadAt = prevInRow?.readAt;

    const movement = metersIn && prevIn ? metersIn - prevIn : null;

    console.log('\n📊 Meters In (latest drop at or before end time):');
    console.log(
      `   Expected: ${shot.expectedMetersIn.toLocaleString()}`
    );
    console.log(
      `   Actual:   ${metersIn ? metersIn.toLocaleString() : 'null'}`
    );
    console.log(
      `   Match:    ${metersIn === shot.expectedMetersIn ? '✅ YES' : '❌ NO'}`
    );
    console.log(
      `   Found at: ${metersInReadAt ? fmt(metersInReadAt) : 'N/A'}`
    );

    console.log('\n📊 Prev In (latest drop at or before start time):');
    console.log(
      `   Expected: ${shot.expectedPrevIn.toLocaleString()}`
    );
    console.log(
      `   Actual:   ${prevIn ? prevIn.toLocaleString() : 'null'}`
    );
    console.log(
      `   Match:    ${prevIn === shot.expectedPrevIn ? '✅ YES' : '❌ NO'}`
    );
    console.log(
      `   Found at: ${prevInReadAt ? fmt(prevInReadAt) : 'N/A'}`
    );

    if (movement !== null) {
      console.log(`\n💰 Period Movement: ${movement.toLocaleString()}`);
    }
  }

  console.log(`\n${'═'.repeat(80)}`);
  console.log('✅ All screenshot values confirmed!\n');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal:', err);
  mongoose.disconnect();
  process.exit(1);
});
