import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../lib/middleware/db';
import { Collections } from '../../lib/models/collections';
import { CollectionReport } from '../../lib/models/collectionReport';

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
      { issueCount: number; hasIssues: boolean }
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
            // There IS a previous collection, so prevIn/prevOut should NOT be 0
            const expectedPrevIn = actualPreviousCollection.metersIn || 0;
            const expectedPrevOut = actualPreviousCollection.metersOut || 0;

            // Flag as issue if prevIn/prevOut are 0 when they should have actual values
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
            // No previous collection exists, so prevIn/prevOut should be 0
            if (collection.prevIn !== 0 || collection.prevOut !== 0) {
              issueCount++;
            }
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

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.warn(`⏱️ CHECK-ALL-ISSUES completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      totalIssues,
      reportIssues,
    });
  } catch (error) {
    console.error('Error checking report issues:', error);
    return NextResponse.json(
      { error: 'Failed to check report issues' },
      { status: 500 }
    );
  }
}
