import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { getDatesForTimePeriod } from "@/app/api/lib/utils/dates";
import { TimePeriod } from "@/app/api/lib/types";
// Removed auto-index creation to avoid conflicts and extra latency

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // 'overview', 'stats', 'all', 'offline'
    const timePeriod =
      (searchParams.get("timePeriod") as TimePeriod) || "Today";
    const licencee = searchParams.get("licencee") || undefined;
    const onlineStatus = searchParams.get("onlineStatus") || "all"; // New parameter for online/offline filtering

    // Pagination parameters for overview
    const page = parseInt(searchParams.get("page") || "1");
    const requestedLimit = parseInt(searchParams.get("limit") || "10");
    const limit = Math.min(requestedLimit, 10);
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

   
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: "DB connection failed" },
        { status: 500 }
      );
    }

    // Ensure indexes are created for optimal performance
    // Do not auto-create indexes on every request

    // Build machine filter for all queries
    const machineMatchStage: any = {
      deletedAt: { $in: [null, new Date(-1)] },
    };

    // Add online status filter
    if (onlineStatus !== "all") {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      if (onlineStatus === "online") {
        machineMatchStage.lastActivity = {
          $gte: threeMinutesAgo,
        };
      } else if (onlineStatus === "offline") {
        machineMatchStage.$or = [
          { lastActivity: { $lt: threeMinutesAgo } },
          { lastActivity: { $exists: false } },
        ];
      }
    } else {
      // For "all" status, include machines with or without lastActivity
      // This ensures we get all machines regardless of lastActivity field
    }

    // Add search filter if specified
    const searchTerm = searchParams.get("search");
    if (searchTerm && searchTerm.trim()) {
      machineMatchStage.$or = [
        { serialNumber: { $regex: searchTerm, $options: "i" } },
        { origSerialNumber: { $regex: searchTerm, $options: "i" } },
        { game: { $regex: searchTerm, $options: "i" } },
        { manuf: { $regex: searchTerm, $options: "i" } },
        { "Custom.name": { $regex: searchTerm, $options: "i" } },
      ];
    }

    // Build location filter for licensee
    const locationMatchStage: any = {
      deletedAt: { $in: [null, new Date(-1)] },
    };

    // Add licencee filter if specified
    if (licencee && licencee !== "all") {
      locationMatchStage["rel.licencee"] = licencee;
    }

    // Route to appropriate handler based on type
    switch (type) {
      case "stats":
        return await getMachineStats(
          db,
          machineMatchStage,
          locationMatchStage,
          startDate,
          endDate
        );
      case "overview":
        return await getOverviewMachines(
          db,
          machineMatchStage,
          locationMatchStage,
          page,
          limit,
          skip,
          startDate,
          endDate
        );
      case "all":
        return await getAllMachines(
          db,
          searchParams,
          startDate,
          endDate,
          locationMatchStage
        );
      case "offline":
        return await getOfflineMachines(
          db,
          searchParams,
          startDate,
          endDate,
          locationMatchStage
        );
      default:
        return await getOverviewMachines(
          db,
          machineMatchStage,
          locationMatchStage,
          page,
          limit,
          skip,
          startDate,
          endDate
        );
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
    lastActivity: { $gte: threeMinutesAgo },
  });

  return onlineCount;
};

