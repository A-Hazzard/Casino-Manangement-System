/**
 * investigate-smib-after-supplemental.ts
 *
 * Read-only investigation script. For each machine that has supplemental meters,
 * prints the 3-meter window:
 *
 *   meter_A  (last SAS_READ before the supplemental)
 *   meter_S  (the supplemental / manual meter, isSupplemental=true)
 *   meter_B  (first SAS_READ after the supplemental)
 *
 * Shows that meter_B.movement.drop is 0 (the bug) and what the correct value
 * should be: meter_B.drop - meter_A.drop.
 *
 * Run:
 *   bunx tsx scratch/investigate-smib-after-supplemental.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';

// ============================================================================
// Inline minimal schemas — avoids Next.js module resolution in script context
// ============================================================================

const movementSchema = new mongoose.Schema(
  {
    drop: Number,
    totalCancelledCredits: Number,
    gross: Number,
    coinIn: Number,
    coinOut: Number,
    jackpot: Number,
    gamesPlayed: Number,
    gamesWon: Number,
    currentCredits: Number,
    totalWonCredits: Number,
  },
  { _id: false }
);

const meterSchema = new mongoose.Schema(
  {
    _id: String,
    machine: String,
    location: String,
    meterSource: { type: String, enum: ['COLLECTION_REPORT', 'SAS_READ', 'OTHER'] },
    isSupplemental: { type: Boolean, default: false },
    isRamClear: { type: Boolean, default: false },
    drop: Number,
    totalCancelledCredits: Number,
    coinIn: Number,
    coinOut: Number,
    jackpot: Number,
    readAt: Date,
    deletedAt: Date,
    movement: movementSchema,
  },
  { collection: 'meters', strict: false }
);

type ScriptMeterDoc = {
  _id: string;
  machine: string;
  meterSource?: string;
  isSupplemental?: boolean;
  isRamClear?: boolean;
  drop?: number;
  totalCancelledCredits?: number;
  readAt: Date;
  deletedAt?: Date;
  movement?: {
    drop?: number;
    totalCancelledCredits?: number;
    gross?: number;
  };
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  console.log('Connecting to MongoDB…');
  await mongoose.connect(uri);
  console.log('Connected.\n');

  const MetersModel = mongoose.model<ScriptMeterDoc>('InvestigationMeter', meterSchema);

  // Find distinct machines that have supplemental meters (not deleted)
  const supplementalMachineIds = await MetersModel.distinct('machine', {
    isSupplemental: true,
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  });

  console.log(`Found ${supplementalMachineIds.length} machine(s) with supplemental meters.\n`);

  let bugsFound = 0;
  let checked = 0;

  for (const machineId of supplementalMachineIds) {
    // Get ALL meters for this machine (including deleted), sorted chronologically
    const allMeters = await MetersModel.find({ machine: machineId })
      .sort({ readAt: 1 })
      .lean<ScriptMeterDoc[]>();

    console.log(`Machine: ${machineId} — ${allMeters.length} total meter(s) (including deleted)`);

    // Print raw summary of all meters so we can see the full picture
    for (const meter of allMeters) {
      const deleted = meter.deletedAt ? ` DELETED(${new Date(meter.deletedAt).toISOString()})` : '';
      console.log(
        `  [${meter.meterSource ?? 'no-source'}] isSupplemental=${!!meter.isSupplemental} isRamClear=${!!meter.isRamClear}  readAt=${new Date(meter.readAt).toISOString()}  drop=${meter.drop ?? 'n/a'}  movement.drop=${meter.movement?.drop ?? 'n/a'}${deleted}`
      );
    }
    console.log();

    // Find every non-deleted supplemental meter that has any non-supplemental meter after it
    const activeMeters = allMeters.filter(
      meter => !meter.deletedAt
    );

    for (let idx = 0; idx < activeMeters.length; idx++) {
      const meterS = activeMeters[idx];
      if (!meterS.isSupplemental) continue;

      // meter_A: last non-supplemental before meterS
      let meterA: ScriptMeterDoc | null = null;
      for (let before = idx - 1; before >= 0; before--) {
        if (!activeMeters[before].isSupplemental) {
          meterA = activeMeters[before];
          break;
        }
      }

      // meter_B: first non-supplemental meter after meterS (any meterSource)
      let meterB: ScriptMeterDoc | null = null;
      for (let after = idx + 1; after < activeMeters.length; after++) {
        if (!activeMeters[after].isSupplemental) {
          meterB = activeMeters[after];
          break;
        }
      }

      if (!meterB) {
        console.log(`  ↳ Supplemental at ${new Date(meterS.readAt).toISOString()} — no meter_B yet (machine may still be offline)`);
        console.log();
        continue;
      }
      checked++;

      const currentDrop = meterB.movement?.drop ?? 0;
      const expectedDrop = meterA ? ((meterB.drop ?? 0) - (meterA.drop ?? 0)) : null;
      const currentOut = meterB.movement?.totalCancelledCredits ?? 0;
      const expectedOut = meterA ? ((meterB.totalCancelledCredits ?? 0) - (meterA.totalCancelledCredits ?? 0)) : null;

      const hasBug = currentDrop === 0 && expectedDrop !== null && expectedDrop !== 0;
      if (hasBug) bugsFound++;

      console.log(`  ── 3-meter window ──`);
      console.log(
        `  meter_A  readAt=${meterA?.readAt ? new Date(meterA.readAt).toISOString() : 'none'}  src=${meterA?.meterSource ?? 'n/a'}  drop=${meterA?.drop ?? 'n/a'}  totalCancelledCredits=${meterA?.totalCancelledCredits ?? 'n/a'}`
      );
      console.log(
        `  meter_S  readAt=${new Date(meterS.readAt).toISOString()}  isSupplemental=true  drop=${meterS.drop ?? 'n/a'}  totalCancelledCredits=${meterS.totalCancelledCredits ?? 'n/a'}`
      );
      console.log(
        `  meter_B  readAt=${new Date(meterB.readAt).toISOString()}  src=${meterB.meterSource ?? 'n/a'}  drop=${meterB.drop ?? 'n/a'}  totalCancelledCredits=${meterB.totalCancelledCredits ?? 'n/a'}`
      );
      console.log(
        `  meter_B.movement.drop=${currentDrop}  expected=${expectedDrop ?? 'unknown'}  ${hasBug ? '⚠️  BUG' : currentDrop === 0 ? 'ℹ️  0 (may be correct if no activity)' : '✅  OK'}`
      );
      console.log(
        `  meter_B.movement.totalCancelledCredits=${currentOut}  expected=${expectedOut ?? 'unknown'}`
      );
      console.log();
    }
  }

  console.log(`─────────────────────────────────────────`);
  console.log(`Checked ${checked} meter_B instance(s). Bugs found: ${bugsFound}`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
