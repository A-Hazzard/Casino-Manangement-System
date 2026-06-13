import 'dotenv/config';
import mongoose from 'mongoose';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;

  const machineId = '6a0b3e15ad874aa2e816fbc5';

  // Step 1: Find sample bill
  const sampleBill = await db.collection('acceptedbills').findOne({ machine: machineId });
  if (!sampleBill) { console.log('No sample bill found'); return; }
  const isV2 = sampleBill?.movement && typeof sampleBill.movement === 'object' && sampleBill.value === undefined;
  console.log('isV2:', isV2);
  console.log('Movement keys in sample:', Object.keys(sampleBill.movement));
  console.log('First bill value:', sampleBill.value);
  console.log('MeterSource field:', sampleBill.meterSource);

  // Step 2: Query all bills (All Time)
  const bills = await db.collection('acceptedbills').find({ machine: machineId }).sort({ readAt: 1 }).toArray();
  console.log('\nTotal bills:', bills.length);
  console.log('First bill readAt:', bills[0]?.readAt);
  console.log('Last bill readAt:', bills[bills.length - 1]?.readAt);

  // Step 3: Show a few movements to see if they're deltas or totals
  console.log('\n--- Movement dollarTotal over time ---');
  for (let i = 0; i < Math.min(bills.length, 41); i += 5) {
    console.log(`  bill[${i}]: readAt=${bills[i].readAt}  dollarTotal=${bills[i].movement?.dollarTotal}`);
  }
  console.log(`  last: readAt=${bills[bills.length-1].readAt}  dollarTotal=${bills[bills.length-1].movement?.dollarTotal}`);

  // Step 4: Check billValidatorOptions for location  
  const machine = await db.collection('machines').findOne({ _id: machineId });
  if (machine?.gamingLocation) {
    const location = await db.collection('gaminglocations').findOne({ _id: machine.gamingLocation });
    console.log('\nBill validator options:', JSON.stringify(location?.billValidatorOptions));
    console.log('noSMIBLocation:', location?.noSMIBLocation);
  }

  // Step 5: Check if there are bills from before/after the CR time
  const crTime = new Date('2026-06-12T21:43:00.000Z');
  const preCrCount = await db.collection('acceptedbills').countDocuments({
    machine: machineId,
    readAt: { $lte: crTime },
  });
  console.log('\nBills before CR:', preCrCount);
  console.log('Bills after CR:', 41 - preCrCount);

  // Step 6: Check for timestamp format issues
  console.log('\n--- Checking readAt format ---');
  const badDates = await db.collection('acceptedbills').find({
    machine: machineId,
    $or: [
      { readAt: { $type: 'string' } },
      { readAt: { $exists: false } },
    ]
  }).toArray();
  console.log('Bills with bad readAt:', badDates.length);

  await mongoose.disconnect();
}

main().catch(console.error);
