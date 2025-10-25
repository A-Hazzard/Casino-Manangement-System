const mongoose = require('mongoose');

async function testDetectionFinal() {
  try {
    await mongoose.connect(
      'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:30717/sas-dev?authSource=admin'
    );
    console.log('Connected to database');

    const reportId = 'beea91bc-1377-4ce1-8306-1ab85411df32';

    // Find the report
    const report = await mongoose.connection.db
      .collection('collectionreports')
      .findOne({
        locationReportId: reportId,
      });

    if (!report) {
      console.log('❌ Report not found');
      return;
    }

    console.log(`✅ Found report: ${report.location} - ${report.timestamp}`);

    // Find collections for this report
    const collections = await mongoose.connection.db
      .collection('collections')
      .find({
        locationReportId: reportId,
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      })
      .toArray();

    console.log(`📊 Found ${collections.length} collections for this report`);

    // Test the detection logic that should now be in the API
    const machineIds = [...new Set(collections.map(c => c.machineId))];
    let reportIssues = {};
    reportIssues[report._id.toString()] = { issueCount: 0, hasIssues: false };

    for (const machineId of machineIds) {
      let machine = await mongoose.connection.db
        .collection('machines')
        .findOne({
          _id: new mongoose.Types.ObjectId(machineId),
        });

      // If not found as ObjectId, try as string
      if (!machine) {
        machine = await mongoose.connection.db.collection('machines').findOne({
          _id: machineId,
        });
      }

      if (machine) {
        const history = machine.collectionMetersHistory || [];
        let hasMachineHistoryIssues = false;

        // Check for duplicate entries (same timestamp and locationReportId)
        const seenEntries = new Map();
        for (let i = 0; i < history.length; i++) {
          const entry = history[i];
          const key = `${entry.timestamp}-${entry.locationReportId}`;
          if (seenEntries.has(key)) {
            hasMachineHistoryIssues = true;
            console.log(
              `❌ DUPLICATE: Machine ${machine.serialNumber} has duplicate history entry: ${key}`
            );
            break;
          }
          seenEntries.set(key, true);
        }

        // Check for incorrect prevMeters values
        if (!hasMachineHistoryIssues) {
          for (let i = 1; i < history.length; i++) {
            const entry = history[i];
            const prevEntry = history[i - 1];

            // Check if prevMeters match the previous entry's meters
            const expectedPrevIn = prevEntry.metersIn || 0;
            const expectedPrevOut = prevEntry.metersOut || 0;
            const actualPrevIn = entry.prevMetersIn || 0;
            const actualPrevOut = entry.prevMetersOut || 0;

            // Allow for minor precision differences (within 0.1)
            const prevInDiff = Math.abs(actualPrevIn - expectedPrevIn);
            const prevOutDiff = Math.abs(actualPrevOut - expectedPrevOut);

            if (prevInDiff > 0.1 || prevOutDiff > 0.1) {
              hasMachineHistoryIssues = true;
              console.log(
                `❌ PREV METERS MISMATCH: Machine ${machine.serialNumber} entry ${i}: expected ${expectedPrevIn}/${expectedPrevOut}, got ${actualPrevIn}/${actualPrevOut}`
              );
              break;
            }
          }
        }

        if (hasMachineHistoryIssues) {
          reportIssues[report._id.toString()].issueCount++;
          reportIssues[report._id.toString()].hasIssues = true;
        }
      }
    }

    console.log(`\n📊 Final Results:`);
    console.log(
      `Report ${reportId} has ${reportIssues[report._id.toString()].issueCount} issues`
    );
    console.log(`Has Issues: ${reportIssues[report._id.toString()].hasIssues}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testDetectionFinal();
