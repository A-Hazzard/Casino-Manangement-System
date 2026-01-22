/**
 * Location SMIB Restart API Route
 *
 * This route handles restarting all SMIBs at a specific location.
 * It supports:
 * - Restarting multiple SMIBs in parallel batches
 * - Using relayIds from frontend MQTT discovery
 * - Activity logging
 * - Batch processing for efficiency
 *
 * @module app/api/locations/[locationId]/smib-restart/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { mqttService } from '@/app/api/lib/services/mqttService';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for restarting SMIBs at a location
 *
 * Flow:
 * 1. Parse route parameters and request body
 * 2. Validate relayIds
 * 3. Connect to database
 * 4. Remove duplicate relayIds
 * 5. Process restart commands in batches
 * 6. Log activity
 * 7. Return results
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse route parameters and request body
    // ============================================================================
    const { locationId } = await params;
    const body = await request.json();
    const relayIds = body.relayIds as string[];

    // ============================================================================
    // STEP 2: Validate relayIds
    // ============================================================================
    if (!relayIds || relayIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No SMIB relay IDs provided',
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Remove duplicate relayIds
    // ============================================================================
    const uniqueRelayIds = Array.from(new Set(relayIds));

    // ============================================================================
    // STEP 5: Process restart commands in batches
    // ============================================================================

    const results = {
      total: uniqueRelayIds.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ relayId: string; error: string }>,
    };

    // Process in batches of 10 for parallel execution
    const BATCH_SIZE = 10;
    for (let i = 0; i < uniqueRelayIds.length; i += BATCH_SIZE) {
      const batch = uniqueRelayIds.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async relayId => {
          try {
            await mqttService.restartSmib(relayId);
            results.successful++;
          } catch (error) {
            results.failed++;
            results.errors.push({
              relayId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        })
      );
    }

    // ============================================================================
    // STEP 6: Log activity
    // ============================================================================
    const currentUser = await getUserFromServer();
    const clientIP = getClientIP(request);

    if (currentUser && currentUser.emailAddress) {
      try {
        await logActivity({
          action: 'UPDATE',
          details: `Location-wide SMIB restart: ${results.successful} successful, ${results.failed} failed`,
          ipAddress: clientIP || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          userId: currentUser._id as string,
          username:
            (currentUser.emailAddress as string) ||
            (currentUser.username as string) ||
            'unknown',
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'location',
            resourceId: locationId,
            resourceName: 'Location SMIBs',
            locationId,
            total: results.total,
            successful: results.successful,
            failed: results.failed,
            restartedAt: new Date().toISOString(),
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    // ============================================================================
    // STEP 7: Return results
    // ============================================================================
    return NextResponse.json({
      success: results.failed === 0,
      message: `Restart commands sent to ${results.successful} SMIBs${results.failed > 0 ? ` (${results.failed} failed)` : ''}`,
      results,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Location SMIB Restart API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