// Stats endpoint - returns total counts and financial totals
const getMachineStats = async (
  db: any,
  machineMatchStage: any,
  locationMatchStage: any,
  startDate: Date | undefined,
  endDate: Date | undefined
) => {
  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

  // Use aggregation to join machines with gaminglocations for licensee filtering
  const aggregationPipeline = [
    { $match: { deletedAt: { $in: [null, new Date(-1)] } } },
    {
      $lookup: {
        from: "gaminglocations",
        localField: "gamingLocation",
        foreignField: "_id",
        as: "locationDetails",
      },
    },
    { $unwind: { path: "$locationDetails", preserveNullAndEmptyArrays: true } },
  ];

  // Add location filter if licensee is specified
  if (
    locationMatchStage &&
    typeof locationMatchStage === "object" &&
    "rel.licencee" in locationMatchStage
  ) {
    aggregationPipeline.push({
      $match: {
        "locationDetails.rel.licencee": (locationMatchStage as any)[
          "rel.licencee"
        ],
      },
    } as any);
  }

  // Get total machines count
  const totalCountResult = await db
    .collection("machines")
    .aggregate([...aggregationPipeline, { $count: "total" } as any])
    .toArray();
  const totalCount = totalCountResult[0]?.total || 0;

  // Get online machines count
  const onlineCountResult = await db
    .collection("machines")
    .aggregate([
      ...aggregationPipeline,
      { $match: { lastActivity: { $gte: threeMinutesAgo } } } as any,
      { $count: "total" } as any,
    ])
    .toArray();
  const onlineCount = onlineCountResult[0]?.total || 0;

  // Calculate financial totals from machines within the date filter
  const financialTotals = await db
    .collection("machines")
    .aggregate([
      { $match: machineMatchStage },
      {
        $lookup: {
          from: "gaminglocations",
          localField: "gamingLocation",
          foreignField: "_id",
          as: "locationDetails",
        },
      },
      {
        $unwind: { path: "$locationDetails", preserveNullAndEmptyArrays: true },
      },
      // Add location filter if licensee is specified
      ...(locationMatchStage &&
      typeof locationMatchStage === "object" &&
      "rel.licencee" in locationMatchStage
        ? [
            {
              $match: {
                "locationDetails.rel.licencee":
                  locationMatchStage["rel.licencee"],
              },
            },
          ]
        : []),
      // Add date filter for financial data (only include machines with activity in the date range)
      { $match: { lastActivity: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: null,
          totalGross: {
            $sum: {
              $subtract: [
                { $ifNull: ["$sasMeters.drop", 0] },
                { $ifNull: ["$sasMeters.totalCancelledCredits", 0] },
              ],
            },
          },
          totalDrop: { $sum: { $ifNull: ["$sasMeters.drop", 0] } },
          totalCancelledCredits: {
            $sum: { $ifNull: ["$sasMeters.totalCancelledCredits", 0] },
          },
        },
      },
    ])
    .toArray();

  const totals = financialTotals[0] || {
    totalGross: 0,
    totalDrop: 0,
    totalCancelledCredits: 0,
  };



  return NextResponse.json({
    onlineCount,
    offlineCount: totalCount - onlineCount,
    totalCount,
    totalGross: totals.totalGross || 0,
    totalDrop: totals.totalDrop || 0,
    totalCancelledCredits: totals.totalCancelledCredits || 0,
  });
};

