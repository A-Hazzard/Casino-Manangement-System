import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { getDatesForTimePeriod } from "@/app/api/lib/utils/dates";
import { TimePeriod } from "@/app/api/lib/types";
import { createDatabaseIndexes } from "@/app/api/lib/utils/createIndexes";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'overview', 'stats', 'all', 'offline'
    const timePeriod = (searchParams.get("timePeriod") as TimePeriod) || "Today";
    const licencee = searchParams.get("licencee") || undefined;
    
    // Pagination parameters for overview
    const page = parseInt(searchParams.get("page") || "1");
    const requestedLimit = parseInt(searchParams.get("limit") || "10");
    const limit = Math.min(requestedLimit, 10);
    const skip = (page - 1) * limit;
    
    console.log("🔍 Machines API - Type:", type, "Requested limit:", requestedLimit, "Actual limit:", limit, "Page:", page, "Skip:", skip);

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

    console.log("🔍 Machines API - timePeriod:", timePeriod);
    console.log("🔍 Machines API - startDate:", startDate.toISOString());
    console.log("🔍 Machines API - endDate:", endDate.toISOString());
    console.log("🔍 Machines API - licencee:", licencee);

    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: "DB connection failed" },
        { status: 500 }
      );
    }

    // Ensure indexes are created for optimal performance
    await createDatabaseIndexes();

    // Build machine filter for all queries
    const machineMatchStage: any = {
      deletedAt: { $in: [null, new Date(-1)] },
    };

    // Add licencee filter if specified
    if (licencee && licencee !== "all") {
      machineMatchStage["locationDetails.rel.licencee"] = licencee;
    }

    // Add date filter
    machineMatchStage.lastActivity = {
      $gte: startDate,
      $lte: endDate
    };

    // Add search filter if specified
    const searchTerm = searchParams.get("search");
    if (searchTerm && searchTerm.trim()) {
      machineMatchStage.$or = [
        { serialNumber: { $regex: searchTerm, $options: "i" } },
        { game: { $regex: searchTerm, $options: "i" } },
        { manuf: { $regex: searchTerm, $options: "i" } },
        { "Custom.name": { $regex: searchTerm, $options: "i" } }
      ];
    }

    // Route to appropriate handler based on type
    switch (type) {
      case 'stats':
        return await getMachineStats(db, machineMatchStage);
      case 'overview':
        return await getOverviewMachines(db, machineMatchStage, page, limit, skip);
      case 'all':
        return await getAllMachines(db, searchParams, startDate, endDate);
      case 'offline':
        return await getOfflineMachines(db, searchParams, startDate, endDate);
      default:
        return await getOverviewMachines(db, machineMatchStage, page, limit, skip);
    }

  } catch (err) {
    console.error("Error in reports machines route:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server Error" },
      { status: 500 }
    );
  }
}

// Separate function for online machines count
const getOnlineMachinesCount = async (db: any, machineMatchStage: any) => {
  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
  
  const onlineCount = await db.collection("machines").countDocuments({
    ...machineMatchStage,
    lastActivity: { $gte: threeMinutesAgo }
  });
  
  return onlineCount;
};

// Stats endpoint - returns total counts and financial totals
const getMachineStats = async (db: any, machineMatchStage: any) => {
  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
  
  // Count ALL machines in the system (regardless of date filter)
  const totalCount = await db.collection("machines").countDocuments({
    deletedAt: { $in: [null, new Date(-1)] }
  });
  
  // Count online machines (regardless of date filter)
  const onlineCount = await db.collection("machines").countDocuments({
    deletedAt: { $in: [null, new Date(-1)] },
    lastActivity: { $gte: threeMinutesAgo }
  });

  // Calculate financial totals from machines within the date filter
  const financialTotals = await db.collection("machines")
    .aggregate([
      { $match: machineMatchStage },
      {
        $group: {
          _id: null,
          totalGross: { $sum: { $subtract: ["$sasMeters.drop", "$sasMeters.totalCancelledCredits"] } },
          totalDrop: { $sum: "$sasMeters.drop" },
          totalCancelledCredits: { $sum: "$sasMeters.totalCancelledCredits" }
        }
      }
    ])
    .toArray();

  const totals = financialTotals[0] || { totalGross: 0, totalDrop: 0, totalCancelledCredits: 0 };
  
  return NextResponse.json({
    onlineCount,
    offlineCount: totalCount - onlineCount,
    totalCount,
    totalGross: totals.totalGross || 0,
    totalDrop: totals.totalDrop || 0,
    totalCancelledCredits: totals.totalCancelledCredits || 0
  });
};

