/**
 * Verify Collection History Fix via API
 * 
 * Purpose: Query the cabinet details endpoint to verify collection history
 *          is displayed correctly after fix
 * 
 * Usage: node scripts/verify-fix-via-api.js
 * 
 * @author Aaron Hazzard - Senior Software Engineer
 * @created November 6, 2025
 */

require('dotenv').config();
const axios = require('axios');

const TEST_MACHINE_ID = '69ee59c4b8a19640bd047ce0'; // GM02295
const API_URL = 'http://localhost:32081';

async function verifyFix() {
  try {
    console.log('='.repeat(80));
    console.log('🔍 VERIFYING FIX VIA CABINET DETAILS API');
    console.log('='.repeat(80));
    console.log(`📋 Machine ID: ${TEST_MACHINE_ID} (GM02295)`);
    console.log(`🌐 API URL: ${API_URL}`);
    console.log('');

    // Step 1: Fetch cabinet details
    console.log('🔍 Step 1: Fetching cabinet details...');
    console.log(`   GET ${API_URL}/api/cabinets/${TEST_MACHINE_ID}`);
    
    const cabinetResponse = await axios.get(`${API_URL}/api/cabinets/${TEST_MACHINE_ID}`);
    const cabinet = cabinetResponse.data;

    if (!cabinet) {
      console.error('❌ Cabinet not found');
      process.exit(1);
    }

    console.log(`   ✅ Found cabinet: ${cabinet.serialNumber || cabinet.custom?.name || 'Unknown'}`);
    console.log('');

    // Step 2: Check collection history
    console.log('🔍 Step 2: Checking collection history...');
    const collectionHistory = cabinet.collectionMetersHistory || [];
    
    console.log(`   Total history entries: ${collectionHistory.length}`);
    
    if (collectionHistory.length === 0) {
      console.log('   ℹ️  No collection history found');
      console.log('   This machine has no collections yet.');
      process.exit(0);
    }

    console.log('');
    console.log('   Collection History Entries:');
    console.log('   ' + '-'.repeat(76));
    console.log('   Date                 | Meters In  | Meters Out | Prev In    | Prev Out   ');
    console.log('   ' + '-'.repeat(76));

    collectionHistory.forEach((entry, i) => {
      const date = new Date(entry.timestamp).toISOString().split('T')[0];
      const metersIn = String(entry.metersIn).padEnd(10);
      const metersOut = String(entry.metersOut).padEnd(10);
      const prevIn = String(entry.prevMetersIn !== undefined ? entry.prevMetersIn : 'N/A').padEnd(10);
      const prevOut = String(entry.prevMetersOut !== undefined ? entry.prevMetersOut : 'N/A').padEnd(10);
      
      console.log(`   ${date} | ${metersIn} | ${metersOut} | ${prevIn} | ${prevOut}`);
    });
    console.log('   ' + '-'.repeat(76));
    console.log('');

    // Step 3: Query MongoDB to compare with actual collection documents
    console.log('🔍 Step 3: Comparing with actual collection documents...');
    
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGO_URI);
    
    try {
      await client.connect();
      const db = client.db();
      const collectionsCol = db.collection('collections');

      const collections = await collectionsCol.find({
        machineId: TEST_MACHINE_ID,
        isCompleted: true,
        locationReportId: { $exists: true, $ne: '' }
      }).sort({ timestamp: 1 }).toArray();

      console.log(`   Found ${collections.length} collections in database`);
      console.log('');

      // Compare each history entry with its collection
      let allMatch = true;
      const mismatches = [];

      for (const collection of collections) {
        const historyEntry = collectionHistory.find(
          h => h.locationReportId === collection.locationReportId
        );

        if (historyEntry) {
          const metersInMatch = historyEntry.metersIn === collection.metersIn;
          const metersOutMatch = historyEntry.metersOut === collection.metersOut;
          const prevInMatch = historyEntry.prevMetersIn === (collection.prevIn || 0);
          const prevOutMatch = historyEntry.prevMetersOut === (collection.prevOut || 0);

          if (!metersInMatch || !metersOutMatch || !prevInMatch || !prevOutMatch) {
            allMatch = false;
            mismatches.push({
              locationReportId: collection.locationReportId,
              collection: {
                metersIn: collection.metersIn,
                metersOut: collection.metersOut,
                prevIn: collection.prevIn || 0,
                prevOut: collection.prevOut || 0,
              },
              history: {
                metersIn: historyEntry.metersIn,
                metersOut: historyEntry.metersOut,
                prevMetersIn: historyEntry.prevMetersIn,
                prevMetersOut: historyEntry.prevMetersOut,
              },
              mismatches: {
                metersIn: !metersInMatch,
                metersOut: !metersOutMatch,
                prevIn: !prevInMatch,
                prevOut: !prevOutMatch,
              },
            });
          }
        }
      }

      await client.close();

      // Step 4: Report results
      console.log('='.repeat(80));
      console.log('📊 VERIFICATION RESULTS');
      console.log('='.repeat(80));
      
      if (allMatch) {
        console.log('✅ SUCCESS! All collection history entries match collection documents');
        console.log('');
        console.log('   The fix-report API is working correctly!');
        console.log('   - All metersIn/metersOut values match');
        console.log('   - All prevMetersIn/prevMetersOut values match');
      } else {
        console.log('❌ MISMATCH DETECTED! Some history entries do not match collections');
        console.log('');
        console.log(`   Found ${mismatches.length} mismatch(es):`);
        console.log('');

        mismatches.forEach((mismatch, i) => {
          console.log(`   Mismatch ${i + 1}: Report ${mismatch.locationReportId.substring(0, 8)}...`);
          if (mismatch.mismatches.metersIn) {
            console.log(`      ❌ metersIn: Collection=${mismatch.collection.metersIn}, History=${mismatch.history.metersIn}`);
          }
          if (mismatch.mismatches.metersOut) {
            console.log(`      ❌ metersOut: Collection=${mismatch.collection.metersOut}, History=${mismatch.history.metersOut}`);
          }
          if (mismatch.mismatches.prevIn) {
            console.log(`      ❌ prevIn: Collection=${mismatch.collection.prevIn}, History=${mismatch.history.prevMetersIn}`);
          }
          if (mismatch.mismatches.prevOut) {
            console.log(`      ❌ prevOut: Collection=${mismatch.collection.prevOut}, History=${mismatch.history.prevMetersOut}`);
          }
          console.log('');
        });

        console.log('🔧 The fix-report API may need further debugging');
      }

      console.log('='.repeat(80));

    } catch (dbError) {
      console.error('❌ Error querying database:', dbError);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error during verification:', error.response?.data || error.message);
    process.exit(1);
  }
}

verifyFix();

