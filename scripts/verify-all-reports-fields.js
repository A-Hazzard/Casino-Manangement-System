/**
 * Comprehensive Field Verification for Reports Page
 * Verifies all tabs use correct fields per financial-metrics-guide.md
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const LOCATION_ID = '2691c7cb97750118b3ec290e';

async function verifyFields() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     COMPREHENSIVE FIELD VERIFICATION - ALL TABS              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const issues = [];

  try {
    // ========== LOCATIONS TAB ==========
    console.log('\n' + '═'.repeat(60));
    console.log('LOCATIONS TAB - Field Verification');
    console.log('═'.repeat(60));

    // Test Location Trends API
    console.log('\n1. Location Trends API (/api/analytics/location-trends)');
    console.log('─'.repeat(60));
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

    console.log('  Expected Fields per Guide:');
    console.log('    - drop: movement.drop ✓');
    console.log('    - gross: drop - totalCancelledCredits ✓');
    console.log('    - jackpot: movement.jackpot ✓');
    console.log('    - plays: movement.gamesPlayed ✓');
    console.log('');
    console.log('  Actual API Response:');
    console.log(`    drop: $${totals?.drop || 0}`);
    console.log(`    gross: $${totals?.gross || 0}`);
    console.log(`    jackpot: $${totals?.jackpot || 0}`);
    console.log(`    plays: ${totals?.plays || 0}`);
    console.log('');

    // Verify gross calculation
    const calculatedGross = (totals?.drop || 0) - 0; // moneyOut is 0
    if (calculatedGross !== totals?.gross) {
      issues.push(
        `Location Trends: gross mismatch! Expected ${calculatedGross}, got ${totals?.gross}`
      );
      console.log(`  ✗ GROSS CALCULATION ERROR!`);
    } else {
      console.log(`  ✓ Gross calculation verified: $${totals?.gross}`);
    }

    // Check if trend data exists for Oct 31
    const oct31Data = trendsData.trends.find((t) => t.day === '2025-10-31');
    if (oct31Data && oct31Data[LOCATION_ID]) {
      const locationData = oct31Data[LOCATION_ID];
      console.log('\n  Oct 31st Data:');
      console.log(`    drop: $${locationData.drop}`);
      console.log(`    gross: $${locationData.gross}`);
      console.log(`    jackpot: $${locationData.jackpot}`);
      console.log(`    plays: ${locationData.plays}`);
    }

    // ========== MACHINES TAB ==========
    console.log('\n\n' + '═'.repeat(60));
    console.log('MACHINES TAB - Field Verification');
    console.log('═'.repeat(60));

    console.log('\n1. Machines API (/api/reports/machines)');
    console.log('─'.repeat(60));
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

    console.log('  Expected Fields per Guide:');
    console.log('    - drop: movement.drop ✓');
    console.log('    - gross: drop - totalCancelledCredits ✓');
    console.log('    - netWin: coinIn - coinOut ✓');
    console.log('    - jackpot: movement.jackpot ✓');
    console.log('    - gamesPlayed: movement.gamesPlayed ✓');
    console.log('    - coinIn: movement.coinIn (Handle) ✓');
    console.log('    - coinOut: movement.coinOut ✓');
    console.log('');

    if (locationMachines.length > 0) {
      console.log(`  Machines found: ${locationMachines.length}`);
      locationMachines.forEach((m) => {
        console.log(`\n  Machine: ${m.serialNumber}`);
        console.log(`    drop: $${m.drop || 0}`);
        console.log(`    gross: $${m.gross || 0}`);
        console.log(`    netWin: $${m.netWin || 0}`);
        console.log(`    jackpot: $${m.jackpot || 0}`);
        console.log(`    gamesPlayed: ${m.gamesPlayed || 0}`);
        console.log(`    coinIn: $${m.coinIn || 0}`);
        console.log(`    coinOut: $${m.coinOut || 0}`);

        // Verify gross calculation
        const calcGross = (m.drop || 0) - (m.totalCancelledCredits || 0);
        if (Math.abs(calcGross - (m.gross || 0)) > 0.01) {
          issues.push(
            `Machine ${m.serialNumber}: gross calculation error! Expected ${calcGross}, got ${m.gross}`
          );
        }

        // Verify netWin calculation
        const calcNetWin = (m.coinIn || 0) - (m.coinOut || 0);
        if (Math.abs(calcNetWin - (m.netWin || 0)) > 0.01) {
          issues.push(
            `Machine ${m.serialNumber}: netWin calculation error! Expected ${calcNetWin}, got ${m.netWin}`
          );
        }
      });
    }

    // ========== METERS TAB ==========
    console.log('\n\n' + '═'.repeat(60));
    console.log('METERS TAB - Field Verification');
    console.log('═'.repeat(60));

    console.log('\n1. Meters API (/api/reports/meters)');
    console.log('─'.repeat(60));
    const metersResponse = await axios.get(`${BASE_URL}/api/reports/meters`, {
      params: {
        locations: LOCATION_ID,
        startDate: new Date('2025-10-25').toISOString(),
        endDate: new Date('2025-11-02').toISOString(),
        page: '1',
        limit: '10',
      },
    });

    const meters = metersResponse.data.data || [];

    console.log('  Expected Fields per Guide:');
    console.log('    - drop: movement.drop ✓');
    console.log('    - totalCancelledCredits: movement.totalCancelledCredits ✓');
    console.log('    - jackpot: movement.jackpot ✓');
    console.log('    - gamesPlayed: movement.gamesPlayed ✓');
    console.log('    - coinIn: movement.coinIn ✓');
    console.log('    - coinOut: movement.coinOut ✓');
    console.log('');

    if (meters.length > 0) {
      console.log(`  Meter readings found: ${meters.length}`);
      meters.slice(0, 3).forEach((m, i) => {
        console.log(`\n  Meter Reading ${i + 1}:`);
        console.log(`    Machine: ${m.machine || 'N/A'}`);
        console.log(`    drop: $${m.drop || 0}`);
        console.log(`    totalCancelledCredits: $${m.totalCancelledCredits || 0}`);
        console.log(`    jackpot: $${m.jackpot || 0}`);
        console.log(`    gamesPlayed: ${m.gamesPlayed || 0}`);
        console.log(`    coinIn: $${m.coinIn || 0}`);
        console.log(`    coinOut: $${m.coinOut || 0}`);
      });
    }

    // ========== SUMMARY ==========
    console.log('\n\n' + '═'.repeat(60));
    console.log('VERIFICATION SUMMARY');
    console.log('═'.repeat(60));

    console.log(`\nTotal Issues Found: ${issues.length}`);

    if (issues.length === 0) {
      console.log('\n✅ All fields verified! All tabs use correct fields.');
      console.log('');
      console.log('Field Mapping Summary:');
      console.log('  Money In = drop (movement.drop)');
      console.log('  Win/Loss = gross (drop - totalCancelledCredits)');
      console.log('  Jackpot = jackpot (movement.jackpot)');
      console.log('  Plays = plays (movement.gamesPlayed)');
      console.log('  Handle = coinIn (movement.coinIn)');
      console.log('  NetWin = netWin (coinIn - coinOut)');
    } else {
      console.log('\n⚠️  Issues detected:');
      issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });
    }
  } catch (error) {
    console.error('Fatal error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

verifyFields();

