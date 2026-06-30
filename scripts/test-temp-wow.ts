import mongoose from 'mongoose';
import { Machine } from '../app/api/lib/models/machines';

const MONGODB_URI = 'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-aaron?authSource=admin';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');

  // Create a temporary WOW machine
  const tempWowId = 'temp_wow_test_machine_123';
  await Machine.deleteOne({ _id: tempWowId });

  await Machine.create({
    _id: tempWowId,
    machineId: 'WOW-TEST-01',
    serialNumber: 'WOW-SN-123',
    custom: { name: 'Test WOW Roulette' },
    meta: {
      dataSync: {
        source: 'wow'
      }
    },
    deletedAt: null,
    gamingLocation: 'loc_supplemental_test' // some location
  });

  console.log('Created temporary WOW machine in database.');

  // Test stats logic
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
  console.log('getMachineStats totalCount:', totalCountResult[0]?.total || 0);

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
  console.log('getMachineStats onlineCount:', onlineCountResult[0]?.total || 0);

  // Clean up
  await Machine.deleteOne({ _id: tempWowId });
  console.log('Deleted temporary WOW machine.');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error in script:', err);
  mongoose.disconnect();
});
