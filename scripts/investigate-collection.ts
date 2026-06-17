import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;
const COLLECTION_ID = '8ac48e73-55a4-441d-b96c-386828a921b9';

async function searchAllCollections(db: mongoose.mongo.Db) {
  const collections = await db.listCollections().toArray();
  for (const c of collections) {
    const doc = await db.collection(c.name).findOne({ _id: COLLECTION_ID });
    if (doc) {
      console.log(`\nFound in \`${c.name}\`!`);
      console.log(JSON.stringify(doc, null, 2).slice(0, 5000));
    }
  }
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  // Search likely collections first
  const collections = ['collections', 'reportedmachines', 'collectionreportsessions', 'collectionreports', 'machines'];
  for (const name of collections) {
    const doc = await db.collection(name).findOne({ _id: COLLECTION_ID });
    if (!doc) continue;

    console.log(`\n===== FOUND IN \`${name}\` =====`);
    console.log(JSON.stringify(doc, null, 2).slice(0, 3000));

    const machineId = doc.machineId || null;

    if (name === 'collectionreports') {
      // This is a collection report — find all collections within it
      const cols = await db.collection('collections').find({
        locationReportId: COLLECTION_ID,
      }).sort({ timestamp: 1 }).toArray();
      console.log(`\n===== COLLECTIONS IN THIS REPORT (${cols.length} total) =====`);
      for (const c of cols as any[]) {
        const prevZero = c.prevIn === 0 || c.prevOut === 0;
        console.log(`${prevZero ? '*** ZERO PREV *** ' : ''}${JSON.stringify({
          _id: c._id,
          machineId: c.machineId,
          metersIn: c.metersIn,
          metersOut: c.metersOut,
          prevIn: c.prevIn,
          prevOut: c.prevOut,
          movement: c.movement,
          isCompleted: c.isCompleted,
          meterId: c.meterId,
          timestamp: c.timestamp,
          collectionTime: c.collectionTime,
        })}`);

        if (prevZero) {
          await investigatePrevZero(db, c);
          const mId = c.machineId;
          await printMachineData(db, mId);
          await printMetersData(db, mId);
          await printV2Data(db, mId);
          await printV1Collections(db, mId);
        }
      }
    }

    if (machineId) {
      await printMachineData(db, machineId);
      await printMetersData(db, machineId);
      await printV2Data(db, machineId);
      await printV1Collections(db, machineId);
    }

    await mongoose.disconnect();
    return;
  }

  console.log('Not found in likely collections.');

  async function investigatePrevZero(db: mongoose.mongo.Db, c: any) {
    const machine = await db.collection('machines').findOne({ _id: c.machineId });
    if (!machine) return;

    console.log(`\n  MACHINE ${c.machineId}: collectionMeters=${JSON.stringify(machine.collectionMeters)}, previousCollectionTime=${machine.previousCollectionTime}`);
    console.log(`  History entries: ${machine.collectionMetersHistory?.length || 0}`);

    const colTime = c.collectionTime || c.timestamp;
    const prevCol = await db.collection('collections').findOne({
      machineId: c.machineId,
      _id: { $ne: c._id },
      isCompleted: true,
      $or: [
        { collectionTime: { $lt: new Date(colTime) } },
        { timestamp: { $lt: new Date(colTime) } },
      ],
    }, { sort: { collectionTime: -1, timestamp: -1 } });
    if (prevCol) {
      console.log(`  PREVIOUS COLLECTION: metersIn=${prevCol.metersIn}, metersOut=${prevCol.metersOut}`);
    } else {
      console.log(`  NO PREVIOUS COLLECTION — fallback to machine.collectionMeters = ${JSON.stringify(machine.collectionMeters)}`);
    }

    // Check if there's any V2 data that should have been the prev
    const v2 = await db.collection('reportedmachines').find({ machineId: c.machineId })
      .sort({ sasEndTime: -1 }).limit(3).toArray();
    if (v2.length > 0) {
      console.log(`  V2 SESSIONS BEFORE THIS REPORT (${v2.length}):`);
      for (const r of v2) {
        console.log(`    session=${r.sessionId}, manualMetersIn=${r.manualMetersIn}, manualMetersOut=${r.manualMetersOut}, sasEndTime=${r.sasEndTime}`);
      }
    }

    // Check if machine.collectionMeters WAS zero at collection creation time
    // by looking at the V1 collections that came before this one
    const earlierCols = await db.collection('collections').find({
      machineId: c.machineId,
      timestamp: { $lt: new Date(colTime) },
    }).sort({ timestamp: -1 }).limit(5).toArray();
    console.log(`  EARLIER V1 COLLECTIONS (${earlierCols.length}):`);
    for (const ec of earlierCols) {
      console.log(`    _id=${ec._id}, metersIn=${ec.metersIn}, metersOut=${ec.metersOut}, prevIn=${ec.prevIn}, prevOut=${ec.prevOut}, isCompleted=${ec.isCompleted}, locationReportId=${ec.locationReportId}`);
    }
  }

  async function printMachineData(db: mongoose.mongo.Db, mId: string) {
    const machine = await db.collection('machines').findOne({ _id: mId });
    if (machine) {
      console.log(`\n===== MACHINE ${mId} =====`);
      console.log(JSON.stringify({
        _id: machine._id,
        serialNumber: machine.serialNumber,
        relayId: machine.relayId,
        lastActivity: machine.lastActivity,
        gamingLocation: machine.gamingLocation,
        collectionMeters: machine.collectionMeters,
        collectionTime: machine.collectionTime,
        previousCollectionTime: machine.previousCollectionTime,
        collectionMetersHistoryCount: machine.collectionMetersHistory?.length || 0,
        recentHistory: (machine.collectionMetersHistory || []).slice(-3),
      }, null, 2));
    }
  }

  async function printMetersData(db: mongoose.mongo.Db, mId: string) {
    const meters = await db.collection('meters').find({ machine: mId })
      .sort({ readAt: -1 }).limit(10).toArray();
    console.log(`\n===== METERS FOR ${mId} =====`);
    for (const m of meters) {
      console.log(JSON.stringify({
        _id: m._id,
        readAt: m.readAt,
        drop: m.drop,
        totalCancelledCredits: m.totalCancelledCredits,
        movement: m.movement,
        meterSource: m.meterSource,
        isSupplemental: m.isSupplemental,
        isRamClear: m.isRamClear,
        locationSession: m.locationSession,
      }));
    }
  }

  async function printV2Data(db: mongoose.mongo.Db, mId: string) {
    const reported = await db.collection('reportedmachines').find({ machineId: mId })
      .sort({ sasEndTime: -1 }).limit(5).toArray();
    console.log(`\n===== V2 REPORTED MACHINES FOR ${mId} =====`);
    for (const r of reported) {
      console.log(JSON.stringify({
        _id: r._id,
        sessionId: r.sessionId,
        manualMetersIn: r.manualMetersIn,
        manualMetersOut: r.manualMetersOut,
        prevSasMetersIn: r.prevSasMetersIn,
        prevSasMetersOut: r.prevSasMetersOut,
        sasMetersIn: r.sasMetersIn,
        sasMetersOut: r.sasMetersOut,
        sasEndTime: r.sasEndTime,
        sessionStatus: r.sessionStatus,
        isSupplemental: r.isSupplemental,
        movement: r.movement,
      }));
    }
  }

  async function printV1Collections(db: mongoose.mongo.Db, mId: string) {
    const cols = await db.collection('collections').find({ machineId: mId })
      .sort({ timestamp: -1 }).limit(10).toArray();
    console.log(`\n===== ALL V1 COLLECTIONS FOR ${mId} =====`);
    for (const c of cols) {
      console.log(JSON.stringify({
        _id: c._id,
        metersIn: c.metersIn,
        metersOut: c.metersOut,
        prevIn: c.prevIn,
        prevOut: c.prevOut,
        isCompleted: c.isCompleted,
        locationReportId: c.locationReportId,
        timestamp: c.timestamp,
        collectionTime: c.collectionTime,
        movement: c.movement,
      }));
    }
  }

  console.log('Not found in likely collections. Searching all...');
  const allCols = await db.listCollections().toArray();
  for (const c of allCols) {
    if (!collections.includes(c.name)) {
      const doc = await db.collection(c.name).findOne({ _id: COLLECTION_ID });
      if (doc) {
        console.log(`\n===== FOUND IN \`${c.name}\` =====`);
        console.log(JSON.stringify(doc, null, 2).slice(0, 5000));
      }
    }
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
