/**
 * Location Icons Investigation Script
 *
 * This script investigates why a specific location doesn't have any icons displayed.
 *
 * Usage: node test/investigate-location-icons.js <locationId>
 * Example: node test/investigate-location-icons.js f76cb3a66b440cfcadb08c2a
 *
 * Icons are determined by:
 * 1. SMIB Icon: Shows if hasSmib === true OR noSMIBLocation !== true
 * 2. Local Server Icon: Shows if isLocalServer === true
 * 3. Membership Icon: Shows if membershipEnabled === true OR enableMembership === true
 * 4. Missing Coordinates Icon: Shows if coordinates are missing
 */

// Load environment variables
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: '.env.local' });
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: '.env' });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { MongoClient } = require('mongodb');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function investigateLocation(locationId) {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔍 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const locationsCollection = db.collection('gaminglocations');
    const machinesCollection = db.collection('machines');

    console.log(`📋 Investigating Location: ${locationId}\n`);
    console.log('='.repeat(80));

    // ============================================================================
    // STEP 1: Fetch raw location document from database
    // ============================================================================
    console.log('\n📄 STEP 1: Raw Location Document from Database');
    console.log('-'.repeat(80));

    const location = await locationsCollection.findOne({ _id: locationId });

    if (!location) {
      console.error(`❌ Location with ID ${locationId} not found in database`);
      await client.close();
      process.exit(1);
    }

    console.log('Location Name:', location.name || 'N/A');
    console.log('Location ID:', location._id);
    console.log('\n--- Raw Location Fields ---');
    console.log(
      'isLocalServer:',
      location.isLocalServer,
      `(type: ${typeof location.isLocalServer})`
    );
    console.log(
      'noSMIBLocation:',
      location.noSMIBLocation,
      `(type: ${typeof location.noSMIBLocation})`
    );
    console.log(
      'membershipEnabled:',
      location.membershipEnabled,
      `(type: ${typeof location.membershipEnabled})`
    );
    console.log(
      'enableMembership:',
      location.enableMembership,
      `(type: ${typeof location.enableMembership})`
    );
    console.log('geoCoords:', JSON.stringify(location.geoCoords, null, 2));

    // ============================================================================
    // STEP 2: Check machines for this location
    // ============================================================================
    console.log('\n\n🔧 STEP 2: Machines Associated with Location');
    console.log('-'.repeat(80));

    const machines = await machinesCollection
      .find({ gamingLocation: locationId })
      .toArray();
    console.log(`Total Machines: ${machines.length}`);

    if (machines.length > 0) {
      const sasMachines = machines.filter(m => m.isSasMachine === true);
      const nonSasMachines = machines.filter(
        m => m.isSasMachine === false || m.isSasMachine === undefined
      );

      console.log(`SAS Machines (SMIB): ${sasMachines.length}`);
      console.log(`Non-SAS Machines: ${nonSasMachines.length}`);

      // Check for machines with SMIB ID
      const machinesWithSmibId = machines.filter(
        m => m.smibId || m.smib || m.smibIdString
      );
      console.log(`Machines with SMIB ID: ${machinesWithSmibId.length}`);

      if (machinesWithSmibId.length > 0) {
        console.log('\nSample SMIB IDs:');
        machinesWithSmibId.slice(0, 3).forEach((m, i) => {
          console.log(
            `  ${i + 1}. Machine ${m._id}: smibId=${m.smibId || m.smib || m.smibIdString || 'N/A'}`
          );
        });
      }
    } else {
      console.log('⚠️  No machines found for this location');
    }

    // ============================================================================
    // STEP 3: Calculate aggregated fields (as done in locationAggregation.ts)
    // ============================================================================
    console.log('\n\n📊 STEP 3: Calculated Aggregated Fields');
    console.log('-'.repeat(80));

    const sasMachines = machines.filter(m => m.isSasMachine === true);
    const sasMachinesCount = sasMachines.length;

    const calculatedFields = {
      hasSmib: sasMachinesCount > 0,
      noSMIBLocation: sasMachinesCount === 0,
      isLocalServer: location.isLocalServer || false,
      membershipEnabled: location.membershipEnabled || false,
      enableMembership: location.enableMembership || false,
    };

    console.log('Calculated Values (as per locationAggregation.ts):');
    console.log(
      '  hasSmib:',
      calculatedFields.hasSmib,
      `(sasMachines > 0: ${sasMachinesCount} > 0)`
    );
    console.log(
      '  noSMIBLocation:',
      calculatedFields.noSMIBLocation,
      `(sasMachines === 0: ${sasMachinesCount} === 0)`
    );
    console.log(
      '  isLocalServer:',
      calculatedFields.isLocalServer,
      `(location.isLocalServer || false)`
    );
    console.log(
      '  membershipEnabled:',
      calculatedFields.membershipEnabled,
      `(location.membershipEnabled || false)`
    );
    console.log(
      '  enableMembership:',
      calculatedFields.enableMembership,
      `(location.enableMembership)`
    );

    // ============================================================================
    // STEP 4: Icon Display Logic Analysis
    // ============================================================================
    console.log('\n\n🎨 STEP 4: Icon Display Logic Analysis');
    console.log('-'.repeat(80));

    // SMIB Icon Logic
    const shouldShowSmibIcon = Boolean(
      calculatedFields.hasSmib || !calculatedFields.noSMIBLocation
    );
    console.log('\n1. SMIB Icon:');
    console.log(`   Condition: hasSmib === true OR noSMIBLocation !== true`);
    console.log(`   hasSmib: ${calculatedFields.hasSmib}`);
    console.log(`   !noSMIBLocation: ${!calculatedFields.noSMIBLocation}`);
    console.log(`   Result: ${shouldShowSmibIcon ? '✅ SHOW' : '❌ HIDE'}`);

    // Local Server Icon Logic
    const shouldShowLocalServerIcon = Boolean(calculatedFields.isLocalServer);
    console.log('\n2. Local Server Icon:');
    console.log(`   Condition: isLocalServer === true`);
    console.log(`   isLocalServer: ${calculatedFields.isLocalServer}`);
    console.log(
      `   Result: ${shouldShowLocalServerIcon ? '✅ SHOW' : '❌ HIDE'}`
    );

    // Membership Icon Logic
    const shouldShowMembershipIcon = Boolean(
      calculatedFields.membershipEnabled || calculatedFields.enableMembership
    );
    console.log('\n3. Membership Icon:');
    console.log(
      `   Condition: membershipEnabled === true OR enableMembership === true`
    );
    console.log(`   membershipEnabled: ${calculatedFields.membershipEnabled}`);
    console.log(`   enableMembership: ${calculatedFields.enableMembership}`);
    console.log(
      `   Result: ${shouldShowMembershipIcon ? '✅ SHOW' : '❌ HIDE'}`
    );

    // Missing Coordinates Icon Logic
    const hasMissingCoords =
      !location.geoCoords ||
      !location.geoCoords.latitude ||
      (!location.geoCoords.longitude && !location.geoCoords.longtitude);
    const shouldShowMissingCoordsIcon = hasMissingCoords;
    console.log('\n4. Missing Coordinates Icon:');
    console.log(`   Condition: geoCoords missing or invalid`);
    console.log(`   geoCoords exists: ${!!location.geoCoords}`);
    if (location.geoCoords) {
      console.log(`   latitude: ${location.geoCoords.latitude || 'missing'}`);
      console.log(
        `   longitude: ${location.geoCoords.longitude || location.geoCoords.longtitude || 'missing'}`
      );
    }
    console.log(
      `   Result: ${shouldShowMissingCoordsIcon ? '✅ SHOW' : '❌ HIDE'}`
    );

    // ============================================================================
    // STEP 5: Summary and Recommendations
    // ============================================================================
    console.log('\n\n📝 STEP 5: Summary');
    console.log('='.repeat(80));

    const totalIcons = [
      shouldShowSmibIcon,
      shouldShowLocalServerIcon,
      shouldShowMembershipIcon,
      shouldShowMissingCoordsIcon,
    ].filter(Boolean).length;

    console.log(`\nTotal Icons That Should Display: ${totalIcons}`);

    if (totalIcons === 0) {
      console.log(
        '\n❌ NO ICONS WILL DISPLAY - This is why the location appears without icons.\n'
      );
      console.log('Reason Breakdown:');
      console.log(
        `  • SMIB: ${calculatedFields.hasSmib ? 'Has SMIB' : 'No SMIB machines (sasMachines = 0)'}`
      );
      console.log(
        `  • Local Server: ${calculatedFields.isLocalServer ? 'Is local server' : 'Not a local server'}`
      );
      console.log(
        `  • Membership: ${calculatedFields.membershipEnabled || calculatedFields.enableMembership ? 'Enabled' : 'Not enabled'}`
      );
      console.log(
        `  • Coordinates: ${hasMissingCoords ? 'Missing' : 'Present'}`
      );

      console.log('\n💡 To Fix (if needed):');
      if (!calculatedFields.hasSmib && machines.length > 0) {
        console.log(
          '  • Check if machines should be marked as SAS machines (isSasMachine = true)'
        );
        console.log(
          '  • Verify machines have SMIB IDs if they should be SMIB machines'
        );
      }
      if (!calculatedFields.isLocalServer) {
        console.log(
          '  • Set isLocalServer = true in location document if this is a local server'
        );
      }
      if (
        !calculatedFields.membershipEnabled &&
        !calculatedFields.enableMembership
      ) {
        console.log(
          '  • Set membershipEnabled = true or enableMembership = true if membership should be enabled'
        );
      }
    } else {
      console.log(
        `\n✅ ${totalIcons} icon(s) should display. If they don't, check frontend rendering logic.`
      );
    }

    // ============================================================================
    // STEP 6: Field Comparison Table
    // ============================================================================
    console.log('\n\n📋 STEP 6: Field Comparison Table');
    console.log('='.repeat(80));
    console.log(
      '\nField Name              | Database Value | Calculated | Used for Icon'
    );
    console.log('-'.repeat(80));
    console.log(
      `isLocalServer            | ${String(location.isLocalServer).padEnd(15)} | ${String(calculatedFields.isLocalServer).padEnd(11)} | Local Server Icon`
    );
    console.log(
      `noSMIBLocation (raw)     | ${String(location.noSMIBLocation).padEnd(15)} | ${String(calculatedFields.noSMIBLocation).padEnd(11)} | SMIB Icon (inverse)`
    );
    console.log(
      `hasSmib (calculated)     | N/A            | ${String(calculatedFields.hasSmib).padEnd(11)} | SMIB Icon`
    );
    console.log(
      `membershipEnabled        | ${String(location.membershipEnabled).padEnd(15)} | ${String(calculatedFields.membershipEnabled).padEnd(11)} | Membership Icon`
    );
    console.log(
      `enableMembership         | ${String(location.enableMembership).padEnd(15)} | ${String(calculatedFields.enableMembership).padEnd(11)} | Membership Icon`
    );
    console.log(
      `geoCoords.latitude       | ${location.geoCoords?.latitude || 'missing'} | ${hasMissingCoords ? 'missing' : 'present'} | Missing Coords Icon`
    );

    await client.close();
    console.log('\n✅ Investigation complete. Database disconnected.\n');
  } catch (error) {
    console.error('❌ Error during investigation:', error);
    await client.close();
    process.exit(1);
  }
}

// Get location ID from command line arguments
const locationId = process.argv[2];

if (!locationId) {
  console.error('❌ Please provide a location ID as an argument');
  console.error('Usage: node test/investigate-location-icons.js <locationId>');
  console.error(
    'Example: node test/investigate-location-icons.js f76cb3a66b440cfcadb08c2a'
  );
  process.exit(1);
}

investigateLocation(locationId);
