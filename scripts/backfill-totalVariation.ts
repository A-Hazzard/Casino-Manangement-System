/**
 * Backfill Script: Recompute and update totalVariation on all CollectionReport documents
 *
 * For each collection report, this script:
 * 1. Fetches its collections
 * 2. Computes the "manual variation total" using the same logic as accountingDetails.ts
 *    (hasSmib filtering, hasNoSasData check, recalculated SAS gross from Meters aggregation)
 * 3. If the stored totalVariation doesn't match, updates it
 *
 * Resume-safe: Only processes reports where totalVariation is null, undefined, or 0.
 * Already-corrected records are skipped automatically.
 *
 * Usage:
 *   bun run scripts/backfill-totalVariation.ts [--all]
 *
 * By default, only processes reports with totalVariation = 0 or missing.
 * Use --all to reprocess every report (full re-run).
 */

import mongoose from 'mongoose';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://sunny1:87ydaiuhdsia2e@147.182.210.65:32017/sas-prod?authSource=admin';

const BATCH_SIZE = 50; // Process N reports per log checkpoint
const MAX_TIME_MS = 300000; // 5 min per aggregation query

async function backfillTotalVariation(): Promise<void> {
  console.log('🔄 Connecting to sas-prod...\n');

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  const reprocessAll = process.argv.includes('--all');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    if (!db) {
      console.error('❌ Database connection not established');
      process.exit(1);
    }

    const collectionReports = db.collection('collectionreports');
    const collections = db.collection('collections');
    const machines = db.collection('machines');
    const gamingLocations = db.collection('gaminglocations');
    const licencees = db.collection('licencees');
    const meters = db.collection('meters');

    // ── Build filter: only need-updating records ─────────────────────
    const matchStage: Record<string, unknown> = {
      locationReportId: { $exists: true, $ne: null },
    };

    if (!reprocessAll) {
      // Resume-safe: only target records where totalVariation is missing or 0
      matchStage.$or = [
        { totalVariation: null },
        { totalVariation: { $exists: false } },
        { totalVariation: 0 },
      ];
    }

    const totalReports = await collectionReports.countDocuments(matchStage);
    console.log(`📊 Found ${totalReports} reports to process\n`);

    if (totalReports === 0) {
      console.log('✅ No reports need backfill — all done!');
      return;
    }

    // Sort for deterministic ordering and resume safety
    const cursor = collectionReports
      .find(matchStage, {
        projection: { locationReportId: 1, location: 1, totalVariation: 1 },
        sort: { locationReportId: 1 },
      })
      .batchSize(BATCH_SIZE);

    let checked = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let lastReportId: string | null = null;

    const startTime = Date.now();

    for await (const report of cursor) {
      checked++;
      const { locationReportId, location: locationId } = report;
      lastReportId = locationReportId as string;

      // Progress log every BATCH_SIZE
      if (checked % BATCH_SIZE === 0 || checked === 1) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = (checked / (Date.now() - startTime) * 1000).toFixed(1);
        console.log(
          `   [${checked}/${totalReports}] ${rate} r/s | Last: ${locationReportId} | Updated: ${updated} | Elapsed: ${elapsed}s`
        );
      }

      try {
        const colls = await collections
          .find(
            { locationReportId },
            { projection: { movement: 1, sasMeters: 1, machineId: 1 } }
          )
          .toArray();

        if (!colls.length) {
          skipped++;
          continue;
        }

        // Fetch relayId per machine for SMIB filtering
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
            .maxTimeMS(MAX_TIME_MS)
            .toArray();
          smibMap = new Map(
            machineDocs.map(m => [
              String(m._id),
              Boolean((m.relayId as string)?.trim()),
            ])
          );
        }

        // Check includeJackpot from licencee
        let includeJackpot = false;
        if (locationId) {
          const location = await gamingLocations.findOne(
            { _id: locationId },
            { projection: { 'rel.licencee': 1 } }
          );
          if (location?.rel?.licencee) {
            const licencee = await licencees.findOne(
              { _id: location.rel.licencee },
              { projection: { includeJackpot: 1 } }
            );
            includeJackpot = Boolean(licencee?.includeJackpot);
          }
        }

        // Batched SAS meter data query
        const meterQueries = colls
          .filter(
            c =>
              c.machineId &&
              c.sasMeters?.sasStartTime &&
              c.sasMeters?.sasEndTime
          )
          .map(c => ({
            machineId: c.machineId as string,
            startTime: new Date(c.sasMeters!.sasStartTime!).getTime(),
            endTime: new Date(c.sasMeters!.sasEndTime!).getTime(),
          }));

        const meterDataMap = new Map<
          string,
          { drop: number; cancelled: number; jackpot: number }
        >();
        if (meterQueries.length > 0) {
          const aggCursor = meters.aggregate(
            [
              {
                $match: {
                  $or: meterQueries.map(q => ({
                    machine: q.machineId,
                    readAt: {
                      $gte: new Date(q.startTime),
                      $lte: new Date(q.endTime),
                    },
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
            ],
            { maxTimeMS: MAX_TIME_MS }
          );

          for await (const doc of aggCursor) {
            meterDataMap.set(doc._id as string, {
              drop: doc.totalDrop as number,
              cancelled: doc.totalCancelled as number,
              jackpot: doc.totalJackpot as number,
            });
          }
        }

        // Compute per-machine variation — identical to accountingDetails.ts
        const computedTotal = colls.reduce((sum, col) => {
          const hasSmib = smibMap.get(String(col.machineId)) ?? false;
          if (!hasSmib) return sum;

          const meterGross = col.movement?.gross ?? 0;

          let sasGross = 0;
          let machineJackpot = 0;
          if (
            col.machineId &&
            col.sasMeters?.sasStartTime &&
            col.sasMeters?.sasEndTime
          ) {
            const meterData = meterDataMap.get(col.machineId as string);
            if (meterData) {
              sasGross = meterData.drop - meterData.cancelled;
              machineJackpot = meterData.jackpot;
            }
          }

          const adjustedSasGross = includeJackpot
            ? sasGross - machineJackpot
            : sasGross;

          const hasNoSasData =
            !col.sasMeters?.sasStartTime ||
            !col.sasMeters?.sasEndTime ||
            !meterDataMap.has(String(col.machineId));

          return sum + (meterGross - (hasNoSasData ? 0 : adjustedSasGross));
        }, 0);

        const storedTotal = typeof report.totalVariation === 'number'
          ? report.totalVariation
          : null;
        const roundedComputed = Number(computedTotal.toFixed(2));

        if (
          storedTotal === null ||
          Math.abs(storedTotal - roundedComputed) > 0.01
        ) {
          await collectionReports.updateOne(
            { locationReportId },
            { $set: { totalVariation: roundedComputed } }
          );
          updated++;
          console.log(
            `   [${checked}] ${locationReportId}: ${storedTotal ?? 'MISSING'} → ${roundedComputed}`
          );
        }
      } catch (err) {
        errors++;
        console.error(
          `[${checked}] Error on ${locationReportId}:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(
      `\n📊 Results: Checked=${checked}, Updated=${updated}, Skipped=${skipped}, Errors=${errors}`
    );
    console.log(`⏱️  Time: ${elapsed}s | Last processed: ${lastReportId || 'none'}`);
    console.log('✅ Backfill complete\n');
  } catch (error) {
    console.error(
      '\n❌ Backfill failed:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

backfillTotalVariation();