/**
 * Script to diagnose why "FIXED MACHINE" isn't being fixed properly
 * Investigates collection chain, SAS times, and data integrity
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

// MongoDB connection URI
const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in environment variables');
  process.exit(1);
}

// Collection Schema
const collectionSchema = new mongoose.Schema({}, { strict: false, collection: 'collections' });
const Collection = mongoose.model('Collection', collectionSchema);

// CollectionReport Schema
const collectionReportSchema = new mongoose.Schema({}, { strict: false, collection: 'collectionreports' });
const CollectionReport = mongoose.model('CollectionReport', collectionReportSchema);

async function diagnoseFixedMachine() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all collections for "FIXED MACHINE"
    console.log('=' .repeat(80));
    console.log('SEARCHING FOR "FIXED MACHINE" COLLECTIONS');
    console.log('='.repeat(80) + '\n');

    const fixedMachineCollections = await Collection.find({
      $or: [
        { machineName: 'FIXED MACHINE' },
        { machineCustomName: 'FIXED MACHINE' },
        { serialNumber: 'FIXED MACHINE' },
      ]
    }).sort({ timestamp: 1 }).lean();

    console.log(`📊 Found ${fixedMachineCollections.length} collections for "FIXED MACHINE"\n`);

    if (fixedMachineCollections.length === 0) {
      console.log('❌ No collections found for "FIXED MACHINE"');
      console.log('   Searching by partial match...\n');
      
      const partialMatch = await Collection.find({
        $or: [
          { machineName: /FIXED/i },
          { machineCustomName: /FIXED/i },
          { serialNumber: /FIXED/i },
        ]
      }).sort({ timestamp: 1 }).lean();
      
      console.log(`📊 Found ${partialMatch.length} collections matching "FIXED" pattern:`);
      partialMatch.forEach((col, idx) => {
        console.log(`\n   ${idx + 1}. Collection ID: ${col._id}`);
        console.log(`      Machine Name: ${col.machineName || 'N/A'}`);
        console.log(`      Custom Name: ${col.machineCustomName || 'N/A'}`);
        console.log(`      Serial: ${col.serialNumber || 'N/A'}`);
        console.log(`      Timestamp: ${col.timestamp ? new Date(col.timestamp).toISOString() : 'N/A'}`);
      });
      
      return;
    }

    // Display all collections chronologically
    console.log('📋 COLLECTION CHAIN (Chronological Order):');
    console.log('='.repeat(80) + '\n');

    fixedMachineCollections.forEach((col, idx) => {
      const timestamp = col.timestamp ? new Date(col.timestamp) : null;
      const collectionTime = col.collectionTime ? new Date(col.collectionTime) : null;
      const sasStartTime = col.sasMeters?.sasStartTime ? new Date(col.sasMeters.sasStartTime) : null;
      const sasEndTime = col.sasMeters?.sasEndTime ? new Date(col.sasMeters.sasEndTime) : null;

      console.log(`${idx + 1}. Collection ID: ${col._id}`);
      console.log(`   Timestamp: ${timestamp ? timestamp.toISOString() : 'N/A'}`);
      console.log(`   Collection Time: ${collectionTime ? collectionTime.toISOString() : 'N/A'}`);
      console.log(`   isCompleted: ${col.isCompleted}`);
      console.log(`   locationReportId: "${col.locationReportId || ''}"`);
      console.log(`   SAS Start Time: ${sasStartTime ? sasStartTime.toISOString() : 'N/A'}`);
      console.log(`   SAS End Time: ${sasEndTime ? sasEndTime.toISOString() : 'N/A'}`);
      console.log(`   Meters In: ${col.metersIn || 'N/A'}`);
      console.log(`   Meters Out: ${col.metersOut || 'N/A'}`);
      console.log(`   Prev In: ${col.prevIn || 'N/A'}`);
      console.log(`   Prev Out: ${col.prevOut || 'N/A'}`);
      
      // Check for SAS time issues
      if (sasStartTime && sasEndTime && sasStartTime >= sasEndTime) {
        console.log(`   ⚠️  ISSUE: Inverted SAS times (start >= end)`);
      }
      
      // Check if this collection has the previous collection's timestamp as SAS start
      if (idx > 0 && sasStartTime) {
        const prevCol = fixedMachineCollections[idx - 1];
        const prevTimestamp = prevCol.timestamp ? new Date(prevCol.timestamp) : null;
        const prevCollectionTime = prevCol.collectionTime ? new Date(prevCol.collectionTime) : null;
        
        const expectedStart = prevCollectionTime || prevTimestamp;
        if (expectedStart) {
          const timeDiff = Math.abs(sasStartTime.getTime() - expectedStart.getTime());
          const minutesDiff = Math.round(timeDiff / 60000);
          
          if (minutesDiff > 5) { // Allow 5 minute tolerance
            console.log(`   ⚠️  ISSUE: SAS start time doesn't match prev collection`);
            console.log(`       Expected: ${expectedStart.toISOString()}`);
            console.log(`       Actual: ${sasStartTime.toISOString()}`);
            console.log(`       Difference: ${minutesDiff} minutes`);
          }
        }
      }
      
      console.log('');
    });

    // Find the latest report
    console.log('='.repeat(80));
    console.log('LATEST COLLECTION REPORT');
    console.log('='.repeat(80) + '\n');

    const latestReport = await CollectionReport.findOne().sort({ timestamp: -1 }).lean();
    
    if (latestReport) {
      console.log(`Report ID: ${latestReport._id}`);
      console.log(`Location Report ID: ${latestReport.locationReportId}`);
      console.log(`Location: ${latestReport.locationName}`);
      console.log(`Timestamp: ${latestReport.timestamp ? new Date(latestReport.timestamp).toISOString() : 'N/A'}`);
      console.log(`Collector: ${latestReport.collectorName}`);
      
      // Check if FIXED MACHINE is in this report
      const fixedMachineInReport = fixedMachineCollections.find(
        col => col.locationReportId === latestReport.locationReportId
      );
      
      if (fixedMachineInReport) {
        console.log(`\n✅ "FIXED MACHINE" is in this report`);
        console.log(`   Collection ID: ${fixedMachineInReport._id}`);
      } else {
        console.log(`\n❌ "FIXED MACHINE" is NOT in this report`);
      }
    } else {
      console.log('❌ No collection reports found');
    }

    // Analyze the problematic collection from the modal
    console.log('\n' + '='.repeat(80));
    console.log('ANALYZING PROBLEMATIC COLLECTION: 690d7b53efaede1ec3e85f9f');
    console.log('='.repeat(80) + '\n');

    const problematicCollection = await Collection.findOne({ _id: '690d7b53efaede1ec3e85f9f' }).lean();
    
    if (problematicCollection) {
      console.log(`✅ Found problematic collection`);
      console.log(`   Machine Name: ${problematicCollection.machineName || 'N/A'}`);
      console.log(`   Custom Name: ${problematicCollection.machineCustomName || 'N/A'}`);
      console.log(`   Machine ID: ${problematicCollection.machineId || 'N/A'}`);
      console.log(`   Timestamp: ${problematicCollection.timestamp ? new Date(problematicCollection.timestamp).toISOString() : 'N/A'}`);
      console.log(`   isCompleted: ${problematicCollection.isCompleted}`);
      console.log(`   locationReportId: "${problematicCollection.locationReportId || ''}"`);
      
      if (problematicCollection.sasMeters) {
        console.log(`   SAS Start Time: ${problematicCollection.sasMeters.sasStartTime ? new Date(problematicCollection.sasMeters.sasStartTime).toISOString() : 'N/A'}`);
        console.log(`   SAS End Time: ${problematicCollection.sasMeters.sasEndTime ? new Date(problematicCollection.sasMeters.sasEndTime).toISOString() : 'N/A'}`);
      }
      
      // Find previous collection for this machine
      console.log(`\n🔍 Searching for previous collection before this one...`);
      
      const previousCollection = await Collection.findOne({
        machineId: problematicCollection.machineId,
        timestamp: { $lt: problematicCollection.timestamp },
        isCompleted: true,
        locationReportId: { $ne: '', $exists: true }
      }).sort({ timestamp: -1 }).lean();
      
      if (previousCollection) {
        console.log(`\n✅ Found previous collection:`);
        console.log(`   Collection ID: ${previousCollection._id}`);
        console.log(`   Timestamp: ${previousCollection.timestamp ? new Date(previousCollection.timestamp).toISOString() : 'N/A'}`);
        console.log(`   Collection Time: ${previousCollection.collectionTime ? new Date(previousCollection.collectionTime).toISOString() : 'N/A'}`);
        console.log(`   locationReportId: "${previousCollection.locationReportId}"`);
        
        const expectedStart = previousCollection.collectionTime || previousCollection.timestamp;
        console.log(`\n   Expected SAS Start Time: ${expectedStart ? new Date(expectedStart).toISOString() : 'N/A'}`);
        console.log(`   Current SAS Start Time: ${problematicCollection.sasMeters?.sasStartTime ? new Date(problematicCollection.sasMeters.sasStartTime).toISOString() : 'N/A'}`);
      } else {
        console.log(`\n❌ No previous collection found!`);
        console.log(`   This explains why the fix script says "No previous collection found"`);
        console.log(`\n🔍 Checking for ANY previous collections for this machineId...`);
        
        const anyPrevious = await Collection.find({
          machineId: problematicCollection.machineId,
          timestamp: { $lt: problematicCollection.timestamp }
        }).sort({ timestamp: -1 }).limit(5).lean();
        
        if (anyPrevious.length > 0) {
          console.log(`\n   Found ${anyPrevious.length} previous collections (regardless of completion status):`);
          anyPrevious.forEach((col, idx) => {
            console.log(`\n   ${idx + 1}. Collection ID: ${col._id}`);
            console.log(`      Timestamp: ${col.timestamp ? new Date(col.timestamp).toISOString() : 'N/A'}`);
            console.log(`      isCompleted: ${col.isCompleted}`);
            console.log(`      locationReportId: "${col.locationReportId || ''}"`);
          });
          
          console.log(`\n   ⚠️  These collections exist but are incomplete (isCompleted: false)`);
          console.log(`      or have no locationReportId. This breaks the collection chain!`);
        } else {
          console.log(`\n   ❌ Absolutely no previous collections exist for this machine`);
          console.log(`      This is the FIRST collection ever for this machine.`);
        }
      }
    } else {
      console.log(`❌ Collection 690d7b53efaede1ec3e85f9f not found`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Run the diagnostic
diagnoseFixedMachine();

