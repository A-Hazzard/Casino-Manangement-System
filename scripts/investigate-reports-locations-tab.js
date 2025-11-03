/**
 * Investigate Reports Page - Locations Tab
 * Tests all three sub-tabs: Overview, SAS Evaluation, Revenue Analysis
 */

const { MongoClient } = require('mongodb');
const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';
const uri = process.env.MONGO_URI;

async function investigateLocationsTab() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     REPORTS PAGE - LOCATIONS TAB INVESTIGATION               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME);

    // Check what data exists in database
    console.log('=== DATABASE DATA CHECK ===\n');

    const locations = await db.collection('gaminglocations')
      .find({
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } }
        ]
      })
      .toArray();

    console.log(`Total locations: ${locations.length}`);
    locations.forEach(loc => {
      console.log(`  - ${loc.name} (ID: ${loc._id})`);
      console.log(`    Licensee: ${loc.rel?.licencee || 'NULL'}`);
      console.log(`    Country: ${loc.country || 'NULL'}`);
    });

    // Check meters data
    console.log('\n=== METERS DATA (Last 7 Days) ===\n');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const meters = await db.collection('meters')
      .find({
        readAt: { $gte: sevenDaysAgo }
      })
      .toArray();

    console.log(`Total meters in last 7 days: ${meters.length}`);

    // Group by location
    const metersByLocation = {};
    meters.forEach(meter => {
      if (!metersByLocation[meter.location]) {
        metersByLocation[meter.location] = {
          count: 0,
          totalDrop: 0,
          totalCancelled: 0,
        };
      }
      metersByLocation[meter.location].count++;
      metersByLocation[meter.location].totalDrop += meter.movement?.drop || 0;
      metersByLocation[meter.location].totalCancelled += meter.movement?.totalCancelledCredits || 0;
    });

    for (const [locationId, data] of Object.entries(metersByLocation)) {
      const location = locations.find(l => l._id.toString() === locationId);
      console.log(`\n  Location: ${location?.name || locationId}`);
      console.log(`    Meters count: ${data.count}`);
      console.log(`    Total Drop: ${data.totalDrop}`);
      console.log(`    Total Cancelled: ${data.totalCancelled}`);
      console.log(`    Gross: ${data.totalDrop - data.totalCancelled}`);
    }

    // Test API calls
    console.log('\n=== API TESTING ===\n');

    const tests = [
      {
        name: 'Overview Tab (locationAggregation)',
        url: '/api/locationAggregation',
        params: { timePeriod: '7d', licencee: '', currency: 'USD', clearCache: 'true' },
      },
      {
        name: 'SAS Evaluation (reports/locations)',
        url: '/api/reports/locations',
        params: { timePeriod: '7d', licensee: '', currency: 'USD', showAllLocations: 'true' },
      },
      {
        name: 'Revenue Analysis (locationAggregation)',
        url: '/api/locationAggregation',
        params: { timePeriod: '7d', licencee: '', currency: 'USD', showAllLocations: 'true', clearCache: 'true' },
      },
    ];

    for (const test of tests) {
      console.log(`\n--- ${test.name} ---`);
      try {
        const queryString = new URLSearchParams(test.params).toString();
        const response = await axios.get(`${BASE_URL}${test.url}?${queryString}`);
        
        const data = response.data;
        const locations = data.data || data.locations || data;
        
        if (Array.isArray(locations)) {
          console.log(`  ✓ Returned ${locations.length} location(s)`);
          if (locations.length > 0) {
            const firstLoc = locations[0];
            console.log(`  First location: ${firstLoc.locationName || firstLoc.name}`);
            console.log(`    Money In: ${firstLoc.moneyIn || firstLoc.totalDrop || 0}`);
            console.log(`    Money Out: ${firstLoc.moneyOut || firstLoc.cancelledCredits || 0}`);
            console.log(`    Gross: ${firstLoc.gross || 0}`);
          }
        } else {
          console.log(`  ⚠ Unexpected data structure:`, typeof locations);
        }
      } catch (error) {
        console.log(`  ✗ ERROR: ${error.response?.data?.error || error.message}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

investigateLocationsTab();

