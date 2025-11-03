/**
 * Debug Chart Location Names Issue
 * Verify that locationNames mapping is being used correctly
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function debugChartNames() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     CHART LOCATION NAMES DEBUG                               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    // Test with the DevLabTuna location
    const locationId = '2691c7cb97750118b3ec290e';
    
    console.log('Fetching machine hourly data...\n');
    
    const response = await axios.get(`${BASE_URL}/api/analytics/machine-hourly`, {
      params: {
        locationIds: locationId,
        timePeriod: '7d',
        licencee: '',
        currency: 'USD',
      },
    });

    const data = response.data;

    console.log('API Response Fields:');
    console.log(`  locations: ${JSON.stringify(data.locations)}`);
    console.log(`  locationNames: ${JSON.stringify(data.locationNames)}`);
    console.log(`  hourlyTrends count: ${data.hourlyTrends?.length || 0}`);

    // Check if locationNames mapping exists and is correct
    if (data.locationNames) {
      console.log('\n✓ locationNames field exists');
      console.log('\nLocation ID to Name Mapping:');
      Object.entries(data.locationNames).forEach(([id, name]) => {
        console.log(`  "${id}" -> "${name}"`);
      });

      // Verify the mapping matches the locations array
      if (data.locations && data.locations.length > 0) {
        const firstLocationId = data.locations[0];
        const mappedName = data.locationNames[firstLocationId];
        
        console.log(`\nVerification Check:`);
        console.log(`  Location ID from array: "${firstLocationId}"`);
        console.log(`  Mapped name: "${mappedName || 'NOT FOUND'}"`);
        
        if (mappedName) {
          console.log(`  ✓ Mapping works correctly`);
        } else {
          console.log(`  ✗ Mapping NOT found for this location ID`);
        }
      }
    } else {
      console.log('\n✗ locationNames field is missing!');
    }

    // Check a sample hourly trend
    if (data.hourlyTrends && data.hourlyTrends.length > 0) {
      console.log('\n\nSample Hourly Trend Data (hour 10):');
      const hour10 = data.hourlyTrends.find(h => h.hour === '10:00');
      if (hour10) {
        console.log(`  hour: ${hour10.hour}`);
        Object.keys(hour10).forEach(key => {
          if (key !== 'hour') {
            console.log(`  "${key}": ${JSON.stringify(hour10[key])}`);
          }
        });
      }
    }

    // Simulate what the frontend should do
    console.log('\n\n--- FRONTEND TRANSFORMATION SIMULATION ---');
    if (data.locations && data.locationNames && data.hourlyTrends) {
      const locationId = data.locations[0];
      const locationName = data.locationNames[locationId];
      
      console.log(`\nWhat the chart SHOULD display:`);
      console.log(`  Legend: "${locationName || locationId}"`);
      console.log(`  Data key in transformed data: "${locationName || locationId}"`);
      
      // Show what the transformed data would look like
      const sampleTransformed = {
        hour: '10:00',
        [locationName || locationId]: data.hourlyTrends[10]?.[locationId]?.handle || 0
      };
      console.log(`\nSample transformed data:`);
      console.log(`  ${JSON.stringify(sampleTransformed, null, 2)}`);
    }

  } catch (error) {
    console.error(`Error: ${error.response?.data?.error || error.message}`);
    if (error.response?.data) {
      console.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

debugChartNames();

