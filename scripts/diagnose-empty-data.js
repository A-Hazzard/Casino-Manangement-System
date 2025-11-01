const axios = require('axios');

// Test the APIs that are returning empty arrays
async function diagnoseAPIs() {
  const baseURL = 'http://localhost:3000';
  
  console.log('===== DIAGNOSING EMPTY DATA ISSUES =====\n');
  
  // Test 1: Dashboard totals API
  console.log('1. Testing Dashboard Totals API...');
  try {
    const totalsResponse = await axios.get(
      `${baseURL}/api/dashboard/totals?timePeriod=Yesterday`
    );
    console.log('✅ Dashboard Totals Response:', JSON.stringify(totalsResponse.data, null, 2));
  } catch (error) {
    console.error('❌ Dashboard Totals Error:', error.response?.data || error.message);
  }
  
  console.log('\n2. Testing Metrics/Meters API (for chart)...');
  try {
    const metricsResponse = await axios.get(
      `${baseURL}/api/metrics/meters?timePeriod=Yesterday`
    );
    console.log('✅ Metrics Response length:', metricsResponse.data.length);
    if (metricsResponse.data.length > 0) {
      console.log('First item:', JSON.stringify(metricsResponse.data[0], null, 2));
    } else {
      console.log('⚠️  Empty array returned');
    }
  } catch (error) {
    console.error('❌ Metrics Error:', error.response?.data || error.message);
  }
  
  console.log('\n3. Testing Machines Aggregation API (for cabinets page)...');
  try {
    const machinesResponse = await axios.get(
      `${baseURL}/api/machines/aggregation?timePeriod=Yesterday`
    );
    console.log('✅ Machines Response:', {
      success: machinesResponse.data.success,
      dataLength: machinesResponse.data.data?.length || 0
    });
    if (machinesResponse.data.data?.length > 0) {
      console.log('First machine:', JSON.stringify(machinesResponse.data.data[0], null, 2));
    } else {
      console.log('⚠️  Empty data array returned');
    }
  } catch (error) {
    console.error('❌ Machines Error:', error.response?.data || error.message);
  }
  
  console.log('\n4. Testing with Custom date range (Oct 31)...');
  try {
    const customResponse = await axios.get(
      `${baseURL}/api/machines/aggregation?timePeriod=Custom&startDate=2025-10-31&endDate=2025-10-31`
    );
    console.log('✅ Custom Date Response:', {
      success: customResponse.data.success,
      dataLength: customResponse.data.data?.length || 0
    });
    if (customResponse.data.data?.length > 0) {
      const machine = customResponse.data.data[0];
      console.log('First machine metrics:', {
        serialNumber: machine.serialNumber,
        moneyIn: machine.moneyIn,
        moneyOut: machine.moneyOut,
        gross: machine.gross
      });
    }
  } catch (error) {
    console.error('❌ Custom Date Error:', error.response?.data || error.message);
  }
  
  console.log('\n5. Testing Locations API (working endpoint for comparison)...');
  try {
    const locationsResponse = await axios.get(
      `${baseURL}/api/locations`
    );
    console.log('✅ Locations Response:', {
      hasLocations: Boolean(locationsResponse.data.locations),
      count: locationsResponse.data.locations?.length || 0
    });
  } catch (error) {
    console.error('❌ Locations Error:', error.response?.data || error.message);
  }
  
  console.log('\n===== DIAGNOSIS COMPLETE =====');
}

diagnoseAPIs().catch(console.error);

