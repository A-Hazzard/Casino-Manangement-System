import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Collections } from '@/app/api/lib/models/collections';

type MachineChange = {
  machineId: string;
  locationReportId: string;
  metersIn: number;
  metersOut: number;
  prevMetersIn: number;
  prevMetersOut: number;
  collectionId: string;
};

type UpdateHistoryPayload = {
  changes: MachineChange[];
};

// CRITICAL: Use PATCH for updating existing report histories
// POST would be for creating new reports, but we're updating existing ones
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;
    const body = (await request.json()) as UpdateHistoryPayload;

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: 'Report ID is required' },
        { status: 400 }
      );
    }

    if (!body.changes || !Array.isArray(body.changes)) {
      return NextResponse.json(
        { success: false, error: 'Changes array is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify report exists
    // CRITICAL: Query by locationReportId field, not _id
    // The reportId parameter is the locationReportId value
    const report = await CollectionReport.findOne({
      locationReportId: reportId,
    });
    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Collection report not found' },
        { status: 404 }
      );
    }

    console.warn(
      `🔄 Starting batch history update for report ${reportId} with ${body.changes.length} changes`
    );

    const results = {
      updated: 0,
      failed: 0,
      errors: [] as Array<{ machineId: string; error: string }>,
    };

    // Process each machine change
    for (const change of body.changes) {
      try {
        const {
          machineId,
          locationReportId,
          metersIn,
          metersOut,
          prevMetersIn,
          prevMetersOut,
          collectionId,
        } = change;

        // Verify the collection exists and belongs to this report
        const collection = await Collections.findOne({
          _id: collectionId,
          locationReportId: reportId,
          machineId: machineId,
        });

        if (!collection) {
          console.warn(
            `⚠️ Collection ${collectionId} not found or doesn't match report/machine`
          );
          results.failed++;
          results.errors.push({
            machineId,
            error: 'Collection not found or mismatch',
          });
          continue;
        }

        // Update the machine's collectionMetersHistory
        const historyUpdateResult = await Machine.findByIdAndUpdate(
          machineId,
          {
            $set: {
              'collectionMetersHistory.$[elem].metersIn': metersIn,
              'collectionMetersHistory.$[elem].metersOut': metersOut,
              'collectionMetersHistory.$[elem].prevMetersIn': prevMetersIn,
              'collectionMetersHistory.$[elem].prevMetersOut': prevMetersOut,
              'collectionMetersHistory.$[elem].timestamp': new Date(),
              updatedAt: new Date(),
            },
          },
          {
            arrayFilters: [
              {
                'elem.locationReportId': locationReportId,
              },
            ],
            new: true,
          }
        );

        if (!historyUpdateResult) {
          console.warn(`⚠️ Failed to update history for machine ${machineId}`);
          results.failed++;
          results.errors.push({
            machineId,
            error: 'Failed to update machine history',
          });
          continue;
        }

        // Update machine's current collectionMeters
        await Machine.findByIdAndUpdate(machineId, {
          $set: {
            'collectionMeters.metersIn': metersIn,
            'collectionMeters.metersOut': metersOut,
            collectionTime: new Date(),
            updatedAt: new Date(),
          },
        });

        console.warn(
          `✅ Updated machine ${machineId} history and current meters`
        );
        results.updated++;
      } catch (error) {
        console.error(`Error updating machine ${change.machineId}:`, error);
        results.failed++;
        results.errors.push({
          machineId: change.machineId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // NOTE: We do NOT set isEditing: false here
    // That is handled by the main collection-report PATCH endpoint
    // This endpoint only updates machine histories
    console.warn(
      `✅ Machine history updates completed: ${results.updated} succeeded, ${results.failed} failed`
    );

    return NextResponse.json({
      success: results.failed === 0,
      message:
        results.failed === 0
          ? 'All machine histories updated successfully'
          : `Updated ${results.updated} machines, ${results.failed} failed`,
      results,
    });
  } catch (error) {
    console.error('Error in update-history endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
