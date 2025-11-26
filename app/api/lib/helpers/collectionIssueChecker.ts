/**
 * Collection Issue Checker Helper
 *
 * This file contains helper functions for checking and validating collection issues,
 * including SAS time validation, previous meters validation, and movement calculation validation.
 */

import type {
  CollectionIssue,
  CollectionIssueDetails,
} from '@/shared/types/entities';
import { Collections } from '../models/collections';

/**
 * Finds the previous collection for a machine
 *
 * @param allCollections - All completed collections
 * @param machineId - The machine ID
 * @param currentTimestamp - The current collection timestamp
 * @param currentCollectionId - The current collection ID to exclude
 * @returns The previous collection or null
 */
export function findPreviousCollection(
  allCollections: Array<{
    _id: string;
    machineId?: string;
    timestamp?: Date;
    collectionTime?: Date;
    isCompleted?: boolean;
    locationReportId?: string;
  }>,
  machineId: string,
  currentTimestamp: Date,
  currentCollectionId: string
) {
  return allCollections
    .filter(
      c =>
        c.machineId === machineId &&
        new Date(c.timestamp || c.collectionTime || 0) < currentTimestamp &&
        c.isCompleted === true &&
        c.locationReportId &&
        c.locationReportId.trim() !== '' &&
        c._id.toString() !== currentCollectionId
    )
    .sort((a, b) => {
      const aTime = new Date(a.timestamp || a.collectionTime || 0).getTime();
      const bTime = new Date(b.timestamp || b.collectionTime || 0).getTime();
      return bTime - aTime; // descending
    })[0];
}

/**
 * Validates SAS times for a collection
 *
 * @param collection - The collection to validate
 * @param expectedSasStartTime - Expected SAS start time
 * @param expectedSasEndTime - Expected SAS end time
 * @param previousCollection - The previous collection (if any)
 * @returns Array of issues found
 */
export function validateSasTimes(
  collection: {
    _id: string;
    machineName?: string;
    machineCustomName?: string;
    sasMeters?: {
      sasStartTime?: string;
      sasEndTime?: string;
    };
  },
  expectedSasStartTime: Date,
  expectedSasEndTime: Date,
  previousCollection: unknown
): CollectionIssue[] {
  const issues: CollectionIssue[] = [];

  if (
    collection.sasMeters?.sasStartTime &&
    collection.sasMeters?.sasEndTime
  ) {
    const sasStartTime = new Date(collection.sasMeters.sasStartTime);
    const sasEndTime = new Date(collection.sasMeters.sasEndTime);

    // Check for inverted SAS times
    if (sasStartTime >= sasEndTime) {
      issues.push({
        collectionId: collection._id.toString(),
        machineName:
          collection.machineName ||
          collection.machineCustomName ||
          'Unknown',
        issueType: 'inverted_times',
        details: {
          current: {
            sasStartTime: sasStartTime.toISOString(),
            sasEndTime: sasEndTime.toISOString(),
          },
          expected: {
            sasStartTime: expectedSasStartTime.toISOString(),
            sasEndTime: expectedSasEndTime.toISOString(),
          },
          explanation:
            'SAS start time is after or equal to SAS end time, creating an invalid time range',
        },
      });
    }

    // Check if sasStartTime matches expected
    const startDiff = Math.abs(
      sasStartTime.getTime() - expectedSasStartTime.getTime()
    );
    if (startDiff > 1000) {
      // Allow 1 second tolerance
      issues.push({
        collectionId: collection._id.toString(),
        machineName:
          collection.machineName ||
          collection.machineCustomName ||
          'Unknown',
        issueType: 'wrong_sas_start_time',
        details: {
          current: {
            sasStartTime: sasStartTime.toISOString(),
          },
          expected: {
            sasStartTime: expectedSasStartTime.toISOString(),
            explanation: previousCollection
              ? `Should match previous collection's timestamp`
              : `No previous collection found, using 24 hours before current`,
          },
          explanation: `SAS start time doesn't match ${
            previousCollection
              ? "previous collection's timestamp"
              : 'expected value (24 hours before)'
          }. Difference: ${Math.round(startDiff / 1000 / 60)} minutes`,
        },
      });
    }

    // Check if sasEndTime matches expected
    const endDiff = Math.abs(
      sasEndTime.getTime() - expectedSasEndTime.getTime()
    );
    if (endDiff > 1000) {
      // Allow 1 second tolerance
      issues.push({
        collectionId: collection._id.toString(),
        machineName:
          collection.machineName ||
          collection.machineCustomName ||
          'Unknown',
        issueType: 'wrong_sas_end_time',
        details: {
          current: {
            sasEndTime: sasEndTime.toISOString(),
          },
          expected: {
            sasEndTime: expectedSasEndTime.toISOString(),
          },
          explanation: `SAS end time doesn't match collection timestamp. Difference: ${Math.round(
            endDiff / 1000 / 60
          )} minutes`,
        },
      });
    }
  } else {
    // Missing SAS times
    issues.push({
      collectionId: collection._id.toString(),
      machineName:
        collection.machineName || collection.machineCustomName || 'Unknown',
      issueType: 'missing_sas_times',
      details: {
        current: {
          sasStartTime: collection.sasMeters?.sasStartTime || null,
          sasEndTime: collection.sasMeters?.sasEndTime || null,
        },
        expected: {
          sasStartTime: expectedSasStartTime.toISOString(),
          sasEndTime: expectedSasEndTime.toISOString(),
        },
        explanation: 'SAS times are missing from this collection',
      },
    });
  }

  return issues;
}

