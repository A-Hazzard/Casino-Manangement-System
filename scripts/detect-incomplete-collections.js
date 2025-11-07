/**
 * Script to detect incomplete collections in the database
 * Shows collections that have isCompleted: false and empty locationReportId
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

// MongoDB connection URI
const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Collection Schema
const collectionSchema = new mongoose.Schema(
  {},
  { strict: false, collection: 'collections' }
);
const Collection = mongoose.model('Collection', collectionSchema);

async function detectIncompleteCollections() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all incomplete collections
    // NOTE: An incomplete collection can still have a locationReportId if the report creation failed
    // after the locationReportId was assigned but before the report was successfully created
    const incompleteCollections = await Collection.find({
      isCompleted: false,
      // REMOVED locationReportId: '' filter - collections can be incomplete even with a locationReportId
    }).lean();

    console.log(
      `📊 Found ${incompleteCollections.length} incomplete collections\n`
    );

    if (incompleteCollections.length === 0) {
      console.log(
        '✅ No incomplete collections found. All collections are completed.'
      );
      return;
    }

    // Group by location
    const byLocation = {};
    incompleteCollections.forEach(col => {
      const loc = col.location || 'Unknown';
      if (!byLocation[loc]) {
        byLocation[loc] = [];
      }
      byLocation[loc].push(col);
    });

    // Display results
    console.log('📋 Incomplete Collections by Location:\n');
    Object.keys(byLocation).forEach(location => {
      console.log(`\n📍 Location: ${location}`);
      console.log(`   Collections: ${byLocation[location].length}`);

      byLocation[location].forEach((col, idx) => {
        console.log(`\n   ${idx + 1}. Collection ID: ${col._id}`);
        console.log(`      Machine ID: ${col.machineId || 'N/A'}`);
        console.log(`      Machine Name: ${col.machineName || 'N/A'}`);
        console.log(
          `      Timestamp: ${col.timestamp ? new Date(col.timestamp).toISOString() : 'N/A'}`
        );
        console.log(
          `      Collection Time: ${col.collectionTime ? new Date(col.collectionTime).toISOString() : 'N/A'}`
        );
        console.log(`      Meters In: ${col.metersIn || 'N/A'}`);
        console.log(`      Meters Out: ${col.metersOut || 'N/A'}`);
        console.log(`      isCompleted: ${col.isCompleted}`);
        console.log(`      locationReportId: "${col.locationReportId}"`);
      });
    });

    console.log('\n' + '='.repeat(80));
    console.log('📊 Summary:');
    console.log('='.repeat(80));
    console.log(
      `Total Incomplete Collections: ${incompleteCollections.length}`
    );
    console.log(
      `Locations with Incomplete Collections: ${Object.keys(byLocation).length}`
    );

    Object.keys(byLocation).forEach(location => {
      console.log(
        `  - ${location}: ${byLocation[location].length} collections`
      );
    });
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Run the detection
detectIncompleteCollections();
