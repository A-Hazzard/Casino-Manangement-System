/**
 * Investigate Reports Page - SAS Evaluation Tab
 * Tests location data, machine hourly data, and top machines
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function investigateSASEvaluation() {
  console.log(
    '╔══════════════════════════════════════════════════════════════╗'
  );
  console.log(
    '║     REPORTS PAGE - SAS EVALUATION TAB INVESTIGATION          ║'
  );
  console.log(
    '╚══════════════════════════════════════════════════════════════╝\n'
  );

  try {
    // Test 1: Fetch locations with SAS machines
    console.log(`\n${'─'.repeat(60)}`);
    console.log('TEST 1: Fetch Locations (for dropdown)');
    console.log(`${'─'.repeat(60)}`);

    try {
      const locResponse = await axios.get(`${BASE_URL}/api/reports/locations`, {
        params: {
          timePeriod: '7d',
          licencee: '',
          showAllLocations: 'true',
          currency: 'USD',
        },
      });

      const locations = locResponse.data.data || [];
      const sasLocations = locations.filter(loc => loc.hasSasMachines);

      console.log(`  Total locations: ${locations.length}`);
      console.log(`  SAS-enabled locations: ${sasLocations.length}`);

      if (sasLocations.length > 0) {
        console.log('\n  SAS Locations:');
        sasLocations.slice(0, 3).forEach(loc => {
          console.log(`    - ${loc.locationName || loc.name} (ID: ${loc._id})`);
          console.log(
            `      SAS Machines: ${loc.sasMachines}, Money In: $${loc.moneyIn}`
          );
        });
      }

      // Use first SAS location for further tests
      const testLocation = sasLocations[0];
      if (!testLocation) {
        console.log('\n  ⚠️  No SAS-enabled locations found');
        return;
      }

      // Test 2: Fetch machine hourly data
      console.log(`\n${'─'.repeat(60)}`);
      console.log('TEST 2: Fetch Machine Hourly Data');
      console.log(`${'─'.repeat(60)}`);

      const hourlyResponse = await axios.get(
        `${BASE_URL}/api/analytics/machine-hourly`,
        {
          params: {
            locationIds: testLocation._id,
            timePeriod: '7d',
            licencee: '',
          },
        }
      );

      const hourlyData = hourlyResponse.data;
      console.log(`  Locations returned: ${hourlyData.locations?.length || 0}`);
      console.log(`  Location IDs: ${JSON.stringify(hourlyData.locations)}`);
      console.log(
        `  Hourly trends count: ${hourlyData.hourlyTrends?.length || 0}`
      );

      // Check if location IDs are being used instead of names
      if (hourlyData.locations && hourlyData.locations.length > 0) {
        const firstLocationKey = hourlyData.locations[0];
        console.log(`\n  First location key: ${firstLocationKey}`);
        console.log(
          `  Is it a location ID? ${firstLocationKey.length === 24 ? 'YES (24 chars - ObjectId)' : 'NO'}`
        );

        // Look up the location name
        const location = locations.find(l => l._id === firstLocationKey);
        if (location) {
          console.log(
            `  ✓ Location found: ${location.locationName || location.name}`
          );
        } else {
          console.log(
            `  ✗ Location NOT found in locations data (mismatch issue)`
          );
        }
      }

      // Test 3: Fetch top machines for this location
      console.log(`\n${'─'.repeat(60)}`);
      console.log('TEST 3: Fetch Top Machines');
      console.log(`${'─'.repeat(60)}`);

      const machinesResponse = await axios.get(
        `${BASE_URL}/api/reports/machines`,
        {
          params: {
            type: 'all',
            timePeriod: '7d',
            licencee: '',
            currency: 'USD',
          },
        }
      );

      const machines = machinesResponse.data.data || [];
      const locationMachines = machines.filter(
        m => m.locationId === testLocation._id
      );

      console.log(`  Total machines: ${machines.length}`);
      console.log(
        `  Machines at ${testLocation.locationName}: ${locationMachines.length}`
      );

      if (locationMachines.length > 0) {
        const top5 = locationMachines
          .sort((a, b) => (b.netWin || 0) - (a.netWin || 0))
          .slice(0, 5);

        console.log('\n  Top 5 Machines:');
        top5.forEach((m, i) => {
          console.log(`    ${i + 1}. ${m.serialNumber || m.assetNumber}`);
          console.log(`       Money In: $${m.moneyIn || 0}`);
          console.log(`       Net Win: $${m.netWin || 0}`);
          console.log(`       Actual Hold: ${m.actualHold || 'N/A'}`);
          console.log(`       Theoretical Hold: ${m.theoreticalHold || 'N/A'}`);
          console.log(
            `       Games Played: ${m.gamesPlayed || m.plays || 'N/A'}`
          );
        });
      }

      // Test 4: Check location table data structure
      console.log(`\n${'─'.repeat(60)}`);
      console.log('TEST 4: Location Table Data Structure');
      console.log(`${'─'.repeat(60)}`);

      const sasLocationForTable = sasLocations[0];
      console.log(`\n  Sample SAS Location for table:`);
      console.log(`    ID: ${sasLocationForTable._id}`);
      console.log(
        `    Name: ${sasLocationForTable.locationName || sasLocationForTable.name}`
      );
      console.log(`    SAS Status: ${sasLocationForTable.hasSasMachines}`);
      console.log(`    Machines: ${sasLocationForTable.totalMachines}`);
      console.log(`    Money In (Drop): $${sasLocationForTable.moneyIn || 0}`);
      console.log(`    Money Out: $${sasLocationForTable.moneyOut || 0}`);
      console.log(`    Gross: $${sasLocationForTable.gross || 0}`);
      console.log(
        `    Hold %: ${sasLocationForTable.moneyIn > 0 ? ((sasLocationForTable.gross / sasLocationForTable.moneyIn) * 100).toFixed(2) : 'N/A'}`
      );
      console.log(
        `    Games Played: ${sasLocationForTable.gamesPlayed || 'N/A'}`
      );

      // Check what fields are available
      console.log(`\n  Available fields:`);
      Object.keys(sasLocationForTable).forEach(key => {
        if (
          !['machines', 'rel', 'country'].includes(key) &&
          sasLocationForTable[key] !== undefined
        ) {
          console.log(`    - ${key}: ${sasLocationForTable[key]}`);
        }
      });
    } catch (error) {
      console.log(`  ✗ ERROR: ${error.response?.data?.error || error.message}`);
      if (error.response?.data) {
        console.log(`  Response: ${JSON.stringify(error.response.data)}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

investigateSASEvaluation();
