import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { createDatabaseIndexes } from "@/app/api/lib/utils/createIndexes";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locations = searchParams.get("locations");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const licencee = searchParams.get("licencee");

    console.log("Meters API Debug:", {
      locations,
      startDate,
      endDate,
      licencee,
    });

    if (!locations) {
      return NextResponse.json(
        { error: "Locations parameter is required" },
        { status: 400 }
      );
    }

    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: "DB connection failed" },
        { status: 500 }
      );
    }

    // Ensure indexes are created for optimal performance
    await createDatabaseIndexes();

    // Parse locations (comma-separated)
    const locationList = locations.split(",").map((loc) => loc.trim());

    // Parse date range - be more flexible with date handling
    let start: Date, end: Date;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default to last 30 days if no dates provided
      end = new Date();
      start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    console.log("Date range:", { start, end });

    // Build query filter for machines
    const machineMatchStage: any = {
      deletedAt: { $in: [null, new Date(-1)] },
    };

    // Add location filter if specific locations are selected
    if (locationList.length > 0 && !locationList.includes("all")) {
      // Since both gamingLocation and location _id are strings, no ObjectId conversion needed
      machineMatchStage.gamingLocation = { $in: locationList };
    }

    console.log("Location list:", locationList);
    console.log(
      "Machine match stage:",
      JSON.stringify(machineMatchStage, null, 2)
    );

    // Get machines data for the selected locations
    let machinesData = await db
      .collection("machines")
      .find(machineMatchStage)
      .project({
        _id: 1,
        serialNumber: 1,
        "Custom.name": 1,
        gamingLocation: 1,
        sasMeters: 1,
        lastActivity: 1,
      })
      .sort({ lastActivity: -1 })
      .toArray();

    // Filter by licensee if provided
    if (licencee && licencee !== "all") {
      // Get locations that match the licensee
      const licenseeLocations = await db
        .collection("gaminglocations")
        .find({ "rel.licencee": licencee })
        .project({ _id: 1 })
        .toArray();

      const licenseeLocationIds = licenseeLocations.map((loc) =>
        loc._id.toString()
      );

      // Filter machines to only include those from licensee locations
      machinesData = machinesData.filter((machine) =>
        licenseeLocationIds.includes(machine.gamingLocation)
      );
    }

    console.log("Found machines:", machinesData.length);

    // Debug: Show some sample machines to see their gamingLocation values
    if (machinesData.length === 0) {
      const sampleMachines = await db
        .collection("machines")
        .find({ deletedAt: { $in: [null, new Date(-1)] } })
        .project({ _id: 1, serialNumber: 1, gamingLocation: 1 })
        .limit(5)
        .toArray();
      console.log("Sample machines in database:", sampleMachines);
    }

    console.log(
      "Sample machine data:",
      machinesData.slice(0, 2).map((m) => ({
        _id: m._id,
        serialNumber: m.serialNumber,
        gamingLocation: m.gamingLocation,
        hasSasMeters: !!m.sasMeters,
      }))
    );

    // Get all gaming locations for name resolution
    const locationsData = await db
      .collection("gaminglocations")
      .find({
        deletedAt: { $in: [null, new Date(-1)] },
      })
      .project({ _id: 1, name: 1 })
      .toArray();

    console.log("Found locations:", locationsData.length);

    // Create a map for quick location name lookup
    const locationMap = new Map();
    locationsData.forEach((loc: any) => {
      locationMap.set(loc._id.toString(), loc.name);
    });

    // Get additional meter data from the meters collection for missing fields
    const machineIds = machinesData.map(
      (machine: any) =>
        machine.serialNumber || machine.Custom?.name || machine._id.toString()
    );

    const metersData = await db
      .collection("meters")
      .find({
        machine: { $in: machineIds },
      })
      .project({
        machine: 1,
        movement: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .toArray();

    console.log("Found meters data:", metersData.length);

    // Create a map for meter data lookup - get the latest meter data for each machine
    const metersMap = new Map();
    metersData.forEach((meter: any) => {
      // Only set if we don't already have data for this machine (to get the latest)
      if (!metersMap.has(meter.machine)) {
        metersMap.set(meter.machine, meter);
      }
    });

    // Transform data for the table
    let transformedData = machinesData.map((machine: any) => {
      const locationName = machine.gamingLocation
        ? locationMap.get(machine.gamingLocation.toString()) ||
          "Unknown Location"
        : "Unknown Location";

      const machineId =
        machine.serialNumber || machine.Custom?.name || machine._id.toString();
      const meterData = metersMap.get(machineId);

      return {
        machineId: machineId,
        metersIn: machine.sasMeters?.coinIn || 0,
        metersOut: machine.sasMeters?.coinOut || 0,
        jackpot: machine.sasMeters?.jackpot || 0,
        billIn: meterData?.movement?.billIn || 0,
        voucherOut: meterData?.movement?.voucherOut || 0,
        attPaidCredits: meterData?.movement?.attPaidCredits || 0,
        gamesPlayed: machine.sasMeters?.gamesPlayed || 0,
        location: locationName,
        createdAt: machine.lastActivity,
      };
    });

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      transformedData = transformedData.filter(
        (item) =>
          item.machineId.toLowerCase().includes(searchLower) ||
          item.location.toLowerCase().includes(searchLower)
      );
    }

    // Calculate pagination
    const totalCount = transformedData.length;
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Apply pagination
    const paginatedData = transformedData.slice(skip, skip + limit);

    console.log("Transformed data count:", transformedData.length);
    console.log("Pagination:", {
      page,
      limit,
      totalCount,
      totalPages,
      skip,
      paginatedDataLength: paginatedData.length,
    });

    return NextResponse.json({
      data: paginatedData,
      totalCount,
      totalPages,
      currentPage: page,
      limit,
      locations: locationList,
      dateRange: { start, end },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("Error in meters report route:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server Error" },
      { status: 500 }
    );
  }
}
