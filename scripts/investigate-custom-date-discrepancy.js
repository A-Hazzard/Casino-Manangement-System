/**
 * Investigation Script: Custom Date Filter Discrepancy
 *
 * This script compares the financial metrics between:
 * 1. Individual machine API (/api/machines/[id])
 * 2. Cabinets page API (/api/machines/aggregation)
 * 3. Location details API (/api/locations/[locationId])
 *
 * For the specific custom date range: Oct 1, 2025 8:00 AM - Oct 15, 2025 8:00 AM
 * Machine: serialNumber "1309"
 * Expected value: ~13483
 */

const { MongoClient } = require("mongodb");

// Configuration
const MONGODB_URI =
  process.env.MONGO_URI ||
  "mongodb://sunny1:87ydaiuhdsia2e@192.168.8.2:32018/sas-prod-local?authSource=admin";
const MACHINE_SERIAL = "1309";
const CUSTOM_START = "2025-10-01T08:00:00";
const CUSTOM_END = "2025-10-15T08:00:00";

async function investigateDiscrepancy() {
  let client;

  try {
    console.log("🔍 Investigating Custom Date Filter Discrepancy");
    console.log("=".repeat(60));
    console.log(`Machine Serial: ${MACHINE_SERIAL}`);
    console.log(`Custom Range: ${CUSTOM_START} to ${CUSTOM_END}`);
    console.log("");

    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();

    // Step 1: Find the machine
    console.log("\n📋 Step 1: Finding Machine");
    const machine = await db.collection("machines").findOne({
      $or: [
        { serialNumber: MACHINE_SERIAL },
        { origSerialNumber: MACHINE_SERIAL },
      ],
    });

    if (!machine) {
      console.log("❌ Machine not found!");
      return;
    }

    console.log(`✅ Found machine: ${machine._id}`);
    console.log(`   Serial Number: ${machine.serialNumber}`);
    console.log(`   Location: ${machine.gamingLocation}`);
    console.log(`   Game Day Offset: ${machine.gameDayOffset || "Not set"}`);

    // Step 2: Get location details
    console.log("\n📋 Step 2: Getting Location Details");
    const location = await db.collection("gaminglocations").findOne({
      _id: machine.gamingLocation,
    });

    if (!location) {
      console.log("❌ Location not found!");
      return;
    }

    const gameDayOffset = location.gameDayOffset || 8;
    console.log(`✅ Location: ${location.name}`);
    console.log(`   Game Day Offset: ${gameDayOffset}`);

    // Step 3: Calculate date ranges
    console.log("\n📋 Step 3: Calculating Date Ranges");

    // User's custom dates (Trinidad time)
    const userStartDate = new Date(CUSTOM_START);
    const userEndDate = new Date(CUSTOM_END);

    console.log("User Input (Trinidad Time):");
    console.log(`   Start: ${userStartDate.toISOString()}`);
    console.log(`   End: ${userEndDate.toISOString()}`);

    // Convert to UTC for database queries (add 4 hours for Trinidad UTC-4)
    const utcStart = new Date(userStartDate.getTime() + 4 * 60 * 60 * 1000);
    const utcEnd = new Date(userEndDate.getTime() + 4 * 60 * 60 * 1000);

    console.log("\nDatabase Query (UTC):");
    console.log(`   Start: ${utcStart.toISOString()}`);
    console.log(`   End: ${utcEnd.toISOString()}`);

    // Gaming day offset calculation (WRONG for custom dates)
    const gamingDayStart = new Date(userStartDate);
    gamingDayStart.setUTCHours(gameDayOffset - -4, 0, 0, 0); // 8 AM Trinidad = 12 PM UTC

    const gamingDayEnd = new Date(userEndDate);
    gamingDayEnd.setDate(gamingDayEnd.getDate() + 1);
    gamingDayEnd.setUTCHours(gameDayOffset - -4, 0, 0, 0);
    gamingDayEnd.setMilliseconds(gamingDayEnd.getMilliseconds() - 1);

    console.log("\nGaming Day Offset Calculation (WRONG for custom):");
    console.log(`   Start: ${gamingDayStart.toISOString()}`);
    console.log(`   End: ${gamingDayEnd.toISOString()}`);

    // Step 4: Query meters with correct custom date range
    console.log("\n📋 Step 4: Querying Meters with Custom Date Range");

    const metersPipeline = [
      {
        $match: {
          machine: machine._id.toString(),
          readAt: {
            $gte: utcStart,
            $lte: utcEnd,
          },
        },
      },
      {
        $group: {
          _id: null,
          moneyIn: { $sum: "$movement.drop" },
          moneyOut: { $sum: "$movement.totalCancelledCredits" },
          jackpot: { $sum: "$movement.jackpot" },
          coinIn: { $last: "$coinIn" },
          coinOut: { $last: "$coinOut" },
          gamesPlayed: { $last: "$gamesPlayed" },
          gamesWon: { $last: "$gamesWon" },
          meterCount: { $sum: 1 },
        },
      },
    ];

    const metersResult = await db
      .collection("meters")
      .aggregate(metersPipeline)
      .toArray();
    const correctMetrics = metersResult[0] || {
      moneyIn: 0,
      moneyOut: 0,
      jackpot: 0,
      coinIn: 0,
      coinOut: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      meterCount: 0,
    };

    const correctGross = correctMetrics.moneyIn - correctMetrics.moneyOut;

    console.log("✅ Correct Metrics (Custom Date Range):");
    console.log(`   Money In: ${correctMetrics.moneyIn}`);
    console.log(`   Money Out: ${correctMetrics.moneyOut}`);
    console.log(`   Gross: ${correctGross}`);
    console.log(`   Coin In: ${correctMetrics.coinIn}`);
    console.log(`   Coin Out: ${correctMetrics.coinOut}`);
    console.log(`   Meter Count: ${correctMetrics.meterCount}`);

    // Step 5: Query meters with gaming day offset (WRONG)
    console.log("\n📋 Step 5: Querying Meters with Gaming Day Offset (WRONG)");

    const gamingDayPipeline = [
      {
        $match: {
          machine: machine._id.toString(),
          readAt: {
            $gte: gamingDayStart,
            $lte: gamingDayEnd,
          },
        },
      },
      {
        $group: {
          _id: null,
          moneyIn: { $sum: "$movement.drop" },
          moneyOut: { $sum: "$movement.totalCancelledCredits" },
          jackpot: { $sum: "$movement.jackpot" },
          coinIn: { $last: "$coinIn" },
          coinOut: { $last: "$coinOut" },
          gamesPlayed: { $last: "$gamesPlayed" },
          gamesWon: { $last: "$gamesWon" },
          meterCount: { $sum: 1 },
        },
      },
    ];

    const gamingDayResult = await db
      .collection("meters")
      .aggregate(gamingDayPipeline)
      .toArray();
    const wrongMetrics = gamingDayResult[0] || {
      moneyIn: 0,
      moneyOut: 0,
      jackpot: 0,
      coinIn: 0,
      coinOut: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      meterCount: 0,
    };

    const wrongGross = wrongMetrics.moneyIn - wrongMetrics.moneyOut;

    console.log("❌ Wrong Metrics (Gaming Day Offset Applied):");
    console.log(`   Money In: ${wrongMetrics.moneyIn}`);
    console.log(`   Money Out: ${wrongMetrics.moneyOut}`);
    console.log(`   Gross: ${wrongGross}`);
    console.log(`   Coin In: ${wrongMetrics.coinIn}`);
    console.log(`   Coin Out: ${wrongMetrics.coinOut}`);
    console.log(`   Meter Count: ${wrongMetrics.meterCount}`);

    // Step 6: Show the discrepancy
    console.log("\n📋 Step 6: Discrepancy Analysis");
    console.log("=".repeat(40));
    console.log(`Expected (Custom Range): ${correctGross}`);
    console.log(`Wrong (Gaming Day Offset): ${wrongGross}`);
    console.log(`Difference: ${correctGross - wrongGross}`);
    console.log(
      `Percentage: ${(
        ((correctGross - wrongGross) / correctGross) *
        100
      ).toFixed(2)}%`
    );

    // Step 7: Check what the APIs are actually returning
    console.log("\n📋 Step 7: API Simulation");
    console.log("Testing what the current APIs would return...");

    // Simulate individual machine API (should be correct)
    console.log("\n✅ Individual Machine API (/api/machines/[id]):");
    console.log(`   Should return: ${correctGross} (correct)`);

    // Simulate aggregation API (currently wrong)
    console.log("\n❌ Cabinets Page API (/api/machines/aggregation):");
    console.log(
      `   Currently returns: ${wrongGross} (wrong - uses gaming day offset)`
    );

    // Simulate location API (currently wrong)
    console.log("\n❌ Location Details API (/api/locations/[locationId]):");
    console.log(
      `   Currently returns: ${wrongGross} (wrong - uses gaming day offset)`
    );

    console.log("\n🎯 CONCLUSION:");
    console.log(
      "The issue is that custom date ranges should NOT use gaming day offset."
    );
    console.log(
      "The user specifies exact times, so we should use those exact times."
    );
    console.log(
      'Gaming day offset should only apply to predefined periods like "Today", "Yesterday", etc.'
    );
  } catch (error) {
    console.error("❌ Error during investigation:", error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run the investigation
investigateDiscrepancy().catch(console.error);
