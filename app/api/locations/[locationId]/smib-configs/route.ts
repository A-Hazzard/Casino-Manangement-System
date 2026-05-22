/**
 * Location SMIB Configs API Route
 *
 * This route handles retrieving all SMIB configurations for machines at a specific location.
 * It supports:
 * - Fetching SMIB configurations for all machines at a location
 * - Online/offline status calculation
 * - Sorting by online status and relayId
 *
 * @module app/api/locations/[locationId]/smib-configs/route
 */

import { Machine } from '@/app/api/lib/models/machines';
import { connectDB } from '@/app/api/lib/middleware/db';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import type { GamingMachine } from '@shared/types';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/locations/[locationId]/smib-configs
 *
 * Returns all SMIB configurations for machines at this location. Called when
 * the SMIB management panel needs to display per-machine config and online status.
 *
 * URL params:
 * @param {string} locationId - Required (path). The location whose SMIB configs to retrieve.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/locations/[locationId]/smib-configs';
  const user = extractUserFromRequest(request);
  const { pathname } = request.nextUrl;
  const locationId = pathname.split('/').at(-2);

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Find machines at location with SMIBs
    // ============================================================================

    const machines = await Machine.find({
      gamingLocation: locationId,
      deletedAt: null,
      $or: [
        { relayId: { $exists: true, $ne: '' } },
        { smibBoard: { $exists: true, $ne: '' } },
      ],
    })
      .select('_id serialNumber game relayId smibBoard smibConfig lastActivity')
      .lean<GamingMachine[]>();

    if (machines.length === 0) {
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/locations/[locationId]/smib-configs',
        0,
        user,
        duration
      );

      return NextResponse.json({
        success: true,
        configs: [],
        count: 0,
      });
    }

    // ============================================================================
    // STEP 3: Transform data to LocationSmibConfig format
    // ============================================================================
    // ============================================================================
    // STEP 4: Calculate online status
    // ============================================================================
    const configs = machines.map(machine => {
      const relayId = (machine.relayId || machine.smibBoard || '').toString();
      const isOnline = machine.lastActivity
        ? new Date().getTime() - new Date(machine.lastActivity).getTime() <
          3 * 60 * 1000
        : false;

      return {
        relayId,
        machineId: String(machine._id),
        serialNumber: machine.serialNumber,
        isOnline,
        lastActivity: machine.lastActivity || null,
        config: machine.smibConfig || {},
      };
    });

    // ============================================================================
    // STEP 5: Sort by online status and relayId
    // ============================================================================
    configs.sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1;
      }
      return a.relayId.localeCompare(b.relayId);
    });

    // ============================================================================
    // STEP 6: Return configurations with summary
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Location SMIB Configs API] Completed in ${duration}ms`);
    }
    logRouteFetch(
      functionName,
      'GET',
      '/api/locations/[locationId]/smib-configs',
      configs.length,
      user,
      duration
    );

    return NextResponse.json({
      success: true,
      configs,
      count: configs.length,
      summary: {
        total: configs.length,
        online: configs.filter(c => c.isOnline).length,
        offline: configs.filter(c => !c.isOnline).length,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'GET',
      '/api/locations/[locationId]/smib-configs',
      errorMessage,
      user
    );
    console.error(
      `[Location SMIB Configs API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
