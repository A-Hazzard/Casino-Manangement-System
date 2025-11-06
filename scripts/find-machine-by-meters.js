/**
 * Find Machine by Meter Values
 * 
 * Purpose: Find the machine that has a collection with specific meter readings
 * 
 * Usage: node scripts/find-machine-by-meters.js [metersIn] [metersOut]
 * Example: node scripts/find-machine-by-meters.js 583676 475639.25
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGO_URI;
const METERS_IN = parseFloat(process.argv[2]);
const METERS_OUT = parseFloat(process.argv[3]);

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in .env file');
  process.exit(1);
}

if (!METERS_IN || !METERS_OUT) {
  console.error('❌ Please provide metersIn and metersOut values');
  console.error('Usage: node scripts/find-machine-by-meters.js [metersIn] [metersOut]');
  console.error('Example: node scripts/find-machine-by-meters.js 583676 475639.25');
  process.exit(1);
}

async function findMachineByMeters() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    console.log('='.repeat(80));
    console.log('🔍 SEARCHING FOR MACHINE WITH SPECIFIC METER VALUES');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Looking for collection with:`);
    console.log(`   metersIn: ${METERS_IN}`);
    console.log(`   metersOut: ${METERS_OUT}`);
    console.log('');

    // Search for collections with these meter values (with tolerance)
    const tolerance = 0.5;
    const collections = await db.collection('collections').find({
      metersIn: { 
        $gte: METERS_IN - tolerance, 
        $lte: METERS_IN + tolerance 
      },
      metersOut: { 
        $gte: METERS_OUT - tolerance, 
        $lte: METERS_OUT + tolerance 
      }
    }).toArray();

    if (collections.length === 0) {
      console.log('❌ No collections found with these meter values');
      return;
    }

    console.log(`✅ Found ${collections.length} collection(s) with matching meter values:\n`);

    for (const collection of collections) {
      console.log('='.repeat(80));
      console.log(`📊 Collection ID: ${collection._id}`);
      console.log('='.repeat(80));
      console.log('');
      console.log(`Machine ID: ${collection.machineId}`);
      console.log(`Location Report ID: ${collection.locationReportId || 'N/A'}`);
      console.log(`Timestamp: ${collection.timestamp}`);
      console.log(`Serial Number: ${collection.serialNumber || 'N/A'}`);
      console.log(`Machine Name: ${collection.machineName || 'N/A'}`);
      console.log(`Machine Custom Name: ${collection.machineCustomName || 'N/A'}`);
      console.log('');
      console.log('Meter Values:');
      console.log(`   metersIn: ${collection.metersIn}`);
      console.log(`   metersOut: ${collection.metersOut}`);
      console.log(`   prevIn: ${collection.prevIn || 'N/A'}`);
      console.log(`   prevOut: ${collection.prevOut || 'N/A'}`);
      console.log('');

      // Get the machine document
      const machine = await db.collection('machines').findOne({ _id: collection.machineId });
      
      if (machine) {
        console.log('🔧 Machine Document Found:');
        console.log(`   Serial Number: ${machine.serialNumber || 'N/A'}`);
        console.log(`   Custom Name: ${machine.custom?.name || 'N/A'}`);
        console.log(`   Location: ${machine.gamingLocation}`);
        console.log('');
        console.log('   Current machine.collectionMeters:');
        if (machine.collectionMeters) {
          console.log(`      metersIn: ${machine.collectionMeters.metersIn}`);
          console.log(`      metersOut: ${machine.collectionMeters.metersOut}`);
        } else {
          console.log('      ❌ No collectionMeters on machine!');
        }
        console.log('');

        // Get all collections for this machine
        const allCollections = await db.collection('collections').find({
          machineId: collection.machineId,
          isCompleted: true
        }).sort({ timestamp: -1 }).toArray();

        console.log(`📋 Total collections for this machine: ${allCollections.length}`);
        console.log('');
        console.log('Recent collections (most recent first):');
        
        allCollections.slice(0, 5).forEach((col, index) => {
          const date = new Date(col.timestamp);
          console.log(`   ${index + 1}. ${date.toISOString().split('T')[0]}`);
          console.log(`      Collection ID: ${col._id}`);
          console.log(`      metersIn: ${col.metersIn} | metersOut: ${col.metersOut}`);
          console.log(`      prevIn: ${col.prevIn} | prevOut: ${col.prevOut}`);
          
          // Check if this is the collection we're looking for
          if (col._id === collection._id) {
            console.log(`      👉 THIS IS THE COLLECTION (28th report)`);
          }
          console.log('');
        });

        // Now show what the NEXT collection should use
        console.log('='.repeat(80));
        console.log('💡 ANALYSIS: What Next Collection Should Show');
        console.log('='.repeat(80));
        console.log('');
        
        const latestCollection = allCollections[0];
        console.log('Latest Completed Collection:');
        console.log(`   Date: ${new Date(latestCollection.timestamp).toISOString()}`);
        console.log(`   metersIn: ${latestCollection.metersIn}`);
        console.log(`   metersOut: ${latestCollection.metersOut}`);
        console.log('');
        
        console.log('When Creating New Collection, prevIn/prevOut Should Be:');
        console.log(`   prevIn: ${latestCollection.metersIn} (from latest collection)`);
        console.log(`   prevOut: ${latestCollection.metersOut} (from latest collection)`);
        console.log('');
        
        console.log('What machine.collectionMeters Currently Shows:');
        if (machine.collectionMeters) {
          console.log(`   metersIn: ${machine.collectionMeters.metersIn}`);
          console.log(`   metersOut: ${machine.collectionMeters.metersOut}`);
          console.log('');
          
          const metersInDiff = Math.abs(machine.collectionMeters.metersIn - latestCollection.metersIn);
          const metersOutDiff = Math.abs(machine.collectionMeters.metersOut - latestCollection.metersOut);
          
          if (metersInDiff < 0.1 && metersOutDiff < 0.1) {
            console.log('✅ machine.collectionMeters MATCHES latest collection - CORRECT!');
          } else {
            console.log('❌ machine.collectionMeters DOES NOT MATCH latest collection!');
            console.log('');
            console.log('MISMATCH DETAILS:');
            console.log(`   Expected metersIn: ${latestCollection.metersIn}`);
            console.log(`   Actual metersIn: ${machine.collectionMeters.metersIn}`);
            console.log(`   Difference: ${metersInDiff.toFixed(2)}`);
            console.log('');
            console.log(`   Expected metersOut: ${latestCollection.metersOut}`);
            console.log(`   Actual metersOut: ${machine.collectionMeters.metersOut}`);
            console.log(`   Difference: ${metersOutDiff.toFixed(2)}`);
            console.log('');
            console.log('🔍 ROOT CAUSE:');
            console.log('   machine.collectionMeters is out of sync with the latest collection.');
            console.log('   This is why creating a new collection shows incorrect prevIn/prevOut.');
            console.log('');
            console.log('💡 SOLUTION:');
            console.log('   Run the Fix Report feature on the collection report to sync data.');
            console.log('   OR manually update machine.collectionMeters to match latest collection.');
          }
        } else {
          console.log('❌ machine.collectionMeters is MISSING!');
        }
        console.log('');

        // Check if there are incomplete collections
        const incompleteCollections = await db.collection('collections').find({
          machineId: collection.machineId,
          isCompleted: false
        }).toArray();

        if (incompleteCollections.length > 0) {
          console.log('⚠️  INCOMPLETE COLLECTIONS FOUND:');
          console.log(`   There are ${incompleteCollections.length} incomplete collection(s) for this machine.`);
          console.log('   These might be draft collections that need to be finalized or deleted.');
          console.log('');
          incompleteCollections.forEach((incomplete, index) => {
            console.log(`   ${index + 1}. Collection ID: ${incomplete._id}`);
            console.log(`      Timestamp: ${incomplete.timestamp}`);
            console.log(`      metersIn: ${incomplete.metersIn}`);
            console.log(`      metersOut: ${incomplete.metersOut}`);
            console.log('');
          });
        }

        console.log('🔧 To investigate further, run:');
        console.log(`   node scripts/investigate-prev-meters-mismatch.js ${collection.machineId}`);
        console.log('');

      } else {
        console.log('❌ Machine document not found!');
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

findMachineByMeters();

