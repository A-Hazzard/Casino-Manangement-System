import { CollectionReport } from "@/app/api/lib/models/collectionReport";
import { CollectionReportRow } from "@/lib/types/componentProps";
import axios from "axios";
import type {
  MonthlyReportSummary,
  MonthlyReportDetailsRow,
} from "@/lib/types/componentProps";
import type { CreateCollectionReportPayload } from "@/lib/types/api";
import type { CollectionReportData } from "@/lib/types";

/**
 * Fetches all collection reports from the database, filtered by licencee if provided.
 * @param {string} [licenceeId] - Optional licencee ID to filter reports.
 * @returns {Promise<CollectionReportRow[]>} Array of collection report documents.
 */
export async function getAllCollectionReports(
  licenceeId?: string
): Promise<CollectionReportRow[]> {
  let rawReports;
  if (!licenceeId) {
    rawReports = await CollectionReport.find({}).lean();
  } else {
    rawReports = await CollectionReport.aggregate([
      {
        $lookup: {
          from: "gaminglocations",
          localField: "location",
          foreignField: "_id",
          as: "locationDetails",
        },
      },
      { $unwind: "$locationDetails" },
      { $match: { "locationDetails.rel.licencee": licenceeId } },
    ]);
  }
  // Map to CollectionReportRow
  return rawReports.map((doc: Record<string, unknown>) => ({
    collector: (doc.collectorName as string) || "",
    location: (doc.locationName as string) || "",
    gross: (doc.totalGross as number) || 0,
    machines: (doc.machinesCollected as string) || "",
    collected: (doc.amountCollected as number) || 0,
    uncollected:
      typeof doc.amountUncollected === "number"
        ? (doc.amountUncollected as number).toString()
        : (doc.amountUncollected as string) || "-",
    locationRevenue: (doc.partnerProfit as number) || 0,
    time: (() => {
      const ts = doc.timestamp;
      if (typeof ts === "string") return new Date(ts).toLocaleString();
      if (
        ts &&
        typeof ts === "object" &&
        "$date" in ts &&
        typeof (ts as { $date: string }).$date === "string"
      ) {
        return new Date((ts as { $date: string }).$date).toLocaleString();
      }
      return "";
    })(),
  }));
}

// Helper function to safely cast distinct result to string array
// Using a proper type that matches mongoose distinct's return signature
async function getDistinct<T>(
  model: { distinct: (field: string) => Promise<unknown[]> },
  field: string
): Promise<T[]> {
  const result = await model.distinct(field);
  return result as T[];
}

/**
 * Fetches all unique collectors from collection reports, filtered by licencee if provided.
 * @param {string} [licenceeId] - Optional licencee ID to filter collectors.
 * @returns {Promise<string[]>} Array of unique collector names.
 */
export async function getCollectorsByLicencee(
  licenceeId?: string
): Promise<string[]> {
  if (!licenceeId) {
    // All collectors from all reports
    return getDistinct<string>(CollectionReport, "collectorName");
  }

  // Aggregate: join with gaminglocations and filter by rel.licencee, then get distinct collectorName
  const result = await CollectionReport.aggregate([
    {
      $lookup: {
        from: "gaminglocations",
        localField: "location",
        foreignField: "_id",
        as: "locationDetails",
      },
    },
    { $unwind: "$locationDetails" },
    { $match: { "locationDetails.rel.licencee": licenceeId } },
    { $group: { _id: "$collectorName" } },
    { $project: { _id: 0, collectorName: "$_id" } },
  ]);
  return result.map((row) => row.collectorName);
}

/**
 * Fetches all unique collectors from collection reports with pagination.
 *
 * @param {number} page - The page number (1-based).
 * @param {number} limit - The number of collectors per page.
 * @param {string} [licenceeId] - Optional licencee ID to filter collectors.
 * @returns {Promise<{collectors: string[], total: number, page: number, limit: number}>} Paginated collectors data.
 */
export async function getCollectorsPaginated(
  page: number,
  limit: number,
  licenceeId?: string
): Promise<{
  collectors: string[];
  total: number;
  page: number;
  limit: number;
}> {
  let allCollectors: string[] = [];

  if (!licenceeId) {
    // Get all unique collector names without filtering
    allCollectors = await getDistinct<string>(
      CollectionReport,
      "collectorName"
    );
  } else {
    // Filter by licencee using aggregation
    const result = await CollectionReport.aggregate([
      {
        $lookup: {
          from: "gaminglocations",
          localField: "location",
          foreignField: "_id",
          as: "locationDetails",
        },
      },
      { $unwind: "$locationDetails" },
      { $match: { "locationDetails.rel.licencee": licenceeId } },
      { $group: { _id: "$collectorName" } },
      { $project: { _id: 0, collectorName: "$_id" } },
      { $sort: { collectorName: 1 } },
    ]);
    allCollectors = result.map((row) => row.collectorName);
  }

  const total = allCollectors.length;
  // Paginate
  const start = (page - 1) * limit;
  const end = start + limit;
  const collectors = allCollectors.slice(start, end);
  return { collectors, total, page, limit };
}

/**
 * Aggregates the sum of totalDrop, totalCancelled, totalGross, and totalSasGross for all documents in the date range (and optional locationName filter).
 * @param {Date} startDate - Start date for filtering.
 * @param {Date} endDate - End date for filtering.
 * @param {string} [locationName] - Optional location name to filter.
 * @returns {Promise<{ drop: string; cancelledCredits: string; gross: string; sasGross: string; }>} Aggregated sums for the summary table.
 */
