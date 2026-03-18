/**
 * seed_missing_meters.js
 *
 * Checks the past 4 days for each machine in the DB.
 * For any machine that has NO meter readings in a given day, creates
 * a realistic synthetic meter entry for that day.
 *
 * Formula reference: Documentation/financial-metrics-guide.md
 *   - movement.drop        = Money In (physical cash inserted)
 *   - movement.totalCancelledCredits = Money Out (manual payouts)
 *   - movement.jackpot     = Handpaid jackpots
 *   - movement.coinIn      = Handle (total bets placed)
 *   - gross                = drop - totalCancelledCredits
 *
 * Run: NODE_PATH=/opt/node22/lib/node_modules node tmp/seed_missing_meters.js
 */

const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const MONGO_URI =
  'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-aaron?authSource=admin';

// ─── Helper: random number in range ─────────────────────────────────────────

function rand(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// ─── Build a realistic meter movement document for a machine ────────────────
// Values are in CENTS (denominations) matching the SAS meter format
// (divide by accountingDenomination to get dollar values)

function buildMovement(prev) {
  // Daily increments — realistic for a mid-traffic machine
  const dropDelta     = rand(50_000, 500_000);   // $500 – $5,000 @ $0.01 denom
  const cancelledRate = rand(0.03, 0.12);         // 3–12% of drop
  const cancelledDelta = Math.round(dropDelta * cancelledRate);
  const jackpotDelta  = Math.random() < 0.15      // 15% chance of a jackpot day
    ? rand(5_000, 50_000)
    : 0;
  const gamesPlayedDelta = rand(500, 5_000);
  const gamesWonDelta    = Math.round(gamesPlayedDelta * rand(0.35, 0.55));

  // coinIn: total bets placed — roughly 8-15× drop (players recycle winnings)
  const coinInDelta = Math.round(dropDelta * rand(8, 15));

  // Cumulative totals from previous reading
  const drop                   = (prev.drop || 0)                   + dropDelta;
  const totalCancelledCredits  = (prev.totalCancelledCredits || 0)  + cancelledDelta;
  const jackpot                = (prev.jackpot || 0)                + jackpotDelta;
  const coinIn                 = (prev.coinIn || 0)                 + coinInDelta;
  const coinOut                = (prev.coinOut || 0)                + Math.round(coinInDelta * rand(0.88, 0.96));
  const totalWonCredits        = (prev.totalWonCredits || 0)        + cancelledDelta + jackpotDelta;
  const gamesPlayed            = (prev.gamesPlayed || 0)            + gamesPlayedDelta;
  const gamesWon               = (prev.gamesWon || 0)               + gamesWonDelta;

  return { coinIn, coinOut, totalCancelledCredits, totalHandPaidCancelledCredits: jackpot, totalWonCredits, drop, jackpot, currentCredits: 0, gamesPlayed, gamesWon };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  console.log('Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.\n');

  const db = mongoose.connection;
  const metersCol   = db.collection('meters');
  const machinesCol = db.collection('machines');

  // Fetch all machines (we need _id, location, locationSession)
  const machines = await machinesCol.find({}, { projection: { _id: 1, location: 1, locationSession: 1, gamingLocation: 1 } }).toArray();
  console.log(`Found ${machines.length} machine(s) in DB.\n`);

  if (machines.length === 0) {
    console.log('No machines found — nothing to seed.');
    await mongoose.disconnect();
    return;
  }

  // Build the 4-day window (UTC days, matching readAt storage)
  const now   = new Date();
  const days  = [];
  for (let d = 3; d >= 0; d--) {
    const dayStart = new Date(now);
    dayStart.setUTCDate(now.getUTCDate() - d);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCHours(23, 59, 59, 999);
    days.push({ start: dayStart, end: dayEnd });
  }

  console.log('Checking days:');
  days.forEach(d => console.log(`  ${d.start.toISOString().slice(0,10)}`));
  console.log();

  let totalCreated = 0;
  const summary = [];

  for (const machine of machines) {
    const machineId = machine._id.toString();
    const locationId = (machine.location || machine.gamingLocation || '').toString();
    const locationSession = machine.locationSession || locationId || 'unknown';

    const machineSummary = { machineId, days: [] };

    // Get the latest meter before our window for a cumulative baseline
    const windowStart = days[0].start;
    const latestBefore = await metersCol.findOne(
      { machine: machineId, readAt: { $lt: windowStart } },
      { sort: { readAt: -1 } }
    );
    let prevMovement = latestBefore?.movement || {};

    for (const day of days) {
      // Check if any meter exists for this machine on this day
      const existing = await metersCol.findOne({
        machine: machineId,
        readAt: { $gte: day.start, $lte: day.end },
      });

      if (existing) {
        // Use this as the new baseline for the next day
        prevMovement = existing.movement || prevMovement;
        machineSummary.days.push({ date: day.start.toISOString().slice(0,10), status: 'exists', _id: existing._id });
        continue;
      }

      // No meter for this day — create one at ~2:00 AM (well within the gaming day)
      const readAt = new Date(day.start);
      readAt.setUTCHours(2, rand(0, 59), rand(0, 59), 0);

      const movement = buildMovement(prevMovement);
      prevMovement   = movement;

      const doc = {
        _id:            randomUUID(),
        machine:        machineId,
        location:       locationId,
        locationSession,
        movement,
        // Top-level mirrors of movement fields (schema keeps both)
        coinIn:                       movement.coinIn,
        coinOut:                      movement.coinOut,
        totalCancelledCredits:        movement.totalCancelledCredits,
        totalHandPaidCancelledCredits: movement.totalHandPaidCancelledCredits,
        totalWonCredits:              movement.totalWonCredits,
        drop:                         movement.drop,
        jackpot:                      movement.jackpot,
        currentCredits:               movement.currentCredits,
        gamesPlayed:                  movement.gamesPlayed,
        gamesWon:                     movement.gamesWon,
        viewingAccountDenomination: {
          drop:                 movement.drop,
          totalCancelledCredits: movement.totalCancelledCredits,
        },
        readAt,
        createdAt: readAt,
        updatedAt: readAt,
      };

      await metersCol.insertOne(doc);
      totalCreated++;

      const gross = movement.drop - movement.totalCancelledCredits;
      machineSummary.days.push({
        date:    day.start.toISOString().slice(0,10),
        status:  'CREATED',
        _id:     doc._id,
        readAt:  readAt.toISOString(),
        drop:    movement.drop,
        totalCancelledCredits: movement.totalCancelledCredits,
        jackpot: movement.jackpot,
        gross,
      });
    }

    summary.push(machineSummary);
  }

  // ─── Print summary ─────────────────────────────────────────────────────────
  console.log('══════════════════════════════════════════════════════');
  console.log('RESULTS');
  console.log('══════════════════════════════════════════════════════');

  for (const m of summary) {
    const created = m.days.filter(d => d.status === 'CREATED');
    const existed = m.days.filter(d => d.status === 'exists');
    console.log(`\nMachine: ${m.machineId}`);
    console.log(`  Days with existing meters : ${existed.length}`);
    console.log(`  Days seeded               : ${created.length}`);
    for (const d of m.days) {
      if (d.status === 'CREATED') {
        console.log(`    ✅ ${d.date} — drop=${d.drop}, cancelled=${d.totalCancelledCredits}, jackpot=${d.jackpot}, gross=${d.gross}`);
      } else {
        console.log(`    ✔  ${d.date} — already existed (${d._id})`);
      }
    }
  }

  console.log('\n══════════════════════════════════════════════════════');
  console.log(`Total meter documents created: ${totalCreated}`);
  console.log('══════════════════════════════════════════════════════');

  await mongoose.disconnect();
  console.log('\nDisconnected.');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
