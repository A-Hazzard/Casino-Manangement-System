const mongoose = require('mongoose');

async function investigateMachine1007() {
  try {
    await mongoose.connect('mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:30717/sas-dev?authSource=admin');
    console.log('Connected to database');
    
    // Find machine 1007
    const machine = await mongoose.connection.db.collection('machines').findOne({
      serialNumber: '1007'
    });
    
    if (!machine) {
      console.log('❌ Machine 1007 not found');
      return;
    }
    
    console.log('✅ Found machine 1007:', {
      id: machine._id,
      serialNumber: machine.serialNumber,
      collectionMeters: machine.collectionMeters
    });
    
    // Find all collections for machine 1007
    const collections = await mongoose.connection.db.collection('collections').find({
      machineId: machine._id.toString()
    }).sort({ timestamp: -1 }).toArray();
    
    console.log(`\n📊 Found ${collections.length} collections for machine 1007:`);
    
    // Group by date
    const collectionsByDate = {};
    collections.forEach(collection => {
      const date = new Date(collection.timestamp).toDateString();
      if (!collectionsByDate[date]) {
        collectionsByDate[date] = [];
      }
      collectionsByDate[date].push(collection);
    });
    
    // Show collections grouped by date
    Object.keys(collectionsByDate).sort().reverse().forEach(date => {
      const dayCollections = collectionsByDate[date];
      console.log(`\n📅 ${date} (${dayCollections.length} collections):`);
      
      dayCollections.forEach((collection, index) => {
        console.log(`  ${index + 1}. Collection ID: ${collection._id}`);
        console.log(`     Timestamp: ${collection.timestamp}`);
        console.log(`     Meters In: ${collection.metersIn}, Meters Out: ${collection.metersOut}`);
        console.log(`     Prev In: ${collection.prevIn}, Prev Out: ${collection.prevOut}`);
        console.log(`     Movement In: ${collection.movement?.metersIn}, Movement Out: ${collection.movement?.metersOut}`);
        console.log(`     Location Report ID: ${collection.locationReportId}`);
        console.log(`     Is Completed: ${collection.isCompleted}`);
        console.log(`     Location: ${collection.location}`);
        console.log('');
      });
    });
    
    // Find all reports for machine 1007's location
    const uniqueLocations = [...new Set(collections.map(c => c.location))];
    console.log(`\n🏢 Machine 1007 is in locations: ${uniqueLocations.join(', ')}`);
    
    for (const location of uniqueLocations) {
      const reports = await mongoose.connection.db.collection('collectionreports').find({
        locationName: location
      }).sort({ timestamp: -1 }).toArray();
      
      console.log(`\n📋 Found ${reports.length} reports for location "${location}":`);
      
      // Group reports by date
      const reportsByDate = {};
      reports.forEach(report => {
        const date = new Date(report.timestamp).toDateString();
        if (!reportsByDate[date]) {
          reportsByDate[date] = [];
        }
        reportsByDate[date].push(report);
      });
      
      // Show reports grouped by date
      Object.keys(reportsByDate).sort().reverse().forEach(date => {
        const dayReports = reportsByDate[date];
        console.log(`\n📅 ${date} (${dayReports.length} reports):`);
        
        dayReports.forEach((report, index) => {
          console.log(`  ${index + 1}. Report ID: ${report.locationReportId}`);
          console.log(`     Timestamp: ${report.timestamp}`);
          console.log(`     Collector: ${report.collectorName}`);
          console.log(`     Total Collections: ${report.totalCollections || 'N/A'}`);
          console.log('');
        });
      });
    }
    
    // Check for prevIn/prevOut issues
    console.log('\n🔍 Analyzing prevIn/prevOut issues:');
    let issuesFound = 0;
    
    for (let i = 0; i < collections.length; i++) {
      const collection = collections[i];
      const prevCollection = i < collections.length - 1 ? collections[i + 1] : null;
      
      console.log(`\nCollection ${collection._id} (${new Date(collection.timestamp).toDateString()}):`);
      console.log(`  Current: Meters In: ${collection.metersIn}, Meters Out: ${collection.metersOut}`);
      console.log(`  Prev: Prev In: ${collection.prevIn}, Prev Out: ${collection.prevOut}`);
      
      if (prevCollection) {
        const expectedPrevIn = prevCollection.metersIn;
        const expectedPrevOut = prevCollection.metersOut;
        console.log(`  Expected Prev: ${expectedPrevIn}, ${expectedPrevOut} (from previous collection)`);
        
        if (collection.prevIn !== expectedPrevIn || collection.prevOut !== expectedPrevOut) {
          console.log(`  ❌ ISSUE: Prev values don't match expected values!`);
          issuesFound++;
        } else {
          console.log(`  ✅ Correct`);
        }
      } else {
        console.log(`  ✅ First collection - prevIn/prevOut should be 0`);
        if (collection.prevIn !== 0 || collection.prevOut !== 0) {
          console.log(`  ❌ ISSUE: First collection should have prevIn=0, prevOut=0`);
          issuesFound++;
        }
      }
    }
    
    console.log(`\n🎯 Summary:`);
    console.log(`- Total collections: ${collections.length}`);
    console.log(`- Issues found: ${issuesFound}`);
    console.log(`- Machine collectionMeters: ${machine.collectionMeters?.metersIn}, ${machine.collectionMeters?.metersOut}`);
    
    await mongoose.disconnect();
    console.log('\n✅ Investigation complete');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

investigateMachine1007();
