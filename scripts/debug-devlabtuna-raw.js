require('dotenv').config();
const mongoose = require('mongoose');

async function debugRaw() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  
  const locationId = '2691c7cb97750118b3ec290e';
  const licenseeId = '9a5db2cb29ffd2d962fd1d91';
  
  console.log('\n=== RAW MONGODB QUERIES ===\n');
  
  // Query location directly
  const location = await db.collection('gamingLocations').findOne({ _id: locationId });
  console.log('Location found:', !!location);
  if (location) {
    console.log('Location Name:', location.name);
    console.log('Location Licensee:', location.rel?.licencee);
    console.log('Location Country:', location.country);
  }
  
  // Query licensee directly
  const licensee = await db.collection('licencees').findOne({ _id: licenseeId });
  console.log('\nLicensee found:', !!licensee);
  if (licensee) {
    console.log('Licensee Name:', licensee.name);
  }
  
  // Query country
  if (location) {
    const country = await db.collection('countries').findOne({ _id: location.country });
    console.log('\nCountry found:', !!country);
    if (country) {
      console.log('Country Name:', country.name);
      
      // Check what currency this maps to
      const LICENSEE_CURRENCY = {
        TTG: 'TTD',
        Cabana: 'GYD',
        Barbados: 'BBD',
      };
      
      const COUNTRY_CURRENCY_MAP = {
        'Trinidad and Tobago': 'TTD',
        'Trinidad & Tobago': 'TTD',
        'Trinidad': 'TTD',
        'Guyana': 'GYD',
        'Barbados': 'BBD',
      };
      
      console.log('\n=== CURRENCY CONVERSION LOGIC ===');
      const licenseeCurrency = LICENSEE_CURRENCY[licensee?.name] || 'USD';
      const countryCurrency = COUNTRY_CURRENCY_MAP[country.name] || 'USD';
      
      console.log('Licensee-based currency:', licenseeCurrency);
      console.log('Country-based currency:', countryCurrency);
      
      // When "All Licensees" is selected:
      console.log('\n=== WHEN "ALL LICENSEES" SELECTED ===');
      console.log('1. Gets licensee name:', licensee?.name || 'Unknown');
      console.log('2. Calls convertToUSD(140, "' + (licensee?.name || 'Unknown') + '")');
      console.log('3. getLicenseeCurrency("' + (licensee?.name || 'Unknown') + '") =', licenseeCurrency);
      console.log('4. Conversion: 140 / rate');
      
      const FIXED_RATES = {
        USD: 1.0,
        TTD: 6.75,
        GYD: 207.98,
        BBD: 2.0,
      };
      
      const rate = FIXED_RATES[licenseeCurrency];
      const convertedValue = 140 / rate;
      console.log('5. Result: 140 /', rate, '=', convertedValue);
    }
  }
  
  await mongoose.disconnect();
}

debugRaw().catch(console.error);

