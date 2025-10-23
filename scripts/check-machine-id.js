const mongoose = require('mongoose');

async function checkMachineId() {
  try {
    await mongoose.connect('mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:30717/sas-dev?authSource=admin');
    console.log('Connected to database');
    
    const reportId = 'beea91bc-1377-4ce1-8306-1ab85411df32';
    
    // Find collections for this report
    const collections = await mongoose.connection.db.collection('collections').find({
      locationReportId: reportId,
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }]
    }).toArray();
    
    console.log(`📊 Found ${collections.length} collections for this report`);
    
    for (const collection of collections) {
      console.log(`Collection ID: ${collection._id}`);
      console.log(`Machine ID: ${collection.machineId} (type: ${typeof collection.machineId})`);
      console.log(`Machine Name: ${collection.machineName || collection.machineCustomName}`);
      
      // Try to find the machine
      const machine = await mongoose.connection.db.collection('machines').findOne({
        _id: new mongoose.Types.ObjectId(collection.machineId)
      });
      
      if (machine) {
        console.log(`✅ Found machine: ${machine.serialNumber}`);
        console.log(`History entries: ${machine.collectionMetersHistory?.length || 0}`);
      } else {
        console.log(`❌ Machine not found with ObjectId`);
        
        // Try as string
        const machine2 = await mongoose.connection.db.collection('machines').findOne({
          _id: collection.machineId
        });
        
        if (machine2) {
          console.log(`✅ Found machine as string: ${machine2.serialNumber}`);
          console.log(`History entries: ${machine2.collectionMetersHistory?.length || 0}`);
        } else {
          console.log(`❌ Machine not found as string either`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkMachineId();
