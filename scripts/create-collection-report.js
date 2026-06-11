#!/usr/bin/env node
/**
 * Create Collection Report - Standalone Script
 *
 * Reads a machine data JSON file (database-YYYY-MM-DD-HH-MM-SS.json),
 * creates collection documents for each machine using SAS meter values,
 * then creates a CollectionReport document with aggregated totals.
 *
 * Requirements: Node.js 18+ (mongoose auto-installed if missing)
 *
 * Usage:
 *   node create-collection-report.js
 *
 * @module create-collection-report
 */

const { randomUUID } = require('crypto');
const { readdirSync, readFileSync, existsSync } = require('fs');
const { join, resolve } = require('path');
const { execSync } = require('child_process');

// ============================================================================
// Ensure mongoose is installed
// ============================================================================

let mongoose;
try {
  mongoose = require('mongoose');
} catch {
  console.log('[setup] mongoose not found, installing...');
  execSync('npm install mongoose', { stdio: 'inherit', cwd: __dirname });
  mongoose = require('mongoose');
}

const { Schema, model, models } = mongoose;

// ============================================================================
// Constants
// ============================================================================

const MONGODB_URI =
  'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-tunapuna?authSource=admin';

const COLLECTOR_ID = '69e9108e0d63319f20cafc93';
const COLLECTOR_NAME = 'admin';

// ============================================================================
// Mongoose Schemas
// ============================================================================

const sasMetersSchema = new Schema(
  {
    machine: { type: String },
    drop: { type: Number },
    totalCancelledCredits: { type: Number },
    gross: { type: Number },
    gamesPlayed: { type: Number },
    jackpot: { type: Number },
    sasStartTime: { type: Date },
    sasEndTime: { type: Date },
  },
  { _id: false }
);

const movementSchema = new Schema(
  {
    metersIn: { type: Number },
    metersOut: { type: Number },
    gross: { type: Number },
  },
  { _id: false }
);

const collectionsSchema = new Schema(
  {
    _id: { type: String },
    ramClearMeterId: { type: String },
    meterId: { type: String },
    isCompleted: { type: Boolean },
    metersIn: { type: Number },
    metersOut: { type: Number },
    prevIn: { type: Number },
    prevOut: { type: Number },
    softMetersIn: { type: Number },
    softMetersOut: { type: Number },
    notes: { type: String },
    timestamp: { type: Date },
    collectionTime: { type: Date },
    location: { type: String },
    collector: { type: String },
    locationReportId: { type: String },
    sasMeters: sasMetersSchema,
    movement: movementSchema,
    machineCustomName: { type: String },
    custom: { name: { type: String } },
    machineId: { type: String },
    machineName: { type: String },
    game: { type: String },
    ramClear: { type: Boolean },
    ramClearMetersIn: { type: Number },
    ramClearMetersOut: { type: Number },
    serialNumber: { type: String },
    deletedAt: { type: Date },
    createdAt: { type: Date },
    updatedAt: { type: Date },
    __v: { type: Number },
  },
  { timestamps: true }
);

const Collections =
  models.Collections || mongoose.model('Collections', collectionsSchema);

const collectionReportSchema = new Schema(
  {
    _id: { type: String },
    variance: { type: Number, required: true },
    previousBalance: { type: Number, required: true },
    currentBalance: { type: Number, required: true },
    amountToCollect: { type: Number, required: true },
    amountCollected: { type: Number, required: true },
    amountUncollected: { type: Number, required: true },
    partnerProfit: { type: Number, required: true },
    taxes: { type: Number, required: true },
    advance: { type: Number, required: true },
    collector: { type: String },
    collectorName: { type: String },
    locationName: { type: String, required: true },
    locationReportId: { type: String, required: true },
    location: { type: String, required: true },
    totalDrop: { type: Number, required: true },
    totalCancelled: { type: Number, required: true },
    totalGross: { type: Number, required: true },
    totalSasGross: { type: Number, required: true },
    timestamp: { type: Date, required: true },
    varianceReason: { type: String },
    previousCollectionTime: { type: Date },
    locationProfitPerc: { type: Number },
    reasonShortagePayment: { type: String },
    balanceCorrection: { type: Number },
    balanceCorrectionReas: { type: String },
    machinesCollected: { type: String },
    includeJackpot: { type: Boolean, default: false },
    totalVariation: { type: Number },
    deletedAt: { type: Date },
    createdAt: { type: Date },
    updatedAt: { type: Date },
    __v: { type: Number },
  },
  { timestamps: true }
);

