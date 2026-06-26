/**
 * SMIB Discovery API Route
 *
 * This route handles discovering all SMIB devices from the database.
 * It supports:
 * - Finding all machines with relayId configured
 * - Determining online/offline status
 * - Including location information
 *
 * @module app/api/mqtt/discover-smibs/route
 */

import { discoverSMIBDevices } from '@/app/api/lib/helpers/smibDiscovery';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for discovering SMIB devices
 *
 * Flow:
 * 1. Discover SMIB devices
 * 2. Return SMIB device list
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/mqtt/discover-smibs';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async () => {
    try {
      // ============================================================================
      // STEP 1: Discover SMIB devices
      // ============================================================================
      const result = await discoverSMIBDevices();

      // ============================================================================
      // STEP 2: Return SMIB device list
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/mqtt/discover-smibs',
        result.count,
        user,
        duration
      );
      if (duration > 1000) {
        console.warn(`[SMIB Discovery API] Completed in ${duration}ms`);
      }
      return NextResponse.json(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logRouteError(
        functionName,
        'GET',
        '/api/mqtt/discover-smibs',
        errorMessage,
        user
      );
      console.error(
        `[SMIB Discovery API] Error after ${duration}ms:`,
        errorMessage
      );
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          smibs: [],
          count: 0,
        },
        { status: 500 }
      );
    }
  });
}
