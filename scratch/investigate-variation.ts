/**
 * Investigate variation in the most recent collection report.
 *
 * Usage: bun run scratch/investigate-variation.ts [locationReportId]
 *   - If no locationReportId provided, finds the most recent report
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

async function main() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const db = mongoose.connection.db!;
  const collReports = db.collection('collectionreports');
  const collections = db.collection('collections');
  const machines = db.collection('machines');
  const metersCol = db.collection('meters');
  const gamingLocations = db.collection('gaminglocations');
  const licencees = db.collection('licencees');

  // ── Find the target report ────────────────────────────────────────
  const locationReportId = process.argv[2];

  let report;
  if (locationReportId) {
    report = await collReports.findOne({ locationReportId });
    if (!report) {
      console.error(`Report ${locationReportId} not found`);
      process.exit(1);
    }
  } else {
    report = await collReports.findOne(
      {},
      { sort: { timestamp: -1 } }
    );
    if (!report) {
      console.error('No reports found');
      process.exit(1);
    }
  }

  console.log('='.repeat(80));
  console.log('REPORT:', report.locationReportId);
  console.log('  Location:', report.locationName, `(${report.location})`);
  console.log('  Timestamp:', report.timestamp);
  console.log('  Stored totalVariation:', report.totalVariation);
  console.log('  Stored totalGross:', report.totalGross);
  console.log('  Stored totalSasGross:', report.totalSasGross);
  console.log('  isEditing:', report.isEditing);
  console.log('');

  // ── Fetch licencee config ─────────────────────────────────────────
  let includeJackpot = false;
  let isNoSMIBLocation = false;
  if (report.location) {
    const location = await gamingLocations.findOne(
      { _id: report.location },
      { projection: { 'rel.licencee': 1, noSMIBLocation: 1 } }
    );
    isNoSMIBLocation = location?.noSMIBLocation === true;
    console.log('  Location noSMIBLocation:', isNoSMIBLocation);
    if (location?.rel?.licencee) {
      const licencee = await licencees.findOne(
        { _id: location.rel.licencee },
        { projection: { includeJackpot: 1 } }
      );
      includeJackpot = Boolean(licencee?.includeJackpot);
    }
    console.log('  includeJackpot:', includeJackpot);
  }
  console.log('');

  // ── Fetch all collections for this report ─────────────────────────
  const colls = await collections
    .find({ locationReportId: report.locationReportId })
    .sort({ timestamp: 1 })
    .toArray();

  console.log('='.repeat(80));
  console.log(`COLLECTIONS: ${colls.length} total`);
  console.log('');

  // ── Fetch machine relay info ──────────────────────────────────────
  const machineIds = colls
    .map(c => c.machineId)
    .filter((id): id is string => Boolean(id));

  const machineDocs = machineIds.length
    ? await machines
        .find(
          { _id: { $in: machineIds } } as Record<string, unknown>,
          { projection: { _id: 1, relayId: 1, serialNumber: 1, collectionMeters: 1 } }
        )
        .toArray()
    : [];

  const relayMap = new Map(
    machineDocs.map(m => [String(m._id), Boolean((m.relayId as string)?.trim())])
  );

  // ── For each collection, show details and run SAS meter query ─────
  console.log('─'.repeat(80));
  console.log('PER-MACHINE DETAILED ANALYSIS');
  console.log('─'.repeat(80));

  let computedTotalVariation = 0;
  let computedTotalGross = 0;
  let computedTotalSasGross = 0;

  for (const col of colls) {
    const mid = String(col.machineId);
    const hasSmib = relayMap.get(mid) ?? false;
    const machineInfo = machineDocs.find(m => String(m._id) === mid);

    console.log(`\nMachine: ${mid}`);
    console.log(`  Serial: ${machineInfo?.serialNumber || 'N/A'}`);
    console.log(`  Has SMIB (relayId): ${hasSmib}`);
    console.log(`  RAM Clear: ${col.ramClear || false}`);

    // Collection meter values
    const metersIn = col.metersIn ?? 0;
    const metersOut = col.metersOut ?? 0;
    const prevIn = col.prevIn ?? 0;
    const prevOut = col.prevOut ?? 0;
    const movementDrop = col.movement?.drop ?? (metersIn - prevIn);
    const movementCancelled = col.movement?.totalCancelledCredits ?? (metersOut - prevOut);
    const movementGross = col.movement?.gross ?? (movementDrop - movementCancelled);

    console.log(`  metersIn=${metersIn}  metersOut=${metersOut}`);
    console.log(`  prevIn=${prevIn}  prevOut=${prevOut}`);
    console.log(`  movement: drop=${movementDrop} cancelled=${movementCancelled} gross=${movementGross}`);

    // SAS time window
    const sasStart = col.sasMeters?.sasStartTime;
    const sasEnd = col.sasMeters?.sasEndTime;
    const sasGross = col.sasMeters?.gross ?? null;
    console.log(`  sasMeters: start=${sasStart}  end=${sasEnd}  storedGross=${sasGross}`);

    // Query meters for this SAS time window
    let sasDrop = 0;
    let sasCancelled = 0;
    let sasJackpot = 0;
    let meterCount = 0;
    let queryError: string | null = null;

    if (mid && sasStart && sasEnd) {
      const startDate = new Date(sasStart);
      const endDate = new Date(sasEnd);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        queryError = `Invalid SAS dates: start=${sasStart} end=${sasEnd}`;
      } else {
        // Native MongoDB driver aggregation (not Mongoose, so no .cursor())
        const docs = await metersCol.aggregate([
          { $match: { deletedAt: null } },
          {
            $match: {
              machine: mid,
              readAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: '$machine',
              totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
              totalCancelled: { $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] } },
              totalJackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
              meterCount: { $sum: 1 },
            },
          },
        ]).toArray();

        if (docs.length > 0) {
          const doc = docs[0];
          sasDrop = doc.totalDrop;
          sasCancelled = doc.totalCancelled;
          sasJackpot = doc.totalJackpot;
          meterCount = doc.meterCount;
          console.log(`  SAS meters query: drop=${sasDrop} cancelled=${sasCancelled} jackpot=${sasJackpot} (${meterCount} records)`);
        } else {
          queryError = 'No meter records found in SAS time window';
        }
      }
    } else {
      queryError = sasStart && sasEnd ? 'Missing machineId' : 'Missing SAS time window';
    }

    if (queryError) {
      console.log(`  SAS meters query: ${queryError}`);
      console.log(`  → hasNoSasData=true, variation = meterGross - 0 = ${movementGross}`);
    }

    // Compute variation
    const sasGrossComputed = sasDrop - sasCancelled;
    const hasNoSasData = queryError !== null;
    const adjustedSasGross = includeJackpot
      ? sasGrossComputed - sasJackpot
      : sasGrossComputed;

    let variation;
    if (isNoSMIBLocation || !hasSmib) {
      variation = 0;
      console.log(`  → No SMIB for this Machine, variation = 0`);
    } else if (hasNoSasData) {
      variation = movementGross;
      console.log(`  → hasNoSasData=true, variation = meterGross - 0 = ${movementGross}`);
    } else {
      variation = movementGross - adjustedSasGross;
      console.log(`  → variation = meterGross(${movementGross}) - adjustedSasGross(${adjustedSasGross}) = ${variation}`);
    }

    computedTotalVariation += variation;
    computedTotalGross += movementGross;
    computedTotalSasGross += hasNoSasData ? 0 : sasGrossComputed;

    // Show all meters for this machine around this period for deeper context
    if (mid && sasStart && sasEnd) {
      const startDate = new Date(sasStart);
      const endDate = new Date(sasEnd);

      // Get ±1 hour window
      const contextStart = new Date(startDate.getTime() - 60 * 60 * 1000);
      const contextEnd = new Date(endDate.getTime() + 60 * 60 * 1000);

      const allMeters = await metersCol
        .find({
          machine: mid,
          readAt: { $gte: contextStart, $lte: contextEnd },
          deletedAt: null,
        })
        .sort({ readAt: 1 })
        .toArray();

      if (allMeters.length > 0) {
        console.log(`  ── All meters ±1hr around SAS window (${allMeters.length} records) ──`);
        for (const m of allMeters) {
          const inWindow =
            m.readAt >= startDate && m.readAt <= endDate ? '<<<' : '';
          console.log(
            `     ${m.readAt} drop=${m.movement?.drop ?? '-'} cancelled=${m.movement?.totalCancelledCredits ?? '-'} jackpot=${m.movement?.jackpot ?? '-'} source=${m.meterSource || '?'} ${inWindow}`
          );
        }
      } else {
        console.log(`  ── No meters found in ±1hr window around SAS time ──`);
      }
    }
    console.log('');
  }

  // ── Machine history deep dive ─────────────────────────────────────
  console.log('='.repeat(80));
  console.log('MACHINE HISTORY DEEP DIVE');
  console.log('='.repeat(80));

  for (const machineDoc of machineDocs) {
    const mid = String(machineDoc._id);
    console.log(`\nMachine: ${mid} (${machineDoc.serialNumber || 'N/A'})`);
    console.log(`  relayId: ${machineDoc.relayId || 'NONE'}`);

    // collectionMeters
    const cm = machineDoc.collectionMeters;
    if (cm) {
      console.log(`  collectionMeters: metersIn=${cm.metersIn} metersOut=${cm.metersOut}`);
    } else {
      console.log('  collectionMeters: NOT SET');
    }

    // collectionMetersHistory
    const hist = machineDoc.collectionMetersHistory;
    if (hist && Array.isArray(hist) && hist.length > 0) {
      console.log(`  collectionMetersHistory (${hist.length} entries):`);
      for (const h of hist) {
        console.log(
          `     report=${h.locationReportId} metersIn=${h.metersIn} metersOut=${h.metersOut} prevMetersIn=${h.prevMetersIn} prevMetersOut=${h.prevMetersOut} drop=${(h.metersIn || 0) - (h.prevMetersIn || 0)} cancelled=${(h.metersOut || 0) - (h.prevMetersOut || 0)}`
        );
      }
    } else {
      console.log('  collectionMetersHistory: EMPTY');
    }

    // Check if this machine is found in any other completed collections
    const otherCollections = await collections
      .find({
        machineId: mid,
        isCompleted: true,
        locationReportId: { $exists: true, $ne: report.locationReportId },
      })
      .sort({ timestamp: -1 })
      .limit(3)
      .toArray();

    if (otherCollections.length > 0) {
      console.log(`  Previous completed collections (${otherCollections.length}):`);
      for (const oc of otherCollections) {
        console.log(
          `     report=${oc.locationReportId} ts=${oc.timestamp} metersIn=${oc.metersIn} metersOut=${oc.metersOut} prevIn=${oc.prevIn} prevOut=${oc.prevOut}`
        );
      }
    } else {
      console.log('  Previous completed collections: NONE (first collection?)');
    }

    // All meters for this machine in the last 3 days
    const allMeters = await metersCol
      .find({
        machine: mid,
        deletedAt: null,
        readAt: {
          $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      })
      .sort({ readAt: 1 })
      .toArray();

    if (allMeters.length > 0) {
      console.log(`  All meters (last 3 days, ${allMeters.length} records):`);
      let cumDrop = 0;
      let cumCancelled = 0;
      for (const m of allMeters) {
        cumDrop += m.movement?.drop || 0;
        cumCancelled += m.movement?.totalCancelledCredits || 0;
        console.log(
          `     ${m.readAt} drop=${m.movement?.drop ?? '-'} cancelled=${m.movement?.totalCancelledCredits ?? '-'} source=${m.meterSource || '?'}  cumDrop=${cumDrop} cumCancelled=${cumCancelled}`
        );
      }
    } else {
      console.log('  All meters (last 3 days): NONE');
    }
  }

  // ── Summary ───────────────────────────────────────────────────────
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`  Stored totalVariation:   ${report.totalVariation}`);
  console.log(`  Computed totalVariation: ${Math.round(computedTotalVariation * 100) / 100}`);
  console.log(`  Stored totalGross:       ${report.totalGross}`);
  console.log(`  Computed totalGross:     ${Math.round(computedTotalGross * 100) / 100}`);
  console.log(`  Stored totalSasGross:    ${report.totalSasGross}`);
  console.log(`  Computed totalSasGross:  ${Math.round(computedTotalSasGross * 100) / 100}`);
  console.log('');

  const varDiff = Math.abs(computedTotalVariation - Number(report.totalVariation));
  if (varDiff < 0.01) {
    console.log('✅ Computed variation matches stored value');
  } else {
    console.log(`❌ MISMATCH: Difference of ${varDiff}`);
    console.log(`   Stored: ${report.totalVariation}, Computed: ${Math.round(computedTotalVariation * 100) / 100}`);
  }

  await mongoose.disconnect();
  console.log('\nDone');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
