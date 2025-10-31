require('dotenv').config({ path: '.env' });
const axios = require('axios');

/**
 * Debug script to compare dashboard totals API vs chart data API
 * This will help identify why the metric cards show $0.00 while the chart shows data
 */

async function main() {
  const baseUrl = 'http://localhost:3000';
  const timePeriod = 'Today';
  const currency = 'USD';

  console.log('\n=== DASHBOARD METRICS DEBUGGING ===\n');

  try {
    // Fetch totals from the totals API (what powers the metric cards)
    console.log('1. Fetching totals from /api/dashboard/totals...');
    console.log('  NOTE: Not passing licencee parameter (should aggregate ALL locations)');
    const totalsUrl = `${baseUrl}/api/dashboard/totals?timePeriod=${timePeriod}&currency=${currency}`;
    console.log('URL:', totalsUrl);
    
    // Also try with explicit licencee=all
    console.log('\n1b. Fetching with explicit licencee parameter...');
    const totalsUrlWithLicencee = `${baseUrl}/api/dashboard/totals?timePeriod=${timePeriod}&currency=${currency}&licencee=all`;
    console.log('URL:', totalsUrlWithLicencee);
    
    const totalsResponse = await axios.get(totalsUrl);
    const totals = totalsResponse.data;

    console.log('\n📊 TOTALS API RESPONSE (Metric Cards):');
    console.log('  Money In:', totals.moneyIn);
    console.log('  Money Out:', totals.moneyOut);
    console.log('  Gross:', totals.gross);
    console.log('  Currency:', totals.currency);
    console.log('  Converted:', totals.converted);

    // Fetch chart data (what powers the chart)
    console.log('\n\n2. Fetching chart data from /api/metrics/meters...');
    const chartUrl = `${baseUrl}/api/metrics/meters?timePeriod=${timePeriod}`;
    console.log('URL:', chartUrl);
    
    const chartResponse = await axios.get(chartUrl);
    const rawChartData = chartResponse.data;
    // Extract the actual data array from the response
    const chartData = rawChartData.data || rawChartData;

    console.log('\n📈 CHART DATA API RESPONSE:');
    console.log('  Raw response type:', typeof rawChartData);
    console.log('  Has data property:', !!rawChartData.data);
    console.log('  Is array:', Array.isArray(chartData));
    console.log('  Total data points:', Array.isArray(chartData) ? chartData.length : 'N/A');
    
    if (Array.isArray(chartData) && chartData.length > 0) {
      console.log('  First item:', JSON.stringify(chartData[0], null, 2));
    }

    if (Array.isArray(chartData) && chartData.length > 0) {
      // Calculate totals from chart data
      let totalMoneyIn = 0;
      let totalMoneyOut = 0;
      let totalGross = 0;

      chartData.forEach((dataPoint) => {
        totalMoneyIn += dataPoint.moneyIn || 0;
        totalMoneyOut += dataPoint.moneyOut || 0;
        totalGross += dataPoint.gross || 0;
      });

      console.log('\n  Aggregated from chart data:');
      console.log('    Total Money In:', totalMoneyIn);
      console.log('    Total Money Out:', totalMoneyOut);
      console.log('    Total Gross:', totalGross);

      // Find the maximum values to see the spike
      const maxMoneyIn = Math.max(...chartData.map(d => d.moneyIn || 0));
      const maxMoneyOut = Math.max(...chartData.map(d => d.moneyOut || 0));
      const maxGross = Math.max(...chartData.map(d => d.gross || 0));

      console.log('\n  Peak values in chart:');
      console.log('    Max Money In:', maxMoneyIn);
      console.log('    Max Money Out:', maxMoneyOut);
      console.log('    Max Gross:', maxGross);

      // Find the time point with the spike
      const spikePoint = chartData.find(d => (d.moneyIn || 0) === maxMoneyIn);
      if (spikePoint) {
        console.log('\n  Spike details:');
        console.log('    Time:', spikePoint.time || spikePoint.hour || spikePoint._id);
        console.log('    Money In:', spikePoint.moneyIn);
        console.log('    Money Out:', spikePoint.moneyOut);
        console.log('    Gross:', spikePoint.gross);
      }
    }

    console.log('\n\n=== COMPARISON ===');
    console.log('  ISSUE DETECTED:');
    console.log(`    Totals API shows Money In: ${totals.moneyIn}`);
    
    if (Array.isArray(chartData) && chartData.length > 0) {
      console.log(`    Chart shows peak Money In: ${Math.max(...chartData.map(d => d.moneyIn || 0))}`);
    }
    
    if (totals.moneyIn === 0 && Array.isArray(chartData) && chartData.some(d => (d.moneyIn || 0) > 0)) {
      console.log('\n  ❌ MISMATCH: Totals API returns 0 but chart data has non-zero values!');
      console.log('  This explains why the metric cards show $0.00 while the chart shows data.');
      console.log('\n  Possible causes:');
      console.log('    1. Different time range calculations (gaming day offset)');
      console.log('    2. Different data sources or aggregation methods');
      console.log('    3. Caching issues');
      console.log('    4. Database query filters not matching');
    } else {
      console.log('\n  ✅ Values match!');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', error.response.data);
    }
  }
}

main();

