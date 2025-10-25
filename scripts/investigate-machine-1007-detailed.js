#!/usr/bin/env node

/**
 * Detailed Investigation Script: Machine 1007 Collection Meters Logic
 *
 * This script investigates the specific expectation about what machine collectionMeters
 * should contain after fixing prevIn/prevOut values.
 *
 * Author: Aaron Hazzard - Senior Software Engineer
 * Last Updated: January 21st, 2025
 */

const { MongoClient } = require('mongodb');

// Database connection
const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:30717/sas-dev?authSource=admin';

async function investigateMachine1007Detailed() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('🔍 Connected to MongoDB');

    const db = client.db('sas-dev');
    const collections = db.collection('collections');
    const machines = db.collection('machines');

    // Find machine 1007
    const machine = await machines.findOne({
      $or: [{ serialNumber: '1007' }, { name: '1007' }],
    });

    if (!machine) {
      console.log('❌ Machine 1007 not found');
      return;
    }

    console.log(
      '\n📊 DETAILED INVESTIGATION: Machine 1007 Collection Meters Logic'
    );
    console.log('='.repeat(70));

    // 1. Get the most recent collection
    const mostRecentCollection = await collections.findOne(
      {
        machineId: String(machine._id),
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      },
      { sort: { collectionTime: -1, timestamp: -1 } }
    );

    if (!mostRecentCollection) {
      console.log('❌ No collections found for machine 1007');
      return;
    }

    console.log('\n1️⃣ MOST RECENT COLLECTION:');
    console.log(`   Collection ID: ${mostRecentCollection._id}`);
    console.log(`   Collection Time: ${mostRecentCollection.timestamp}`);
    console.log(`   Current Meters In: ${mostRecentCollection.metersIn}`);
    console.log(`   Current Meters Out: ${mostRecentCollection.metersOut}`);
    console.log(`   Prev In: ${mostRecentCollection.prevIn}`);
    console.log(`   Prev Out: ${mostRecentCollection.prevOut}`);
    console.log(`   Is Completed: ${mostRecentCollection.isCompleted}`);

    console.log('\n2️⃣ MACHINE CURRENT STATE:');
    console.log(`   Machine ID: ${machine._id}`);
    console.log(
      `   Machine Collection Meters In: ${machine.collectionMeters?.metersIn}`
    );
    console.log(
      `   Machine Collection Meters Out: ${machine.collectionMeters?.metersOut}`
    );
    console.log(`   Machine Collection Time: ${machine.collectionTime}`);

    console.log('\n3️⃣ EXPECTATION ANALYSIS:');
    console.log('   🤔 What should machine.collectionMeters contain?');
    console.log('   ');
    console.log('   OPTION A: Current collection meters (what we have now):');
    console.log(
      `      Meters In: ${mostRecentCollection.metersIn} (current collection)`
    );
    console.log(
      `      Meters Out: ${mostRecentCollection.metersOut} (current collection)`
    );
    console.log('   ');
    console.log('   OPTION B: Previous collection meters (what was fixed):');
    console.log(
      `      Meters In: ${mostRecentCollection.prevIn} (previous collection)`
    );
    console.log(
      `      Meters Out: ${mostRecentCollection.prevOut} (previous collection)`
    );
    console.log('   ');
    console.log('   OPTION C: Something else?');

    console.log('\n4️⃣ CURRENT STATE ANALYSIS:');
    const machineMetersIn = machine.collectionMeters?.metersIn || 0;
    const machineMetersOut = machine.collectionMeters?.metersOut || 0;

    const matchesCurrent =
      machineMetersIn === mostRecentCollection.metersIn &&
      machineMetersOut === mostRecentCollection.metersOut;
    const matchesPrevious =
      machineMetersIn === mostRecentCollection.prevIn &&
      machineMetersOut === mostRecentCollection.prevOut;

    console.log(
      `   Machine matches CURRENT collection meters: ${matchesCurrent ? '✅ YES' : '❌ NO'}`
    );
    console.log(
      `   Machine matches PREVIOUS collection meters: ${matchesPrevious ? '✅ YES' : '❌ NO'}`
    );

    if (matchesCurrent) {
      console.log(
        '   📋 CONCLUSION: Machine collectionMeters contain the CURRENT collection meters'
      );
      console.log(
        '   📋 This is the standard behavior - machine meters should reflect the current state'
      );
    } else if (matchesPrevious) {
      console.log(
        '   📋 CONCLUSION: Machine collectionMeters contain the PREVIOUS collection meters'
      );
      console.log(
        '   📋 This would be unusual - machine meters should reflect current state'
      );
    } else {
      console.log(
        '   📋 CONCLUSION: Machine collectionMeters match neither current nor previous'
      );
      console.log('   📋 This indicates a data inconsistency');
    }

    console.log('\n5️⃣ FIX LOGIC ANALYSIS:');
    console.log('   🔧 What did the fix button do?');
    console.log('   ');
    console.log('   The fix button corrected:');
    console.log(`      Collection prevIn: 0 → ${mostRecentCollection.prevIn}`);
    console.log(
      `      Collection prevOut: 0 → ${mostRecentCollection.prevOut}`
    );
    console.log('   ');
    console.log(
      '   The fix button should also update machine collectionMeters to:'
    );
    console.log(
      `      Machine metersIn: ${mostRecentCollection.metersIn} (current collection meters)`
    );
    console.log(
      `      Machine metersOut: ${mostRecentCollection.metersOut} (current collection meters)`
    );
    console.log('   ');
    console.log('   This ensures that:');
    console.log(
      '   1. Collection has correct prevIn/prevOut (previous collection meters)'
    );
    console.log(
      '   2. Machine has current collection meters (for next collection)'
    );

    console.log('\n6️⃣ VERIFICATION:');
    if (matchesCurrent) {
      console.log(
        '   ✅ VERIFIED: Machine collectionMeters correctly contain current collection meters'
      );
      console.log('   ✅ The fix button worked correctly');
      console.log('   ✅ No further action needed');
    } else {
      console.log(
        '   ❌ ISSUE: Machine collectionMeters do not contain current collection meters'
      );
      console.log(
        '   🔧 Manual fix needed: Update machine collectionMeters to match current collection'
      );
    }

    console.log('\n7️⃣ NEXT COLLECTION SCENARIO:');
    console.log('   When creating the next collection for this machine:');
    console.log(
      `   - prevIn should be: ${mostRecentCollection.metersIn} (current collection meters)`
    );
    console.log(
      `   - prevOut should be: ${mostRecentCollection.metersOut} (current collection meters)`
    );
    console.log(`   - These values should come from: machine.collectionMeters`);
    console.log(
      `   - Current machine.collectionMeters: ${machineMetersIn}, ${machineMetersOut}`
    );

    if (
      machineMetersIn === mostRecentCollection.metersIn &&
      machineMetersOut === mostRecentCollection.metersOut
    ) {
      console.log('   ✅ Machine is ready for next collection');
    } else {
      console.log('   ❌ Machine needs to be updated for next collection');
    }
  } catch (error) {
    console.error('❌ Error during investigation:', error);
  } finally {
    await client.close();
    console.log('\n🔍 Detailed investigation complete');
  }
}

// Run the investigation
investigateMachine1007Detailed().catch(console.error);
