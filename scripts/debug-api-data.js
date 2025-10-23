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

async function debugApiData() {
  console.log("🔍 Debugging API data...\n");

  try {
    // Get the machine data directly from the API
    const response = await makeRequest(
      "/api/machines/5769366190e560cdab9b8e51?timePeriod=All%20Time"
    );
    console.log("Machine API response status:", response.status);

    if (response.status === 200 && response.data.success) {
      const machine = response.data.data;
      console.log("\n📋 Machine data from API:");
      console.log(`  serialNumber: ${machine.serialNumber}`);
      console.log(`  _id: ${machine._id}`);

      if (
        machine.collectionMetersHistory &&
        machine.collectionMetersHistory.length > 0
      ) {
        console.log(
          `  collectionMetersHistory entries: ${machine.collectionMetersHistory.length}`
        );

        // Show first few entries
        machine.collectionMetersHistory.slice(0, 3).forEach((entry, index) => {
          console.log(`    Entry ${index + 1}:`);
          console.log(`      prevIn: ${entry.prevIn}`);
          console.log(`      prevOut: ${entry.prevOut}`);
          console.log(`      metersIn: ${entry.metersIn}`);
          console.log(`      metersOut: ${entry.metersOut}`);
        });
      } else {
        console.log("  No collectionMetersHistory in API response");
      }
    } else {
      console.log("❌ Failed to get machine data from API");
      console.log("Response:", response.data);
    }
  } catch (error) {
    console.error("❌ Error:", error.message || error);
  }
}

debugApiData().catch(console.error);