/**
 * Validates previous meters for a collection
 *
 * @param collection - The collection to validate
 * @param actualPreviousCollection - The actual previous collection document
 * @returns Array of issues found
 */
export function validatePreviousMeters(
  collection: {
    _id: string;
    machineName?: string;
    machineCustomName?: string;
    prevIn?: number;
    prevOut?: number;
  },
  actualPreviousCollection: {
    metersIn?: number;
    metersOut?: number;
    timestamp?: Date;
  } | null
): CollectionIssue[] {
  const issues: CollectionIssue[] = [];

  if (
    collection.prevIn === undefined ||
    collection.prevOut === undefined
  ) {
    return issues;
  }

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
      issues.push({
        collectionId: collection._id.toString(),
        machineName:
          collection.machineName ||
          collection.machineCustomName ||
          'Unknown',
        issueType: 'prev_meters_mismatch',
        details: {
          current: {
            prevIn: collection.prevIn,
            prevOut: collection.prevOut,
          },
          expected: {
            prevIn: expectedPrevIn,
            prevOut: expectedPrevOut,
            previousCollectionTime: actualPreviousCollection.timestamp,
          },
          explanation: `Previous meters don't match the actual meters from the previous collection (${new Date(
            actualPreviousCollection.timestamp || 0
          ).toLocaleDateString()})`,
        },
      });
    }
  }

  return issues;
}

/**
 * Validates movement calculation for a collection
 *
 * @param collection - The collection to validate
 * @returns Array of issues found
 */
export function validateMovementCalculation(
  collection: {
    _id: string;
    machineName?: string;
    machineCustomName?: string;
    metersIn?: number;
    metersOut?: number;
    prevIn?: number;
    prevOut?: number;
    ramClear?: boolean;
    ramClearMetersIn?: number;
    ramClearMetersOut?: number;
    movement?: {
      metersIn: number;
      metersOut: number;
      gross: number;
    };
  }
): CollectionIssue[] {
  const issues: CollectionIssue[] = [];

  if (!collection.movement) {
    return issues;
  }

  let expectedMetersInMovement: number;
  let expectedMetersOutMovement: number;

  if (collection.ramClear) {
    if (
      collection.ramClearMetersIn !== undefined &&
      collection.ramClearMetersOut !== undefined
    ) {
      expectedMetersInMovement =
        collection.ramClearMetersIn -
        (collection.prevIn || 0) +
        ((collection.metersIn || 0) - 0);
      expectedMetersOutMovement =
        collection.ramClearMetersOut -
        (collection.prevOut || 0) +
        ((collection.metersOut || 0) - 0);
    } else {
      expectedMetersInMovement = collection.metersIn || 0;
      expectedMetersOutMovement = collection.metersOut || 0;
    }
  } else {
    expectedMetersInMovement =
      (collection.metersIn || 0) - (collection.prevIn || 0);
    expectedMetersOutMovement =
      (collection.metersOut || 0) - (collection.prevOut || 0);
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
    issues.push({
      collectionId: collection._id.toString(),
      machineName:
        collection.machineName || collection.machineCustomName || 'Unknown',
      issueType: 'prev_meters_mismatch',
      details: {
        current: {
          movementMetersIn: collection.movement.metersIn,
          movementMetersOut: collection.movement.metersOut,
          movementGross: collection.movement.gross,
        },
        expected: {
          movementMetersIn: expectedMetersInMovement,
          movementMetersOut: expectedMetersOutMovement,
          movementGross: expectedGross,
        },
        explanation: `Movement calculation doesn't match expected values (MetersIn - PrevIn = ${expectedMetersInMovement.toFixed(
          2
        )}, MetersOut - PrevOut = ${expectedMetersOutMovement.toFixed(
          2
        )}, Gross = ${expectedGross.toFixed(2)})`,
      },
    });
  }

  return issues;
}

