const axios = require('axios');

async function test() {
  try {
    const response = await axios.get(
      'http://localhost:3000/api/analytics/location-trends',
      {
        params: {
          locationIds: '2691c7cb97750118b3ec290e',
          timePeriod: '7d',
          currency: 'TTD',
        },
      }
    );
    console.log('Success!');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}

test();

