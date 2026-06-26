/**
 * Show HOW the endpoint selects which meter for a given time.
 *
 * When you request startTime=Jun 22 12:00 AM:
 * - There's NO meter at exactly 12:00 AM
 * - The endpoint searches for the LATEST meter ≤ 12:00 AM
 * - If none found before, it falls back to the EARLIEST meter > 12:00 AM
 *
 * This script shows all meters within ±1 day of each screenshot time,
 * then highlights which one was selected and WHY.
 *
 * Run: bun run scripts/wow-meter-selection-logic.ts
 *
 * @module scripts/wow-meter-selection-logic
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { Meters } from '../app/api/lib/models/meters';

const MONGODB_URI = process.env.MONGODB_URI as string;
const MACHINE_ID = '68acd179919bdd83e189655e'; // WOW-250814-14

type MeterRow = {
  readAt: Date;
  drop?: number;
  totalCancelledCredits?: number;
};

const fmt = (date: Date): string => date.toISOString();
const fmtShort = (date: Date): string =>
  date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

/**
 * Endpoint logic: find meter for a given time.
 * Priority:
 *   1. Latest meter at or before the time (readAt <= time)
 *   2. Fallback: Earliest meter after the time (readAt > time)
 */
async function explainMeterSelection(
  machineId: string,
  requestedTime: Date,
  windowStart: Date,
  windowEnd: Date
): Promise<void> {
  console.log(
    `\n${'─'.repeat(80)}`
  );
  console.log(`Requested time: ${fmtShort(requestedTime)} (${fmt(requestedTime)})`);
  console.log(
    `Search window: ${fmtShort(windowStart)} → ${fmtShort(windowEnd)}`
  );
  console.log(`${'─'.repeat(80)}`);

  // Get all meters in the window
  const meters = await Meters.find({
    machine: machineId,
    meterSource: 'WOW_SYNC',
    readAt: { $gte: windowStart, $lte: windowEnd },
  })
    .sort({ readAt: 1 })
    .select('readAt drop totalCancelledCredits')
    .lean<MeterRow[]>();

  console.log(`\nAll WOW_SYNC meters in window (${meters.length} total):\n`);

  // Partition into before, at, and after
  const before = meters.filter(m => new Date(m.readAt).getTime() < requestedTime.getTime());
  const after = meters.filter(m => new Date(m.readAt).getTime() > requestedTime.getTime());

  // Show meters BEFORE the requested time (last 10)
  if (before.length > 0) {
    const displayBefore = before.slice(Math.max(0, before.length - 10));
    console.log(`📍 BEFORE requested time (${before.length} total, showing last 10):`);
    for (let i = 0; i < displayBefore.length; i++) {
      const m = displayBefore[i];
      const isSelected = i === displayBefore.length - 1;
      const marker = isSelected ? '⭐ SELECTED' : '  ';
      const timeStr = fmtShort(new Date(m.readAt));
      const dropStr = (m.drop ?? 'null').toString().padStart(10);
      const timeDiff = Math.round(
        (requestedTime.getTime() - new Date(m.readAt).getTime()) / 1000 / 60 / 60
      );
      const diffStr = `(${timeDiff}h before)`.padStart(15);
      console.log(
        `  ${marker} ${timeStr.padEnd(18)} drop=${dropStr}  ${diffStr}`
      );
    }
  } else {
    console.log(`📍 BEFORE requested time: (none)`);
  }

  // Show meters AFTER the requested time (first 10)
  if (after.length > 0) {
    const displayAfter = after.slice(0, 10);
    console.log(`\n📍 AFTER requested time (${after.length} total, showing first 10):`);
    for (let i = 0; i < displayAfter.length; i++) {
      const m = displayAfter[i];
      const isSelected = i === 0 && before.length === 0;
      const marker = isSelected ? '⭐ SELECTED (fallback)' : '  ';
      const timeStr = fmtShort(new Date(m.readAt));
      const dropStr = (m.drop ?? 'null').toString().padStart(10);
      const timeDiff = Math.round(
        (new Date(m.readAt).getTime() - requestedTime.getTime()) / 1000 / 60 / 60
      );
      const diffStr = `(${timeDiff}h after)`.padStart(15);
      console.log(
        `  ${marker} ${timeStr.padEnd(18)} drop=${dropStr}  ${diffStr}`
      );
    }
  } else {
    console.log(`\n📍 AFTER requested time: (none)`);
  }

  // Determine which was actually selected
  console.log(`\n${'═'.repeat(80)}`);
  if (before.length > 0) {
    const selected = before[before.length - 1];
    console.log(`✅ SELECTED: Latest meter BEFORE requested time`);
    console.log(`   Time: ${fmtShort(new Date(selected.readAt))}`);
    console.log(`   Drop: ${selected.drop?.toLocaleString()}`);
    console.log(`   Reason: We want the meter that represents the value AT the requested time.`);
    console.log(`           Since meters only sync when they change, the latest meter`);
    console.log(`           BEFORE the requested time is the cumulative value at that time.`);
  } else if (after.length > 0) {
    const selected = after[0];
    console.log(`⚠️  FALLBACK SELECTED: Earliest meter AFTER requested time`);
    console.log(`   Time: ${fmtShort(new Date(selected.readAt))}`);
    console.log(`   Drop: ${selected.drop?.toLocaleString()}`);
    console.log(`   Reason: No meter before the requested time, so use the earliest after.`);
    console.log(`           (This is rare and means the machine didn't sync yet.)`);
  } else {
    console.log(`❌ NO METER FOUND in the window`);
  }
}

