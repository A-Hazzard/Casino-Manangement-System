/**
 * Investigate Reports Page - Machines Tab
 * Tests Overview, Offline, and Evaluation sub-tabs
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function investigateMachinesTab() {
  console.log(
    '╔══════════════════════════════════════════════════════════════╗'
  );
  console.log(
    '║     REPORTS PAGE - MACHINES TAB INVESTIGATION                ║'
  );
  console.log(
    '╚══════════════════════════════════════════════════════════════╝\n'
  );

  try {
    const tests = [
      {
        name: 'Overview Tab (Stats)',
        url: '/api/reports/machines',
        params: {
          type: 'stats',
          timePeriod: '7d',
          licencee: '',
          currency: 'USD',
        },
      },
      {
        name: 'Overview Tab (Paginated)',
        url: '/api/reports/machines',
        params: {
          type: 'overview',
          timePeriod: '7d',
          licencee: '',
          page: '1',
          limit: '10',
          currency: 'USD',
        },
      },
      {
        name: 'Offline Machines',
        url: '/api/reports/machines',
        params: {
          type: 'offline',
          timePeriod: '7d',
          licencee: '',
          currency: 'USD',
        },
      },
      {
        name: 'All Machines (Evaluation)',
        url: '/api/reports/machines',
        params: {
          type: 'all',
          timePeriod: '7d',
          licencee: '',
          currency: 'USD',
        },
      },
    ];

    for (const test of tests) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`TEST: ${test.name}`);
      console.log(`${'─'.repeat(60)}`);

      try {
        const queryString = new URLSearchParams(test.params).toString();
        const response = await axios.get(
          `${BASE_URL}${test.url}?${queryString}`
        );

        const data = response.data;

        if (test.params.type === 'stats') {
          console.log(`  Total Machines: ${data.totalCount || 0}`);
          console.log(`  Total Gross: ${data.totalGross || 0}`);
          console.log(`  Total Drop: ${data.totalDrop || 0}`);
          console.log(`  Currency: ${data.currency || 'N/A'}`);
          console.log(`  Converted: ${data.converted || false}`);
        } else {
          const machines = data.data || data.machines || [];
          console.log(`  Machines returned: ${machines.length}`);
          if (machines.length > 0) {
            const totalMoneyIn = machines.reduce(
              (sum, m) => sum + (m.moneyIn || m.drop || 0),
              0
            );
            console.log(`  Total Money In: ${totalMoneyIn.toFixed(2)}`);
            console.log(
              `  First machine: ${machines[0].serialNumber || machines[0]._id}`
            );
          }
        }
      } catch (error) {
        console.log(
          `  ✗ ERROR: ${error.response?.data?.error || error.message}`
        );
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

investigateMachinesTab();
