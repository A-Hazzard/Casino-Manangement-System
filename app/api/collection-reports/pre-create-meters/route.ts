/**
 * @module app/api/collection-reports/pre-create-meters
 *
 * Pre-creates or updates manual Meter document(s) for a single non-SMIB or
 * offline-SMIB machine BEFORE the variation check fires and BEFORE
 * createCollectionReport runs.
 *
 * Features:
 * - Returns early (skipped) for online SMIB machines — relay supplies meters.
 * - Idempotency via Collection.meterId: if meterId is already set the machine
 *   was already handled; updates existing meter(s) with current values.
 * - RAM clear: creates/updates 2 meter docs (pre-reset + post-reset); normal: 1 doc.
 * - For V2 sessions, sets locationSession on the meter for deleteMany safety.
 * - Returns customName fetched from the Machine doc for progress display.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { Collections } from '@/app/api/lib/models/collections';
import { appendMeterIdsToCollections } from '@/app/api/lib/helpers/collectionReport/reportCreation';
import { generateMongoId } from '@/lib/utils/id';
import {
  logRouteRequest,
  logRouteCreate,
  logRouteWarn,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import type { GamingMachine, MeterDocument, MetersData } from '@/shared/types';

const ROUTE_PATH = '/api/collection-reports/pre-create-meters';
const FUNCTION_NAME = 'POST /api/collection-reports/pre-create-meters';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// POST handler
// ============================================================================

/**
 * POST /api/collection-reports/pre-create-meters
 *
 * Steps:
 * 1. Validate required fields
 * 2. Fetch machine document (relayId, lastActivity, custom.name)
 * 3. Determine isNoSmibMachine / isOffline
 * 4. Skip if online SMIB (relay supplies meters)
 * 5. Skip if Collection already has meterId (idempotency guard for V1)
 * 6. Build meter document(s) — 2 for RAM clear, 1 otherwise
 * 7. Insert meters into DB
 * 8. Append meterId(s) to Collection doc (V1 only)
 * 9. Return result with customName for UI display
 */
