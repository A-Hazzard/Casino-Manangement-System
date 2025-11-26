/**
 * Gaming Day Offset Validation Script
 * 
 * This script validates that dashboard, locations, location details, and cabinets
 * all show the same numbers for each time period.
 * 
 * Usage: node test/validate-gaming-day-alignment.js
 */

const { MongoClient } = require('mongodb');
const axios = require('axios');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/evolution-one-cms';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Time periods to test
const TIME_PERIODS = ['Today', 'Yesterday', '7d', '30d'];

// Add custom date (today to today)
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const customDateStr = today.toISOString().split('T')[0];

/**
 * Calculate expected values from database
 */
async function calculateExpectedFromDB(timePeriod, customStartDate, customEndDate) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Get all locations with gameDayOffset
    const locations = await db.collection('gaminglocations').find({}).toArray();
    
    let totalMoneyIn = 0;
    let totalMoneyOut = 0;
    const locationTotals = {};
    
    for (const location of locations) {
      const locationId = location._id.toString();
      const gameDayOffset = location.gameDayOffset ?? 8;
      
      // Calculate gaming day range (simplified - would need full implementation)
      // For now, we'll use the API to get expected values
      
      // Get machines for this location
      const machines = await db.collection('machines').find({
        gamingLocation: locationId,
        $or: [
          { deletedAt: null },
          { deletedAt: { $exists: false } },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      }).toArray();
      
      if (machines.length === 0) continue;
      
      const machineIds = machines.map(m => m._id.toString());
      
      // Note: This is a simplified version - full implementation would use
      // getGamingDayRangeForPeriod from the codebase
      // For now, we'll fetch from API endpoints
    }
    
    return { totalMoneyIn, totalMoneyOut, locationTotals };
  } finally {
    await client.close();
  }
}

/**
 * Fetch dashboard totals from API
 */
async function fetchDashboardTotals(timePeriod, customStartDate, customEndDate) {
  try {
    const params = new URLSearchParams({ timePeriod });
    if (customStartDate) params.append('startDate', customStartDate);
    if (customEndDate) params.append('endDate', customEndDate);
    
    const response = await axios.get(`${BASE_URL}/api/dashboard/totals?${params}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching dashboard totals for ${timePeriod}:`, error.message);
    return null;
  }
}

/**
 * Fetch locations from API
 */
async function fetchLocations(timePeriod, customStartDate, customEndDate) {
  try {
    const params = new URLSearchParams({ timePeriod });
    if (customStartDate) params.append('startDate', customStartDate);
    if (customEndDate) params.append('endDate', customEndDate);
    
    const response = await axios.get(`${BASE_URL}/api/locationAggregation?${params}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching locations for ${timePeriod}:`, error.message);
    return null;
  }
}

/**
 * Fetch cabinets/machines aggregation from API
 */
async function fetchCabinets(timePeriod, customStartDate, customEndDate) {
  try {
    const params = new URLSearchParams({ timePeriod });
    if (customStartDate) params.append('startDate', customStartDate);
    if (customEndDate) params.append('endDate', customEndDate);
    
    const response = await axios.get(`${BASE_URL}/api/machines/aggregation?${params}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching cabinets for ${timePeriod}:`, error.message);
    return null;
  }
}

/**
 * Fetch location details from API
 */
async function fetchLocationDetails(locationId, timePeriod, customStartDate, customEndDate) {
  try {
    const params = new URLSearchParams({ timePeriod });
    if (customStartDate) params.append('startDate', customStartDate);
    if (customEndDate) params.append('endDate', customEndDate);
    
    const response = await axios.get(`${BASE_URL}/api/locations/${locationId}?${params}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching location details for ${locationId}:`, error.message);
    return null;
  }
}

/**
 * Test location details match locations page total
 */
