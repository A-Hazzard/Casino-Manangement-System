require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const axios = require('axios');

// Simple color helpers (no external dependencies)
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const chalk = {
  red: (text) => colors.red + text + colors.reset,
  green: (text) => colors.green + text + colors.reset,
  yellow: (text) => colors.yellow + text + colors.reset,
  blue: (text) => colors.blue + text + colors.reset,
  cyan: (text) => colors.cyan + text + colors.reset,
  gray: (text) => colors.gray + text + colors.reset,
  bold: (text) => colors.bold + text + colors.reset,
};

/**
 * Performance Testing Suite for Location API
 * 
 * This script tests the actual API endpoint to measure real-world performance
 * including network overhead, authentication, and full request processing.
 * 
 * IMPORTANT: Your Next.js dev server must be running on http://localhost:3000
 * 
 * Run with: node scripts/performance/test-location-api.js
 */

const CONFIG = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  TEST_ITERATIONS: 5,
  TIME_PERIODS: ['Today', '7d', '30d'],
  // Add your auth token here (get from browser DevTools > Application > Cookies)
  AUTH_TOKEN: process.env.TEST_AUTH_TOKEN || '',
};

// Helper to make authenticated API requests
async function makeApiRequest(endpoint, params = {}) {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `${CONFIG.API_URL}${endpoint}${queryString ? '?' + queryString : ''}`;
    
    const headers = {};
    if (CONFIG.AUTH_TOKEN) {
      headers['Cookie'] = `next-auth.session-token=${CONFIG.AUTH_TOKEN}`;
    }
    
    const response = await axios.get(url, {
      headers,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    });
    
    // Check for authentication errors
    if (response.status === 401) {
      throw new Error('Unauthorized - Authentication required. Set TEST_AUTH_TOKEN in .env');
    }
    
    if (response.status !== 200) {
      throw new Error(`API Error ${response.status}: ${response.data.error || response.data.message || 'Unknown error'}`);
    }
    
    return response.data;
  } catch (error) {
    if (error.message) {
      throw error;
    }
    if (error.response) {
      throw new Error(`API Error ${error.response.status}: ${error.response.data?.error || error.message}`);
    }
    throw error;
  }
}

// Test the locations API
async function testLocationsAPI(timePeriod, iteration) {
  const start = Date.now();
  
  const data = await makeApiRequest('/api/reports/locations', {
    timePeriod,
    showAllLocations: 'true',
  });
  
  const duration = Date.now() - start;
  
  return {
    duration,
    locationsCount: data.data?.length || 0,
    performance: data.performance,
  };
}

