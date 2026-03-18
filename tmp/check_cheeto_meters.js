
const mongoose = require('mongoose');

async function checkMeters() {
  await mongoose.connect('mongodb://sunny1:87ydaiuhdsia2e@147.182.210.65:32017/sas-prod?authSource=admin');
  
  // Find a machine in Cheeto's Hotspot (Location ID from screenshot: maybe I can find it)
  // Cheeto's Hotspot name search
  const loc = await mongoose.connection.db.collection('gaminglocations').findOne({ name: /Cheeto/i });
  if (!loc) {
    console.log("Cheeto's not found");
    return;
  }
  console.log("Location:", loc.name, loc._id.toString());

  const machine = await mongoose.connection.db.collection('machines').findOne({ gamingLocation: loc._id.toString(), isSasMachine: true });
  if (!machine) {
     const anyMachine = await mongoose.connection.db.collection('machines').findOne({ gamingLocation: loc._id.toString() });
     console.log("No SAS machine, any machine:", anyMachine?.name);
  } else {
    console.log("Machine:", machine.name, "SAS Meters:", JSON.stringify(machine.sasMeters, null, 2));
  }

  // Also check the latest Meter document for this machine
  if (machine) {
    const meter = await mongoose.connection.db.collection('meters').findOne(
      { machine: machine._id },
      { sort: { readAt: -1 } }
    );
    console.log("Latest Meter:", JSON.stringify(meter, null, 2));
    
    if (meter && meter.totalCancelledCredits !== undefined && meter.jackpot !== undefined) {
       console.log("Total Cancelled:", meter.totalCancelledCredits);
       console.log("Jackpot:", meter.jackpot);
       console.log("Sum:", meter.totalCancelledCredits + meter.jackpot);
    }
  }

  await mongoose.disconnect();
}

checkMeters();
