const axios = require('axios');

async function testIncompleteCollectionsAPI() {
  try {
    console.log('🧪 Testing incomplete collections API...');

    // Test the API endpoint that the UI uses
    const response = await axios.get(
      'http://localhost:3000/api/collections?incompleteOnly=true&_t=' +
        Date.now()
    );

    console.log('📊 API Response Status:', response.status);
    console.log(
      '📊 API Response Data:',
      JSON.stringify(response.data, null, 2)
    );
    console.log('📊 Number of incomplete collections:', response.data.length);

    if (response.data.length > 0) {
      console.log('\n🔍 First incomplete collection:');
      console.log('ID:', response.data[0]._id);
      console.log('Machine:', response.data[0].machineName);
      console.log('Location:', response.data[0].location);
      console.log('IsCompleted:', response.data[0].isCompleted);
      console.log('LocationReportId:', response.data[0].locationReportId);
      console.log('Timestamp:', response.data[0].timestamp);
    }
  } catch (error) {
    console.error(
      '❌ Error testing API:',
      error.response?.data || error.message
    );
  }
}

testIncompleteCollectionsAPI();
