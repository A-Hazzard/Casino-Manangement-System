import mongoose from 'mongoose';

const uri = 'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-aaron?authSource=admin';

async function run() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    if (!db) throw new Error('DB not found');

    // Find the machine
    const machines = await db.collection('machines').find({ 
      $or: [
        { customName: { $regex: /slot hero/i } },
        { name: { $regex: /slot hero/i } },
        { 'custom.name': { $regex: /slot hero/i } },
        { 'machineName': { $regex: /slot hero/i } }
      ]
    }).toArray();

    console.log(`Found ${machines.length} machine(s) matching 'slot hero'`);

    for (const machine of machines) {
      console.log('\n=============================================');
      console.log(`Machine: ${machine.customName || machine.name} (ID: ${machine._id})`);
      console.log(`Location ID: ${machine.gamingLocation}`);
      console.log(`Relay ID: ${machine.relayId}`);
      console.log(`Last SMIB Connection: ${machine.lastActivity || 'Never'}`);
      console.log(`Created At: ${machine.createdAt}`);

      // Check Location
      if (machine.gamingLocation) {
        const location = await db.collection('gaminglocations').findOne({ _id: machine.gamingLocation });
        console.log(`Location Name: ${location?.name} (No SMIB Location? ${location?.noSMIBLocation})`);
      }

      // Check SMIB Config
      const smib = await db.collection('smibconfigs').findOne({ relayId: machine.relayId });
      console.log(`SMIB Config exists: ${!!smib}, Location: ${smib?.locationId}`);

      console.log(`sasMeters:`, machine.sasMeters);
      console.log(`collectionMeters:`, machine.collectionMeters);

      // Check latest meters
      const latestMeters = await db.collection('meters').find({ machine: machine._id.toString() })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();
      
      if (latestMeters.length > 0) {
        console.log(`Latest Meter Timestamp: ${latestMeters[0].timestamp}`);
        console.log(`Latest Meter totalIn: ${latestMeters[0].totalIn}, totalOut: ${latestMeters[0].totalOut}`);
      } else {
        console.log(`No meters found for this machine.`);
      }

      // Check V2 Sessions involving this machine
      const sessions = await db.collection('reportedmachines').find({
        machineId: machine._id.toString()
      })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();

      console.log(`Found ${sessions.length} recent ReportedMachine (V2) records for this machine:`);
      for (const sm of sessions) {
        console.log(`  Session ${sm.sessionId} [${sm.sessionStatus}]`);
        console.log(`    - sasMetersIn: ${sm.sasMetersIn}, sasMetersOut: ${sm.sasMetersOut}`);
        console.log(`    - manualMetersIn: ${sm.manualMetersIn}, manualMetersOut: ${sm.manualMetersOut}`);
        console.log(`    - sasGross: ${sm.sasGross}`);
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