const CollectionReport =
  models.CollectionReport ||
  mongoose.model('CollectionReport', collectionReportSchema);

const machineSchema = new Schema(
  {
    _id: { type: String, required: true },
    serialNumber: String,
    custom: { name: String },
    game: String,
    gamingLocation: String,
    relayId: String,
    sasMeters: {
      drop: Number,
      totalCancelledCredits: Number,
      jackpot: Number,
      gamesPlayed: Number,
    },
    collectionMeters: { metersIn: Number, metersOut: Number },
    collectionTime: Date,
    previousCollectionTime: Date,
    collectionMetersHistory: [
      {
        _id: String,
        metersIn: Number,
        metersOut: Number,
        prevMetersIn: Number,
        prevMetersOut: Number,
        timestamp: Date,
        locationReportId: String,
      },
    ],
    deletedAt: Date,
    createdAt: Date,
    updatedAt: Date,
    __v: Number,
  },
  { timestamps: true }
);

const Machine = models.machines || mongoose.model('machines', machineSchema);

const gamingLocationsSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    previousCollectionTime: Date,
  },
  { timestamps: true, versionKey: false }
);

const GamingLocations =
  models.GamingLocations ||
  mongoose.model('GamingLocations', gamingLocationsSchema);

// ============================================================================
// calculateMovement (inlined)
// ============================================================================

function calculateMovement(
  currentMetersIn,
  currentMetersOut,
  previousMeters,
  ramClear,
  ramClearCoinIn,
  ramClearCoinOut,
  ramClearMetersIn,
  ramClearMetersOut
) {
  if (currentMetersIn == null) {
    return { metersIn: 0, metersOut: 0, gross: 0 };
  }
  if (currentMetersOut == null) {
    return { metersIn: 0, metersOut: 0, gross: 0 };
  }
  if (!previousMeters) {
    return { metersIn: 0, metersOut: 0, gross: 0 };
  }

  let metersIn;
  let metersOut;

  if (ramClear) {
    if (ramClearMetersIn != null && ramClearMetersOut != null) {
      metersIn =
        ramClearMetersIn - previousMeters.metersIn + (currentMetersIn - 0);
      metersOut =
        ramClearMetersOut - previousMeters.metersOut + (currentMetersOut - 0);
    } else if (ramClearCoinIn != null && ramClearCoinOut != null) {
      metersIn =
        ramClearCoinIn - previousMeters.metersIn + (currentMetersIn - 0);
      metersOut =
        ramClearCoinOut - previousMeters.metersOut + (currentMetersOut - 0);
    } else {
      metersIn = currentMetersIn;
      metersOut = currentMetersOut;
    }
  } else {
    metersIn = currentMetersIn - previousMeters.metersIn;
    metersOut = currentMetersOut - previousMeters.metersOut;
  }

  const gross = metersIn - metersOut;

  return {
    metersIn: Math.round(metersIn * 100) / 100,
    metersOut: Math.round(metersOut * 100) / 100,
    gross: Math.round(gross * 100) / 100,
  };
}

// ============================================================================
// File Discovery
// ============================================================================

function findLatestDatabaseFile() {
  // Allow specifying file path as CLI argument
  const cliArg = process.argv[2];
  if (cliArg) {
    const resolved = resolve(cliArg);
    if (existsSync(resolved)) {
      console.log(`[findLatestDatabaseFile] Using CLI-specified file: ${resolved}`);
      return resolved;
    }
    console.warn(`[findLatestDatabaseFile] CLI file not found: ${resolved}, falling back to auto-discovery`);
  }

  const projectRoot = process.cwd();
  const files = readdirSync(projectRoot);

  const databaseFiles = files
    .filter(
      (file) =>
        (file.startsWith('datbase-') || file.startsWith('database-')) &&
        file.endsWith('.json') &&
        !file.includes('package')
    )
    .sort();

  if (databaseFiles.length === 0) {
    throw new Error(
      'No datbase-*.json files found. Expected pattern: datbase-YYYY-MM-DD-HH-MM-SS.json'
    );
  }

  const latestFile = databaseFiles[databaseFiles.length - 1];
  console.log(
    `[findLatestDatabaseFile] Found ${databaseFiles.length} database file(s)`
  );
  console.log(`[findLatestDatabaseFile] Using most recent: ${latestFile}`);

  return join(projectRoot, latestFile);
}

