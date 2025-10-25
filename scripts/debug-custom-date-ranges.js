const { MongoClient } = require('mongodb');

const MONGODB_URI =
  'mongodb://sunny1:87ydaiuhdsia2e@192.168.8.2:32018/sas-prod-local?authSource=admin';

async function debugCustomDateRanges() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    const machineId = '5769366190e560cdab9b8e51';

    // User inputs
    const startDateStr = '2025-10-15';
    const endDateStr = '2025-10-16';

    console.log('🔍 Debugging Custom Date Range Queries');
    console.log(`User Input: ${startDateStr} to ${endDateStr}\n`);

    // How the APIs interpret these dates
    const customStart = new Date(startDateStr);
    const customEnd = new Date(endDateStr);

    console.log('📅 Date Conversion:');
    console.log(`   customStart: ${customStart.toISOString()}`);
    console.log(`   customEnd: ${customEnd.toISOString()}\n`);

    // Query accepted bills with this range
    const bills = await db
      .collection('acceptedbills')
      .find({
        machine: machineId,
        readAt: { $gte: customStart, $lte: customEnd },
      })
      .sort({ readAt: -1 })
      .toArray();

    console.log('📊 ACCEPTED BILLS (Bill Validator):');
    console.log(`   Bills found: ${bills.length}`);

    if (bills.length > 0) {
      let total = 0;
      console.log('   Bills:');
      bills.forEach((bill, index) => {
        const movement = bill.movement;
        let billTotal = 0;
        if (movement) {
          const denoms = [
            { key: 'dollar1', value: 1 },
            { key: 'dollar5', value: 5 },
            { key: 'dollar10', value: 10 },
            { key: 'dollar20', value: 20 },
            { key: 'dollar50', value: 50 },
            { key: 'dollar100', value: 100 },
          ];
          denoms.forEach(({ key, value }) => {
            const qty = movement[key] || 0;
            billTotal += qty * value;
          });
        }
        total += billTotal;
        console.log(
          `     ${
            index + 1
          }. readAt: ${bill.readAt.toISOString()}, amount: $${billTotal}`
        );
      });
      console.log(`   Total: $${total}\n`);
    }

    // Query meters with this range
    const meters = await db
      .collection('meters')
      .find({
        machine: machineId,
        readAt: { $gte: customStart, $lte: customEnd },
      })
      .sort({ readAt: -1 })
      .toArray();

    console.log('📊 METERS (Metrics API):');
    console.log(`   Meters found: ${meters.length}`);

    if (meters.length > 0) {
      let total = 0;
      console.log('   Meters:');
      meters.forEach((meter, index) => {
        const drop = meter.movement?.drop || 0;
        total += drop;
        console.log(
          `     ${
            index + 1
          }. readAt: ${meter.readAt.toISOString()}, drop: $${drop}`
        );
      });
      console.log(`   Total Money In: $${total}\n`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

debugCustomDateRanges().catch(console.error);
