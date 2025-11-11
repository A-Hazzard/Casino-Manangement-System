require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { MongoClient } = require('mongodb');
const axios = require('axios');

/**
 * Investigation Script: Check "Today" Data Across All Endpoints
 * 
 * This script verifies that the gaming day offset (8 AM Trinidad time) is correctly applied
 * and that meter data exists for the current gaming day.
 * 
 * According to gaming-day-offset-system.md:
 * - Default gaming day offset: 8 AM Trinidad time
 * - Trinidad time: UTC-4
 * - "Today" = Today 8 AM Trinidad → Tomorrow 8 AM Trinidad (24 hours)
 */

const API_BASE = 'http://localhost:3000';

async function investigateTodayData() {
  console.log('\n🔍 INVESTIGATING "TODAY" DATA ACROSS ALL ENDPOINTS\n');
  console.log('=' .repeat(80));
  
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Step 1: Calculate correct "Today" range with gaming day offset
    console.log('\n📅 STEP 1: Calculate Gaming Day Range for "Today"\n');
    
    const now = new Date();
    const trinidadNow = new Date(now.getTime() - 4 * 60 * 60 * 1000); // UTC-4
    
    console.log(`Current UTC Time: ${now.toISOString()}`);
    console.log(`Current Trinidad Time: ${trinidadNow.toISOString()}`);
    
    // Gaming day starts at 8 AM Trinidad time
    const gamingDayStart = new Date(trinidadNow);
    gamingDayStart.setHours(8, 0, 0, 0);
    
    // If current time is before 8 AM, gaming day started yesterday
    if (trinidadNow.getHours() < 8) {
      gamingDayStart.setDate(gamingDayStart.getDate() - 1);
    }
    
    const gamingDayEnd = new Date(gamingDayStart);
    gamingDayEnd.setDate(gamingDayEnd.getDate() + 1);
    
    // Convert back to UTC for database queries
    const utcStart = new Date(gamingDayStart.getTime() + 4 * 60 * 60 * 1000);
    const utcEnd = new Date(gamingDayEnd.getTime() + 4 * 60 * 60 * 1000);
    
    console.log(`\nGaming Day "Today" (Trinidad Time):`);
    console.log(`  Start: ${gamingDayStart.toISOString()} (8 AM Trinidad)`);
    console.log(`  End:   ${gamingDayEnd.toISOString()} (8 AM Trinidad next day)`);
    console.log(`\nGaming Day "Today" (UTC for DB queries):`);
    console.log(`  Start: ${utcStart.toISOString()}`);
    console.log(`  End:   ${utcEnd.toISOString()}`);
    
    // Step 2: Check if meter data exists for this range
    console.log('\n📊 STEP 2: Check Meter Data in Database\n');
    
    const meterCount = await db.collection('meters').countDocuments({
      readAt: { $gte: utcStart, $lte: utcEnd }
    });
    
    console.log(`Meters in gaming day range: ${meterCount}`);
    
    if (meterCount === 0) {
      console.log('⚠️  WARNING: No meters found for today\'s gaming day!');
      
      // Check what dates DO have meter data
      const latestMeter = await db.collection('meters')
        .find({})
        .sort({ readAt: -1 })
        .limit(1)
        .toArray();
      
      if (latestMeter.length > 0) {
        console.log(`\nLatest meter in database:`);
        console.log(`  Date: ${latestMeter[0].readAt.toISOString()}`);
        console.log(`  Machine: ${latestMeter[0].machine}`);
      }
      
      // Check meters from last 7 days
      const sevenDaysAgo = new Date(utcStart);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentMeters = await db.collection('meters').aggregate([
        {
          $match: {
            readAt: { $gte: sevenDaysAgo, $lte: utcEnd }
          }
        },
        {
          $group: {
            _id: { $dateToString: { date: '$readAt', format: '%Y-%m-%d' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } }
      ]).toArray();
      
      console.log(`\nMeter counts by date (last 7 days):`);
      recentMeters.forEach(day => {
        console.log(`  ${day._id}: ${day.count} meters`);
      });
    } else {
      // Sample some meters
      const sampleMeters = await db.collection('meters')
        .find({ readAt: { $gte: utcStart, $lte: utcEnd } })
        .limit(5)
        .toArray();
      
      console.log(`\nSample meters for today:`);
      sampleMeters.forEach((meter, i) => {
        console.log(`  ${i + 1}. ${meter.readAt.toISOString()} - Machine: ${meter.machine} - Drop: ${meter.movement?.drop || 0}`);
      });
      
      // Aggregate totals
      const totals = await db.collection('meters').aggregate([
        {
          $match: {
            readAt: { $gte: utcStart, $lte: utcEnd }
          }
        },
        {
          $group: {
            _id: null,
            totalDrop: { $sum: '$movement.drop' },
            totalCancelled: { $sum: '$movement.totalCancelledCredits' },
            count: { $sum: 1 }
          }
        }
      ]).toArray();
      
      if (totals.length > 0) {
        const gross = totals[0].totalDrop - totals[0].totalCancelled;
        console.log(`\nDatabase Totals for Today:`);
        console.log(`  Money In: ${totals[0].totalDrop}`);
        console.log(`  Money Out: ${totals[0].totalCancelled}`);
        console.log(`  Gross: ${gross}`);
      }
    }
    
    // Step 3: Test Dashboard API
    console.log('\n\n🎯 STEP 3: Test Dashboard API\n');
    console.log('=' .repeat(80));
    
    try {
      const dashboardResponse = await axios.get(`${API_BASE}/api/dashboard/totals`, {
        params: { timePeriod: 'Today' }
      });
      
      console.log('Dashboard API Response for "Today":');
      console.log(JSON.stringify(dashboardResponse.data, null, 2));
      
      if (dashboardResponse.data.moneyIn === 0 && dashboardResponse.data.moneyOut === 0) {
        console.log('\n⚠️  ISSUE FOUND: Dashboard returns 0 for all values!');
      } else {
        console.log('\n✅ Dashboard returns non-zero values');
      }
    } catch (error) {
      console.error('❌ Dashboard API Error:', error.response?.data || error.message);
    }
    
    // Step 4: Test Chart API
    console.log('\n\n📈 STEP 4: Test Chart API\n');
    console.log('=' .repeat(80));
    
    try {
      const chartResponse = await axios.get(`${API_BASE}/api/metrics/meters`, {
        params: { timePeriod: 'Today' }
      });
      
      console.log(`Chart API Response for "Today":`);
      console.log(`  Data points: ${chartResponse.data.result?.length || 0}`);
      
      if (chartResponse.data.result && chartResponse.data.result.length > 0) {
        const totalDrop = chartResponse.data.result.reduce((sum, point) => sum + (point.drop || 0), 0);
        const totalCancelled = chartResponse.data.result.reduce((sum, point) => sum + (point.totalCancelledCredits || 0), 0);
        console.log(`  Total Drop: ${totalDrop}`);
        console.log(`  Total Cancelled: ${totalCancelled}`);
        console.log(`  Total Gross: ${totalDrop - totalCancelled}`);
        
        console.log(`\n  Sample data points:`);
        chartResponse.data.result.slice(0, 3).forEach((point, i) => {
          console.log(`    ${i + 1}. ${point.day} ${point.time} - Drop: ${point.drop}, Cancelled: ${point.totalCancelledCredits}`);
        });
      } else {
        console.log('⚠️  ISSUE: Chart returns no data points!');
      }
    } catch (error) {
      console.error('❌ Chart API Error:', error.response?.data || error.message);
    }
    
    // Step 5: Test Locations API
    console.log('\n\n📍 STEP 5: Test Locations API\n');
    console.log('=' .repeat(80));
    
    try {
      const locationsResponse = await axios.get(`${API_BASE}/api/reports/locations`, {
        params: { timePeriod: 'Today' }
      });
      
      console.log(`Locations API Response for "Today":`);
      console.log(`  Total locations: ${locationsResponse.data.data?.length || 0}`);
      
      if (locationsResponse.data.data && locationsResponse.data.data.length > 0) {
        const totalMoneyIn = locationsResponse.data.data.reduce((sum, loc) => sum + (loc.moneyIn || 0), 0);
        const totalMoneyOut = locationsResponse.data.data.reduce((sum, loc) => sum + (loc.moneyOut || 0), 0);
        console.log(`  Total Money In: ${totalMoneyIn}`);
        console.log(`  Total Money Out: ${totalMoneyOut}`);
        console.log(`  Total Gross: ${totalMoneyIn - totalMoneyOut}`);
        
        console.log(`\n  Sample locations:`);
        locationsResponse.data.data.slice(0, 3).forEach((loc, i) => {
          console.log(`    ${i + 1}. ${loc.locationName}: MoneyIn=${loc.moneyIn}, MoneyOut=${loc.moneyOut}, Gross=${loc.gross}`);
        });
      } else {
        console.log('⚠️  ISSUE: Locations returns no data!');
      }
    } catch (error) {
      console.error('❌ Locations API Error:', error.response?.data || error.message);
    }
    
    // Step 6: Test Cabinets API
    console.log('\n\n🎰 STEP 6: Test Cabinets API\n');
    console.log('=' .repeat(80));
    
    try {
      const cabinetsResponse = await axios.get(`${API_BASE}/api/machines/aggregation`, {
        params: { timePeriod: 'Today' }
      });
      
      console.log(`Cabinets API Response for "Today":`);
      console.log(`  Total machines: ${cabinetsResponse.data.data?.length || 0}`);
      
      if (cabinetsResponse.data.data && cabinetsResponse.data.data.length > 0) {
        const totalMoneyIn = cabinetsResponse.data.data.reduce((sum, machine) => sum + (machine.moneyIn || 0), 0);
        const totalMoneyOut = cabinetsResponse.data.data.reduce((sum, machine) => sum + (machine.moneyOut || 0), 0);
        console.log(`  Total Money In: ${totalMoneyIn}`);
        console.log(`  Total Money Out: ${totalMoneyOut}`);
        console.log(`  Total Gross: ${totalMoneyIn - totalMoneyOut}`);
        
        console.log(`\n  Sample machines:`);
        cabinetsResponse.data.data.slice(0, 3).forEach((machine, i) => {
          console.log(`    ${i + 1}. ${machine.serialNumber}: MoneyIn=${machine.moneyIn}, MoneyOut=${machine.moneyOut}, Gross=${machine.gross}`);
        });
      } else {
        console.log('⚠️  ISSUE: Cabinets returns no data!');
      }
    } catch (error) {
      console.error('❌ Cabinets API Error:', error.response?.data || error.message);
    }
    
    // Step 7: Summary
    console.log('\n\n📋 INVESTIGATION SUMMARY\n');
    console.log('=' .repeat(80));
    console.log('\nExpected Gaming Day Range (UTC):');
    console.log(`  ${utcStart.toISOString()} → ${utcEnd.toISOString()}`);
    console.log(`\nMeter Data: ${meterCount > 0 ? '✅ EXISTS' : '❌ MISSING'} (${meterCount} records)`);
    console.log('\nNext Steps:');
    if (meterCount === 0) {
      console.log('  1. Check if meter data is being collected');
      console.log('  2. Check if SMIB devices are online and sending data');
      console.log('  3. Verify meter sync is working');
    } else {
      console.log('  1. Check if getDatesForTimePeriod() is calculating correct date range');
      console.log('  2. Check if gaming day offset is being applied correctly in APIs');
      console.log('  3. Compare DB totals with API responses');
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  } finally {
    await client.close();
  }
}

// Run investigation
investigateTodayData().then(() => {
  console.log('\n✅ Investigation complete!\n');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

