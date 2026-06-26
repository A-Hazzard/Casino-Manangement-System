import mongoose from 'mongoose';
import { Machine } from '../app/api/lib/models/machines';

const MONGODB_URI = 'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-aaron?authSource=admin';

async function main() {
  await mongoose.connect(MONGODB_URI);
  const machines = await Machine.find({}).lean();
  console.log('Total machines:', machines.length);
  machines.forEach(m => {
    console.log(`Machine _id=${m._id} name=${m.custom?.name || m.serialNumber} relayId=${m.relayId} meta=${JSON.stringify(m.meta)}`);
  });
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
