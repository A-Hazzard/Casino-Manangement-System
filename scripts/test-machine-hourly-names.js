/**
 * Test machine-hourly endpoint to verify locationNames is returned
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testMachineHourlyNames() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     MACHINE HOURLY ENDPOINT - LOCATION NAMES TEST            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    const response = await axios.get(
      `${BASE_URL}/api/analytics/machine-hourly`,
      {
        params: {
          locationIds: '2691c7cb97750118b3ec290e',
          timePeriod: '7d',
          licencee: '',
          currency: 'USD',
        },
      }
    );

    const data = response.data;

    console.log('Response fields:');
    console.log(`  - locationIds: ${JSON.stringify(data.locationIds)}`);
    console.log(`  - locations: ${JSON.stringify(data.locations)}`);
    console.log(
      `  - locationNames: ${JSON.stringify(data.locationNames || 'NOT FOUND')}`
    );
    console.log(`  - currency: ${data.currency || 'NOT FOUND'}`);
    console.log(`  - converted: ${data.converted || false}`);
    console.log(`  - hourlyTrends count: ${data.hourlyTrends?.length || 0}`);

    if (data.locationNames) {
      console.log('\n✓ locationNames field is present!');
      Object.entries(data.locationNames).forEach(([id, name]) => {
        console.log(`  ${id} -> ${name}`);
      });
    } else {
      console.log('\n✗ locationNames field is missing!');
    }

    // Check a sample hourly trend
    if (data.hourlyTrends && data.hourlyTrends.length > 0) {
      console.log('\nSample hourly trend (hour 10):');
      const sampleHour = data.hourlyTrends.find((h) => h.hour === '10:00');
      if (sampleHour) {
        console.log(`  Hour: ${sampleHour.hour}`);
        Object.keys(sampleHour).forEach((key) => {
          if (key !== 'hour') {
            console.log(`  Location ${key}:`, sampleHour[key]);
          }
        });
      }
    }
  } catch (error) {
    console.error(
      `Error: ${error.response?.data?.error || error.message}`
    );
  }
}

testMachineHourlyNames();

