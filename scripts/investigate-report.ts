import mongoose from 'mongoose';
import { Collections } from '../app/api/lib/models/collections';

const MONGODB_URI = 'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-aaron?authSource=admin';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Successfully connected to MongoDB.');

  const machineId = '6a0b3e15ad874aa2e816fbc5';
  const cols = await Collections.find({ machineId }).sort({ timestamp: 1 }).lean();

  console.log(`Found ${cols.length} collections for machine ${machineId}:`);
  cols.forEach((c, idx) => {
    console.log(`[${idx}] _id=${c._id} locationReportId=${c.locationReportId} timestamp=${new Date(c.timestamp).toISOString()} isCompleted=${c.isCompleted}`);
    console.log(`    meters: In=${c.metersIn} Out=${c.metersOut} PrevIn=${c.prevIn} PrevOut=${c.prevOut}`);
    console.log(`    movement:`, c.movement);
    console.log(`    sasMeters:`, c.sasMeters);
  });

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error in script:', err);
  mongoose.disconnect();
});
