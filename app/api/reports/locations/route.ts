import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { getDatesForTimePeriod } from "@/app/api/lib/utils/dates";
import { TimePeriod } from "@/app/api/lib/types";

// Removed auto-index creation to avoid conflicts and extra latency

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const timePeriod = (searchParams.get("timePeriod") as TimePeriod) || "7d";
    const licencee = searchParams.get("licencee") || undefined;

    const showAllLocations = searchParams.get("showAllLocations") === "true";

    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const requestedLimit = parseInt(searchParams.get("limit") || "10");
    const limit = Math.min(requestedLimit, 10); // Cap at 10 for faster loading
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

    // console.log("🔍 API - timePeriod:", timePeriod);
    // console.log("🔍 API - startDate:", startDate?.toISOString() || "All Time");
    // console.log("🔍 API - endDate:", endDate?.toISOString() || "All Time");
    // console.log("🔍 API - current system time:", new Date().toISOString());
    // console.log("🔍 API - licencee:", licencee);

    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: "DB connection failed" },
        { status: 500 }
      );
    }

    // Ensure indexes are created for optimal performance
    // Do not auto-create indexes on every request

    // Build location filter for the aggregation
    const locationMatchStage: Record<string, unknown> = {
      deletedAt: { $in: [null, new Date(-1)] },
    };

    if (licencee && licencee !== "all") {
      locationMatchStage["rel.licencee"] = licencee;
    }

    // console.log("🔍 API - Using optimized aggregation pipeline");

    // Use MongoDB aggregation pipeline for much better performance
    const aggregationPipeline = [
      // Stage 1: Start with locations
      {
        $match: locationMatchStage,
      },
      // Stage 2: Lookup machines for each location
      {
        $lookup: {
          from: "machines",
          let: { locationId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$gamingLocation", "$$locationId"] },
                deletedAt: { $in: [null, new Date(-1)] },
              },
            },
            {
              $project: {
                _id: 1,
                serialNumber: 1,
                game: 1,
                isSasMachine: 1,
                lastActivity: 1,
              },
            },
          ],
          as: "machines",
        },
      },
      // Stage 3: Lookup meters for each location (filtered by date)
      {
        $lookup: {
          from: "meters",
          let: { locationId: { $toString: "$_id" } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$location", "$$locationId"] },
                readAt: { $gte: startDate, $lte: endDate },
              },
            },
            {
              $group: {
                _id: null,
                totalMoneyIn: { $sum: { $ifNull: ["$movement.drop", 0] } },
                totalMoneyOut: {
                  $sum: { $ifNull: ["$movement.totalCancelledCredits", 0] },
                },
                meterCount: { $sum: 1 },
              },
            },
          ],
          as: "meterAggregation",
        },
      },
      // Stage 4: Add a flag to indicate if location has any data
      {
        $addFields: {
          hasData: {
            $or: [
              { $gt: [{ $size: "$machines" }, 0] },
              {
                $gt: [
                  {
                    $ifNull: [
                      { $arrayElemAt: ["$meterAggregation.totalMoneyIn", 0] },
                      0,
                    ],
                  },
                  0,
                ],
              },
            ],
          },
        },
      },
      // Stage 5: Filter locations based on showAllLocations parameter
      ...(showAllLocations ? [] : [{ $match: { hasData: true } }]),
      // Stage 6: Calculate metrics
      {
        $addFields: {
          location: { $toString: "$_id" },
          locationName: { $ifNull: ["$name", "Unknown Location"] },
          isLocalServer: { $ifNull: ["$isLocalServer", false] },
          totalMachines: { $size: "$machines" },
          onlineMachines: {
            $size: {
              $filter: {
                input: "$machines",
                cond: {
                  $and: [
                    { $ne: ["$$this.lastActivity", null] },
                    {
                      $gt: [
                        "$$this.lastActivity",
                        {
                          $dateSubtract: {
                            startDate: "$$NOW",
                            unit: "minute",
                            amount: 3,
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          },
          sasMachines: {
            $size: {
              $filter: {
                input: "$machines",
                cond: { $eq: ["$$this.isSasMachine", true] },
              },
            },
          },
          nonSasMachines: {
            $size: {
              $filter: {
                input: "$machines",
                cond: { $ne: ["$$this.isSasMachine", true] },
              },
            },
          },
          hasSasMachines: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$machines",
                    cond: { $eq: ["$$this.isSasMachine", true] },
                  },
                },
              },
              0,
            ],
          },
          hasNonSasMachines: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$machines",
                    cond: { $ne: ["$$this.isSasMachine", true] },
                  },
                },
              },
              0,
            ],
          },
          moneyIn: {
            $ifNull: [
              { $arrayElemAt: ["$meterAggregation.totalMoneyIn", 0] },
              0,
            ],
          },
          moneyOut: {
            $ifNull: [
              { $arrayElemAt: ["$meterAggregation.totalMoneyOut", 0] },
              0,
            ],
          },
        },
      },
      // Stage 7: Calculate gross revenue
      {
        $addFields: {
          gross: { $subtract: ["$moneyIn", "$moneyOut"] },
        },
      },
      // Stage 8: Sort by gross revenue (highest first)
      {
        $sort: { gross: -1 },
      },
      // Stage 9: Apply pagination
      {
        $facet: {
          metadata: [{ $count: "totalCount" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ];

    // console.log("🔍 API - Executing aggregation pipeline...");
    const result = await db
      .collection("gaminglocations")
      .aggregate(aggregationPipeline, {
        allowDiskUse: true, // Allow disk usage for large datasets
      })
      .toArray();

    // console.log("🔍 API - Aggregation completed");

    // Extract results
    const metadata = result[0]?.metadata[0] || { totalCount: 0 };
    const paginatedData = result[0]?.data || [];
    const totalCount = metadata.totalCount;
    const totalPages = Math.ceil(totalCount / limit);

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.warn("🔍 API - Request completed in", duration, "ms");

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