async function testLocationDetails(locationId, timePeriod, expectedLocation) {
  const customStartDate = timePeriod === 'Custom' ? customDateStr : undefined;
  const customEndDate = timePeriod === 'Custom' ? customDateStr : undefined;
  
  const locationDetails = await fetchLocationDetails(locationId, timePeriod, customStartDate, customEndDate);
  
  if (!locationDetails) {
    console.log('  ❌ Could not fetch location details');
    return;
  }
  
  const detailsTotals = {
    moneyIn: locationDetails.moneyIn || 0,
    moneyOut: locationDetails.moneyOut || 0,
    gross: locationDetails.gross || 0,
  };
  
  const expectedTotals = {
    moneyIn: expectedLocation.moneyIn || 0,
    moneyOut: expectedLocation.moneyOut || 0,
    gross: expectedLocation.gross || 0,
  };
  
  const moneyInMatch = compareValues(detailsTotals.moneyIn, expectedTotals.moneyIn);
  const moneyOutMatch = compareValues(detailsTotals.moneyOut, expectedTotals.moneyOut);
  const grossMatch = compareValues(detailsTotals.gross, expectedTotals.gross);
  
  console.log(`  Location Details: Money In=$${detailsTotals.moneyIn.toFixed(2)}, Money Out=$${detailsTotals.moneyOut.toFixed(2)}, Gross=$${detailsTotals.gross.toFixed(2)}`);
  console.log(`  Locations Page: Money In=$${expectedTotals.moneyIn.toFixed(2)}, Money Out=$${expectedTotals.moneyOut.toFixed(2)}, Gross=$${expectedTotals.gross.toFixed(2)}`);
  
  if (moneyInMatch && moneyOutMatch && grossMatch) {
    console.log('  ✅ Location details match locations page');
  } else {
    console.log('  ❌ Location details DO NOT match locations page');
    if (!moneyInMatch) console.log(`    Money In difference: ${detailsTotals.moneyIn} vs ${expectedTotals.moneyIn}`);
    if (!moneyOutMatch) console.log(`    Money Out difference: ${detailsTotals.moneyOut} vs ${expectedTotals.moneyOut}`);
    if (!grossMatch) console.log(`    Gross difference: ${detailsTotals.gross} vs ${expectedTotals.gross}`);
  }
}

/**
 * Compare values with tolerance
 */
function compareValues(actual, expected, tolerance = 0.01) {
  return Math.abs(actual - expected) < tolerance;
}

/**
 * Main validation function
 */
