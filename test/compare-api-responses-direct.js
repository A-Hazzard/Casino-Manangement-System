/**
 * Compare API Responses Directly
 * 
 * Calls the actual APIs and compares their responses
 * to identify which one is correct
 */

const http = require('http');

const API_BASE = 'http://localhost:3000';

async function fetchAPI(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE);
    url.searchParams.set('timePeriod', 'Yesterday');
    url.searchParams.set('currency', 'USD');
    url.searchParams.set('licencee', 'all');
    url.searchParams.set('clearCache', 'true'); // Force fresh data

    http.get(url.toString(), (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  console.log('🔍 Comparing API Responses Directly\n');
  console.log('⚠️  Make sure the server is running (pnpm start)\n');

  try {
    // Fetch from all three APIs
    console.log('📡 Fetching from /api/reports/locations...');
    const locationsResponse = await fetchAPI('/api/reports/locations');
    const locationsTotal = locationsResponse.data?.reduce((sum, loc) => sum + (loc.moneyIn || 0), 0) || 0;

    console.log('📡 Fetching from /api/locationAggregation...');
    const locationAggResponse = await fetchAPI('/api/locationAggregation');
    const locationAggTotal = locationAggResponse.data?.reduce((sum, loc) => sum + (loc.moneyIn || 0), 0) || 0;

    console.log('📡 Fetching from /api/machines/aggregation...');
    const machinesAggResponse = await fetchAPI('/api/machines/aggregation');
    const machinesAggTotal = machinesAggResponse.data?.reduce((sum, machine) => sum + (machine.moneyIn || 0), 0) || 0;

    console.log('\n📊 RESULTS:\n');
    console.log('='.repeat(80));
    console.log(`Locations API (/api/reports/locations):`);
    console.log(`   Total Money In: $${locationsTotal.toFixed(2)}`);
    console.log(`   Location Count: ${locationsResponse.data?.length || 0}`);
    console.log();
    console.log(`Location Aggregation API (/api/locationAggregation):`);
    console.log(`   Total Money In: $${locationAggTotal.toFixed(2)}`);
    console.log(`   Location Count: ${locationAggResponse.data?.length || 0}`);
    console.log();
    console.log(`Machines Aggregation API (/api/machines/aggregation):`);
    console.log(`   Total Money In: $${machinesAggTotal.toFixed(2)}`);
    console.log(`   Machine Count: ${machinesAggResponse.data?.length || 0}`);
    console.log('='.repeat(80));
    console.log();

    // Compare
    const values = [
      { name: 'Locations API', value: locationsTotal },
      { name: 'Location Aggregation API', value: locationAggTotal },
      { name: 'Machines Aggregation API', value: machinesAggTotal },
    ];

    values.sort((a, b) => a.value - b.value);

    console.log('📈 Sorted by value (lowest to highest):\n');
    values.forEach((v, idx) => {
      console.log(`   ${idx + 1}. ${v.name.padEnd(35)} $${v.value.toFixed(2)}`);
    });
    console.log();

    // Check if they match
    const allMatch = values.every(v => Math.abs(v.value - values[0].value) < 0.01);
    if (allMatch) {
      console.log('✅ All APIs return the same total!\n');
    } else {
      console.log('⚠️  APIs return different totals!\n');
      const diff = values[values.length - 1].value - values[0].value;
      console.log(`   Difference: $${diff.toFixed(2)}`);
      console.log(`   Percentage difference: ${((diff / values[0].value) * 100).toFixed(2)}%\n`);
    }

    // Show location counts
    console.log('📍 Location Counts:\n');
    console.log(`   Locations API: ${locationsResponse.data?.length || 0} locations`);
    console.log(`   Location Aggregation API: ${locationAggResponse.data?.length || 0} locations`);
    console.log();

    // If there's a difference, show which locations are in one but not the other
    if (Math.abs(locationAggTotal - locationsTotal) > 0.01) {
      const locationsIds = new Set((locationsResponse.data || []).map(loc => loc._id || loc.id));
      const locationAggIds = new Set((locationAggResponse.data || []).map(loc => loc._id || loc.id));

      const onlyInLocations = Array.from(locationsIds).filter(id => !locationAggIds.has(id));
      const onlyInLocationAgg = Array.from(locationAggIds).filter(id => !locationsIds.has(id));

      if (onlyInLocations.length > 0) {
        console.log(`⚠️  ${onlyInLocations.length} locations only in Locations API:\n`);
        onlyInLocations.slice(0, 5).forEach(id => {
          const loc = locationsResponse.data.find(l => (l._id || l.id) === id);
          console.log(`   - ${loc?.name || id}: $${(loc?.moneyIn || 0).toFixed(2)}`);
        });
        if (onlyInLocations.length > 5) {
          console.log(`   ... and ${onlyInLocations.length - 5} more\n`);
        }
      }

      if (onlyInLocationAgg.length > 0) {
        console.log(`⚠️  ${onlyInLocationAgg.length} locations only in Location Aggregation API:\n`);
        onlyInLocationAgg.slice(0, 5).forEach(id => {
          const loc = locationAggResponse.data.find(l => (l._id || l.id) === id);
          console.log(`   - ${loc?.name || id}: $${(loc?.moneyIn || 0).toFixed(2)}`);
        });
        if (onlyInLocationAgg.length > 5) {
          console.log(`   ... and ${onlyInLocationAgg.length - 5} more\n`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure the server is running: pnpm start');
    }
  }
}

main();

