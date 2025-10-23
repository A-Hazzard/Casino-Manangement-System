const http = require("http");

async function makeRequest(url, method = "GET") {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 3000,
      path: url,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });
}

async function testFixApiUpdate() {
  console.log("🧪 Testing if fix API actually updates the database...\n");

  try {
    const { MongoClient } = require("mongodb");
    const MONGODB_URI =
      "mongodb://sunny1:87ydaiuhdsia2e@192.168.8.2:32018/sas-prod-local?authSource=admin";

    // 1. Reset machine 1309 to have broken data
    console.log("1. Resetting machine 1309 to broken state...");
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db("sas-prod-local");

    await db.collection("machines").updateOne(
      { _id: "5769366190e560cdab9b8e51" },
      {
        $set: {
          "collectionMetersHistory.1.prevIn": undefined,
          "collectionMetersHistory.1.prevOut": undefined,
        },
      }
    );
    console.log("   ✅ Reset entry 2 prevIn/prevOut to undefined");

    // 2. Verify broken state
    const machineBefore = await db
      .collection("machines")
      .findOne({ _id: "5769366190e560cdab9b8e51" });
    console.log(
      `   Entry 2 prevIn: ${machineBefore.collectionMetersHistory[1].prevIn}`
    );
    console.log(
      `   Entry 2 prevOut: ${machineBefore.collectionMetersHistory[1].prevOut}`
    );

    await client.close();

    // 3. Run the fix API
    console.log("\n2. Running fix API...");
    const fixResponse = await makeRequest(
      "/api/collection-report/4e36a006-1784-48dd-ad43-b4745fef7c1e/fix-collection-history",
      "POST"
    );
    console.log(`   Status: ${fixResponse.status}`);
    console.log(`   Response:`, fixResponse.data);

    // 4. Check if database was updated
    console.log("\n3. Checking if database was updated...");
    const client2 = new MongoClient(MONGODB_URI);
    await client2.connect();
    const db2 = client2.db("sas-prod-local");

    const machineAfter = await db2
      .collection("machines")
      .findOne({ _id: "5769366190e560cdab9b8e51" });
    console.log(
      `   Entry 2 prevIn: ${machineAfter.collectionMetersHistory[1].prevIn}`
    );
    console.log(
      `   Entry 2 prevOut: ${machineAfter.collectionMetersHistory[1].prevOut}`
    );

    await client2.close();

    // 5. Check if API detects the fix
    console.log("\n4. Checking if API detects the fix...");
    const checkResponse = await makeRequest(
      "/api/collection-report/4e36a006-1784-48dd-ad43-b4745fef7c1e/check-sas-times"
    );
    const issue1309 = checkResponse.data.issues?.find(
      (issue) => issue.machineName === "1309"
    );
    console.log(`   Machine 1309 issues: ${issue1309 ? "1" : "0"}`);

    if (issue1309) {
      console.log("   ❌ API still detects issue - fix didn't work");
    } else {
      console.log("   ✅ API no longer detects issue - fix worked!");
    }
  } catch (error) {
    console.error("❌ Error:", error.message || error);
  }
}

testFixApiUpdate().catch(console.error);