function parseFilenameTimestamp(filename) {
  const basename =
    filename.split('/').pop() || filename.split('\\').pop() || filename;
  const match = basename.match(
    /(?:datbase|database)-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.json/
  );

  if (!match) {
    throw new Error(
      `Invalid filename format: ${basename}. Expected: datbase-YYYY-MM-DD-HH-MM-SS.json`
    );
  }

  const [, year, month, day, hours, minutes, seconds] = match;
  const isoString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
  const parsed = new Date(isoString);

  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date parsed from filename: ${isoString}`);
  }

  console.log(
    `[parseFilenameTimestamp] Parsed timestamp: ${parsed.toISOString()}`
  );
  return parsed;
}

// ============================================================================
// JSON Parsing
// ============================================================================

function parseBsonDate(bsonDate) {
  if (!bsonDate) return null;

  if (typeof bsonDate === 'string') {
    // Handle plain date strings like "2026-06-10 17:05:58.147000"
    const fixed = bsonDate.includes(' ') && !bsonDate.includes('T')
      ? bsonDate.replace(' ', 'T') + 'Z'
      : bsonDate;
    return new Date(fixed);
  }

  if (
    typeof bsonDate === 'object' &&
    bsonDate !== null &&
    '$date' in bsonDate
  ) {
    const dateVal = bsonDate.$date;
    if (typeof dateVal === 'string') return new Date(dateVal);
    if (
      typeof dateVal === 'object' &&
      dateVal !== null &&
      '$numberLong' in dateVal
    ) {
      return new Date(Number(dateVal.$numberLong));
    }
  }

  return null;
}

function parseMachinesFromJson(filePath) {
  const rawContent = readFileSync(filePath, 'utf-8');
  const rawData = JSON.parse(rawContent);

  // Handle both array format and object-keyed-by-relayId format
  let rawMachines;
  if (Array.isArray(rawData)) {
    rawMachines = rawData;
  } else if (typeof rawData === 'object' && rawData !== null) {
    // Object keyed by relayId: { "": { wow machine }, "000000000000": { sas machine }, ... }
    rawMachines = Object.values(rawData);
  } else {
    throw new Error('Unexpected JSON format: expected array or object');
  }

  console.log(
    `[parseMachinesFromJson] Read ${rawMachines.length} machine(s) from file`
  );

  return rawMachines.map((machine) => {
    const history = (machine.collectionMetersHistory || []).map((entry) => ({
      metersIn: entry.metersIn,
      metersOut: entry.metersOut,
      prevMetersIn: entry.prevMetersIn,
      prevMetersOut: entry.prevMetersOut,
      timestamp: parseBsonDate(entry.timestamp) || new Date(),
      locationReportId: entry.locationReportId,
    }));

    return {
      _id: machine._id,
      serialNumber: machine.serialNumber || '',
      customName: machine.custom?.name,
      game: machine.game,
      gamingLocation: machine.gamingLocation,
      relayId: machine.relayId,
      isSasMachine: machine.isSasMachine,
      sasMeters: {
        drop: machine.sasMeters?.drop ?? 0,
        totalCancelledCredits: machine.sasMeters?.totalCancelledCredits ?? 0,
        jackpot: machine.sasMeters?.jackpot ?? 0,
        gamesPlayed: machine.sasMeters?.gamesPlayed ?? 0,
      },
      collectionMeters: {
        metersIn: machine.collectionMeters?.metersIn ?? 0,
        metersOut: machine.collectionMeters?.metersOut ?? 0,
      },
      collectionTime: parseBsonDate(machine.collectionTime),
      previousCollectionTime: parseBsonDate(machine.previousCollectionTime),
      collectionMetersHistory: history,
    };
  });
}

// ============================================================================
// Previous Meters Resolution
// ============================================================================

function resolvePreviousMeters(machine) {
  if (machine.collectionMetersHistory.length > 0) {
    const lastEntry =
      machine.collectionMetersHistory[
        machine.collectionMetersHistory.length - 1
      ];
    return {
      prevIn: lastEntry.metersIn,
      prevOut: lastEntry.metersOut,
    };
  }

  return {
    prevIn: machine.collectionMeters.metersIn,
    prevOut: machine.collectionMeters.metersOut,
  };
}

// ============================================================================
// Collection Creation
// ============================================================================

function createCollections(machines, locationReportId, sasEndTime, locationId) {
  const results = [];

  for (const machine of machines) {
    const metersIn = machine.sasMeters.drop;
    const metersOut = machine.sasMeters.totalCancelledCredits;
    const { prevIn, prevOut } = resolvePreviousMeters(machine);

    const sasStartTime =
      machine.collectionTime ||
      machine.previousCollectionTime ||
      new Date(sasEndTime.getTime() - 24 * 60 * 60 * 1000);

    const movement = calculateMovement(
      metersIn,
      metersOut,
      { metersIn: prevIn, metersOut: prevOut, collectionTime: sasStartTime },
      false,
      undefined,
      undefined,
      undefined,
      undefined
    );

    const sasMeters = {
      machine: machine._id,
      drop: metersIn,
      totalCancelledCredits: metersOut,
      gross: metersIn - metersOut,
      gamesPlayed: machine.sasMeters.gamesPlayed,
      jackpot: machine.sasMeters.jackpot,
      sasStartTime: sasEndTime,
      sasEndTime: sasStartTime,
    };

    const collectionId = new mongoose.Types.ObjectId().toHexString();

    const collection = {
      _id: collectionId,
      isCompleted: true,
      metersIn,
      metersOut,
      prevIn,
      prevOut,
      softMetersIn: 0,
      softMetersOut: 0,
      notes: '',
      timestamp: sasEndTime,
      collectionTime: sasEndTime,
      location: locationId,
      collector: COLLECTOR_ID,
      locationReportId,
      sasMeters,
      movement,
      machineCustomName: machine.customName || '',
      machineId: machine._id,
      machineName: machine.serialNumber,
      game: machine.game,
      serialNumber: machine.serialNumber,
      deletedAt: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0,
    };

    results.push({ collection, machineId: machine._id });
  }

  return results;
}

// ============================================================================
// Report Summary Calculation
// ============================================================================

function calculateReportSummary(collections) {
  let totalDrop = 0;
  let totalCancelled = 0;
  let totalSasGross = 0;
  let totalJackpot = 0;

  for (const collection of collections) {
    totalDrop += collection.movement?.metersIn ?? 0;
    totalCancelled += collection.movement?.metersOut ?? 0;
    totalSasGross += collection.sasMeters?.gross ?? 0;
    totalJackpot += collection.sasMeters?.jackpot ?? 0;
  }

  const totalGross = totalDrop - totalCancelled;

  console.log('[calculateReportSummary] Totals:', {
    totalDrop,
    totalCancelled,
    totalGross,
    totalSasGross,
    totalJackpot,
  });

  return { totalDrop, totalCancelled, totalGross, totalSasGross, totalJackpot };
}

// ============================================================================
// Report Creation
// ============================================================================

async function createReport(params) {
  const {
    locationReportId,
    locationId,
    locationName,
    timestamp,
    machineCount,
    totals,
  } = params;

  const reportDoc = {
    _id: locationReportId,
    variance: 0,
    previousBalance: 0,
    currentBalance: 0,
    amountToCollect: 0,
    amountCollected: 0,
    amountUncollected: 0,
    partnerProfit: 0,
    taxes: 0,
    advance: 0,
    collector: COLLECTOR_ID,
    collectorName: COLLECTOR_NAME,
    locationName,
    locationReportId,
    location: locationId,
    totalDrop: totals.totalDrop,
    totalCancelled: totals.totalCancelled,
    totalGross: totals.totalGross,
    totalSasGross: totals.totalSasGross,
    timestamp,
    machinesCollected: String(machineCount),
    includeJackpot: false,
    deletedAt: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    __v: 0,
  };

  const created = await CollectionReport.create(reportDoc);
  console.log(`[createReport] Created report: ${created._id}`);
  return created;
}

// ============================================================================
// Machine Meter Updates
// ============================================================================

async function updateMachines(machines, collections, locationReportId, sasEndTime) {
  const updatePromises = machines.map(async (machine) => {
    const collectionEntry = collections.find((c) => c.machineId === machine._id);
    if (!collectionEntry) {
      console.warn(
        `[updateMachines] No collection found for machine ${machine._id}`
      );
      return;
    }

    const { collection } = collectionEntry;

    const historyEntry = {
      _id: new mongoose.Types.ObjectId().toHexString(),
      metersIn: collection.metersIn,
      metersOut: collection.metersOut,
      prevMetersIn: collection.prevIn,
      prevMetersOut: collection.prevOut,
      timestamp: sasEndTime,
      locationReportId,
    };

    await Machine.findOneAndUpdate(
      { _id: machine._id },
      {
        $set: {
          'collectionMeters.metersIn': collection.metersIn,
          'collectionMeters.metersOut': collection.metersOut,
          collectionTime: sasEndTime,
          updatedAt: new Date(),
        },
        $push: {
          collectionMetersHistory: historyEntry,
        },
      }
    ).catch((err) => {
      console.error(
        `[updateMachines] Error updating machine ${machine._id}:`,
        err instanceof Error ? err.message : 'Unknown error'
      );
    });
  });

  await Promise.all(updatePromises);
  console.log(`[updateMachines] Updated ${machines.length} machines`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const startTime = Date.now();

  try {
    console.log('\n=== STEP 1: Discovering database file ===');
    const filePath = findLatestDatabaseFile();
    const filename = filePath.split(/[/\\]/).pop() || '';
    const sasEndTime = parseFilenameTimestamp(filename);
    const allMachines = parseMachinesFromJson(filePath);

    // Filter to SAS machines only (skip WOW/non-SAS)
    const machines = allMachines.filter((m) => m.isSasMachine !== false);

    if (machines.length === 0) {
      console.error('[main] No SAS machines found in file. Aborting.');
      return;
    }

    console.log(`[main] Processing ${machines.length} SAS machines (skipped ${allMachines.length - machines.length} non-SAS)`);

    console.log('\n=== STEP 2: Connecting to MongoDB ===');
    await mongoose.connect(MONGODB_URI);
    console.log('[main] Connected to database');

    console.log('\n=== STEP 3: Resolving location ===');
    const locationId = machines[0].gamingLocation;
    const location = await GamingLocations.findOne({ _id: locationId }).lean();

    if (!location) {
      console.error(`[main] Location not found: ${locationId}. Aborting.`);
      return;
    }

    console.log(`[main] Location: ${location.name} (${locationId})`);

    console.log('\n=== STEP 4: Generating report ID ===');
    const locationReportId = randomUUID();
    console.log(`[main] Report ID: ${locationReportId}`);

    console.log('\n=== STEP 5: Creating collections ===');
    const collectionResults = createCollections(
      machines,
      locationReportId,
      sasEndTime,
      locationId
    );

    const collectionDocs = collectionResults.map((r) => r.collection);
    console.log(`[main] Created ${collectionDocs.length} collection documents`);

    await Collections.insertMany(collectionDocs);
    console.log('[main] Inserted all collections into database');

    console.log('\n=== STEP 6: Calculating report summary ===');
    const totals = calculateReportSummary(collectionDocs);

    console.log('\n=== STEP 7: Creating collection report ===');
    await createReport({
      locationReportId,
      locationId,
      locationName: location.name,
      timestamp: sasEndTime,
      machineCount: machines.length,
      totals,
    });

    console.log('\n=== STEP 8: Updating machine meters ===');
    await updateMachines(
      machines,
      collectionResults,
      locationReportId,
      sasEndTime
    );

    const duration = Date.now() - startTime;
    console.log('\n=== SUMMARY ===');
    console.log(`Report ID:       ${locationReportId}`);
    console.log(`Location:        ${location.name} (${locationId})`);
    console.log(`Machines:        ${machines.length}`);
    console.log(`SAS End Time:    ${sasEndTime.toISOString()}`);
    console.log(`Total Drop:      ${totals.totalDrop}`);
    console.log(`Total Cancelled: ${totals.totalCancelled}`);
    console.log(`Total Gross:     ${totals.totalGross}`);
    console.log(`Total SAS Gross: ${totals.totalSasGross}`);
    console.log(`Duration:        ${duration}ms`);
    console.log('\nDone.');
  } catch (error) {
    console.error(
      '[main] Error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
  } finally {
    await mongoose.disconnect();
    console.log('[main] Disconnected from database');
  }
}

main();
