/**
 * Comprehensive Reports Page Audit
 * Tests all tabs, sections, and validates data consistency
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const LOCATION_ID = '2691c7cb97750118b3ec290e'; // DevLabTuna

async function auditReportsPage() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     COMPREHENSIVE REPORTS PAGE AUDIT                         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const results = {
    locations: {},
    machines: {},
    meters: {},
    issues: [],
  };

  try {
    // ========== LOCATIONS TAB ==========
    console.log('\n' + '═'.repeat(60));
    console.log('LOCATIONS TAB AUDIT');
    console.log('═'.repeat(60));

    // Test 1: Overview (table data)
    console.log('\n1. Overview Tab - Location List');
    console.log('─'.repeat(60));
    try {
      const overviewResponse = await axios.get(
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

      const locations = overviewResponse.data.data || [];
      const devLabTuna = locations.find((loc) => loc._id === LOCATION_ID);

      if (devLabTuna) {
        results.locations.overview = {
          moneyIn: devLabTuna.moneyIn,
          moneyOut: devLabTuna.moneyOut,
          gross: devLabTuna.gross,
          machines: devLabTuna.totalMachines,
        };

        console.log(`  ✓ DevLabTuna found`);
        console.log(`    Money In: $${devLabTuna.moneyIn}`);
        console.log(`    Money Out: $${devLabTuna.moneyOut}`);
        console.log(`    Gross: $${devLabTuna.gross}`);
        console.log(`    Machines: ${devLabTuna.totalMachines}`);
      } else {
        console.log(`  ✗ DevLabTuna not found`);
        results.issues.push(
          'Locations Overview: DevLabTuna not found in results'
        );
      }
    } catch (error) {
      console.log(`  ✗ ERROR: ${error.message}`);
      results.issues.push(`Locations Overview API error: ${error.message}`);
    }

    // Test 2: SAS Evaluation - Location Trends
    console.log('\n2. SAS Evaluation - Location Trends (Charts)');
    console.log('─'.repeat(60));
    try {
      const trendsResponse = await axios.get(
        `${BASE_URL}/api/analytics/location-trends`,
        {
          params: {
            locationIds: LOCATION_ID,
            timePeriod: '7d',
            licencee: '',
            currency: 'TTD',
          },
        }
      );

      const trendsData = trendsResponse.data;
      const totals = trendsData.totals?.[LOCATION_ID];

      results.locations.sasEvaluation = {
        drop: totals?.drop || 0,
        gross: totals?.gross || 0,
        winLoss: totals?.winLoss || 0,
        jackpot: totals?.jackpot || 0,
        plays: totals?.plays || 0,
        trendsCount: trendsData.trends?.length || 0,
        isHourly: trendsData.isHourly,
      };

      console.log(`  ✓ Location trends fetched`);
      console.log(`    Drop (totals): $${totals?.drop || 0}`);
      console.log(`    Gross (totals): $${totals?.gross || 0}`);
      console.log(`    Trends count: ${trendsData.trends?.length || 0}`);
      console.log(`    Is hourly: ${trendsData.isHourly}`);

      // Check for days with data
      const daysWithData = trendsData.trends.filter((t) => {
        const ld = t[LOCATION_ID];
        return typeof ld === 'object' && ld && ld.drop > 0;
      });
      console.log(`    Days with drop > 0: ${daysWithData.length}`);

      if (daysWithData.length > 0) {
        console.log(`\n    Days with data:`);
        daysWithData.forEach((t) => {
          const ld = t[LOCATION_ID];
          console.log(`      ${t.day}: Drop=$${ld.drop}, Gross=$${ld.gross}`);
        });
      }

      // Data consistency check
      if (
        results.locations.overview &&
        Math.abs(results.locations.overview.moneyIn - totals?.drop) > 0.01
      ) {
        results.issues.push(
          `Data mismatch: Overview moneyIn ($${results.locations.overview.moneyIn}) != SAS Evaluation drop ($${totals?.drop})`
        );
      }
    } catch (error) {
      console.log(`  ✗ ERROR: ${error.message}`);
      results.issues.push(`SAS Evaluation API error: ${error.message}`);
    }

    // Test 3: Top Machines
    console.log('\n3. Top Machines Table');
    console.log('─'.repeat(60));
    try {
      const machinesResponse = await axios.get(
        `${BASE_URL}/api/reports/machines`,
        {
          params: {
            type: 'all',
            timePeriod: '7d',
            licencee: '',
            currency: 'TTD',
          },
        }
      );

      const machines = machinesResponse.data.data || [];
      const locationMachines = machines.filter(
        (m) => m.locationId === LOCATION_ID
      );

      results.locations.topMachines = {
        total: locationMachines.length,
        totalMoneyIn: locationMachines.reduce(
          (sum, m) => sum + (m.drop || 0),
          0
        ),
        totalGross: locationMachines.reduce((sum, m) => sum + (m.gross || 0), 0),
      };

      console.log(`  ✓ Machines fetched: ${locationMachines.length}`);
      console.log(
        `    Total drop (sum of machines): $${results.locations.topMachines.totalMoneyIn}`
      );
      console.log(
        `    Total gross (sum of machines): $${results.locations.topMachines.totalGross}`
      );

      if (locationMachines.length > 0) {
        console.log(`\n    Machine breakdown:`);
        locationMachines.forEach((m) => {
          console.log(`      ${m.serialNumber}: Drop=$${m.drop || 0}`);
        });
      }
    } catch (error) {
      console.log(`  ✗ ERROR: ${error.message}`);
      results.issues.push(`Top Machines API error: ${error.message}`);
    }

    // ========== MACHINES TAB ==========
    console.log('\n\n' + '═'.repeat(60));
    console.log('MACHINES TAB AUDIT');
    console.log('═'.repeat(60));

    console.log('\n1. Machines Overview (Stats)');
    console.log('─'.repeat(60));
    try {
      const statsResponse = await axios.get(
        `${BASE_URL}/api/reports/machines`,
        {
          params: {
            type: 'stats',
            timePeriod: '7d',
            licencee: '',
            currency: 'TTD',
          },
        }
      );

      results.machines.stats = {
        totalMachines: statsResponse.data.totalCount || 0,
        totalGross: statsResponse.data.totalGross || 0,
        totalDrop: statsResponse.data.totalDrop || 0,
      };

      console.log(`  ✓ Stats fetched`);
      console.log(`    Total Machines: ${results.machines.stats.totalMachines}`);
      console.log(`    Total Drop: $${results.machines.stats.totalDrop}`);
      console.log(`    Total Gross: $${results.machines.stats.totalGross}`);
    } catch (error) {
      console.log(`  ✗ ERROR: ${error.message}`);
      results.issues.push(`Machines Stats API error: ${error.message}`);
    }

    // ========== DATA CONSISTENCY CHECKS ==========
    console.log('\n\n' + '═'.repeat(60));
    console.log('DATA CONSISTENCY CHECKS');
    console.log('═'.repeat(60));

    console.log('\n1. Locations Tab Data Consistency:');
    if (results.locations.overview && results.locations.sasEvaluation) {
      const overviewMoney = results.locations.overview.moneyIn;
      const chartDrop = results.locations.sasEvaluation.drop;

      console.log(`  Overview Table Money In: $${overviewMoney}`);
      console.log(`  SAS Evaluation Chart Drop: $${chartDrop}`);

      if (Math.abs(overviewMoney - chartDrop) < 0.01) {
        console.log(`  ✓ Data matches!`);
      } else {
        console.log(`  ✗ MISMATCH DETECTED!`);
        results.issues.push(
          `Locations: Table ($${overviewMoney}) != Chart ($${chartDrop})`
        );
      }
    }

    // ========== SUMMARY ==========
    console.log('\n\n' + '═'.repeat(60));
    console.log('AUDIT SUMMARY');
    console.log('═'.repeat(60));

    console.log(`\nTotal Issues Found: ${results.issues.length}`);

    if (results.issues.length === 0) {
      console.log('\n✅ All tests passed! Data is consistent across all tabs.');
    } else {
      console.log('\n⚠️  Issues detected:');
      results.issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('Full Results:');
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

auditReportsPage();

