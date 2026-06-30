import mongoose from 'mongoose';
import { Machine } from '../app/api/lib/models/machines';

const MONGODB_URI = 'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-tunapuna?authSource=admin';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  const total = await Machine.countDocuments({});
  console.log('Total machines in DB (any status):', total);

  const totalWow = await Machine.countDocuments({ 'meta.dataSync.source': 'wow' });
  console.log('Total WOW machines in DB:', totalWow);

  const deletedWow = await Machine.countDocuments({ 'meta.dataSync.source': 'wow', deletedAt: { $ne: null } });
  console.log('Deleted WOW machines in DB:', deletedWow);

  const activeWow = await Machine.countDocuments({
    'meta.dataSync.source': 'wow',
    $or: [
      { deletedAt: null },
      { deletedAt: { $lt: new Date('2025-01-01') } }
    ]
  });
  console.log('Active WOW machines in DB (with 2025 filter):', activeWow);

  const activeWow2026 = await Machine.countDocuments({
    'meta.dataSync.source': 'wow',
    $or: [
      { deletedAt: null },
      { deletedAt: { $lt: new Date('2026-01-01') } }
    ]
  });
  console.log('Active WOW machines in DB (with 2026 filter):', activeWow2026);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
