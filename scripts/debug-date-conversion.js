/**
 * Debug Script: Date Conversion Analysis
 *
 * This script analyzes the date conversion to find why we're getting 13453 instead of 13483
 */

const { MongoClient } = require('mongodb');

// Configuration
const MONGODB_URI =
  process.env.MONGO_URI ||
  'mongodb://sunny1:87ydaiuhdsia2e@192.168.8.2:32018/sas-prod-local?authSource=admin';
const MACHINE_SERIAL = '1309';
const CUSTOM_START = '2025-10-01T08:00:00';
const CUSTOM_END = '2025-10-15T08:00:00';

async function debugDateConversion() {
  let client;

  try {
    console.log('🔍 Debugging Date Conversion');
    console.log('='.repeat(60));
    console.log(`Machine Serial: ${MACHINE_SERIAL}`);
    console.log(`Custom Range: ${CUSTOM_START} to ${CUSTOM_END}`);
    console.log('');

    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();

    // Find the machine
    const machine = await db.collection('machines').findOne({
      $or: [
        { serialNumber: MACHINE_SERIAL },
        { origSerialNumber: MACHINE_SERIAL },
      ],
    });

    if (!machine) {
      console.log('❌ Machine not found!');
      return;
    }

    console.log(`✅ Found machine: ${machine._id}`);

    // Step 1: User's input (what they type in the UI)
    console.log('\n📋 Step 1: User Input');
    console.log(
      'User types: Oct 1, 2025 8:00 AM to Oct 15, 2025 8:00 AM (Trinidad time)'
    );

    const userStartDate = new Date(CUSTOM_START);
    const userEndDate = new Date(CUSTOM_END);

    console.log(`JavaScript Date (local): ${userStartDate.toString()}`);
    console.log(`JavaScript Date (ISO): ${userStartDate.toISOString()}`);
    console.log('');

    // Step 2: Current conversion (what we're doing now - WRONG)
    console.log('\n📋 Step 2: Current Conversion (Adding 4 hours)');
    const currentStartUTC = new Date(
      userStartDate.getTime() + 4 * 60 * 60 * 1000
    );
    const currentEndUTC = new Date(userEndDate.getTime() + 4 * 60 * 60 * 1000);

    console.log(`Start: ${currentStartUTC.toISOString()}`);
    console.log(`End: ${currentEndUTC.toISOString()}`);

    // Query with current conversion
    const currentResult = await db
      .collection('meters')
      .aggregate([
        {
          $match: {
            machine: machine._id.toString(),
            readAt: { $gte: currentStartUTC, $lte: currentEndUTC },
          },
        },
        {
          $group: {
            _id: null,
            moneyIn: { $sum: '$movement.drop' },
            meterCount: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const currentMoneyIn = currentResult[0]?.moneyIn || 0;
    console.log(
      `Result: Money In = ${currentMoneyIn} ❌ (Wrong - should be 13483)`
    );

    // Step 3: Correct conversion - User input is ALREADY in Trinidad time
    // When user types "2025-10-01T08:00:00", the browser treats it as local time
    // But the Date constructor treats strings without timezone as UTC
    console.log('\n📋 Step 3: Problem Analysis');
    console.log(
      "The issue: new Date('2025-10-01T08:00:00') treats the string as UTC!"
    );
    console.log(
      `new Date('2025-10-01T08:00:00').toISOString() = ${new Date(
        '2025-10-01T08:00:00'
      ).toISOString()}`
    );
    console.log('');
    console.log(
      'User wants: Oct 1, 2025 8:00 AM Trinidad time = Oct 1, 2025 12:00 PM UTC'
    );
    console.log("But we're getting: Oct 1, 2025 8:00 AM UTC (wrong!)");
    console.log(
      'Then adding 4 hours gives us: Oct 1, 2025 12:00 PM UTC (which is correct by accident)'
    );
    console.log(
      'But then we add 4 MORE hours: Oct 1, 2025 4:00 PM UTC (WRONG!)'
    );

    // Step 4: Test different date ranges to find the correct one
    console.log('\n📋 Step 4: Testing Different Date Ranges');

    // Option 1: Use the dates as-is (treat as UTC already)
    console.log('\nOption 1: Use dates as-is (no conversion)');
    const option1Start = new Date(CUSTOM_START);
    const option1End = new Date(CUSTOM_END);
    console.log(`Start: ${option1Start.toISOString()}`);
    console.log(`End: ${option1End.toISOString()}`);

    const option1Result = await db
      .collection('meters')
      .aggregate([
        {
          $match: {
            machine: machine._id.toString(),
            readAt: { $gte: option1Start, $lte: option1End },
          },
        },
        {
          $group: {
            _id: null,
            moneyIn: { $sum: '$movement.drop' },
            meterCount: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const option1MoneyIn = option1Result[0]?.moneyIn || 0;
    console.log(`Result: Money In = ${option1MoneyIn}`);

    // Option 2: Subtract 4 hours (opposite of what we're doing)
    console.log('\nOption 2: Subtract 4 hours');
    const option2Start = new Date(userStartDate.getTime() - 4 * 60 * 60 * 1000);
    const option2End = new Date(userEndDate.getTime() - 4 * 60 * 60 * 1000);
    console.log(`Start: ${option2Start.toISOString()}`);
    console.log(`End: ${option2End.toISOString()}`);

    const option2Result = await db
      .collection('meters')
      .aggregate([
        {
          $match: {
            machine: machine._id.toString(),
            readAt: { $gte: option2Start, $lte: option2End },
          },
        },
        {
          $group: {
            _id: null,
            moneyIn: { $sum: '$movement.drop' },
            meterCount: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const option2MoneyIn = option2Result[0]?.moneyIn || 0;
    console.log(`Result: Money In = ${option2MoneyIn}`);

    // Option 3: Create dates correctly for Trinidad time
    console.log('\nOption 3: Create dates for Trinidad 8AM = UTC 12PM');
    const option3Start = new Date('2025-10-01T12:00:00.000Z'); // 8 AM Trinidad = 12 PM UTC
    const option3End = new Date('2025-10-15T12:00:00.000Z');
    console.log(`Start: ${option3Start.toISOString()}`);
    console.log(`End: ${option3End.toISOString()}`);

    const option3Result = await db
      .collection('meters')
      .aggregate([
        {
          $match: {
            machine: machine._id.toString(),
            readAt: { $gte: option3Start, $lte: option3End },
          },
        },
        {
          $group: {
            _id: null,
            moneyIn: { $sum: '$movement.drop' },
            meterCount: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const option3MoneyIn = option3Result[0]?.moneyIn || 0;
    console.log(`Result: Money In = ${option3MoneyIn}`);

    // Step 5: Summary
    console.log('\n📋 Step 5: Summary');
    console.log('='.repeat(60));
    console.log(`Expected: 13483`);
    console.log(
      `Current (add 4h): ${currentMoneyIn} ${
        currentMoneyIn === 13483 ? '✅' : '❌'
      }`
    );
    console.log(
      `Option 1 (no conversion): ${option1MoneyIn} ${
        option1MoneyIn === 13483 ? '✅' : '❌'
      }`
    );
    console.log(
      `Option 2 (subtract 4h): ${option2MoneyIn} ${
        option2MoneyIn === 13483 ? '✅' : '❌'
      }`
    );
    console.log(
      `Option 3 (manual UTC): ${option3MoneyIn} ${
        option3MoneyIn === 13483 ? '✅' : '❌'
      }`
    );
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run the debug
debugDateConversion().catch(console.error);
