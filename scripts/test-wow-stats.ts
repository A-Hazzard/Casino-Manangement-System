import mongoose from 'mongoose';
import { Machine } from '../app/api/lib/models/machines';

const MONGODB_URI = 'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-tunapuna?authSource=admin';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Successfully connected to MongoDB.');

  // 1. Total machines
  const totalInDb = await Machine.countDocuments({ deletedAt: null });
  console.log('Total non-deleted machines in DB:', totalInDb);

  // 2. WOW machines
  const wowCount = await Machine.countDocuments({ 'meta.dataSync.source': 'wow', deletedAt: null });
  console.log('WOW machines in DB:', wowCount);

  // Let's inspect one WOW machine
  const oneWow = await Machine.findOne({ 'meta.dataSync.source': 'wow', deletedAt: null }).lean();
  if (oneWow) {
    console.log('One WOW machine:', JSON.stringify(oneWow, null, 2));
  } else {
    console.log('No WOW machines found!');
  }

  // 3. Test stats logic
  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
  const machineMatchStage: any = {
    $or: [
      { deletedAt: null },
      { deletedAt: { $lt: new Date('2025-01-01') } },
    ],
  };

  const aggregationPipeline = [
    { $match: machineMatchStage },
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'gamingLocation',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    { $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true } },
  ];

  const totalCountResult = await Machine.aggregate([
    ...aggregationPipeline,
    { $count: 'total' },
  ]).exec();
  console.log('getMachineStats totalCountResult:', totalCountResult);

  const onlineCountResult = await Machine.aggregate([
    ...aggregationPipeline,
    {
      $match: {
        $or: [
          { 'meta.dataSync.source': 'wow' },
          {
            relayId: { $exists: true, $nin: [null, ''] },
            $or: [
              { lastActivity: { $exists: true, $gte: threeMinutesAgo } },
              { 'locationDetails.aceEnabled': true },
            ],
          },
        ],
      },
    },
    { $count: 'total' },
  ]).exec();
  console.log('getMachineStats onlineCountResult:', onlineCountResult);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error in script:', err);
  mongoose.disconnect();
});
