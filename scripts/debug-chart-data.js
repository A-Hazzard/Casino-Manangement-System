/**
 * Debug why charts are empty despite table showing $20
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function debugChartData() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     CHART DATA DEBUG - Why is $20 not showing?              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    const locationId = '2691c7cb97750118b3ec290e';

    // Fetch location trends
    console.log('Fetching location trends for 7d...\n');
    const trendsResponse = await axios.get(
      `${BASE_URL}/api/analytics/location-trends`,
      {
        params: {
          locationIds: locationId,
          timePeriod: '7d',
          licencee: '',
          currency: 'TTD',
        },
      }
    );

    const trendsData = trendsResponse.data;

    console.log('API Response Summary:');
    console.log(`  isHourly: ${trendsData.isHourly}`);
    console.log(`  trends count: ${trendsData.trends?.length || 0}`);
    console.log(`  locationNames: ${JSON.stringify(trendsData.locationNames)}`);

    console.log(`\n  Totals for DevLabTuna:`);
    const totals = trendsData.totals?.[locationId];
    if (totals) {
      console.log(`    Drop: $${totals.drop}`);
      console.log(`    Gross: $${totals.gross}`);
      console.log(`    Handle: $${totals.handle}`);
      console.log(`    Win/Loss: $${totals.winLoss}`);
    }

    // Check each day's data
    console.log(`\n  Daily breakdown:`);
    trendsData.trends.forEach((trend, i) => {
      const locationData = trend[locationId];
      if (typeof locationData === 'object' && locationData) {
        const hasAnyData =
          locationData.drop > 0 ||
          locationData.handle > 0 ||
          locationData.gross > 0;
        if (hasAnyData) {
          console.log(`    ${trend.day}:`);
          console.log(`      Drop: $${locationData.drop}`);
          console.log(`      Handle: $${locationData.handle}`);
          console.log(`      Gross: $${locationData.gross}`);
        }
      }
    });

    // Compare with table data
    console.log(`\n${'─'.repeat(60)}`);
    console.log('Comparing with table data (from /api/reports/locations):');
    console.log(`${'─'.repeat(60)}`);

    const tableResponse = await axios.get(
      `${BASE_URL}/api/reports/locations`,
      {
        params: {
          timePeriod: '7d',
          licencee: '',
          showAllLocations: 'true',
          currency: 'TTD',
        },
      }
    );

    const tableData = tableResponse.data.data || [];
    const devLabTuna = tableData.find((loc) => loc._id === locationId);

    if (devLabTuna) {
      console.log(`\n  DevLabTuna from table API:`);
      console.log(`    Money In: $${devLabTuna.moneyIn}`);
      console.log(`    Gross: $${devLabTuna.gross}`);
      console.log(`    Money Out: $${devLabTuna.moneyOut}`);
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log('DIAGNOSIS:');
    console.log(`${'─'.repeat(60)}`);
    console.log(
      `  Table shows: $${devLabTuna?.moneyIn || 0} (from /api/reports/locations)`
    );
    console.log(
      `  Chart totals show: $${totals?.drop || 0} (from /api/analytics/location-trends)`
    );
    console.log(
      `  Daily breakdown shows: ${trendsData.trends.filter((t) => {
        const ld = t[locationId];
        return typeof ld === 'object' && ld && ld.drop > 0;
      }).length} days with data`
    );

    if ((devLabTuna?.moneyIn || 0) > 0 && (totals?.drop || 0) === 0) {
      console.log(
        `\n  ⚠️  MISMATCH: Table has data but chart endpoint returns 0!`
      );
      console.log(`  This suggests the chart API is querying wrong date range or wrong field.`);
    }
  } catch (error) {
    console.error(`Error: ${error.response?.data?.error || error.message}`);
    if (error.response?.data) {
      console.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

debugChartData();

