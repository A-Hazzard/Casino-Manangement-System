/**
 * Investigate V2 Collection Report Session
 *
 * Usage: npx tsx scripts/investigate-v2-session.ts [sessionId]
 *
 * If no sessionId provided, lists recent V2 sessions.
 * If sessionId provided, investigates that session's machines, meters, and online status.
 *
 * Also investigates TTG - No SMIB location machines and their meter state.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

// ============================================================================
// Helpers
// ============================================================================

function divider(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US', {
    timeZone: 'America/Port_of_Spain',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ============================================================================
// Main Investigation
// ============================================================================

async function investigateSession(db: mongoose.mongo.Db, sessionId: string) {
  divider('V2 SESSION INVESTIGATION');

  // 1. Find the session (ReportedMachine documents)
  const machines = await db
    .collection('reportedmachines')
    .find({ sessionId })
    .sort({ sequenceOrder: 1 })
    .toArray();

  if (machines.length === 0) {
    console.log('No machines found for this session.');
    return;
  }

  console.log(`Session: ${sessionId}`);
  console.log(`Location: ${machines[0]?.locationName || 'Unknown'}`);
  console.log(`Total machines: ${machines.length}`);
  console.log(`Session status: ${machines[0]?.sessionStatus || 'Unknown'}`);

  // 2. Investigate each machine
  for (const [index, machine] of machines.entries()) {
    divider(`Machine ${index + 1}: ${machine.machineCustomName || machine.machineName}`);

    console.log(`  Machine ID:       ${machine.machineId}`);
    console.log(`  Serial:           ${machine.serialNumber}`);
    console.log(`  Status:           ${machine.status}`);
    console.log(`  Session Status:   ${machine.sessionStatus}`);
    console.log(`  Has Relay:        ${machine.hasRelay}`);
    console.log(`  Is WOW:           ${machine.isWow}`);
    console.log(`  Is Supplemental:  ${machine.isSupplemental}`);
    console.log(`  Meters Match:     ${machine.metersMatch}`);
    console.log(`  RAM Clear:        ${machine.ramClear}`);

    // SAS period
    console.log(`\n  SAS Period:`);
    console.log(`    Start:          ${formatDate(machine.sasStartTime)}`);
    console.log(`    End:            ${formatDate(machine.sasEndTime)}`);
    console.log(`    Session Start:  ${formatDate(machine.sessionStartTime)}`);
    console.log(`    Session End:    ${formatDate(machine.sessionEndTime)}`);

    // Meter values
    console.log(`\n  Meter Values:`);
    console.log(`    SAS Meters In:      ${machine.sasMetersIn ?? 'null'}`);
    console.log(`    SAS Meters Out:     ${machine.sasMetersOut ?? 'null'}`);
    console.log(`    Manual Meters In:   ${machine.manualMetersIn ?? 'null'}`);
    console.log(`    Manual Meters Out:  ${machine.manualMetersOut ?? 'null'}`);
    console.log(`    Prev SAS In:        ${machine.prevSasMetersIn ?? machine.prevsasMetersIn ?? 'null'}`);
    console.log(`    Prev SAS Out:       ${machine.prevSasMetersOut ?? machine.prevsasMetersOut ?? 'null'}`);

    // Movement
    if (machine.movement) {
      console.log(`\n  Movement:`);
      console.log(`    SAS Meters In:      ${machine.movement.sasMetersIn ?? 'null'}`);
      console.log(`    SAS Meters Out:     ${machine.movement.sasMetersOut ?? 'null'}`);
      console.log(`    SAS Gross:          ${machine.movement.sasGross ?? 'null'}`);
      console.log(`    Manual Meters In:   ${machine.movement.manualMetersIn ?? 'null'}`);
      console.log(`    Manual Meters Out:  ${machine.movement.manualMetersOut ?? 'null'}`);
      console.log(`    Machine Gross:      ${machine.movement.machineGross ?? 'null'}`);
    }

    console.log(`\n  Variation:        ${machine.variation ?? 'null'}`);

    // Fetch live machine data
    const liveMachine = await db
      .collection('machines')
      .findOne({ _id: machine.machineId });

    if (liveMachine) {
      console.log(`\n  Live Machine Data:`);
      console.log(`    Relay ID:           ${liveMachine.relayId || 'None'}`);
      console.log(`    Last Activity:      ${formatDate(liveMachine.lastActivity)}`);
      console.log(`    Collection Meters:  ${JSON.stringify(liveMachine.collectionMeters || {})}`);
      console.log(`    SAS Meters:         ${JSON.stringify(liveMachine.sasMeters || {})}`);

      // Online status check
      const THREE_MINUTES = 3 * 60 * 1000;
      const hasRelay = !!liveMachine.relayId;
      const lastActivity = liveMachine.lastActivity ? new Date(liveMachine.lastActivity) : null;
      const isOnline = hasRelay && lastActivity && (Date.now() - lastActivity.getTime()) < THREE_MINUTES;

      console.log(`\n  Online Status:`);
      console.log(`    Has Relay:          ${hasRelay}`);
      console.log(`    Is Online:          ${hasRelay ? (isOnline ? 'YES' : 'NO') : 'N/A (no SMIB)'}`);
      if (hasRelay && lastActivity) {
        const minutesAgo = Math.round((Date.now() - lastActivity.getTime()) / 60000);
        console.log(`    Last Activity:      ${minutesAgo} minutes ago`);
      }
    } else {
      console.log(`\n  *** Machine document NOT FOUND ***`);
    }

    // Session-linked meters (see scripts/investigate-v2-session-meters.ts for full audit)
    const sessionMeters = await db
      .collection('meters')
      .find({
        machine: machine.machineId,
        locationSession: sessionId,
        $or: [
          { deletedAt: null },
          { deletedAt: { $exists: false } },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ],
      })
      .sort({ createdAt: 1 })
      .toArray();

    console.log(`\n  Session Meters (${sessionMeters.length}):`);
    if (sessionMeters.length === 0) {
      console.log('    (none)');
    } else {
      for (const meter of sessionMeters) {
        const movDrop = meter.movement?.drop ?? 'N/A';
        console.log(
          `    ${meter._id} | isRamClear=${meter.isRamClear ?? 'undefined'} | mov.drop=${movDrop} | created=${formatDate(meter.createdAt)}`
        );
      }
      const nonRamClear = sessionMeters.filter(
        (meter: { isRamClear?: boolean }) => meter.isRamClear !== true
      );
      if (nonRamClear.length > 1) {
        console.log(
          `    *** ${nonRamClear.length} non-RAM-clear meters — run investigate-v2-session-meters.ts for math audit ***`
        );
      }
    }
  }
}

async function investigateLocation(db: mongoose.mongo.Db, locationName: string) {
  divider(`LOCATION INVESTIGATION: ${locationName}`);

  // Find the location
  const location = await db
    .collection('gaminglocations')
    .findOne({ name: locationName });

  if (!location) {
    console.log(`Location "${locationName}" not found.`);
    return;
  }

  console.log(`Location ID:    ${location._id}`);
  console.log(`Game Day Offset: ${location.gameDayOffset}`);
  console.log(`Licencee:        ${location.rel?.licencee || 'Unknown'}`);

  // Find all machines at this location
  const machines = await db
    .collection('machines')
    .find({ gamingLocation: location._id })
    .toArray();

  console.log(`\nTotal machines: ${machines.length}`);

  for (const [index, machine] of machines.entries()) {
    divider(`Machine ${index + 1}: ${machine.custom?.name || machine.game || machine.serialNumber}`);

    console.log(`  Machine ID:       ${machine._id}`);
    console.log(`  Serial:           ${machine.serialNumber}`);
    console.log(`  Game:             ${machine.game}`);
    console.log(`  Custom Name:      ${machine.custom?.name || 'None'}`);
    console.log(`  Relay ID:         ${machine.relayId || 'None'}`);
    console.log(`  Last Activity:    ${formatDate(machine.lastActivity)}`);
    console.log(`  Collection Meters: ${JSON.stringify(machine.collectionMeters || {})}`);
    console.log(`  SAS Meters:       ${JSON.stringify(machine.sasMeters || {})}`);

    // Online status
    const THREE_MINUTES = 3 * 60 * 1000;
    const hasRelay = !!machine.relayId;
    const lastActivity = machine.lastActivity ? new Date(machine.lastActivity) : null;
    const isOnline = hasRelay && lastActivity && (Date.now() - lastActivity.getTime()) < THREE_MINUTES;

    console.log(`\n  Online Status:`);
    console.log(`    Has Relay:          ${hasRelay}`);
    console.log(`    Is Online:          ${hasRelay ? (isOnline ? 'YES' : 'NO') : 'N/A (no SMIB)'}`);
    if (hasRelay && lastActivity) {
      const minutesAgo = Math.round((Date.now() - lastActivity.getTime()) / 60000);
      console.log(`    Last Activity:      ${minutesAgo} minutes ago`);
    }

    // Check collection history
    const history = machine.collectionMetersHistory || [];
    console.log(`\n  Collection History: ${history.length} entries`);
    if (history.length > 0) {
      const recent = history.slice(-3);
      for (const entry of recent) {
        console.log(`    - ${formatDate(entry.timestamp)} | Report: ${entry.locationReportId} | In: ${entry.metersIn} | Out: ${entry.metersOut}`);
      }
    }

    // Check for any V2 sessions
    const v2Sessions = await db
      .collection('reportedmachines')
      .find({ machineId: machine._id })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();

    console.log(`\n  Recent V2 Sessions: ${v2Sessions.length}`);
    for (const session of v2Sessions) {
      console.log(`    - ${formatDate(session.createdAt)} | Session: ${session.sessionId?.slice(0, 8)}... | Status: ${session.status} | SAS In: ${session.sasMetersIn} | Manual In: ${session.manualMetersIn}`);
    }
  }
}

async function listRecentSessions(db: mongoose.mongo.Db) {
  divider('RECENT V2 SESSIONS');

  const pipeline = [
    { $group: { _id: '$sessionId', count: { $sum: 1 }, locationName: { $first: '$locationName' }, sessionStatus: { $first: '$sessionStatus' }, createdAt: { $first: '$createdAt' } } },
    { $sort: { createdAt: -1 } },
    { $limit: 10 },
  ];

  const sessions = await db.collection('reportedmachines').aggregate(pipeline).toArray();

  console.log(`Found ${sessions.length} recent sessions:\n`);
  for (const session of sessions) {
    console.log(`  ${session._id}`);
    console.log(`    Location: ${session.locationName} | Machines: ${session.count} | Status: ${session.sessionStatus} | Created: ${formatDate(session.createdAt)}`);
  }
}

async function findLatestSessionId(db: mongoose.mongo.Db): Promise<string | null> {
  const latest = await db
    .collection('reportedmachines')
    .findOne({}, { sort: { createdAt: -1 }, projection: { sessionId: 1 } });
  return latest?.sessionId ?? null;
}

// ============================================================================
// Entry Point
// ============================================================================

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  let sessionId = process.argv[2];

  if (!sessionId) {
    sessionId = await findLatestSessionId(db);
    if (sessionId) {
      divider('NO SESSION ID PROVIDED');
      console.log(`Auto-selecting latest session: ${sessionId}\n`);
      await investigateSession(db, sessionId);
    } else {
      await listRecentSessions(db);
    }
  } else {
    await investigateSession(db, sessionId);
  }

  // Always investigate TTG - No SMIB location
  await investigateLocation(db, 'TTG - No SMIB');

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
