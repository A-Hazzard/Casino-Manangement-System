import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/middleware/db';
import { Collections } from '../../../lib/models/collections';
import { CollectionReport } from '../../../lib/models/collectionReport';
import { Machine } from '../../../lib/models/machines';

/**
 * POST /api/collection-report/[reportId]/fix-sas-times
 * Enhanced fix that scans and fixes the entire collection timeline:
 * 1. Find current collection report and validate
 * 2. Find all future reports after current report's timestamp
 * 3. Process reports chronologically to maintain data chain integrity
 * 4. For each report: fix collections, machine times, and history
 * 5. Return detailed summary of fixes applied
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    await connectDB();

    const { reportId } = await params;

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // Step 1: Find current collection report
    const currentReport = await CollectionReport.findOne({
      locationReportId: reportId,
    });

    if (!currentReport) {
      return NextResponse.json(
        { success: false, error: 'Collection report not found' },
        { status: 404 }
      );
    }

    // Step 2: Find all future reports after current report's timestamp
    const futureReports = await CollectionReport.find({
      timestamp: { $gt: currentReport.timestamp },
    }).sort({ timestamp: 1 }); // Sort chronologically

    const allReportsToProcess = [currentReport, ...futureReports];

    console.warn(
      `Starting enhanced SAS times fix for report ${reportId}: ${allReportsToProcess.length} reports to process`
    );

    let totalFixedCount = 0;
    let totalSkippedCount = 0;
    let totalHistoryFixedCount = 0;
    const allErrors: string[] = [];
    const processedReports: string[] = [];

    // Step 3: Process reports chronologically to maintain data chain integrity
    for (const report of allReportsToProcess) {
      const reportCollections = await Collections.find({
        locationReportId: report.locationReportId,
      });

      if (reportCollections.length === 0) {
        console.warn(
          `No collections found for report ${report.locationReportId}`
        );
        continue;
      }

      console.warn(
        `Processing report ${report.locationReportId} (${reportCollections.length} collections)`
      );

      let reportFixedCount = 0;
      let reportSkippedCount = 0;
      const reportErrors: string[] = [];

      // Step 4: Process each collection in this report
      for (const collection of reportCollections) {
        const machineId = collection.machineId;

        if (!machineId) {
          console.warn(`Skipping collection ${collection._id}: No machine ID`);
          reportSkippedCount++;
          reportErrors.push(`Collection ${collection._id}: No machine ID`);
          continue;
        }

        try {
          // Import helpers
          const { getSasTimePeriod, calculateSasMetrics } = await import(
            '@/lib/helpers/collectionCreation'
          );
          const { calculateMovement } = await import(
            '@/lib/utils/movementCalculation'
          );

          // Step 4a: Fix prevIn/prevOut by finding the actual previous collection
          let correctPrevIn = collection.prevIn;
          let correctPrevOut = collection.prevOut;
          let prevInOutFixed = false;

          const previousCollections = await Collections.find({
            machineId: machineId,
            timestamp: { $lt: new Date(report.timestamp) },
            deletedAt: { $exists: false },
          })
            .sort({ timestamp: -1 })
            .limit(1);

          if (previousCollections && previousCollections.length > 0) {
            const actualPrevCollection = previousCollections[0];
            const actualPrevIn = actualPrevCollection.metersIn || 0;
            const actualPrevOut = actualPrevCollection.metersOut || 0;

            // Check if prevIn/prevOut need fixing
            if (
              collection.prevIn !== actualPrevIn ||
              collection.prevOut !== actualPrevOut
            ) {
              correctPrevIn = actualPrevIn;
              correctPrevOut = actualPrevOut;
              prevInOutFixed = true;
              console.warn(
                `Fixing prevIn/prevOut for collection ${collection._id}:`,
                {
                  oldPrevIn: collection.prevIn,
                  oldPrevOut: collection.prevOut,
                  newPrevIn: actualPrevIn,
                  newPrevOut: actualPrevOut,
                }
              );
            }
          } else {
            // No previous collection - should be 0
            if (collection.prevIn !== 0 || collection.prevOut !== 0) {
              correctPrevIn = 0;
              correctPrevOut = 0;
              prevInOutFixed = true;
              console.warn(
                `Fixing prevIn/prevOut to 0 for collection ${collection._id} (no previous collection)`
              );
            }
          }

          // Step 4b: Recalculate movement if prevIn/prevOut changed
          let updatedMovement = collection.movement;
          if (prevInOutFixed) {
            updatedMovement = calculateMovement(
              collection.metersIn || 0,
              collection.metersOut || 0,
              {
                metersIn: correctPrevIn,
                metersOut: correctPrevOut,
              },
              collection.ramClear,
              undefined, // ramClearCoinIn
              undefined, // ramClearCoinOut
              collection.ramClearMetersIn,
              collection.ramClearMetersOut
            );
            console.warn(
              `Recalculated movement for collection ${collection._id}:`,
              {
                oldGross: collection.movement?.gross,
                newGross: updatedMovement.gross,
              }
            );
          }

          // Step 4c: Recalculate SAS time range
          const { sasStartTime, sasEndTime } = await getSasTimePeriod(
            machineId,
            undefined, // customStartTime
            new Date(collection.timestamp) // customEndTime
          );

          // Step 4b: Validate SAS time range
          if (sasStartTime >= sasEndTime) {
            console.error(
              `Invalid SAS time range for collection ${
                collection._id
              }: start (${sasStartTime.toISOString()}) >= end (${sasEndTime.toISOString()})`
            );
            reportSkippedCount++;
            reportErrors.push(
              `Collection ${collection._id}: Invalid time range (start >= end)`
            );
            continue;
          }

          // Step 4c: Recalculate SAS metrics
          const newSasMetrics = await calculateSasMetrics(
            machineId,
            sasStartTime,
            sasEndTime
          );

          console.warn(`Fixing SAS times for collection ${collection._id}:`, {
            machineId,
            oldSasStartTime: collection.sasMeters?.sasStartTime,
            oldSasEndTime: collection.sasMeters?.sasEndTime,
            newSasStartTime: sasStartTime.toISOString(),
            newSasEndTime: sasEndTime.toISOString(),
            oldGross: collection.sasMeters?.gross,
            newGross: newSasMetrics.gross,
          });

          // Step 4d: Update collection document with all fixes
          await Collections.findByIdAndUpdate(collection._id, {
            prevIn: correctPrevIn,
            prevOut: correctPrevOut,
            movement: updatedMovement,
            sasMeters: {
              ...newSasMetrics,
              machine:
                collection.sasMeters?.machine || collection.machineName || '',
              sasStartTime: sasStartTime.toISOString(),
              sasEndTime: sasEndTime.toISOString(),
            },
            updatedAt: new Date(),
          });

          // Step 4e: Update machine collectionMetersHistory
          try {
            await Machine.findOneAndUpdate(
              {
                _id: machineId,
                'collectionMetersHistory.locationReportId':
                  report.locationReportId,
              },
              {
                $set: {
                  'collectionMetersHistory.$[elem].metersIn':
                    collection.metersIn || 0,
                  'collectionMetersHistory.$[elem].metersOut':
                    collection.metersOut || 0,
                  'collectionMetersHistory.$[elem].timestamp': new Date(
                    collection.timestamp
                  ),
                },
              },
              {
                arrayFilters: [
                  { 'elem.locationReportId': report.locationReportId },
                ],
                new: true,
              }
            );

            console.warn(
              `Updated machine history for machine ${machineId} and report ${report.locationReportId}`
            );
          } catch (machineUpdateError) {
            console.error(
              `Failed to update machine history for machine ${machineId}:`,
              machineUpdateError
            );
          }

          reportFixedCount++;
        } catch (collectionError) {
          console.error(
            `Error fixing SAS times for collection ${collection._id}:`,
            collectionError
          );
          reportSkippedCount++;
          reportErrors.push(
            `Collection ${collection._id}: ${
              collectionError instanceof Error
                ? collectionError.message
                : 'Unknown error'
            }`
          );
        }
      }

      // Step 5: Rebuild collectionMetersHistory for all machines in this report
      let reportHistoryFixedCount = 0;
      try {
        console.warn(
          `Rebuilding collectionMetersHistory for report ${report.locationReportId}`
        );

        // Get unique machine IDs from this report's collections
        const machineIds = [
          ...new Set(reportCollections.map(c => c.machineId).filter(Boolean)),
        ];

        for (const machineId of machineIds) {
          // Rebuild history based on actual collections
          const machineCollections = await Collections.find({
            machineId: machineId,
            deletedAt: { $exists: false },
          }).sort({ timestamp: 1 });

          const newHistory = machineCollections.map((collection, index) => {
            // For the first collection, prevIn/prevOut should be 0
            // For subsequent collections, use the meters from the previous collection
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
              prevIn: prevIn,
              prevOut: prevOut,
              timestamp: new Date(collection.timestamp),
              createdAt: new Date(collection.createdAt || collection.timestamp),
            };
          });

          // Update machine with rebuilt history and sync collectionMeters
          const mostRecentCollection =
            machineCollections[machineCollections.length - 1];
          await Machine.findByIdAndUpdate(machineId, {
            collectionMetersHistory: newHistory,
            collectionTime:
              machineCollections.length > 0
                ? new Date(
                    machineCollections[machineCollections.length - 1].timestamp
                  )
                : undefined,
            previousCollectionTime:
              machineCollections.length > 1
                ? new Date(
                    machineCollections[machineCollections.length - 2].timestamp
                  )
                : undefined,
            // Sync collectionMeters with most recent collection
            'collectionMeters.metersIn': mostRecentCollection?.metersIn || 0,
            'collectionMeters.metersOut': mostRecentCollection?.metersOut || 0,
          });

          reportHistoryFixedCount += newHistory.length;
          console.warn(
            `Rebuilt history for machine ${machineId}: ${newHistory.length} entries`
          );
        }

        console.warn(
          `Rebuilt ${reportHistoryFixedCount} collectionMetersHistory entries for report ${report.locationReportId}`
        );
      } catch (historyError) {
        console.error(
          `Error rebuilding collectionMetersHistory for report ${report.locationReportId}:`,
          historyError
        );
        reportErrors.push(
          `History rebuild failed: ${
            historyError instanceof Error
              ? historyError.message
              : 'Unknown error'
          }`
        );
      }

      // Accumulate totals
      totalFixedCount += reportFixedCount;
      totalSkippedCount += reportSkippedCount;
      totalHistoryFixedCount += reportHistoryFixedCount;
      allErrors.push(...reportErrors);
      processedReports.push(report.locationReportId);

      console.warn(`Completed report ${report.locationReportId}:`, {
        fixedCount: reportFixedCount,
        skippedCount: reportSkippedCount,
        historyFixedCount: reportHistoryFixedCount,
        errorCount: reportErrors.length,
      });
    }

    console.warn(`Enhanced SAS times fix completed:`, {
      reportsProcessed: processedReports.length,
      totalCollections: totalFixedCount + totalSkippedCount,
      totalFixedCount,
      totalSkippedCount,
      totalHistoryFixedCount,
      totalErrorCount: allErrors.length,
    });

    return NextResponse.json({
      success: true,
      totalCollections: totalFixedCount + totalSkippedCount,
      fixedCount: totalFixedCount,
      skippedCount: totalSkippedCount,
      historyFixedCount: totalHistoryFixedCount,
      errorCount: allErrors.length,
      errors: allErrors.slice(0, 10), // Limit errors in response
      reportsScanned: processedReports.length,
      futureReportsAffected: futureReports.length,
      message: `Fixed ${totalFixedCount} collections, ${totalHistoryFixedCount} history entries across ${processedReports.length} reports`,
    });
  } catch (error) {
    console.error('Error fixing SAS times for report:', error);
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
