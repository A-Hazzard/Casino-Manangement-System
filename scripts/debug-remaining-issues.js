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

async function debugIssues() {
  console.log('🔍 Debugging remaining issues...\n');

  try {
    // Get detailed issues for a specific report
    const reports = [
      '4e36a006-1784-48dd-ad43-b4745fef7c1e',
      '39731fb8-91b8-4d30-9264-e8723999457e',
    ];

    for (const reportId of reports) {
      console.log(`\n📋 Checking report: ${reportId}`);
      console.log('='.repeat(60));

      const response = await makeRequest(
        `/api/collection-report/${reportId}/check-sas-times`
      );
      console.log(`Status: ${response.status}`);

      if (response.status === 200 && response.data.issues) {
        const issues = response.data.issues;
        console.log(`Total issues found: ${issues.length}`);

        // Group issues by type
        const issuesByType = {};
        issues.forEach(issue => {
          const type = issue.type || 'unknown';
          if (!issuesByType[type]) {
            issuesByType[type] = [];
          }
          issuesByType[type].push(issue);
        });

        console.log('\nIssues by type:');
        Object.entries(issuesByType).forEach(([type, typeIssues]) => {
          console.log(`  ${type}: ${typeIssues.length} issues`);

          // Show first few issues of each type
          typeIssues.slice(0, 3).forEach((issue, index) => {
            console.log(
              `    ${index + 1}. Machine: ${
                issue.machineName || issue.machineId
              }`
            );
            console.log(`       Description: ${issue.description}`);
            if (issue.details) {
              console.log(
                `       Details: ${JSON.stringify(issue.details, null, 8)}`
              );
            }
          });

          if (typeIssues.length > 3) {
            console.log(`    ... and ${typeIssues.length - 3} more`);
          }
        });
      } else {
        console.log('❌ Failed to get issues or no issues found');
        console.log('Response:', response.data);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message || error);
  }
}

debugIssues().catch(console.error);
