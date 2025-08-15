import { NextRequest, NextResponse } from "next/server";
import { getLocationsWithMetrics } from "@/app/api/lib/helpers/locationAggregation";
import { TimePeriod } from "@/app/api/lib/types";
import { getDatesForTimePeriod } from "../lib/utils/dates";
import { connectDB } from "@/app/api/lib/middleware/db";
import { LocationFilter } from "@/lib/types/location";

// Simple in-memory cache for performance
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(params: any): string {
  return JSON.stringify(params);
}

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}

// Function to clear cache (useful for testing)
function clearCache() {
  cache.clear();
  // Location aggregation cache cleared
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timePeriod = (searchParams.get("timePeriod") as TimePeriod) || "7d";
    const licencee = searchParams.get("licencee") || undefined;
    const machineTypeFilter =
      (searchParams.get("machineTypeFilter") as LocationFilter) || null;
    const showAllLocations = searchParams.get("showAllLocations") === "true";
    const clearCacheParam = searchParams.get("clearCache") === "true";

    // Clear cache if requested (useful for testing)
    if (clearCacheParam) {
      clearCache();
    }

    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    let startDate: Date | undefined, endDate: Date | undefined;

    if (timePeriod === "Custom") {
      const customStart = searchParams.get("startDate");
      const customEnd = searchParams.get("endDate");
      if (!customStart || !customEnd) {
        return NextResponse.json(
          { error: "Missing startDate or endDate" },
          { status: 400 }
        );
      }
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
    } else {
      const { startDate: s, endDate: e } = getDatesForTimePeriod(timePeriod);
      startDate = s;
      endDate = e;
    }

    // Check cache first (unless cache was cleared)
    const cacheKey = getCacheKey({
      timePeriod,
      licencee,
      machineTypeFilter,
      showAllLocations,
      startDate,
      endDate,
      page,
      limit,
    });

    const cached = cache.get(cacheKey);
    if (cached && isCacheValid(cached.timestamp) && !clearCacheParam) {
      return NextResponse.json(cached.data);
    }

    const db = await connectDB();
    if (!db)
      return NextResponse.json(
        { error: "DB connection failed" },
        { status: 500 }
      );

    // Quick data availability check with timeout
    const dataCheckPromise = Promise.all([
      db.collection("meters").countDocuments({}, { limit: 1 }),
      db.collection("gaminglocations").countDocuments({}, { limit: 1 }),
    ]);

    const dataCheckTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Data check timeout")), 5000)
    );

    try {
      await Promise.race([dataCheckPromise, dataCheckTimeout]);
    } catch (error) {
      console.warn("Data availability check failed, proceeding anyway:", error);
    }

    // Get aggregated data with optimized performance
    const { rows, totalCount } = await getLocationsWithMetrics(
      db,
      { startDate, endDate },
      showAllLocations,
      licencee,
      machineTypeFilter,
      page,
      limit
    );

    // Apply filters if needed
    let filteredRows = rows;
    if (machineTypeFilter === "LocalServersOnly") {
      filteredRows = rows.filter((loc) => loc.isLocalServer === true);
    } else if (machineTypeFilter === "SMIBLocationsOnly") {
      filteredRows = rows.filter((loc) => loc.noSMIBLocation === false);
    } else if (machineTypeFilter === "NoSMIBLocation") {
      filteredRows = rows.filter((loc) => loc.noSMIBLocation === true);
    }

    // Sort by money in descending order
    const sortedRows = filteredRows.sort(
      (a, b) => (b.moneyIn || 0) - (a.moneyIn || 0)
    );

    const result = {
      data: sortedRows,
      totalCount: sortedRows.length,
      page,
      limit,
      hasMore: page * limit < totalCount,
    };

    // Cache the result (unless cache was cleared)
    if (!clearCacheParam) {
      cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      // Clean up old cache entries (keep only last 100 entries)
      if (cache.size > 100) {
        const entries = Array.from(cache.entries());
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        const toDelete = entries.slice(100);
        toDelete.forEach(([key]) => cache.delete(key));
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ LocationAggregation API Error:", error);

    // Return fallback data instead of error
    return NextResponse.json({
      data: [],
      totalCount: 0,
      page: 1,
      limit: 50,
      hasMore: false,
      error: "Failed to fetch location data",
    });
  }
}
