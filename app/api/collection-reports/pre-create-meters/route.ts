import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { Collections } from '@/app/api/lib/models/collections';
import { appendMeterIdsToCollections } from '@/app/api/lib/helpers/collectionReport/reportCreation';
import { generateMongoId } from '@/lib/utils/id';
import { isWowMachine } from '@/shared/utils/wowMachine';
import {
  logRouteRequest,
  logRouteCreate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import type { GamingMachine, MeterDocument, MetersData } from '@/shared/types';

const ROUTE_PATH = '/api/collection-reports/pre-create-meters';
const FUNCTION_NAME = 'POST /api/collection-reports/pre-create-meters';

type PreCreateMetersBody = {
  machineId: string;
  collectionId?: string;
  locationId: string;
  sessionId?: string;
  metersIn: number;
  metersOut: number;
  prevMetersIn: number;
  prevMetersOut: number;
  ramClear?: boolean;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
  sasEndTime?: string;
};

type MachineResult = {
  machineId: string;
  customName: string;
  success: boolean;
  created: boolean;
  skipped: boolean;
  error?: string;
  updated?: boolean;
};

async function processSingleMachine(
  payload: PreCreateMetersBody
): Promise<MachineResult> {
  const {
    machineId, collectionId, locationId, sessionId,
    metersIn, metersOut, prevMetersIn, prevMetersOut,
    ramClear, ramClearMetersIn, ramClearMetersOut, sasEndTime,
  } = payload;

  const machineDoc = await Machine.findOne(
    { _id: machineId },
    'relayId lastActivity custom.name meta.dataSync.source'
  ).lean<Pick<GamingMachine, 'relayId' | 'lastActivity' | 'custom' | 'meta'>>();

  const customName = machineDoc?.custom?.name ?? machineId;

  if (isWowMachine(machineDoc)) {
    return { machineId, customName, success: true, created: false, skipped: true };
  }

  const hasRelay = !!machineDoc?.relayId;
  const OFFLINE_THRESHOLD_MS = 3 * 60 * 1000;
  const lastActivityMs = machineDoc?.lastActivity
    ? Date.now() - new Date(machineDoc.lastActivity).getTime()
    : null;
  const isOffline = hasRelay && (!machineDoc?.lastActivity || (lastActivityMs !== null && lastActivityMs >= OFFLINE_THRESHOLD_MS));

  let existingMeterId: string | undefined;
  let existingRamClearMeterId: string | undefined;
  if (collectionId) {
    const existingCollection = await Collections.findOne(
      { _id: collectionId },
      'meterId ramClearMeterId'
    ).lean<{ meterId?: string; ramClearMeterId?: string }>();
    if (existingCollection?.meterId) {
      existingMeterId = existingCollection.meterId;
      existingRamClearMeterId = existingCollection.ramClearMeterId;
    }
  }

  if (sessionId && !existingMeterId) {
    const existingSessionMeters = await Meters.find(
      { machine: machineId, locationSession: sessionId, meterSource: 'COLLECTION_REPORT' },
      '_id isRamClear'
    ).lean<{ _id: string; isRamClear?: boolean }[]>();
    for (const existingMeter of existingSessionMeters) {
      if (existingMeter.isRamClear) existingRamClearMeterId = existingMeter._id;
      else existingMeterId = existingMeter._id;
    }
  }

  if (hasRelay && !isOffline && !existingMeterId) {
    return { machineId, customName, success: true, created: false, skipped: true };
  }

  const baseReadAt = sasEndTime ? new Date(sasEndTime) : new Date();
  const baseCreatedAt = new Date();

  let prevMeterDoc: MeterDocument | null = null;
  if (isOffline) {
    const prevMeterQuery = sessionId
      ? { machine: machineId, locationSession: { $ne: sessionId }, readAt: { $lt: baseReadAt } }
      : { machine: machineId, readAt: { $lt: baseReadAt } };
    prevMeterDoc = await Meters.findOne(prevMeterQuery).sort({ readAt: -1 }).lean<MeterDocument>();
  }

  const metersToCreate: MetersData[] = [];
  const currentMetersIn = metersIn;
  const currentMetersOut = metersOut;
  const previousMetersIn = prevMetersIn ?? 0;
  const previousMetersOut = prevMetersOut ?? 0;

  let movementIn: number;
  let movementOut: number;
  if (isOffline && prevMeterDoc) {
    movementIn = Math.round((currentMetersIn - (prevMeterDoc.drop ?? 0)) * 100) / 100;
    movementOut = Math.round((currentMetersOut - (prevMeterDoc.totalCancelledCredits ?? 0)) * 100) / 100;
  } else {
    movementIn = currentMetersIn - previousMetersIn;
    movementOut = currentMetersOut - previousMetersOut;
  }

  if (ramClear) {
    const ramClearIn = ramClearMetersIn ?? 0;
    const ramClearOut = ramClearMetersOut ?? 0;
    const ramBaselineIn = isOffline && prevMeterDoc ? (prevMeterDoc.drop ?? 0) : previousMetersIn;
    const ramBaselineOut = isOffline && prevMeterDoc ? (prevMeterDoc.totalCancelledCredits ?? 0) : previousMetersOut;
    const ramMovementIn = Math.round((ramClearIn - ramBaselineIn) * 100) / 100;
    const ramMovementOut = Math.round((ramClearOut - ramBaselineOut) * 100) / 100;

    metersToCreate.push({
      _id: existingRamClearMeterId || await generateMongoId(),
      machine: machineId, location: locationId,
      ...(sessionId ? { locationSession: sessionId } : {}),
      movement: { coinIn: 0, coinOut: 0, jackpot: 0, totalHandPaidCancelledCredits: 0, totalCancelledCredits: ramMovementOut, gamesPlayed: 0, gamesWon: 0, currentCredits: 0, totalWonCredits: 0, drop: ramMovementIn },
      coinIn: isOffline && prevMeterDoc ? (prevMeterDoc.coinIn ?? 0) : 0,
      coinOut: isOffline && prevMeterDoc ? (prevMeterDoc.coinOut ?? 0) : 0,
      jackpot: isOffline && prevMeterDoc ? (prevMeterDoc.jackpot ?? 0) : 0,
      totalHandPaidCancelledCredits: isOffline && prevMeterDoc ? (prevMeterDoc.totalHandPaidCancelledCredits ?? 0) : 0,
      currentCredits: isOffline && prevMeterDoc ? (prevMeterDoc.currentCredits ?? 0) : 0,
      totalWonCredits: isOffline && prevMeterDoc ? (prevMeterDoc.totalWonCredits ?? 0) : 0,
      gamesPlayed: isOffline && prevMeterDoc ? (prevMeterDoc.gamesPlayed ?? 0) : 0,
      gamesWon: isOffline && prevMeterDoc ? (prevMeterDoc.gamesWon ?? 0) : 0,
      totalCancelledCredits: ramClearOut, drop: ramClearIn,
      meterSource: 'COLLECTION_REPORT' as const, isRamClear: true,
      isSupplemental: isOffline || !!existingMeterId,
      readAt: new Date(baseReadAt.getTime() - 1000), createdAt: baseCreatedAt,
    });

    metersToCreate.push({
      _id: existingMeterId || await generateMongoId(),
      machine: machineId, location: locationId,
      ...(sessionId ? { locationSession: sessionId } : {}),
      movement: { coinIn: 0, coinOut: 0, jackpot: 0, totalHandPaidCancelledCredits: 0, totalCancelledCredits: currentMetersOut, gamesPlayed: 0, gamesWon: 0, currentCredits: 0, totalWonCredits: 0, drop: currentMetersIn },
      coinIn: 0, coinOut: 0, jackpot: 0, totalHandPaidCancelledCredits: 0,
      totalCancelledCredits: currentMetersOut, gamesPlayed: 0, gamesWon: 0,
      currentCredits: 0, totalWonCredits: 0, drop: currentMetersIn,
      meterSource: 'COLLECTION_REPORT' as const, isRamClear: false,
      isSupplemental: isOffline || !!existingMeterId,
      readAt: new Date(baseReadAt.getTime() + 1000), createdAt: new Date(baseCreatedAt.getTime() + 1000),
    });
  } else {
    metersToCreate.push({
      _id: existingMeterId || await generateMongoId(),
      machine: machineId, location: locationId,
      ...(sessionId ? { locationSession: sessionId } : {}),
      movement: { coinIn: 0, coinOut: 0, jackpot: 0, totalHandPaidCancelledCredits: 0, totalCancelledCredits: movementOut, gamesPlayed: 0, gamesWon: 0, currentCredits: 0, totalWonCredits: 0, drop: movementIn },
      coinIn: isOffline && prevMeterDoc ? (prevMeterDoc.coinIn ?? 0) : 0,
      coinOut: isOffline && prevMeterDoc ? (prevMeterDoc.coinOut ?? 0) : 0,
      jackpot: isOffline && prevMeterDoc ? (prevMeterDoc.jackpot ?? 0) : 0,
      totalHandPaidCancelledCredits: isOffline && prevMeterDoc ? (prevMeterDoc.totalHandPaidCancelledCredits ?? 0) : 0,
      currentCredits: isOffline && prevMeterDoc ? (prevMeterDoc.currentCredits ?? 0) : 0,
      totalWonCredits: isOffline && prevMeterDoc ? (prevMeterDoc.totalWonCredits ?? 0) : 0,
      gamesPlayed: isOffline && prevMeterDoc ? (prevMeterDoc.gamesPlayed ?? 0) : 0,
      gamesWon: isOffline && prevMeterDoc ? (prevMeterDoc.gamesWon ?? 0) : 0,
      totalCancelledCredits: currentMetersOut, drop: currentMetersIn,
      meterSource: 'COLLECTION_REPORT' as const,
      isRamClear: false,
      isSupplemental: isOffline || !!existingMeterId,
      readAt: baseReadAt, createdAt: baseCreatedAt,
    });
  }

  const upsertOps = metersToCreate.map(meter => ({
    updateOne: {
      filter: { _id: meter._id },
      update: {
        $set: {
          machine: meter.machine, location: meter.location,
          ...(meter.locationSession ? { locationSession: meter.locationSession } : {}),
          movement: meter.movement, coinIn: meter.coinIn, coinOut: meter.coinOut,
          jackpot: meter.jackpot, totalHandPaidCancelledCredits: meter.totalHandPaidCancelledCredits,
          currentCredits: meter.currentCredits, totalWonCredits: meter.totalWonCredits,
          gamesPlayed: meter.gamesPlayed, gamesWon: meter.gamesWon,
          totalCancelledCredits: meter.totalCancelledCredits, drop: meter.drop,
          meterSource: meter.meterSource, isRamClear: meter.isRamClear,
          isSupplemental: meter.isSupplemental,
          readAt: meter.readAt, updatedAt: new Date(),
        },
        $setOnInsert: {
          _id: meter._id, createdAt: meter.createdAt,
        },
      },
      upsert: true,
    },
  }));

  await Meters.bulkWrite(upsertOps);

  if (collectionId) {
    await appendMeterIdsToCollections(collectionId, metersToCreate);
  }

  const isUpdate = !!existingMeterId;
  return {
    machineId, customName, success: true,
    created: true, skipped: false,
    ...(isUpdate ? { updated: true } : {}),
  };
}

export async function POST(req: NextRequest) {
  const user = extractUserFromRequest(req);
  return withApiAuth(req, async () => {
    const startTime = Date.now();
    logRouteRequest(FUNCTION_NAME, 'POST', ROUTE_PATH, user);

    let body: { machines?: PreCreateMetersBody[] } | PreCreateMetersBody;
    try {
      body = await req.json();
    } catch {
      logRouteError(FUNCTION_NAME, 'POST', ROUTE_PATH, 'Invalid JSON body', user);
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const machines = Array.isArray((body as { machines?: PreCreateMetersBody[] }).machines)
      ? (body as { machines: PreCreateMetersBody[] }).machines
      : [body as PreCreateMetersBody];

    if (machines.length === 0) {
      return NextResponse.json({ success: true, results: [] });
    }

    const results = await Promise.all(
      machines.map(machine => processSingleMachine(machine))
    );

    const anyFailed = results.some(r => !r.success);
    const anyCreated = results.some(r => r.created);

    const elapsed = Date.now() - startTime;
    console.log(
      `[pre-create-meters] ✅ Batch complete: ${results.length} machine(s), ` +
      `${results.filter(r => r.created).length} created, ${results.filter(r => r.skipped).length} skipped, ` +
      `anyFailed=${anyFailed} elapsed=${elapsed}ms`
    );
    logRouteCreate(FUNCTION_NAME, 'POST', ROUTE_PATH, machines.length, user, elapsed);

    return NextResponse.json({
      success: !anyFailed,
      results,
      total: machines.length,
      created: anyCreated,
    });
  });
}