async function validateAlignment() {
  console.log('🔍 Starting Gaming Day Offset Alignment Validation...\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  
  // Test all predefined periods
  for (const timePeriod of TIME_PERIODS) {
    console.log(`\n📊 Testing time period: ${timePeriod}`);
    console.log('='.repeat(60));
    
    // Fetch from all endpoints
    const [dashboard, locations, cabinets] = await Promise.all([
      fetchDashboardTotals(timePeriod),
      fetchLocations(timePeriod),
      fetchCabinets(timePeriod),
    ]);
    
    await validateAndReport(dashboard, locations, cabinets, timePeriod);
    
    // Wait 10 seconds before next test
    console.log('\n⏳ Waiting 10 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  // Test custom date (today to today)
  console.log(`\n📊 Testing time period: Custom (${customDateStr} to ${customDateStr})`);
  console.log('='.repeat(60));
  
  const [dashboardCustom, locationsCustom, cabinetsCustom] = await Promise.all([
    fetchDashboardTotals('Custom', customDateStr, customDateStr),
    fetchLocations('Custom', customDateStr, customDateStr),
    fetchCabinets('Custom', customDateStr, customDateStr),
  ]);
  
  await validateAndReport(dashboardCustom, locationsCustom, cabinetsCustom, 'Custom');
  
  console.log('\n✅ Validation complete!');
}

/**
 * Validate and report results
 */
async function validateAndReport(dashboard, locations, cabinets, timePeriod) {
  if (!dashboard || !locations || !cabinets) {
    console.log(`❌ Failed to fetch data for ${timePeriod}`);
    return;
  }
    
    // Extract totals
    const dashboardTotals = {
      moneyIn: dashboard.moneyIn || 0,
      moneyOut: dashboard.moneyOut || 0,
      gross: dashboard.gross || 0,
    };
    
    // Calculate location totals
    const locationTotals = {
      moneyIn: (locations.rows || []).reduce((sum, loc) => sum + (loc.moneyIn || 0), 0),
      moneyOut: (locations.rows || []).reduce((sum, loc) => sum + (loc.moneyOut || 0), 0),
      gross: (locations.rows || []).reduce((sum, loc) => sum + (loc.gross || 0), 0),
    };
    
    // Calculate cabinet totals
    const cabinetTotals = {
      moneyIn: (cabinets.machines || []).reduce((sum, m) => sum + (m.moneyIn || 0), 0),
      moneyOut: (cabinets.machines || []).reduce((sum, m) => sum + (m.moneyOut || 0), 0),
      gross: (cabinets.machines || []).reduce((sum, m) => sum + (m.gross || 0), 0),
    };
    
    // Compare
    console.log('\nDashboard Totals:');
    console.log(`  Money In: $${dashboardTotals.moneyIn.toFixed(2)}`);
    console.log(`  Money Out: $${dashboardTotals.moneyOut.toFixed(2)}`);
    console.log(`  Gross: $${dashboardTotals.gross.toFixed(2)}`);
    
    console.log('\nLocations Totals:');
    console.log(`  Money In: $${locationTotals.moneyIn.toFixed(2)}`);
    console.log(`  Money Out: $${locationTotals.moneyOut.toFixed(2)}`);
    console.log(`  Gross: $${locationTotals.gross.toFixed(2)}`);
    
    console.log('\nCabinets Totals:');
    console.log(`  Money In: $${cabinetTotals.moneyIn.toFixed(2)}`);
    console.log(`  Money Out: $${cabinetTotals.moneyOut.toFixed(2)}`);
    console.log(`  Gross: $${cabinetTotals.gross.toFixed(2)}`);
    
    // Validate alignment
    const moneyInMatch = compareValues(dashboardTotals.moneyIn, locationTotals.moneyIn) &&
                         compareValues(dashboardTotals.moneyIn, cabinetTotals.moneyIn);
    const moneyOutMatch = compareValues(dashboardTotals.moneyOut, locationTotals.moneyOut) &&
                          compareValues(dashboardTotals.moneyOut, cabinetTotals.moneyOut);
    const grossMatch = compareValues(dashboardTotals.gross, locationTotals.gross) &&
                       compareValues(dashboardTotals.gross, cabinetTotals.gross);
    
    console.log('\n✅ Validation Results:');
    console.log(`  Money In: ${moneyInMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
    console.log(`  Money Out: ${moneyOutMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
    console.log(`  Gross: ${grossMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
    
    if (!moneyInMatch || !moneyOutMatch || !grossMatch) {
      console.log('\n⚠️  MISMATCH DETECTED!');
      if (!moneyInMatch) {
        console.log(`  Money In difference: Dashboard=${dashboardTotals.moneyIn}, Locations=${locationTotals.moneyIn}, Cabinets=${cabinetTotals.moneyIn}`);
      }
      if (!moneyOutMatch) {
        console.log(`  Money Out difference: Dashboard=${dashboardTotals.moneyOut}, Locations=${locationTotals.moneyOut}, Cabinets=${cabinetTotals.moneyOut}`);
      }
      if (!grossMatch) {
        console.log(`  Gross difference: Dashboard=${dashboardTotals.gross}, Locations=${locationTotals.gross}, Cabinets=${cabinetTotals.gross}`);
      }
    }
    
    // Test location details for first location with data
    if (locations && locations.rows && locations.rows.length > 0) {
      const firstLocation = locations.rows[0];
      if (firstLocation.moneyIn > 0 || firstLocation.moneyOut > 0) {
        console.log(`\n🔍 Testing location details for: ${firstLocation.name || firstLocation._id}`);
        await testLocationDetails(firstLocation._id, timePeriod, firstLocation);
      }
    }
}

// Run if executed directly
if (require.main === module) {
  validateAlignment()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = { validateAlignment };


 * 
 * This script validates that dashboard, locations, location details, and cabinets
 * all show the same numbers for each time period.
 * 
 * Usage: node test/validate-gaming-day-alignment.js
 */

const { MongoClient } = require('mongodb');
const axios = require('axios');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/evolution-one-cms';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Time periods to test
const TIME_PERIODS = ['Today', 'Yesterday', '7d', '30d'];

// Add custom date (today to today)
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const customDateStr = today.toISOString().split('T')[0];

/**
 * Calculate expected values from database
 */
async function calculateExpectedFromDB(timePeriod, customStartDate, customEndDate) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Get all locations with gameDayOffset
    const locations = await db.collection('gaminglocations').find({}).toArray();
    
    let totalMoneyIn = 0;
    let totalMoneyOut = 0;
    const locationTotals = {};
    
    for (const location of locations) {
      const locationId = location._id.toString();
      const gameDayOffset = location.gameDayOffset ?? 8;
      
      // Calculate gaming day range (simplified - would need full implementation)
      // For now, we'll use the API to get expected values
      
      // Get machines for this location
      const machines = await db.collection('machines').find({
        gamingLocation: locationId,
        $or: [
          { deletedAt: null },
          { deletedAt: { $exists: false } },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      }).toArray();
      
      if (machines.length === 0) continue;
      
      const machineIds = machines.map(m => m._id.toString());
      
      // Note: This is a simplified version - full implementation would use
      // getGamingDayRangeForPeriod from the codebase
      // For now, we'll fetch from API endpoints
    }
    
    return { totalMoneyIn, totalMoneyOut, locationTotals };
  } finally {
    await client.close();
  }
}

/**
 * Fetch dashboard totals from API
 */
async function fetchDashboardTotals(timePeriod, customStartDate, customEndDate) {
  try {
    const params = new URLSearchParams({ timePeriod });
    if (customStartDate) params.append('startDate', customStartDate);
    if (customEndDate) params.append('endDate', customEndDate);
    
    const response = await axios.get(`${BASE_URL}/api/dashboard/totals?${params}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching dashboard totals for ${timePeriod}:`, error.message);
    return null;
  }
}

/**
 * Fetch locations from API
 */
async function fetchLocations(timePeriod, customStartDate, customEndDate) {
  try {
    const params = new URLSearchParams({ timePeriod });
    if (customStartDate) params.append('startDate', customStartDate);
    if (customEndDate) params.append('endDate', customEndDate);
    
    const response = await axios.get(`${BASE_URL}/api/locationAggregation?${params}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching locations for ${timePeriod}:`, error.message);
    return null;
  }
}

/**
 * Fetch cabinets/machines aggregation from API
 */
async function fetchCabinets(timePeriod, customStartDate, customEndDate) {
  try {
    const params = new URLSearchParams({ timePeriod });
    if (customStartDate) params.append('startDate', customStartDate);
    if (customEndDate) params.append('endDate', customEndDate);
    
    const response = await axios.get(`${BASE_URL}/api/machines/aggregation?${params}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching cabinets for ${timePeriod}:`, error.message);
    return null;
  }
}

/**
 * Fetch location details from API
 */
async function fetchLocationDetails(locationId, timePeriod, customStartDate, customEndDate) {
  try {
    const params = new URLSearchParams({ timePeriod });
    if (customStartDate) params.append('startDate', customStartDate);
    if (customEndDate) params.append('endDate', customEndDate);
    
    const response = await axios.get(`${BASE_URL}/api/locations/${locationId}?${params}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching location details for ${locationId}:`, error.message);
    return null;
  }
}

/**
 * Test location details match locations page total
 */
async function testLocationDetails(locationId, timePeriod, expectedLocation) {
  const customStartDate = timePeriod === 'Custom' ? customDateStr : undefined;
  const customEndDate = timePeriod === 'Custom' ? customDateStr : undefined;
  
  const locationDetails = await fetchLocationDetails(locationId, timePeriod, customStartDate, customEndDate);
  
  if (!locationDetails) {
    console.log('  ❌ Could not fetch location details');
    return;
  }
  
  const detailsTotals = {
    moneyIn: locationDetails.moneyIn || 0,
    moneyOut: locationDetails.moneyOut || 0,
    gross: locationDetails.gross || 0,
  };
  
  const expectedTotals = {
    moneyIn: expectedLocation.moneyIn || 0,
    moneyOut: expectedLocation.moneyOut || 0,
    gross: expectedLocation.gross || 0,
  };
  
  const moneyInMatch = compareValues(detailsTotals.moneyIn, expectedTotals.moneyIn);
  const moneyOutMatch = compareValues(detailsTotals.moneyOut, expectedTotals.moneyOut);
  const grossMatch = compareValues(detailsTotals.gross, expectedTotals.gross);
  
  console.log(`  Location Details: Money In=$${detailsTotals.moneyIn.toFixed(2)}, Money Out=$${detailsTotals.moneyOut.toFixed(2)}, Gross=$${detailsTotals.gross.toFixed(2)}`);
  console.log(`  Locations Page: Money In=$${expectedTotals.moneyIn.toFixed(2)}, Money Out=$${expectedTotals.moneyOut.toFixed(2)}, Gross=$${expectedTotals.gross.toFixed(2)}`);
  
  if (moneyInMatch && moneyOutMatch && grossMatch) {
    console.log('  ✅ Location details match locations page');
  } else {
    console.log('  ❌ Location details DO NOT match locations page');
    if (!moneyInMatch) console.log(`    Money In difference: ${detailsTotals.moneyIn} vs ${expectedTotals.moneyIn}`);
    if (!moneyOutMatch) console.log(`    Money Out difference: ${detailsTotals.moneyOut} vs ${expectedTotals.moneyOut}`);
    if (!grossMatch) console.log(`    Gross difference: ${detailsTotals.gross} vs ${expectedTotals.gross}`);
  }
}

/**
 * Compare values with tolerance
 */
function compareValues(actual, expected, tolerance = 0.01) {
  return Math.abs(actual - expected) < tolerance;
}

/**
 * Main validation function
 */
async function validateAlignment() {
  console.log('🔍 Starting Gaming Day Offset Alignment Validation...\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  
  // Test all predefined periods
  for (const timePeriod of TIME_PERIODS) {
    console.log(`\n📊 Testing time period: ${timePeriod}`);
    console.log('='.repeat(60));
    
    // Fetch from all endpoints
    const [dashboard, locations, cabinets] = await Promise.all([
      fetchDashboardTotals(timePeriod),
      fetchLocations(timePeriod),
      fetchCabinets(timePeriod),
    ]);
    
    await validateAndReport(dashboard, locations, cabinets, timePeriod);
    
    // Wait 10 seconds before next test
    console.log('\n⏳ Waiting 10 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  // Test custom date (today to today)
  console.log(`\n📊 Testing time period: Custom (${customDateStr} to ${customDateStr})`);
  console.log('='.repeat(60));
  
  const [dashboardCustom, locationsCustom, cabinetsCustom] = await Promise.all([
    fetchDashboardTotals('Custom', customDateStr, customDateStr),
    fetchLocations('Custom', customDateStr, customDateStr),
    fetchCabinets('Custom', customDateStr, customDateStr),
  ]);
  
  await validateAndReport(dashboardCustom, locationsCustom, cabinetsCustom, 'Custom');
  
  console.log('\n✅ Validation complete!');
}

/**
 * Validate and report results
 */
async function validateAndReport(dashboard, locations, cabinets, timePeriod) {
  if (!dashboard || !locations || !cabinets) {
    console.log(`❌ Failed to fetch data for ${timePeriod}`);
    return;
  }
    
    // Extract totals
    const dashboardTotals = {
      moneyIn: dashboard.moneyIn || 0,
      moneyOut: dashboard.moneyOut || 0,
      gross: dashboard.gross || 0,
    };
    
    // Calculate location totals
    const locationTotals = {
      moneyIn: (locations.rows || []).reduce((sum, loc) => sum + (loc.moneyIn || 0), 0),
      moneyOut: (locations.rows || []).reduce((sum, loc) => sum + (loc.moneyOut || 0), 0),
      gross: (locations.rows || []).reduce((sum, loc) => sum + (loc.gross || 0), 0),
    };
    
    // Calculate cabinet totals
    const cabinetTotals = {
      moneyIn: (cabinets.machines || []).reduce((sum, m) => sum + (m.moneyIn || 0), 0),
      moneyOut: (cabinets.machines || []).reduce((sum, m) => sum + (m.moneyOut || 0), 0),
      gross: (cabinets.machines || []).reduce((sum, m) => sum + (m.gross || 0), 0),
    };
    
    // Compare
    console.log('\nDashboard Totals:');
    console.log(`  Money In: $${dashboardTotals.moneyIn.toFixed(2)}`);
    console.log(`  Money Out: $${dashboardTotals.moneyOut.toFixed(2)}`);
    console.log(`  Gross: $${dashboardTotals.gross.toFixed(2)}`);
    
    console.log('\nLocations Totals:');
    console.log(`  Money In: $${locationTotals.moneyIn.toFixed(2)}`);
    console.log(`  Money Out: $${locationTotals.moneyOut.toFixed(2)}`);
    console.log(`  Gross: $${locationTotals.gross.toFixed(2)}`);
    
    console.log('\nCabinets Totals:');
    console.log(`  Money In: $${cabinetTotals.moneyIn.toFixed(2)}`);
    console.log(`  Money Out: $${cabinetTotals.moneyOut.toFixed(2)}`);
    console.log(`  Gross: $${cabinetTotals.gross.toFixed(2)}`);
    
    // Validate alignment
    const moneyInMatch = compareValues(dashboardTotals.moneyIn, locationTotals.moneyIn) &&
                         compareValues(dashboardTotals.moneyIn, cabinetTotals.moneyIn);
    const moneyOutMatch = compareValues(dashboardTotals.moneyOut, locationTotals.moneyOut) &&
                          compareValues(dashboardTotals.moneyOut, cabinetTotals.moneyOut);
    const grossMatch = compareValues(dashboardTotals.gross, locationTotals.gross) &&
                       compareValues(dashboardTotals.gross, cabinetTotals.gross);
    
    console.log('\n✅ Validation Results:');
    console.log(`  Money In: ${moneyInMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
    console.log(`  Money Out: ${moneyOutMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
    console.log(`  Gross: ${grossMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
    
    if (!moneyInMatch || !moneyOutMatch || !grossMatch) {
      console.log('\n⚠️  MISMATCH DETECTED!');
      if (!moneyInMatch) {
        console.log(`  Money In difference: Dashboard=${dashboardTotals.moneyIn}, Locations=${locationTotals.moneyIn}, Cabinets=${cabinetTotals.moneyIn}`);
      }
      if (!moneyOutMatch) {
        console.log(`  Money Out difference: Dashboard=${dashboardTotals.moneyOut}, Locations=${locationTotals.moneyOut}, Cabinets=${cabinetTotals.moneyOut}`);
      }
      if (!grossMatch) {
        console.log(`  Gross difference: Dashboard=${dashboardTotals.gross}, Locations=${locationTotals.gross}, Cabinets=${cabinetTotals.gross}`);
      }
    }
    
    // Test location details for first location with data
    if (locations && locations.rows && locations.rows.length > 0) {
      const firstLocation = locations.rows[0];
      if (firstLocation.moneyIn > 0 || firstLocation.moneyOut > 0) {
        console.log(`\n🔍 Testing location details for: ${firstLocation.name || firstLocation._id}`);
        await testLocationDetails(firstLocation._id, timePeriod, firstLocation);
      }
    }
}

// Run if executed directly
if (require.main === module) {
  validateAlignment()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = { validateAlignment };