// Overview endpoint - paginated machines for overview tab
const getOverviewMachines = async (
  db: any,
  machineMatchStage: any,
  locationMatchStage: any,
  page: number,
  limit: number,
  skip: number,
  startDate: Date | undefined,
  endDate: Date | undefined
) => {
  // console.log("🚀 Getting overview machines with pagination...");

  // Step 1: Get machines with minimal data (paginated) using aggregation
  const aggregationPipeline = [
    { $match: machineMatchStage },
    {
      $lookup: {
        from: "gaminglocations",
        localField: "gamingLocation",
        foreignField: "_id",
        as: "locationDetails",
      },
    },
    { $unwind: { path: "$locationDetails", preserveNullAndEmptyArrays: true } },
  ];

  // Add location filter if licensee is specified
  if (locationMatchStage && locationMatchStage["rel.licencee"]) {
    aggregationPipeline.push({
      $match: {
        "locationDetails.rel.licencee": locationMatchStage["rel.licencee"],
      },
    });
  }

  // Add projection, sort, skip, and limit
  aggregationPipeline.push(
    {
      $project: {
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
        gameConfig: 1,
        locationName: "$locationDetails.name",
      },
    } as any,
    { $sort: { "sasMeters.coinIn": -1 } } as any,
    { $skip: skip } as any,
    { $limit: limit } as any
  );

  const machines = await db
    .collection("machines")
    .aggregate(aggregationPipeline)
    .toArray();

  // console.log(`🔍 Found ${machines.length} machines for overview`);

  // Transform machines data using locationName from aggregation
  const transformedMachines = machines.map((machine: any) => {
    // Check if machine has activity in the date range for financial data
    const hasActivityInRange =
      machine.lastActivity &&
      startDate &&
      endDate &&
      new Date(machine.lastActivity) >= startDate &&
      new Date(machine.lastActivity) <= endDate;

    return {
      machineId: machine._id.toString(),
      machineName:
        machine.Custom?.name || machine.serialNumber || "Unknown Machine",
      locationId: machine.gamingLocation?.toString() || "",
      locationName: machine.locationName || "Unknown Location",
      gameTitle: machine.game || "Unknown Game",
      manufacturer: machine.manuf || "Unknown Manufacturer",
      isOnline: !!(
        machine.lastActivity &&
        new Date(machine.lastActivity) >= new Date(Date.now() - 3 * 60 * 1000)
      ),
      lastActivity: machine.lastActivity,
      isSasEnabled: machine.isSasMachine || false,
      coinIn: hasActivityInRange ? machine.sasMeters?.coinIn || 0 : 0,
      coinOut: hasActivityInRange ? machine.sasMeters?.coinOut || 0 : 0,
      netWin: hasActivityInRange
        ? (machine.sasMeters?.drop || 0) -
          (machine.sasMeters?.totalCancelledCredits || 0)
        : 0,
      theoreticalHold: machine.gameConfig?.theoreticalRtp || 0,
      gamesPlayed: hasActivityInRange ? machine.sasMeters?.gamesPlayed || 0 : 0,
      avgBet: hasActivityInRange ? machine.sasMeters?.avgBet || 0 : 0,
      drop: hasActivityInRange ? machine.sasMeters?.drop || 0 : 0,
      cancelledCredits: hasActivityInRange
        ? machine.sasMeters?.totalCancelledCredits || 0
        : 0,
    };
  });

  // Step 4: Get total count for pagination using aggregation with licensee filtering
  const countPipeline = [
    { $match: machineMatchStage },
    {
      $lookup: {
        from: "gaminglocations",
        localField: "gamingLocation",
        foreignField: "_id",
        as: "locationDetails",
      },
    },
    { $unwind: { path: "$locationDetails", preserveNullAndEmptyArrays: true } },
  ];

  // Add location filter if licensee is specified
  if (locationMatchStage && locationMatchStage["rel.licencee"]) {
    countPipeline.push({
      $match: {
        "locationDetails.rel.licencee": locationMatchStage["rel.licencee"],
      },
    });
  }

  countPipeline.push({ $count: "total" } as any);

  const totalCountResult = await db
    .collection("machines")
    .aggregate(countPipeline)
    .toArray();

  const totalCount = totalCountResult[0]?.total || 0;
  const totalPages = Math.ceil(totalCount / limit);

  

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
const getAllMachines = async (
  db: any,
  searchParams: URLSearchParams,
  startDate: Date | undefined,
  endDate: Date | undefined,
  locationMatchStage: any
) => {
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

    // Note: We don't filter by lastActivity date here to include all machines
    // Date filtering will be applied to financial data in the transformation

    // Add search filter if specified
    if (searchTerm && searchTerm.trim()) {
      machineMatchStage.$or = [
        { serialNumber: { $regex: searchTerm, $options: "i" } },
        { game: { $regex: searchTerm, $options: "i" } },
        { manuf: { $regex: searchTerm, $options: "i" } },
        { "Custom.name": { $regex: searchTerm, $options: "i" } },
      ];
    }

    // Use aggregation to join machines with gaminglocations for licensee filtering
    const aggregationPipeline = [
      { $match: machineMatchStage },
      {
        $lookup: {
          from: "gaminglocations",
          localField: "gamingLocation",
          foreignField: "_id",
          as: "locationDetails",
        },
      },
      {
        $unwind: { path: "$locationDetails", preserveNullAndEmptyArrays: true },
      },
    ];

    // Add location filter if licensee is specified
    if (locationMatchStage["rel.licencee"]) {
      aggregationPipeline.push({
        $match: {
          "locationDetails.rel.licencee": locationMatchStage["rel.licencee"],
        },
      });
    }

    // Add projection
    aggregationPipeline.push({
      $project: {
        _id: 1,
        serialNumber: 1,
        origSerialNumber: 1,
        "Custom.name": 1,
        gamingLocation: 1,
        game: 1,
        manuf: 1,
        lastActivity: 1,
        isSasMachine: 1,
        sasMeters: 1,
        gameConfig: 1,
        locationName: "$locationDetails.name",
      },
    } as any);

    // Get all machines for analysis
    const machines = await db
      .collection("machines")
      .aggregate(aggregationPipeline)
      .toArray();

    // console.log(`🔍 Found ${machines.length} machines for analysis`);

    // Transform machines data using locationName from aggregation
    const transformedMachines = machines.map((machine: any) => {
      // Check if machine has activity in the date range for financial data
      const hasActivityInRange =
        machine.lastActivity &&
        startDate &&
        endDate &&
        new Date(machine.lastActivity) >= startDate &&
        new Date(machine.lastActivity) <= endDate;

      return {
        machineId: machine._id.toString(),
        serialNumber:
          machine.serialNumber ||
          machine.origSerialNumber ||
          machine._id.toString(),
        machineName:
          machine.Custom?.name || machine.serialNumber || "Unknown Machine",
        locationId: machine.gamingLocation?.toString() || "",
        locationName: machine.locationName || "Unknown Location",
        gameTitle: machine.game || "Unknown Game",
        manufacturer: machine.manuf || "Unknown Manufacturer",
        isOnline: !!(
          machine.lastActivity &&
          new Date(machine.lastActivity) >= new Date(Date.now() - 3 * 60 * 1000)
        ),
        lastActivity: machine.lastActivity,
        isSasEnabled: machine.isSasMachine || false,
        coinIn: hasActivityInRange ? machine.sasMeters?.coinIn || 0 : 0,
        coinOut: hasActivityInRange ? machine.sasMeters?.coinOut || 0 : 0,
        netWin: hasActivityInRange
          ? (machine.sasMeters?.drop || 0) -
            (machine.sasMeters?.totalCancelledCredits || 0)
          : 0,
        theoreticalHold: machine.gameConfig?.theoreticalRtp || 0,
        gamesPlayed: hasActivityInRange
          ? machine.sasMeters?.gamesPlayed || 0
          : 0,
        avgBet: hasActivityInRange ? machine.sasMeters?.avgBet || 0 : 0,
        drop: hasActivityInRange ? machine.sasMeters?.drop || 0 : 0,
        cancelledCredits: hasActivityInRange
          ? machine.sasMeters?.totalCancelledCredits || 0
          : 0,
      };
    });



    return NextResponse.json({
      data: transformedMachines,
      pagination: {
        totalCount: transformedMachines.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
  } catch (error) {
    console.error("Error in getAllMachines:", error);
    return NextResponse.json(
      { error: "Failed to fetch all machines" },
      { status: 500 }
    );
  }
};

// Offline machines endpoint - for Offline Machines tab
const getOfflineMachines = async (
  db: any,
  searchParams: URLSearchParams,
  startDate: Date | undefined,
  endDate: Date | undefined,
  locationMatchStage: any
) => {
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
      $or: [
        { lastActivity: { $lt: threeMinutesAgo } },
        { lastActivity: { $exists: false } },
      ],
    };

    // Add search filter if specified
    if (searchTerm && searchTerm.trim()) {
      machineMatchStage.$or = [
        { serialNumber: { $regex: searchTerm, $options: "i" } },
        { game: { $regex: searchTerm, $options: "i" } },
        { manuf: { $regex: searchTerm, $options: "i" } },
        { "Custom.name": { $regex: searchTerm, $options: "i" } },
      ];
    }

    // Use aggregation to join machines with gaminglocations for licensee filtering
    const aggregationPipeline = [
      { $match: machineMatchStage },
      {
        $lookup: {
          from: "gaminglocations",
          localField: "gamingLocation",
          foreignField: "_id",
          as: "locationDetails",
        },
      },
      {
        $unwind: { path: "$locationDetails", preserveNullAndEmptyArrays: true },
      },
    ];

    // Add location filter if licensee is specified
    if (
      locationMatchStage &&
      typeof locationMatchStage === "object" &&
      "rel.licencee" in locationMatchStage
    ) {
      aggregationPipeline.push({
        $match: {
          "locationDetails.rel.licencee": (locationMatchStage as any)[
            "rel.licencee"
          ],
        },
      } as any);
    }

    // Add projection
    aggregationPipeline.push({
      $project: {
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
        locationName: "$locationDetails.name",
      },
    } as any);

    // Get offline machines
    const machines = await db
      .collection("machines")
      .aggregate(aggregationPipeline)
      .toArray();

    // console.log(`🔍 Found ${machines.length} offline machines`);

    // Transform machines data using locationName from aggregation
    const transformedMachines = machines.map((machine: any) => {
      // Check if machine has activity in the date range for financial data
      const hasActivityInRange =
        machine.lastActivity &&
        startDate &&
        endDate &&
        new Date(machine.lastActivity) >= startDate &&
        new Date(machine.lastActivity) <= endDate;

      return {
        machineId: machine._id.toString(),
        machineName:
          machine.Custom?.name || machine.serialNumber || "Unknown Machine",
        locationId: machine.gamingLocation?.toString() || "",
        locationName: machine.locationName || "Unknown Location",
        gameTitle: machine.game || "Unknown Game",
        manufacturer: machine.manuf || "Unknown Manufacturer",
        isOnline: false, // All machines in this query are offline
        lastActivity: machine.lastActivity,
        isSasEnabled: machine.isSasMachine || false,
        coinIn: hasActivityInRange ? machine.sasMeters?.coinIn || 0 : 0,
        coinOut: hasActivityInRange ? machine.sasMeters?.coinOut || 0 : 0,
        netWin: hasActivityInRange
          ? (machine.sasMeters?.drop || 0) -
            (machine.sasMeters?.totalCancelledCredits || 0)
          : 0,
        theoreticalHold: machine.gameConfig?.theoreticalRtp || 0,
        gamesPlayed: hasActivityInRange
          ? machine.sasMeters?.gamesPlayed || 0
          : 0,
        avgBet: hasActivityInRange ? machine.sasMeters?.avgBet || 0 : 0,
        drop: hasActivityInRange ? machine.sasMeters?.drop || 0 : 0,
        cancelledCredits: hasActivityInRange
          ? machine.sasMeters?.totalCancelledCredits || 0
          : 0,
      };
    });

    // console.log("🔍 Offline machines completed:", transformedMachines.length);

    return NextResponse.json({
      data: transformedMachines,
      pagination: {
        totalCount: transformedMachines.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
  } catch (error) {
    console.error("Error in getOfflineMachines:", error);
    return NextResponse.json(
      { error: "Failed to fetch offline machines" },
      { status: 500 }
    );
  }
};
