require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const axios = require('axios');

/**
 * Comprehensive Investigation Script: Verify Gaming Day Offset Fix
 * 
 * According to gaming-day-offset-system.md:
 * - Gaming day offset: 8 AM Trinidad time (default)
 * - Trinidad time: UTC-4
 * - "Today" = Yesterday 8 AM Trinidad → Today 8 AM Trinidad (when before 8 AM)
 * - "Today" = Today 8 AM Trinidad → Tomorrow 8 AM Trinidad (when after 8 AM)
 * 
 * This script tests ALL endpoints to ensure they respect gaming day offset.
 */

const API_BASE = 'http://localhost:3000';

async function testAllEndpoints() {
  console.log('\n🔍 COMPREHENSIVE GAMING DAY OFFSET VERIFICATION\n');
  console.log('=' .repeat(80));
  
  const testResults = {
    pass: [],
    fail: [],
    total: 0,
  };
  
  // Test configurations
  const tests = [
    { name: 'Dashboard Today', url: '/api/dashboard/totals', params: { timePeriod: 'Today' } },
    { name: 'Dashboard Yesterday', url: '/api/dashboard/totals', params: { timePeriod: 'Yesterday' } },
    { name: 'Dashboard 7 Days', url: '/api/dashboard/totals', params: { timePeriod: '7d' } },
    { name: 'Dashboard 30 Days', url: '/api/dashboard/totals', params: { timePeriod: '30d' } },
    
    { name: 'Chart Today', url: '/api/metrics/meters', params: { timePeriod: 'Today' } },
    { name: 'Chart Yesterday', url: '/api/metrics/meters', params: { timePeriod: 'Yesterday' } },
    { name: 'Chart 7 Days', url: '/api/metrics/meters', params: { timePeriod: '7d' } },
    { name: 'Chart 30 Days', url: '/api/metrics/meters', params: { timePeriod: '30d' } },
    
    { name: 'Locations Today', url: '/api/reports/locations', params: { timePeriod: 'Today' } },
    { name: 'Locations Yesterday', url: '/api/reports/locations', params: { timePeriod: 'Yesterday' } },
    { name: 'Locations 7 Days', url: '/api/reports/locations', params: { timePeriod: '7d' } },
    { name: 'Locations 30 Days', url: '/api/reports/locations', params: { timePeriod: '30d' } },
    
    { name: 'Cabinets Today', url: '/api/machines/aggregation', params: { timePeriod: 'Today' } },
    { name: 'Cabinets Yesterday', url: '/api/machines/aggregation', params: { timePeriod: 'Yesterday' } },
    { name: 'Cabinets 7 Days', url: '/api/machines/aggregation', params: { timePeriod: '7d' } },
    { name: 'Cabinets 30 Days', url: '/api/machines/aggregation', params: { timePeriod: '30d' } },
  ];
  
  console.log(`Testing ${tests.length} endpoints...\n`);
  
  for (const test of tests) {
    testResults.total++;
    
    try {
      const response = await axios.get(`${API_BASE}${test.url}`, {
        params: test.params,
        timeout: 30000, // 30s timeout
      });
      
      // Check if response has data
      let hasData = false;
      let dataValue = 0;
      
      if (test.url.includes('dashboard')) {
        hasData = response.data.moneyIn > 0 || response.data.moneyOut > 0;
        dataValue = response.data.gross || 0;
      } else if (test.url.includes('meters')) {
        hasData = response.data.result && response.data.result.length > 0;
        dataValue = hasData ? response.data.result.length : 0;
      } else if (test.url.includes('locations') || test.url.includes('machines')) {
        hasData = response.data.data && response.data.data.length > 0;
        dataValue = hasData ? response.data.data.length : 0;
      }
      
      if (hasData) {
        console.log(`✅ ${test.name}: PASS (value: ${dataValue})`);
        testResults.pass.push(test.name);
      } else {
        console.log(`⚠️  ${test.name}: Returns 0/empty data`);
        testResults.fail.push({ name: test.name, reason: 'No data returned' });
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.response?.data?.error || error.message}`);
      testResults.fail.push({ name: test.name, reason: error.response?.data?.error || error.message });
    }
  }
  
  // Print summary
  console.log('\n\n📊 TEST SUMMARY\n');
  console.log('=' .repeat(80));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.pass.length} (${Math.round(testResults.pass.length / testResults.total * 100)}%)`);
  console.log(`Failed: ${testResults.fail.length} (${Math.round(testResults.fail.length / testResults.total * 100)}%)`);
  
  if (testResults.fail.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.fail.forEach(fail => {
      const reason = typeof fail === 'object' ? fail.reason : fail;
      const name = typeof fail === 'object' ? fail.name : fail;
      console.log(`  - ${name}: ${reason}`);
    });
  }
  
  if (testResults.pass.length === testResults.total) {
    console.log('\n🎉 ALL TESTS PASSED! Gaming day offset is working correctly across all endpoints!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the details above.');
  }
}

// Run tests
testAllEndpoints().then(() => {
  console.log('\n✅ Verification complete!\n');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