export async function getMonthlyCollectionReportSummary(
  startDate: Date,
  endDate: Date,
  locationName?: string
): Promise<{
  drop: string;
  cancelledCredits: string;
  gross: string;
  sasGross: string;
}> {
  const match: Record<string, unknown> = {
    timestamp: { $gte: startDate, $lte: endDate },
  };
  if (locationName) {
    match.locationName = locationName;
  }
  const result = await CollectionReport.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        drop: { $sum: "$totalDrop" },
        cancelledCredits: { $sum: "$totalCancelled" },
        gross: { $sum: "$totalGross" },
        sasGross: { $sum: "$totalSasGross" },
      },
    },
  ]);
  const agg = result[0] || {};
  return {
    drop: agg.drop !== undefined ? agg.drop.toString() : "-",
    cancelledCredits:
      agg.cancelledCredits !== undefined
        ? agg.cancelledCredits.toString()
        : "-",
    gross: agg.gross !== undefined ? agg.gross.toString() : "-",
    sasGross: agg.sasGross !== undefined ? agg.sasGross.toString() : "-",
  };
}

/**
 * Aggregates by locationName, summing totalDrop, totalCancelled, totalGross, and totalSasGross for each locationName in the date range (and optional locationName filter).
 * @param {Date} startDate - Start date for filtering.
 * @param {Date} endDate - End date for filtering.
 * @param {string} [locationName] - Optional location name to filter.
 * @returns {Promise<Array<{ location: string; drop: string; win: string; gross: string; sasGross: string }>>} Aggregated data per location for the details table.
 */
export async function getMonthlyCollectionReportByLocation(
  startDate: Date,
  endDate: Date,
  locationName?: string
): Promise<
  Array<{
    location: string;
    drop: string;
    win: string;
    gross: string;
    sasGross: string;
  }>
> {
  const match: Record<string, unknown> = {
    timestamp: { $gte: startDate, $lte: endDate },
  };
  if (locationName) {
    match.locationName = locationName;
  }
  const result = await CollectionReport.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$locationName",
        drop: { $sum: "$totalDrop" },
        win: { $sum: "$totalCancelled" },
        gross: { $sum: "$totalGross" },
        sasGross: { $sum: "$totalSasGross" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return result.map((row) => ({
    location: row._id || "-",
    drop: row.drop !== undefined ? row.drop.toString() : "-",
    win: row.win !== undefined ? row.win.toString() : "-",
    gross: row.gross !== undefined ? row.gross.toString() : "-",
    sasGross: row.sasGross !== undefined ? row.sasGross.toString() : "-",
  }));
}

export async function fetchMonthlyReportSummaryAndDetails({
  startDate,
  endDate,
  locationName,
}: {
  startDate: Date;
  endDate: Date;
  locationName?: string;
}): Promise<{
  summary: MonthlyReportSummary;
  details: MonthlyReportDetailsRow[];
}> {
  const params: Record<string, string> = {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
  if (locationName && locationName !== "all")
    params.locationName = locationName;
  const { data } = await axios.get("/api/collectionReport", { params });
  return {
    summary: data.summary || {
      drop: "-",
      cancelledCredits: "-",
      gross: "-",
      sasGross: "-",
    },
    details: data.details || [],
  };
}

/**
 * Fetches all unique location names from collection reports.
 * @returns {Promise<string[]>} Array of unique location names.
 */
export async function getAllLocationNames(): Promise<string[]> {
  try {
    return getDistinct<string>(CollectionReport, "locationName");
  } catch (error) {
    console.error("Error fetching location names:", error);
    return [];
  }
}

/**
 * Fetches all unique location names from collection reports via API call.
 * @returns {Promise<string[]>} Array of unique location names.
 */
export async function fetchAllLocationNames(): Promise<string[]> {
  try {
    const { data } = await axios.get("/api/collectionReport/locations");
    return data || [];
  } catch (error) {
    console.error("Error fetching location names:", error);
    return [];
  }
}

export async function getLocationsWithMachines() {
  const { data } = await axios.get(
    "/api/collectionReport?locationsWithMachines=1"
  );
  return data.locations || [];
}

export async function createCollectionReport(
  payload: CreateCollectionReportPayload
) {
  const { data } = await axios.post("/api/collectionReport", payload);
  return data;
}

/**
 * Fetches collection reports for a given licencee (or all).
 * @param licencee - The licencee name or "all" (optional)
 * @returns Promise resolving to an array of CollectionReportRow
 */
export async function fetchCollectionReportsByLicencee(
  licencee?: string
): Promise<CollectionReportRow[]> {
  try {
    const params =
      licencee && licencee.toLowerCase() !== "all" ? { licencee } : {};
    const { data } = await axios.get("/api/collectionReport", { params });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to fetch collection reports by licencee:", error);
    return [];
  }
}

/**
 * Fetches a single collection report by its reportId from the API.
 * @param reportId - The unique report ID to fetch.
 * @returns Promise resolving to a CollectionReportData object or null if not found.
 */
export async function fetchCollectionReportById(
  reportId: string
): Promise<CollectionReportData | null> {
  try {
    const { data } = await axios.get(`/api/collection-report/${reportId}`);
    return data as CollectionReportData;
  } catch (error) {
    console.error("Failed to fetch collection report by ID:", error);
    return null;
  }
}
