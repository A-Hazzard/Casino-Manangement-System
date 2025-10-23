const { MongoClient } = require("mongodb");

const MONGODB_URI =
  "mongodb://sunny1:87ydaiuhdsia2e@192.168.8.2:32018/sas-prod-local?authSource=admin";

async function testBillValidatorVsMetrics() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    console.log(
      "🔍 Testing Bill Validator vs Metrics for Machine 1309 (ID: 5769366190e560cdab9b8e51)"
    );
    console.log("📅 Date Range: October 15th to 16th");

    // Get machine info
    const machine = await db
      .collection("machines")
      .findOne({ _id: "5769366190e560cdab9b8e51" });
    if (!machine) {
      console.error("❌ Machine not found");
      return;
    }

    console.log(`✅ Found machine: ${machine.serialNumber} (${machine.name})`);

    // Get location info for gaming day offset
    const location = await db
      .collection("gaminglocations")
      .findOne({ _id: machine.locationId });
    const gameDayOffset = location?.gameDayOffset || 0;
    console.log(
      `📍 Location: ${location?.name}, Game Day Offset: ${gameDayOffset}`
    );

    // Test date range: Oct 15-16, 2025
    const startDate = new Date("2025-10-15T04:00:00.000Z"); // 4 AM UTC = Midnight Trinidad
    const endDate = new Date("2025-10-16T03:59:59.999Z"); // 3:59 AM UTC = 11:59 PM Trinidad

    console.log(
      `📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    // 1. Get bill validator data (accepted bills) - use readAt for V2 data
    const acceptedBills = await db
      .collection("acceptedbills")
      .find({
        machine: "5769366190e560cdab9b8e51",
        readAt: { $gte: startDate, $lte: endDate },
      })
      .sort({ readAt: -1 })
      .toArray();

    console.log(`\n📊 BILL VALIDATOR DATA:`);
    console.log(`   Total bills found: ${acceptedBills.length}`);

    // Initialize totals
    let billValidatorTotal = 0;
    let billValidatorKnown = 0;
    let billValidatorUnknown = 0;
    let metricsMoneyIn = 0;

    if (acceptedBills.length > 0) {
      // Analyze bill structure
      const firstBill = acceptedBills[0];
      console.log(`   First bill structure:`, {
        hasValue: firstBill.value !== undefined,
        hasMovement: firstBill.movement !== undefined,
        value: firstBill.value,
        movementKeys: firstBill.movement
          ? Object.keys(firstBill.movement)
          : "none",
      });

      if (firstBill.value !== undefined) {
        // V1 format - count by value field
        const denominationTotals = {};
        acceptedBills.forEach((bill) => {
          if (bill.value !== undefined) {
            const value = Number(bill.value);
            denominationTotals[value] = (denominationTotals[value] || 0) + 1;
            billValidatorTotal += value;
          }
        });

        console.log(`   V1 Denominations:`, denominationTotals);
        console.log(`   V1 Total: $${billValidatorTotal}`);
      } else if (firstBill.movement) {
        // V2 format - use movement object
        acceptedBills.forEach((bill) => {
          if (bill.movement) {
            const movement = bill.movement;

            // Sum known denominations
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
                billValidatorKnown += quantity * value;
              }
            });

            // Sum unknown amounts
            billValidatorUnknown += movement.dollarTotalUnknown || 0;
          }
        });

        billValidatorTotal = billValidatorKnown + billValidatorUnknown;

        console.log(`   V2 Known Total: $${billValidatorKnown}`);
        console.log(`   V2 Unknown Total: $${billValidatorUnknown}`);
        console.log(`   V2 Grand Total: $${billValidatorTotal}`);
      }
    }

    // 2. Get metrics data (meters collection)
    const meters = await db
      .collection("meters")
      .find({
        machineId: "5769366190e560cdab9b8e51",
        readAt: { $gte: startDate, $lte: endDate },
      })
      .sort({ readAt: -1 })
      .toArray();

    console.log(`\n📊 METRICS DATA (Meters Collection):`);
    console.log(`   Total meter records found: ${meters.length}`);

    if (meters.length > 0) {
      // Calculate movement from meters
      const meterMovements = {};
      meters.forEach((meter) => {
        if (meter.movement) {
          Object.keys(meter.movement).forEach((key) => {
            if (typeof meter.movement[key] === "number") {
              meterMovements[key] =
                (meterMovements[key] || 0) + meter.movement[key];
            }
          });
        }
      });

      console.log(`   Meter movements:`, meterMovements);

      metricsMoneyIn = meterMovements.moneyIn || 0;
      const metricsMoneyOut = meterMovements.moneyOut || 0;
      const metricsGross = metricsMoneyIn - metricsMoneyOut;

      console.log(`   Metrics Money In: $${metricsMoneyIn}`);
      console.log(`   Metrics Money Out: $${metricsMoneyOut}`);
      console.log(`   Metrics Gross: $${metricsGross}`);
    }

    // 3. Check collections for this date range
    const collections = await db
      .collection("collections")
      .find({
        machineId: "5769366190e560cdab9b8e51",
        timestamp: { $gte: startDate, $lte: endDate },
        deletedAt: { $exists: false },
      })
      .sort({ timestamp: -1 })
      .toArray();

    console.log(`\n📊 COLLECTIONS DATA:`);
    console.log(`   Total collections found: ${collections.length}`);

    if (collections.length > 0) {
      collections.forEach((collection, index) => {
        console.log(`   Collection ${index + 1}:`, {
          id: collection._id,
          timestamp: collection.timestamp,
          metersIn: collection.metersIn,
          metersOut: collection.metersOut,
          movement: collection.movement,
          sasMeters: collection.sasMeters
            ? {
                drop: collection.sasMeters.drop,
                gross: collection.sasMeters.gross,
              }
            : "none",
        });
      });
    }

    // 4. Check machine's current state
    console.log(`\n📊 MACHINE CURRENT STATE:`);
    console.log(`   Collection Meters:`, machine.collectionMeters);
    console.log(
      `   Collection Meters History entries:`,
      machine.collectionMetersHistory?.length || 0
    );

    if (
      machine.collectionMetersHistory &&
      machine.collectionMetersHistory.length > 0
    ) {
      console.log(`   Recent history entries:`);
      machine.collectionMetersHistory.slice(-3).forEach((entry, index) => {
        console.log(`     Entry ${index + 1}:`, {
          locationReportId: entry.locationReportId,
          metersIn: entry.metersIn,
          metersOut: entry.metersOut,
          prevMetersIn: entry.prevMetersIn,
          prevMetersOut: entry.prevMetersOut,
          timestamp: entry.timestamp,
        });
      });
    }

    console.log(`\n🔍 ANALYSIS:`);
    console.log(`   Bill Validator Total: $${billValidatorTotal || 0}`);
    console.log(`   Metrics Money In: $${metricsMoneyIn || 0}`);
    console.log(
      `   Difference: $${(billValidatorTotal || 0) - (metricsMoneyIn || 0)}`
    );

    if (Math.abs((billValidatorTotal || 0) - (metricsMoneyIn || 0)) > 0.01) {
      console.log(`   ❌ MISMATCH DETECTED!`);
    } else {
      console.log(`   ✅ Values match!`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

// Run the test
testBillValidatorVsMetrics().catch(console.error);
