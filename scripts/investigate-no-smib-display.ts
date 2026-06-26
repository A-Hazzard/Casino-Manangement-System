/**
 * Investigate "No SMIB" Display Script
 *
 * Checks why a machine shows "No SAS Data" + variation instead of
 * "No SMIB for this Machine" on the collection report details page.
 *
 * Usage:
 *   bun run scripts/investigate-no-smib-display.ts <reportId>
 *   bun run scripts/investigate-no-smib-display.ts                       ← most recent report
 *
 * Diagnoses:
 *   - Location noSMIBLocation flag
 *   - Machine relayId presence
 *   - hasSmib calculation
 *   - hasNoSasData calculation
 *   - Final sentinel strings that should be sent to frontend
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

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
  console.log(`${prefix}${label.padEnd(42)}${val}${suffix}`);
}

function fmt(n: unknown): string {
  if (n === null || n === undefined) return 'null';
  const num = Number(n);
  return isNaN(num) ? String(n) : num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const reportIdArg = process.argv[2];

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  // ── Step 1: Find the report ──────────────────────────────────────────────

  sep('STEP 1: Finding collection report');

  let report: Record<string, unknown> | null = null;

  if (reportIdArg) {
    report = await db.collection('collectionreports').findOne({ locationReportId: reportIdArg });
    if (!report) {
      report = await db.collection('collectionreports').findOne({ _id: reportIdArg });
    }
  } else {
    report = await db.collection('collectionreports').findOne(
      {},
      { sort: { createdAt: -1 } }
    );
  }

  if (!report) {
    console.log('  No collection report found.');
    await mongoose.disconnect();
    return;
  }

  const locationId = report.location as string;
  const locationReportId = report.locationReportId as string;
  row('Report ID (locationReportId):', locationReportId);
  row('Location ID:', locationId);
  row('Created:', report.createdAt);
  row('isEditing:', report.isEditing);

  // ── Step 2: Check location flags ─────────────────────────────────────────

  sep('STEP 2: Location flags');

  const location = await db.collection('gaminglocations').findOne(
    { _id: locationId },
    { projection: { name: 1, noSMIBLocation: 1, 'rel.licencee': 1 } }
  );

  if (!location) {
    console.log('  Location NOT FOUND in database!');
    await mongoose.disconnect();
    return;
  }

  row('Location name:', location.name);
  row('noSMIBLocation:', location.noSMIBLocation ?? false, 2,
    location.noSMIBLocation ? '⚠️  FLAGGED — all machines treated as SMIB-equivalent' : '');

  const isNoSMIBLocation = location.noSMIBLocation === true;

  // Check licencee includeJackpot
  if (location.rel?.licencee) {
    const licencee = await db.collection('licencees').findOne(
      { _id: location.rel.licencee },
      { projection: { name: 1, includeJackpot: 1 } }
    );
    row('Licencee:', licencee?.name ?? location.rel.licencee);
    row('includeJackpot:', Boolean(licencee?.includeJackpot));
  }

  // ── Step 3: Get all collections in this report ───────────────────────────

  sep('STEP 3: Collections in this report');

  const collections = await db.collection('collections')
    .find({ locationReportId, isCompleted: true })
    .toArray();

  row('Collection count:', collections.length);

  if (collections.length === 0) {
    console.log('  No completed collections found. Checking by locationReportId only...');
    const altCollections = await db.collection('collections')
      .find({ locationReportId })
      .toArray();
    row('Alt collection count (isCompleted ignored):', altCollections.length);
    for (const col of altCollections) {
      row('  ', `machineId=${col.machineId}, isCompleted=${col.isCompleted}, metersIn=${col.metersIn}`);
    }
  }

  // ── Step 4: For each collection, check SMIB status and sentinel strings ──

  sep('STEP 4: Per-machine SMIB analysis');

  for (const col of collections) {
    const machineId = String(col.machineId);

    const machine = await db.collection('machines').findOne(
      { _id: machineId },
      { projection: { serialNumber: 1, relayId: 1, meta: 1, gamingLocation: 1 } }
    );

    const hasRelay = Boolean((machine?.relayId as string)?.trim());
    const isWow = Boolean((machine?.meta as Record<string, unknown>)?.dataSync &&
      ((machine?.meta as Record<string, unknown>)?.dataSync as Record<string, unknown>)?.source === 'wow');

    const hasSmib = hasRelay || isWow || isNoSMIBLocation;

    const sasStart = (col.sasMeters as Record<string, unknown>)?.sasStartTime;
    const sasEnd = (col.sasMeters as Record<string, unknown>)?.sasEndTime;

    // Check if meter data exists for this machine in the SAS window
    const hasSasTimes = Boolean(sasStart && sasEnd);
    let hasMeterData = false;

    if (hasSasTimes && hasSmib) {
      const meterCount = await db.collection('meters').countDocuments({
        machine: machineId,
        readAt: { $gte: new Date(sasStart as string), $lte: new Date(sasEnd as string) },
        deletedAt: null,
      });
      hasMeterData = meterCount > 0;
    }

    const hasNoSasData = !hasSasTimes || !hasMeterData;

    // Machine gross
    const metersIn = Number(col.metersIn ?? 0);
    const metersOut = Number(col.metersOut ?? 0);
    const prevIn = Number(col.prevIn ?? 0);
    const prevOut = Number(col.prevOut ?? 0);
    const dropDelta = metersIn - prevIn;
    const cancelDelta = metersOut - prevOut;
    const machineGross = dropDelta - cancelDelta;

    // What the backend would produce
    const sasGrossSentinel = !hasSmib
      ? 'No SMIB for this Machine'
      : hasNoSasData
        ? 'No SAS Data'
        : 'CALCULATED';

    const variationSentinel = !hasSmib
      ? 'No SMIB for this Machine'
      : hasNoSasData
        ? machineGross  // meterGross - 0
        : 'CALCULATED';

    sep(`MACHINE: ${machine?.serialNumber ?? machineId}`, 80, '·');
    row('machineId:', machineId);
    row('serialNumber:', machine?.serialNumber ?? 'NOT FOUND');
    row('relayId:', (machine?.relayId as string) ?? 'NONE', 2,
      hasRelay ? '✅ has relay' : '❌ no relay');
    row('WOW machine:', isWow);
    row('');
    row('--- SMIB Calculation ---', '');
    row('hasRelay:', hasRelay);
    row('isWow:', isWow);
    row('isNoSMIBLocation:', isNoSMIBLocation, 2, isNoSMIBLocation ? '⚠️ from location flag' : '');
    row('hasSmib (= hasRelay || isWow || isNoSMIBLocation):', hasSmib, 2,
      hasSmib ? '✅ true' : '❌ false');
    row('');
    row('--- SAS Data Check ---', '');
    row('sasStartTime:', sasStart ? new Date(sasStart as string).toISOString() : 'NOT SET');
    row('sasEndTime:', sasEnd ? new Date(sasEnd as string).toISOString() : 'NOT SET');
    row('hasSasTimes:', hasSasTimes);
    row('hasMeterData (in SAS window):', hasMeterData);
    row('hasNoSasData:', hasNoSasData);
    row('');
    row('--- Backend Output Sentinels ---', '');
    row('sasGross sent to frontend:', sasGrossSentinel, 2,
      sasGrossSentinel === 'No SMIB for this Machine' ? '✅ CORRECT' :
      sasGrossSentinel === 'No SAS Data' ? '⚠️ Should show "No SMIB" when location has no SMIB' : '');
    row('variation sent to frontend:', typeof variationSentinel === 'number' ? fmt(variationSentinel) : variationSentinel, 2,
      variationSentinel === 'No SMIB for this Machine' ? '✅ CORRECT' :
      typeof variationSentinel === 'number' ? `⚠️ Shows ${fmt(variationSentinel)} instead of "No SMIB"` : '');

    row('machineGross:', fmt(machineGross));
  }

  // ── Step 5: Summary ──────────────────────────────────────────────────────

  sep('SUMMARY');

  if (isNoSMIBLocation) {
    console.log(`\n  ⚠️  LOCATION "${location.name}" HAS noSMIBLocation = true`);
    console.log('  This means ALL machines at this location are treated as SMIB-equivalent.');
    console.log('  But machines without actual relayId devices have no SAS meter data.');
    console.log('  Result: "No SAS Data" + variation shown instead of "No SMIB for this Machine"');
    console.log('');
    console.log('  FIX NEEDED: When isNoSMIBLocation=true and hasNoSasData=true,');
    console.log('  the backend should send "No SMIB for this Machine" sentinel instead.');
  } else {
    const collections = await db.collection('collections')
      .find({ locationReportId, isCompleted: true })
      .toArray();

    for (const col of collections) {
      const machine = await db.collection('machines').findOne(
        { _id: col.machineId },
        { projection: { relayId: 1, meta: 1 } }
      );
      const hasRelay = Boolean((machine?.relayId as string)?.trim());
      const isWow = Boolean((machine?.meta as Record<string, unknown>)?.dataSync &&
        ((machine?.meta as Record<string, unknown>)?.dataSync as Record<string, unknown>)?.source === 'wow');
      if (!hasRelay && !isWow) {
        console.log(`  Machine ${col.machineId} has no SMIB — should show "No SMIB for this Machine"`);
      }
    }
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
