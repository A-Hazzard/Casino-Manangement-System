const http = require('http');

async function makeRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: url,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.end();
  });
}

async function testSingleMachineFix() {
  console.log('🧪 Testing fix for single machine...\n');

  try {
    // First, let's break the data to see if the fix works
    console.log('1. Breaking machine 1309 data...');

    // Reset the machine data to have undefined prevIn/prevOut
    const { MongoClient } = require('mongodb');
    const MONGODB_URI =
      'mongodb://sunny1:87ydaiuhdsia2e@192.168.8.2:32018/sas-prod-local?authSource=admin';
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('sas-prod-local');

    // Reset entry 2 to have undefined prevIn/prevOut
    await db.collection('machines').updateOne(
      { _id: '5769366190e560cdab9b8e51' },
      {
        $set: {
          'collectionMetersHistory.1.prevIn': undefined,
          'collectionMetersHistory.1.prevOut': undefined,
        },
      }
    );
    console.log('   ✅ Reset entry 2 prevIn/prevOut to undefined');

    await client.close();

    // 2. Check that the issue is detected
    console.log('\n2. Checking if issue is detected...');
    const checkResponse = await makeRequest(
      '/api/collection-report/4e36a006-1784-48dd-ad43-b4745fef7c1e/check-sas-times'
    );
    const issue1309 = checkResponse.data.issues?.find(
      issue => issue.machineName === '1309'
    );
    console.log(`   Machine 1309 issues found: ${issue1309 ? '1' : '0'}`);

    // 3. Run the fix for this specific report
    console.log('\n3. Running fix for this report...');
    const fixResponse = await makeRequest(
      '/api/collection-report/4e36a006-1784-48dd-ad43-b4745fef7c1e/fix-collection-history',
      'POST'
    );
    console.log(`   Fix status: ${fixResponse.status}`);
    console.log(`   Fix response:`, fixResponse.data);

    // 4. Check if the issue is resolved
    console.log('\n4. Checking if issue is resolved...');
    const checkResponse2 = await makeRequest(
      '/api/collection-report/4e36a006-1784-48dd-ad43-b4745fef7c1e/check-sas-times'
    );
    const issue1309After = checkResponse2.data.issues?.find(
      issue => issue.machineName === '1309'
    );
    console.log(
      `   Machine 1309 issues after fix: ${issue1309After ? '1' : '0'}`
    );

    if (issue1309After) {
      console.log('   ❌ ISSUE NOT FIXED');
    } else {
      console.log('   ✅ ISSUE FIXED');
    }
  } catch (error) {
    console.error('❌ Error:', error.message || error);
  }
}

testSingleMachineFix().catch(console.error);
