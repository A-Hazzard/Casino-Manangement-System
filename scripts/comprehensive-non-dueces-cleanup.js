/**
 * Comprehensive Cleanup Script: Remove ALL Non-Dueces Data
 *
 * Purpose: Delete all data from all collections that don't belong to Dueces location
 * Handles orphaned records and proper relationship checking
 *
 * Collections Cleaned:
 * - collections (check machine → location)
 * - meters (check machine → location OR direct location field)
 * - sashourly (check machine → location)
 * - members (check gamingLocation field directly)
 * - machinesessions (check machine → location)
 * - machineevents (check machine → location)
 * - acceptedbills (check machine → location)
 * - movementrequests (check machine → location)
 *
 * Safety: Dry-run mode by default
 *
 * Usage:
 * - Dry run: node scripts/comprehensive-non-dueces-cleanup.js
 * - Execute: node scripts/comprehensive-non-dueces-cleanup.js --execute
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGO_URI;
const DUECES_LOCATION_ID = 'b393ebf50933d1688c3fe2a7';
const DRY_RUN = !process.argv.includes('--execute');

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in .env file');
  process.exit(1);
}

async function comprehensiveCleanup() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    console.log('='.repeat(80));
    console.log(
      DRY_RUN ? '🔍 DRY RUN MODE' : '⚠️  EXECUTE MODE - WILL DELETE DATA!'
    );
    console.log('='.repeat(80));
    console.log('');
    console.log(`Dueces Location ID: ${DUECES_LOCATION_ID}\n`);

    // Get all Dueces machines for reference
    const duecesMachines = await db
      .collection('machines')
      .find({
        gamingLocation: DUECES_LOCATION_ID,
      })
      .toArray();
    const duecesMachineIds = duecesMachines.map(m => m._id);

    console.log(`✅ Found ${duecesMachines.length} Dueces machines\n`);

    const summary = {
      collections: { total: 0, toDelete: 0, toKeep: 0, orphaned: 0 },
      meters: { total: 0, toDelete: 0, toKeep: 0, orphaned: 0 },
      sashourly: { total: 0, toDelete: 0, toKeep: 0, orphaned: 0 },
      members: { total: 0, toDelete: 0, toKeep: 0 },
      machinesessions: { total: 0, toDelete: 0, toKeep: 0, orphaned: 0 },
      machineevents: { total: 0, toDelete: 0, toKeep: 0, orphaned: 0 },
      acceptedbills: { total: 0, toDelete: 0, toKeep: 0, orphaned: 0 },
      movementrequests: { total: 0, toDelete: 0, toKeep: 0, orphaned: 0 },
    };

    // ==================== COLLECTIONS ====================
    console.log('📊 Analyzing Collections...');
    const allCollections = await db
      .collection('collections')
      .find({})
      .toArray();
    summary.collections.total = allCollections.length;

    const collectionsToDelete = [];
    for (const collection of allCollections) {
      const machine = await db
        .collection('machines')
        .findOne({ _id: collection.machineId });

      if (!machine) {
        collectionsToDelete.push(collection._id);
        summary.collections.orphaned++;
      } else if (machine.gamingLocation !== DUECES_LOCATION_ID) {
        collectionsToDelete.push(collection._id);
      }
    }
    summary.collections.toDelete = collectionsToDelete.length;
    summary.collections.toKeep =
      summary.collections.total - summary.collections.toDelete;
    console.log(
      `   Total: ${summary.collections.total}, Keep: ${summary.collections.toKeep}, Delete: ${summary.collections.toDelete} (${summary.collections.orphaned} orphaned)\n`
    );

    // ==================== METERS ====================
    console.log('📊 Analyzing Meters...');
    const allMeters = await db.collection('meters').find({}).toArray();
    summary.meters.total = allMeters.length;

    const metersToDelete = [];
    for (const meter of allMeters) {
      // Meters have both machine and location fields
      // Check machine first, fall back to direct location check
      if (meter.machine) {
        const machine = await db
          .collection('machines')
          .findOne({ _id: meter.machine });
        if (!machine) {
          metersToDelete.push(meter._id);
          summary.meters.orphaned++;
        } else if (machine.gamingLocation !== DUECES_LOCATION_ID) {
          metersToDelete.push(meter._id);
        }
      } else if (meter.location && meter.location !== DUECES_LOCATION_ID) {
        // No machine reference, check location directly
        metersToDelete.push(meter._id);
      }
    }
    summary.meters.toDelete = metersToDelete.length;
    summary.meters.toKeep = summary.meters.total - summary.meters.toDelete;
    console.log(
      `   Total: ${summary.meters.total}, Keep: ${summary.meters.toKeep}, Delete: ${summary.meters.toDelete} (${summary.meters.orphaned} orphaned)\n`
    );

    // ==================== SAS HOURLY ====================
    console.log('📊 Analyzing SAS Hourly Data...');
    const allSasHourly = await db.collection('sashourly').find({}).toArray();
    summary.sashourly.total = allSasHourly.length;

    const sasHourlyToDelete = [];
    for (const sas of allSasHourly) {
      const machine = await db
        .collection('machines')
        .findOne({ _id: sas.machine });
      if (!machine) {
        sasHourlyToDelete.push(sas._id);
        summary.sashourly.orphaned++;
      } else if (machine.gamingLocation !== DUECES_LOCATION_ID) {
        sasHourlyToDelete.push(sas._id);
      }
    }
    summary.sashourly.toDelete = sasHourlyToDelete.length;
    summary.sashourly.toKeep =
      summary.sashourly.total - summary.sashourly.toDelete;
    console.log(
      `   Total: ${summary.sashourly.total}, Keep: ${summary.sashourly.toKeep}, Delete: ${summary.sashourly.toDelete} (${summary.sashourly.orphaned} orphaned)\n`
    );

    // ==================== MEMBERS ====================
    console.log('📊 Analyzing Members...');
    const allMembers = await db.collection('members').find({}).toArray();
    summary.members.total = allMembers.length;

    const membersToDelete = [];
    for (const member of allMembers) {
      // Members have gamingLocation field directly
      if (
        member.gamingLocation &&
        member.gamingLocation !== DUECES_LOCATION_ID
      ) {
        membersToDelete.push(member._id);
      }
    }
    summary.members.toDelete = membersToDelete.length;
    summary.members.toKeep = summary.members.total - summary.members.toDelete;
    console.log(
      `   Total: ${summary.members.total}, Keep: ${summary.members.toKeep}, Delete: ${summary.members.toDelete}\n`
    );

    // ==================== MACHINE SESSIONS ====================
    console.log('📊 Analyzing Machine Sessions...');
    const allSessions = await db
      .collection('machinesessions')
      .find({})
      .toArray();
    summary.machinesessions.total = allSessions.length;

    const sessionsToDelete = [];
    for (const session of allSessions) {
      if (session.machineId) {
        const machine = await db
          .collection('machines')
          .findOne({ _id: session.machineId });
        if (!machine) {
          sessionsToDelete.push(session._id);
          summary.machinesessions.orphaned++;
        } else if (machine.gamingLocation !== DUECES_LOCATION_ID) {
          sessionsToDelete.push(session._id);
        }
      }
    }
    summary.machinesessions.toDelete = sessionsToDelete.length;
    summary.machinesessions.toKeep =
      summary.machinesessions.total - summary.machinesessions.toDelete;
    console.log(
      `   Total: ${summary.machinesessions.total}, Keep: ${summary.machinesessions.toKeep}, Delete: ${summary.machinesessions.toDelete} (${summary.machinesessions.orphaned} orphaned)\n`
    );

    // ==================== MACHINE EVENTS ====================
    console.log('📊 Analyzing Machine Events...');
    const allEvents = await db.collection('machineevents').find({}).toArray();
    summary.machineevents.total = allEvents.length;

    const eventsToDelete = [];
    for (const event of allEvents) {
      if (event.machineId) {
        const machine = await db
          .collection('machines')
          .findOne({ _id: event.machineId });
        if (!machine) {
          eventsToDelete.push(event._id);
          summary.machineevents.orphaned++;
        } else if (machine.gamingLocation !== DUECES_LOCATION_ID) {
          eventsToDelete.push(event._id);
        }
      }
    }
    summary.machineevents.toDelete = eventsToDelete.length;
    summary.machineevents.toKeep =
      summary.machineevents.total - summary.machineevents.toDelete;
    console.log(
      `   Total: ${summary.machineevents.total}, Keep: ${summary.machineevents.toKeep}, Delete: ${summary.machineevents.toDelete} (${summary.machineevents.orphaned} orphaned)\n`
    );

    // ==================== ACCEPTED BILLS ====================
    console.log('📊 Analyzing Accepted Bills...');
    const allBills = await db.collection('acceptedbills').find({}).toArray();
    summary.acceptedbills.total = allBills.length;

    const billsToDelete = [];
    for (const bill of allBills) {
      if (bill.machineId) {
        const machine = await db
          .collection('machines')
          .findOne({ _id: bill.machineId });
        if (!machine) {
          billsToDelete.push(bill._id);
          summary.acceptedbills.orphaned++;
        } else if (machine.gamingLocation !== DUECES_LOCATION_ID) {
          billsToDelete.push(bill._id);
        }
      }
    }
    summary.acceptedbills.toDelete = billsToDelete.length;
    summary.acceptedbills.toKeep =
      summary.acceptedbills.total - summary.acceptedbills.toDelete;
    console.log(
      `   Total: ${summary.acceptedbills.total}, Keep: ${summary.acceptedbills.toKeep}, Delete: ${summary.acceptedbills.toDelete} (${summary.acceptedbills.orphaned} orphaned)\n`
    );

    // ==================== MOVEMENT REQUESTS ====================
    console.log('📊 Analyzing Movement Requests...');
    const allMovementRequests = await db
      .collection('movementrequests')
      .find({})
      .toArray();
    summary.movementrequests.total = allMovementRequests.length;

    const movementRequestsToDelete = [];
    for (const request of allMovementRequests) {
      if (request.machineId) {
        const machine = await db
          .collection('machines')
          .findOne({ _id: request.machineId });
        if (!machine) {
          movementRequestsToDelete.push(request._id);
          summary.movementrequests.orphaned++;
        } else if (machine.gamingLocation !== DUECES_LOCATION_ID) {
          movementRequestsToDelete.push(request._id);
        }
      }
    }
    summary.movementrequests.toDelete = movementRequestsToDelete.length;
    summary.movementrequests.toKeep =
      summary.movementrequests.total - summary.movementrequests.toDelete;
    console.log(
      `   Total: ${summary.movementrequests.total}, Keep: ${summary.movementrequests.toKeep}, Delete: ${summary.movementrequests.toDelete} (${summary.movementrequests.orphaned} orphaned)\n`
    );

    // ==================== SUMMARY ====================
    console.log('='.repeat(80));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(80));
    console.log('');

    Object.entries(summary).forEach(([collectionName, stats]) => {
      if (stats.total > 0) {
        console.log(`${collectionName.toUpperCase()}:`);
        console.log(`   Total: ${stats.total}`);
        console.log(`   ✅ Keep (Dueces): ${stats.toKeep}`);
        console.log(`   ❌ Delete: ${stats.toDelete}`);
        if (stats.orphaned !== undefined && stats.orphaned > 0) {
          console.log(`   ⚠️  Orphaned (machine not found): ${stats.orphaned}`);
        }
        console.log('');
      }
    });

    if (DRY_RUN) {
      console.log('🔍 DRY RUN: No data was deleted');
      console.log('');
      console.log('⚠️  TO EXECUTE CLEANUP:');
      console.log(
        '   node scripts/comprehensive-non-dueces-cleanup.js --execute'
      );
      console.log('');
      console.log('⚠️  WARNING: This will permanently delete data!');
      console.log('   Make sure backup exists before proceeding!');
      console.log('');
    } else {
      console.log('='.repeat(80));
      console.log('⚠️  EXECUTING DELETIONS');
      console.log('='.repeat(80));
      console.log('');

      const results = {};

      // Delete Collections
      if (collectionsToDelete.length > 0) {
        const result = await db.collection('collections').deleteMany({
          _id: { $in: collectionsToDelete },
        });
        results.collections = result.deletedCount;
        console.log(`✅ Deleted ${result.deletedCount} collections`);
      }

      // Delete Meters
      if (metersToDelete.length > 0) {
        const result = await db.collection('meters').deleteMany({
          _id: { $in: metersToDelete },
        });
        results.meters = result.deletedCount;
        console.log(`✅ Deleted ${result.deletedCount} meters`);
      }

      // Delete SAS Hourly
      if (sasHourlyToDelete.length > 0) {
        const result = await db.collection('sashourly').deleteMany({
          _id: { $in: sasHourlyToDelete },
        });
        results.sashourly = result.deletedCount;
        console.log(`✅ Deleted ${result.deletedCount} SAS hourly records`);
      }

      // Delete Members
      if (membersToDelete.length > 0) {
        const result = await db.collection('members').deleteMany({
          _id: { $in: membersToDelete },
        });
        results.members = result.deletedCount;
        console.log(`✅ Deleted ${result.deletedCount} members`);
      }

      // Delete Machine Sessions
      if (sessionsToDelete.length > 0) {
        const result = await db.collection('machinesessions').deleteMany({
          _id: { $in: sessionsToDelete },
        });
        results.machinesessions = result.deletedCount;
        console.log(`✅ Deleted ${result.deletedCount} machine sessions`);
      }

      // Delete Machine Events
      if (eventsToDelete.length > 0) {
        const result = await db.collection('machineevents').deleteMany({
          _id: { $in: eventsToDelete },
        });
        results.machineevents = result.deletedCount;
        console.log(`✅ Deleted ${result.deletedCount} machine events`);
      }

      // Delete Accepted Bills
      if (billsToDelete.length > 0) {
        const result = await db.collection('acceptedbills').deleteMany({
          _id: { $in: billsToDelete },
        });
        results.acceptedbills = result.deletedCount;
        console.log(`✅ Deleted ${result.deletedCount} accepted bills`);
      }

      // Delete Movement Requests
      if (movementRequestsToDelete.length > 0) {
        const result = await db.collection('movementrequests').deleteMany({
          _id: { $in: movementRequestsToDelete },
        });
        results.movementrequests = result.deletedCount;
        console.log(`✅ Deleted ${result.deletedCount} movement requests`);
      }

      console.log('');
      console.log('='.repeat(80));
      console.log('✅ CLEANUP COMPLETE');
      console.log('='.repeat(80));
      console.log('');

      Object.entries(results).forEach(([collectionName, deletedCount]) => {
        console.log(`${collectionName}: ${deletedCount} deleted`);
      });

      console.log('');
      console.log('✅ Database now contains only Dueces-related data!');
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

comprehensiveCleanup();
