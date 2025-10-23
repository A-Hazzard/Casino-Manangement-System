// Test script to verify collection history timestamp fix with real machine ID

const BASE_URL = "http://localhost:3000";

async function testCollectionHistoryRealMachine() {
  try {
    console.log("🔍 Testing Collection History with Real Machine ID");
    console.log(
      "📅 This test verifies that collectionMetersHistory uses collectionTime\n"
    );

    // Use a real machine ID from the database
    const realMachineId = "c4e30d163e55fbb5ecbd6080"; // From recent collections
    const testCollectionTime = "2025-10-16T08:00:00.000Z";
    const testLocationReportId = "test-report-real-" + Date.now();

    console.log("1️⃣ Using real machine ID:", realMachineId);

    // First, check the current machine state
    console.log("   📊 Checking current machine state...");
    const machineResponse = await fetch(
      `${BASE_URL}/api/machines/${realMachineId}`
    );
    if (machineResponse.ok) {
      const machineData = await machineResponse.json();
      console.log(
        "   📋 Machine found:",
        machineData.data?.serialNumber || machineData.data?.name
      );
      console.log(
        "   📊 Current collectionMeters:",
        machineData.data?.collectionMeters
      );
      console.log(
        "   📊 Current history length:",
        machineData.data?.collectionMetersHistory?.length || 0
      );
    } else {
      console.log("   ❌ Machine not found or API error");
    }

    console.log(
      "\n2️⃣ Creating test collection with locationReportId:",
      testLocationReportId
    );

    const testCollection = {
      machineId: realMachineId,
      machineName: "Test Machine",
      metersIn: 3000,
      metersOut: 1500,
      prevIn: 0,
      prevOut: 0,
      notes: "Test collection for real machine history timestamp fix",
      timestamp: testCollectionTime,
      collectionTime: testCollectionTime,
      location: "Test Location",
      collector: "Test Collector",
      locationReportId: testLocationReportId, // This will trigger history creation
      isCompleted: false,
      softMetersIn: 3000,
      softMetersOut: 1500,
    };

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
    console.log("   ✅ Collection created successfully");
    console.log("   📋 Collection ID:", result.data?._id);
    console.log("   📅 CollectionTime:", result.data?.collectionTime);

    console.log("\n3️⃣ Checking machine collection history after creation...");

    // Check if the machine's collectionMetersHistory was updated
    const machineResponseAfter = await fetch(
      `${BASE_URL}/api/machines/${realMachineId}`
    );
    if (machineResponseAfter.ok) {
      const machineDataAfter = await machineResponseAfter.json();
      const history = machineDataAfter.data?.collectionMetersHistory || [];

      console.log(`   📊 Total history entries after: ${history.length}`);
      console.log(
        "   📊 Updated collectionMeters:",
        machineDataAfter.data?.collectionMeters
      );

      if (history.length > 0) {
        // Find the entry with our test locationReportId
        const testEntry = history.find(
          (entry) => entry.locationReportId === testLocationReportId
        );

        if (testEntry) {
          console.log("   ✅ Found test entry in collection history");
          console.log("   📅 History timestamp:", testEntry.timestamp);
          console.log("   📊 Meters In:", testEntry.metersIn);
          console.log("   📊 Meters Out:", testEntry.metersOut);
          console.log("   📊 Prev In:", testEntry.prevIn);
          console.log("   📊 Prev Out:", testEntry.prevOut);

          // Check if timestamp matches collectionTime
          const historyTimestamp = new Date(testEntry.timestamp);
          const expectedTimestamp = new Date(testCollectionTime);

          if (
            Math.abs(historyTimestamp.getTime() - expectedTimestamp.getTime()) <
            1000
          ) {
            console.log("   ✅ History timestamp matches collection time");
          } else {
            console.log("   ❌ History timestamp mismatch!");
            console.log("   Expected:", expectedTimestamp.toISOString());
            console.log("   Got:", historyTimestamp.toISOString());
          }
        } else {
          console.log("   ❌ Test entry not found in collection history");
          console.log(
            "   Available locationReportIds:",
            history.map((h) => h.locationReportId)
          );
        }
      } else {
        console.log("   ⚠️ No collection history found");
      }
    }

    console.log("\n✅ Collection history test with real machine completed!");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testCollectionHistoryRealMachine().catch(console.error);
