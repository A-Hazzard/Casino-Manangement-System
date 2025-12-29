import type {
  AcceptedBill as AcceptedBillType,
  MachineEvent as MachineEventType,
} from '@/lib/types/api';
import { CollectionReportData } from '@/lib/types/api';
import type { CollectionMetersHistoryEntry } from '@/shared/types';
import type { TimePeriod } from '@/shared/types/common';
import { AcceptedBill } from '../models/acceptedBills';
import { CollectionReport } from '../models/collectionReport';
import { Collections } from '../models/collections';
import { MachineEvent } from '../models/machineEvents';
import { Machine } from '../models/machines';
import { getDatesForTimePeriod } from '../utils/dates';

/**
 * Formats a number with smart decimal handling
 */
const formatSmartDecimal = (value: number): string => {
  if (isNaN(value)) return '0';
  const hasDecimals = value % 1 !== 0;
  const decimalPart = value % 1;
  const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;
  return value.toFixed(hasSignificantDecimals ? 2 : 0);
};

/**
 * Fetches accepted bills for a given machine ID.
 *
 * @param machineId - The machine ID to filter by.
 * @param timePeriod - Optional time period filter (e.g., "Today", "Yesterday", "7d", "30d").
 * @returns Promise resolving to an array of AcceptedBillType.
 */
async function getAcceptedBillsByMachine(
  machineId: string,
  timePeriod?: string | null
): Promise<AcceptedBillType[]> {
  try {
    const query: Record<string, unknown> = { machine: machineId };

    // Apply date filtering if timePeriod is provided
    if (timePeriod && timePeriod !== 'All Time') {
      const dateRange = getDatesForTimePeriod(timePeriod as TimePeriod);
      if (dateRange.startDate && dateRange.endDate) {
        query.createdAt = {
          $gte: dateRange.startDate,
          $lte: dateRange.endDate,
        };
      }
    }

    const result = (await AcceptedBill.find(
      query
    ).lean()) as AcceptedBillType[];

    return result;
  } catch (error) {
    console.error(
      '[API] getAcceptedBillsByMachine: error fetching data',
      error
    );
    return [];
  }
}

/**
 * Fetches machine events for a given machine ID.
 *
 * @param machineId - The machine ID to filter by.
 * @param timePeriod - Optional time period filter (e.g., "Today", "Yesterday", "7d", "30d").
 * @returns Promise resolving to an array of MachineEventType.
 */
async function getMachineEventsByMachine(
  machineId: string,
  timePeriod?: string | null
): Promise<MachineEventType[]> {
  try {
    // Check if MachineEvent model is properly initialized
    if (!MachineEvent || typeof MachineEvent.find !== 'function') {
      console.error(
        '[API] getMachineEventsByMachine: MachineEvent model is not properly initialized'
      );
      // Return empty array instead of mock data
      return [];
    }

    const query: Record<string, unknown> = { machine: machineId };

    // Apply date filtering if timePeriod is provided
    if (timePeriod && timePeriod !== 'All Time') {
      const dateRange = getDatesForTimePeriod(timePeriod as TimePeriod);
      if (dateRange.startDate && dateRange.endDate) {
        query.timestamp = {
          $gte: dateRange.startDate,
          $lte: dateRange.endDate,
        };
      }
    }

    const result = (await MachineEvent.find(
      query
    ).lean()) as MachineEventType[];

    // If no results, return empty array
    if (!result || result.length === 0) {
      return [];
    }

    return result;
  } catch (error) {
    console.error(
      '[API] getMachineEventsByMachine: error fetching data',
      error
    );
    return [];
  }
}

/**
 * Fetches collection meters history for a given machine ID.
 *
 * @param machineId - The machine ID to filter by.
 * @param timePeriod - Optional time period filter (e.g., "Today", "Yesterday", "7d", "30d").
 * @returns Promise resolving to an array of CollectionMetersHistoryEntry.
 */
