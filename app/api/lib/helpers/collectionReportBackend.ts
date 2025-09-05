import { CollectionReport } from "@/app/api/lib/models/collectionReport";
import { Collections } from "@/app/api/lib/models/collections";
import { Machine } from "@/app/api/lib/models/machines";
import { CollectionReportRow } from "@/lib/types/componentProps";
import { PipelineStage } from "mongoose";

/**
 * Backend-only function to fetch all collection reports with machine counts
 * This includes the total machine count per location which requires database access
 */
export async function getAllCollectionReportsWithMachineCounts(
  licenceeId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<CollectionReportRow[]> {
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
    rawReports = await CollectionReport.aggregate(aggregationPipeline);
  }

  // Map to CollectionReportRow and enrich with machine counts
  const enrichedReports = await Promise.all(
    rawReports.map(async (doc: Record<string, unknown>) => {
      const locationReportId = (doc.locationReportId as string) || "";
      const locationName = (doc.locationName as string) || "";

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
        if (typeof locationId === 'object' && locationId !== null) {
          if ('_id' in locationId) {
            locationId = (locationId as { _id: string })._id;
          } else if ('id' in locationId) {
            locationId = (locationId as { id: string }).id;
          }
        }
        
        // If we still don't have a location ID, try to get it from locationDetails (from aggregation)
        if (!locationId && doc.locationDetails && typeof doc.locationDetails === 'object') {
          const locationDetails = doc.locationDetails as { _id?: string; id?: string };
          locationId = locationDetails._id || locationDetails.id;
        }
        
        // If we have a location ID, count total machines for that location
        if (locationId && typeof locationId === 'string') {
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
        collectedMachines = parseInt((doc.machinesCollected as string) || "0") || 0;
        totalMachines = collectedMachines;
      }

      return {
        _id: (doc._id as string) || "",
        locationReportId,
        collector: (doc.collectorName as string) || "",
        location: locationName,
        gross: (doc.totalGross as number) || 0,
        machines: `${collectedMachines || 0}/${totalMachines || 0}`,
        collected: (doc.amountCollected as number) || 0,
        uncollected:
          typeof doc.amountUncollected === "number"
            ? (doc.amountUncollected as number).toString()
            : (doc.amountUncollected as string) || "-",
        locationRevenue: (doc.partnerProfit as number) || 0,
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
      };
    })
  );

  return enrichedReports;
}
