const mongoose = require('mongoose');

async function testDetectionGlobal() {
  try {
    await mongoose.connect('mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:30717/sas-dev?authSource=admin');
    console.log('Connected to database');
    
    // Test the actual API endpoint with globalScan=true
    console.log(`🌐 Testing the check-all-issues API endpoint with globalScan=true...`);
    
    const response = await fetch(`http://localhost:3000/api/collection-reports/check-all-issues?globalScan=true`);
    const data = await response.json();
    
    console.log(`API Response:`, JSON.stringify(data, null, 2));
    
    // Also test without globalScan (should default to true)
    console.log(`\n🌐 Testing the check-all-issues API endpoint without globalScan parameter...`);
    
    const response2 = await fetch(`http://localhost:3000/api/collection-reports/check-all-issues`);
    const data2 = await response2.json();
    
    console.log(`API Response 2:`, JSON.stringify(data2, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testDetectionGlobal();
