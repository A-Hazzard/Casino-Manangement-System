/**
 * Investigation Script for Hold Percentage Calculation
 * Checks if the TEST machine should have coinIn data
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const LOCATION_ID = '2691c7cb97750118b3ec290e';

async function investigateHold() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     HOLD PERCENTAGE INVESTIGATION                            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    // Get machines data
    console.log('1. Fetching Machines Data');
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
    const testMachine = machines.find((m) => m.serialNumber === 'TEST');

    if (testMachine) {
      console.log('  TEST Machine Found:');
      console.log(`    Serial Number: ${testMachine.serialNumber}`);
      console.log(`    drop: $${testMachine.drop || 0}`);
      console.log(`    totalCancelledCredits: $${testMachine.totalCancelledCredits || 0}`);
      console.log(`    gross: $${testMachine.gross || 0}`);
      console.log(`    coinIn (Handle): $${testMachine.coinIn || 0}`);
      console.log(`    coinOut: $${testMachine.coinOut || 0}`);
      console.log(`    netWin: $${testMachine.netWin || 0}`);
      console.log(`    gamesPlayed: ${testMachine.gamesPlayed || 0}`);
      console.log(`    actualHold: ${testMachine.actualHold || 0}%`);
      console.log('');

      // Calculate hold using current formula
      const currentHold =
        testMachine.coinIn > 0
          ? ((testMachine.coinIn - testMachine.coinOut) /
              testMachine.coinIn) *
            100
          : 0;

      // Calculate hold using correct formula per guide
      const correctHold =
        testMachine.coinIn > 0
          ? ((testMachine.drop - testMachine.totalCancelledCredits) /
              testMachine.coinIn) *
            100
          : 0;

      console.log('  Formula Comparison:');
      console.log('  ─'.repeat(60));
      console.log('  Current Formula: (coinIn - coinOut) / coinIn * 100');
      console.log(`    = (${testMachine.coinIn} - ${testMachine.coinOut}) / ${testMachine.coinIn} * 100`);
      console.log(`    = ${currentHold.toFixed(2)}%`);
      console.log('');
      console.log('  Correct Formula: (drop - totalCancelledCredits) / coinIn * 100');
      console.log(`    = (${testMachine.drop} - ${testMachine.totalCancelledCredits}) / ${testMachine.coinIn} * 100`);
      console.log(`    = ${correctHold.toFixed(2)}%`);
      console.log('');

      // Analysis
      console.log('  Analysis:');
      console.log('  ─'.repeat(60));
      if (testMachine.coinIn === 0) {
        console.log('  ⚠️  coinIn (Handle) = 0');
        console.log('  ⚠️  No betting activity recorded');
        console.log('  ⚠️  Hold % cannot be calculated (division by zero)');
        console.log('  ℹ️  Hold % should show as N/A or 0.00%');
      } else {
        if (currentHold !== correctHold) {
          console.log('  ✗ MISMATCH DETECTED!');
          console.log(
            `  Current formula gives: ${currentHold.toFixed(2)}%`
          );
          console.log(
            `  Correct formula gives: ${correctHold.toFixed(2)}%`
          );
          console.log('  ✗ Formula needs to be corrected!');
        } else {
          console.log('  ✓ Formulas match!');
        }
      }
    } else {
      console.log('  ✗ TEST machine not found');
    }

    // Check if there's any meter data for this machine
    console.log('\n\n2. Checking Raw Meter Data');
    console.log('─'.repeat(60));
    
    // We need to query the meters collection directly to see if there's any coinIn data
    console.log('  Query Parameters:');
    console.log(`    Location: ${LOCATION_ID}`);
    console.log(`    Machine: TEST`);
    console.log('');
    console.log('  NOTE: This requires direct database access');
    console.log('  The machine has drop=$20 but coinIn=$0');
    console.log('  This suggests:');
    console.log('    - Physical cash was inserted (drop)');
    console.log('    - But no betting activity occurred (coinIn)');
    console.log('    - This is valid for roulette machines in some configurations');
    
  } catch (error) {
    console.error('Fatal error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

investigateHold();

