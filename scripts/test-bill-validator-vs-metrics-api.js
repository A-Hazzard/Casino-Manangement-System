// Using built-in fetch (Node.js 18+)

const BASE_URL = "http://localhost:3000";

async function testBillValidatorVsMetricsAPI() {
  try {
    console.log("🔍 Testing Bill Validator vs Metrics API for Machine 1309");
    console.log("📅 Date Range: October 15th to 16th (7d period)");

    const machineId = "5769366190e560cdab9b8e51";

    // 1. Test Bill Validator API
    console.log("\n📊 BILL VALIDATOR API:");
    const billValidatorResponse = await fetch(
      `${BASE_URL}/api/bill-validator/${machineId}?timePeriod=7d`
    );

    if (!billValidatorResponse.ok) {
      console.error(
        "❌ Bill Validator API failed:",
        billValidatorResponse.status
      );
      return;
    }

    const billValidatorData = await billValidatorResponse.json();
    console.log("   Response:", JSON.stringify(billValidatorData, null, 2));

    if (billValidatorData.success && billValidatorData.data) {
      const data = billValidatorData.data;
      console.log(`   Version: ${data.version}`);
      console.log(`   Total Amount: $${data.totalAmount || 0}`);
      console.log(`   Total Known: $${data.totalKnownAmount || 0}`);
      console.log(`   Total Unknown: $${data.totalUnknownAmount || 0}`);
      console.log(
        `   Grand Total: $${
          (data.totalKnownAmount || 0) + (data.totalUnknownAmount || 0)
        }`
      );

      // Show denominations breakdown
      if (data.denominations && data.denominations.length > 0) {
        console.log("   Denominations:");
        data.denominations.forEach((denom) => {
          if (denom.quantity > 0) {
            console.log(
              `     ${denom.label}: ${denom.quantity} bills = $${denom.subtotal}`
            );
          }
        });
      }
    }

    // 2. Test Metrics API (machines endpoint)
    console.log("\n📊 METRICS API (Machines endpoint):");
    const metricsResponse = await fetch(
      `${BASE_URL}/api/machines/${machineId}?timePeriod=7d`
    );

    if (!metricsResponse.ok) {
      console.error("❌ Metrics API failed:", metricsResponse.status);
      return;
    }

    const metricsData = await metricsResponse.json();
    console.log("   Response:", JSON.stringify(metricsData, null, 2));

    if (metricsData.success && metricsData.data) {
      const machineData = metricsData.data;
      console.log(`   Money In: $${machineData.moneyIn || 0}`);
      console.log(`   Money Out: $${machineData.moneyOut || 0}`);
      console.log(`   Gross: $${machineData.gross || 0}`);

      // Show meter movements if available
      if (machineData.meterMovements) {
        console.log("   Meter Movements:", machineData.meterMovements);
        console.log(
          `   Movement Drop: $${machineData.meterMovements.drop || 0}`
        );
        console.log(
          `   Movement Total Cancelled Credits: $${
            machineData.meterMovements.totalCancelledCredits || 0
          }`
        );
        console.log(
          `   Movement Gross: $${machineData.meterMovements.gross || 0}`
        );
      }
    }

    // 3. Compare values
    console.log("\n🔍 COMPARISON:");
    const billValidatorTotal = billValidatorData.success
      ? (billValidatorData.data.totalKnownAmount || 0) +
        (billValidatorData.data.totalUnknownAmount || 0)
      : 0;
    const metricsMoneyIn = metricsData.success
      ? metricsData.data.moneyIn || 0
      : 0;
    const metricsDrop =
      metricsData.success && metricsData.data.meterMovements
        ? metricsData.data.meterMovements.drop || 0
        : 0;

    console.log(`   Bill Validator Grand Total: $${billValidatorTotal}`);
    console.log(`   Metrics Money In: $${metricsMoneyIn}`);
    console.log(`   Metrics Movement Drop: $${metricsDrop}`);
    console.log(
      `   Difference (Bill Validator vs Money In): $${
        billValidatorTotal - metricsMoneyIn
      }`
    );
    console.log(
      `   Difference (Bill Validator vs Drop): $${
        billValidatorTotal - metricsDrop
      }`
    );

    if (Math.abs(billValidatorTotal - metricsMoneyIn) < 0.01) {
      console.log("   ✅ Bill Validator matches Money In!");
    } else {
      console.log("   ❌ Bill Validator does NOT match Money In!");
    }

    if (Math.abs(billValidatorTotal - metricsDrop) < 0.01) {
      console.log("   ✅ Bill Validator matches Movement Drop!");
    } else {
      console.log("   ❌ Bill Validator does NOT match Movement Drop!");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run the test
testBillValidatorVsMetricsAPI().catch(console.error);
