require('dotenv').config();
const mongoose = require('mongoose');

async function checkCountry() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const Location = mongoose.model('Location', new mongoose.Schema({}, { strict: false }), 'gamingLocations');
  const Country = mongoose.model('Country', new mongoose.Schema({}, { strict: false }), 'countries');
  const Licensee = mongoose.model('Licensee', new mongoose.Schema({}, { strict: false }), 'licencees');
  
  const locationId = '2691c7cb97750118b3ec290e';
  
  console.log('\n=== DEVLABTUNA LOCATION DETAILS ===\n');
  
  const location = await Location.findOne({ _id: locationId }).lean();
  
  if (location) {
    console.log('Location Name:', location.name);
    console.log('Location Licensee ID:', location.rel?.licencee);
    console.log('Location Country ID:', location.country);
    
    // Get licensee name
    if (location.rel?.licencee) {
      const licensee = await Licensee.findOne({ _id: location.rel.licencee }).lean();
      console.log('\nLicensee Name:', licensee?.name || 'NOT FOUND');
      console.log('Licensee Full:', JSON.stringify(licensee, null, 2));
    }
    
    // Get country name
    if (location.country) {
      const country = await Country.findOne({ _id: location.country }).lean();
      console.log('\nCountry Name:', country?.name || 'NOT FOUND');
      
      // Check currency mapping
      const COUNTRY_CURRENCY_MAP = {
        'Trinidad and Tobago': 'TTD',
        'Trinidad & Tobago': 'TTD',
        'Trinidad': 'TTD',
        'Guyana': 'GYD',
        'Barbados': 'BBD',
      };
      
      const currency = COUNTRY_CURRENCY_MAP[country?.name] || 'USD';
      console.log('Currency from country:', currency);
    }
  }
  
  await mongoose.disconnect();
}

checkCountry().catch(console.error);

