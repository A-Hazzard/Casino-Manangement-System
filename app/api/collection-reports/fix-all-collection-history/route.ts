import { NextResponse } from 'next/server';
import { connectDB } from '../../lib/middleware/db';
import { Collections } from '../../lib/models/collections';
import { CollectionReport } from '../../lib/models/collectionReport';
import { Machine } from '../../lib/models/machines';
import { getUserIdFromServer, getUserById } from '../../lib/helpers/users';

/**
 * Fix all collection history issues across all collection reports
 * This specifically targets prevIn/prevOut issues in collectionMetersHistory
 */
export async function POST() {
  try {
    await connectDB();
    console.warn('🔧 Starting fix-all-collection-history process...');

    // Check authentication (skip in development mode)
    if (process.env.NODE_ENV !== 'development') {
      const userId = await getUserIdFromServer();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const user = await getUserById(userId);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Check if user has admin access
      if (
        !user.roles?.includes('admin') &&
        !user.roles?.includes('evolution admin')
      ) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    } else {
      console.warn('⚠️ Running in development mode - skipping authentication');
    }

    // Get all collection reports, sorted chronologically
    const allReports = await CollectionReport.find({})
      .sort({ timestamp: 1 })
      .lean();

    console.warn(`📊 Found ${allReports.length} collection reports to process`);

    let totalHistoryRebuilt = 0;
    let machinesFixedCount = 0;
    let reportsProcessed = 0;

    // Get all unique machine IDs from all reports
    const allMachineIds = new Set<string>();
    for (const report of allReports) {
      const reportCollections = await Collections.find({
        locationReportId: report.locationReportId,
      });
      reportCollections.forEach(collection => {
        if (collection.machineId) {
          allMachineIds.add(collection.machineId as string);
        }
      });
    }

    console.warn(`🔍 Found ${allMachineIds.size} unique machines to process`);

    // Process each machine individually
    for (const machineId of allMachineIds) {
      try {
        console.warn(`🔧 Processing machine: ${machineId}`);

        // Get all collections for this machine, sorted by timestamp
        const machineCollections = await Collections.find({
          machineId: machineId,
          deletedAt: { $exists: false },
        })
          .sort({ timestamp: 1 })
          .lean();

        if (machineCollections.length === 0) {
          console.warn(`   ⚠️ No collections found for machine ${machineId}`);
          continue;
        }

        console.warn(
          `   📊 Found ${machineCollections.length} collections for machine ${machineId}`
        );

        // Check if this machine actually has collectionMetersHistory issues
        const machine = await Machine.findById(machineId);
        if (
          !machine ||
          !machine.collectionMetersHistory ||
          machine.collectionMetersHistory.length === 0
        ) {
          console.warn(
            `   ⚠️ Machine ${machineId} has no collectionMetersHistory`
          );
          continue;
        }

        // Check if machine has issues
        let machineHasIssues = false;
        for (let i = 1; i < machine.collectionMetersHistory.length; i++) {
          const entry = machine.collectionMetersHistory[i];
          const prevMetersIn = entry.prevMetersIn || 0;
          const prevMetersOut = entry.prevMetersOut || 0;

          if (
            (prevMetersIn === 0 ||
              prevMetersIn === undefined ||
              prevMetersIn === null) &&
            (prevMetersOut === 0 ||
              prevMetersOut === undefined ||
              prevMetersOut === null)
          ) {
            machineHasIssues = true;
            break;
          }
        }

        if (!machineHasIssues) {
          console.warn(
            `   ✅ Machine ${machineId} - No collectionMetersHistory issues found`
          );
          continue;
        }

        console.warn(
          `   🔧 Fixing collectionMetersHistory for machine ${machineId}`
        );

        // Rebuild history with correct prevIn/prevOut
        const newHistory = machineCollections.map(
          (collection, index: number) => {
            let prevIn = 0;
            let prevOut = 0;

            if (index > 0) {
              const previousCollection = machineCollections[index - 1];
              prevIn = previousCollection.metersIn || 0;
              prevOut = previousCollection.metersOut || 0;
            }

            return {
              locationReportId: collection.locationReportId,
              metersIn: collection.metersIn || 0,
              metersOut: collection.metersOut || 0,
              prevMetersIn: prevIn,
              prevMetersOut: prevOut,
              timestamp: new Date(collection.timestamp),
              createdAt: new Date(collection.createdAt || collection.timestamp),
            };
          }
        );

        // Update the machine document
        const mostRecentCollection =
          machineCollections[machineCollections.length - 1];

        // Use raw MongoDB driver instead of Mongoose to ensure update works
        const mongoose = await import('mongoose');
        const db = mongoose.default.connection.db;
        if (!db) throw new Error('Database connection not available');

        const updateResult = await db
          .collection('machines')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .updateOne({ _id: machineId } as any, {
            $set: {
              collectionMetersHistory: newHistory,
              collectionTime: mostRecentCollection
                ? new Date(mostRecentCollection.timestamp)
                : undefined,
              previousCollectionTime:
                machineCollections.length > 1
                  ? new Date(
                      machineCollections[
                        machineCollections.length - 2
                      ].timestamp
                    )
                  : undefined,
              'collectionMeters.metersIn': mostRecentCollection?.metersIn || 0,
              'collectionMeters.metersOut':
                mostRecentCollection?.metersOut || 0,
              updatedAt: new Date(),
            },
          });

        if (updateResult.modifiedCount > 0) {
          machinesFixedCount++;
          totalHistoryRebuilt += newHistory.length;
          console.warn(
            `   ✅ Fixed ${newHistory.length} entries in collectionMetersHistory for machine ${machineId}`
          );
        } else if (updateResult.matchedCount > 0) {
          console.warn(
            `   ⚠️ Machine ${machineId} matched but not modified (data may be identical)`
          );
        } else {
          console.warn(
            `   ❌ Failed to update machine ${machineId} - no documents matched`
          );
        }
      } catch (machineError) {
        console.error(
          `   ❌ Error processing machine ${machineId}:`,
          machineError
        );
      }
    }

    // Count how many reports were affected
    for (const report of allReports) {
      const reportCollections = await Collections.find({
        locationReportId: report.locationReportId,
      });

      // Check if any of the collections in this report belong to machines we fixed
      const hasAffectedMachines = reportCollections.some(collection =>
        allMachineIds.has(collection.machineId as string)
      );

      if (hasAffectedMachines) {
        reportsProcessed++;
      }
    }

    console.warn('🎉 Fix All Collection History Complete!');
    console.warn(`   Total machines processed: ${allMachineIds.size}`);
    console.warn(`   Machines fixed: ${machinesFixedCount}`);
    console.warn(`   Total history entries rebuilt: ${totalHistoryRebuilt}`);
    console.warn(`   Reports affected: ${reportsProcessed}`);

    return NextResponse.json({
      success: true,
      message: 'Collection history fix completed successfully',
      summary: {
        totalMachinesProcessed: allMachineIds.size,
        machinesFixed: machinesFixedCount,
        totalHistoryRebuilt: totalHistoryRebuilt,
        reportsAffected: reportsProcessed,
      },
    });
  } catch (error) {
    console.error('❌ Error in fix-all-collection-history:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fix collection history',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
