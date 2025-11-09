const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const kibanaLocs = await mongoose.connection.db.collection('gaminglocations').find({ name: /Test-Kibana/ }).toArray();
  const bobbittosLocs = await mongoose.connection.db.collection('gaminglocations').find({ name: /Test-Bobbittos/ }).toArray();
  
  console.log('Kibana locations:', kibanaLocs.length);
  console.log('Bobbittos locations:', bobbittosLocs.length);
  
  const kibanaMachines = await mongoose.connection.db.collection('machines').find({ 
    gamingLocation: { $in: kibanaLocs.map(l => l._id) } 
  }).toArray();
  
  const bobbittosMachines = await mongoose.connection.db.collection('machines').find({ 
    gamingLocation: { $in: bobbittosLocs.map(l => l._id) } 
  }).toArray();
  
  console.log('Kibana machines:', kibanaMachines.length);
  console.log('Bobbittos machines:', bobbittosMachines.length);
  
  await mongoose.connection.close();
});

