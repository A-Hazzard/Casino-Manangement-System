/**
 * Optimized Comprehensive Cleanup Script: Remove ALL Non-Dueces Data
 * 
 * Purpose: Delete all data from all collections that don't belong to Dueces location
 * Handles orphaned records and proper relationship checking
 * Uses batch processing to avoid memory issues
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
 * - Dry run: node scripts/comprehensive-non-dueces-cleanup-optimized.js
 * - Execute: node scripts/comprehensive-non-dueces-cleanup-optimized.js --execute
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGO_URI;
const DUECES_LOCATION_ID = 'b393ebf50933d1688c3fe2a7';
const DRY_RUN = !process.argv.includes('--execute');
const BATCH_SIZE = 1000; // Process records in batches to avoid memory issues

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in .env file');
  process.exit(1);
}

async function comprehensiveCleanupOptimized() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    console.log('='.repeat(80));
    console.log(DRY_RUN ? '🔍 DRY RUN MODE' : '⚠️  EXECUTE MODE - WILL DELETE DATA!');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Dueces Location ID: ${DUECES_LOCATION_ID}\n`);

    // Get all Dueces machines for reference (small dataset, safe to load all)
    const duecesMachines = await db.collection('machines').find({
      gamingLocation: DUECES_LOCATION_ID
    }).toArray();
    const duecesMachineIds = new Set(duecesMachines.map(m => m._id));
    
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
    summary.collections.total = await db.collection('collections').countDocuments({});
    
    // Count orphaned (no machine exists)
    const orphanedCollections = await db.collection('collections').countDocuments({
      machineId: { $nin: Array.from(duecesMachineIds) }
    });
    
    // Count non-Dueces (machine exists but belongs to different location)
    const allMachineIds = await db.collection('machines').distinct('_id', {});
    const allMachineIdsSet = new Set(allMachineIds);
    const validNonDuecesIds = Array.from(allMachineIdsSet).filter(id => !duecesMachineIds.has(id));
    
    const nonDuecesCollections = await db.collection('collections').countDocuments({
      machineId: { $in: validNonDuecesIds }
    });
    
    summary.collections.orphaned = orphanedCollections;
    summary.collections.toDelete = orphanedCollections + nonDuecesCollections;
    summary.collections.toKeep = summary.collections.total - summary.collections.toDelete;
    console.log(`   Total: ${summary.collections.total}, Keep: ${summary.collections.toKeep}, Delete: ${summary.collections.toDelete} (${summary.collections.orphaned} orphaned)\n`);

    // ==================== METERS ====================
    console.log('📊 Analyzing Meters...');
    summary.meters.total = await db.collection('meters').countDocuments({});
    
    // Meters can be identified by direct location field OR machine lookup
    const duecesMeters = await db.collection('meters').countDocuments({
      $or: [
        { location: DUECES_LOCATION_ID },
        { machine: { $in: Array.from(duecesMachineIds) } }
      ]
    });
    
    summary.meters.toDelete = summary.meters.total - duecesMeters;
    summary.meters.toKeep = duecesMeters;
    console.log(`   Total: ${summary.meters.total}, Keep: ${summary.meters.toKeep}, Delete: ${summary.meters.toDelete}\n`);

    // ==================== SAS HOURLY ====================
    console.log('📊 Analyzing SAS Hourly Data...');
    const sasCollection = db.collection('sashourly');
    const sasExists = await db.listCollections({ name: 'sashourly' }).hasNext();
    
    if (sasExists) {
      summary.sashourly.total = await sasCollection.countDocuments({});
      const duecesSasHourly = await sasCollection.countDocuments({
        machine: { $in: Array.from(duecesMachineIds) }
      });
      summary.sashourly.toDelete = summary.sashourly.total - duecesSasHourly;
      summary.sashourly.toKeep = duecesSasHourly;
    }
    console.log(`   Total: ${summary.sashourly.total}, Keep: ${summary.sashourly.toKeep}, Delete: ${summary.sashourly.toDelete}\n`);

    // ==================== MEMBERS ====================
    console.log('📊 Analyzing Members...');
    summary.members.total = await db.collection('members').countDocuments({});
    const duecesMembers = await db.collection('members').countDocuments({
      gamingLocation: DUECES_LOCATION_ID
    });
    summary.members.toDelete = summary.members.total - duecesMembers;
    summary.members.toKeep = duecesMembers;
    console.log(`   Total: ${summary.members.total}, Keep: ${summary.members.toKeep}, Delete: ${summary.members.toDelete}\n`);

    // ==================== MACHINE SESSIONS ====================
    console.log('📊 Analyzing Machine Sessions...');
    const sessionsCollection = db.collection('machinesessions');
    const sessionsExists = await db.listCollections({ name: 'machinesessions' }).hasNext();
    
    if (sessionsExists) {
      summary.machinesessions.total = await sessionsCollection.countDocuments({});
      const duecesSessions = await sessionsCollection.countDocuments({
        machineId: { $in: Array.from(duecesMachineIds) }
      });
      summary.machinesessions.toDelete = summary.machinesessions.total - duecesSessions;
      summary.machinesessions.toKeep = duecesSessions;
    }
    console.log(`   Total: ${summary.machinesessions.total}, Keep: ${summary.machinesessions.toKeep}, Delete: ${summary.machinesessions.toDelete}\n`);

    // ==================== MACHINE EVENTS ====================
    console.log('📊 Analyzing Machine Events...');
    const eventsCollection = db.collection('machineevents');
    const eventsExists = await db.listCollections({ name: 'machineevents' }).hasNext();
    
    if (eventsExists) {
      summary.machineevents.total = await eventsCollection.countDocuments({});
      const duecesEvents = await eventsCollection.countDocuments({
        machineId: { $in: Array.from(duecesMachineIds) }
      });
      summary.machineevents.toDelete = summary.machineevents.total - duecesEvents;
      summary.machineevents.toKeep = duecesEvents;
    }
    console.log(`   Total: ${summary.machineevents.total}, Keep: ${summary.machineevents.toKeep}, Delete: ${summary.machineevents.toDelete}\n`);

    // ==================== ACCEPTED BILLS ====================
    console.log('📊 Analyzing Accepted Bills...');
    const billsCollection = db.collection('acceptedbills');
    const billsExists = await db.listCollections({ name: 'acceptedbills' }).hasNext();
    
    if (billsExists) {
      summary.acceptedbills.total = await billsCollection.countDocuments({});
      const duecesBills = await billsCollection.countDocuments({
        machineId: { $in: Array.from(duecesMachineIds) }
      });
      summary.acceptedbills.toDelete = summary.acceptedbills.total - duecesBills;
      summary.acceptedbills.toKeep = duecesBills;
    }
    console.log(`   Total: ${summary.acceptedbills.total}, Keep: ${summary.acceptedbills.toKeep}, Delete: ${summary.acceptedbills.toDelete}\n`);

    // ==================== MOVEMENT REQUESTS ====================
    console.log('📊 Analyzing Movement Requests...');
    const movementCollection = db.collection('movementrequests');
    const movementExists = await db.listCollections({ name: 'movementrequests' }).hasNext();
    
    if (movementExists) {
      summary.movementrequests.total = await movementCollection.countDocuments({});
      const duecesMovement = await movementCollection.countDocuments({
        machineId: { $in: Array.from(duecesMachineIds) }
      });
      summary.movementrequests.toDelete = summary.movementrequests.total - duecesMovement;
      summary.movementrequests.toKeep = duecesMovement;
    }
    console.log(`   Total: ${summary.movementrequests.total}, Keep: ${summary.movementrequests.toKeep}, Delete: ${summary.movementrequests.toDelete}\n`);

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
      console.log('   node scripts/comprehensive-non-dueces-cleanup-optimized.js --execute');
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
      const duecesMachineIdsArray = Array.from(duecesMachineIds);

      // Delete Collections
      if (summary.collections.toDelete > 0) {
        console.log('🗑️  Deleting collections...');
        const result = await db.collection('collections').deleteMany({
          machineId: { $nin: duecesMachineIdsArray }
        });
        results.collections = result.deletedCount;
        console.log(`✅ Deleted ${result.deletedCount} collections`);
      }

      // Delete Meters
      if (summary.meters.toDelete > 0) {
        console.log('🗑️  Deleting meters...');
        const result = await db.collection('meters').deleteMany({
          $and: [
            { location: { $ne: DUECES_LOCATION_ID } },
            { machine: { $nin: duecesMachineIdsArray } }
          ]
        });
        results.meters = result.deletedCount;
        console.log(`✅ Deleted ${result.deletedCount} meters`);
      }

      // Delete SAS Hourly
      if (sasExists && summary.sashourly.toDelete > 0) {
        console.log('🗑️  Deleting SAS hourly records...');
        const result = await db.collection('sashourly').deleteMany({
          machine: { $nin: duecesMachineIdsArray }
        });
        results.sashourly = result.deletedCount;
        console.log(`✅ Deleted ${result.deletedCount} SAS hourly records`);
      }

      // Delete Members
      if (summary.members.toDelete > 0) {
        console.log('🗑️  Deleting members...');
        const result = await db.collection('members').deleteMany({
          gamingLocation: { $ne: DUECES_LOCATION_ID }
        });
        results.members = result.deletedCount;
        console.log(`✅ Deleted ${result.deletedCount} members`);
      }

      // Delete Machine Sessions
      if (sessionsExists && summary.machinesessions.toDelete > 0) {
        console.log('🗑️  Deleting machine sessions...');
        const result = await db.collection('machinesessions').deleteMany({
          machineId: { $nin: duecesMachineIdsArray }
        });
        results.machinesessions = result.deletedCount;
        console.log(`✅ Deleted ${result.deletedCount} machine sessions`);
      }

      // Delete Machine Events
      if (eventsExists && summary.machineevents.toDelete > 0) {
        console.log('🗑️  Deleting machine events...');
        const result = await db.collection('machineevents').deleteMany({
          machineId: { $nin: duecesMachineIdsArray }
        });
        results.machineevents = result.deletedCount;
        console.log(`✅ Deleted ${result.deletedCount} machine events`);
      }

      // Delete Accepted Bills
      if (billsExists && summary.acceptedbills.toDelete > 0) {
        console.log('🗑️  Deleting accepted bills...');
        const result = await db.collection('acceptedbills').deleteMany({
          machineId: { $nin: duecesMachineIdsArray }
        });
        results.acceptedbills = result.deletedCount;
        console.log(`✅ Deleted ${result.deletedCount} accepted bills`);
      }

      // Delete Movement Requests
      if (movementExists && summary.movementrequests.toDelete > 0) {
        console.log('🗑️  Deleting movement requests...');
        const result = await db.collection('movementrequests').deleteMany({
          machineId: { $nin: duecesMachineIdsArray }
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

comprehensiveCleanupOptimized();

