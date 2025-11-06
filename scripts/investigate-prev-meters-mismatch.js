/**
 * Investigation Script: Previous Meters Mismatch
 * 
 * Purpose: Investigate why the prevIn/prevOut shown when creating a new collection
 * doesn't match the metersIn/metersOut from the last collection (28th report)
 * 
 * Expected: prevIn/prevOut should match the metersIn/metersOut from the last collection
 * Actual: prevIn/prevOut shows different values (680606.75 / 624419 vs 583676 / 475639.25)
 * 
 * This script will:
 * 1. Find the collection report for the 28th
 * 2. Find all collections for the specific machine in that report
 * 3. Check what the machine.collectionMeters currently shows
 * 4. Trace the collection history chain
 * 5. Identify where the mismatch occurs
 * 
 * Usage: node scripts/investigate-prev-meters-mismatch.js [machineId]
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGO_URI;
const MACHINE_ID = process.argv[2]; // Pass machine ID as argument

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in .env file');
  process.exit(1);
}

function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toISOString().split('T')[0];
}

function formatMoney(value) {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value !== 'number') {
    const num = parseFloat(value);
    if (isNaN(num)) return 'N/A';
    return num.toFixed(2);
  }
  return value.toFixed(2);
}

async function investigatePrevMetersMismatch() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    console.log('='.repeat(80));
    console.log('🔍 INVESTIGATING PREVIOUS METERS MISMATCH');
    console.log('='.repeat(80));
    console.log('');

    // Step 1: Find collection reports around the 28th
    console.log('📊 Step 1: Finding collection reports around the 28th...\n');
    
    const collectionReports = await db.collection('collectionreports')
      .find({})
      .sort({ date: -1 })
      .limit(30)
      .toArray();

    console.log(`Found ${collectionReports.length} recent collection reports:\n`);
    
    collectionReports.forEach((report, index) => {
      const reportDate = new Date(report.date);
      const day = reportDate.getDate();
      console.log(`${index + 1}. ${report.locationReportId}`);
      console.log(`   Date: ${formatDate(report.date)} (Day ${day})`);
      console.log(`   Location: ${report.location}`);
      console.log(`   Total Gross: ${formatMoney(report.totalGross)}`);
      console.log('');
    });

    // Step 2: If machine ID provided, investigate specific machine
    if (MACHINE_ID) {
      console.log('='.repeat(80));
      console.log(`🔍 INVESTIGATING MACHINE: ${MACHINE_ID}`);
      console.log('='.repeat(80));
      console.log('');

      // Get machine document
      const machine = await db.collection('machines').findOne({ _id: MACHINE_ID });
      
      if (!machine) {
        console.error(`❌ Machine ${MACHINE_ID} not found!`);
        return;
      }

      console.log('📋 Machine Information:');
      console.log(`   Serial Number: ${machine.serialNumber || 'N/A'}`);
      console.log(`   Custom Name: ${machine.custom?.name || 'N/A'}`);
      console.log(`   Location: ${machine.gamingLocation || 'N/A'}`);
      console.log('');

      // Check current machine.collectionMeters
      console.log('📊 Current Machine Collection Meters:');
      if (machine.collectionMeters) {
        console.log(`   metersIn: ${formatMoney(machine.collectionMeters.metersIn)}`);
        console.log(`   metersOut: ${formatMoney(machine.collectionMeters.metersOut)}`);
      } else {
        console.log('   ❌ No collectionMeters found on machine!');
      }
      console.log('');

      // Get all collections for this machine, sorted by timestamp
      console.log('📊 Finding all collections for this machine...\n');
      
      const collections = await db.collection('collections')
        .find({ 
          machineId: MACHINE_ID,
          isCompleted: true 
        })
        .sort({ timestamp: -1 })
        .toArray();

      console.log(`Found ${collections.length} completed collections:\n`);

      collections.forEach((collection, index) => {
        const collectionDate = new Date(collection.timestamp);
        const day = collectionDate.getDate();
        
        console.log(`Collection #${index + 1} (${formatDate(collection.timestamp)} - Day ${day}):`);
        console.log(`   Collection ID: ${collection._id}`);
        console.log(`   Location Report ID: ${collection.locationReportId || 'N/A'}`);
        console.log(`   Timestamp: ${collection.timestamp}`);
        console.log('');
        console.log('   Current Meters:');
        console.log(`      metersIn: ${formatMoney(collection.metersIn)}`);
        console.log(`      metersOut: ${formatMoney(collection.metersOut)}`);
        console.log('');
        console.log('   Previous Meters (what this collection used as baseline):');
        console.log(`      prevIn: ${formatMoney(collection.prevIn)}`);
        console.log(`      prevOut: ${formatMoney(collection.prevOut)}`);
        console.log('');
        console.log('   Movement Calculated:');
        console.log(`      movement.metersIn: ${formatMoney(collection.movement?.metersIn)}`);
        console.log(`      movement.metersOut: ${formatMoney(collection.movement?.metersOut)}`);
        console.log(`      movement.gross: ${formatMoney(collection.movement?.gross)}`);
        console.log('');
        
        // Check if prevIn/prevOut matches previous collection's metersIn/metersOut
        if (index < collections.length - 1) {
          const previousCollection = collections[index + 1];
          const prevInMatch = Math.abs(collection.prevIn - previousCollection.metersIn) < 0.1;
          const prevOutMatch = Math.abs(collection.prevOut - previousCollection.metersOut) < 0.1;
          
          console.log('   ✓ Validation Against Previous Collection:');
          console.log(`      Previous collection metersIn: ${formatMoney(previousCollection.metersIn)}`);
          console.log(`      This collection prevIn: ${formatMoney(collection.prevIn)}`);
          console.log(`      Match: ${prevInMatch ? '✅ YES' : '❌ NO'}`);
          console.log('');
          console.log(`      Previous collection metersOut: ${formatMoney(previousCollection.metersOut)}`);
          console.log(`      This collection prevOut: ${formatMoney(collection.prevOut)}`);
          console.log(`      Match: ${prevOutMatch ? '✅ YES' : '❌ NO'}`);
          console.log('');
          
          if (!prevInMatch || !prevOutMatch) {
            console.log('   ⚠️  MISMATCH DETECTED!');
            console.log(`      Expected prevIn: ${formatMoney(previousCollection.metersIn)}`);
            console.log(`      Actual prevIn: ${formatMoney(collection.prevIn)}`);
            console.log(`      Difference: ${formatMoney(Math.abs(collection.prevIn - previousCollection.metersIn))}`);
            console.log('');
            console.log(`      Expected prevOut: ${formatMoney(previousCollection.metersOut)}`);
            console.log(`      Actual prevOut: ${formatMoney(collection.prevOut)}`);
            console.log(`      Difference: ${formatMoney(Math.abs(collection.prevOut - previousCollection.metersOut))}`);
            console.log('');
          }
        } else {
          console.log('   ℹ️  This is the oldest collection (no previous collection to compare)');
          console.log('');
        }
        
        console.log('-'.repeat(80));
        console.log('');
      });

      // Check machine.collectionMetersHistory
      console.log('='.repeat(80));
      console.log('📊 Machine Collection Meters History:');
      console.log('='.repeat(80));
      console.log('');

      if (machine.collectionMetersHistory && machine.collectionMetersHistory.length > 0) {
        console.log(`Found ${machine.collectionMetersHistory.length} history entries:\n`);
        
        machine.collectionMetersHistory
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .forEach((entry, index) => {
            const entryDate = new Date(entry.timestamp);
            const day = entryDate.getDate();
            
            console.log(`History Entry #${index + 1} (${formatDate(entry.timestamp)} - Day ${day}):`);
            console.log(`   Location Report ID: ${entry.locationReportId || 'N/A'}`);
            console.log(`   Timestamp: ${entry.timestamp}`);
            console.log(`   metersIn: ${formatMoney(entry.metersIn)}`);
            console.log(`   metersOut: ${formatMoney(entry.metersOut)}`);
            console.log(`   prevMetersIn: ${formatMoney(entry.prevMetersIn)}`);
            console.log(`   prevMetersOut: ${formatMoney(entry.prevMetersOut)}`);
            console.log('');
            
            // Find corresponding collection
            const correspondingCollection = collections.find(c => 
              c.locationReportId === entry.locationReportId
            );
            
            if (correspondingCollection) {
              const metersInMatch = Math.abs(entry.metersIn - correspondingCollection.metersIn) < 0.1;
              const metersOutMatch = Math.abs(entry.metersOut - correspondingCollection.metersOut) < 0.1;
              
              console.log('   ✓ Validation Against Collection Document:');
              console.log(`      Collection metersIn: ${formatMoney(correspondingCollection.metersIn)}`);
              console.log(`      History metersIn: ${formatMoney(entry.metersIn)}`);
              console.log(`      Match: ${metersInMatch ? '✅ YES' : '❌ NO'}`);
              console.log('');
              console.log(`      Collection metersOut: ${formatMoney(correspondingCollection.metersOut)}`);
              console.log(`      History metersOut: ${formatMoney(entry.metersOut)}`);
              console.log(`      Match: ${metersOutMatch ? '✅ YES' : '❌ NO'}`);
              console.log('');
              
              if (!metersInMatch || !metersOutMatch) {
                console.log('   ⚠️  MISMATCH DETECTED BETWEEN HISTORY AND COLLECTION!');
                console.log('');
              }
            } else {
              console.log('   ⚠️  No corresponding collection found in collections table!');
              console.log('   This might be an orphaned history entry.');
              console.log('');
            }
            
            console.log('-'.repeat(80));
            console.log('');
          });
      } else {
        console.log('❌ No collection meters history found on machine!');
        console.log('');
      }

      // Summary analysis
      console.log('='.repeat(80));
      console.log('📊 ANALYSIS SUMMARY');
      console.log('='.repeat(80));
      console.log('');

      if (collections.length >= 2) {
        const latestCollection = collections[0];
        const secondLatestCollection = collections[1];
        
        console.log('Latest Collection (Most Recent):');
        console.log(`   Date: ${formatDate(latestCollection.timestamp)}`);
        console.log(`   metersIn: ${formatMoney(latestCollection.metersIn)}`);
        console.log(`   metersOut: ${formatMoney(latestCollection.metersOut)}`);
        console.log('');
        
        console.log('What Next Collection Should Use as prevIn/prevOut:');
        console.log(`   Should be prevIn: ${formatMoney(latestCollection.metersIn)}`);
        console.log(`   Should be prevOut: ${formatMoney(latestCollection.metersOut)}`);
        console.log('');
        
        console.log('What machine.collectionMeters Currently Shows:');
        if (machine.collectionMeters) {
          console.log(`   Current metersIn: ${formatMoney(machine.collectionMeters.metersIn)}`);
          console.log(`   Current metersOut: ${formatMoney(machine.collectionMeters.metersOut)}`);
          console.log('');
          
          const machineMetersMatchLatest = 
            Math.abs(machine.collectionMeters.metersIn - latestCollection.metersIn) < 0.1 &&
            Math.abs(machine.collectionMeters.metersOut - latestCollection.metersOut) < 0.1;
          
          if (machineMetersMatchLatest) {
            console.log('✅ machine.collectionMeters MATCHES latest collection - CORRECT!');
          } else {
            console.log('❌ machine.collectionMeters DOES NOT MATCH latest collection - INCORRECT!');
            console.log('');
            console.log('   Expected (from latest collection):');
            console.log(`      metersIn: ${formatMoney(latestCollection.metersIn)}`);
            console.log(`      metersOut: ${formatMoney(latestCollection.metersOut)}`);
            console.log('');
            console.log('   Actual (machine.collectionMeters):');
            console.log(`      metersIn: ${formatMoney(machine.collectionMeters.metersIn)}`);
            console.log(`      metersOut: ${formatMoney(machine.collectionMeters.metersOut)}`);
            console.log('');
            console.log('   Difference:');
            console.log(`      metersIn: ${formatMoney(Math.abs(machine.collectionMeters.metersIn - latestCollection.metersIn))}`);
            console.log(`      metersOut: ${formatMoney(Math.abs(machine.collectionMeters.metersOut - latestCollection.metersOut))}`);
            console.log('');
            console.log('   🔍 This explains why creating a new collection shows wrong prevIn/prevOut!');
            console.log('   The machine.collectionMeters is outdated or incorrect.');
          }
        } else {
          console.log('❌ machine.collectionMeters is MISSING!');
          console.log('   This is why new collections might have incorrect prevIn/prevOut.');
        }
        console.log('');
        
        // Check for chain breaks
        console.log('🔗 Collection Chain Validation:');
        let chainBroken = false;
        for (let i = 0; i < collections.length - 1; i++) {
          const current = collections[i];
          const previous = collections[i + 1];
          
          const prevInMatch = Math.abs(current.prevIn - previous.metersIn) < 0.1;
          const prevOutMatch = Math.abs(current.prevOut - previous.metersOut) < 0.1;
          
          if (!prevInMatch || !prevOutMatch) {
            console.log(`   ❌ Chain break at collection #${i + 1} (${formatDate(current.timestamp)})`);
            console.log(`      Should have prevIn: ${formatMoney(previous.metersIn)}`);
            console.log(`      Actually has prevIn: ${formatMoney(current.prevIn)}`);
            console.log(`      Difference: ${formatMoney(Math.abs(current.prevIn - previous.metersIn))}`);
            console.log('');
            chainBroken = true;
          }
        }
        
        if (!chainBroken) {
          console.log('   ✅ Collection chain is intact (all prevIn/prevOut match previous collection)');
        }
        console.log('');
      }

    } else {
      console.log('⚠️  No machine ID provided. Please run with machine ID:');
      console.log('   node scripts/investigate-prev-meters-mismatch.js [machineId]');
      console.log('');
      console.log('   To find the machine ID for the 28th report, look at the collection reports above');
      console.log('   and find the one for the 28th, then check which machine has the mismatch.');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

investigatePrevMetersMismatch();

