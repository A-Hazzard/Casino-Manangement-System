/**
 * Diagnostic Script: Diagnose totalVariation computation for a CollectionReport
 *
 * Runs against sas-prod with two query methods to expose BSON type mismatches.
 *
 * Usage:
 *   bun run scripts/diagnose-variation.ts <locationReportId>
 */

import mongoose from 'mongoose';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://sunny1:87ydaiuhdsia2e@147.182.210.65:32017/sas-prod?authSource=admin';

async function diagnose(locationReportId: string): Promise<void> {
  console.log(`\n🔍 Diagnosing variation for: ${locationReportId}\n`);

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection not established');

    const collections = db.collection('collections');
    const machines = db.collection('machines');
    const gamingLocations = db.collection('gaminglocations');
    const licencees = db.collection('licencees');
    const meters = db.collection('meters');
    const collReports = db.collection('collectionreports');

    // ── Step 1: Fetch the collection report ──────────────────────────
    const report = await collReports.findOne(
      { locationReportId },
      { projection: { location: 1, totalVariation: 1, locationName: 1 } }
    );
    if (!report) {
      console.error(`❌ Collection report ${locationReportId} not found`);
      process.exit(1);
    }
    console.log(
      `   Report: ${locationReportId}  (${report.locationName || 'unknown'})`
    );
    console.log(`   Stored totalVariation: ${report.totalVariation}`);
    console.log(`   Location ID: ${report.location}\n`);

    // ── Step 2: Fetch the collections ────────────────────────────────
    const colls = await collections
      .find(
        { locationReportId },
        { projection: { movement: 1, sasMeters: 1, machineId: 1 } }
      )
      .toArray();

    console.log(`   Collections count: ${colls.length}\n`);
    if (!colls.length) {
      console.log('   No collections found.');
      return;
    }

    // ── Step 3: Location → licencee → includeJackpot ────────────────
    const locationId = report.location as string | undefined;
    let includeJackpot = false;

    if (locationId) {
      const location = await gamingLocations.findOne(
        { _id: locationId },
        { projection: { 'rel.licencee': 1, noSMIBLocation: 1 } }
      );
      console.log(
        `   Location noSMIBLocation: ${location?.noSMIBLocation ?? 'not set'}`
      );

      if (location?.rel?.licencee) {
        const licencee = await licencees.findOne(
          { _id: location.rel.licencee },
          { projection: { includeJackpot: 1 } }
        );
        includeJackpot = Boolean(licencee?.includeJackpot);
      }
      console.log(`   includeJackpot: ${includeJackpot}\n`);
    }

    // ── Step 4: SMIB map ─────────────────────────────────────────────
    const machineIds = colls
      .map(c => c.machineId)
      .filter((id): id is string => Boolean(id));

    let smibMap = new Map<string, boolean>();
    if (machineIds.length) {
      const machineDocs = await machines
        .find(
          { _id: { $in: machineIds } },
          { projection: { _id: 1, relayId: 1 } }
        )
        .toArray();
      smibMap = new Map(
        machineDocs.map(m => [
          String(m._id),
          Boolean((m.relayId as string)?.trim()),
        ])
      );
    }

    // ── Step 5: Data type check ──────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(' SAS METERS DATA TYPES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const col of colls) {
      const sm = col.sasMeters;
      const mg = col.movement?.gross ?? 0;
      const startTimeType = sm?.sasStartTime
        ? typeof sm.sasStartTime
        : 'missing';
      const endTimeType = sm?.sasEndTime ? typeof sm.sasEndTime : 'missing';
      console.log(
        `   ${col.machineId}: gross=${mg}, startType=${startTimeType}, endType=${endTimeType}`
      );
      console.log(`     start="${sm?.sasStartTime}" end="${sm?.sasEndTime}"`);
    }
    console.log();

    // ── Step 6: Test both query approaches ───────────────────────────
    const meterBase = colls.filter(
      c => c.machineId && c.sasMeters?.sasStartTime && c.sasMeters?.sasEndTime
    );

    // Method A: Pass strings directly (matching current code)
    const queriesA = meterBase.map(c => ({
      machineId: c.machineId as string,
      startTime: c.sasMeters!.sasStartTime!,
      endTime: c.sasMeters!.sasEndTime!,
    }));

    // Method B: Convert to Date objects (proper handling)
    const queriesB = meterBase.map(c => ({
      machineId: c.machineId as string,
      startTime: new Date(c.sasMeters!.sasStartTime!),
      endTime: new Date(c.sasMeters!.sasEndTime!),
    }));

    // Run Method A
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(' TEST A: String dates in $match (current code)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const mapA = new Map<
      string,
      { drop: number; cancelled: number; jackpot: number }
    >();
    if (queriesA.length > 0) {
      for await (const doc of meters.aggregate([
        {
          $match: {
            $or: queriesA.map(q => ({
              machine: q.machineId,
              readAt: { $gte: q.startTime, $lte: q.endTime },
            })),
          },
        },
        {
          $group: {
            _id: '$machine',
            totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
            totalCancelled: {
              $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
            },
            totalJackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
          },
        },
      ])) {
        mapA.set(doc._id, {
          drop: doc.totalDrop,
          cancelled: doc.totalCancelled,
          jackpot: doc.totalJackpot,
        });
        console.log(
          `   HIT: ${doc._id} drop=${doc.totalDrop} cancelled=${doc.totalCancelled} jackpot=${doc.totalJackpot}`
        );
      }
    }
    console.log(`   Total matches: ${mapA.size}\n`);

    // Run Method B
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(' TEST B: Date objects in $match (correct handling)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const mapB = new Map<
      string,
      { drop: number; cancelled: number; jackpot: number }
    >();
    if (queriesB.length > 0) {
      for await (const doc of meters.aggregate([
        {
          $match: {
            $or: queriesB.map(q => ({
              machine: q.machineId,
              readAt: { $gte: q.startTime, $lte: q.endTime },
            })),
          },
        },
        {
          $group: {
            _id: '$machine',
            totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
            totalCancelled: {
              $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
            },
            totalJackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
          },
        },
      ])) {
        mapB.set(doc._id, {
          drop: doc.totalDrop,
          cancelled: doc.totalCancelled,
          jackpot: doc.totalJackpot,
        });
        console.log(
          `   HIT: ${doc._id} drop=${doc.totalDrop} cancelled=${doc.totalCancelled} jackpot=${doc.totalJackpot}`
        );
      }
    }
    console.log(`   Total matches: ${mapB.size}\n`);

    // ── Step 7: Compute variation with both methods ──────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(' VARIATION COMPUTATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let sumGross = 0;
    for (const col of colls) {
      const hasSmib = smibMap.get(String(col.machineId)) ?? false;
      const mg = col.movement?.gross ?? 0;
      if (hasSmib) sumGross += mg;
    }

    // Method A: string queries (no matches → hasNoSasData=true → variation = meterGross)
    let varA = 0;
    for (const col of colls) {
      const mid = String(col.machineId);
      if (!smibMap.get(mid)) continue;
      const mg = col.movement?.gross ?? 0;
      const hasNoSasData = !mapA.has(mid);
      const adjSas = hasNoSasData
        ? 0
        : mapA.get(mid)!.drop -
          mapA.get(mid)!.cancelled -
          (includeJackpot ? mapA.get(mid)!.jackpot : 0);
      const v = mg - adjSas;
      console.log(
        `   [A] ${mid}: gross=${mg}, adjustedSas=${adjSas.toFixed(2)}, hasNoSas=${hasNoSasData}, var=${v.toFixed(2)}`
      );
      varA += v;
    }

    console.log();

    // Method B: Date queries (proper matches)
    let varB = 0;
    for (const col of colls) {
      const mid = String(col.machineId);
      if (!smibMap.get(mid)) continue;
      const mg = col.movement?.gross ?? 0;
      const hasNoSasData = !mapB.has(mid);
      const adjSas = hasNoSasData
        ? 0
        : mapB.get(mid)!.drop -
          mapB.get(mid)!.cancelled -
          (includeJackpot ? mapB.get(mid)!.jackpot : 0);
      const v = mg - adjSas;
      console.log(
        `   [B] ${mid}: gross=${mg}, adjustedSas=${adjSas.toFixed(2)}, hasNoSas=${hasNoSasData}, var=${v.toFixed(2)}`
      );
      varB += v;
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(` RESULT:`);
    console.log(`   Method A (strings, no matches):  ${varA}`);
    console.log(`   Method B (Date objects, matches): ${varB}`);
    console.log(
      `   Stored totalVariation:            ${report.totalVariation}`
    );
    console.log(`   Sum of meterGross (SMIB only):     ${sumGross}`);

    if (Math.abs(varB - Number(report.totalVariation)) < 0.01) {
      console.log(
        `\n   ✅ Stored value matches Method B → backfill computed correctly`
      );
    } else if (Math.abs(varA - Number(report.totalVariation)) < 0.01) {
      console.log(
        `\n   ⚠️  Stored value matches Method A (broken string queries)`
      );
    } else {
      console.log(`\n   ❌ Neither method matches stored value exactly`);
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

const reportId = process.argv[2];
if (!reportId) {
  console.error(
    'Usage: bun run scripts/diagnose-variation.ts <locationReportId>'
  );
  process.exit(1);
}

diagnose(reportId).catch(err => {
  console.error(
    '\n❌ Fatal error:',
    err instanceof Error ? err.message : String(err)
  );
  process.exit(1);
});
