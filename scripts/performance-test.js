const axios = require('axios');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TEST_ITERATIONS = 5;

// Test scenarios
const testScenarios = [
  {
    name: 'Location Aggregation - Today',
    url: '/api/locationAggregation?timePeriod=Today',
    description: 'Testing location aggregation for today'
  },
  {
    name: 'Location Aggregation - 7 Days',
    url: '/api/locationAggregation?timePeriod=7d',
    description: 'Testing location aggregation for 7 days'
  },
  {
    name: 'Location Aggregation - All Time',
    url: '/api/locationAggregation?timePeriod=All%20Time',
    description: 'Testing location aggregation for all time'
  },
  {
    name: 'Machines Stats',
    url: '/api/analytics/machines/stats',
    description: 'Testing machines statistics endpoint'
  },
  {
    name: 'Locations Search All',
    url: '/api/locations/search-all',
    description: 'Testing locations search endpoint'
  }
];

async function measureResponseTime(url, name) {
  const startTime = Date.now();
  try {
    const response = await axios.get(`${BASE_URL}${url}`, {
      timeout: 60000, // 60 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
      success: true,
      duration,
      status: response.status,
      dataSize: JSON.stringify(response.data).length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
      success: false,
      duration,
      error: error.message,
      status: error.response?.status,
      timestamp: new Date().toISOString()
    };
  }
}

async function runPerformanceTest() {
  console.log('🚀 Starting Performance Test Suite');
  console.log('=====================================\n');
  
  const results = {};
  
  for (const scenario of testScenarios) {
    console.log(`📊 Testing: ${scenario.name}`);
    console.log(`   Description: ${scenario.description}`);
    console.log(`   URL: ${BASE_URL}${scenario.url}`);
    
    const scenarioResults = [];
    
    for (let i = 0; i < TEST_ITERATIONS; i++) {
      process.stdout.write(`   Run ${i + 1}/${TEST_ITERATIONS}... `);
      const result = await measureResponseTime(scenario.url, scenario.name);
      scenarioResults.push(result);
      
      if (result.success) {
        console.log(`✅ ${result.duration}ms (${result.dataSize} bytes)`);
      } else {
        console.log(`❌ ${result.duration}ms - ${result.error}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Calculate statistics
    const successfulResults = scenarioResults.filter(r => r.success);
    if (successfulResults.length > 0) {
      const durations = successfulResults.map(r => r.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const minDuration = Math.min(...durations);
      const maxDuration = Math.max(...durations);
      
      console.log(`\n   📈 Results:`);
      console.log(`      Average: ${avgDuration.toFixed(2)}ms`);
      console.log(`      Min: ${minDuration}ms`);
      console.log(`      Max: ${maxDuration}ms`);
      console.log(`      Success Rate: ${successfulResults.length}/${TEST_ITERATIONS} (${(successfulResults.length/TEST_ITERATIONS*100).toFixed(1)}%)`);
      
      // Performance assessment
      if (avgDuration < 2000) {
        console.log(`      🟢 Performance: Excellent (< 2s)`);
      } else if (avgDuration < 5000) {
        console.log(`      🟡 Performance: Good (< 5s)`);
      } else if (avgDuration < 10000) {
        console.log(`      🟠 Performance: Fair (< 10s)`);
      } else {
        console.log(`      🔴 Performance: Poor (> 10s)`);
      }
    } else {
      console.log(`\n   ❌ All requests failed`);
    }
    
    results[scenario.name] = {
      scenario,
      results: scenarioResults,
      summary: successfulResults.length > 0 ? {
        avgDuration: successfulResults.reduce((a, b) => a + b.duration, 0) / successfulResults.length,
        minDuration: Math.min(...successfulResults.map(r => r.duration)),
        maxDuration: Math.max(...successfulResults.map(r => r.duration)),
        successRate: successfulResults.length / TEST_ITERATIONS
      } : null
    };
    
    console.log('\n');
  }
  
  // Summary report
  console.log('📋 Performance Summary');
  console.log('======================');
  
  const summary = Object.entries(results).map(([name, data]) => {
    if (data.summary) {
      return {
        name,
        avgDuration: data.summary.avgDuration,
        successRate: data.summary.successRate
      };
    }
    return { name, avgDuration: null, successRate: 0 };
  });
  
  summary.forEach(item => {
    if (item.avgDuration !== null) {
      console.log(`${item.name}: ${item.avgDuration.toFixed(2)}ms (${(item.successRate*100).toFixed(1)}% success)`);
    } else {
      console.log(`${item.name}: FAILED (0% success)`);
    }
  });
  
  // Overall assessment
  const successfulTests = summary.filter(s => s.avgDuration !== null);
  const overallAvg = successfulTests.length > 0 
    ? successfulTests.reduce((a, b) => a + b.avgDuration, 0) / successfulTests.length 
    : 0;
  
  console.log(`\n🎯 Overall Average: ${overallAvg.toFixed(2)}ms`);
  console.log(`📊 Tests Passed: ${successfulTests.length}/${summary.length}`);
  
  if (overallAvg < 3000) {
    console.log('🎉 Overall Performance: Excellent!');
  } else if (overallAvg < 8000) {
    console.log('👍 Overall Performance: Good');
  } else if (overallAvg < 15000) {
    console.log('⚠️  Overall Performance: Needs Improvement');
  } else {
    console.log('🚨 Overall Performance: Critical - Immediate attention required');
  }
  
  return results;
}

// Run the test
if (require.main === module) {
  runPerformanceTest()
    .then(() => {
      console.log('\n✅ Performance test completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Performance test failed:', error);
      process.exit(1);
    });
}

module.exports = { runPerformanceTest };
