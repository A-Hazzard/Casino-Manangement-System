/**
 * Script to fix locations missing licensee assignments
 * Assigns licensees based on location names
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in environment variables');
  process.exit(1);
}

async function fixMissingLicensees() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all licensees
    const licensees = await mongoose.connection.db
      .collection('licencees')
      .find({})
      .toArray();

    console.log('Available Licensees:');
    licensees.forEach(lic => {
      console.log(`  ${lic.name}: ${lic._id}`);
    });

    // Find locations without licensee
    const locationsWithoutLicensee = await mongoose.connection.db
      .collection('gaminglocations')
      .find({
        name: /^Test-/i,
        $or: [
          { 'rel.licencee': { $exists: false } },
          { 'rel.licencee': null },
          { 'rel.licencee': '' },
        ],
      })
      .toArray();

    console.log(`\n📊 Found ${locationsWithoutLicensee.length} locations without licensee\n`);

    if (locationsWithoutLicensee.length === 0) {
      console.log('✅ No locations need fixing!');
      return;
    }

    // Fix each location based on its name
    let fixed = 0;

    for (const location of locationsWithoutLicensee) {
      // Extract licensee name from location name (e.g., "Test-Kibana-Loc1" -> "Kibana")
      const match = location.name.match(/^Test-([^-]+)-/);
      if (!match) {
        console.warn(`⚠️  Couldn't parse licensee from: ${location.name}`);
        continue;
      }

      const licenseeName = match[1];
      const licensee = licensees.find(l => l.name === licenseeName);

      if (!licensee) {
        console.warn(`⚠️  Licensee "${licenseeName}" not found for location: ${location.name}`);
        continue;
      }

      // Update the location
      await mongoose.connection.db.collection('gaminglocations').updateOne(
        { _id: location._id },
        {
          $set: {
            'rel.licencee': licensee._id, // String ID
            updatedAt: new Date(),
          },
        }
      );

      fixed++;
      console.log(`✅ Fixed: ${location.name} → ${licenseeName} (${licensee._id})`);
    }

    console.log(`\n✅ Fixed ${fixed} locations`);

    // Verify
    const remainingWithoutLicensee = await mongoose.connection.db
      .collection('gaminglocations')
      .countDocuments({
        name: /^Test-/i,
        $or: [
          { 'rel.licencee': { $exists: false } },
          { 'rel.licencee': null },
          { 'rel.licencee': '' },
        ],
      });

    if (remainingWithoutLicensee === 0) {
      console.log('✅ All test locations now have licensees assigned!');
    } else {
      console.log(`❌ Still ${remainingWithoutLicensee} locations without licensee`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Run the fix
fixMissingLicensees();

