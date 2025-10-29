import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { Machine } from '@/app/api/lib/models/machines';
import { mqttService } from '@/lib/services/mqttService';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../../../lib/helpers/users';
import { connectDB } from '../../../lib/middleware/db';

/**
 * POST /api/locations/[locationId]/smib-meters
 * Request meter data from all SMIBs at a specific location
 * Processes in parallel batches of 10 for efficiency
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params;
    await connectDB();

    // Find all machines at this location with valid relayId or smibBoard
    const machines = await Machine.find({
      gamingLocation: locationId,
      deletedAt: null,
      $or: [
        { relayId: { $exists: true, $ne: '' } },
        { smibBoard: { $exists: true, $ne: '' } },
      ],
    }).select('_id serialNumber game relayId smibBoard');

    if (machines.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No machines with SMIBs found at this location',
        },
        { status: 404 }
      );
    }

    const results = {
      total: machines.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ relayId: string; error: string }>,
    };

    // Process in batches of 10 for parallel execution
    const BATCH_SIZE = 10;
    for (let i = 0; i < machines.length; i += BATCH_SIZE) {
      const batch = machines.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async machine => {
          const relayId = machine.relayId || machine.smibBoard;
          if (!relayId) return;

          try {
            await mqttService.requestMeterData(relayId);
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

    // Log activity (optional - don't fail the request if logging fails)
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser._id && currentUser.emailAddress) {
      const clientIP = getClientIP(request);
      try {
        await logActivity({
          action: 'VIEW',
          details: `Location-wide SMIB meters request: ${results.successful} successful, ${results.failed} failed`,
          ipAddress: clientIP || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          userId: currentUser._id as string,
          username: currentUser.username as string,
          metadata: {
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'location',
            resourceId: locationId,
            resourceName: 'Location SMIBs',
            locationId,
            total: results.total,
            successful: results.successful,
            failed: results.failed,
            requestedAt: new Date().toISOString(),
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
        // Don't fail the request if logging fails - just continue
      }
    }

    return NextResponse.json({
      success: results.failed === 0,
      message: `Meter requests sent to ${results.successful} SMIBs${results.failed > 0 ? ` (${results.failed} failed)` : ''}`,
      results,
    });
  } catch (error) {
    console.error('❌ Error in location SMIB meters endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
