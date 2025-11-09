require('dotenv').config();
const mongoose = require('mongoose');

async function checkLicensee() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const Licensee = mongoose.model('Licensee', new mongoose.Schema({}, { strict: false }), 'licencees');
  
  const licenseeId = '9a5db2cb29ffd2d962fd1d91';
  
  console.log('\n=== DEVLABTUNA LICENSEE ===\n');
  
  const licensee = await Licensee.findOne({ _id: licenseeId }).lean();
  
  if (licensee) {
    console.log('✅ Found Licensee!');
    console.log('Licensee _id:', licensee._id);
    console.log('Licensee Name:', licensee.name);
    console.log('Licensee Details:', JSON.stringify(licensee, null, 2));
  } else {
    console.log('❌ Licensee not found!');
  }
  
  await mongoose.disconnect();
}

checkLicensee().catch(console.error);

