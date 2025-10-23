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
  endDate?: Date
): Promise<CollectionReportRow[]> {
  console.warn(`[COLLECTION REPORTS BACKEND] Function called with:`);
  console.warn(`  - licenceeId: ${licenceeId}`);
  console.warn(`  - startDate: ${startDate?.toISOString()}`);
  console.warn(`  - endDate: ${endDate?.toISOString()}`);
  
  let rawReports;

  // Build base match criteria
  const matchCriteria: Record<string, unknown> = {};

  // Add date range filtering if provided
  if (startDate && endDate) {
    matchCriteria.timestamp = { $gte: startDate, $lte: endDate };
  }

  if (!licenceeId) {
    // No licencee filter, just apply date filter if present
    if (Object.keys(matchCriteria).length > 0) {
      rawReports = await CollectionReport.find(matchCriteria)
        .sort({ timestamp: -1 })
        .lean();
    } else {
      rawReports = await CollectionReport.find({})
        .sort({ timestamp: -1 })
        .lean();
    }
  } else {
    // Apply licencee filter with aggregation, plus date filter if present
    const aggregationPipeline: PipelineStage[] = [
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
          ...matchCriteria,
        },
      },
      { $sort: { timestamp: -1 } },
    ];
    
    console.warn(`[COLLECTION REPORTS] Running aggregation with licensee: ${licenceeId}`);
    console.warn(`[COLLECTION REPORTS] Match criteria:`, JSON.stringify(matchCriteria, null, 2));
    console.warn(`[COLLECTION REPORTS] Aggregation pipeline:`, JSON.stringify(aggregationPipeline, null, 2));
    
    try {
      rawReports = await CollectionReport.aggregate(aggregationPipeline);
      console.warn(`[COLLECTION REPORTS] Raw reports found: ${rawReports.length}`);
    } catch (error) {
      console.error(`[COLLECTION REPORTS] Error in aggregation:`, error);
      throw error;
    }
  }

  console.warn(`[COLLECTION REPORTS] Starting enrichment process for ${rawReports.length} raw reports`);
  
  // Map to CollectionReportRow and enrich with machine counts
  let enrichedReports;
  try {
    enrichedReports = await Promise.all(
      rawReports.map(async (doc: Record<string, unknown>) => {
      const locationReportId = (doc.locationReportId as string) || "";
      const locationName = (doc.locationName as string) || "";

      console.warn(`[COLLECTION REPORTS] Processing report: ${locationName} (${locationReportId})`);

      // Fetch machine count from collections and total machines per location
      let collectedMachines = 0;
      let totalMachines = 0;
      try {
        // Try to get collections by locationReportId first
        const collectionsByReportId = await Collections.find({
          locationReportId: locationReportId,
        }).lean();
        collectedMachines = collectionsByReportId.length;

        // If no collections found by locationReportId, try by location name
        if (collectedMachines === 0 && locationName) {
          const collectionsByLocation = await Collections.find({
            location: locationName,
          }).lean();
          collectedMachines = collectionsByLocation.length;
        }

        // Get total machines for the location
        // First try to get location ID from the document
        let locationId = doc.location;

        // Handle different location ID formats
        if (typeof locationId === "object" && locationId !== null) {
          if ("_id" in locationId) {
            locationId = (locationId as { _id: string })._id;
          } else if ("id" in locationId) {
            locationId = (locationId as { id: string }).id;
          }
        }

        // If we still don't have a location ID, try to get it from locationDetails (from aggregation)
        if (
          !locationId &&
          doc.locationDetails &&
          typeof doc.locationDetails === "object"
        ) {
          const locationDetails = doc.locationDetails as {
            _id?: string;
            id?: string;
          };
          locationId = locationDetails._id || locationDetails.id;
        }

        // If we have a location ID, count total machines for that location
        if (locationId && typeof locationId === "string") {
          try {
            const totalMachinesCount = await Machine.countDocuments({
              gamingLocation: locationId,
              $or: [
                { deletedAt: null },
                { deletedAt: { $lt: new Date("2020-01-01") } },
              ],
            });
            totalMachines = totalMachinesCount;
          } catch (machineCountError) {
            console.warn(
              `⚠️ Could not count machines for location ${locationId}:`,
              machineCountError
            );
            totalMachines = collectedMachines;
          }
        } else {
          // Fallback: if no location ID, just show collected machines
          totalMachines = collectedMachines;
        }
      } catch (error) {
        console.warn(
          `⚠️ Could not fetch machine count for report ${locationReportId}:`,
          error
        );
        // Fallback to the original machinesCollected field
        collectedMachines =
          parseInt((doc.machinesCollected as string) || "0") || 0;
        totalMachines = collectedMachines;
      }

      // Calculate actual values from collections (same logic as details page)
      let calculatedGross = 0;
      let calculatedCollected = 0;
      let calculatedLocationRevenue = 0;
      let calculatedVariation: number | string = 0;
      let calculatedBalance = 0;

      try {
        // Fetch actual collections for this report
        const collections = await Collections.find({
          locationReportId: locationReportId,
        }).lean();

        // Calculate gross from actual collections
        calculatedGross = collections.reduce(
          (sum, col) => sum + (col.movement?.gross || 0),
          0
        );

        // Calculate SAS gross by querying meters directly for each collection's SAS time period
        // Use the same calculation method as calculateSasGrossFromMeters: sum all movement fields
        let calculatedSasGross = 0;
        for (const col of collections) {
          if (col.sasMeters?.sasStartTime && col.sasMeters?.sasEndTime) {
            const { Meters } = await import("@/app/api/lib/models/meters");

            const meters = await Meters.find({
              machine: col.machineId,
              readAt: {
                $gte: new Date(col.sasMeters.sasStartTime),
                $lte: new Date(col.sasMeters.sasEndTime),
              },
            })
              .sort({ readAt: 1 })
              .lean();

            // Sum all movement fields (daily deltas) within the SAS time period
            // This is the correct approach when machines only have movement data, not cumulative data
            const totalDrop = meters.reduce((sum, meter) => sum + (meter.movement?.drop || 0), 0);
            const totalCancelled = meters.reduce((sum, meter) => sum + (meter.movement?.totalCancelledCredits || 0), 0);
            calculatedSasGross += totalDrop - totalCancelled;
          }
        }

        // Calculate variation (same as details page: metersGross - sasGross)
        // Check if any collections have SAS data - if none do, show "No SAS Data"
        // Note: sasMeters.gross can be 0 (valid value), so we only check for undefined/null
        const hasSasData = collections.some(
          (col) =>
            col.sasMeters &&
            col.sasMeters.gross !== undefined &&
            col.sasMeters.gross !== null
        );
        calculatedVariation = hasSasData
          ? calculatedGross - calculatedSasGross
          : "No SAS Data";

        // Use stored values for collected, location revenue, and balance (these are financial, not calculated from meters)
        calculatedCollected = (doc.amountCollected as number) || 0;
        calculatedLocationRevenue = (doc.partnerProfit as number) || 0;
        calculatedBalance = (doc.currentBalance as number) || 0;
      } catch (error) {
        console.warn(
          `⚠️ Could not calculate values for report ${locationReportId}:`,
          error
        );
        // Fallback to stored values
        calculatedGross = (doc.totalGross as number) || 0;
        calculatedCollected = (doc.amountCollected as number) || 0;
        calculatedLocationRevenue = (doc.partnerProfit as number) || 0;
        calculatedVariation = (doc.variance as number) || "No SAS Data";
        calculatedBalance = (doc.currentBalance as number) || 0;
      }

      const result = {
        _id: (doc._id as string) || "",
        locationReportId,
        collector: (doc.collectorName as string) || "",
        location: locationName,
        gross: formatSmartDecimal(calculatedGross),
        machines: `${collectedMachines || 0}/${totalMachines || 0}`,
        collected: formatSmartDecimal(calculatedCollected),
        uncollected:
          typeof doc.amountUncollected === "number"
            ? formatSmartDecimal(doc.amountUncollected as number)
            : (doc.amountUncollected as string) || "-",
        variation:
          calculatedVariation === 0
            ? "No Variance"
            : typeof calculatedVariation === "string"
            ? calculatedVariation
            : formatSmartDecimal(calculatedVariation),
        balance: formatSmartDecimal(calculatedBalance),
        locationRevenue: formatSmartDecimal(calculatedLocationRevenue),
        time: (() => {
          const ts = doc.timestamp;
          if (ts) {
            if (typeof ts === "string" || ts instanceof Date) {
              return new Date(ts).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
            }
            if (
              typeof ts === "object" &&
              "$date" in ts &&
              typeof ts.$date === "string"
            ) {
              return new Date(ts.$date).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
            }
          }
          return "-";
        })(),
        noSMIBLocation: (doc.noSMIBLocation as boolean) || false,
        isLocalServer: (doc.isLocalServer as boolean) || false,
      };

      console.warn(`[COLLECTION REPORTS] Completed processing report: ${locationName} - Machines: ${collectedMachines}/${totalMachines}`);

      return result;
    })
    );
    
    console.warn(`[COLLECTION REPORTS] Enrichment complete. Returning ${enrichedReports.length} enriched reports`);
  } catch (error) {
    console.error(`[COLLECTION REPORTS] Error in enrichment process:`, error);
    throw error;
  }
  
  return enrichedReports;
}
