/**
 * Collection Report Service Helper Functions
 *
 * Provides backend helper functions for fetching and enriching collection reports
 * with machine counts, financial metrics, and collector details. It uses optimized
 * aggregation pipelines to batch process data efficiently and includes collector
 * information from the users collection.
 *
 * Features:
 * - Fetches all collection reports with licencee and date range filtering.
 * - Enriches reports with machine counts (collected vs total machines).
 * - Calculates financial metrics from actual collections (gross, SAS gross, variation).
 * - Includes collector details (username, profile information) via lookup.
 * - Uses batch aggregation queries for optimal performance.
 * - Formats numbers with smart decimal handling.
 */

import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';
import { CollectionReportRow } from '@/lib/types/components';
import { PipelineStage } from 'mongoose';

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
 * Backend-only function to fetch all collection reports with machine counts
 * This includes the total machine count per location which requires database access
 */
export async function getAllCollectionReportsWithMachineCounts(
  licenceeId?: string,
  startDate?: Date,
  endDate?: Date,
  page = 1,
  limit = 50,
  scale = 1
): Promise<{ reports: CollectionReportRow[]; total: number }> {
  let rawReports: Array<Record<string, unknown>> = [];

  // Build base match criteria with deletedAt filter
  // Filter out documents with deletedAt >= 2025 (only return deletedAt < 2025 or null/undefined)
  const deletedAtFilter = {
    $or: [
      { deletedAt: null },
      { deletedAt: { $exists: false } },
      { deletedAt: { $lt: new Date('2025-01-01') } },
    ],
  };

  // Build match criteria combining deletedAt filter with date range if provided
  const matchCriteria: Record<string, unknown> = {
    ...deletedAtFilter,
  };

  // Add date range filtering if provided
  if (startDate && endDate) {
    matchCriteria.timestamp = { $gte: startDate, $lte: endDate };
  }

  // Always use aggregation to include collector details lookup
  const aggregationPipeline: PipelineStage[] = [
    {
      $match: matchCriteria,
    },
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'location',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    {
      $unwind: {
        path: '$locationDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    // Lookup collector details from users collection
    {
      $lookup: {
        from: 'users',
        let: { collectorId: '$collector' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$collectorId'] } } },
          { $project: { username: 1, emailAddress: 1, profile: 1 } },
        ],
        as: 'collectorDetails',
      },
    },
    {
      $unwind: {
        path: '$collectorDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    // Lookup licencee to get live includeJackpot flag (not stored on old CollectionReport docs)
    {
      $lookup: {
        from: 'licencees',
        let: { licenceeId: '$locationDetails.rel.licencee' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$licenceeId'] } } },
          { $project: { includeJackpot: 1 } },
        ],
        as: 'licenceeDetails',
      },
    },
    {
      $addFields: {
        licenceeIncludeJackpot: {
          $ifNull: [{ $arrayElemAt: ['$licenceeDetails.includeJackpot', 0] }, false],
        },
      },
    },
    // Apply licencee filter only if provided
    ...(licenceeId
      ? [
        {
          $match: {
            $or: [
              { 'locationDetails.rel.licencee': licenceeId  }, { 'locationDetails.rel.licencee': licenceeId  },
            ],
          },
        },
      ]
      : []),
    { $sort: { timestamp: -1 } },
  ];

  // Get total count separately (efficient — no skip/limit on count query)
  const countPipeline: PipelineStage[] = [
    ...aggregationPipeline,
    { $count: 'total' },
  ];
  const [countResult] = await CollectionReport.aggregate(countPipeline);
  const total: number = countResult?.total ?? 0;

  // Apply pagination inside the pipeline so Meters queries only run for this page
  const skip = (page - 1) * limit;
  aggregationPipeline.push({ $skip: skip }, { $limit: limit });

  rawReports = await CollectionReport.aggregate(aggregationPipeline);

  // PERFORMANCE OPTIMIZATION: Use aggregation to get all data in fewer queries
  // Instead of N+1 queries, we'll use aggregation pipelines to get machine counts and collection data

  // Get all locationReportIds for batch processing
  const locationReportIds = rawReports
    .map(doc => doc.locationReportId)
    .filter(Boolean);

  // Get all unique location IDs for batch machine counting
  const locationIds = [
    ...new Set(
      rawReports
        .map(doc => {
          let locationId = doc.location;
          if (typeof locationId === 'object' && locationId !== null) {
            if ('_id' in locationId)
              locationId = (locationId as { _id: string })._id;
            else if ('id' in locationId)
              locationId = (locationId as { id: string }).id;
          }
          if (
            !locationId &&
            doc.locationDetails &&
            typeof doc.locationDetails === 'object'
          ) {
            const locationDetails = doc.locationDetails as {
              _id?: string;
              id?: string;
            };
            locationId = locationDetails._id || locationDetails.id;
          }
          return locationId;
        })
        .filter(Boolean)
    ),
  ];

  // Batch query 1: Get collection counts and gross values for all reports
  const collectionAggregation = await Collections.aggregate([
    {
      $match: {
        locationReportId: { $in: locationReportIds },
      },
    },
    {
      $group: {
        _id: '$locationReportId',
        collectedMachines: { $sum: 1 },
        calculatedGross: {
          // Use stored movement.gross (denomination-adjusted) to match the detail page.
          // Fall back to raw delta for legacy documents that pre-date the movement.gross field.
          $sum: {
            $ifNull: [
              { $toDouble: '$movement.gross' },
              {
                $subtract: [
                  { $subtract: [{ $toDouble: { $ifNull: ['$metersIn', 0] } }, { $toDouble: { $ifNull: ['$prevIn', 0] } }] },
                  { $subtract: [{ $toDouble: { $ifNull: ['$metersOut', 0] } }, { $toDouble: { $ifNull: ['$prevOut', 0] } }] },
                ],
              },
            ],
          },
        },
        calculatedSasGross: { $sum: { $toDouble: { $ifNull: ['$sasMeters.gross', 0] } } },
        calculatedJackpot: { $sum: { $toDouble: { $ifNull: ['$sasMeters.jackpot', 0] } } },
        // Collect per-machine SAS time windows + stored jackpot so we can query Meters per-report
        meterQueryMeta: {
          $push: {
            machineId: '$machineId',
            startTime: '$sasMeters.sasStartTime',
            endTime: '$sasMeters.sasEndTime',
            storedJackpot: '$sasMeters.jackpot',
          },
        },
      },
    },
  ]);

  // Batch query 2: Get total machine counts for all locations
  const machineCounts = await Machine.aggregate([
    {
      $match: {
        gamingLocation: { $in: locationIds },
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ],
      },
    },
    {
      $group: {
        _id: '$gamingLocation',
        totalMachines: { $sum: 1 },
      },
    },
  ]);

  // Create lookup maps for O(1) access
  const collectionDataMap = new Map(
    collectionAggregation.map(item => [item._id, item])
  );
  const machineCountMap = new Map(
    machineCounts.map(item => [item._id, item.totalMachines])
  );

  // Query Meters per-report to get accurate SAS gross.
  // We CANNOT batch across all reports and group by machine — a machine that appears
  // in multiple reports would have all its time windows summed together, inflating SAS gross.
  // Instead, run one Meters aggregation per report, each scoped to its own machines+windows.
  // This mirrors exactly what the detail page does for a single report.
  const { Meters } = await import('@/app/api/lib/models/meters');
  const reportSasMap = new Map<string, { sasGross: number; jackpot: number }>();

  await Promise.all(
    collectionAggregation.map(async (report) => {
      const meta: Array<{ machineId?: string; startTime?: string; endTime?: string; storedJackpot?: number }> =
        report.meterQueryMeta || [];
      const validMeta = meta.filter(m => m.machineId && m.startTime && m.endTime);

      if (validMeta.length === 0) return;

      const pairs = validMeta.map(m => ({
        machine: m.machineId,
        readAt: { $gte: new Date(m.startTime!), $lte: new Date(m.endTime!) },
      }));

      // Group by machine (mirrors detail page) so we can apply per-machine jackpot fallback.
      // movement.jackpot is 0 in Meters for some machines — fall back to sasMeters.jackpot snapshot.
      const metersByMachine: Array<{ _id: string; totalDrop: number; totalCancelled: number; totalJackpot: number }> =
        await Meters.aggregate([
          { $match: { $or: pairs } },
          {
            $group: {
              _id: '$machine',
              totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
              totalCancelled: { $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] } },
              totalJackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
            },
          },
        ]);

      const meterMap = new Map(metersByMachine.map(m => [m._id, m]));

      let totalSasGross = 0;
      let totalJackpot = 0;

      for (const m of validMeta) {
        const meterData = meterMap.get(m.machineId!);
        if (meterData) {
          totalSasGross += meterData.totalDrop - meterData.totalCancelled;
          // Prefer movement.jackpot if non-zero; otherwise fall back to stored sasMeters.jackpot
          totalJackpot += meterData.totalJackpot !== 0 ? meterData.totalJackpot : (m.storedJackpot || 0);
        } else {
          // No Meters data for this machine — use stored jackpot snapshot
          totalJackpot += m.storedJackpot || 0;
        }
      }

      reportSasMap.set(report._id, { sasGross: totalSasGross, jackpot: totalJackpot });
    })
  );

  // Define type for the enriched report from aggregation
  type EnrichedCollectionReport = {
    _id: string;
    locationReportId?: string;
    locationName?: string;
    location?: string | { _id?: string; id?: string };
    locationDetails?: { _id?: string; id?: string };
    amountCollected?: number;
    partnerProfit?: number;
    currentBalance?: number;
    amountUncollected?: number | string;
    timestamp?: Date | string | { $date: string };
    noSMIBLocation?: boolean;
    isLocalServer?: boolean;
    collectorName?: string;
    collector?: string;
    collectorDetails?: {
      username: string;
      profile?: {
        firstName?: string;
        lastName?: string;
      };
    };
    [key: string]: unknown;
  };

  const enrichedReports = (
    rawReports as unknown as EnrichedCollectionReport[]
  ).map(doc => {
    const locationReportId = (doc.locationReportId as string) || '';
    const locationName = (doc.locationName as string) || '';

    // Get collection data from batch query
    const collectionData = collectionDataMap.get(locationReportId) || {
      collectedMachines: 0,
      calculatedGross: 0,
      calculatedSasGross: 0,
      calculatedJackpot: 0,
      meterQueryMeta: [] as Array<{ machineId?: string; startTime?: string; endTime?: string }>,
    };

    // Get location ID for machine count lookup
    let locationId = doc.location;
    if (typeof locationId === 'object' && locationId !== null) {
      if ('_id' in locationId) locationId = (locationId as { _id: string })._id;
      else if ('id' in locationId)
        locationId = (locationId as { id: string }).id;
    }
    if (
      !locationId &&
      doc.locationDetails &&
      typeof doc.locationDetails === 'object'
    ) {
      const locationDetails = doc.locationDetails as {
        _id?: string;
        id?: string;
      };
      locationId = locationDetails._id || locationDetails.id;
    }

    // Get total machines from batch query
    const totalMachines =
      machineCountMap.get(locationId as string) ||
      collectionData.collectedMachines;

    // Use stored values for financial data (not calculated from meters)
    // Use SAS gross if available, fallback to machine total gross (matches "Total Machine Gross" in UI)
    const storedGross = (doc.totalSasGross as number) || (doc.totalGross as number);
    const calculatedCollected = (doc.amountCollected as number) || 0;
    const calculatedLocationRevenue = (doc.partnerProfit as number) || 0;
    const calculatedBalance = (doc.currentBalance as number) || 0;
    const calculatedUncollected = typeof doc.amountUncollected === 'number' ? doc.amountUncollected as number : null;

    // Priority: calculatedGross (Machine Delta) -> stored totalGross -> totalSasGross from report -> calculatedSasGross
    const displayGross = collectionData.calculatedGross || storedGross || collectionData.calculatedSasGross;

    // SAS gross: prefer live Meters query (per-report, scoped to this report's time windows).
    // Fall back to stored sasMeters.gross if Meters returned nothing for this report.
    // Use live licenceeIncludeJackpot fetched via $lookup — older CollectionReport docs
    // have includeJackpot=false by default and cannot be trusted.
    const reportIncludeJackpot = Boolean(doc.licenceeIncludeJackpot);
    const liveSas = reportSasMap.get(locationReportId);
    const sasGrossFromReport = liveSas ? liveSas.sasGross : (collectionData.calculatedSasGross || 0);
    // Jackpot is computed per-machine in the Meters query above:
    //   - uses movement.jackpot if non-zero, else falls back to stored sasMeters.jackpot
    // This mirrors the detail page's per-machine fallback logic exactly.
    const jackpotFromReport = liveSas ? liveSas.jackpot : (collectionData.calculatedJackpot || 0);

    // Calculate adjusted SAS gross for variation calculation (Drop - NetCancelled - Jackpot if required)
    const adjustedSasGross = reportIncludeJackpot ? sasGrossFromReport - jackpotFromReport : sasGrossFromReport;
    const calculatedVariation = displayGross - adjustedSasGross;

    // Apply reviewer scale to all financial output values before formatting.
    // For non-reviewers scale === 1, so multiplication is a no-op.
    const displayVariation = calculatedVariation * scale;
    const scaledGross = displayGross * scale;
    const scaledCollected = calculatedCollected * scale;
    const scaledLocationRevenue = calculatedLocationRevenue * scale;
    const scaledBalance = calculatedBalance * scale;
    const scaledUncollected = calculatedUncollected !== null ? calculatedUncollected * scale : null;

    // Determine collector value (user ID) and display name
    const collectorUserId = (doc.collector as string) || '';
    const collectorDetails = doc.collectorDetails as
      | {
        username?: string;
        profile?: { firstName?: string; lastName?: string };
        emailAddress?: string;
      }
      | undefined;

    // Compute display name with priority: username → firstName → emailAddress → collectorName
    let collectorDisplayName = '';
    let collectorFullName = ''; // For tooltip (firstName + lastName when both available)

    if (collectorDetails) {
      // Check if we have firstName + lastName for tooltip (regardless of display priority)
      if (
        collectorDetails.profile?.firstName &&
        collectorDetails.profile?.lastName
      ) {
        collectorFullName = `${collectorDetails.profile.firstName} ${collectorDetails.profile.lastName}`;
      }

      // Priority 1: username
      if (collectorDetails.username) {
        collectorDisplayName = collectorDetails.username;
      }
      // Priority 2: firstName only (for main display)
      else if (collectorDetails.profile?.firstName) {
        collectorDisplayName = collectorDetails.profile.firstName;
      }
      // Priority 3: emailAddress
      else if (collectorDetails.emailAddress) {
        collectorDisplayName = collectorDetails.emailAddress;
      }
    }

    // Priority 4: Fallback to legacy collectorName if no user details found
    if (!collectorDisplayName) {
      collectorDisplayName = (doc.collectorName as string) || '';
    }

    // If we have displayName but no fullName set, use displayName as fullName
    if (!collectorFullName && collectorDisplayName) {
      collectorFullName = collectorDisplayName;
    }

    const collectorUserNotFound = !collectorDetails && !!collectorUserId;

    // Prepare tooltip data: firstName, lastName, ID, email
    const collectorTooltipData = collectorDetails
      ? {
        firstName: collectorDetails.profile?.firstName || undefined,
        lastName: collectorDetails.profile?.lastName || undefined,
        id: collectorUserId || undefined,
        email: collectorDetails.emailAddress || undefined,
      }
      : collectorUserId
        ? {
          firstName: undefined,
          lastName: undefined,
          id: collectorUserId,
          email: undefined,
        }
        : undefined;

    const result = {
      _id: doc._id || '',
      locationReportId,
      collector: collectorUserId, // User ID (primary field)
      collectorFullName: collectorDisplayName || undefined, // Display name (username → firstName → email → collectorName)
      collectorFullNameTooltip: collectorFullName || undefined, // Full name for tooltip (firstName + lastName when available)
      collectorTooltipData, // Tooltip data with firstName, lastName, ID, email
      collectorUserNotFound, // Flag to indicate user no longer exists
      location: locationName,
      gross: formatSmartDecimal(scaledGross),
      machines: `${collectionData.collectedMachines || 0}/${totalMachines || 0}`,
      collected: formatSmartDecimal(scaledCollected),
      uncollected:
        scaledUncollected !== null
          ? formatSmartDecimal(scaledUncollected)
          : (doc.amountUncollected as string) || '-',
      variation: formatSmartDecimal(displayVariation),
      balance: formatSmartDecimal(scaledBalance),
      locationRevenue: formatSmartDecimal(scaledLocationRevenue),
      time: (() => {
        const ts = doc.timestamp;
        if (ts) {
          const date =
            typeof ts === 'string' || ts instanceof Date
              ? new Date(ts)
              : typeof ts === 'object' &&
                '$date' in ts &&
                typeof ts.$date === 'string'
                ? new Date(ts.$date)
                : null;

          if (date) {
            // Format in local time (not UTC)
            return date.toLocaleString(undefined, {
              year: 'numeric',
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            });
          }
        }
        return '-';
      })(),
      noSMIBLocation: (doc.noSMIBLocation as boolean) || false,
      isLocalServer: (doc.isLocalServer as boolean) || false,
    };

    return result;
  });

  return { reports: enrichedReports, total };
}

