import mongoose from 'mongoose';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-tunapuna?authSource=admin';

const BATCH_SIZE = 100;

const defaultSasMeters = {
  drop: 0,
  totalCancelledCredits: 0,
  gamesPlayed: 0,
  moneyOut: 0,
  slotDoorOpened: 0,
  powerReset: 0,
  totalHandPaidCancelledCredits: 0,
  coinIn: 0,
  coinOut: 0,
  totalWonCredits: 0,
  jackpot: 0,
  currentCredits: 0,
  gamesWon: 0,
};

async function backfillSasMeters() {
  console.log('🔄 Connecting to MongoDB...');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    if (!db) {
      console.error('❌ Database connection not established');
      process.exit(1);
    }

    const machinesCollection = db.collection('machines');
    const totalMachines = await machinesCollection.countDocuments();

    console.log(`📊 Found ${totalMachines} total machines to check\n`);

    const cursor = machinesCollection
      .find(
        {},
        {
          projection: {
            _id: 1,
            sasMeters: 1,
            serialNumber: 1,
            'custom.name': 1,
          },
        }
      )
      .batchSize(BATCH_SIZE);

    let checked = 0;
    let updated = 0;

    for await (const machine of cursor) {
      checked++;
      let needsUpdate = false;

      const currentSasMeters = machine.sasMeters || {};
      const setFields: Record<string, number> = {};

      // Check each field in the default list
      for (const [key, defaultValue] of Object.entries(defaultSasMeters)) {
        // Only default to 0 if the field is completely missing (undefined or null)
        if (
          currentSasMeters[key] === undefined ||
          currentSasMeters[key] === null
        ) {
          setFields[`sasMeters.${key}`] = defaultValue;
          needsUpdate = true;
        }
      }

      const machineLabel = `[${machine._id}] "${machine.custom?.name ?? 'N/A'}" (S/N: ${machine.serialNumber ?? 'N/A'})`;

      if (needsUpdate) {
        console.log(
          `\n── Machine ${checked}/${totalMachines}: ${machineLabel}`
        );
        console.log(
          `   BEFORE sasMeters:`,
          JSON.stringify(currentSasMeters, null, 2)
        );

        await machinesCollection.updateOne(
          { _id: machine._id },
          { $set: setFields }
        );
        updated++;

        // Build the after state by merging existing + applied defaults
        const afterSasMeters = { ...currentSasMeters };
        for (const [dotKey, value] of Object.entries(setFields)) {
          const fieldName = dotKey.replace('sasMeters.', '');
          afterSasMeters[fieldName] = value;
        }
        console.log(
          `   AFTER  sasMeters:`,
          JSON.stringify(afterSasMeters, null, 2)
        );

        // Show which fields were backfilled
        const backfilledKeys = Object.keys(setFields).map(key =>
          key.replace('sasMeters.', '')
        );
        console.log(`   ⚡ Backfilled fields: ${backfilledKeys.join(', ')}`);
      } else {
        console.log(
          `✔ Machine ${checked}/${totalMachines}: ${machineLabel} — already complete, skipped`
        );
      }
    }

    console.log(`\n🎉 Backfill complete!`);
    console.log(`Total Checked: ${checked}`);
    console.log(`Total Updated: ${updated}`);
  } catch (error) {
    console.error('❌ Error during backfill:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

backfillSasMeters();
