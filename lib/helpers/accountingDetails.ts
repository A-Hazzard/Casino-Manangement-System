import { AcceptedBill } from '@/app/api/lib/models/acceptedBills';
import { MachineEvent } from '@/app/api/lib/models/machineEvents';
import { Machine } from '@/app/api/lib/models/machines';
import type {
  AcceptedBill as AcceptedBillType,
  MachineEvent as MachineEventType,
} from '@/lib/types/api';
import type { GamingMachine as _MachineType } from '@/shared/types/entities';
import { CollectionReportData } from '@/lib/types/api';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Meters } from '@/app/api/lib/models/meters';

/**
 * Calculate SAS gross by querying meters directly for a specific time period
 * This matches the calculation method used in cabinet details page
 */
async function calculateSasGrossFromMeters(
  machineId: string,
  sasStartTime: Date,
  sasEndTime: Date
): Promise<number> {
  try {
    const meters = await Meters.find({
      machine: machineId,
      readAt: { $gte: sasStartTime, $lte: sasEndTime },
    })
      .sort({ readAt: 1 })
      .lean();

    if (meters.length === 0) {
      // No meters found
      return 0;
    }

    // Sum all movement fields (daily deltas) within the SAS time period
    // This is the correct approach when machines only have movement data, not cumulative data
    const totalDrop = meters.reduce(
      (sum, meter) => sum + (meter.movement?.drop || 0),
      0
    );
    const totalCancelled = meters.reduce(
      (sum, meter) => sum + (meter.movement?.totalCancelledCredits || 0),
      0
    );

    const sasGross = totalDrop - totalCancelled;

    console.warn(`🔍 SAS Gross calculation for machine ${machineId}:`);
    console.warn(
      `  Time period: ${sasStartTime.toISOString()} to ${sasEndTime.toISOString()}`
    );
    console.warn(`  Meters found: ${meters.length}`);
    console.warn(`  Total drop (sum of movement.drop): ${totalDrop}`);
    console.warn(
      `  Total cancelled (sum of movement.totalCancelledCredits): ${totalCancelled}`
    );
    console.warn(`  SAS Gross: ${sasGross}`);

    return sasGross;
  } catch (error) {
    console.error('Error calculating SAS gross from meters:', error);
    return 0;
  }
}

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
import { Collections } from '@/app/api/lib/models/collections';
import type { GamingMachine } from '@/shared/types/entities';
type CollectionMetersHistoryEntry = NonNullable<
  GamingMachine['collectionMetersHistory']
>[0];
import { getDatesForTimePeriod } from '../utils/dates';
import type { TimePeriod } from '@/shared/types/common';

/**
 * Fetches accepted bills for a given machine ID.
 *
 * @param machineId - The machine ID to filter by.
 * @param timePeriod - Optional time period filter (e.g., "Today", "Yesterday", "7d", "30d").
 * @returns Promise resolving to an array of AcceptedBillType.
 */
export async function getAcceptedBillsByMachine(
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
export async function getMachineEventsByMachine(
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
export async function getCollectionMetersHistoryByMachine(
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
                        { $ne: [{ $trim: { input: { $ifNull: ['$$machine.serialNumber', ''] } } }, ''] }
                      ]
                    },
                    then: '$$machine.serialNumber',
                    else: {
                      $cond: {
                        // Check if custom.name is not null and not empty/whitespace
                        if: {
                          $and: [
                            { $ne: ['$$machine.custom.name', null] },
                            { $ne: [{ $trim: { input: { $ifNull: ['$$machine.custom.name', ''] } } }, ''] }
                          ]
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
  const totalSasGross = collections.reduce(
    (sum, col) => sum + (col.sasMeters?.gross || 0),
    0
  );
  const totalVariation = totalMetersGross - totalSasGross;

  // Get total number of machines for this location
  let totalMachinesForLocation = collections.length; // Default fallback
  try {
    if (report.location) {
      const totalMachinesCount = await Machine.countDocuments({
        gamingLocation: report.location,
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
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

  // Calculate SAS-specific metrics from sasMeters data
  const sasDropTotal = collections.reduce(
    (sum, col) => sum + (col.sasMeters?.drop || 0),
    0
  );
  const sasCancelledTotal = collections.reduce(
    (sum, col) => sum + (col.sasMeters?.totalCancelledCredits || 0),
    0
  );
  const sasGrossTotal = collections.reduce(
    (sum, col) => sum + (col.sasMeters?.gross || 0),
    0
  );

  // Map SAS metrics from actual collections
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
    machineMetrics: await Promise.all(
      collections.map(async (collection, idx: number) => {
        // Get machine identifier with priority: serialNumber -> machineName -> machineCustomName -> machineId
        // Use a helper function to check for valid non-empty strings
        const isValidString = (
          str: string | undefined | null
        ): string | null => {
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
        const cancelled =
          (collection.metersOut || 0) - (collection.prevOut || 0);
        const meterGross = collection.movement?.gross || 0;

        // Calculate SAS gross by querying meters directly for the SAS time period
        let sasGross = 0;
        if (
          collection.sasMeters?.sasStartTime &&
          collection.sasMeters?.sasEndTime
        ) {
          sasGross = await calculateSasGrossFromMeters(
            collection.machineId,
            new Date(collection.sasMeters.sasStartTime),
            new Date(collection.sasMeters.sasEndTime)
          );
        }

        // Check if SAS data exists - if not, show "No SAS Data"
        // Note: sasMeters.gross can be 0 (valid value), so we only check for undefined/null
        const variation =
          !collection.sasMeters ||
          collection.sasMeters.sasStartTime === undefined ||
          collection.sasMeters.sasEndTime === undefined
            ? 'No SAS Data'
            : meterGross - sasGross;

        return {
          id: String(idx + 1),
          machineId: machineDisplayName,
          actualMachineId: collection.machineId, // The actual machine ID for navigation
          dropCancelled: `${drop} / ${cancelled}`,
          metersGross: meterGross,
          sasGross: formatSmartDecimal(sasGross),
          variation:
            typeof variation === 'string'
              ? variation
              : formatSmartDecimal(variation),
          sasStartTime: collection.sasMeters?.sasStartTime || '-',
          sasEndTime: collection.sasMeters?.sasEndTime || '-',
          hasIssue: false,
        };
      })
    ),
    locationMetrics,
    sasMetrics,
  };
}
