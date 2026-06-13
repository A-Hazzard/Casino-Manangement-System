import 'dotenv/config';
import mongoose from 'mongoose';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;

  const machineId = '6a0b3e15ad874aa2e816fbc5';

  // Simulate what the API does
  // 1. Find sample bill
  const sampleBill = await db.collection('acceptedbills').findOne({ machine: machineId });
  console.log('Sample bill _id:', sampleBill?._id);
  console.log('Sample bill has value:', sampleBill && 'value' in sampleBill && sampleBill.value !== undefined);
  console.log('Sample bill value:', sampleBill?.value);
  console.log('Sample bill has movement:', sampleBill?.movement ? true : false);
  console.log('Sample bill movement exists:', sampleBill && typeof sampleBill.movement === 'object');
  console.log('Sample bill value === undefined:', sampleBill && sampleBill.value === undefined);

  // V2 detection (from route)
  const isV2 = sampleBill &&
    sampleBill.movement &&
    typeof sampleBill.movement === 'object' &&
    sampleBill.value === undefined;
  console.log('isV2:', isV2);

  // 2. If V2, query with readAt filter (All Time = no filter)
  const bills = await db.collection('acceptedbills').find({
    machine: machineId,
  }).toArray();
  console.log('All Time bill count:', bills.length);

  // 3. Check a V2 bill structure
  const firstBill = bills[0];
  console.log('\nFirst bill keys:', Object.keys(firstBill));
  console.log('movement sample:', JSON.stringify(firstBill.movement));

  // Check billMeters on machine
  const machine = await db.collection('machines').findOne(
    { _id: machineId },
    { projection: { billMeters: 1 } }
  );
  console.log('\nMachine billMeters:', JSON.stringify(machine?.billMeters));

  await mongoose.disconnect();
}

main().catch(console.error);
