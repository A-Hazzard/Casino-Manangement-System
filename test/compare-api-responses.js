/**
 * Compare API Responses Script
 * 
 * This script calls both APIs and compares their responses to identify discrepancies.
 */

const http = require('http');

async function callAPI(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Cookie': 'token=your-token-here' // You may need to update this
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

async function compare() {
  try {
    console.log('🔍 Calling Dashboard API...');
    const dashboardResponse = await callAPI('/api/dashboard/totals?timePeriod=Yesterday&currency=USD');
    console.log('✅ Dashboard API Response:', {
      moneyIn: dashboardResponse.moneyIn,
      moneyOut: dashboardResponse.moneyOut,
      gross: dashboardResponse.gross,
      currency: dashboardResponse.currency,
      converted: dashboardResponse.converted
    });

    console.log('\n🔍 Calling Machines Aggregation API...');
    const machinesResponse = await callAPI('/api/machines/aggregation?timePeriod=Yesterday&currency=USD');
    
    // Sum all machines
    const machines = Array.isArray(machinesResponse) ? machinesResponse : (machinesResponse.data || []);
    const machinesTotal = machines.reduce((sum, m) => ({
      moneyIn: sum.moneyIn + (m.moneyIn || 0),
      moneyOut: sum.moneyOut + (m.moneyOut || 0),
      gross: sum.gross + (m.gross || 0),
    }), { moneyIn: 0, moneyOut: 0, gross: 0 });
    
    console.log('✅ Machines Aggregation API Response:', {
      moneyIn: machinesTotal.moneyIn,
      moneyOut: machinesTotal.moneyOut,
      gross: machinesTotal.gross,
      machineCount: machines.length
    });

    console.log('\n📊 COMPARISON:');
    console.log(`   Dashboard Money In: $${dashboardResponse.moneyIn?.toFixed(2) || 'N/A'}`);
    console.log(`   Machines Money In:  $${machinesTotal.moneyIn.toFixed(2)}`);
    console.log(`   Difference:         $${Math.abs((dashboardResponse.moneyIn || 0) - machinesTotal.moneyIn).toFixed(2)}`);

    if (Math.abs((dashboardResponse.moneyIn || 0) - machinesTotal.moneyIn) > 0.01) {
      console.log('\n❌ MISMATCH DETECTED!');
      console.log('\n🔍 Analyzing differences...');
      
      // Group machines by location to see if there's a pattern
      const machinesByLocation = {};
      machines.forEach(m => {
        const locId = m.locationId || 'unknown';
        if (!machinesByLocation[locId]) {
          machinesByLocation[locId] = {
            locationName: m.locationName || 'Unknown',
            machines: [],
            total: { moneyIn: 0, moneyOut: 0, gross: 0 }
          };
        }
        machinesByLocation[locId].machines.push(m);
        machinesByLocation[locId].total.moneyIn += m.moneyIn || 0;
        machinesByLocation[locId].total.moneyOut += m.moneyOut || 0;
        machinesByLocation[locId].total.gross += m.gross || 0;
      });
      
      console.log('\n📋 Machines by Location:');
      Object.entries(machinesByLocation).forEach(([locId, data]) => {
        console.log(`   ${data.locationName}: $${data.total.moneyIn.toFixed(2)} (${data.machines.length} machines)`);
      });
    } else {
      console.log('\n✅ Both APIs return matching totals!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Make sure the dev server is running on port 3000');
    console.error('   and you have a valid authentication token.');
  }
}

compare();