async function getCollectionMetersHistoryByMachine(
  machineId: string,
  timePeriod?: string | null
): Promise<CollectionMetersHistoryEntry[]> {
  try {
    // Use findOne with specific projection for collectionMetersHistory
    const query = { _id: machineId };
    const projection = { collectionMetersHistory: 1 };

    const machine = (await Machine.findOne(query, projection).lean()) as Record<
      string,
      unknown
    >;

    let result = (machine?.collectionMetersHistory ||
      []) as CollectionMetersHistoryEntry[];

    // Apply date filtering if timePeriod is provided
    if (timePeriod && timePeriod !== 'All Time') {
      const dateRange = getDatesForTimePeriod(timePeriod as TimePeriod);
      if (dateRange.startDate && dateRange.endDate) {
        result = result.filter(entry => {
          const entryDate = new Date(entry.timestamp);
          return (
            entryDate >= dateRange.startDate! && entryDate <= dateRange.endDate!
          );
        });
      }
    }

    return result;
  } catch (error) {
    console.error(
      '[API] getCollectionMetersHistoryByMachine: error fetching data',
      error
    );
    return [];
  }
}

/**
 * Fetches all accounting details for a given machine ID.
 *
 * @param machineId - The machine ID to filter by.
 * @param timePeriod - Optional time period filter (e.g., "Today", "Yesterday", "7d", "30d").
 * @returns Promise resolving to an object with acceptedBills, machineEvents, collectionMetersHistory, and machine.
 */
export async function getAccountingDetails(
  machineId: string,
  timePeriod?: string | null
) {
  const [acceptedBills, machineEvents, collectionMetersHistory, machine] =
    await Promise.all([
      getAcceptedBillsByMachine(machineId, timePeriod),
      getMachineEventsByMachine(machineId, timePeriod),
      getCollectionMetersHistoryByMachine(machineId, timePeriod),
      Machine.findOne({ _id: machineId }).lean(),
    ]);

  return { acceptedBills, machineEvents, collectionMetersHistory, machine };
}

/**
 * Fetches and formats a collection report by its reportId.
 * @param reportId - The unique report ID to fetch.
 * @returns Promise resolving to a CollectionReportData object or null if not found.
 */
