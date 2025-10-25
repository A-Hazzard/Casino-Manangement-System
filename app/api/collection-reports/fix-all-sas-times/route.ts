import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../lib/middleware/db';
import { CollectionReport } from '../../lib/models/collectionReport';
import { Collections } from '../../lib/models/collections';
import { Machine } from '../../lib/models/machines';
import { getUserIdFromServer, getUserById } from '../../lib/helpers/users';

/**
 * POST /api/collection-reports/fix-all-sas-times
 * Fix SAS times for ALL collection reports that have issues
 * Only accessible by admin and evolution admin users
 */
export async function POST(_request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication and admin access
    const userId = await getUserIdFromServer();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userRoles = user?.roles || [];

    // Check if user has admin access
    const hasAdminAccess =
      userRoles.includes('admin') || userRoles.includes('evolution admin');
    if (!hasAdminAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions. Admin access required.',
        },
        { status: 403 }
      );
    }

    console.warn(`🔧 Starting bulk SAS time fix for all reports...`);
    console.warn(
      `   Initiated by: ${user?.username || 'Unknown'} (${userRoles.join(
        ', '
      )})`
    );

    // Get all collection reports, sorted by timestamp
    const allReports = await CollectionReport.find({})
      .sort({ timestamp: 1 })
      .lean();

    console.warn(`📋 Found ${allReports.length} collection reports to process`);

    let totalReportsProcessed = 0;
    let totalReportsFixed = 0;
    let totalCollectionsFixed = 0;
    let totalErrors = 0;
    const errors: string[] = [];
    const fixedReports: string[] = [];

    // Process each report
    for (const report of allReports) {
      try {
        console.warn(`\n🔍 Processing report: ${report.locationReportId}`);
        console.warn(`   Date: ${new Date(report.timestamp).toLocaleString()}`);
        console.warn(`   Location: ${report.locationName}`);

        // Find all collections for this report
        const collections = await Collections.find({
          locationReportId: report.locationReportId,
        });

        if (collections.length === 0) {
          console.warn(`   ⚠️  No collections found for this report`);
          continue;
        }

        console.warn(`   📦 Found ${collections.length} collections`);

        let reportHasIssues = false;
        let collectionsFixedInReport = 0;

        // Process each collection in this report
        for (const collection of collections) {
          try {
            const machineId = collection.machineId;
            if (!machineId) continue;

            // Check if this collection has issues
            let hasIssues = false;
            let fixesApplied = 0;

            // Fix 1: Check for inverted SAS times
            if (
              collection.sasMeters?.sasStartTime &&
              collection.sasMeters?.sasEndTime
            ) {
              const sasStartTime = new Date(collection.sasMeters.sasStartTime);
              const sasEndTime = new Date(collection.sasMeters.sasEndTime);

              if (sasStartTime >= sasEndTime) {
                hasIssues = true;
                reportHasIssues = true;
                console.warn(
                  `      ❌ Collection ${collection._id} has inverted SAS times`
                );
              }
            }

            // Fix 2: Check for prevIn/prevOut mismatch
            if (
              collection.prevIn !== undefined &&
              collection.prevOut !== undefined
            ) {
              const previousCollections = await Collections.find({
                machineId: machineId,
                timestamp: { $lt: new Date(report.timestamp) },
                deletedAt: { $exists: false },
              })
                .sort({ timestamp: -1 })
                .limit(1);

              if (previousCollections.length > 0) {
                const actualPrevCollection = previousCollections[0];
                const actualPrevIn = actualPrevCollection.metersIn || 0;
                const actualPrevOut = actualPrevCollection.metersOut || 0;

                if (
                  collection.prevIn !== actualPrevIn ||
                  collection.prevOut !== actualPrevOut
                ) {
                  hasIssues = true;
                  reportHasIssues = true;
                  console.warn(
                    `      ❌ Collection ${collection._id} has prevIn/prevOut mismatch`
                  );
                }
              }
            }

            // Fix 3: Check for movement calculation accuracy (handle RAM Clear)
            let expectedMetersInMovement, expectedMetersOutMovement;

            if (collection.ramClear) {
              // RAM Clear calculation: use the same logic as calculateMovement function
              if (
                collection.ramClearMetersIn !== undefined &&
                collection.ramClearMetersOut !== undefined
              ) {
                // Formula: (ramClearMeters - prevMeters) + (currentMeters - 0)
                expectedMetersInMovement =
                  collection.ramClearMetersIn -
                  collection.prevIn +
                  (collection.metersIn - 0);
                expectedMetersOutMovement =
                  collection.ramClearMetersOut -
                  collection.prevOut +
                  (collection.metersOut - 0);
              } else {
                // Use current values directly (meters reset to 0)
                expectedMetersInMovement = collection.metersIn;
                expectedMetersOutMovement = collection.metersOut;
              }
            } else {
              // Standard calculation: current - previous
              expectedMetersInMovement =
                collection.metersIn - collection.prevIn;
              expectedMetersOutMovement =
                collection.metersOut - collection.prevOut;
            }

            const expectedGross =
              expectedMetersInMovement - expectedMetersOutMovement;

            let movementCalculationMismatch = false;
            if (
              Math.abs(
                collection.movement.metersIn - expectedMetersInMovement
              ) > 0.01 ||
              Math.abs(
                collection.movement.metersOut - expectedMetersOutMovement
              ) > 0.01 ||
              Math.abs(collection.movement.gross - expectedGross) > 0.01
            ) {
              movementCalculationMismatch = true;
              hasIssues = true;
              reportHasIssues = true;
              console.warn(
                `      ❌ Collection ${collection._id} has movement calculation mismatch`
              );
            }

            // If this collection has issues, fix it
            if (hasIssues) {
              console.warn(`      🔧 Fixing collection ${collection._id}...`);

              // Step 1: Fix prevIn/prevOut
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

              if (previousCollections.length > 0) {
                const actualPrevCollection = previousCollections[0];
                const actualPrevIn = actualPrevCollection.metersIn || 0;
                const actualPrevOut = actualPrevCollection.metersOut || 0;

                if (
                  collection.prevIn !== actualPrevIn ||
                  collection.prevOut !== actualPrevOut
                ) {
                  correctPrevIn = actualPrevIn;
                  correctPrevOut = actualPrevOut;
                  prevInOutFixed = true;
                  fixesApplied++;
                }
              } else {
                // Only set to 0 if it's not a RAM Clear scenario
                if (
                  !collection.ramClear &&
                  (collection.prevIn !== 0 || collection.prevOut !== 0)
                ) {
                  correctPrevIn = 0;
                  correctPrevOut = 0;
                  prevInOutFixed = true;
                  fixesApplied++;
                }
              }

              // Step 2: Recalculate movement if prevIn/prevOut changed OR movement calculation is wrong
              let updatedMovement = collection.movement;
              if (prevInOutFixed || movementCalculationMismatch) {
                console.warn(
                  `      🔧 Recalculating movement for ${collection._id}...`
                );

                try {
                  // Dynamic import to avoid circular dependencies
                  const { calculateMovement } = await import(
                    '@/lib/utils/movementCalculation'
                  );

                  console.warn(`      📊 Movement calculation inputs:`, {
                    metersIn: collection.metersIn || 0,
                    metersOut: collection.metersOut || 0,
                    prevIn: correctPrevIn,
                    prevOut: correctPrevOut,
                    ramClear: collection.ramClear,
                  });

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

                  console.warn(`      📊 Movement calculation result:`, {
                    metersIn: updatedMovement.metersIn,
                    metersOut: updatedMovement.metersOut,
                    gross: updatedMovement.gross,
                  });

                  fixesApplied++;

                  if (movementCalculationMismatch) {
                    console.warn(
                      `      🔧 Recalculated movement for ${collection._id}:`,
                      {
                        oldMovement: {
                          metersIn: collection.movement.metersIn,
                          metersOut: collection.movement.metersOut,
                          gross: collection.movement.gross,
                        },
                        newMovement: {
                          metersIn: updatedMovement.metersIn,
                          metersOut: updatedMovement.metersOut,
                          gross: updatedMovement.gross,
                        },
                      }
                    );
                  }
                } catch (calcError) {
                  console.error(
                    `      ❌ Error calculating movement for ${collection._id}:`,
                    calcError
                  );
                  // Continue with original movement if calculation fails
                  updatedMovement = collection.movement;
                }
              }

              // Step 3: Fix SAS time range
              let sasStartTime = new Date(collection.timestamp);
              const sasEndTime = new Date(collection.timestamp);

              if (previousCollections.length > 0) {
                sasStartTime = new Date(previousCollections[0].timestamp);
              } else {
                // If no previous collection, start from 24 hours before collection time
                sasStartTime = new Date(
                  collection.timestamp.getTime() - 24 * 60 * 60 * 1000
                );
              }

              const newSasMetrics = {
                ...collection.sasMeters,
                drop: updatedMovement?.metersIn || 0,
                totalCancelledCredits: updatedMovement?.metersOut || 0,
                gross: updatedMovement?.gross || 0,
                gamesPlayed: collection.sasMeters?.gamesPlayed || 0,
                jackpot: collection.sasMeters?.jackpot || 0,
                sasStartTime: sasStartTime.toISOString(),
                sasEndTime: sasEndTime.toISOString(),
              };

              // Update the collection
              console.warn(
                `      🔧 Updating collection ${collection._id} with:`,
                {
                  prevIn: correctPrevIn,
                  prevOut: correctPrevOut,
                  movement: updatedMovement,
                  sasMeters: newSasMetrics,
                }
              );

              await Collections.findByIdAndUpdate(collection._id, {
                prevIn: correctPrevIn,
                prevOut: correctPrevOut,
                movement: updatedMovement,
                sasMeters: newSasMetrics,
                updatedAt: new Date(),
              });

              fixesApplied++;
              collectionsFixedInReport++;

              console.warn(
                `      ✅ Fixed ${fixesApplied} issues in collection ${collection._id}`
              );
            }
          } catch (collectionError) {
            console.error(
              `      ❌ Error fixing collection ${collection._id}:`,
              collectionError
            );
            totalErrors++;
            errors.push(
              `Collection ${collection._id}: ${
                collectionError instanceof Error
                  ? collectionError.message
                  : 'Unknown error'
              }`
            );
          }
        }

        // Note: collectionMeters syncing is handled by the individual fix endpoint
        // (fix-sas-times for single report) to avoid accidentally setting values to 0

        if (reportHasIssues && collectionsFixedInReport > 0) {
          totalReportsFixed++;
          totalCollectionsFixed += collectionsFixedInReport;
          fixedReports.push(report.locationReportId);
          console.warn(
            `   ✅ Fixed ${collectionsFixedInReport} collections in report ${report.locationReportId}`
          );
        } else if (reportHasIssues) {
          console.warn(
            `   ⚠️  Report ${report.locationReportId} had issues but couldn't be fixed`
          );
        } else {
          console.warn(`   ✅ Report ${report.locationReportId} has no issues`);
        }

        totalReportsProcessed++;
      } catch (reportError) {
        console.error(
          `❌ Error processing report ${report.locationReportId}:`,
          reportError
        );
        totalErrors++;
        errors.push(
          `Report ${report.locationReportId}: ${
            reportError instanceof Error ? reportError.message : 'Unknown error'
          }`
        );
      }
    }

    // Step: Rebuild collectionMetersHistory for all machines
    console.warn(`\n🔄 Rebuilding collectionMetersHistory for all machines...`);
    let totalHistoryRebuilt = 0;

    try {
      // Get all unique machine IDs from all processed reports
      const allMachineIds = new Set<string>();
      for (const report of allReports) {
        const reportCollections = await Collections.find({
          locationReportId: report.locationReportId,
        });
        reportCollections.forEach(collection => {
          if (collection.machineId) {
            allMachineIds.add(collection.machineId);
          }
        });
      }

      for (const machineId of allMachineIds) {
        try {
          // Rebuild history based on actual collections for this machine
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

          // Update machine with rebuilt history
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
            'collectionMeters.metersIn':
              machineCollections.length > 0
                ? machineCollections[machineCollections.length - 1].metersIn ||
                  0
                : 0,
            'collectionMeters.metersOut':
              machineCollections.length > 0
                ? machineCollections[machineCollections.length - 1].metersOut ||
                  0
                : 0,
          });

          totalHistoryRebuilt += newHistory.length;
          console.warn(
            `    ✅ Rebuilt history for machine ${machineId}: ${newHistory.length} entries`
          );
        } catch (machineError) {
          console.error(
            `    ❌ Error rebuilding history for machine ${machineId}:`,
            machineError
          );
        }
      }

      console.warn(
        `    🎉 Total collectionMetersHistory entries rebuilt: ${totalHistoryRebuilt}`
      );
    } catch (historyError) {
      console.error(
        `❌ Error rebuilding collectionMetersHistory:`,
        historyError
      );
    }

    // Final summary
    console.warn(`\n🎉 BULK FIX COMPLETED:`);
    console.warn(`   📊 Total reports processed: ${totalReportsProcessed}`);
    console.warn(`   🔧 Reports fixed: ${totalReportsFixed}`);
    console.warn(`   📦 Collections fixed: ${totalCollectionsFixed}`);
    console.warn(`   ❌ Errors: ${totalErrors}`);

    if (fixedReports.length > 0) {
      console.warn(`   📋 Fixed reports: ${fixedReports.join(', ')}`);
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalReportsProcessed,
        totalReportsFixed,
        totalCollectionsFixed,
        totalHistoryRebuilt,
        totalErrors,
        fixedReports,
      },
      message: `Successfully processed ${totalReportsProcessed} reports. Fixed ${totalReportsFixed} reports with ${totalCollectionsFixed} collections. Rebuilt ${totalHistoryRebuilt} collectionMetersHistory entries. ${totalErrors} errors occurred.`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('❌ Error in bulk SAS time fix:', error);
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
