import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  const report = await db.collection('collectionreports').findOne({
    locationReportId: '77831731-f105-4aeb-a5ca-09b7132ee65b',
  });
  console.log('=== REPORT ===');
  console.log('sasStartTime:', report?.sasStartTime);
  console.log('sasEndTime:', report?.sasEndTime);

  const col = await db.collection('collections').findOne({
    locationReportId: '77831731-f105-4aeb-a5ca-09b7132ee65b',
  });
  if (col?.sasMeters) {
    console.log('\n=== COLLECTION sasMeters ===');
    console.log('sasStartTime:', col.sasMeters.sasStartTime);
    console.log('sasEndTime:', col.sasMeters.sasEndTime);
    console.log('new Date(sasStartTime):', new Date(col.sasMeters.sasStartTime).toISOString());
    console.log('new Date(sasEndTime):', new Date(col.sasMeters.sasEndTime).toISOString());
  }
  console.log('timestamp:', col?.timestamp);

  const lastSmibMeter = await db
    .collection('meters')
    .find(
      {
        machine: '6a0b3e15ad874aa2e816fbc5',
        meterSource: { $ne: 'COLLECTION_REPORT' },
      },
      { projection: { readAt: 1, movement: 1 } }
    )
    .sort({ readAt: -1 })
    .limit(1)
    .toArray();

  if (lastSmibMeter[0]) {
    console.log('\n=== LAST SMIB METER ===');
    console.log('readAt:', lastSmibMeter[0].readAt);
    console.log('readAt ISO:', new Date(lastSmibMeter[0].readAt).toISOString());
    console.log('movement:', JSON.stringify(lastSmibMeter[0].movement));
  }

  // Also get SMIB meters around the boundary
  const boundaryMeters = await db
    .collection('meters')
    .find(
      {
        machine: '6a0b3e15ad874aa2e816fbc5',
        meterSource: { $ne: 'COLLECTION_REPORT' },
        readAt: {
          $gte: new Date('2026-06-12T20:50:00.000Z'),
          $lte: new Date('2026-06-12T21:00:00.000Z'),
        },
      },
      { projection: { readAt: 1, movement: 1 } }
    )
    .sort({ readAt: 1 })
    .toArray();

  console.log('\n=== SMIB METERS NEAR BOUNDARY (20:50-21:00 UTC) ===');
  for (const m of boundaryMeters) {
    console.log(
      `  readAt=${new Date(m.readAt).toISOString()}  drop=${m.movement?.drop ?? 0}  cancelled=${m.movement?.totalCancelledCredits ?? 0}`
    );
  }

  await mongoose.disconnect();
}

main().catch(console.error);
