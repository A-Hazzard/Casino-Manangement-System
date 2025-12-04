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
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextResponse } from 'next/server';

/**
 * Main GET handler for discovering SMIB devices
 *
 * Flow:
 * 1. Connect to database
 * 2. Discover SMIB devices
 * 3. Return SMIB device list
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Discover SMIB devices
    // ============================================================================
    const result = await discoverSMIBDevices();

    // ============================================================================
    // STEP 3: Return SMIB device list
    // ============================================================================
    return NextResponse.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
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
}