/**
 * Checks collection history issues at machine level
 *
 * @param machineIds - Array of machine IDs to check
 * @returns Promise<CollectionIssue[]>
 */
export async function checkCollectionHistoryIssues(
  machineIds: string[]
): Promise<CollectionIssue[]> {
  const issues: CollectionIssue[] = [];

  try {
    const mongoose = await import('mongoose');
    const db = mongoose.default.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    const machineObjectIds = machineIds
      .map(id => {
        try {
          return new mongoose.default.Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const machinesWithHistory = await db
      .collection('machines')
      .find({
        $or: [
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { _id: { $in: machineObjectIds as any } },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { _id: { $in: machineIds as any } },
        ],
        collectionMetersHistory: { $exists: true, $ne: [] },
      })
      .toArray();

    for (const machine of machinesWithHistory) {
      const history = machine.collectionMetersHistory || [];

      for (let i = 0; i < history.length; i++) {
        const entry = history[i];

        if (!entry.locationReportId) continue;

        const matchingCollection = await Collections.findOne({
          locationReportId: entry.locationReportId,
          machineId: machine._id.toString(),
        }).lean();

        if (!matchingCollection) continue;

        const collectionPrevIn = matchingCollection.prevIn || 0;
        const collectionPrevOut = matchingCollection.prevOut || 0;
        const historyPrevIn = entry.prevMetersIn || 0;
        const historyPrevOut = entry.prevMetersOut || 0;

        if (
          Math.abs(historyPrevIn - collectionPrevIn) > 0.1 ||
          Math.abs(historyPrevOut - collectionPrevOut) > 0.1
        ) {
          issues.push({
            collectionId: `machine-${machine._id}-history-${i}`,
            machineName:
              machine.serialNumber ||
              machine.custom?.name ||
              machine.origSerialNumber ||
              machine._id.toString(),
            issueType: 'prev_meters_mismatch',
            details: {
              current: {
                prevMetersIn: entry.prevMetersIn,
                prevMetersOut: entry.prevMetersOut,
                entryIndex: i,
              },
              expected: {
                prevMetersIn: collectionPrevIn,
                prevMetersOut: collectionPrevOut,
                entryIndex: i,
              },
              explanation: `Collection history entry does not match its collection document. History has prevMetersIn=${historyPrevIn}, prevMetersOut=${historyPrevOut}, but collection document has prevIn=${collectionPrevIn}, prevOut=${collectionPrevOut}.`,
            },
          });
          break; // Only count this machine once
        }
      }
    }
  } catch (error) {
    console.error('Error checking collectionMetersHistory:', error);
  }

  return issues;
}

/**
 * Checks all collection issues for a report
 *
 * @param reportId - The collection report ID
 * @returns Promise<CollectionIssueDetails>
 */
export async function checkCollectionReportIssues(
  reportId: string
): Promise<CollectionIssueDetails> {
  const collections = await Collections.find({
    locationReportId: reportId,
  });

  if (collections.length === 0) {
    return {
      issues: [],
      summary: {
        totalIssues: 0,
        affectedMachines: 0,
        affectedReports: 0,
      },
    };
  }

  // Fetch ALL completed collections across ALL reports to find previous collections
  const allCollections = await Collections.find({
    isCompleted: true,
    locationReportId: { $exists: true, $ne: '' },
  }).sort({ timestamp: 1, collectionTime: 1 });

  const issues: CollectionIssue[] = [];
  const affectedMachines = new Set<string>();

  // Sort collections chronologically for proper validation
  const sortedCollections = collections.sort((a, b) => {
    const aTime = new Date(a.timestamp || a.collectionTime || 0).getTime();
    const bTime = new Date(b.timestamp || b.collectionTime || 0).getTime();
    return aTime - bTime;
  });

  // Check each collection for issues
  for (const collection of sortedCollections) {
    const machineId = collection.machineId;
    if (!machineId) continue;

    affectedMachines.add(machineId);

    const currentTimestamp = new Date(
      collection.timestamp || collection.collectionTime || 0
    );

    // Find previous collection
    const previousCollection = findPreviousCollection(
      allCollections,
      machineId,
      currentTimestamp,
      collection._id.toString()
    );

    const expectedSasStartTime = previousCollection
      ? new Date(
          previousCollection.timestamp || previousCollection.collectionTime || 0
        )
      : new Date(currentTimestamp.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago if no previous

    const expectedSasEndTime = currentTimestamp;

    // Validate SAS times
    const sasIssues = validateSasTimes(
      collection,
      expectedSasStartTime,
      expectedSasEndTime,
      previousCollection
    );
    issues.push(...sasIssues);

    // Validate previous meters
    const actualPreviousCollection = await Collections.findOne({
      machineId: machineId,
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
      const prevMeterIssues = validatePreviousMeters(
        collection,
        actualPreviousCollection
      );
      issues.push(...prevMeterIssues);
    }

    // Validate movement calculation
    const movementIssues = validateMovementCalculation(collection);
    issues.push(...movementIssues);
  }

  // Check collection history issues
  const machineIdsInReport = [
    ...new Set(collections.map(c => c.machineId).filter(Boolean)),
  ];
  const historyIssues = await checkCollectionHistoryIssues(
    machineIdsInReport
  );
  issues.push(...historyIssues);

  // Add affected machines from history issues
  historyIssues.forEach(issue => {
    if (issue.collectionId.startsWith('machine-')) {
      const machineId = issue.collectionId.split('-')[1];
      if (machineId) {
        affectedMachines.add(machineId);
      }
    }
  });

  return {
    issues,
    summary: {
      totalIssues: issues.length,
      affectedMachines: affectedMachines.size,
      affectedReports: 1,
    },
  };
}

/**
 * Investigates the most recent collection report for issues
 *
 * @returns Promise<InvestigationResult>
 */
export async function investigateMostRecentReport(): Promise<{
  success: boolean;
  reportId?: string;
  reportDetails?: {
    locationName: string;
    timestamp: Date;
    collectorName: string;
  };
  totalCollections?: number;
  collectionsWithIssues?: number;
  machinesWithIssues?: number;
  issues?: Array<{
    collectionId: string;
    machineId: string;
    issues: Array<{
      type: string;
      description: string;
      details: Record<string, unknown>;
    }>;
  }>;
  error?: string;
}> {
  const { CollectionReport } = await import('../models/collectionReport');
  const { Collections } = await import('../models/collections');
  const { Machine } = await import('../models/machines');

  const mostRecentReport = await CollectionReport.findOne({})
    .sort({ timestamp: -1 })
    .lean();

  if (!mostRecentReport) {
    return {
      success: false,
      error: 'No collection reports found',
    };
  }

  const reportCollections = await Collections.find({
    locationReportId: mostRecentReport.locationReportId,
  })
    .sort({ timestamp: 1 })
    .lean();

  const issues: Array<{
    collectionId: string;
    machineId: string;
    issues: Array<{
      type: string;
      description: string;
      details: Record<string, unknown>;
    }>;
  }> = [];
  const machinesWithIssues = new Set<string>();

  // Investigate each collection
  for (const collection of reportCollections) {
    const collectionIssues: Array<{
      type: string;
      description: string;
      details: Record<string, unknown>;
    }> = [];

    // Check SAS Times Issues
    if (collection.sasMeters) {
      const sasStart = new Date(collection.sasMeters.sasStartTime || 0);
      const sasEnd = new Date(collection.sasMeters.sasEndTime || 0);

      if (sasStart >= sasEnd) {
        collectionIssues.push({
          type: 'SAS_TIMES_INVERTED',
          description: 'SAS start time is after or equal to end time',
          details: {
            sasStartTime: collection.sasMeters.sasStartTime,
            sasEndTime: collection.sasMeters.sasEndTime,
          },
        });
      }

      if (
        !collection.sasMeters.sasStartTime ||
        !collection.sasMeters.sasEndTime
      ) {
        collectionIssues.push({
          type: 'SAS_TIMES_MISSING',
          description: 'SAS start or end time is missing',
          details: {
            sasStartTime: collection.sasMeters.sasStartTime,
            sasEndTime: collection.sasMeters.sasEndTime,
          },
        });
      }
    } else {
      collectionIssues.push({
        type: 'SAS_METERS_MISSING',
        description: 'SAS meters data is completely missing',
        details: {},
      });
    }

    // Check Movement Calculation Issues
    if (collection.movement) {
      const movementIssues = validateMovementCalculation(collection);
      if (movementIssues.length > 0) {
        collectionIssues.push({
          type: 'MOVEMENT_CALCULATION_WRONG',
          description: 'Movement calculation does not match expected values',
          details: movementIssues[0]?.details || {},
        });
      }
    }

    // Check PrevIn/PrevOut Issues
    if (
      collection.prevIn === 0 ||
      collection.prevIn === undefined ||
      collection.prevIn === null ||
      collection.prevOut === 0 ||
      collection.prevOut === undefined ||
      collection.prevOut === null
    ) {
      collectionIssues.push({
        type: 'PREV_METERS_ZERO_OR_UNDEFINED',
        description: 'Previous meter values are 0 or undefined',
        details: {
          prevIn: collection.prevIn,
          prevOut: collection.prevOut,
        },
      });
    }

    // Check Machine History Issues
    if (collection.machineId) {
      // CRITICAL: Use findOne with _id instead of findById (repo rule)
      const machine = await Machine.findOne({ _id: collection.machineId }).lean();
      if (machine && (machine as Record<string, unknown>).collectionMetersHistory) {
        const history = (machine as Record<string, unknown>)
          .collectionMetersHistory as Array<{
          metersIn?: number;
          metersOut?: number;
          locationReportId?: string;
          prevMetersIn?: number;
          prevMetersOut?: number;
        }>;

        const historyEntry = history.find(
          entry =>
            entry.metersIn === collection.metersIn &&
            entry.metersOut === collection.metersOut &&
            entry.locationReportId === collection.locationReportId
        );

        if (!historyEntry) {
          collectionIssues.push({
            type: 'HISTORY_ENTRY_MISSING',
            description: 'No corresponding history entry found in machine',
            details: {
              machineId: collection.machineId,
              metersIn: collection.metersIn,
              metersOut: collection.metersOut,
              locationReportId: collection.locationReportId,
            },
          });
        } else if (
          historyEntry.prevMetersIn !== collection.prevIn ||
          historyEntry.prevMetersOut !== collection.prevOut
        ) {
          collectionIssues.push({
            type: 'HISTORY_PREV_METERS_MISMATCH',
            description:
              'History entry prevIn/prevOut does not match collection',
            details: {
              collection: {
                prevIn: collection.prevIn,
                prevOut: collection.prevOut,
              },
              history: {
                prevIn: historyEntry.prevMetersIn,
                prevOut: historyEntry.prevMetersOut,
              },
            },
          });
        }
      }
    }

    if (collectionIssues.length > 0) {
      issues.push({
        collectionId: collection._id.toString(),
        machineId: collection.machineId || '',
        issues: collectionIssues,
      });
      if (collection.machineId) {
        machinesWithIssues.add(collection.machineId);
      }
    }
  }

  return {
    success: true,
    reportId: mostRecentReport.locationReportId,
    reportDetails: {
      locationName: mostRecentReport.locationName || '',
      timestamp: mostRecentReport.timestamp,
      collectorName: mostRecentReport.collectorName || '',
    },
    totalCollections: reportCollections.length,
    collectionsWithIssues: issues.length,
    machinesWithIssues: machinesWithIssues.size,
    issues,
  };
}


