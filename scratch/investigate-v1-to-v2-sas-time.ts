/**
 * V1 → V2 SAS Start Time Continuity Investigation
 *
 * For the most recent V1 report, checks whether each machine's V1 sasEndTime
 * matches the next V2 session's sasStartTime. Flag any mismatches and show
 * what times V2 should use instead.
 *
 * Usage:
 *   bun run scratch/investigate-v1-to-v2-sas-time.ts [locationReportId]
 *   bun run scratch/investigate-v1-to-v2-sas-time.ts                ← most recent V1 report
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

function sep(title: string, width = 80, char = '─') {
  const bar = char.repeat(width);
  if (!title) return console.log(bar);
  console.log(`\n${bar}`);
  console.log(`  ${title}`);
  console.log(bar);
}

function row(label: string, value: unknown, indent = 2, flag = '') {
  const prefix = ' '.repeat(indent);
  const val = value === null || value === undefined ? 'null' : String(value);
  const suffix = flag ? `  ${flag}` : '';
  console.log(`${prefix}${label.padEnd(44)}${val}${suffix}`);
}

function localTs(d: unknown): string {
  if (!d) return 'null';
  const date = new Date(d as string);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit',
    hour12: true, timeZoneName: 'short',
  });
}

function fmt(n: unknown): string {
  if (n === null || n === undefined) return 'null';
  const num = Number(n);
  return isNaN(num) ? String(n) : num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function diffMs(earlier: Date, later: Date): string {
  const ms = later.getTime() - earlier.getTime();
  const absMs = Math.abs(ms);
  const mins = Math.floor(absMs / 60000);
  const secs = Math.floor((absMs % 60000) / 1000);
  const sign_ = ms >= 0 ? '+' : '-';
  if (mins > 0) return `${sign_}${mins}m ${secs}s`;
  return `${sign_}${secs}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const locationReportId = process.argv[2] ?? null;

  // ==========================================================================
  // STEP 1: Find the V1 report
  // ==========================================================================
  sep('STEP 1 — V1 COLLECTION REPORT', 80, '═');

  const report = locationReportId
    ? await db.collection('collectionreports').findOne({ locationReportId })
    : await db.collection('collectionreports')
        .find({})
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray()
        .then(arr => arr[0] ?? null);

  if (!report) {
    console.error('No V1 report found');
    await mongoose.disconnect();
    return;
  }

  const reportDoc = report as Record<string, unknown>;
  row('locationReportId:', reportDoc.locationReportId);
  row('Location:', `${reportDoc.locationName} (${reportDoc.location})`);
  row('Timestamp:', localTs(reportDoc.timestamp));
  row('isEditing:', reportDoc.isEditing);

  // ==========================================================================
  // STEP 2: Find all V1 collections for this report
  // ==========================================================================
  sep('STEP 2 — V1 COLLECTIONS', 80, '═');

  const v1Collections = await db.collection('collections')
    .find({ locationReportId: String(reportDoc.locationReportId) })
    .sort({ timestamp: 1 })
    .toArray() as Record<string, unknown>[];

  console.log(`  Found ${v1Collections.length} collection(s)\n`);

  // ==========================================================================
  // STEP 3: For each collection, find the next V2 session and compare SAS times
  // ==========================================================================
  sep('STEP 3 — V1 → V2 SAS TIME COMPARISON', 80, '═');

  let mismatches = 0;
  let totalChecked = 0;

  for (const col of v1Collections) {
    const machineId = String(col.machineId);
    const v1SasEnd = col.sasMeters?.sasEndTime
      ? new Date(col.sasMeters.sasEndTime as string)
      : null;
    const v1Timestamp = col.timestamp
      ? new Date(col.timestamp as string)
      : null;

    // Get machine identity
    const machine = await db.collection('machines').findOne(
      { _id: machineId },
      { projection: { serialNumber: 1, relayId: 1, 'custom.name': 1 } }
    ) as Record<string, unknown> | null;
    const machineName = machine?.custom?.name || machine?.serialNumber || machineId;

    // Find the next V2 session for this machine (after V1 timestamp)
    const v1TimeForSort = v1SasEnd ?? v1Timestamp;
    const nextV2 = v1TimeForSort
      ? await db.collection('reportedmachines').findOne(
          {
            machineId,
            sessionStatus: 'submitted',
            sasEndTime: { $gt: v1TimeForSort },
            $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
          },
          {
            sort: { sasEndTime: 1 },
          }
        ) as Record<string, unknown> | null
      : null;

    // Also find the chronological successor V2 (not just by sasEndTime >)
    // This catches cases where the V2 sasEndTime might be wrong but
    // sasStartTime should match
    const successorV2 = v1TimeForSort
      ? await db.collection('reportedmachines').findOne(
          {
            machineId,
            sessionStatus: 'submitted',
            sasStartTime: { $exists: true },
            $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
          },
          {
            sort: { sasStartTime: 1 },
          }
        ) as Record<string, unknown> | null
      : null;

    sep(`Machine: ${machineName} (${machineId})`, 80, '─');
    totalChecked++;

    row('V1 metersIn:', fmt(col.metersIn));
    row('V1 metersOut:', fmt(col.metersOut));
    row('V1 SAS end time:', localTs(v1SasEnd));
    row('V1 collection timestamp:', localTs(v1Timestamp));

    if (!v1SasEnd) {
      console.log(`\n  ⚠  V1 collection has NO sasEndTime — cannot compare`);
      continue;
    }

    if (nextV2) {
      const v2SasStart = nextV2.sasStartTime
        ? new Date(nextV2.sasStartTime as string)
        : null;
      const v2SessionId = String(nextV2.sessionId);
      const v2SasEnd = nextV2.sasEndTime
        ? new Date(nextV2.sasEndTime as string)
        : null;

      row('');
      row('Next V2 session:', v2SessionId);
      row('V2 sasStartTime:', localTs(v2SasStart));
      row('V2 sasEndTime:', localTs(v2SasEnd));
      row('V2 sasMetersIn:', fmt(nextV2.sasMetersIn));
      row('V2 sasMetersOut:', fmt(nextV2.sasMetersOut));

      if (v2SasStart) {
        const diff = v2SasStart.getTime() - v1SasEnd.getTime();
        const isMatch = Math.abs(diff) < 1000; // within 1 second
        row(
          'V2 start − V1 end:',
          diffMs(v1SasEnd, v2SasStart),
          2,
          isMatch ? '✅ MATCH' : '❌ MISMATCH'
        );

        if (!isMatch) {
          mismatches++;
          console.log(`\n  🔧 RECOMMENDATION:`);
          console.log(`     Set V2 sasStartTime to: ${localTs(v1SasEnd)}`);
          console.log(`     (currently: ${localTs(v2SasStart)})`);

          // Check what today's sasStartTime resolution logic would produce
          const prevV2 = await db.collection('reportedmachines').findOne(
            {
              machineId,
              sessionId: { $ne: v2SessionId },
              sessionStatus: 'submitted',
              sasEndTime: { $lt: v1SasEnd },
              $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
            },
            { sort: { sasEndTime: -1 } }
          ) as Record<string, unknown> | null;

          if (prevV2) {
            console.log(`     Previous V2 sasEndTime exists: ${localTs(prevV2.sasEndTime)}`);
            console.log(`     → The sasStartTime resolution found a DIFFERENT previous V2 and ignored V1`);
          } else {
            console.log(`     No previous V2 session before this V1 report`);
            console.log(`     → sasStartTime should fall through to V1 Collections.sasEndTime: ${localTs(v1SasEnd)}`);
            console.log(`     → Check if the V1 fallback (added in this PR) is running correctly`);
          }
        }
      } else {
        console.log(`\n  ⚠  V2 session has NO sasStartTime — cannot compare`);
      }
    } else {
      row('');
      console.log(`\n  ℹ  No V2 session found after this V1 collection.`);

      // Show the next V2 chronologically for context
      if (successorV2) {
        const succSasStart = successorV2.sasStartTime
          ? new Date(successorV2.sasStartTime as string)
          : null;
        const succSessionId = String(successorV2.sessionId);
        row('Next V2 (by sasStartTime):', succSessionId);
        row('  V2 sasStartTime:', localTs(succSasStart));
        row('  V2 sasEndTime:', localTs(successorV2.sasEndTime));
        if (succSasStart) {
          const diff = succSasStart.getTime() - v1SasEnd.getTime();
          row(
            '  V2 start − V1 end:',
            diffMs(v1SasEnd, succSasStart),
            2,
            Math.abs(diff) < 1000 ? '✅ MATCH' : '❌'
          );
        }
      } else {
        console.log(`  No V2 sessions at all for this machine.`);
      }
    }

    // Check Machine.collectionMetersHistory for the V1 and V2 entries
    const machineFull = await db.collection('machines').findOne(
      { _id: machineId },
      { projection: { collectionMetersHistory: 1, collectionMeters: 1, collectionTime: 1, previousCollectionTime: 1 } }
    ) as Record<string, unknown> | null;

    if (machineFull?.collectionMetersHistory?.length) {
      console.log(`\n  ┌── Machine.collectionMetersHistory (${machineFull.collectionMetersHistory.length} entries)`);
      for (const entry of machineFull.collectionMetersHistory) {
        const isV1 = entry.locationReportId === String(reportDoc.locationReportId);
        const marker = isV1 ? ' ← THIS V1 REPORT' : '';
        console.log(
          `  │  ${localTs(entry.timestamp).padEnd(34)}` +
          `  in=${String(entry.metersIn ?? '?').padStart(10)}  out=${String(entry.metersOut ?? '?').padStart(10)}` +
          `  id=${entry.locationReportId?.slice(0, 12) ?? '?'}${marker}`
        );
      }
      console.log('  └──');
    }

    const metersIn = machineFull?.collectionMeters as Record<string, unknown> | undefined;
    row('\nMachine.collectionMeters.metersIn:', fmt(metersIn?.metersIn));
    row('Machine.collectionMeters.metersOut:', fmt(metersIn?.metersOut));
    row('Machine.collectionTime:', localTs(machineFull?.collectionTime));
    row('Machine.previousCollectionTime:', localTs(machineFull?.previousCollectionTime));
  }

  // ==========================================================================
  // STEP 4: Summary
  // ==========================================================================
  sep('SUMMARY', 80, '═');
  console.log(`  Machines checked: ${totalChecked}`);
  console.log(`  SAS time mismatches: ${mismatches}`);
  if (mismatches > 0) {
    console.log(`\n  🔧 For each mismatch, set the V2 session's sasStartTime`);
    console.log(`     to the V1 collection's sasEndTime shown above.`);
    console.log(`\n  The fix applied in sessionOperations.ts (lookupLastSessionEndTimes)`);
    console.log(`  and movement.ts (computeMovement) should resolve this for`);
    console.log(`  future sessions by falling back to V1 Collections.sasMeters.sasEndTime`);
    console.log(`  when no V2 ReportedMachine.sasEndTime exists.`);
  }

  await mongoose.disconnect();
  console.log('\nDone.\n');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
