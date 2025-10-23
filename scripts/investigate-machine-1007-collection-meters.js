#!/usr/bin/env node

/**
 * Investigation Script: Machine 1007 Collection Meters Fix
 * 
 * This script investigates why the fix button didn't update the machine's collectionMeters
 * for machine "1007" and why the UI isn't detecting the mismatch.
 * 
 * Author: Aaron Hazzard - Senior Software Engineer
 * Last Updated: January 21st, 2025
 */

const { MongoClient } = require('mongodb');

// Database connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:30717/sas-dev?authSource=admin';

async function investigateMachine1007CollectionMeters() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('🔍 Connected to MongoDB');
    
    const db = client.db('sas-dev');
    const collections = db.collection('collections');
    const machines = db.collection('machines');
    
    // Find machine 1007
    const machine = await machines.findOne({ 
      $or: [
        { serialNumber: "1007" },
        { name: "1007" }
      ]
    });
    
    if (!machine) {
      console.log('❌ Machine 1007 not found');
      return;
    }
    
    console.log('\n📊 INVESTIGATION: Machine 1007 Collection Meters');
    console.log('=' .repeat(60));
    
    // 1. Get machine details
    console.log('\n1️⃣ MACHINE DETAILS:');
    console.log(`   ID: ${machine._id}`);
    console.log(`   Name: ${machine.name}`);
    console.log(`   Serial Number: ${machine.serialNumber}`);
    console.log(`   Current Collection Meters In: ${machine.collectionMeters?.metersIn}`);
    console.log(`   Current Collection Meters Out: ${machine.collectionMeters?.metersOut}`);
    console.log(`   Collection Time: ${machine.collectionTime}`);
    console.log(`   Previous Collection Time: ${machine.previousCollectionTime}`);
    
    // 2. Get all collections for this machine (most recent first)
    console.log('\n2️⃣ ALL COLLECTIONS FOR MACHINE 1007 (MOST RECENT FIRST):');
    const allCollections = await collections.find({ 
      machineId: String(machine._id),
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }]
    }).sort({ collectionTime: -1, timestamp: -1 }).toArray();
    
    console.log(`📋 Found ${allCollections.length} collections for machine ${machine._id}:`);
    allCollections.forEach((col, index) => {
      console.log(`   [${index + 1}] ${col.timestamp}: In=${col.metersIn}, Out=${col.metersOut}, PrevIn=${col.prevIn}, PrevOut=${col.prevOut}, Completed=${col.isCompleted}, ReportID=${col.locationReportId}`);
    });
    
    // 3. Check the most recent collection
    if (allCollections.length > 0) {
      const mostRecentCollection = allCollections[0];
      console.log('\n3️⃣ MOST RECENT COLLECTION ANALYSIS:');
      console.log(`   Collection ID: ${mostRecentCollection._id}`);
      console.log(`   Collection Time: ${mostRecentCollection.timestamp}`);
      console.log(`   Current Meters In: ${mostRecentCollection.metersIn}`);
      console.log(`   Current Meters Out: ${mostRecentCollection.metersOut}`);
      console.log(`   Prev In: ${mostRecentCollection.prevIn}`);
      console.log(`   Prev Out: ${mostRecentCollection.prevOut}`);
      console.log(`   Is Completed: ${mostRecentCollection.isCompleted}`);
      console.log(`   Location Report ID: ${mostRecentCollection.locationReportId}`);
      
      // Check if machine collectionMeters match the collection
      console.log('\n🔍 COLLECTION METERS COMPARISON:');
      console.log(`   Machine Collection Meters In: ${machine.collectionMeters?.metersIn}`);
      console.log(`   Collection Current Meters In: ${mostRecentCollection.metersIn}`);
      console.log(`   Machine Collection Meters Out: ${machine.collectionMeters?.metersOut}`);
      console.log(`   Collection Current Meters Out: ${mostRecentCollection.metersOut}`);
      
      const metersInMatch = machine.collectionMeters?.metersIn === mostRecentCollection.metersIn;
      const metersOutMatch = machine.collectionMeters?.metersOut === mostRecentCollection.metersOut;
      
      console.log(`\n📊 MISMATCH ANALYSIS:`);
      console.log(`   Meters In Match: ${metersInMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`   Meters Out Match: ${metersOutMatch ? '✅ YES' : '❌ NO'}`);
      
      if (!metersInMatch || !metersOutMatch) {
        console.log(`\n⚠️  MISMATCH DETECTED:`);
        if (!metersInMatch) {
          console.log(`   Meters In: Machine(${machine.collectionMeters?.metersIn}) !== Collection(${mostRecentCollection.metersIn})`);
        }
        if (!metersOutMatch) {
          console.log(`   Meters Out: Machine(${machine.collectionMeters?.metersOut}) !== Collection(${mostRecentCollection.metersOut})`);
        }
      }
      
      // 4. Check if this should be detected by the UI
      console.log('\n4️⃣ UI DETECTION ANALYSIS:');
      
      // Use the same machine data we already have
      const machineForCheck = machine;
      
      if (machineForCheck) {
        const machineMetersIn = machineForCheck.collectionMeters?.metersIn || 0;
        const machineMetersOut = machineForCheck.collectionMeters?.metersOut || 0;
        
        console.log(`   UI Check - Machine Meters In: ${machineMetersIn}`);
        console.log(`   UI Check - Machine Meters Out: ${machineMetersOut}`);
        console.log(`   UI Check - Collection Meters In: ${mostRecentCollection.metersIn}`);
        console.log(`   UI Check - Collection Meters Out: ${mostRecentCollection.metersOut}`);
        
        const uiDetectsMismatch = machineMetersIn !== mostRecentCollection.metersIn || 
                                 machineMetersOut !== mostRecentCollection.metersOut;
        
        console.log(`   UI Should Detect Mismatch: ${uiDetectsMismatch ? '✅ YES' : '❌ NO'}`);
        
        if (uiDetectsMismatch) {
          console.log(`   🚨 UI SHOULD BE SHOWING THIS AS AN ISSUE!`);
        } else {
          console.log(`   ✅ UI correctly shows no issue`);
        }
      }
      
      // 5. Check if fix logic would work
      console.log('\n5️⃣ FIX LOGIC ANALYSIS:');
      
      // This is the exact logic from fix-report API
      const expectedMetersIn = mostRecentCollection.metersIn || 0;
      const expectedMetersOut = mostRecentCollection.metersOut || 0;
      
      console.log(`   Expected Machine Meters In: ${expectedMetersIn}`);
      console.log(`   Expected Machine Meters Out: ${expectedMetersOut}`);
      console.log(`   Current Machine Meters In: ${machine.collectionMeters?.metersIn}`);
      console.log(`   Current Machine Meters Out: ${machine.collectionMeters?.metersOut}`);
      
      const needsFix = machine.collectionMeters?.metersIn !== expectedMetersIn || 
                      machine.collectionMeters?.metersOut !== expectedMetersOut;
      
      console.log(`   Fix Needed: ${needsFix ? '✅ YES' : '❌ NO'}`);
      
      if (needsFix) {
        console.log(`   🔧 Fix would update:`);
        console.log(`      Meters In: ${machine.collectionMeters?.metersIn} → ${expectedMetersIn}`);
        console.log(`      Meters Out: ${machine.collectionMeters?.metersOut} → ${expectedMetersOut}`);
      }
    }
    
    // 6. Check if there are multiple collections with same timestamp (potential duplicates)
    console.log('\n6️⃣ DUPLICATE COLLECTIONS CHECK:');
    const timestampGroups = {};
    allCollections.forEach(col => {
      const timestamp = col.timestamp?.toISOString();
      if (!timestampGroups[timestamp]) {
        timestampGroups[timestamp] = [];
      }
      timestampGroups[timestamp].push(col);
    });
    
    Object.entries(timestampGroups).forEach(([timestamp, cols]) => {
      if (cols.length > 1) {
        console.log(`   ⚠️  Found ${cols.length} collections with same timestamp ${timestamp}:`);
        cols.forEach((col, index) => {
          console.log(`      [${index + 1}] ${col._id}: In=${col.metersIn}, Out=${col.metersOut}, Completed=${col.isCompleted}`);
        });
      }
    });
    
    // 7. Recommendations
    console.log('\n7️⃣ RECOMMENDATIONS:');
    
    if (allCollections.length > 0) {
      const mostRecent = allCollections[0];
      const machineMetersIn = machine.collectionMeters?.metersIn || 0;
      const machineMetersOut = machine.collectionMeters?.metersOut || 0;
      
      if (machineMetersIn !== mostRecent.metersIn || machineMetersOut !== mostRecent.metersOut) {
        console.log('🚨 ISSUES FOUND:');
        console.log('   1. Machine collectionMeters do not match the most recent collection');
        console.log('   2. This should be detected by the UI but apparently is not');
        console.log('   3. The fix button should update the machine collectionMeters');
        console.log('');
        console.log('🔧 SUGGESTED ACTIONS:');
        console.log('   1. Check if the fix button is actually calling the fix-report API');
        console.log('   2. Check if the fix-report API is updating the machine collectionMeters');
        console.log('   3. Check if the UI detection logic is working correctly');
        console.log('   4. Manually update the machine collectionMeters if needed');
      } else {
        console.log('✅ NO ISSUES FOUND - Machine collectionMeters match the most recent collection');
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
investigateMachine1007CollectionMeters().catch(console.error);