// Overview endpoint - paginated machines for overview tab
const getOverviewMachines = async (db: any, machineMatchStage: any, page: number, limit: number, skip: number) => {
  console.log("🚀 Getting overview machines with pagination...");
  
  // Step 1: Get machines with minimal data (paginated)
  const machines = await db.collection("machines")
    .find(machineMatchStage)
    .project({
      _id: 1,
      serialNumber: 1,
      "Custom.name": 1,
      game: 1,
      manuf: 1,
      gameType: 1,
      gamingLocation: 1,
      lastActivity: 1,
      isSasMachine: 1,
      sasMeters: 1,
      gameConfig: 1
    })
    .sort({ "sasMeters.coinIn": -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  console.log(`🔍 Found ${machines.length} machines for overview`);

  // Get all gaming locations for name resolution
  const locations = await db.collection("gaminglocations").find({
    deletedAt: { $in: [null, new Date(-1)] }
  }).project({ _id: 1, name: 1 }).toArray();

  // Create a map for quick location name lookup
  const locationMap = new Map();
  locations.forEach((loc: any) => {
    locationMap.set(loc._id.toString(), loc.name);
  });

  // Transform machines data and resolve location names
  const transformedMachines = machines.map((machine: any) => {
    // Resolve location name using gamingLocation field
    const locationName = machine.gamingLocation ? 
      locationMap.get(machine.gamingLocation.toString()) || "Unknown Location" : 
      "Unknown Location";

    return {
      machineId: machine._id.toString(),
      machineName: machine.Custom?.name || machine.serialNumber || "Unknown Machine",
      locationId: machine.gamingLocation?.toString() || "",
      locationName: locationName,
      gameTitle: machine.game || "Unknown Game",
      manufacturer: machine.manuf || "Unknown Manufacturer",
      isOnline: machine.lastActivity && new Date(machine.lastActivity) >= new Date(Date.now() - 3 * 60 * 1000),
      lastActivity: machine.lastActivity,
      isSasEnabled: machine.isSasMachine || false,
      coinIn: machine.sasMeters?.coinIn || 0,
      coinOut: machine.sasMeters?.coinOut || 0,
      netWin: (machine.sasMeters?.drop || 0) - (machine.sasMeters?.totalCancelledCredits || 0),
      theoreticalHold: machine.gameConfig?.theoreticalRtp || 0,
      gamesPlayed: machine.sasMeters?.gamesPlayed || 0,
      avgBet: machine.sasMeters?.avgBet || 0,
      drop: machine.sasMeters?.drop || 0,
      cancelledCredits: machine.sasMeters?.totalCancelledCredits || 0,
    };
  });

  // Step 4: Get total count for pagination
  const totalCount = await db.collection("machines").countDocuments(machineMatchStage);
  const totalPages = Math.ceil(totalCount / limit);

  console.log("🔍 Overview machines completed:", { page, limit, totalCount, totalPages, dataLength: transformedMachines.length });

  return NextResponse.json({
    data: transformedMachines,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
};

// All machines endpoint - for Performance Analysis tab
const getAllMachines = async (db: any, searchParams: URLSearchParams, startDate: Date, endDate: Date) => {
  try {
    const licencee = searchParams.get("licencee");
    const timePeriod = searchParams.get("timePeriod");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const searchTerm = searchParams.get("search");

    // Build machine filter
    const machineMatchStage: any = {
      deletedAt: { $in: [null, new Date(-1)] },
    };

    // Add licencee filter if specified
    if (licencee && licencee !== "all") {
      machineMatchStage["locationDetails.rel.licencee"] = licencee;
    }

    // Add date filter
    machineMatchStage.lastActivity = {
      $gte: startDate,
      $lte: endDate
    };

    // Add search filter if specified
    if (searchTerm && searchTerm.trim()) {
      machineMatchStage.$or = [
        { serialNumber: { $regex: searchTerm, $options: "i" } },
        { game: { $regex: searchTerm, $options: "i" } },
        { manuf: { $regex: searchTerm, $options: "i" } },
        { "Custom.name": { $regex: searchTerm, $options: "i" } }
      ];
    }

    // Get all machines for analysis
    const machines = await db.collection("machines")
      .find(machineMatchStage)
      .project({
        _id: 1,
        serialNumber: 1,
        "Custom.name": 1,
        gamingLocation: 1,
        game: 1,
        manuf: 1,
        lastActivity: 1,
        isSasMachine: 1,
        sasMeters: 1,
        gameConfig: 1,
      })
      .toArray();

    console.log(`🔍 Found ${machines.length} machines for analysis`);

    // Get all gaming locations for name resolution
    const locations = await db.collection("gaminglocations").find({
      deletedAt: { $in: [null, new Date(-1)] }
    }).project({ _id: 1, name: 1 }).toArray();

    // Create a map for quick location name lookup
    const locationMap = new Map();
    locations.forEach((loc: any) => {
      locationMap.set(loc._id.toString(), loc.name);
    });

    // Transform machines data and resolve location names
    const transformedMachines = machines.map((machine: any) => {
      // Resolve location name using gamingLocation field
      const locationName = machine.gamingLocation ? 
        locationMap.get(machine.gamingLocation.toString()) || "Unknown Location" : 
        "Unknown Location";

      return {
        machineId: machine._id.toString(),
        machineName: machine.Custom?.name || machine.serialNumber || "Unknown Machine",
        locationId: machine.gamingLocation?.toString() || "",
        locationName: locationName,
        gameTitle: machine.game || "Unknown Game",
        manufacturer: machine.manuf || "Unknown Manufacturer",
        isOnline: machine.lastActivity && new Date(machine.lastActivity) >= new Date(Date.now() - 3 * 60 * 1000),
        lastActivity: machine.lastActivity,
        isSasEnabled: machine.isSasMachine || false,
        coinIn: machine.sasMeters?.coinIn || 0,
        coinOut: machine.sasMeters?.coinOut || 0,
        netWin: (machine.sasMeters?.drop || 0) - (machine.sasMeters?.totalCancelledCredits || 0),
        theoreticalHold: machine.gameConfig?.theoreticalRtp || 0,
        gamesPlayed: machine.sasMeters?.gamesPlayed || 0,
        avgBet: machine.sasMeters?.avgBet || 0,
        drop: machine.sasMeters?.drop || 0,
        cancelledCredits: machine.sasMeters?.totalCancelledCredits || 0,
      };
    });

    console.log("🔍 All machines for analysis completed:", transformedMachines.length);

    return NextResponse.json({
      data: transformedMachines,
      pagination: {
        totalCount: transformedMachines.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      }
    });
  } catch (error) {
    console.error("Error in getAllMachines:", error);
    return NextResponse.json({ error: "Failed to fetch all machines" }, { status: 500 });
  }
};

// Offline machines endpoint - for Offline Machines tab
const getOfflineMachines = async (db: any, searchParams: URLSearchParams, startDate: Date, endDate: Date) => {
  try {
    const licencee = searchParams.get("licencee");
    const timePeriod = searchParams.get("timePeriod");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const searchTerm = searchParams.get("search");

    // Build machine filter for offline machines
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    const machineMatchStage: any = {
      deletedAt: { $in: [null, new Date(-1)] },
      lastActivity: { 
        $lt: threeMinutesAgo,
        $gte: startDate,
        $lte: endDate
      }
    };

    // Add licencee filter if specified
    if (licencee && licencee !== "all") {
      machineMatchStage["locationDetails.rel.licencee"] = licencee;
    }

    // Add search filter if specified
    if (searchTerm && searchTerm.trim()) {
      machineMatchStage.$or = [
        { serialNumber: { $regex: searchTerm, $options: "i" } },
        { game: { $regex: searchTerm, $options: "i" } },
        { manuf: { $regex: searchTerm, $options: "i" } },
        { "Custom.name": { $regex: searchTerm, $options: "i" } }
      ];
    }

    // Get offline machines
    const machines = await db.collection("machines")
      .find(machineMatchStage)
      .project({
        _id: 1,
        serialNumber: 1,
        "Custom.name": 1,
        gamingLocation: 1,
        game: 1,
        manuf: 1,
        lastActivity: 1,
        isSasMachine: 1,
        sasMeters: 1,
        gameConfig: 1,
      })
      .toArray();

    console.log(`🔍 Found ${machines.length} offline machines`);

    // Get all gaming locations for name resolution
    const locations = await db.collection("gaminglocations").find({
      deletedAt: { $in: [null, new Date(-1)] }
    }).project({ _id: 1, name: 1 }).toArray();

    // Create a map for quick location name lookup
    const locationMap = new Map();
    locations.forEach((loc: any) => {
      locationMap.set(loc._id.toString(), loc.name);
    });

    // Transform machines data and resolve location names
    const transformedMachines = machines.map((machine: any) => {
      // Resolve location name using gamingLocation field
      const locationName = machine.gamingLocation ? 
        locationMap.get(machine.gamingLocation.toString()) || "Unknown Location" : 
        "Unknown Location";

      return {
        machineId: machine._id.toString(),
        machineName: machine.Custom?.name || machine.serialNumber || "Unknown Machine",
        locationId: machine.gamingLocation?.toString() || "",
        locationName: locationName,
        gameTitle: machine.game || "Unknown Game",
        manufacturer: machine.manuf || "Unknown Manufacturer",
        isOnline: false, // All machines in this query are offline
        lastActivity: machine.lastActivity,
        isSasEnabled: machine.isSasMachine || false,
        coinIn: machine.sasMeters?.coinIn || 0,
        coinOut: machine.sasMeters?.coinOut || 0,
        netWin: (machine.sasMeters?.drop || 0) - (machine.sasMeters?.totalCancelledCredits || 0),
        theoreticalHold: machine.gameConfig?.theoreticalRtp || 0,
        gamesPlayed: machine.sasMeters?.gamesPlayed || 0,
        avgBet: machine.sasMeters?.avgBet || 0,
        drop: machine.sasMeters?.drop || 0,
        cancelledCredits: machine.sasMeters?.totalCancelledCredits || 0,
      };
    });

    console.log("🔍 Offline machines completed:", transformedMachines.length);

    return NextResponse.json({
      data: transformedMachines,
      pagination: {
        totalCount: transformedMachines.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      }
    });
  } catch (error) {
    console.error("Error in getOfflineMachines:", error);
    return NextResponse.json({ error: "Failed to fetch offline machines" }, { status: 500 });
  }
}; 