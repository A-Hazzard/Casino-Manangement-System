/**
 * Check All Issues Helper
 *
 * This file contains helper functions for checking collection report and machine issues,
 * including prevIn/prevOut validation, movement calculation validation, and machine history validation.
 */

import { Collections } from '../models/collections';
import { CollectionReport } from '../models/collectionReport';
import { Machine } from '../models/machines';
import { calculateMovement } from '@/lib/utils/movementCalculation';

/**
 * Checks issues for a specific report or machine
 *
 * @param reportId - Optional report ID
 * @param machineId - Optional machine ID
 * @returns Promise<CheckAllIssuesResult>
 */
export async function checkAllIssues(
  reportId?: string | null,
  machineId?: string | null
): Promise<{
  success: boolean;
  reportIssues?: Record<
    string,
    { issueCount: number; hasIssues: boolean; machines: string[] }
  >;
  machineIssues?: Array<{
    machineId: string;
    machineName: string;
    issues: Array<{
      type: string;
      locationReportId: string;
      message: string;
      details?: Record<string, unknown>;
    }>;
  }>;
  totalIssues?: number;
  error?: string;
}> {
  if (!reportId && !machineId) {
    return {
      success: false,
      error: 'Either reportId or machineId parameter is required',
    };
  }

  // Build filter for reports
  let reports;
  if (machineId) {
    // For machine-specific checks, find reports that contain this machine
    const collections = await Collections.find({ machineId }).lean();
    const locationReportIds = [
      ...new Set(collections.map(c => c.locationReportId).filter(Boolean)),
    ];
    reports = await CollectionReport.find({
      locationReportId: { $in: locationReportIds },
    }).sort({ timestamp: -1 });
  } else if (reportId) {
    reports = await CollectionReport.find({
      locationReportId: reportId,
    }).sort({ timestamp: -1 });
  } else {
    return {
      success: false,
      error: 'Either reportId or machineId parameter is required',
    };
  }

  const reportIssues: Record<
    string,
    { issueCount: number; hasIssues: boolean; machines: string[] }
  > = {};

  // Check each report for issues
  for (const report of reports) {
    const collectionFilter = machineId
      ? { locationReportId: report.locationReportId, machineId }
      : { locationReportId: report.locationReportId };

    const collections = await Collections.find(collectionFilter);

    let issueCount = 0;

    // Get the most recent collection for this machine to compare with machine.collectionMeters
    let mostRecentCollectionForMachine: {
      _id: string;
      metersIn?: number;
      metersOut?: number;
    } | null = null;
    if (machineId) {
      mostRecentCollectionForMachine = await Collections.findOne({
        machineId,
        $and: [
          { $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] },
          { isCompleted: true },
        ],
      })
        .sort({ collectionTime: -1, timestamp: -1 })
        .lean();
    }

    // Check each collection for issues
    for (const collection of collections) {
      // CRITICAL: Use findOne with _id instead of findById (repo rule)
      const machine = await Machine.findOne({ _id: collection.machineId }).lean();

      if (machine) {
        const machineData = machine as Record<string, unknown>;
        const currentCollectionMeters =
          (machineData.collectionMeters as Record<string, unknown>) || {
            metersIn: 0,
            metersOut: 0,
          };

        // Check prevIn/prevOut accuracy
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
            { isCompleted: true },
          ],
        })
          .sort({ collectionTime: -1, timestamp: -1 })
          .lean();

        if (actualPreviousCollection) {
          const expectedPrevIn = actualPreviousCollection.metersIn || 0;
          const expectedPrevOut = actualPreviousCollection.metersOut || 0;
          const prevInDiff = Math.abs(collection.prevIn - expectedPrevIn);
          const prevOutDiff = Math.abs(collection.prevOut - expectedPrevOut);

          if (
            prevInDiff > 0.1 ||
            prevOutDiff > 0.1 ||
            (collection.prevIn === 0 &&
              collection.prevOut === 0 &&
              expectedPrevIn > 0)
          ) {
            issueCount++;
          }
        }

        // Check machine collectionMeters accuracy (only for most recent collection)
        const isThisMostRecent =
          mostRecentCollectionForMachine &&
          mostRecentCollectionForMachine._id === collection._id;

        if (isThisMostRecent) {
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
        }
      } else {
        issueCount++;
      }

      // Check movement calculation accuracy
      const expectedMovement = calculateMovement(
        collection.metersIn || 0,
        collection.metersOut || 0,
        {
          metersIn: collection.prevIn || 0,
          metersOut: collection.prevOut || 0,
        },
        collection.ramClear,
        undefined,
        undefined,
        collection.ramClearMetersIn,
        collection.ramClearMetersOut
      );

      if (
        Math.abs(
          (collection.movement?.metersIn || 0) - expectedMovement.metersIn
        ) > 0.01 ||
        Math.abs(
          (collection.movement?.metersOut || 0) - expectedMovement.metersOut
        ) > 0.01 ||
        Math.abs((collection.movement?.gross || 0) - expectedMovement.gross) >
          0.01
      ) {
        issueCount++;
      }

      // Check for missing reports
      if (collection.locationReportId) {
        const reportExists = await CollectionReport.findOne({
          locationReportId: collection.locationReportId,
        }).lean();

        if (!reportExists) {
          issueCount++;
        }
      }

      // Check for inverted SAS times
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
    }

    // Initialize report issues entry
    if (!reportIssues[report._id.toString()]) {
      reportIssues[report._id.toString()] = {
        issueCount,
        hasIssues: issueCount > 0,
        machines: [],
      };
    }

    // Check machine history issues
    const machineIds = machineId
      ? [machineId]
      : [...new Set(collections.map(c => c.machineId).filter(Boolean))];

    for (const machineIdToCheck of machineIds) {
      // CRITICAL: Use findOne with _id instead of findById (repo rule)
      const machine = await Machine.findOne({ _id: machineIdToCheck }).lean();

      if (machine) {
        const machineData = machine as Record<string, unknown>;
        const history =
          (machineData.collectionMetersHistory as Array<
            Record<string, unknown>
          >) || [];
        let hasMachineHistoryIssues = false;

        // Check for orphaned entries
        for (const entry of history) {
          if (entry.locationReportId) {
            const collectionsExist = await Collections.findOne({
              locationReportId: entry.locationReportId,
            }).lean();

            const reportExists = await CollectionReport.findOne({
              locationReportId: entry.locationReportId,
            }).lean();

            if (!collectionsExist || !reportExists) {
              hasMachineHistoryIssues = true;
              break;
            }
          }
        }

        // Check for duplicate dates
        if (!hasMachineHistoryIssues) {
          const dateMap = new Map<string, number>();
          for (const entry of history) {
            if (entry.timestamp) {
              const date = new Date(entry.timestamp as string)
                .toISOString()
                .split('T')[0];
              const count = dateMap.get(date) || 0;
              dateMap.set(date, count + 1);

              if (count + 1 > 1) {
                hasMachineHistoryIssues = true;
                break;
              }
            }
          }
        }

        if (hasMachineHistoryIssues) {
          reportIssues[report._id.toString()].issueCount++;
          reportIssues[report._id.toString()].hasIssues = true;
          const machineName = String(
            machineData.serialNumber ||
              (machineData.custom as Record<string, unknown>)?.name ||
              machineIdToCheck
          );
          if (
            !reportIssues[report._id.toString()].machines.includes(machineName)
          ) {
            reportIssues[report._id.toString()].machines.push(machineName);
          }
        }
      }
    }
  }

  // Calculate total issues
  const totalIssues = Object.values(reportIssues).reduce(
    (total, report) => total + (report.issueCount || 0),
    0
  );

  // Check machine history issues
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

  let machineIdsToCheck: string[] = [];
  if (machineId) {
    machineIdsToCheck = [machineId];
  } else if (reportId) {
    const collections = await Collections.find({
      locationReportId: reportId,
    }).lean();
    machineIdsToCheck = [
      ...new Set(collections.map(c => String(c.machineId)).filter(Boolean)),
    ];
  }

  if (machineIdsToCheck.length > 0) {
    for (const machId of machineIdsToCheck) {
      // CRITICAL: Use findOne with _id instead of findById (repo rule)
      const machine = await Machine.findOne({ _id: machId }).lean();

      if (machine) {
        const machineData = machine as Record<string, unknown>;
        const history =
          (machineData.collectionMetersHistory as Array<
            Record<string, unknown>
          >) || [];
        const machineName = String(
          machineData.serialNumber ||
            (machineData.custom as Record<string, unknown>)?.name ||
            machId
        );

        const issues: Array<{
          type: string;
          locationReportId: string;
          message: string;
          details?: Record<string, unknown>;
        }> = [];

        // Check for duplicate locationReportIds
        const locationReportIdMap = new Map<string, number>();
        for (const entry of history) {
          if (entry.locationReportId) {
            const reportId = entry.locationReportId as string;
            const count = locationReportIdMap.get(reportId) || 0;
            locationReportIdMap.set(reportId, count + 1);
          }
        }

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
        for (const entry of history) {
          if (entry.locationReportId) {
            const reportId = entry.locationReportId as string;

            const collectionExists = await Collections.findOne({
              machineId: machId,
              locationReportId: reportId,
            }).lean();

            const reportExists = await CollectionReport.findOne({
              locationReportId: reportId,
            }).lean();

            if (!collectionExists && !reportExists) {
              issues.push({
                type: 'orphaned_history',
                locationReportId: reportId,
                message: 'Orphaned history entry - no collection or report found',
                details: {
                  timestamp: entry.timestamp,
                },
              });
            }
          }
        }

        if (issues.length > 0) {
          machineIssues.push({
            machineId: machId,
            machineName,
            issues,
          });
        }
      }
    }
  }

  return {
    success: true,
    reportIssues,
    machineIssues,
    totalIssues,
  };
}