// Run performance tests
async function runApiPerformanceTests() {
  console.log(chalk.bold(chalk.blue('\n🌐 API Performance Testing Suite\n')));
  console.log('Configuration:');
  console.log(`  API URL: ${CONFIG.API_URL}`);
  console.log(`  Iterations: ${CONFIG.TEST_ITERATIONS}`);
  console.log(`  Time Periods: ${CONFIG.TIME_PERIODS.join(', ')}`);
  console.log();
  
  if (!CONFIG.AUTH_TOKEN) {
    console.log(chalk.yellow('⚠️  Warning: No AUTH_TOKEN set. Some endpoints may require authentication.'));
    console.log(chalk.yellow('   Set TEST_AUTH_TOKEN in .env or pass it as environment variable.\n'));
  }
  
  // Test server connectivity
  console.log('🔌 Testing server connectivity...');
  try {
    await axios.get(`${CONFIG.API_URL}/api/health`).catch(() => {
      // Health endpoint might not exist, try locations instead
      return axios.get(`${CONFIG.API_URL}/api/locations`);
    });
    console.log(chalk.green('✅ Server is reachable\n'));
  } catch (error) {
    console.error(chalk.red('❌ Cannot connect to server!'));
    console.error(chalk.red(`   Make sure your Next.js dev server is running on ${CONFIG.API_URL}`));
    console.error(chalk.red(`   Start it with: npm run dev\n`));
    process.exit(1);
  }
  
  const allResults = [];
  
  // Test each time period
  for (const timePeriod of CONFIG.TIME_PERIODS) {
    console.log(chalk.yellow('━'.repeat(80)));
    console.log(chalk.bold(chalk.yellow(`Testing Time Period: ${timePeriod}`)));
    console.log(chalk.yellow('━'.repeat(80)));
    
    const results = [];
    
    for (let i = 0; i < CONFIG.TEST_ITERATIONS; i++) {
      console.log(`  Iteration ${i + 1}/${CONFIG.TEST_ITERATIONS}...`);
      
      try {
        const result = await testLocationsAPI(timePeriod, i + 1);
        results.push(result);
        
        console.log(`  ⏱️  Total Time: ${chalk.cyan(result.duration + 'ms')}`);
        console.log(`  📍 Locations: ${result.locationsCount}`);
        
        if (result.performance) {
          console.log(`  ⚡ Server Time: ${result.performance.totalTime}ms`);
          console.log(`  🔄 Network Overhead: ${result.duration - result.performance.totalTime}ms`);
          console.log(`  📊 Breakdown:`);
          console.log(`     DB Connection: ${result.performance.breakdown.dbConnect}ms`);
          console.log(`     Processing: ${result.performance.breakdown.processing}ms`);
          console.log(`     Avg/Location: ${result.performance.avgTimePerLocation}ms`);
        }
        console.log();
        
      } catch (error) {
        console.error(chalk.red(`  ❌ Error: ${error.message}\n`));
        continue;
      }
    }
    
    if (results.length > 0) {
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const avgServerTime = results.reduce((sum, r) => sum + (r.performance?.totalTime || 0), 0) / results.length;
      const avgNetworkOverhead = avgDuration - avgServerTime;
      
      allResults.push({
        timePeriod,
        avgDuration,
        avgServerTime,
        avgNetworkOverhead,
        avgLocations: results[0].locationsCount,
        results,
      });
      
      console.log(chalk.green('📊 Summary:'));
      console.log(chalk.green(`   Average Total Time: ${avgDuration.toFixed(2)}ms`));
      console.log(chalk.green(`   Average Server Time: ${avgServerTime.toFixed(2)}ms`));
      console.log(chalk.green(`   Average Network Overhead: ${avgNetworkOverhead.toFixed(2)}ms`));
      console.log();
    }
  }
  
  // Final comparison
  if (allResults.length > 0) {
    console.log(chalk.blue('='.repeat(80)));
    console.log(chalk.bold(chalk.blue('📊 OVERALL COMPARISON')));
    console.log(chalk.blue('='.repeat(80)));
    console.log();
    
    allResults.sort((a, b) => a.avgDuration - b.avgDuration);
    
    console.log(chalk.bold('Performance by Time Period:\n'));
    
    allResults.forEach((result, index) => {
      const emoji = index === 0 ? '🏆' : index === 1 ? '🥈' : '🥉';
      console.log(`${emoji} ${chalk.bold(result.timePeriod)}`);
      console.log(`   Total Time: ${chalk.cyan(result.avgDuration.toFixed(2) + 'ms')}`);
      console.log(`   Server Time: ${chalk.yellow(result.avgServerTime.toFixed(2) + 'ms')}`);
      console.log(`   Network: ${chalk.gray(result.avgNetworkOverhead.toFixed(2) + 'ms')}`);
      console.log(`   Locations: ${result.avgLocations}`);
      console.log();
    });
    
    // Performance insights
    console.log(chalk.blue('='.repeat(80)));
    console.log(chalk.bold('💡 PERFORMANCE INSIGHTS:'));
    console.log(chalk.blue('='.repeat(80)));
    console.log();
    
    const avgNetworkPercent = (allResults.reduce((sum, r) => sum + (r.avgNetworkOverhead / r.avgDuration), 0) / allResults.length) * 100;
    const avgServerPercent = 100 - avgNetworkPercent;
    
    console.log(`• Server Processing: ${chalk.green(avgServerPercent.toFixed(1) + '%')} of total time`);
    console.log(`• Network Overhead: ${chalk.yellow(avgNetworkPercent.toFixed(1) + '%')} of total time`);
    console.log();
    
    if (avgNetworkPercent > 30) {
      console.log(chalk.yellow('⚠️  High network overhead detected!'));
      console.log(chalk.yellow('   Consider:'));
      console.log(chalk.yellow('   • Response compression'));
      console.log(chalk.yellow('   • Reducing response payload size'));
      console.log(chalk.yellow('   • Using server-side pagination'));
      console.log();
    }
    
    const fastestPeriod = allResults[0];
    const slowestPeriod = allResults[allResults.length - 1];
    
    if (slowestPeriod.avgDuration > fastestPeriod.avgDuration * 2) {
      console.log(chalk.yellow(`⚠️  ${slowestPeriod.timePeriod} is significantly slower than ${fastestPeriod.timePeriod}`));
      console.log(chalk.yellow('   This is expected as longer time periods query more data.'));
      console.log();
    }
    
    // Check if server performance is good
    const avgServerTime = allResults.reduce((sum, r) => sum + r.avgServerTime, 0) / allResults.length;
    const avgLocations = allResults.reduce((sum, r) => sum + r.avgLocations, 0) / allResults.length;
    const avgTimePerLocation = avgServerTime / avgLocations;
    
    console.log(chalk.green('✅ Performance Metrics:'));
    console.log(`   Average Time per Location: ${chalk.cyan(avgTimePerLocation.toFixed(2) + 'ms')}`);
    console.log(`   Throughput: ${chalk.cyan((avgLocations / (avgServerTime / 1000)).toFixed(2) + ' locations/sec')}`);
    console.log();
    
    if (avgTimePerLocation < 10) {
      console.log(chalk.green('🎉 Excellent! Server performance is optimal.'));
    } else if (avgTimePerLocation < 20) {
      console.log(chalk.yellow('⚠️  Good performance, but could be improved.'));
    } else {
      console.log(chalk.red('⚠️  Performance needs improvement. Consider optimizations.'));
    }
    console.log();
  }
  
  console.log(chalk.green('✅ API Performance Tests Complete!\n'));
}

// Run tests
runApiPerformanceTests().catch(error => {
  console.error(chalk.red('\n❌ Test suite failed:'), error);
  process.exit(1);
});

