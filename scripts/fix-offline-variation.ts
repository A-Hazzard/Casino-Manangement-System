/**
 * Fix Script: Recompute totalVariation for offline SMIB collection reports
 *
 * Old offline SMIB collections have sasMeters.gross = 0 stored (no live SAS data existed
 * at collection time). The original computeTotalVariation read this as $0 SAS and computed
 * meterGross - 0 = meterGross, producing phantom variation.
 *
 * This script applies the corrected logic: when sasMeters.gross = 0 AND sasMeters.drop = 0
 * for a SMIB machine, treat effectiveSasGross = movement.gross → variation = 0.
 *
 * Usage:
 *   bun run scripts/fix-offline-variation.ts <locationReportId>    # Fix one report
 *   bun run scripts/fix-offline-variation.ts --all                  # Fix all affected reports
 *
 * The script is read-only by default — add --write to commit the update to MongoDB.
 */

import mongoose from 'mongoose';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-aaron?authSource=admin';

type CollectionRow = {
  _id: string;
  machineId?: string;
  movement?: { gross?: number };
  sasMeters?: {
    gross?: number | null;
    drop?: number | null;
    jackpot?: number | null;
    sasStartTime?: unknown;
    sasEndTime?: unknown;
  };
};

async function computeCorrectVariation(
  colls: CollectionRow[],
  smibMap: Map<string, boolean>,
  includeJackpot: boolean
): Promise<number> {
  return colls.reduce((sum, col) => {
    const hasSmib = smibMap.get(String(col.machineId)) ?? false;
    if (!hasSmib) return sum;

    const meterGross = col.movement?.gross ?? 0;
    const storedSasGross = col.sasMeters?.gross;

    if (storedSasGross === undefined || storedSasGross === null) return sum;

    // Offline SMIB heuristic: sasMeters.gross = 0 AND sasMeters.drop = 0 means no live
    // SAS data existed — use movement.gross so variation = 0.
    const effectiveSasGross =
      storedSasGross === 0 && (col.sasMeters?.drop ?? 0) === 0
        ? meterGross
        : storedSasGross;

    const machineJackpot = col.sasMeters?.jackpot ?? 0;
    const adjustedSasGross = includeJackpot
      ? effectiveSasGross - machineJackpot
      : effectiveSasGross;

    return sum + (meterGross - adjustedSasGross);
  }, 0);
}

async function fixReport(
  db: mongoose.mongo.Db,
  locationReportId: string,
  write: boolean
): Promise<{ before: number | null; after: number; changed: boolean }> {
  const collReports = db.collection('collectionreports');
  const collections = db.collection('collections');
  const machines = db.collection('machines');
  const gamingLocations = db.collection('gaminglocations');
  const licencees = db.collection('licencees');

  const report = await collReports.findOne(
    { locationReportId },
    { projection: { location: 1, totalVariation: 1 } }
  );
  if (!report) throw new Error(`Report not found: ${locationReportId}`);

  const colls = (await collections
    .find(
      { locationReportId },
      { projection: { movement: 1, sasMeters: 1, machineId: 1 } }
    )
    .toArray()) as CollectionRow[];

  if (!colls.length) return { before: report.totalVariation as number | null, after: 0, changed: false };

  const machineIds = colls
    .map(col => col.machineId)
    .filter((id): id is string => Boolean(id));

  let smibMap = new Map<string, boolean>();
  if (machineIds.length) {
    const machineDocs = await machines
      .find({ _id: { $in: machineIds } }, { projection: { _id: 1, relayId: 1 } })
      .toArray();
    smibMap = new Map(
      machineDocs.map(m => [String(m._id), Boolean((m.relayId as string)?.trim())])
    );
  }

  let includeJackpot = false;
  const locationId = report.location as string | undefined;
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

  const computed = await computeCorrectVariation(colls, smibMap, includeJackpot);
  const rounded = Number(computed.toFixed(2));
  const before = typeof report.totalVariation === 'number' ? (report.totalVariation as number) : null;
  const changed = before === null || Math.abs(before - rounded) > 0.01;

  if (changed && write) {
    await collReports.updateOne(
      { locationReportId },
      { $set: { totalVariation: rounded } }
    );
  }

  return { before, after: rounded, changed };
}

async function main() {
  const args = process.argv.slice(2);
  const allMode = args.includes('--all');
  const write = args.includes('--write');
  const targetId = args.find(arg => !arg.startsWith('--'));

  if (!allMode && !targetId) {
    console.error('Usage: bun run scripts/fix-offline-variation.ts <locationReportId> [--write]');
    console.error('       bun run scripts/fix-offline-variation.ts --all [--write]');
    process.exit(1);
  }

  console.log(`\n🔧 fix-offline-variation — mode=${allMode ? 'all' : 'single'} write=${write}`);
  if (!write) console.log('   (dry run — add --write to commit changes)\n');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  try {
    const db = mongoose.connection.db!;
    const collReports = db.collection('collectionreports');

    let reportIds: string[];

    if (allMode) {
      // Target reports where totalVariation != 0 and have SMIB machines with gross=0 collections
      const cursor = collReports.find(
        {
          locationReportId: { $exists: true, $ne: null },
          totalVariation: { $ne: 0, $ne: null, $exists: true },
        },
        { projection: { locationReportId: 1 } }
      );
      const docs = await cursor.toArray();
      reportIds = docs.map(d => d.locationReportId as string).filter(Boolean);
      console.log(`📊 Found ${reportIds.length} non-zero variation reports to check\n`);
    } else {
      reportIds = [targetId!];
    }

    let checked = 0;
    let changed = 0;
    let errors = 0;

    for (const locationReportId of reportIds) {
      checked++;
      try {
        const result = await fixReport(db, locationReportId, write);

        if (result.changed) {
          changed++;
          const action = write ? '✅ UPDATED' : '📋 WOULD UPDATE';
          console.log(`${action}  ${locationReportId}`);
          console.log(`         before=${result.before ?? 'null'}  after=${result.after}`);
        } else if (!allMode) {
          console.log(`✅ No change needed: ${locationReportId}`);
          console.log(`   stored=${result.before}  computed=${result.after}`);
        }
      } catch (err) {
        errors++;
        console.error(`❌ Error on ${locationReportId}:`, err instanceof Error ? err.message : String(err));
      }
    }

    console.log(`\n📊 Done: checked=${checked}  changed=${changed}  errors=${errors}`);
    if (!write && changed > 0) {
      console.log('\n   Re-run with --write to apply the changes.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected\n');
  }
}

main().catch(err => {
  console.error('❌ Fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