export async function POST(req: NextRequest) {
  const user = extractUserFromRequest(req);
  return withApiAuth(req, async () => {
    const startTime = Date.now();
    logRouteRequest(FUNCTION_NAME, 'POST', ROUTE_PATH, user);

    // ============================================================================
    // STEP 1: Parse and validate body
    // ============================================================================
    let body: PreCreateMetersBody;
    try {
      body = await req.json();
    } catch {
      logRouteError(FUNCTION_NAME, 'POST', ROUTE_PATH, 'Invalid JSON body', user);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const {
      machineId,
      collectionId,
      locationId,
      sessionId,
      metersIn,
      metersOut,
      prevMetersIn,
      prevMetersOut,
      ramClear,
      ramClearMetersIn,
      ramClearMetersOut,
      sasEndTime,
    } = body;

    console.log(
      `[pre-create-meters] ▶️ Request body: machine=${machineId} collection=${collectionId ?? 'none'} ` +
        `session=${sessionId ?? 'none'} location=${locationId} metersIn=${metersIn} metersOut=${metersOut} ` +
        `prevIn=${prevMetersIn} prevOut=${prevMetersOut} ramClear=${!!ramClear}`
    );

    if (!machineId || !locationId || metersIn == null || metersOut == null) {
      logRouteError(
        FUNCTION_NAME,
        'POST',
        ROUTE_PATH,
        `Missing required fields: machineId=${machineId} locationId=${locationId} metersIn=${metersIn} metersOut=${metersOut}`,
        user
      );
      return NextResponse.json(
        { success: false, error: 'machineId, locationId, metersIn and metersOut are required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Fetch machine document
    // ============================================================================
    const machineDoc = await Machine.findOne(
      { _id: machineId },
      'relayId lastActivity custom.name'
    ).lean<Pick<GamingMachine, 'relayId' | 'lastActivity' | 'custom'>>();

    if (!machineDoc) {
      logRouteWarn(
        FUNCTION_NAME,
        'POST',
        ROUTE_PATH,
        `Machine not found: ${machineId} — cannot determine SMIB status`,
        user
      );
    }

    const customName = machineDoc?.custom?.name ?? machineId;

    // ============================================================================
    // STEP 3: Determine SMIB status
    // ============================================================================
    const hasRelay = !!machineDoc?.relayId;
    // const OFFLINE_THRESHOLD_MS = 72 * 60 * 60 * 1000; // 72 hours
    const OFFLINE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes
    const lastActivityMs = machineDoc?.lastActivity
      ? new Date().getTime() - new Date(machineDoc.lastActivity).getTime()
      : null;
    const isOffline =
      hasRelay &&
      (!machineDoc?.lastActivity || (lastActivityMs !== null && lastActivityMs >= OFFLINE_THRESHOLD_MS));
    const smibStatus = !hasRelay
      ? 'NO-SMIB (no relayId → will create meter)'
      : isOffline
        ? 'OFFLINE SMIB (stale lastActivity → will create meter)'
        : 'ONLINE SMIB (relay supplies meters → will skip)';

    console.log(
      `[pre-create-meters] 🔎 machine=${machineId} customName="${customName}" relayId=${machineDoc?.relayId ?? 'none'} ` +
        `hasRelay=${hasRelay} isOffline=${isOffline} ` +
        `lastActivityAgo=${lastActivityMs !== null ? `${Math.round(lastActivityMs / 1000)}s` : 'never'} ` +
        `→ ${smibStatus}`
    );

    // ============================================================================
    // STEP 4: Check for existing supplemental meter on Collection (update vs create)
    //         Must happen before the online-skip so that collections taken while a
    //         machine was offline are always updated — even if the relay is back online.
    // ============================================================================
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
        console.log(
          `[pre-create-meters] 🔄 machine=${machineId} collection=${collectionId} — meterId ${existingMeterId} already set, will UPDATE existing meter(s)`
        );
      }
    }

    // ============================================================================
    // STEP 5: Skip online SMIB machines that have no supplemental meter.
    //         If an existing meterId is present the collection was originally taken
    //         while the machine was offline — we must update that meter even if the
    //         relay is back online now.
    // ============================================================================
    if (hasRelay && !isOffline && existingMeterId) {
      // Machine is online NOW but has a supplemental meter from when it was offline.
      // We must still update the meter so check-variations gets the fresh values.
      console.log(
        '[pre-create-meters] ONLINE+EXISTING_METER machine=' + machineId +
        ' ("' + customName + '") was offline when collected, existingMeterId=' + existingMeterId +
        ' -- will UPDATE meter with new values'
      );
    }
    if (hasRelay && !isOffline && !existingMeterId) {
      logRouteWarn(
        FUNCTION_NAME,
        'POST',
        ROUTE_PATH,
        `SKIPPED machine ${machineId} ("${customName}") — online SMIB, relay supplies meters (lastActivity ${lastActivityMs !== null ? `${Math.round(lastActivityMs / 1000)}s ago` : 'unknown'})`,
        user
      );
      if (Date.now() - startTime > 1000) {
        console.warn(`[pre-create-meters] Slow response: ${Date.now() - startTime}ms`);
      }
      return NextResponse.json({
        success: true,
        customName,
        created: false,
        skipped: true,
      });
    }

    // ============================================================================
    // STEP 6: Build meter document(s)
    // ============================================================================
    const baseReadAt = sasEndTime ? new Date(sasEndTime) : new Date();
    const baseCreatedAt = new Date();

    let prevMeterDoc: MeterDocument | null = null;
    if (isOffline) {
      const prevMeterQuery = sessionId
        ? {
            machine: machineId,
            locationSession: { $ne: sessionId },
            readAt: { $lt: baseReadAt },
          }
        : {
            machine: machineId,
          };
      prevMeterDoc = await Meters.findOne(prevMeterQuery)
        .sort({ readAt: -1 })
        .lean<MeterDocument>();
    }

    const metersToCreate: MetersData[] = [];
    const currentMetersIn = metersIn;
    const currentMetersOut = metersOut;
    const previousMetersIn = prevMetersIn ?? 0;
    const previousMetersOut = prevMetersOut ?? 0;

    // Standard movement deltas
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
      // RAM CLEAR: create 2 meter docs
      const ramClearIn = ramClearMetersIn ?? 0;
      const ramClearOut = ramClearMetersOut ?? 0;

      const ramBaselineIn = isOffline && prevMeterDoc ? (prevMeterDoc.drop ?? 0) : previousMetersIn;
      const ramBaselineOut = isOffline && prevMeterDoc ? (prevMeterDoc.totalCancelledCredits ?? 0) : previousMetersOut;
      const ramMovementIn = Math.round((ramClearIn - ramBaselineIn) * 100) / 100;
      const ramMovementOut = Math.round((ramClearOut - ramBaselineOut) * 100) / 100;

      const ramClearMeterId = existingRamClearMeterId || await generateMongoId();
      metersToCreate.push({
        _id: ramClearMeterId,
        machine: machineId,
        location: locationId,
        ...(sessionId ? { locationSession: sessionId } : {}),
        movement: {
          coinIn: 0,
          coinOut: 0,
          jackpot: 0,
          totalHandPaidCancelledCredits: 0,
          totalCancelledCredits: ramMovementOut,
          gamesPlayed: 0,
          gamesWon: 0,
          currentCredits: 0,
          totalWonCredits: 0,
          drop: ramMovementIn,
        },
        coinIn: isOffline && prevMeterDoc ? (prevMeterDoc.coinIn ?? 0) : 0,
        coinOut: isOffline && prevMeterDoc ? (prevMeterDoc.coinOut ?? 0) : 0,
        jackpot: isOffline && prevMeterDoc ? (prevMeterDoc.jackpot ?? 0) : 0,
        totalHandPaidCancelledCredits: isOffline && prevMeterDoc ? (prevMeterDoc.totalHandPaidCancelledCredits ?? 0) : 0,
        currentCredits: isOffline && prevMeterDoc ? (prevMeterDoc.currentCredits ?? 0) : 0,
        totalWonCredits: isOffline && prevMeterDoc ? (prevMeterDoc.totalWonCredits ?? 0) : 0,
        gamesPlayed: isOffline && prevMeterDoc ? (prevMeterDoc.gamesPlayed ?? 0) : 0,
        gamesWon: isOffline && prevMeterDoc ? (prevMeterDoc.gamesWon ?? 0) : 0,
        totalCancelledCredits: ramClearOut,
        drop: ramClearIn,
        meterSource: 'COLLECTION_REPORT' as const,
        isRamClear: true,
        isSupplemental: isOffline || !!existingMeterId,
        readAt: new Date(baseReadAt.getTime() - 1000),
        createdAt: baseCreatedAt,
      });

      const currentMeterId = existingMeterId || await generateMongoId();
      metersToCreate.push({
        _id: currentMeterId,
        machine: machineId,
        location: locationId,
        ...(sessionId ? { locationSession: sessionId } : {}),
        movement: {
          coinIn: 0,
          coinOut: 0,
          jackpot: 0,
          totalHandPaidCancelledCredits: 0,
          totalCancelledCredits: currentMetersOut,
          gamesPlayed: 0,
          gamesWon: 0,
          currentCredits: 0,
          totalWonCredits: 0,
          drop: currentMetersIn,
        },
        coinIn: 0,
        coinOut: 0,
        jackpot: 0,
        totalHandPaidCancelledCredits: 0,
        totalCancelledCredits: currentMetersOut,
        gamesPlayed: 0,
        gamesWon: 0,
        currentCredits: 0,
        totalWonCredits: 0,
        drop: currentMetersIn,
        meterSource: 'COLLECTION_REPORT' as const,
        isRamClear: false,
        isSupplemental: isOffline || !!existingMeterId,
        readAt: new Date(baseReadAt.getTime() + 1000),
        createdAt: new Date(baseCreatedAt.getTime() + 1000),
      });
    } else {
      // NORMAL: create 1 meter doc
      const meterId = existingMeterId || await generateMongoId();
      metersToCreate.push({
        _id: meterId,
        machine: machineId,
        location: locationId,
        ...(sessionId ? { locationSession: sessionId } : {}),
        movement: {
          coinIn: 0,
          coinOut: 0,
          jackpot: 0,
          totalHandPaidCancelledCredits: 0,
          totalCancelledCredits: movementOut,
          gamesPlayed: 0,
          gamesWon: 0,
          currentCredits: 0,
          totalWonCredits: 0,
          drop: movementIn,
        },
        coinIn: isOffline && prevMeterDoc ? (prevMeterDoc.coinIn ?? 0) : 0,
        coinOut: isOffline && prevMeterDoc ? (prevMeterDoc.coinOut ?? 0) : 0,
        jackpot: isOffline && prevMeterDoc ? (prevMeterDoc.jackpot ?? 0) : 0,
        totalHandPaidCancelledCredits: isOffline && prevMeterDoc ? (prevMeterDoc.totalHandPaidCancelledCredits ?? 0) : 0,
        currentCredits: isOffline && prevMeterDoc ? (prevMeterDoc.currentCredits ?? 0) : 0,
        totalWonCredits: isOffline && prevMeterDoc ? (prevMeterDoc.totalWonCredits ?? 0) : 0,
        gamesPlayed: isOffline && prevMeterDoc ? (prevMeterDoc.gamesPlayed ?? 0) : 0,
        gamesWon: isOffline && prevMeterDoc ? (prevMeterDoc.gamesWon ?? 0) : 0,
        totalCancelledCredits: currentMetersOut,
        drop: currentMetersIn,
        meterSource: 'COLLECTION_REPORT' as const,
        isSupplemental: isOffline || !!existingMeterId,
        readAt: baseReadAt,
        createdAt: baseCreatedAt,
      });
    }

    // ============================================================================
    // STEP 7: Upsert meters into DB (creates new or updates existing)
    // ============================================================================
    const isUpdate = !!existingMeterId;
    console.log(
      `[pre-create-meters] 💾 Upserting ${metersToCreate.length} meter doc(s) for machine=${machineId} (${isUpdate ? 'UPDATE' : 'CREATE'}): ` +
        metersToCreate
          .map(
            meter =>
              `{_id=${meter._id} drop=${meter.drop} tcc=${meter.totalCancelledCredits} ` +
              `movementDrop=${meter.movement?.drop} movementTcc=${meter.movement?.totalCancelledCredits} ` +
              `ramClear=${!!meter.isRamClear} supplemental=${!!meter.isSupplemental}}`
          )
          .join(', ')
    );
    try {
      const upsertOps = metersToCreate.map(meter => ({
        updateOne: {
          filter: { _id: meter._id },
          update: {
            $set: {
              machine: meter.machine,
              location: meter.location,
              ...(meter.locationSession ? { locationSession: meter.locationSession } : {}),
              movement: meter.movement,
              coinIn: meter.coinIn,
              coinOut: meter.coinOut,
              jackpot: meter.jackpot,
              totalHandPaidCancelledCredits: meter.totalHandPaidCancelledCredits,
              currentCredits: meter.currentCredits,
              totalWonCredits: meter.totalWonCredits,
              gamesPlayed: meter.gamesPlayed,
              gamesWon: meter.gamesWon,
              totalCancelledCredits: meter.totalCancelledCredits,
              drop: meter.drop,
              meterSource: meter.meterSource,
              isSupplemental: meter.isSupplemental,
              readAt: meter.readAt,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              _id: meter._id,
              createdAt: meter.createdAt,
              ...(meter.isRamClear !== undefined ? { isRamClear: meter.isRamClear } : {}),
            },
          },
          upsert: true,
        },
      }));
      const result = await Meters.bulkWrite(upsertOps);
      console.log(
        `[pre-create-meters] 💾 BulkWrite result: matched=${result.matchedCount} modified=${result.modifiedCount} upserted=${result.upsertedCount}`
      );
    } catch (err) {
      logRouteError(
        FUNCTION_NAME,
        'POST',
        ROUTE_PATH,
        `bulkWrite failed for machine ${machineId}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        user
      );
      return NextResponse.json(
        {
          success: false,
          customName,
          created: false,
          skipped: false,
          error: err instanceof Error ? err.message : 'Failed to upsert meter documents',
        },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 8: Write meterId(s) back to Collection doc (only for new meters)
    // ============================================================================
    if (collectionId && !isUpdate) {
      await appendMeterIdsToCollections(collectionId, metersToCreate);
      console.log(
        `[pre-create-meters] 🔗 Wrote meterId(s) back to collection ${collectionId} for machine=${machineId}`
      );
    } else if (collectionId && isUpdate) {
      console.log(
        `[pre-create-meters] 🔄 Updated existing meter(s) for collection ${collectionId} machine=${machineId}`
      );
    }

    // ============================================================================
    // STEP 9: Return result
    // ============================================================================
    const elapsed = Date.now() - startTime;
    console.log(
      `[pre-create-meters] ✅ ${isUpdate ? 'UPDATED' : 'CREATED'} ${metersToCreate.length} meter(s) for machine=${machineId} ` +
        `customName="${customName}" isOffline=${isOffline} elapsed=${elapsed}ms`
    );
    logRouteCreate(
      FUNCTION_NAME,
      'POST',
      ROUTE_PATH,
      metersToCreate.length,
      user,
      elapsed
    );

    return NextResponse.json({
      success: true,
      customName,
      created: true,
      skipped: false,
      ...(isUpdate ? { updated: true } : {}),
    });
  });
}
