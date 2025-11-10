require('dotenv').config();
const axios = require('axios');

async function testAPI() {
  try {
    console.log('\n=== TESTING API DIRECTLY ===\n');
    
    // Test without licensee parameter (what the modal is doing)
    console.log('Test 1: Without licensee parameter');
    const response1 = await axios.get('http://localhost:3000/api/collectionReport?locationsWithMachines=1', {
      headers: {
        'Cookie': 'token=your_token_here' // Would need actual token
      }
    });
    console.log('Locations returned:', response1.data.locations?.length || 0);
    if (response1.data.locations) {
      response1.data.locations.forEach(loc => {
        console.log(`  - ${loc.name} (${loc._id})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAPI().catch(console.error);

