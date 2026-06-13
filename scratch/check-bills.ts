import 'dotenv/config';
import mongoose from 'mongoose';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;

  const machineId = '6a0b3e15ad874aa2e816fbc5';

  // Sample latest bills
  const sampleBills = await db
    .collection('acceptedbills')
    .find({ machine: machineId })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

  console.log('=== LATEST 5 ACCEPTED BILLS ===');
  for (const b of sampleBills) {
    console.log(JSON.stringify({
      _id: b._id,
      createdAt: b.createdAt,
      readAt: b.readAt ?? 'MISSING',
      value: b.value,
      hasMovement: !!b.movement,
      movementTotal: b.movement?.dollarTotal,
    }));
  }

  // Count V1 vs V2
  const v1Count = await db
    .collection('acceptedbills')
    .countDocuments({ machine: machineId, value: { $exists: true }, movement: { $exists: false } });

  const v2Count = await db
    .collection('acceptedbills')
    .countDocuments({ machine: machineId, movement: { $exists: true } });

  const mixedCount = await db
    .collection('acceptedbills')
    .countDocuments({ machine: machineId, value: { $exists: true }, movement: { $exists: true } });

  const noValueNoMovement = await db
    .collection('acceptedbills')
    .countDocuments({ machine: machineId, value: { $exists: false }, movement: { $exists: false } });

  console.log('\n=== VERSION BREAKDOWN ===');
  console.log('V1 (value only):', v1Count);
  console.log('V2 (movement only):', v2Count);
  console.log('Mixed (both):', mixedCount);
  console.log('Neither:', noValueNoMovement);
  console.log('Total:', v1Count + v2Count + mixedCount + noValueNoMovement);

  // Check date ranges
  const oldest = await db
    .collection('acceptedbills')
    .find({ machine: machineId })
    .sort({ createdAt: 1 })
    .limit(1)
    .toArray();

  const newest = await db
    .collection('acceptedbills')
    .find({ machine: machineId })
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray();

  if (oldest[0]) console.log('\nOldest createdAt:', oldest[0].createdAt);
  if (newest[0]) console.log('Newest createdAt:', newest[0].createdAt);

  // Check the API route to understand what time period filter might be affecting
  console.log('\n=== MACHINE billMeters ===');
  const machine = await db
    .collection('machines')
    .findOne({ _id: machineId }, { projection: { billMeters: 1, billValidator: 1 } });
  if (machine) {
    console.log('billMeters:', JSON.stringify(machine.billMeters));
    console.log('billValidator:', JSON.stringify(machine.billValidator));
  }

  await mongoose.disconnect();
}

main().catch(console.error);
