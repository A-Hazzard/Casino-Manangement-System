import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { getDatesForTimePeriod } from "@/app/api/lib/utils/dates";
import { TimePeriod } from "@/app/api/lib/types";
import { LocationFilter } from "@/lib/types/location";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const timePeriod = (searchParams.get("timePeriod") as TimePeriod) || "7d";
    const licencee = searchParams.get("licencee") || undefined;
    const machineTypeFilter =
      (searchParams.get("machineTypeFilter") as LocationFilter) || null;
    
    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const requestedLimit = parseInt(searchParams.get("limit") || "10");
    const limit = Math.min(requestedLimit, 10); // Cap at 10 for faster loading
    const skip = (page - 1) * limit;
    
    console.log("🔍 API - Requested limit:", requestedLimit, "Actual limit:", limit, "Page:", page, "Skip:", skip);
    
    console.log("🔍 API - Requested limit:", requestedLimit, "Actual limit:", limit);

    let startDate: Date, endDate: Date;

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

    console.log("🔍 API - timePeriod:", timePeriod);
    console.log("🔍 API - startDate:", startDate.toISOString());
    console.log("🔍 API - endDate:", endDate.toISOString());
    console.log("🔍 API - current system time:", new Date().toISOString());
    console.log("🔍 API - licencee:", licencee);

    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: "DB connection failed" },
        { status: 500 }
      );
    }

    // Build location filter
    const locationFilter: any = {
      deletedAt: { $in: [null, new Date(-1)] },
    };
    
    if (licencee && licencee !== "all") {
      locationFilter["rel.licencee"] = licencee;
    }

    // Get all locations for the licencee
    console.log("🔍 API - Location filter:", locationFilter);
    const allLocations = await db
      .collection("gaminglocations")
      .find(locationFilter)
      .toArray();
    
    console.log("🔍 API - Found locations:", allLocations.length);
    if (allLocations.length === 0) {
      console.log("🔍 API - No locations found, returning empty response");
      return NextResponse.json({
        data: [],
        pagination: {
          page,
          limit,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    }

    // Get location IDs for machine lookup
    const locationIds = allLocations.map(loc => loc._id);

    // Get ALL machines for the locations (not filtered by date)
    console.log("🔍 API - Fetching ALL machines for locations:", locationIds.length);
    const machines = await db
      .collection("machines")
      .find({
        gamingLocation: { $in: locationIds },
        deletedAt: { $in: [null, new Date(-1)] },
      })
      .toArray();
    
    console.log("🔍 API - Found machines:", machines.length);

    // Get meters data for the time period ONLY (this is what gets filtered)
    console.log("🔍 API - Fetching meters for date range:", { startDate, endDate });
    const meters = await db
      .collection("meters")
      .find({
        createdAt: { $gte: startDate, $lte: endDate },
        location: { $in: locationIds.map(id => id.toString()) },
      })
      .toArray();
    
    console.log("🔍 API - Found meters in date range:", meters.length);

    // Aggregate data by location
    const locationMetrics = new Map();

    // Initialize location metrics for ALL locations
    allLocations.forEach(location => {
      const locationId = location._id.toString();
      locationMetrics.set(locationId, {
        location: locationId,
        locationName: location.name || "Unknown Location",
        moneyIn: 0,
        moneyOut: 0,
        gross: 0,
        totalMachines: 0,
        onlineMachines: 0,
        sasMachines: 0,
        nonSasMachines: 0,
        hasSasMachines: false,
        hasNonSasMachines: false,
        isLocalServer: !!location.isLocalServer,
        machines: [],
        meters: [],
      });
    });

    console.log("🔍 API - Initialized metrics for", locationMetrics.size, "locations");

    // Add ALL machines to locations (not filtered by date)
    machines.forEach(machine => {
      const locationId = machine.gamingLocation?.toString();
      if (locationId && locationMetrics.has(locationId)) {
        const location = locationMetrics.get(locationId);
        location.totalMachines++;
        
        // Check if machine is online (active in last 3 minutes)
        const onlineThreshold = new Date();
        onlineThreshold.setMinutes(onlineThreshold.getMinutes() - 3);
        if (machine.lastActivity && new Date(machine.lastActivity) > onlineThreshold) {
          location.onlineMachines++;
        }

        // Count SAS vs non-SAS machines
        if (machine.isSasMachine === true) {
          location.sasMachines++;
          location.hasSasMachines = true;
        } else {
          location.nonSasMachines++;
          location.hasNonSasMachines = true;
        }

        location.machines.push({
          id: machine._id,
          serialNumber: machine.serialNumber,
          game: machine.game,
          isSasMachine: machine.isSasMachine,
          lastActivity: machine.lastActivity,
        });
      }
    });

    console.log("🔍 API - Processed machines for all locations");

    // Add meters data to locations (ONLY meters are filtered by date)
    meters.forEach(meter => {
      const locationId = meter.location;
      if (locationMetrics.has(locationId)) {
        const location = locationMetrics.get(locationId);
        location.moneyIn += meter.movement?.drop || 0;
        location.moneyOut += meter.movement?.totalCancelledCredits || 0;
        location.gross = location.moneyIn - location.moneyOut;
        
        location.meters.push({
          id: meter._id,
          machineId: meter.machineId,
          drop: meter.movement?.drop || 0,
          cancelledCredits: meter.movement?.totalCancelledCredits || 0,
          createdAt: meter.createdAt,
        });
      }
    });

    console.log("🔍 API - Processed meters data (filtered by date range)");

    // Convert to array and sort by gross revenue
    // Note: This includes ALL locations with their machines, but only meters data is filtered by date
    // Locations with no meters in the date range will have moneyIn=0, moneyOut=0, gross=0
    const allLocationData = Array.from(locationMetrics.values())
      .sort((a, b) => b.gross - a.gross);

    console.log("🔍 API - Total locations processed:", allLocationData.length);
    console.log("🔍 API - Sample location data:", allLocationData.slice(0, 2));

    // Apply pagination
    const totalCount = allLocationData.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedData = allLocationData.slice(skip, skip + limit);

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log("🔍 API - Pagination:", { page, limit, totalCount, totalPages, dataLength: paginatedData.length });
    console.log("🔍 API - Slice details:", { skip, skipPlusLimit: skip + limit, sliceStart: skip, sliceEnd: skip + limit });
    console.log("🔍 API - Request completed in", duration, "ms");

    return NextResponse.json({
      data: paginatedData,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err: unknown) {
    console.error("Error in reports locations route:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server Error" },
      { status: 500 }
    );
  }
} 