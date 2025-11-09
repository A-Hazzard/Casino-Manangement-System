/**
 * Script to analyze existing locations and machines to understand naming patterns
 * This will help us create realistic test data that matches production patterns
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

// MongoDB connection URI
const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in environment variables');
  process.exit(1);
}

// Schemas
const locationSchema = new mongoose.Schema({}, { strict: false, collection: 'gaminglocations' });
const machineSchema = new mongoose.Schema({}, { strict: false, collection: 'machines' });
const licenseeSchema = new mongoose.Schema({}, { strict: false, collection: 'licencees' }); // British spelling

const Location = mongoose.model('GamingLocation', locationSchema);
const Machine = mongoose.model('Machine', machineSchema);
const Licensee = mongoose.model('Licensee', licenseeSchema);

async function analyzePatterns() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // =====================================================
    // ANALYZE LICENSEES
    // =====================================================
    console.log('='.repeat(80));
    console.log('LICENSEES ANALYSIS');
    console.log('='.repeat(80) + '\n');

    const licensees = await Licensee.find({}).lean();
    console.log(`📊 Total Licensees: ${licensees.length}\n`);

    if (licensees.length > 0) {
      console.log('📋 Existing Licensees:');
      licensees.forEach((lic, idx) => {
        console.log(`\n${idx + 1}. Licensee ID: ${lic._id}`);
        console.log(`   Name: ${lic.name || 'N/A'}`);
        console.log(`   Display Name: ${lic.displayName || 'N/A'}`);
        console.log(`   Code: ${lic.code || 'N/A'}`);
        console.log(`   Active: ${lic.active !== undefined ? lic.active : 'N/A'}`);
      });
    }

    // =====================================================
    // ANALYZE LOCATIONS
    // =====================================================
    console.log('\n' + '='.repeat(80));
    console.log('LOCATIONS ANALYSIS');
    console.log('='.repeat(80) + '\n');

    const locations = await Location.find({}).lean();
    console.log(`📊 Total Locations: ${locations.length}\n`);

    // Group locations by licensee
    const locationsByLicensee = {};
    locations.forEach(loc => {
      const licensee = loc.rel?.licencee || 'Unknown';
      if (!locationsByLicensee[licensee]) {
        locationsByLicensee[licensee] = [];
      }
      locationsByLicensee[licensee].push(loc);
    });

    console.log('📋 Locations by Licensee:');
    Object.keys(locationsByLicensee).forEach(licensee => {
      console.log(`\n📍 ${licensee}: ${locationsByLicensee[licensee].length} locations`);
      
      // Show first 5 examples
      const examples = locationsByLicensee[licensee].slice(0, 5);
      examples.forEach((loc, idx) => {
        console.log(`   ${idx + 1}. ${loc.name || 'N/A'} (ID: ${loc._id})`);
        console.log(`      Address: ${loc.address || 'N/A'}`);
        console.log(`      SAS Enabled: ${loc.sasEnabled || false}`);
        console.log(`      Profit Share: ${loc.profitShare || 'N/A'}`);
      });
      
      if (locationsByLicensee[licensee].length > 5) {
        console.log(`   ... and ${locationsByLicensee[licensee].length - 5} more`);
      }
    });

    // Analyze naming patterns
    console.log('\n' + '='.repeat(80));
    console.log('LOCATION NAMING PATTERNS');
    console.log('='.repeat(80) + '\n');

    const namePatterns = {
      hasNumbers: 0,
      hasSpecialChars: 0,
      avgLength: 0,
      uniqueWords: new Set(),
    };

    locations.forEach(loc => {
      const name = loc.name || '';
      if (/\d/.test(name)) namePatterns.hasNumbers++;
      if (/[^a-zA-Z0-9\s]/.test(name)) namePatterns.hasSpecialChars++;
      namePatterns.avgLength += name.length;
      
      // Extract words
      name.split(/\s+/).forEach(word => {
        if (word.length > 2) namePatterns.uniqueWords.add(word.toLowerCase());
      });
    });

    namePatterns.avgLength = Math.round(namePatterns.avgLength / locations.length);

    console.log(`Names with numbers: ${namePatterns.hasNumbers} (${Math.round(namePatterns.hasNumbers / locations.length * 100)}%)`);
    console.log(`Names with special chars: ${namePatterns.hasSpecialChars} (${Math.round(namePatterns.hasSpecialChars / locations.length * 100)}%)`);
    console.log(`Average name length: ${namePatterns.avgLength} characters`);
    console.log(`Unique words used: ${namePatterns.uniqueWords.size}`);
    
    // Sample common words
    const commonWords = Array.from(namePatterns.uniqueWords).slice(0, 20);
    console.log(`\nSample words: ${commonWords.join(', ')}`);

    // =====================================================
    // ANALYZE MACHINES
    // =====================================================
    console.log('\n' + '='.repeat(80));
    console.log('MACHINES ANALYSIS');
    console.log('='.repeat(80) + '\n');

    const machines = await Machine.find({}).lean();
    console.log(`📊 Total Machines: ${machines.length}\n`);

    // Group machines by location
    const machinesByLocation = {};
    machines.forEach(machine => {
      const locationId = machine.gamingLocation || 'Unknown';
      if (!machinesByLocation[locationId]) {
        machinesByLocation[locationId] = [];
      }
      machinesByLocation[locationId].push(machine);
    });

    console.log('📋 Machine Distribution by Location:');
    const locationMachineCounts = Object.entries(machinesByLocation)
      .map(([locId, machines]) => ({ locId, count: machines.length }))
      .sort((a, b) => b.count - a.count);

    // Show top 10 locations by machine count
    console.log('\nTop 10 locations by machine count:');
    locationMachineCounts.slice(0, 10).forEach((item, idx) => {
      const location = locations.find(l => String(l._id) === item.locId);
      console.log(`${idx + 1}. ${location?.name || item.locId}: ${item.count} machines`);
    });

    // Statistics
    const counts = locationMachineCounts.map(l => l.count);
    const avgMachinesPerLocation = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);
    const minMachines = Math.min(...counts);
    const maxMachines = Math.max(...counts);

    console.log(`\nStatistics:`);
    console.log(`  Average machines per location: ${avgMachinesPerLocation}`);
    console.log(`  Min machines: ${minMachines}`);
    console.log(`  Max machines: ${maxMachines}`);

    // Analyze machine naming patterns
    console.log('\n' + '='.repeat(80));
    console.log('MACHINE NAMING PATTERNS');
    console.log('='.repeat(80) + '\n');

    const serialPatterns = {
      startsWith_GM: 0,
      startsWith_GMID: 0,
      startsWith_TTRHP: 0,
      numeric: 0,
      other: 0,
    };

    const gameNames = new Set();
    const customNames = new Set();

    machines.forEach(machine => {
      const serial = machine.serialNumber || '';
      
      if (serial.startsWith('GMID')) serialPatterns.startsWith_GMID++;
      else if (serial.startsWith('GM')) serialPatterns.startsWith_GM++;
      else if (serial.startsWith('TTRHP')) serialPatterns.startsWith_TTRHP++;
      else if (/^\d+$/.test(serial)) serialPatterns.numeric++;
      else serialPatterns.other++;

      if (machine.game) gameNames.add(machine.game);
      if (machine.custom?.name) customNames.add(machine.custom.name);
    });

    console.log('Serial Number Patterns:');
    console.log(`  GM* prefix: ${serialPatterns.startsWith_GM} (${Math.round(serialPatterns.startsWith_GM / machines.length * 100)}%)`);
    console.log(`  GMID* prefix: ${serialPatterns.startsWith_GMID} (${Math.round(serialPatterns.startsWith_GMID / machines.length * 100)}%)`);
    console.log(`  TTRHP* prefix: ${serialPatterns.startsWith_TTRHP} (${Math.round(serialPatterns.startsWith_TTRHP / machines.length * 100)}%)`);
    console.log(`  Numeric only: ${serialPatterns.numeric} (${Math.round(serialPatterns.numeric / machines.length * 100)}%)`);
    console.log(`  Other: ${serialPatterns.other} (${Math.round(serialPatterns.other / machines.length * 100)}%)`);

    console.log(`\nUnique Games: ${gameNames.size}`);
    console.log(`Sample games: ${Array.from(gameNames).slice(0, 10).join(', ')}`);

    console.log(`\nUnique Custom Names: ${customNames.size}`);
    console.log(`Sample custom names: ${Array.from(customNames).slice(0, 10).join(', ')}`);

    // Show examples of each pattern
    console.log('\n📋 Example Machines:');
    
    const gmExample = machines.find(m => m.serialNumber?.startsWith('GM') && !m.serialNumber?.startsWith('GMID'));
    if (gmExample) {
      console.log(`\nGM* Pattern:`);
      console.log(`  Serial: ${gmExample.serialNumber}`);
      console.log(`  Custom Name: ${gmExample.custom?.name || 'N/A'}`);
      console.log(`  Game: ${gmExample.game || 'N/A'}`);
    }

    const gmidExample = machines.find(m => m.serialNumber?.startsWith('GMID'));
    if (gmidExample) {
      console.log(`\nGMID* Pattern:`);
      console.log(`  Serial: ${gmidExample.serialNumber}`);
      console.log(`  Custom Name: ${gmidExample.custom?.name || 'N/A'}`);
      console.log(`  Game: ${gmidExample.game || 'N/A'}`);
    }

    const ttrhpExample = machines.find(m => m.serialNumber?.startsWith('TTRHP'));
    if (ttrhpExample) {
      console.log(`\nTTRHP* Pattern:`);
      console.log(`  Serial: ${ttrhpExample.serialNumber}`);
      console.log(`  Custom Name: ${ttrhpExample.custom?.name || 'N/A'}`);
      console.log(`  Game: ${ttrhpExample.game || 'N/A'}`);
    }

    const numericExample = machines.find(m => /^\d+$/.test(m.serialNumber || ''));
    if (numericExample) {
      console.log(`\nNumeric Pattern:`);
      console.log(`  Serial: ${numericExample.serialNumber}`);
      console.log(`  Custom Name: ${numericExample.custom?.name || 'N/A'}`);
      console.log(`  Game: ${numericExample.game || 'N/A'}`);
    }

    // =====================================================
    // SUMMARY & RECOMMENDATIONS
    // =====================================================
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY & RECOMMENDATIONS FOR TEST DATA GENERATION');
    console.log('='.repeat(80) + '\n');

    console.log('Current State:');
    console.log(`  ✅ ${licensees.length} licensees exist`);
    console.log(`  ✅ ${locations.length} locations exist`);
    console.log(`  ✅ ${machines.length} machines exist`);
    console.log(`  📊 Average ${avgMachinesPerLocation} machines per location`);

    console.log('\nTo reach 100+ locations with 100 machines each:');
    const neededLocations = Math.max(0, 100 - locations.length);
    const neededMachines = (100 * 100) - machines.length;
    
    console.log(`  📍 Need to create: ${neededLocations} locations`);
    console.log(`  🎰 Need to create: ~${neededMachines} machines`);

    console.log('\nRecommended Naming Patterns:');
    console.log('  Locations: Use existing patterns like location names found above');
    console.log('  Machine Serials: Mix of GM*, GMID*, TTRHP*, and numeric patterns');
    console.log('  Machine Games: Use existing game names from database');

    console.log('\nLicensees to ensure have locations:');
    console.log('  ✅ TTG');
    console.log('  ✅ Kibana');
    console.log('  ✅ Bobbittos');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Run the analysis
analyzePatterns();

