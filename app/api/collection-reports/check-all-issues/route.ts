import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../lib/middleware/db';
import { CollectionReport } from '../../lib/models/collectionReport';
import { Collections } from '../../lib/models/collections';

/**
 * GET /api/collection-reports/check-all-issues
 * Check specific collection reports or machines for data integrity issues
 * Requires either reportId or machineId parameter
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');
    const machineId = searchParams.get('machineId');

    console.warn(
      `📋 CHECK-ALL-ISSUES API CALLED: reportId=${reportId}, machineId=${machineId}`
    );
    const startTime = Date.now();

    // Require either reportId or machineId - no more global scans
    if (!reportId && !machineId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either reportId or machineId parameter is required',
        },
        { status: 400 }
      );
    }

    // Build filter for reports
    const reportFilter: Record<string, unknown> = {};
    if (reportId) {
      reportFilter.locationReportId = reportId;
      console.warn(`🎯 Single report mode: checking ONLY report ${reportId}`);
    } else if (machineId) {
      // For machine-specific checks, we'll find reports that contain this machine
      console.warn(
        `🎯 Machine-specific mode: checking reports for machine ${machineId}`
      );
    }

    // Get reports based on the filter
    let reports;
    if (machineId) {
      // For machine-specific checks, find reports that contain this machine
      const collections = await Collections.find({ machineId }).lean();
      const locationReportIds = [
        ...new Set(collections.map(c => c.locationReportId)),
      ];
      reports = await CollectionReport.find({
        locationReportId: { $in: locationReportIds },
      }).sort({ timestamp: -1 });
      console.warn(
        `📊 Found ${reports.length} reports containing machine ${machineId}`
      );
    } else {
      reports = await CollectionReport.find(reportFilter).sort({
        timestamp: -1,
      });
      console.warn(`📊 Found ${reports.length} reports to check`);
    }

    const reportIssues: Record<
      string,
      { issueCount: number; hasIssues: boolean; machines: string[] }
    > = {};

    // Check each report for issues
    for (const report of reports) {
      // For machine-specific checks, only get collections for this specific machine
      const collectionFilter = machineId
        ? { locationReportId: report.locationReportId, machineId: machineId }
        : { locationReportId: report.locationReportId };

      const collections = await Collections.find(collectionFilter);

      let issueCount = 0;

      // Check each collection for issues
      for (const collection of collections) {
        // 1. Check prevIn/prevOut accuracy using ACTUAL historical data
        // Instead of relying on current machine state (which might be wrong),
        // check against actual previous collections in the database
        const { Machine } = await import('@/app/api/lib/models/machines');
        const machine = await Machine.findById(collection.machineId).lean();

        if (machine) {
          const machineData = machine as Record<string, unknown>;
          const currentCollectionMeters =
            (machineData.collectionMeters as Record<string, unknown>) || {
              metersIn: 0,
              metersOut: 0,
            };

          // Check if this collection should have previous values (not the first collection)
          const actualPreviousCollection = await Collections.findOne({
            machineId: collection.machineId,
            $and: [
              {
                $or: [
                  {
                    collectionTime: {
                      $lt: collection.collectionTime || collection.timestamp,
                    },
                  },
                  {
                    timestamp: {
                      $lt: collection.collectionTime || collection.timestamp,
                    },
                  },
                ],
              },
              {
                $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
              },
              // Only look for completed collections (from finalized reports)
              { isCompleted: true },
            ],
          })
            .sort({ collectionTime: -1, timestamp: -1 })
            .lean();

          if (actualPreviousCollection) {
            // There IS a previous collection, so prevIn/prevOut should match it
            const expectedPrevIn = actualPreviousCollection.metersIn || 0;
            const expectedPrevOut = actualPreviousCollection.metersOut || 0;

            // Flag as issue if prevIn/prevOut don't match the actual previous collection
            // Allow for minor precision differences (within 0.1)
            const prevInDiff = Math.abs(collection.prevIn - expectedPrevIn);
            const prevOutDiff = Math.abs(collection.prevOut - expectedPrevOut);

            if (
              prevInDiff > 0.1 ||
              prevOutDiff > 0.1 ||
              (collection.prevIn === 0 &&
                collection.prevOut === 0 &&
                expectedPrevIn > 0) // Special case: both 0 when they should have values
            ) {
              issueCount++;
            }
          } else {
            // CRITICAL: No previous COLLECTION found, but this doesn't mean prevIn/prevOut should be 0!
            // The creation logic uses machine.collectionMeters as fallback when no previous collection exists
            // So we need to check if prevIn/prevOut match machine.collectionMeters (at the time of creation)
            // We can't validate this accurately without knowing the historical machine.collectionMeters value
            // So we should NOT flag this as an issue - it's expected behavior!
            console.warn(`ℹ️ No previous collection found for ${collection.machineId}, prevIn/prevOut likely from machine.collectionMeters (expected behavior)`);
            // Don't flag as issue - this is normal when using machine.collectionMeters fallback
          }

          // 3. Check machine collectionMeters accuracy
          // Check if machine's current collectionMeters match the collection's current meters
          const machineMetersIn =
            (currentCollectionMeters.metersIn as number) || 0;
          const machineMetersOut =
            (currentCollectionMeters.metersOut as number) || 0;

          if (
            machineMetersIn !== collection.metersIn ||
            machineMetersOut !== collection.metersOut
          ) {
            issueCount++;
          }
        } else {
          // Machine not found - this is an error
          issueCount++;
        }

        // 2. Check movement calculation accuracy (handle RAM Clear)
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
          expectedMetersInMovement = collection.metersIn - collection.prevIn;
          expectedMetersOutMovement = collection.metersOut - collection.prevOut;
        }

        const expectedGross =
          expectedMetersInMovement - expectedMetersOutMovement;

        if (
          Math.abs(collection.movement.metersIn - expectedMetersInMovement) >
            0.01 ||
          Math.abs(collection.movement.metersOut - expectedMetersOutMovement) >
            0.01 ||
          Math.abs(collection.movement.gross - expectedGross) > 0.01
        ) {
          issueCount++;
        }

        // 4. Check for missing reports (collections exist but reports don't)
        if (collection.locationReportId) {
          const reportExists = await CollectionReport.findOne({
            locationReportId: collection.locationReportId,
          }).lean();

          if (!reportExists) {
            // Collection has a locationReportId but the report doesn't exist
            issueCount++;
          }
        }

        // 5. Check for inverted SAS times
        if (
          collection.sasMeters?.sasStartTime &&
          collection.sasMeters?.sasEndTime
        ) {
          const sasStart = new Date(collection.sasMeters.sasStartTime);
          const sasEnd = new Date(collection.sasMeters.sasEndTime);
          if (sasStart >= sasEnd) {
            issueCount++;
          }
        }

        // Note: Negative movements are expected in the system, not errors

        // Note: collectionMetersHistory prevIn/prevOut issues are checked at the machine level
        // This is a system-wide issue that affects all reports for machines with broken history
      }

      // Note: collectionMeters sync issues are not counted as report issues
      // since they are system-wide concerns, not specific to individual reports

      // Initialize report issues entry BEFORE machine history check
      if (!reportIssues[report._id.toString()]) {
        reportIssues[report._id.toString()] = {
          issueCount: issueCount,
          hasIssues: issueCount > 0,
          machines: [],
        };
      }

      // Check machine history issues for machines in this report
      // For machine-specific checks, only check the specific machine
      const machineIds = machineId
        ? [machineId]
        : [...new Set(collections.map(c => c.machineId))];

      for (const machineIdToCheck of machineIds) {
        const { Machine } = await import('@/app/api/lib/models/machines');

        // Try to find the machine using the existing model
        let machine = await Machine.findById(machineIdToCheck).lean();

        // If not found, try findOne with _id
        if (!machine) {
          machine = await Machine.findOne({ _id: machineIdToCheck }).lean();
        }

        if (machine) {
          const machineData = machine as Record<string, unknown>;
          const history =
            (machineData.collectionMetersHistory as Record<
              string,
              unknown
            >[]) || [];
          let hasMachineHistoryIssues = false;

          // Check for orphaned entries (referencing non-existent collections or reports)
          const { Collections } = await import(
            '@/app/api/lib/models/collections'
          );
          const { CollectionReport } = await import(
            '@/app/api/lib/models/collectionReport'
          );

          for (let i = 0; i < history.length; i++) {
            const entry = history[i];
            if (entry.locationReportId) {
              // Check if collections exist for this locationReportId
              const collectionsExist = await Collections.findOne({
                locationReportId: entry.locationReportId,
              }).lean();

              // Check if the collection report itself exists
              const reportExists = await CollectionReport.findOne({
                locationReportId: entry.locationReportId,
              }).lean();

              if (!collectionsExist || !reportExists) {
                console.warn(
                  `🚨 Orphaned history entry detected for machine ${machineData.serialNumber || machineIdToCheck}:`,
                  {
                    locationReportId: entry.locationReportId,
                    timestamp: entry.timestamp,
                    hasCollections: !!collectionsExist,
                    hasReport: !!reportExists,
                  }
                );
                hasMachineHistoryIssues = true;
              }
            }
          }

          // Check for duplicate dates in history
          const dateMap = new Map<string, number>();
          for (let i = 0; i < history.length; i++) {
            const entry = history[i];
            if (entry.timestamp) {
              // Get the date without time
              const date = new Date(entry.timestamp as string)
                .toISOString()
                .split('T')[0];
              const count = dateMap.get(date) || 0;
              dateMap.set(date, count + 1);

              if (count + 1 > 1) {
                hasMachineHistoryIssues = true;
              }
            }
          }

          if (hasMachineHistoryIssues) {
            reportIssues[report._id.toString()].issueCount++;
            reportIssues[report._id.toString()].hasIssues = true;
            // Add machine to the machines array
            const machineName = String(
              machineData.serialNumber ||
                (machineData.custom as Record<string, unknown>)?.name ||
                machineIdToCheck
            );
            if (
              !reportIssues[report._id.toString()].machines.includes(
                machineName
              )
            ) {
              reportIssues[report._id.toString()].machines.push(machineName);
            }
          }
        }
      }

      // Check for duplicate reports on the same day
      const duplicateReports = await CollectionReport.find({
        location: report.location,
        $and: [
          {
            $or: [
              {
                $and: [
                  { gamingDayStart: { $lte: new Date(report.timestamp) } },
                  { gamingDayEnd: { $gte: new Date(report.timestamp) } },
                ],
              },
            ],
          },
          {
            $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
          },
          { _id: { $ne: report._id } },
        ],
      }).lean();

      if (duplicateReports.length > 0) {
        reportIssues[report._id.toString()].issueCount++;
        reportIssues[report._id.toString()].hasIssues = true;
      }
    }

    // No more global machine history scans - only check specific reports or machines

    // Calculate total issues
    const totalIssues = Object.values(reportIssues).reduce(
      (total, report) => total + (report.issueCount || 0),
      0
    );

    // For machine-specific queries, return detailed issues for the frontend to display
    const machineIssues: Array<{
      machineId: string;
      machineName: string;
      issues: Array<{
        type: string;
        locationReportId: string;
        message: string;
        details?: Record<string, unknown>;
      }>;
    }> = [];

    if (machineId) {
      const { Machine } = await import('@/app/api/lib/models/machines');
      const machine = await Machine.findById(machineId).lean();

      if (machine) {
        const machineData = machine as Record<string, unknown>;
        const history =
          (machineData.collectionMetersHistory as Array<Record<string, unknown>>) || [];
        const machineName = String(
          machineData.serialNumber ||
            (machineData.custom as Record<string, unknown>)?.name ||
            machineId
        );

        const issues: Array<{
          type: string;
          locationReportId: string;
          message: string;
          details?: Record<string, unknown>;
        }> = [];

        // Check for duplicate locationReportIds in history
        const locationReportIdMap = new Map<string, number>();
        for (const entry of history) {
          if (entry.locationReportId) {
            const reportId = entry.locationReportId as string;
            const count = locationReportIdMap.get(reportId) || 0;
            locationReportIdMap.set(reportId, count + 1);
          }
        }

        // Flag duplicates
        for (const [reportId, count] of locationReportIdMap.entries()) {
          if (count > 1) {
            issues.push({
              type: 'duplicate_history',
              locationReportId: reportId,
              message: `Duplicate History: ${count} entries with the same report ID`,
              details: { count },
            });
          }
        }

        // Check for orphaned entries
        const { Collections } = await import('@/app/api/lib/models/collections');
        const { CollectionReport } = await import(
          '@/app/api/lib/models/collectionReport'
        );

        for (const entry of history) {
          if (entry.locationReportId) {
            const reportId = entry.locationReportId as string;
            
            // Check if collection exists
            const collectionExists = await Collections.findOne({
              machineId: machineId,
              locationReportId: reportId,
            }).lean();

            // Check if report exists
            const reportExists = await CollectionReport.findOne({
              locationReportId: reportId,
            }).lean();

            if (!collectionExists && !reportExists) {
              issues.push({
                type: 'orphaned_history',
                locationReportId: reportId,
                message: 'Orphaned History: Collection and report no longer exist',
              });
            } else if (!collectionExists) {
              issues.push({
                type: 'missing_collection',
                locationReportId: reportId,
                message: 'Missing Collection: Report exists but collection document is missing',
              });
            } else if (!reportExists) {
              issues.push({
                type: 'missing_report',
                locationReportId: reportId,
                message: 'Missing Report: Collection exists but report document is missing',
              });
            }

            // Check for history mismatch (if collection exists)
            if (collectionExists) {
              const historyMetersIn = entry.metersIn as number;
              const historyMetersOut = entry.metersOut as number;
              const historyPrevMetersIn = entry.prevMetersIn as number;
              const historyPrevMetersOut = entry.prevMetersOut as number;

              const collectionMetersIn = collectionExists.metersIn as number;
              const collectionMetersOut = collectionExists.metersOut as number;
              const collectionPrevIn = collectionExists.prevIn as number;
              const collectionPrevOut = collectionExists.prevOut as number;

              const metersInMatch = Math.abs(historyMetersIn - collectionMetersIn) < 0.1;
              const metersOutMatch = Math.abs(historyMetersOut - collectionMetersOut) < 0.1;
              const prevInMatch = Math.abs(historyPrevMetersIn - collectionPrevIn) < 0.1;
              const prevOutMatch = Math.abs(historyPrevMetersOut - collectionPrevOut) < 0.1;

              if (!metersInMatch || !metersOutMatch || !prevInMatch || !prevOutMatch) {
                issues.push({
                  type: 'history_mismatch',
                  locationReportId: reportId,
                  message: 'History Mismatch: Collection document and history entry have different values',
                  details: {
                    collection: {
                      metersIn: collectionMetersIn,
                      metersOut: collectionMetersOut,
                      prevIn: collectionPrevIn,
                      prevOut: collectionPrevOut,
                    },
                    history: {
                      metersIn: historyMetersIn,
                      metersOut: historyMetersOut,
                      prevMetersIn: historyPrevMetersIn,
                      prevMetersOut: historyPrevMetersOut,
                    },
                  },
                });
              }
            }
          }
        }

        machineIssues.push({
          machineId,
          machineName,
          issues,
        });
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.warn(`⏱️ CHECK-ALL-ISSUES completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      totalIssues,
      reportIssues,
      machines: machineIssues, // Add detailed machine issues for cabinet details page
    });
  } catch (error) {
    console.error('Error checking report issues:', error);
    return NextResponse.json(
      { error: 'Failed to check report issues' },
      { status: 500 }
    );
  }
}
