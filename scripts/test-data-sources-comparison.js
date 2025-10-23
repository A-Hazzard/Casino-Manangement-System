const { MongoClient } = require("mongodb");

const MONGODB_URI =
  "mongodb://sunny1:87ydaiuhdsia2e@192.168.8.2:32018/sas-prod-local?authSource=admin";

async function testDataSourcesComparison() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    console.log(
      "🔍 Comparing Data Sources for Machine 1309 (ID: 5769366190e560cdab9b8e51)"
    );
    console.log("📅 Date Range: 7 days (Last 7 days)");

    const machineId = "5769366190e560cdab9b8e51";

    // Get gaming day range for "7d"
    const location = await db
      .collection("gaminglocations")
      .findOne({ _id: "b393ebf50933d1688c3fe2a7" }); // Dueces location
    const gameDayOffset = location?.gameDayOffset || 0;
    console.log(
      `📍 Location: ${location?.name}, Game Day Offset: ${gameDayOffset}`
    );

    // Calculate 7-day range using gaming day offset
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Apply gaming day offset (typically 8 AM Trinidad = 4 PM UTC)
    const offsetHours = gameDayOffset || 8;
    const startDate = new Date(sevenDaysAgo);
    startDate.setUTCHours(offsetHours, 0, 0, 0);

    const endDate = new Date(now);
    endDate.setUTCHours(offsetHours, 0, 0, 0);

    console.log(
      `📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    // 1. Test Accepted Bills (Bill Validator source)
    console.log("\n📊 ACCEPTED BILLS (Bill Validator Source):");
    const acceptedBills = await db
      .collection("acceptedbills")
      .find({
        machine: machineId,
        readAt: { $gte: startDate, $lte: endDate },
      })
      .sort({ readAt: -1 })
      .toArray();

    console.log(`   Total bills found: ${acceptedBills.length}`);

    let billValidatorTotal = 0;
    if (acceptedBills.length > 0) {
      acceptedBills.forEach((bill) => {
        if (bill.movement) {
          const movement = bill.movement;
          const denominationMap = [
            { key: "dollar1", value: 1 },
            { key: "dollar2", value: 2 },
            { key: "dollar5", value: 5 },
            { key: "dollar10", value: 10 },
            { key: "dollar20", value: 20 },
            { key: "dollar50", value: 50 },
            { key: "dollar100", value: 100 },
            { key: "dollar200", value: 200 },
            { key: "dollar500", value: 500 },
            { key: "dollar1000", value: 1000 },
            { key: "dollar2000", value: 2000 },
            { key: "dollar5000", value: 5000 },
            { key: "dollar10000", value: 10000 },
          ];

          denominationMap.forEach(({ key, value }) => {
            const quantity = movement[key] || 0;
            if (quantity > 0) {
              billValidatorTotal += quantity * value;
            }
          });
        }
      });
    }

    console.log(`   Bill Validator Total: $${billValidatorTotal}`);

    // 2. Test Meters Collection (Metrics API source)
    console.log("\n📊 METERS COLLECTION (Metrics API Source):");
    const meters = await db
      .collection("meters")
      .find({
        machine: machineId,
        readAt: { $gte: startDate, $lte: endDate },
      })
      .sort({ readAt: -1 })
      .toArray();

    console.log(`   Total meter records found: ${meters.length}`);

    let metersMoneyIn = 0;
    let metersMoneyOut = 0;
    let metersJackpot = 0;

    if (meters.length > 0) {
      meters.forEach((meter) => {
        if (meter.movement) {
          metersMoneyIn += meter.movement.drop || 0;
          metersMoneyOut += meter.movement.totalCancelledCredits || 0;
          metersJackpot += meter.movement.jackpot || 0;
        }
      });
    }

    console.log(`   Meters Money In (sum of movement.drop): $${metersMoneyIn}`);
    console.log(
      `   Meters Money Out (sum of movement.totalCancelledCredits): $${metersMoneyOut}`
    );
    console.log(
      `   Meters Jackpot (sum of movement.jackpot): $${metersJackpot}`
    );

    // 3. Show detailed breakdown
    if (acceptedBills.length > 0) {
      console.log("\n📊 ACCEPTED BILLS BREAKDOWN:");
      const denominationTotals = {};
      acceptedBills.forEach((bill) => {
        if (bill.movement) {
          const movement = bill.movement;
          const denominationMap = [
            { key: "dollar1", value: 1 },
            { key: "dollar2", value: 2 },
            { key: "dollar5", value: 5 },
            { key: "dollar10", value: 10 },
            { key: "dollar20", value: 20 },
            { key: "dollar50", value: 50 },
            { key: "dollar100", value: 100 },
            { key: "dollar200", value: 200 },
            { key: "dollar500", value: 500 },
            { key: "dollar1000", value: 1000 },
            { key: "dollar2000", value: 2000 },
            { key: "dollar5000", value: 5000 },
            { key: "dollar10000", value: 10000 },
          ];

          denominationMap.forEach(({ key, value }) => {
            const quantity = movement[key] || 0;
            if (quantity > 0) {
              denominationTotals[value] =
                (denominationTotals[value] || 0) + quantity;
            }
          });
        }
      });

      Object.keys(denominationTotals).forEach((denom) => {
        const quantity = denominationTotals[denom];
        const subtotal = quantity * parseInt(denom);
        console.log(`     $${denom}: ${quantity} bills = $${subtotal}`);
      });
    }

    if (meters.length > 0) {
      console.log("\n📊 METERS BREAKDOWN:");
      console.log("   Recent meter movements:");
      meters.slice(0, 5).forEach((meter, index) => {
        console.log(`     Meter ${index + 1}:`, {
          readAt: meter.readAt,
          drop: meter.movement?.drop || 0,
          totalCancelledCredits: meter.movement?.totalCancelledCredits || 0,
          jackpot: meter.movement?.jackpot || 0,
        });
      });
    }

    // 4. Analysis
    console.log("\n🔍 ANALYSIS:");
    console.log(`   Bill Validator Total: $${billValidatorTotal}`);
    console.log(`   Meters Money In: $${metersMoneyIn}`);
    console.log(`   Difference: $${billValidatorTotal - metersMoneyIn}`);

    if (Math.abs(billValidatorTotal - metersMoneyIn) < 0.01) {
      console.log("   ✅ Values match!");
    } else {
      console.log("   ❌ MISMATCH DETECTED!");
      console.log("   🔍 Possible causes:");
      console.log("      - Different date filtering logic");
      console.log("      - Different data sources (acceptedbills vs meters)");
      console.log("      - Timing differences in data recording");
      console.log("      - Gaming day offset calculation differences");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

// Run the test
testDataSourcesComparison().catch(console.error);
