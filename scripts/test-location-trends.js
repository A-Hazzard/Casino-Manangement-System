/**
 * Test new location-trends endpoint
 * Verify daily aggregation for 7d filter
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testLocationTrends() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     LOCATION TRENDS ENDPOINT TEST                            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    const locationId = '2691c7cb97750118b3ec290e';

    // Test 1: 7d filter (should return daily data)
    console.log(`\n${'─'.repeat(60)}`);
    console.log('TEST 1: 7d Filter (Should return DAILY data)');
    console.log(`${'─'.repeat(60)}`);

    const response7d = await axios.get(
      `${BASE_URL}/api/analytics/location-trends`,
      {
        params: {
          locationIds: locationId,
          timePeriod: '7d',
          licencee: '',
          currency: 'USD',
        },
      }
    );

    const data7d = response7d.data;
    console.log(`  isHourly: ${data7d.isHourly}`);
    console.log(`  trends count: ${data7d.trends?.length || 0}`);
    console.log(`  locationNames: ${JSON.stringify(data7d.locationNames)}`);

    if (data7d.trends && data7d.trends.length > 0) {
      console.log(`\n  Sample trend data (first 3 days):`);
      data7d.trends.slice(0, 3).forEach((trend, i) => {
        console.log(`    Day ${i + 1}: ${trend.day}`);
        console.log(`      Time: ${trend.time || 'N/A (daily)'}`);
        const locationData = trend[locationId];
        if (typeof locationData === 'object') {
          console.log(`      DevLabTuna data:`);
          console.log(`        - handle: $${locationData.handle}`);
          console.log(`        - winLoss: $${locationData.winLoss}`);
          console.log(`        - drop: $${locationData.drop}`);
          console.log(`        - gross: $${locationData.gross}`);
        }
      });
    }

    // Test 2: Today filter (should return hourly data)
    console.log(`\n${'─'.repeat(60)}`);
    console.log('TEST 2: Today Filter (Should return HOURLY data)');
    console.log(`${'─'.repeat(60)}`);

    const responseToday = await axios.get(
      `${BASE_URL}/api/analytics/location-trends`,
      {
        params: {
          locationIds: locationId,
          timePeriod: 'Today',
          licencee: '',
          currency: 'USD',
        },
      }
    );

    const dataToday = responseToday.data;
    console.log(`  isHourly: ${dataToday.isHourly}`);
    console.log(`  trends count: ${dataToday.trends?.length || 0}`);

    if (dataToday.trends && dataToday.trends.length > 0) {
      console.log(`\n  Sample trend data (hours 8-10):`);
      dataToday.trends.slice(8, 11).forEach(trend => {
        console.log(`    ${trend.time || 'N/A'}:`);
        const locationData = trend[locationId];
        if (typeof locationData === 'object') {
          console.log(
            `      handle: $${locationData.handle}, winLoss: $${locationData.winLoss}`
          );
        }
      });
    }

    // Check totals
    console.log(`\n${'─'.repeat(60)}`);
    console.log('Totals for DevLabTuna (7d):');
    console.log(`${'─'.repeat(60)}`);
    const totals = data7d.totals?.[locationId];
    if (totals) {
      console.log(`  Handle: $${totals.handle}`);
      console.log(`  Win/Loss: $${totals.winLoss}`);
      console.log(`  Drop: $${totals.drop}`);
      console.log(`  Gross: $${totals.gross}`);
      console.log(`  Jackpot: $${totals.jackpot}`);
      console.log(`  Plays: ${totals.plays}`);
    }
  } catch (error) {
    console.error(`Error: ${error.response?.data?.error || error.message}`);
    if (error.response?.data) {
      console.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

testLocationTrends();

