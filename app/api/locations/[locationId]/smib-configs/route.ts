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
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching SMIB configurations
 *
 * Flow:
 * 1. Parse route parameters
 * 2. Connect to database
 * 3. Find machines at location with SMIBs
 * 4. Transform data to LocationSmibConfig format
 * 5. Calculate online status
 * 6. Sort by online status and relayId
 * 7. Return configurations with summary
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse route parameters
    // ============================================================================
    const { locationId } = await params;

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Find machines at location with SMIBs
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
      .lean();

    if (machines.length === 0) {
      return NextResponse.json({
        success: true,
        configs: [],
        count: 0,
      });
    }

    // ============================================================================
    // STEP 4: Transform data to LocationSmibConfig format
    // ============================================================================
    // ============================================================================
    // STEP 5: Calculate online status
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
    // STEP 6: Sort by online status and relayId
    // ============================================================================
    configs.sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1;
      }
      return a.relayId.localeCompare(b.relayId);
    });

    // ============================================================================
    // STEP 7: Return configurations with summary
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Location SMIB Configs API] Completed in ${duration}ms`);
    }
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
