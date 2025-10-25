#!/usr/bin/env node

/**
 * Investigation Script: Previous Meters Detection Logic
 *
 * This script investigates why the system is detecting "Previous Meters Mismatch"
 * and verifies if the detection logic is correct or too strict.
 *
 * Author: Aaron Hazzard - Senior Software Engineer
 * Last Updated: January 21st, 2025
 */

const { MongoClient } = require('mongodb');

// Database connection
const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:30717/sas-dev?authSource=admin';

async function investigatePrevMeters() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('🔍 Connected to MongoDB');

    const db = client.db('sas-dev');
    const collections = db.collection('collections');
    const machines = db.collection('machines');

    // Get the specific collection mentioned in the error
    const collectionId = '68f455cfade745a1c2214094';
    const machineId = 'c4e30d163e55fbb5ecbd6080'; // Machine 1007

    console.log('\n📊 INVESTIGATION: Previous Meters Detection Logic');
    console.log('='.repeat(60));

    // 1. Get the current collection with issues
    console.log('\n1️⃣ CURRENT COLLECTION WITH ISSUES:');
    const currentCollection = await collections.findOne({ _id: collectionId });
    if (!currentCollection) {
      console.log('❌ Collection not found:', collectionId);
      return;
    }

    console.log('📋 Collection Details:');
    console.log(`   ID: ${currentCollection._id}`);
    console.log(`   Machine ID: ${currentCollection.machineId}`);
    console.log(`   Machine Name: ${currentCollection.machineName}`);
    console.log(`   Collection Time: ${currentCollection.collectionTime}`);
    console.log(`   Timestamp: ${currentCollection.timestamp}`);
    console.log(`   Is Completed: ${currentCollection.isCompleted}`);
    console.log(`   Location Report ID: ${currentCollection.locationReportId}`);
    console.log(`   Current Meters In: ${currentCollection.metersIn}`);
    console.log(`   Current Meters Out: ${currentCollection.metersOut}`);
    console.log(`   Prev In: ${currentCollection.prevIn}`);
    console.log(`   Prev Out: ${currentCollection.prevOut}`);
    console.log(`   Movement In: ${currentCollection.movement?.metersIn}`);
    console.log(`   Movement Out: ${currentCollection.movement?.metersOut}`);
    console.log(`   Movement Gross: ${currentCollection.movement?.gross}`);

    // 2. Get the machine's current collection meters
    console.log('\n2️⃣ MACHINE CURRENT COLLECTION METERS:');
    const machine = await machines.findOne({ _id: machineId });
    if (machine) {
      console.log('📋 Machine Details:');
      console.log(`   ID: ${machine._id}`);
      console.log(`   Name: ${machine.name}`);
      console.log(`   Serial Number: ${machine.serialNumber}`);
      console.log(
        `   Current Collection Meters In: ${machine.collectionMeters?.metersIn}`
      );
      console.log(
        `   Current Collection Meters Out: ${machine.collectionMeters?.metersOut}`
      );
      console.log(`   Collection Time: ${machine.collectionTime}`);
      console.log(
        `   Previous Collection Time: ${machine.previousCollectionTime}`
      );

      // Show collection history
      if (
        machine.collectionMetersHistory &&
        machine.collectionMetersHistory.length > 0
      ) {
        console.log('\n📚 Collection Meters History:');
        machine.collectionMetersHistory.forEach((entry, index) => {
          console.log(
            `   [${index}] ${entry.timestamp}: In=${entry.metersIn}, Out=${entry.metersOut}, PrevIn=${entry.prevMetersIn}, PrevOut=${entry.prevMetersOut}, ReportID=${entry.locationReportId}`
          );
        });
      }
    } else {
      console.log('❌ Machine not found:', machineId);
    }

    // 3. Find ALL collections for this machine (chronological order)
    console.log('\n3️⃣ ALL COLLECTIONS FOR MACHINE (CHRONOLOGICAL ORDER):');
    const allCollections = await collections
      .find({
        machineId: machineId,
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      })
      .sort({ collectionTime: 1, timestamp: 1 })
      .toArray();

    console.log(
      `📋 Found ${allCollections.length} collections for machine ${machineId}:`
    );
    allCollections.forEach((col, index) => {
      console.log(
        `   [${index + 1}] ${col.timestamp}: In=${col.metersIn}, Out=${col.metersOut}, PrevIn=${col.prevIn}, PrevOut=${col.prevOut}, Completed=${col.isCompleted}, ReportID=${col.locationReportId}`
      );
    });

    // 4. Apply the detection algorithm logic
    console.log('\n4️⃣ DETECTION ALGORITHM ANALYSIS:');
    const collectionTimeForComparison =
      currentCollection.collectionTime || currentCollection.timestamp;

    console.log(
      `🔍 Looking for previous collection before: ${collectionTimeForComparison}`
    );

    // This is the EXACT query used in the detection algorithm
    const previousCollection = await collections.findOne(
      {
        machineId: machineId,
        $and: [
          {
            $or: [
              { collectionTime: { $lt: collectionTimeForComparison } },
              { timestamp: { $lt: collectionTimeForComparison } },
            ],
          },
          {
            $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
          },
          { isCompleted: true },
        ],
      },
      { sort: { collectionTime: -1, timestamp: -1 } }
    );

    if (previousCollection) {
      console.log('✅ PREVIOUS COLLECTION FOUND:');
      console.log(`   ID: ${previousCollection._id}`);
      console.log(`   Collection Time: ${previousCollection.collectionTime}`);
      console.log(`   Timestamp: ${previousCollection.timestamp}`);
      console.log(`   Meters In: ${previousCollection.metersIn}`);
      console.log(`   Meters Out: ${previousCollection.metersOut}`);
      console.log(`   Is Completed: ${previousCollection.isCompleted}`);
      console.log(
        `   Location Report ID: ${previousCollection.locationReportId}`
      );

      // Calculate expected values
      const expectedPrevIn = previousCollection.metersIn || 0;
      const expectedPrevOut = previousCollection.metersOut || 0;

      console.log('\n🎯 EXPECTED vs ACTUAL COMPARISON:');
      console.log(`   Expected Prev In: ${expectedPrevIn}`);
      console.log(`   Actual Prev In: ${currentCollection.prevIn}`);
      console.log(`   Expected Prev Out: ${expectedPrevOut}`);
      console.log(`   Actual Prev Out: ${currentCollection.prevOut}`);

      // Check if there's a mismatch
      const hasMismatch =
        currentCollection.prevIn !== expectedPrevIn ||
        currentCollection.prevOut !== expectedPrevOut;

      console.log(`\n🔍 MISMATCH DETECTED: ${hasMismatch ? 'YES' : 'NO'}`);

      if (hasMismatch) {
        console.log('\n⚠️  MISMATCH ANALYSIS:');
        console.log(
          `   Prev In Mismatch: ${currentCollection.prevIn} !== ${expectedPrevIn} (diff: ${expectedPrevIn - currentCollection.prevIn})`
        );
        console.log(
          `   Prev Out Mismatch: ${currentCollection.prevOut} !== ${expectedPrevOut} (diff: ${expectedPrevOut - currentCollection.prevOut})`
        );

        // Check if the mismatch is significant
        const prevInDiff = Math.abs(expectedPrevIn - currentCollection.prevIn);
        const prevOutDiff = Math.abs(
          expectedPrevOut - currentCollection.prevOut
        );

        console.log(`\n📊 MISMATCH SIGNIFICANCE:`);
        console.log(`   Prev In Difference: ${prevInDiff.toLocaleString()}`);
        console.log(`   Prev Out Difference: ${prevOutDiff.toLocaleString()}`);

        if (prevInDiff > 1000000 || prevOutDiff > 1000000) {
          console.log(
            '   🚨 LARGE MISMATCH DETECTED - This could cause significant calculation errors!'
          );
        }
      }
    } else {
      console.log('❌ NO PREVIOUS COLLECTION FOUND');
      console.log(
        '   This means the current collection should have prevIn=0, prevOut=0'
      );
      console.log(`   Current prevIn: ${currentCollection.prevIn}`);
      console.log(`   Current prevOut: ${currentCollection.prevOut}`);

      if (currentCollection.prevIn !== 0 || currentCollection.prevOut !== 0) {
        console.log('   ⚠️  MISMATCH: Should be 0 but has non-zero values');
      }
    }

    // 5. Check for potential issues in the detection logic
    console.log('\n5️⃣ POTENTIAL DETECTION LOGIC ISSUES:');

    // Check if there are incomplete collections that might interfere
    const incompleteCollections = await collections
      .find({
        machineId: machineId,
        isCompleted: false,
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      })
      .toArray();

    if (incompleteCollections.length > 0) {
      console.log(
        `⚠️  Found ${incompleteCollections.length} incomplete collections that might interfere:`
      );
      incompleteCollections.forEach((col, index) => {
        console.log(
          `   [${index + 1}] ${col.timestamp}: In=${col.metersIn}, Out=${col.metersOut}, Completed=${col.isCompleted}`
        );
      });
    }

    // Check for collections with same timestamp (potential duplicates)
    const duplicateTimeCollections = await collections
      .find({
        machineId: machineId,
        $or: [
          { collectionTime: collectionTimeForComparison },
          { timestamp: collectionTimeForComparison },
        ],
      })
      .toArray();

    if (duplicateTimeCollections.length > 1) {
      console.log(
        `⚠️  Found ${duplicateTimeCollections.length} collections with same timestamp (potential duplicates):`
      );
      duplicateTimeCollections.forEach((col, index) => {
        console.log(
          `   [${index + 1}] ${col._id}: ${col.timestamp}, Completed=${col.isCompleted}`
        );
      });
    }

    // 6. Recommendations
    console.log('\n6️⃣ RECOMMENDATIONS:');

    if (previousCollection) {
      const expectedPrevIn = previousCollection.metersIn || 0;
      const expectedPrevOut = previousCollection.metersOut || 0;
      const hasMismatch =
        currentCollection.prevIn !== expectedPrevIn ||
        currentCollection.prevOut !== expectedPrevOut;

      if (hasMismatch) {
        console.log(
          '✅ DETECTION LOGIC IS CORRECT - The mismatch is real and needs to be fixed'
        );
        console.log(
          '   The system correctly identified that prevIn/prevOut should be updated'
        );
        console.log(
          '   This is not a false positive - the data is actually inconsistent'
        );
      } else {
        console.log('✅ DETECTION LOGIC IS CORRECT - Values match expected');
      }
    } else {
      if (currentCollection.prevIn === 0 && currentCollection.prevOut === 0) {
        console.log(
          '✅ DETECTION LOGIC IS CORRECT - No previous collection, values should be 0'
        );
        console.log(
          '   This might be a false positive if the detection is still showing'
        );
      } else {
        console.log(
          '❓ DETECTION LOGIC NEEDS INVESTIGATION - Unexpected scenario'
        );
      }
    }
  } catch (error) {
    console.error('❌ Error during investigation:', error);
  } finally {
    await client.close();
    console.log('\n🔍 Investigation complete');
  }
}

// Run the investigation
investigatePrevMeters().catch(console.error);
