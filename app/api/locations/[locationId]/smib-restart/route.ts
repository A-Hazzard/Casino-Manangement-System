import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { Machine } from '@/app/api/lib/models/machines';
import { mqttService } from '@/lib/services/mqttService';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../../../lib/helpers/users';
import { connectDB } from '../../../lib/middleware/db';

/**
 * POST /api/locations/[locationId]/smib-restart
 * Restart all SMIBs at a specific location
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

    // Log activity
    const currentUser = await getUserFromServer();
    const clientIP = getClientIP(request);

    if (currentUser && currentUser.emailAddress) {
      try {
        await logActivity({
          action: 'UPDATE',
          details: `Location-wide SMIB restart: ${results.successful} successful, ${results.failed} failed`,
          ipAddress: clientIP || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
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

    return NextResponse.json({
      success: results.failed === 0,
      message: `Restart commands sent to ${results.successful} SMIBs${results.failed > 0 ? ` (${results.failed} failed)` : ''}`,
      results,
    });
  } catch (error) {
    console.error('❌ Error in location SMIB restart endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
