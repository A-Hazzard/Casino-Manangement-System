import { CollectionReport } from "@/app/api/lib/models/collectionReport";
import { Collections } from "@/app/api/lib/models/collections";
import { Machine } from "@/app/api/lib/models/machines";
import { CollectionReportRow } from "@/lib/types/componentProps";
import { PipelineStage } from "mongoose";

/**
 * Formats a number with smart decimal handling
 */
const formatSmartDecimal = (value: number): string => {
  if (isNaN(value)) return "0";
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
  _timePeriod?: string,
  _customStartDate?: Date,
  _customEndDate?: Date
): Promise<CollectionReportRow[]> {
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

  if (!licenceeId) {
    // No licencee filter, just apply date filter and deletedAt filter
    rawReports = await CollectionReport.find(matchCriteria)
      .sort({ timestamp: -1 })
      .lean();
  } else {
    // Apply licencee filter with aggregation, plus date filter and deletedAt filter
    const aggregationPipeline: PipelineStage[] = [
      {
        $match: deletedAtFilter,
      },
      {
        $lookup: {
          from: "gaminglocations",
          localField: "location",
          foreignField: "_id",
          as: "locationDetails",
        },
      },
      { $unwind: "$locationDetails" },
      {
        $match: {
          "locationDetails.rel.licencee": licenceeId,
          ...(startDate && endDate ? { timestamp: { $gte: startDate, $lte: endDate } } : {}),
        },
      },
      { $sort: { timestamp: -1 } },
    ];
    
    rawReports = await CollectionReport.aggregate(aggregationPipeline);
  }

  // PERFORMANCE OPTIMIZATION: Use aggregation to get all data in fewer queries
  // Instead of N+1 queries, we'll use aggregation pipelines to get machine counts and collection data
  
  // Get all locationReportIds for batch processing
  const locationReportIds = rawReports.map(doc => doc.locationReportId).filter(Boolean);
  
  // Get all unique location IDs for batch machine counting
  const locationIds = [...new Set(rawReports.map(doc => {
    let locationId = doc.location;
    if (typeof locationId === "object" && locationId !== null) {
      if ("_id" in locationId) locationId = (locationId as { _id: string })._id;
      else if ("id" in locationId) locationId = (locationId as { id: string }).id;
    }
    if (!locationId && doc.locationDetails && typeof doc.locationDetails === "object") {
      const locationDetails = doc.locationDetails as { _id?: string; id?: string };
      locationId = locationDetails._id || locationDetails.id;
    }
    return locationId;
  }).filter(Boolean))];

  // Batch query 1: Get collection counts and gross values for all reports
  const collectionAggregation = await Collections.aggregate([
    {
      $match: {
        locationReportId: { $in: locationReportIds }
      }
    },
    {
      $group: {
        _id: "$locationReportId",
        collectedMachines: { $sum: 1 },
        calculatedGross: { $sum: "$movement.gross" },
        calculatedSasGross: { $sum: "$sasMeters.gross" }
      }
    }
  ]);

  // Batch query 2: Get total machine counts for all locations
  const machineCounts = await Machine.aggregate([
    {
      $match: {
        gamingLocation: { $in: locationIds },
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date("2020-01-01") } }
        ]
      }
    },
    {
      $group: {
        _id: "$gamingLocation",
        totalMachines: { $sum: 1 }
      }
    }
  ]);

  // Create lookup maps for O(1) access
  const collectionDataMap = new Map(
    collectionAggregation.map(item => [item._id, item])
  );
  const machineCountMap = new Map(
    machineCounts.map(item => [item._id, item.totalMachines])
  );

  // Map to CollectionReportRow with optimized data access
  const enrichedReports = rawReports.map((doc: Record<string, unknown>) => {
    const locationReportId = (doc.locationReportId as string) || "";
    const locationName = (doc.locationName as string) || "";

    // Get collection data from batch query
    const collectionData = collectionDataMap.get(locationReportId) || {
      collectedMachines: 0,
      calculatedGross: 0,
      calculatedSasGross: 0
    };

    // Get location ID for machine count lookup
    let locationId = doc.location;
    if (typeof locationId === "object" && locationId !== null) {
      if ("_id" in locationId) locationId = (locationId as { _id: string })._id;
      else if ("id" in locationId) locationId = (locationId as { id: string }).id;
    }
    if (!locationId && doc.locationDetails && typeof doc.locationDetails === "object") {
      const locationDetails = doc.locationDetails as { _id?: string; id?: string };
      locationId = locationDetails._id || locationDetails.id;
    }

    // Get total machines from batch query
    const totalMachines = machineCountMap.get(locationId as string) || collectionData.collectedMachines;

    // Calculate variation (metersGross - sasGross)
    const calculatedVariation = collectionData.calculatedGross - collectionData.calculatedSasGross;

    // Use stored values for financial data (not calculated from meters)
    const calculatedCollected = (doc.amountCollected as number) || 0;
    const calculatedLocationRevenue = (doc.partnerProfit as number) || 0;
    const calculatedBalance = (doc.currentBalance as number) || 0;

    const result = {
      _id: (doc._id as string) || "",
      locationReportId,
      collector: (doc.collectorName as string) || "",
      location: locationName,
      gross: formatSmartDecimal(collectionData.calculatedGross),
      machines: `${collectionData.collectedMachines || 0}/${totalMachines || 0}`,
      collected: formatSmartDecimal(calculatedCollected),
      uncollected:
        typeof doc.amountUncollected === "number"
          ? formatSmartDecimal(doc.amountUncollected as number)
          : (doc.amountUncollected as string) || "-",
      variation: formatSmartDecimal(calculatedVariation),
      balance: formatSmartDecimal(calculatedBalance),
      locationRevenue: formatSmartDecimal(calculatedLocationRevenue),
        time: (() => {
          const ts = doc.timestamp;
          if (ts) {
            const date =
              typeof ts === "string" || ts instanceof Date
                ? new Date(ts)
                : typeof ts === "object" &&
                  "$date" in ts &&
                  typeof ts.$date === "string"
                ? new Date(ts.$date)
                : null;

            if (date) {
              // Format in local time (not UTC)
              return date.toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              });
            }
          }
          return "-";
        })(),
        noSMIBLocation: (doc.noSMIBLocation as boolean) || false,
        isLocalServer: (doc.isLocalServer as boolean) || false,
      };

      // Debug logging for the specific report we're seeing in the UI
      // if (locationReportId === "fb04dd8f-943d-423f-8059-7bcbccc6d459") {
      //   console.log("🔍 DEBUG: Raw document data for report fb04dd8f-943d-423f-8059-7bcbccc6d459:", doc);
      //   console.log("🔍 DEBUG: Processed result:", result);
      //   console.log("🔍 DEBUG: totalGross value:", doc.totalGross);
      //   console.log("🔍 DEBUG: amountCollected value:", doc.amountCollected);
      //   console.log("🔍 DEBUG: partnerProfit value:", doc.partnerProfit);
      // }

    return result;
  });

  return enrichedReports;
}
