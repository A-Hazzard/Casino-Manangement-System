import { CollectionReport } from "@/app/api/lib/models/collectionReport";
import { Collections } from "@/app/api/lib/models/collections";
import { CollectionReportRow } from "@/lib/types/componentProps";
import { PipelineStage } from "mongoose";
import axios from "axios";
import type {
  MonthlyReportSummary,
  MonthlyReportDetailsRow,
} from "@/lib/types/componentProps";
import type {
  CreateCollectionReportPayload,
  CollectionReportLocationWithMachines,
} from "@/lib/types/api";
import type { CollectionReportData } from "@/lib/types";
import type { CollectionDocument } from "@/lib/types/collections";

/**
 * Fetches all collection reports from the database, filtered by licencee if provided.
 * @param {string} [licenceeId] - Optional licencee ID to filter reports.
 * @param {Date} [startDate] - Optional start date for filtering reports.
 * @param {Date} [endDate] - Optional end date for filtering reports.
 * @returns {Promise<CollectionReportRow[]>} Array of collection report documents.
 */
export async function getAllCollectionReports(
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

      // Fetch machine count from collections (collected machines only)
      let collectedMachines = 0;
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
      } catch (error) {
        console.warn(
          `⚠️ Could not fetch machine count for report ${locationReportId}:`,
          error
        );
        // Fallback to the original machinesCollected field
        collectedMachines =
          parseInt((doc.machinesCollected as string) || "0") || 0;
      }

      return {
        _id: (doc._id as string) || "",
        locationReportId,
        collector: (doc.collectorName as string) || "",
        location: locationName,
        gross: (doc.totalGross as number) || 0,
        machines: collectedMachines.toString(),
        collected: (doc.amountCollected as number) || 0,
        uncollected:
          typeof doc.amountUncollected === "number"
            ? (doc.amountUncollected as number).toString()
            : (doc.amountUncollected as string) || "-",
        locationRevenue: (doc.partnerProfit as number) || 0,
        variation: (doc.variation as number) || "No SAS Data",
        balance: (doc.currentBalance as number) || 0,
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
 * @param {string} [licencee] - Optional licencee to filter.
 * @returns {Promise<{ drop: string; cancelledCredits: string; gross: string; sasGross: string; }>} Aggregated sums for the summary table.
 */
export async function getMonthlyCollectionReportSummary(
  startDate: Date,
  endDate: Date,
  locationName?: string,
  licencee?: string
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

  let pipeline: PipelineStage[] = [];

  if (licencee) {
    // If licencee is specified, we need to join with gaminglocations to filter by licencee
    pipeline = [
      {
        $lookup: {
          from: "gaminglocations",
          localField: "location",
          foreignField: "_id",
          as: "locationDetails",
        },
      },
      { $unwind: "$locationDetails" },
      { $match: { "locationDetails.rel.licencee": licencee, ...match } },
      {
        $group: {
          _id: null,
          drop: { $sum: "$totalDrop" },
          cancelledCredits: { $sum: "$totalCancelled" },
          gross: { $sum: "$totalGross" },
          sasGross: { $sum: "$totalSasGross" },
        },
      },
    ];
  } else {
    // No licencee filter, use simple aggregation
    pipeline = [
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
    ];
  }

  const result = await CollectionReport.aggregate(pipeline);
  const agg = result[0] || {};
  const formatSmartDecimal = (value: number | undefined): string => {
    if (value === undefined) return "-";
    const hasDecimals = value % 1 !== 0;
    const decimalPart = value % 1;
    const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;
    return value.toFixed(hasSignificantDecimals ? 2 : 0);
  };

  return {
    drop: formatSmartDecimal(agg.drop),
    cancelledCredits: formatSmartDecimal(agg.cancelledCredits),
    gross: formatSmartDecimal(agg.gross),
    sasGross: formatSmartDecimal(agg.sasGross),
  };
}

/**
 * Aggregates by locationName, summing totalDrop, totalCancelled, totalGross, and totalSasGross for each locationName in the date range (and optional locationName filter).
 * @param {Date} startDate - Start date for filtering.
 * @param {Date} endDate - End date for filtering.
 * @param {string} [locationName] - Optional location name to filter.
 * @param {string} [licencee] - Optional licencee to filter.
 * @returns {Promise<Array<{ location: string; drop: string; win: string; gross: string; sasGross: string }>>} Aggregated data per location for the details table.
 */
export async function getMonthlyCollectionReportByLocation(
  startDate: Date,
  endDate: Date,
  locationName?: string,
  licencee?: string
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

  let pipeline: PipelineStage[] = [];

  if (licencee) {
    // If licencee is specified, we need to join with gaminglocations to filter by licencee
    pipeline = [
      {
        $lookup: {
          from: "gaminglocations",
          localField: "location",
          foreignField: "_id",
          as: "locationDetails",
        },
      },
      { $unwind: "$locationDetails" },
      { $match: { "locationDetails.rel.licencee": licencee, ...match } },
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
    ];
  } else {
    // No licencee filter, use simple aggregation
    pipeline = [
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
    ];
  }

  const result = await CollectionReport.aggregate(pipeline);
  const formatSmartDecimal = (value: number | undefined): string => {
    if (value === undefined) return "-";
    const hasDecimals = value % 1 !== 0;
    const decimalPart = value % 1;
    const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;
    return value.toFixed(hasSignificantDecimals ? 2 : 0);
  };

  return result.map((row) => ({
    location: row._id || "-",
    drop: formatSmartDecimal(row.drop),
    win: formatSmartDecimal(row.win),
    gross: formatSmartDecimal(row.gross),
    sasGross: formatSmartDecimal(row.sasGross),
  }));
}

export async function fetchMonthlyReportSummaryAndDetails({
  startDate,
  endDate,
  locationName,
  licencee,
}: {
  startDate: Date;
  endDate: Date;
  locationName?: string;
  licencee?: string;
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
  if (licencee && licencee !== "All Licensees" && licencee !== "")
    params.licencee = licencee;
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
    const response = await axios.get("/api/collectionReport/locations");
    const data: Record<string, unknown> = response.data;
    if ("locations" in data && Array.isArray(data.locations)) {
      return data.locations.map((location: unknown) => String(location));
    }
    return [];
  } catch (error: unknown) {
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

export async function updateCollectionReport(
  reportId: string,
  payload: Partial<CreateCollectionReportPayload>
) {
  const { data } = await axios.patch(
    `/api/collection-report/${reportId}`,
    payload
  );
  return data;
}

/**
 * Fetches collection reports for a given licencee (or all) with optional date filtering.
 * @param licencee - The licencee name or "all" (optional)
 * @param dateRange - Optional date range for filtering { from: Date, to: Date }
 * @param timePeriod - Optional time period for filtering (Today, Yesterday, etc.)
 * @returns Promise resolving to an array of CollectionReportRow
 */
export async function fetchCollectionReportsByLicencee(
  licencee?: string,
  dateRange?: { from: Date; to: Date },
  timePeriod?: string
): Promise<CollectionReportRow[]> {
  try {
    const params: Record<string, string> = {};

    if (licencee && licencee.toLowerCase() !== "all") {
      params.licencee = licencee;
    }

    // If timePeriod is provided and not Custom, use timePeriod
    if (timePeriod && timePeriod !== "Custom") {
      params.timePeriod = timePeriod;
    }
    // Otherwise, if dateRange is provided, use custom dates
    else if (dateRange?.from && dateRange?.to) {
      params.startDate = dateRange.from.toISOString();
      params.endDate = dateRange.to.toISOString();
    }

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

/**
 * Fetches the collection meters (metersIn, metersOut) for a machine by its ID.
 * @param machineId - The machine ID to fetch.
 * @returns Promise resolving to { metersIn: number, metersOut: number } or null if not found.
 */
export async function fetchMachineCollectionMeters(
  machineId: string
): Promise<{ metersIn: number; metersOut: number } | null> {
  try {
    const { data } = await axios.get("/api/machines", {
      params: { id: machineId },
    });

    if (data && data.success && data.data && data.data.collectionMeters) {
      return {
        metersIn: data.data.collectionMeters.metersIn ?? 0,
        metersOut: data.data.collectionMeters.metersOut ?? 0,
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch machine collection meters:", error);
    return null;
  }
}

/**
 * Fetches the previousCollectionTime for a given machine/cabinet ID.
 * @param machineId - The machine/cabinet ID to fetch the previous collection time for.
 * @returns Promise resolving to previousCollectionTime (string | Date | undefined)
 */
export async function fetchPreviousCollectionTime(
  machineId: string
): Promise<string | Date | undefined> {
  try {
    // Try machines API for collectionTime (the correct field name)
    const machineRes = await axios.get(`/api/machines`, {
      params: { id: machineId },
    });

    if (
      machineRes.data &&
      machineRes.data.success &&
      machineRes.data.data &&
      machineRes.data.data.collectionTime
    ) {
      return machineRes.data.data.collectionTime;
    }

    // Fallback: Try collectionReport API
    const { data } = await axios.get(`/api/collectionReport`, {
      params: { machineId, latest: 1 },
    });
    if (data && data.success && data.data) {
      if (data.data.previousCollectionTime) {
        return data.data.previousCollectionTime;
      }
      if (data.data.collectionTime) {
        return data.data.collectionTime;
      }
    }

    return undefined;
  } catch (error) {
    console.error("Failed to fetch previous collection time:", error);
    return undefined;
  }
}

/**
 * Syncs meter data with collections for a specific report
 * Recalculates SAS metrics based on meter data within SAS time periods
 * @param reportId - The collection report ID
 * @returns Promise resolving to sync result
 */
export async function syncMeterDataWithCollections(reportId: string) {
  try {
    const response = await axios.post("/api/collection-report/sync-meters", {
      reportId,
    });

    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to sync meter data");
    }

    return response.data.data;
  } catch (error) {
    console.error("Error syncing meter data:", error);
    throw error;
  }
}

/**
 * Normalizes API response for collection reports to always return CollectionReportLocationWithMachines[]
 * Handles both { collectionReports: [...] } and { locations: [...] } shapes.
 * See collection-report-implementation-guide.md for contract details.
 */
export const normalizeApiResponse = (
  data: Record<string, unknown> | CollectionReportLocationWithMachines[]
): CollectionReportLocationWithMachines[] => {
  // Handle the expected format
  if (
    typeof data === "object" &&
    data !== null &&
    "collectionReports" in data &&
    Array.isArray(data.collectionReports)
  ) {
    return data.collectionReports as CollectionReportLocationWithMachines[];
  }
  // Handle the locations format (fallback) - not yet implemented but kept for future compatibility
  if (
    typeof data === "object" &&
    data !== null &&
    "locations" in data &&
    Array.isArray(data.locations)
  ) {
    console.warn(
      "API returned locations format instead of collectionReports. Consider updating the backend."
    );
    return data.locations as CollectionReportLocationWithMachines[];
  }
  // Handle direct array format
  if (Array.isArray(data)) {
    return data as CollectionReportLocationWithMachines[];
  }
  console.error("Unexpected API response format:", data);
  return [];
};

/**
 * Calculate SAS metrics from meters collection for a specific machine and time period
 * @param machineIdentifier - Machine identifier (serialNumber, customName, or machineId)
 * @param sasStartTime - Start time for SAS calculation
 * @param sasEndTime - End time for SAS calculation
 * @returns Promise<SasMetrics> - Calculated SAS metrics
 */
export async function calculateSasMetrics(
  machineIdentifier: string,
  sasStartTime: Date,
  sasEndTime: Date
): Promise<{
  drop: number;
  totalCancelledCredits: number;
  gross: number;
  jackpot: number;
  sasStartTime: string;
  sasEndTime: string;
}> {
  try {
    // Query meters collection for the machine and time period
    const response = await axios.get("/api/metrics/meters", {
      params: {
        timePeriod: "Custom",
        machine: machineIdentifier,
        startDate: sasStartTime.toISOString(),
        endDate: sasEndTime.toISOString(),
      },
    });

    const meters = response.data || [];

    // Calculate totals from movement objects
    const totals = meters.reduce(
      (
        acc: {
          drop: number;
          totalCancelledCredits: number;
          gross: number;
          jackpot: number;
        },
        meter: {
          movement?: {
            drop?: number;
            totalCancelledCredits?: number;
            gross?: number;
            jackpot?: number;
          };
        }
      ) => {
        const movement = meter.movement || {};
        return {
          drop: acc.drop + (movement.drop || 0),
          totalCancelledCredits:
            acc.totalCancelledCredits + (movement.totalCancelledCredits || 0),
          gross: acc.gross + (movement.gross || 0),
          jackpot: acc.jackpot + (movement.jackpot || 0),
        };
      },
      { drop: 0, totalCancelledCredits: 0, gross: 0, jackpot: 0 }
    );

    return {
      drop: totals.drop,
      totalCancelledCredits: totals.totalCancelledCredits,
      gross: totals.gross,
      jackpot: totals.jackpot,
      sasStartTime: sasStartTime.toISOString(),
      sasEndTime: sasEndTime.toISOString(),
    };
  } catch (error) {
    console.error("Error calculating SAS metrics:", error);
    // Return zero values if calculation fails
    return {
      drop: 0,
      totalCancelledCredits: 0,
      gross: 0,
      jackpot: 0,
      sasStartTime: sasStartTime.toISOString(),
      sasEndTime: sasEndTime.toISOString(),
    };
  }
}

/**
 * Calculate movement object for a collection
 * @param metersIn - Current meters in value
 * @param metersOut - Current meters out value
 * @returns Movement object with calculated gross
 */
export function calculateMovement(
  metersIn: number,
  metersOut: number
): {
  metersIn: number;
  metersOut: number;
  gross: number;
} {
  return {
    metersIn,
    metersOut,
    gross: metersIn - metersOut,
  };
}

/**
 * Calculate amount to collect for a single machine
 * @param metersIn - Current meters in value
 * @param prevIn - Previous meters in value
 * @param metersOut - Current meters out value
 * @param prevOut - Previous meters out value
 * @param profitShare - Profit share percentage (e.g., 50 for 50%)
 * @returns Amount to collect for this machine
 */
export function calculateAmountToCollectForMachine(
  metersIn: number,
  prevIn: number,
  metersOut: number = 0,
  prevOut: number = 0,
  profitShare: number = 50
): number {
  const drop = metersIn - prevIn;
  const cancelledCredits = metersOut - prevOut;
  const gross = drop - cancelledCredits;
  
  // Calculate partner profit: gross * profitShare / 100
  const partnerProfit = Math.floor(gross * profitShare / 100);
  
  // Amount to collect = gross - partner profit
  return gross - partnerProfit;
}

/**
 * Calculate total amount to collect for all machines in the collection
 * @param collectedMachines - Array of collected machine entries
 * @param profitShare - Profit share percentage from gaming location (e.g., 50 for 50%)
 * @returns Total amount to collect
 */
export function calculateTotalAmountToCollect(
  collectedMachines: CollectionDocument[],
  profitShare: number = 50
): number {
  return collectedMachines.reduce((total, machine) => {
    const drop = (machine.metersIn || 0) - (machine.prevIn || 0);
    const cancelledCredits = (machine.metersOut || 0) - (machine.prevOut || 0);
    const gross = drop - cancelledCredits;
    
    // Calculate partner profit: gross * profitShare / 100
    const partnerProfit = Math.floor(gross * profitShare / 100);
    
    // Amount to collect = gross - partner profit
    return total + (gross - partnerProfit);
  }, 0);
}

/**
 * Calculate balance correction based on amount to collect and collected amount
 * @param amountToCollect - Total amount to collect
 * @param collectedAmount - Amount actually collected
 * @returns Balance correction value
 */
export function calculateBalanceCorrection(
  amountToCollect: number,
  collectedAmount: number
): number {
  return collectedAmount - amountToCollect;
}

/**
 * Calculate advanced financial metrics based on old system logic
 * @param collectedMachines - Array of collected machine entries
 * @param financials - Financial input values
 * @returns Advanced financial calculations
 */
export function calculateAdvancedFinancials(
  collectedMachines: CollectionDocument[],
  financials: {
    taxes: string;
    advance: string;
    variance: string;
    previousBalance: string;
    collectedAmount: string;
  }
): {
  totalDrop: number;
  totalCancelledCredits: number;
  totalGross: number;
  partnerProfit: number;
  amountToCollect: number;
  balanceCorrection: number;
} {
  // Calculate total movement data for all machines
  const totalMovementData = collectedMachines.reduce(
    (sum, machine) => {
      const drop = (machine.metersIn || 0) - (machine.prevIn || 0);
      const cancelledCredits =
        (machine.metersOut || 0) - (machine.prevOut || 0);
      return {
        drop: sum.drop + drop,
        cancelledCredits: sum.cancelledCredits + cancelledCredits,
        gross: sum.gross + (drop - cancelledCredits),
      };
    },
    { drop: 0, cancelledCredits: 0, gross: 0 }
  );

  // Extract financial values
  const taxes = Number(financials.taxes) || 0;
  const variance = Number(financials.variance) || 0;
  const advance = Number(financials.advance) || 0;
  const previousBalance = Number(financials.previousBalance) || 0;
  const collectedAmount = Number(financials.collectedAmount) || 0;
  const profitShare = 50; // Default profit share percentage

  // Calculate partner profit
  const partnerProfit =
    Math.floor(
      ((totalMovementData.gross - variance - advance) * profitShare) / 100
    ) - taxes;

  // Calculate amount to collect
  const amountToCollect =
    totalMovementData.gross - variance - advance - partnerProfit;
  const finalAmountToCollect = amountToCollect + previousBalance;

  // Calculate balance correction
  const balanceCorrection = collectedAmount - finalAmountToCollect;

  return {
    totalDrop: totalMovementData.drop,
    totalCancelledCredits: totalMovementData.cancelledCredits,
    totalGross: totalMovementData.gross,
    partnerProfit,
    amountToCollect: finalAmountToCollect,
    balanceCorrection,
  };
}