export async function getCollectionReportById(
  reportId: string
): Promise<CollectionReportData | null> {
  const report = await CollectionReport.findOne({
    locationReportId: reportId,
  }).lean();
  if (!report) return null;

  // Fetch actual collections for this report with machine details resolved
  const collections = await Collections.aggregate([
    {
      $match: {
        locationReportId: reportId,
      },
    },
    {
      $lookup: {
        from: 'machines',
        localField: 'sasMeters.machine',
        foreignField: '_id',
        as: 'machineDetails',
      },
    },
    {
      $addFields: {
        'sasMeters.machine': {
          $let: {
            vars: {
              machine: { $arrayElemAt: ['$machineDetails', 0] },
            },
            in: {
              $cond: {
                if: { $ne: ['$$machine', null] },
                then: {
                  $cond: {
                    // Check if serialNumber is not null and not empty/whitespace
                    if: {
                      $and: [
                        { $ne: ['$$machine.serialNumber', null] },
                        {
                          $ne: [
                            {
                              $trim: {
                                input: {
                                  $ifNull: ['$$machine.serialNumber', ''],
                                },
                              },
                            },
                            '',
                          ],
                        },
                      ],
                    },
                    then: '$$machine.serialNumber',
                    else: {
                      $cond: {
                        // Check if custom.name is not null and not empty/whitespace
                        if: {
                          $and: [
                            { $ne: ['$$machine.custom.name', null] },
                            {
                              $ne: [
                                {
                                  $trim: {
                                    input: {
                                      $ifNull: ['$$machine.custom.name', ''],
                                    },
                                  },
                                },
                                '',
                              ],
                            },
                          ],
                        },
                        then: '$$machine.custom.name',
                        else: {
                          $cond: {
                            if: { $ne: ['$$machine.machineId', null] },
                            then: '$$machine.machineId',
                            else: '$$machine._id',
                          },
                        },
                      },
                    },
                  },
                },
                else: {
                  // Fallback to collection fields if no machine found
                  $cond: {
                    if: { $ne: ['$machineCustomName', null] },
                    then: '$machineCustomName',
                    else: {
                      $cond: {
                        if: { $ne: ['$serialNumber', null] },
                        then: '$serialNumber',
                        else: {
                          $cond: {
                            if: { $ne: ['$machineName', null] },
                            then: '$machineName',
                            else: {
                              $cond: {
                                if: { $ne: ['$machineId', null] },
                                then: '$machineId',
                                else: '$sasMeters.machine',
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      $project: {
        machineDetails: 0, // Remove the temporary machineDetails field
      },
    },
  ]);

  // 🚀 OPTIMIZATION: Batch fetch ALL meter data in ONE query instead of N queries
  // This must be done BEFORE calculating location metrics so we can use it for SAS gross
  const { Meters } = await import('@/app/api/lib/models/meters');

  // Collect all machine IDs and their SAS time ranges
  const meterQueries = collections
    .filter(
      c => c.sasMeters?.sasStartTime && c.sasMeters?.sasEndTime && c.machineId
    )
    .map(c => ({
      machineId: c.machineId,
      startTime: new Date(c.sasMeters!.sasStartTime!),
      endTime: new Date(c.sasMeters!.sasEndTime!),
    }));

  // Build a single aggregation to get all meter data grouped by machine
  const allMeterData: Array<{
    _id: string;
    totalDrop: number;
    totalCancelled: number;
    meterCount: number;
  }> = [];
  if (meterQueries.length > 0) {
    const cursor = Meters.aggregate([
      {
        $match: {
          $or: meterQueries.map(q => ({
            machine: q.machineId,
            readAt: { $gte: q.startTime, $lte: q.endTime },
          })),
        },
      },
      {
        $group: {
          _id: '$machine',
          totalDrop: { $sum: '$movement.drop' },
          totalCancelled: { $sum: '$movement.totalCancelledCredits' },
          meterCount: { $sum: 1 },
        },
      },
    ]).cursor({ batchSize: 1000 });

    for await (const doc of cursor) {
      allMeterData.push(doc);
    }
  }

  // Create lookup map for O(1) access
  const meterDataMap = new Map(
    allMeterData.map(m => [
      m._id,
      { drop: m.totalDrop, cancelled: m.totalCancelled, count: m.meterCount },
    ])
  );

  // Calculate location metrics from actual collections using the same logic as individual machines
  const totalDrop = collections.reduce(
    (sum, col) => sum + ((col.metersIn || 0) - (col.prevIn || 0)),
    0
  );
  const totalCancelled = collections.reduce(
    (sum, col) => sum + ((col.metersOut || 0) - (col.prevOut || 0)),
    0
  );

  const totalMetersGross = collections.reduce(
    (sum, col) => sum + (col.movement?.gross || 0),
    0
  );

  // Calculate total SAS gross from meter data map (same method as machine metrics)
  // This ensures consistency between machine metrics and location metrics
  let totalSasGross = 0;
  for (const collection of collections) {
    if (
      collection.machineId &&
      collection.sasMeters?.sasStartTime &&
      collection.sasMeters?.sasEndTime
    ) {
      const meterData = meterDataMap.get(collection.machineId);
      if (meterData) {
        totalSasGross += meterData.drop - meterData.cancelled;
      }
    }
  }

  const totalVariation = totalMetersGross - totalSasGross;

  // Get total number of machines for this location
  let totalMachinesForLocation = collections.length; // Default fallback
  try {
    if (report.location) {
      const totalMachinesCount = await Machine.countDocuments({
        gamingLocation: report.location,
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ],
      });
      totalMachinesForLocation = totalMachinesCount;
    }
  } catch (error) {
    console.warn('Could not count total machines for location:', error);
    // Keep the fallback value
  }

  // Map location metrics (use calculated values for core metrics, keep report values for financial fields)
  const locationMetrics = {
    droppedCancelled: `${totalDrop}/${totalCancelled}`,
    metersGross: totalMetersGross,
    variation: totalVariation,
    sasGross: totalSasGross,
    locationRevenue: report.partnerProfit || 0,
    amountUncollected: report.amountUncollected || 0,
    amountToCollect: report.amountToCollect || 0,
    machinesNumber: `${collections.length}/${totalMachinesForLocation}`,
    collectedAmount: report.amountCollected || 0,
    reasonForShortage: report.reasonShortagePayment || '-',
    taxes: report.taxes || 0,
    advance: report.advance || 0,
    previousBalanceOwed: report.previousBalance || 0,
    balanceCorrection: report.balanceCorrection || 0,
    currentBalanceOwed: report.currentBalance || 0,
    correctionReason: report.balanceCorrectionReas || '-',
    variance: report.variance || '-',
    varianceReason: report.varianceReason || '-',
  };

  // Calculate SAS-specific metrics from meter data map (same method as machine metrics)
  // This ensures consistency and uses the actual calculated values from meters
  let sasDropTotal = 0;
  let sasCancelledTotal = 0;
  let sasGrossTotal = 0;

  for (const collection of collections) {
    if (
      collection.machineId &&
      collection.sasMeters?.sasStartTime &&
      collection.sasMeters?.sasEndTime
    ) {
      const meterData = meterDataMap.get(collection.machineId);
      if (meterData) {
        sasDropTotal += meterData.drop;
        sasCancelledTotal += meterData.cancelled;
        sasGrossTotal += meterData.drop - meterData.cancelled;
      }
    }
  }

  // Map SAS metrics from meter data map (calculated above)
  const sasMetrics = {
    dropped: sasDropTotal,
    cancelled: sasCancelledTotal,
    gross: sasGrossTotal,
  };

  return {
    reportId: report.locationReportId,
    locationName: report.locationName,
    collectionDate: report.timestamp
      ? new Date(report.timestamp).toISOString()
      : '-',
    machineMetrics: collections.map((collection, idx: number) => {
      // Get machine identifier with priority: serialNumber -> machineName -> machineCustomName -> machineId
      // Use a helper function to check for valid non-empty strings
      const isValidString = (str: string | undefined | null): string | null => {
        return str && typeof str === 'string' && str.trim() !== ''
          ? str.trim()
          : null;
      };

      const machineDisplayName =
        isValidString(collection.serialNumber) ||
        isValidString(collection.machineName) ||
        isValidString(collection.machineCustomName) ||
        isValidString(collection.machineId) ||
        isValidString(collection.sasMeters?.machine) ||
        `Machine ${idx + 1}`;

      // Calculate drop/cancelled from the difference between current and previous meters
      const drop = (collection.metersIn || 0) - (collection.prevIn || 0);
      const cancelled = (collection.metersOut || 0) - (collection.prevOut || 0);
      const meterGross = collection.movement?.gross || 0;

      // 🚀 OPTIMIZED: Use pre-fetched meter data from batch query (no individual queries!)
      let sasGross = 0;
      if (
        collection.machineId &&
        collection.sasMeters?.sasStartTime &&
        collection.sasMeters?.sasEndTime
      ) {
        const meterData = meterDataMap.get(collection.machineId);
        if (meterData) {
          sasGross = meterData.drop - meterData.cancelled;
        }
      }
      // Check if SAS data exists - if not, show "No SAS Data"
      // Note: sasMeters.gross can be 0 (valid value), so we only check for undefined/null
      const variation =
        !collection.sasMeters ||
        collection.sasMeters.gross === undefined ||
        collection.sasMeters.gross === null
          ? 'No SAS Data'
          : meterGross - sasGross;

      return {
        id: String(idx + 1),
        machineId: machineDisplayName,
        actualMachineId: collection.machineId, // The actual machine ID for navigation
        dropCancelled: `${formatSmartDecimal(drop)} / ${formatSmartDecimal(
          cancelled
        )}`,
        metersGross: meterGross,
        sasGross: formatSmartDecimal(sasGross),
        variation:
          typeof variation === 'string'
            ? variation
            : formatSmartDecimal(variation),
        sasStartTime: collection.sasMeters?.sasStartTime || null,
        sasEndTime: collection.sasMeters?.sasEndTime || null,
        hasIssue: false,
        ramClear: collection.ramClear || false,
      };
    }),
    locationMetrics,
    sasMetrics,
  };
}
