/**
 * Script to validate test data integrity
 * Checks for orphaned machines, missing meters, missing licensees, etc.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in environment variables');
  process.exit(1);
}

async function validateTestData() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // =====================================================
    // CHECK LICENSEES
    // =====================================================
    console.log('='.repeat(80));
    console.log('LICENSEES CHECK');
    console.log('='.repeat(80) + '\n');

    const licensees = await mongoose.connection.db
      .collection('licencees')
      .find({})
      .toArray();

    console.log(`📊 Total Licensees: ${licensees.length}\n`);

    const requiredLicensees = ['TTG', 'Kibana', 'Bobbittos'];
    const existingLicenseeNames = licensees.map(l => l.name);

    console.log('Required Licensees:');
    requiredLicensees.forEach(name => {
      const exists = existingLicenseeNames.includes(name);
      console.log(`  ${exists ? '✅' : '❌'} ${name}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });

    licensees.forEach(lic => {
      console.log(`\n  ${lic.name}:`);
      console.log(`    ID: ${lic._id}`);
      console.log(`    ID Type: ${typeof lic._id}`);
    });

    // =====================================================
    // CHECK TEST LOCATIONS
    // =====================================================
    console.log('\n' + '='.repeat(80));
    console.log('TEST LOCATIONS CHECK');
    console.log('='.repeat(80) + '\n');

    const testLocations = await mongoose.connection.db
      .collection('gaminglocations')
      .find({ name: /^Test-/i })
      .toArray();

    console.log(`📊 Total Test Locations: ${testLocations.length}\n`);

    // Group by licensee
    const locationsByLicensee = {};
    let locationsWithoutLicensee = 0;

    testLocations.forEach(loc => {
      const licenseeId = loc.rel?.licencee;
      if (!licenseeId) {
        locationsWithoutLicensee++;
      } else {
        const licensee = licensees.find(l => String(l._id) === String(licenseeId));
        const licenseeName = licensee ? licensee.name : 'UNKNOWN';
        if (!locationsByLicensee[licenseeName]) {
          locationsByLicensee[licenseeName] = [];
        }
        locationsByLicensee[licenseeName].push(loc);
      }
    });

    console.log('Test Locations by Licensee:');
    Object.keys(locationsByLicensee).sort().forEach(licensee => {
      console.log(`  ${licensee}: ${locationsByLicensee[licensee].length} locations`);
    });

    if (locationsWithoutLicensee > 0) {
      console.log(`\n❌ ISSUE: ${locationsWithoutLicensee} locations without licensee!`);
    } else {
      console.log(`\n✅ All test locations have licensees assigned`);
    }

    // =====================================================
    // CHECK TEST MACHINES
    // =====================================================
    console.log('\n' + '='.repeat(80));
    console.log('TEST MACHINES CHECK');
    console.log('='.repeat(80) + '\n');

    const testLocationIds = testLocations.map(loc => loc._id);
    const testMachines = await mongoose.connection.db
      .collection('machines')
      .find({ gamingLocation: { $in: testLocationIds } })
      .toArray();

    console.log(`📊 Total Test Machines: ${testMachines.length}\n`);

    // Check for machines without locations
    const machinesWithoutLocation = testMachines.filter(m => !m.gamingLocation);
    console.log(`Machines without location: ${machinesWithoutLocation.length}`);

    if (machinesWithoutLocation.length > 0) {
      console.log('❌ ISSUE: Found machines without locations:');
      machinesWithoutLocation.forEach(m => {
        console.log(`  - ${m.serialNumber} (ID: ${m._id})`);
      });
    } else {
      console.log('✅ All test machines have locations assigned');
    }

    // Check ID types
    const objectIdMachines = testMachines.filter(m => typeof m._id !== 'string');
    if (objectIdMachines.length > 0) {
      console.log(`\n❌ ISSUE: ${objectIdMachines.length} machines have ObjectId instead of string!`);
    } else {
      console.log(`\n✅ All test machines use string IDs`);
    }

    // Machines per location distribution
    const machinesByLocation = {};
    testMachines.forEach(machine => {
      const locId = machine.gamingLocation;
      if (!machinesByLocation[locId]) {
        machinesByLocation[locId] = [];
      }
      machinesByLocation[locId].push(machine);
    });

    const machineCounts = Object.values(machinesByLocation).map(machines => machines.length);
    const avgMachines = Math.round(machineCounts.reduce((a, b) => a + b, 0) / machineCounts.length);
    const minMachines = Math.min(...machineCounts);
    const maxMachines = Math.max(...machineCounts);

    console.log('\nMachine Distribution:');
    console.log(`  Average per location: ${avgMachines}`);
    console.log(`  Min per location: ${minMachines}`);
    console.log(`  Max per location: ${maxMachines}`);

    // Check machines per licensee
    console.log('\nMachines by Licensee:');
    Object.keys(locationsByLicensee).sort().forEach(licensee => {
      const locations = locationsByLicensee[licensee];
      const locationIds = locations.map(l => l._id);
      const machines = testMachines.filter(m => locationIds.includes(m.gamingLocation));
      console.log(`  ${licensee}: ${machines.length} machines across ${locations.length} locations`);
    });

    // =====================================================
    // CHECK METER READINGS
    // =====================================================
    console.log('\n' + '='.repeat(80));
    console.log('METER READINGS CHECK');
    console.log('='.repeat(80) + '\n');

    const testMachineIds = testMachines.map(m => m._id);
    const meters = await mongoose.connection.db
      .collection('meters')
      .find({ machine: { $in: testMachineIds } })
      .toArray();

    console.log(`📊 Total Meter Readings for Test Machines: ${meters.length}\n`);

    // Check for machines without meters
    const machinesWithMeters = new Set(meters.map(m => m.machine));
    const machinesWithoutMeters = testMachines.filter(
      m => !machinesWithMeters.has(m._id)
    );

    console.log(`Machines with meters: ${machinesWithMeters.size}`);
    console.log(`Machines without meters: ${machinesWithoutMeters.length}`);

    if (machinesWithoutMeters.length > 0) {
      console.log('\n❌ ISSUE: Some machines missing meter readings:');
      machinesWithoutMeters.slice(0, 10).forEach(m => {
        console.log(`  - ${m.serialNumber} (ID: ${m._id})`);
      });
      if (machinesWithoutMeters.length > 10) {
        console.log(`  ... and ${machinesWithoutMeters.length - 10} more`);
      }
    } else {
      console.log('\n✅ All test machines have meter readings');
    }

    // Check meter ID types
    const objectIdMeters = meters.filter(m => typeof m._id !== 'string');
    if (objectIdMeters.length > 0) {
      console.log(`\n❌ ISSUE: ${objectIdMeters.length} meters have ObjectId instead of string!`);
    } else {
      console.log(`\n✅ All meter readings use string IDs`);
    }

    // =====================================================
    // FINAL SUMMARY
    // =====================================================
    console.log('\n' + '='.repeat(80));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(80) + '\n');

    const issues = [];

    if (locationsWithoutLicensee > 0) issues.push(`${locationsWithoutLicensee} locations without licensee`);
    if (machinesWithoutLocation.length > 0) issues.push(`${machinesWithoutLocation.length} machines without location`);
    if (machinesWithoutMeters.length > 0) issues.push(`${machinesWithoutMeters.length} machines without meters`);
    if (objectIdMachines.length > 0) issues.push(`${objectIdMachines.length} machines with ObjectId`);
    if (objectIdMeters.length > 0) issues.push(`${objectIdMeters.length} meters with ObjectId`);

    if (issues.length > 0) {
      console.log('❌ ISSUES FOUND:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log('✅ ALL CHECKS PASSED!');
      console.log('\nData Integrity:');
      console.log('  ✅ All locations have licensees');
      console.log('  ✅ All machines have locations');
      console.log('  ✅ All machines have meter readings');
      console.log('  ✅ All IDs are strings (no ObjectId casting)');
      console.log('  ✅ Test data is ready for use!');
    }

    console.log('\n📊 Summary:');
    console.log(`  Licensees: ${licensees.length}`);
    console.log(`  Test Locations: ${testLocations.length}`);
    console.log(`  Test Machines: ${testMachines.length}`);
    console.log(`  Meter Readings: ${meters.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Run validation
validateTestData();

