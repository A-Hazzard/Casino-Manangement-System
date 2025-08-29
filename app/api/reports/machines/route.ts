import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { getDatesForTimePeriod } from "@/app/api/lib/utils/dates";
import { TimePeriod } from "@/app/api/lib/types";
import { Db, Document } from "mongodb";
// Removed auto-index creation to avoid conflicts and extra latency

export async function GET(req: NextRequest) {

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // 'overview', 'stats', 'all', 'offline'
    const timePeriod =
      (searchParams.get("timePeriod") as TimePeriod) || "Today";
    const licencee = searchParams.get("licencee") || undefined;
    const onlineStatus = searchParams.get("onlineStatus") || "all"; // New parameter for online/offline filtering
    const searchTerm = searchParams.get("search"); // Extract search parameter
    const locationId = searchParams.get("locationId"); // Extract locationId parameter

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
    const machineMatchStage: Record<string, unknown> = {
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
    if (searchTerm && searchTerm.trim()) {
      machineMatchStage.$or = [
        { serialNumber: { $regex: searchTerm, $options: "i" } },
        { origSerialNumber: { $regex: searchTerm, $options: "i" } },
        { game: { $regex: searchTerm, $options: "i" } },
        { manuf: { $regex: searchTerm, $options: "i" } },
        { "Custom.name": { $regex: searchTerm, $options: "i" } },
      ];
    }

    // Add location filter if specified
    if (locationId && locationId !== "all") {
      machineMatchStage.gamingLocation = locationId;
    }

    // Build location filter for licensee
    const locationMatchStage: Record<string, unknown> = {
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



// Stats endpoint - returns total counts and financial totals
const getMachineStats = async (
  db: Db, // MongoDB database connection
  machineMatchStage: Record<string, unknown>,
  locationMatchStage: Record<string, unknown>,
  startDate: Date | undefined,
  endDate: Date | undefined
) => {
  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

  // Use aggregation to join machines with gaminglocations for licensee filtering
  const aggregationPipeline: Document[] = [
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
    (aggregationPipeline as unknown[]).push({
      $match: {
        "locationDetails.rel.licencee": (locationMatchStage as Record<string, unknown>)[
          "rel.licencee"
        ],
      },

    });
  }

  // Get total machines count (only machines with lastActivity field)
  const totalCountResult = await db
    .collection("machines")
    .aggregate([
      ...aggregationPipeline,
      { $match: { lastActivity: { $exists: true } } },
      { $count: "total" }
    ] as Document[])
    .toArray();
  const totalCount = totalCountResult[0]?.total || 0;

  // Get online machines count (machines with lastActivity >= 3 minutes ago)
  const onlineCountResult = await db
    .collection("machines")
    .aggregate([
      ...aggregationPipeline,
      { $match: { lastActivity: { $exists: true, $gte: threeMinutesAgo } } },
      { $count: "total" },
    ] as Document[])
    .toArray();
  const onlineCount = onlineCountResult[0]?.total || 0;

  // Calculate financial totals from meters collection within the date filter
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
      // Add meters lookup with proper aggregation
      {
        $lookup: {
          from: "meters",
          let: { machineId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$machine", "$$machineId"] },
                    // Only include meters within the date range if dates are provided
                    ...(startDate && endDate ? [
                      { $gte: ["$readAt", startDate] },
                      { $lte: ["$readAt", endDate] }
                    ] : [])
                  ],
                },
              },
            },
            // Sum up the movement data
            {
              $group: {
                _id: null,
                drop: { $sum: { $ifNull: ["$movement.drop", 0] } },
                moneyOut: { $sum: { $ifNull: ["$movement.totalCancelledCredits", 0] } },
                coinIn: { $sum: { $ifNull: ["$movement.coinIn", 0] } },
                coinOut: { $sum: { $ifNull: ["$movement.coinOut", 0] } },
              },
            },
          ],
          as: "meterData",
        },
      },
      {
        $unwind: {
          path: "$meterData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: null,
          totalGross: {
            $sum: {
              $subtract: [
                { $ifNull: ["$meterData.drop", 0] },
                { $ifNull: ["$meterData.moneyOut", 0] },
              ],
            },
          },
          totalDrop: { $sum: { $ifNull: ["$meterData.drop", 0] } },
          totalCancelledCredits: {
            $sum: { $ifNull: ["$meterData.moneyOut", 0] },
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
  db: Db, // MongoDB database connection
  machineMatchStage: Record<string, unknown>,
  locationMatchStage: Record<string, unknown>,
  page: number,
  limit: number,
  skip: number,
  startDate: Date | undefined,
  endDate: Date | undefined
) => {
  // console.log("🚀 Getting overview machines with pagination...");

  // Step 1: Get machines with proper meters aggregation using the working pattern
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
    (aggregationPipeline as unknown[]).push({
      $match: {
        "locationDetails.rel.licencee": locationMatchStage["rel.licencee"],
      },
    });
  }

  // Add meters lookup with proper aggregation (following the working pattern)
  (aggregationPipeline as unknown[]).push(
    {
      $lookup: {
        from: "meters",
        let: { machineId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$machine", "$$machineId"] },
                  // Only include meters within the date range if dates are provided
                  ...(startDate && endDate ? [
                    { $gte: ["$readAt", startDate] },
                    { $lte: ["$readAt", endDate] }
                  ] : [])
                ],
              },
            },
          },
          // Sum up the movement data
          {
            $group: {
              _id: null,
              drop: { $sum: { $ifNull: ["$movement.drop", 0] } },
              moneyOut: { $sum: { $ifNull: ["$movement.totalCancelledCredits", 0] } },
              coinIn: { $sum: { $ifNull: ["$movement.coinIn", 0] } },
              coinOut: { $sum: { $ifNull: ["$movement.coinOut", 0] } },
              gamesPlayed: { $sum: { $ifNull: ["$movement.gamesPlayed", 0] } },
              jackpot: { $sum: { $ifNull: ["$movement.jackpot", 0] } },
            },
          },
        ],
        as: "meterData",
      },
    },
    {
      $unwind: {
        path: "$meterData",
        preserveNullAndEmptyArrays: true,
      },
    }
  );

  // Add projection with calculated fields
  (aggregationPipeline as unknown[]).push(
    {
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
        gameConfig: 1,
        locationName: "$locationDetails.name",
        // Financial metrics from meters aggregation
        drop: { $ifNull: ["$meterData.drop", 0] },
        moneyOut: { $ifNull: ["$meterData.moneyOut", 0] },
        coinIn: { $ifNull: ["$meterData.coinIn", 0] },
        coinOut: { $ifNull: ["$meterData.coinOut", 0] },
        gamesPlayed: { $ifNull: ["$meterData.gamesPlayed", 0] },
        jackpot: { $ifNull: ["$meterData.jackpot", 0] },
        // Calculate netWin and gross
        netWin: {
          $subtract: [
            { $ifNull: ["$meterData.drop", 0] },
            { $ifNull: ["$meterData.moneyOut", 0] }
          ]
        },
        gross: {
          $subtract: [
            { $ifNull: ["$meterData.drop", 0] },
            { $ifNull: ["$meterData.moneyOut", 0] }
          ]
        },
        // Calculate actual hold percentage: (win / handle) * 100 where win = coinIn - coinOut, handle = coinIn
        holdPct: {
          $cond: [
            { $gt: [{ $ifNull: ["$meterData.coinIn", 0] }, 0] },
            { $multiply: [{ $divide: [{ $subtract: [{ $ifNull: ["$meterData.coinIn", 0] }, { $ifNull: ["$meterData.coinOut", 0] }] }, { $ifNull: ["$meterData.coinIn", 0] }] }, 100] },
            0
          ]
        }
      },
    },
    // Sort by netWin descending (highest first) as default
    { $sort: { netWin: -1 } },
    { $skip: skip },
    { $limit: limit }
  );

  const machines = await db
    .collection("machines")
    .aggregate(aggregationPipeline as Document[])
    .toArray();

  // console.log(`🔍 Found ${machines.length} machines for overview`);

  // Transform machines data using the new structure
  const transformedMachines = machines.map((machine: Record<string, unknown>) => {
    return {
      machineId: (machine._id as string).toString(),
      machineName:
        (machine.Custom as Record<string, unknown>)?.name || machine.serialNumber || "Unknown Machine",
      locationId: machine.gamingLocation?.toString() || "",
      locationName: machine.locationName || "Unknown Location",
      gameTitle: machine.game || "Unknown Game",
      manufacturer: machine.manuf || "Unknown Manufacturer",
      isOnline: !!(
        machine.lastActivity &&
        new Date(machine.lastActivity as string) >= new Date(Date.now() - 3 * 60 * 1000)
      ),
      lastActivity: machine.lastActivity,
      isSasEnabled: machine.isSasMachine || false,
      // Use the aggregated financial data
      drop: machine.drop || 0,
      totalCancelledCredits: machine.moneyOut || 0,
      netWin: machine.netWin || 0,
      gross: machine.gross || 0,
      theoreticalHold: (machine.gameConfig as Record<string, unknown>)?.theoreticalRtp 
        ? (1 - Number((machine.gameConfig as Record<string, unknown>).theoreticalRtp)) * 100
        : 0,
      gamesPlayed: machine.gamesPlayed || 0,
      jackpot: machine.jackpot || 0,
      // Calculate derived fields properly
      coinIn: machine.coinIn || 0, // Handle (betting activity)
      coinOut: machine.coinOut || 0, // Automatic payouts
      avgBet: (machine.gamesPlayed as number || 0) > 0 ? (machine.coinIn as number || 0) / (machine.gamesPlayed as number || 1) : 0,
      // Use calculated hold percentage from aggregation
      actualHold: machine.holdPct || 0,
    };
  });

  // Step 4: Get total count for pagination using aggregation with licensee filtering
  const countPipeline: Document[] = [
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

  (countPipeline as unknown[]).push(
    { $count: "total" }
  );

  const totalCountResult = await db
    .collection("machines")
    .aggregate(countPipeline as Document[])
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
  db: Db, // MongoDB database connection
  searchParams: URLSearchParams,
  startDate: Date | undefined,
  endDate: Date | undefined,
  locationMatchStage: Record<string, unknown>
) => {
  try {
    const searchTerm = searchParams.get("search");

    // Build machine filter
    const machineMatchStage: Record<string, unknown> = {
      deletedAt: { $in: [null, new Date(-1)] },
    };

    // Note: We don't filter by lastActivity date here to include all machines
    // Date filtering will be applied to financial data in the aggregation

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
      (aggregationPipeline as unknown[]).push({
        $match: {
          "locationDetails.rel.licencee": locationMatchStage["rel.licencee"],
        },
      });
    }

    // Add meters lookup with proper aggregation
    (aggregationPipeline as unknown[]).push(
      {
        $lookup: {
          from: "meters",
          let: { machineId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$machine", "$$machineId"] },
                    // Only include meters within the date range if dates are provided
                    ...(startDate && endDate ? [
                      { $gte: ["$readAt", startDate] },
                      { $lte: ["$readAt", endDate] }
                    ] : [])
                  ],
                },
              },
            },
            // Sum up the movement data
            {
              $group: {
                _id: null,
                drop: { $sum: { $ifNull: ["$movement.drop", 0] } },
                moneyOut: { $sum: { $ifNull: ["$movement.totalCancelledCredits", 0] } },
                coinIn: { $sum: { $ifNull: ["$movement.coinIn", 0] } },
                coinOut: { $sum: { $ifNull: ["$movement.coinOut", 0] } },
                gamesPlayed: { $sum: { $ifNull: ["$movement.gamesPlayed", 0] } },
                jackpot: { $sum: { $ifNull: ["$movement.jackpot", 0] } },
              },
            },
          ],
          as: "meterData",
        },
      },
      {
        $unwind: {
          path: "$meterData",
          preserveNullAndEmptyArrays: true,
        },
      }
    );

    // Add projection
    (aggregationPipeline as unknown[]).push(
      {
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
          gameConfig: 1,
          locationName: "$locationDetails.name",
          // Financial metrics from meters aggregation
          drop: { $ifNull: ["$meterData.drop", 0] },
          moneyOut: { $ifNull: ["$meterData.moneyOut", 0] },
          gamesPlayed: { $ifNull: ["$meterData.gamesPlayed", 0] },
          jackpot: { $ifNull: ["$meterData.jackpot", 0] },
          // Calculate netWin and gross
          netWin: {
            $subtract: [
              { $ifNull: ["$meterData.drop", 0] },
              { $ifNull: ["$meterData.moneyOut", 0] }
            ]
          },
          gross: {
            $subtract: [
              { $ifNull: ["$meterData.drop", 0] },
              { $ifNull: ["$meterData.moneyOut", 0] }
            ]
          },
          // Calculate actual hold percentage: (win / handle) * 100 where win = coinIn - coinOut, handle = coinIn
          holdPct: {
            $cond: [
              { $gt: [{ $ifNull: ["$meterData.coinIn", 0] }, 0] },
              { $multiply: [{ $divide: [{ $subtract: [{ $ifNull: ["$meterData.coinIn", 0] }, { $ifNull: ["$meterData.coinOut", 0] }] }, { $ifNull: ["$meterData.coinIn", 0] }] }, 100] },
              0
            ]
          },
        },
      }
    );

    // Get all machines for analysis
    const machines = await db
      .collection("machines")
      .aggregate(aggregationPipeline as Document[])
      .toArray();

    // console.log(`🔍 Found ${machines.length} machines for analysis`);

    // Transform machines data using the new structure
    const transformedMachines = machines.map((machine: Record<string, unknown>) => {
      return {
        machineId: (machine._id as string).toString(),
        serialNumber:
          machine.serialNumber ||
          machine.origSerialNumber ||
          (machine._id as string).toString(),
        machineName:
          (machine.Custom as Record<string, unknown>)?.name || machine.serialNumber || "Unknown Machine",
        locationId: machine.gamingLocation?.toString() || "",
        locationName: machine.locationName || "Unknown Location",
        gameTitle: machine.game || "Unknown Game",
        manufacturer: machine.manuf || "Unknown Manufacturer",
        isOnline: !!(
          machine.lastActivity &&
          new Date(machine.lastActivity as string) >= new Date(Date.now() - 3 * 60 * 1000)
        ),
        lastActivity: machine.lastActivity,
        isSasEnabled: machine.isSasMachine || false,
        // Use the aggregated financial data
        drop: machine.drop || 0,
        totalCancelledCredits: machine.moneyOut || 0,
        netWin: machine.netWin || 0,
        gross: machine.gross || 0,
        theoreticalHold: (machine.gameConfig as Record<string, unknown>)?.theoreticalRtp 
          ? (1 - Number((machine.gameConfig as Record<string, unknown>).theoreticalRtp)) * 100
          : 0,
        gamesPlayed: machine.gamesPlayed || 0,
        jackpot: machine.jackpot || 0,
        // Calculate derived fields properly
        coinIn: machine.coinIn || 0, // Handle (betting activity)
        coinOut: machine.coinOut || 0, // Automatic payouts
        avgBet: (machine.gamesPlayed as number || 0) > 0 ? (machine.coinIn as number || 0) / (machine.gamesPlayed as number || 1) : 0,
        // Use calculated hold percentage from aggregation
        actualHold: machine.holdPct || 0,
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
  db: Db, // MongoDB database connection
  searchParams: URLSearchParams,
  startDate: Date | undefined,
  endDate: Date | undefined,
  locationMatchStage: Record<string, unknown>
) => {
  try {
    const searchTerm = searchParams.get("search");

    // Build machine filter for offline machines
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    const machineMatchStage: Record<string, unknown> = {
      deletedAt: { $in: [null, new Date(-1)] },
      lastActivity: { $exists: true, $lt: threeMinutesAgo },
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
      (aggregationPipeline as unknown[]).push(
  
        {
          $match: {
            "locationDetails.rel.licencee": (locationMatchStage as Record<string, unknown>)[
              "rel.licencee"
            ],
          },
        }
      );
    }

    // Add meters lookup with proper aggregation - For offline machines, aggregate all meter data within date range
    (aggregationPipeline as unknown[]).push(
      {
        $lookup: {
          from: "meters",
          let: { machineId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$machine", "$$machineId"] },
                    // Only include meters within the date range if dates are provided
                    ...(startDate && endDate ? [
                      { $gte: ["$readAt", startDate] },
                      { $lte: ["$readAt", endDate] }
                    ] : [])
                  ],
                },
              },
            },
            // Sum up all movement data within the date range
            {
              $group: {
                _id: null,
                drop: { $sum: { $ifNull: ["$movement.drop", 0] } },
                moneyOut: { $sum: { $ifNull: ["$movement.totalCancelledCredits", 0] } },
                coinIn: { $sum: { $ifNull: ["$movement.coinIn", 0] } },
                coinOut: { $sum: { $ifNull: ["$movement.coinOut", 0] } },
                gamesPlayed: { $sum: { $ifNull: ["$movement.gamesPlayed", 0] } },
                jackpot: { $sum: { $ifNull: ["$movement.jackpot", 0] } },
              },
            },
          ],
          as: "meterData",
        },
      },
      {
        $unwind: {
          path: "$meterData",
          preserveNullAndEmptyArrays: true,
        },
      }
    );

    // Add projection
    (aggregationPipeline as unknown[]).push(
      {
        $project: {
          _id: 1,
          serialNumber: 1,
          "Custom.name": 1,
          gamingLocation: 1,
          game: 1,
          manuf: 1,
          lastActivity: 1,
          isSasMachine: 1,
          gameConfig: 1,
          locationName: "$locationDetails.name",
          // Financial metrics from meters aggregation
          drop: { $ifNull: ["$meterData.drop", 0] },
          moneyOut: { $ifNull: ["$meterData.moneyOut", 0] },
          gamesPlayed: { $ifNull: ["$meterData.gamesPlayed", 0] },
          jackpot: { $ifNull: ["$meterData.jackpot", 0] },
          // Calculate netWin and gross
          netWin: {
            $subtract: [
              { $ifNull: ["$meterData.drop", 0] },
              { $ifNull: ["$meterData.moneyOut", 0] }
            ]
          },
          gross: {
            $subtract: [
              { $ifNull: ["$meterData.drop", 0] },
              { $ifNull: ["$meterData.moneyOut", 0] }
            ]
          },
          // Calculate actual hold percentage: (win / handle) * 100 where win = coinIn - coinOut, handle = coinIn
          holdPct: {
            $cond: [
              { $gt: [{ $ifNull: ["$meterData.coinIn", 0] }, 0] },
              { $multiply: [{ $divide: [{ $subtract: [{ $ifNull: ["$meterData.coinIn", 0] }, { $ifNull: ["$meterData.coinOut", 0] }] }, { $ifNull: ["$meterData.coinIn", 0] }] }, 100] },
              0
            ]
          },
        },
      },
      // Sort by netWin descending (highest first)
      { $sort: { netWin: -1 } }
    );

    // Get offline machines
    const machines = await db
      .collection("machines")
      .aggregate(aggregationPipeline as Document[])
      .toArray();

    // console.log(`🔍 Found ${machines.length} offline machines`);

    // Transform machines data using the new structure
    const transformedMachines = machines.map((machine: Record<string, unknown>) => {
      return {
        machineId: (machine._id as string).toString(),
        machineName:
          (machine.Custom as Record<string, unknown>)?.name || machine.serialNumber || "Unknown Machine",
        locationId: machine.gamingLocation?.toString() || "",
        locationName: machine.locationName || "Unknown Location",
        gameTitle: machine.game || "Unknown Game",
        manufacturer: machine.manuf || "Unknown Manufacturer",
        isOnline: false, // All machines in this query are offline
        lastActivity: machine.lastActivity,
        isSasEnabled: machine.isSasMachine || false,
        // Use the aggregated financial data
        drop: machine.drop || 0,
        totalCancelledCredits: machine.moneyOut || 0,
        netWin: machine.netWin || 0,
        gross: machine.gross || 0,
        theoreticalHold: (machine.gameConfig as Record<string, unknown>)?.theoreticalRtp 
          ? (1 - Number((machine.gameConfig as Record<string, unknown>).theoreticalRtp)) * 100
          : 0,
        gamesPlayed: machine.gamesPlayed || 0,
        jackpot: machine.jackpot || 0,
        // Calculate derived fields properly
        coinIn: machine.coinIn || 0, // Handle (betting activity)
        coinOut: machine.coinOut || 0, // Automatic payouts
        avgBet: (machine.gamesPlayed as number || 0) > 0 ? (machine.coinIn as number || 0) / (machine.gamesPlayed as number || 1) : 0,
        // Use calculated hold percentage from aggregation
        actualHold: machine.holdPct || 0,
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