async function main(): Promise<void> {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
  const dbName = mongoose.connection.db?.databaseName;
  console.log(`Connected to ${dbName}\n`);

  // The three requested times from the screenshots
  // Note: WOW machines don't sync every day, so show wider windows (±7 days)
  const queries = [
    {
      label: 'Screenshot 1 — START TIME: Jun 01 12:00 AM',
      requestedTime: new Date('2026-06-01T00:00:00Z'),
      windowStart: new Date('2026-05-25T00:00:00Z'),
      windowEnd: new Date('2026-06-08T00:00:00Z'),
    },
    {
      label: 'Screenshot 3 — START TIME: Jun 22 12:00 AM (showing how prevIn changed)',
      requestedTime: new Date('2026-06-22T00:00:00Z'),
      windowStart: new Date('2026-06-15T00:00:00Z'),
      windowEnd: new Date('2026-06-29T00:00:00Z'),
    },
    {
      label: 'Screenshot 2&3 — END TIME: Jun 24 12:00 AM (both use same metersIn)',
      requestedTime: new Date('2026-06-24T00:00:00Z'),
      windowStart: new Date('2026-06-17T00:00:00Z'),
      windowEnd: new Date('2026-07-01T00:00:00Z'),
    },
  ];

  console.log('═'.repeat(80));
  console.log('HOW THE ENDPOINT SELECTS METERS');
  console.log('═'.repeat(80));

  for (const q of queries) {
    console.log(`\n${q.label}`);
    await explainMeterSelection(MACHINE_ID, q.requestedTime, q.windowStart, q.windowEnd);
  }

  console.log(`\n\n${'═'.repeat(80)}`);
  console.log('ALGORITHM SUMMARY');
  console.log(`${'═'.repeat(80)}`);
  console.log(`
When you request a time (e.g., Jun 22 12:00 AM):

1️⃣  Find the LATEST meter where readAt ≤ requested time
    → This is the cumulative value AT the requested moment
    → Example: "drop at Jun 20 00:44" means the cumulative by Jun 20 00:44
    → Used for BOTH metersIn (at end time) and prevIn (at start time)

2️⃣  If NO meter found before the time, use EARLIEST meter after
    → Fallback for brand-new machines or syncs that started late
    → Rare edge case

3️⃣  The time you pick doesn't need an exact meter
    → You pick Jun 22 12:00 AM, but the nearest sync might be Jun 20 00:44
    → The endpoint says "what was the machine's state at Jun 22 12:00 AM?"
    → Answer: Same as the last sync before that time (Jun 20 00:44)
  `);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal:', err);
  mongoose.disconnect();
  process.exit(1);
});
