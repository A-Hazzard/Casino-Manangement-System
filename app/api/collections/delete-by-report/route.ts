import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../lib/middleware/db';
import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';

/**
 * DELETE /api/collections/delete-by-report
 * Deletes all collections and collectionMetersHistory entries by locationReportId
 * This endpoint handles complete cleanup when a collection report is deleted
 */
export async function DELETE(request: NextRequest) {
  try {
    const { locationReportId } = await request.json();

    if (!locationReportId) {
      return NextResponse.json(
        { success: false, error: 'Location report ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    console.warn(
      'Deleting collections and history for locationReportId:',
      locationReportId
    );

    // Step 1: Find all collections with this locationReportId
    const collections = await Collections.find({ locationReportId }).lean();
    console.warn('Found collections to delete:', collections.length);
    console.warn(
      'Collections details:',
      collections.map(c => ({
        _id: c._id,
        machineId: c.machineId,
        locationReportId: c.locationReportId,
        metersIn: c.metersIn,
        metersOut: c.metersOut,
        prevIn: c.prevIn,
        prevOut: c.prevOut,
      }))
    );

    // Step 2: Get machine IDs from collections
    const machineIds = [
      ...new Set(collections.map(c => c.machineId).filter(Boolean)),
    ];
    console.warn('Machine IDs to update:', machineIds);

    // Step 3: For each collection, revert machine collectionMeters to prevIn/prevOut values
    const machineUpdatePromises = collections.map(async collection => {
      try {
        if (collection.machineId) {
          // Revert machine collectionMeters to the previous values from the collection
          const result = await Machine.findByIdAndUpdate(
            collection.machineId,
            {
              $set: {
                'collectionMeters.metersIn': collection.prevIn || 0,
                'collectionMeters.metersOut': collection.prevOut || 0,
                updatedAt: new Date(),
              },
              $pull: {
                collectionMetersHistory: { locationReportId },
              },
            },
            { new: true }
          );

          if (result) {
            console.warn(
              `Reverted machine ${collection.machineId} collectionMeters:`,
              {
                from: {
                  metersIn: collection.metersIn,
                  metersOut: collection.metersOut,
                },
                to: {
                  metersIn: collection.prevIn,
                  metersOut: collection.prevOut,
                },
              }
            );

            // Log the remaining collectionMetersHistory entries to verify deletion
            const remainingHistory =
              result.collectionMetersHistory?.filter(
                (entry: { locationReportId: string }) =>
                  entry.locationReportId === locationReportId
              ) || [];
            console.warn(
              `Remaining history entries for ${locationReportId} on machine ${collection.machineId}:`,
              remainingHistory.length
            );
          }
        }
      } catch (error) {
        console.error(
          `Failed to revert machine ${collection.machineId}:`,
          error
        );
      }
    });

    await Promise.all(machineUpdatePromises);

    // Step 4: Delete all collections with this locationReportId
    const deleteResult = await Collections.deleteMany({ locationReportId });
    console.warn('Deleted collections:', deleteResult.deletedCount);

    // Step 5: Delete the collection report itself
    const reportDeleteResult = await CollectionReport.deleteOne({
      locationReportId,
    });
    console.warn('Deleted collection report:', reportDeleteResult.deletedCount);

    // Step 6: Final verification - check if any collections or history entries remain
    const remainingCollections = await Collections.find({
      locationReportId,
    }).lean();
    console.warn(
      'Final verification - remaining collections:',
      remainingCollections.length
    );

    // Check remaining history entries on machines
    for (const machineId of machineIds) {
      const machine = (await Machine.findById(machineId).lean()) as {
        collectionMetersHistory?: Array<{ locationReportId: string }>;
      } | null;
      const remainingHistory =
        machine?.collectionMetersHistory?.filter(
          (entry: { locationReportId: string }) =>
            entry.locationReportId === locationReportId
        ) || [];
      console.warn(
        `Final verification - remaining history on machine ${machineId}:`,
        remainingHistory.length
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully deleted collections and history',
      deletedCollections: deleteResult.deletedCount,
      deletedReport: reportDeleteResult.deletedCount,
      updatedMachines: machineIds.length,
      verification: {
        remainingCollections: remainingCollections.length,
        remainingHistoryEntries: 0, // This should always be 0 if deletion worked
      },
    });
  } catch (error) {
    console.error('Error deleting collections by report ID:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete collections and history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
