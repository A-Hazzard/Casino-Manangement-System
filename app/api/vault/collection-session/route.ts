/**
 * Vault Collection Session API Route
 *
 * Manages collection sessions during vault soft counts and end-of-day processes.
 * Sessions track per-machine collection entries and totals within a vault shift.
 *
 * GET  /api/vault/collection-session  - Retrieve the active session for a vault shift
 * POST /api/vault/collection-session  - Start, add/remove entries to, or cancel a session
 *
 * Supported POST actions: start | addEntry | removeEntry | cancel
 */
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  logRouteFetch,
  logRouteCreate,
  logRouteUpdate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { VaultCollectionSession } from '@/app/api/lib/models/vault-collection-session';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching collection sessions
 *
 * @param {string} vaultShiftId - Filter by specific vault shift (REQUIRED)
 * @param {string} locationId - Filter by location ID (REQUIRED)
 * @param {string} status - Filter by session status
 * @param {string} type - Filter by session type ('soft_count', etc.)
 * @param {boolean} isEndOfDay - Filter specifically for EOD sessions
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/vault/collection-session';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async () => {
    try {
      // ============================================================================
      // STEP 1: Parse and validate query parameters
      // ============================================================================
      const { searchParams } = new URL(request.url);
      const vShiftId = searchParams.get('vaultShiftId'),
        locId = searchParams.get('locationId'),
        status = searchParams.get('status'),
        type = searchParams.get('type') || 'soft_count',
        isEOD = searchParams.get('isEndOfDay') === 'true';

      if (!vShiftId || !locId) {
        logRouteError(
          functionName,
          'GET',
          '/api/vault/collection-session',
          'Vault Shift ID and Location ID required',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Vault Shift ID and Location ID required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 2: Fetch collection session
      // ============================================================================
      const query: Record<string, unknown> = {
        locationId: locId,
        vaultShiftId: vShiftId,
        type,
        isEndOfDay: isEOD,
      };
      if (status) query.status = status;
      else if (!isEOD) query.status = 'active';

      const session = await VaultCollectionSession.findOne(query).sort({
        createdAt: -1,
      });

      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/vault/collection-session',
        session ? 1 : 0,
        user,
        duration
      );

      return NextResponse.json({ success: true, session });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to fetch collection session';
      logRouteError(
        functionName,
        'GET',
        '/api/vault/collection-session',
        errorMessage,
        user
      );
      console.error(
        '[CollectionSession GET] Error:',
        e instanceof Error ? e.message : 'Unknown error'
      );
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

/**
 * Main POST handler for managing collection sessions
 *
 * @body {string} action - Action to perform ('start', 'addEntry', 'removeEntry', 'cancel') (REQUIRED)
 * @body {string} locationId - ID of the location (REQUIRED)
 * @body {string} vaultShiftId - ID of the active vault shift (REQUIRED)
 * @body {string} machineId - ID of the machine (for removeEntry)
 * @body {Object} entryData - Data for the session entry (for addEntry)
 * @body {string} sessionId - ID of the session (for non-start actions)
 * @body {string} type - Session type ('soft_count', etc.)
 * @body {boolean} isEndOfDay - Whether this is an EOD session
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/vault/collection-session';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload }) => {
    try {
      // ============================================================================
      // STEP 1: Parse and validate request body
      // ============================================================================
      const {
        action,
        locationId,
        vaultShiftId,
        machineId,
        entryData,
        sessionId,
        type = 'soft_count',
        isEndOfDay = false,
      } = await request.json();
      if (!locationId || !vaultShiftId) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/collection-session',
          'Location and Vault Shift ID required',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Location and Vault Shift ID required' },
          { status: 400 }
        );
      }

      let session;
      // ============================================================================
      // STEP 2: Handle "start" action
      // ============================================================================
      if (action === 'start') {
        const existing = await VaultCollectionSession.findOne({
          locationId,
          vaultShiftId,
          type,
          status: 'active',
          isEndOfDay,
        });
        if (existing) {
          const duration = Date.now() - startTime;
          logRouteFetch(
            functionName,
            'POST',
            '/api/vault/collection-session',
            1,
            user,
            duration
          );
          return NextResponse.json({
            success: true,
            session: existing,
            message: 'Resumed existing session',
          });
        }
        session = await VaultCollectionSession.create({
          locationId,
          vaultShiftId,
          type,
          isEndOfDay,
          startedBy: userPayload._id || 'system',
          status: 'active',
          entries: [],
          totalCollected: 0,
        });
        const duration = Date.now() - startTime;
        logRouteCreate(
          functionName,
          'POST',
          '/api/vault/collection-session',
          1,
          user,
          duration
        );
      } else if (action === 'addEntry') {
        // ============================================================================
        // STEP 3: Handle "addEntry" action
        // ============================================================================
        if (!sessionId || !entryData) {
          logRouteError(
            functionName,
            'POST',
            '/api/vault/collection-session',
            'Session ID and Entry Data required',
            user
          );
          return NextResponse.json(
            { success: false, error: 'Session ID and Entry Data required' },
            { status: 400 }
          );
        }
        session = await VaultCollectionSession.findOne({ _id: sessionId });
        if (!session || session.status !== 'active') {
          logRouteError(
            functionName,
            'POST',
            '/api/vault/collection-session',
            'Active session not found',
            user
          );
          return NextResponse.json(
            { success: false, error: 'Active session not found' },
            { status: 404 }
          );
        }

        const existingIdx = session.entries.findIndex(
          (e: { machineId: string }) => e.machineId === entryData.machineId
        );
        const entry = {
          machineId: entryData.machineId,
          machineName: entryData.machineName,
          source: entryData.source || 'manual',
          totalAmount: entryData.totalAmount || 0,
          denominations: entryData.denominations || [],
          meters: entryData.meters || {},
          expectedDrop: entryData.expectedDrop || 0,
          variance: entryData.variance || 0,
          notes: entryData.notes || '',
          isEndOfDay: entryData.isEndOfDay || false,
          collectedAt: entryData.collectedAt || new Date(),
        };

        if (existingIdx >= 0) session.entries[existingIdx] = entry;
        else session.entries.push(entry);

        session.totalCollected = session.entries.reduce(
          (sum: number, e: { totalAmount?: number }) =>
            sum + (e.totalAmount || 0),
          0
        );
        await session.save();
        const duration = Date.now() - startTime;
        logRouteUpdate(
          functionName,
          'POST',
          '/api/vault/collection-session',
          1,
          user,
          duration
        );
      } else if (action === 'removeEntry') {
        // ============================================================================
        // STEP 4: Handle "removeEntry" action
        // ============================================================================
        if (!sessionId || !machineId) {
          logRouteError(
            functionName,
            'POST',
            '/api/vault/collection-session',
            'Session ID and Machine ID required',
            user
          );
          return NextResponse.json(
            { success: false, error: 'Session ID and Machine ID required' },
            { status: 400 }
          );
        }
        session = await VaultCollectionSession.findOne({ _id: sessionId });
        if (!session) {
          logRouteError(
            functionName,
            'POST',
            '/api/vault/collection-session',
            'Session not found',
            user
          );
          return NextResponse.json(
            { success: false, error: 'Session not found' },
            { status: 404 }
          );
        }
        session.entries = session.entries.filter(
          (e: { machineId: string }) => e.machineId !== machineId
        );
        session.totalCollected = session.entries.reduce(
          (sum: number, e: { totalAmount?: number }) =>
            sum + (e.totalAmount || 0),
          0
        );
        await session.save();
        const duration = Date.now() - startTime;
        logRouteUpdate(
          functionName,
          'POST',
          '/api/vault/collection-session',
          1,
          user,
          duration
        );
      } else if (action === 'cancel') {
        // ============================================================================
        // STEP 5: Handle "cancel" action
        // ============================================================================
        if (!sessionId) {
          logRouteError(
            functionName,
            'POST',
            '/api/vault/collection-session',
            'Session ID required',
            user
          );
          return NextResponse.json(
            { success: false, error: 'Session ID required' },
            { status: 400 }
          );
        }
        session = await VaultCollectionSession.findOneAndUpdate(
          { _id: sessionId },
          { status: 'cancelled' },
          { new: true }
        );
        const duration = Date.now() - startTime;
        logRouteUpdate(
          functionName,
          'POST',
          '/api/vault/collection-session',
          1,
          user,
          duration
        );
      }

      return NextResponse.json({ success: true, session });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to manage collection session';
      logRouteError(
        functionName,
        'POST',
        '/api/vault/collection-session',
        errorMessage,
        user
      );
      console.error(
        '[CollectionSession POST] Error:',
        e instanceof Error ? e.message : 'Unknown error'
      );
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
