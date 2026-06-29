import mongoose from 'mongoose';
import { Machine } from '../app/api/lib/models/machines';

const MONGODB_URI = 'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-aaron?authSource=admin';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');

  const allMachines = await Machine.find({}).lean();
  console.log('All machines in DB count:', allMachines.length);

  const wowMachines = allMachines.filter(m => m.meta?.dataSync?.source === 'wow');
  console.log('WOW machines in DB filter:', wowMachines.length);

  if (wowMachines.length > 0) {
    console.log('First WOW machine details:', JSON.stringify(wowMachines[0], null, 2));
  } else {
    // Let's print some machines to see what's in there
    console.log('First 3 machines in DB:', JSON.stringify(allMachines.slice(0, 3), null, 2));
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error in script:', err);
  mongoose.disconnect();
});
