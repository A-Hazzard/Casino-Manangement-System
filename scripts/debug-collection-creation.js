// Debug script to see what the collection creation API is actually returning

const BASE_URL = "http://localhost:3000";

async function debugCollectionCreation() {
  try {
    console.log("🔍 Debugging Collection Creation API Response\n");

    const testCollection = {
      machineId: "5769366190e560cdab9b8e51",
      machineName: "1309",
      metersIn: 1000,
      metersOut: 500,
      prevIn: 0,
      prevOut: 0,
      notes: "Debug test collection",
      timestamp: "2025-10-16T08:00:00.000Z",
      collectionTime: "2025-10-16T08:00:00.000Z", // Explicitly set collectionTime
      location: "Debug Location",
      collector: "Debug Collector",
      locationReportId: "",
      isCompleted: false,
      softMetersIn: 1000,
      softMetersOut: 500,
    };

    console.log("📤 Sending payload:");
    console.log(JSON.stringify(testCollection, null, 2));

    const response = await fetch(`${BASE_URL}/api/collections`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testCollection),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    console.log("\n📥 API Response:");
    console.log(JSON.stringify(result, null, 2));

    // Check if collectionTime is in the response
    if (result.data) {
      console.log("\n🔍 Collection Data Fields:");
      console.log("   - _id:", result.data._id);
      console.log("   - timestamp:", result.data.timestamp);
      console.log("   - collectionTime:", result.data.collectionTime);
      console.log("   - metersIn:", result.data.metersIn);
      console.log("   - metersOut:", result.data.metersOut);

      // Check all available fields
      console.log("\n📋 All available fields in response.data:");
      Object.keys(result.data).forEach((key) => {
        console.log(`   - ${key}: ${result.data[key]}`);
      });
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

debugCollectionCreation().catch(console.error);
