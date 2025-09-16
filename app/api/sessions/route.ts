import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { MachineSession } from "@/app/api/lib/models/machineSessions";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "startTime";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const licencee = searchParams.get("licencee") || "";
    const dateFilter = searchParams.get("dateFilter") || "all";

    // Build query
    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { _id: { $regex: search, $options: "i" } },
        { machineId: { $regex: search, $options: "i" } },
        { memberId: { $regex: search, $options: "i" } },
      ];
    }

    // Add licencee filtering if provided
    if (licencee && licencee !== "All Licensees") {
      // We'll filter by licencee through the machine -> location -> licencee relationship
      // This will be handled in the aggregation pipeline
    }

    // Add date filtering
    if (dateFilter !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (dateFilter) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "yesterday":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 1
          );
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            now.getDate()
          );
          break;
        default:
          startDate = new Date(0);
      }

      query.startTime = { $gte: startDate };
    }

    // console.log("🔍 Sessions API Debug - Query:", query);

    // Get total count for pagination with the same filtering logic
    const countPipeline = [
      { $match: query },
      {
        $lookup: {
          from: "machines",
          localField: "machineId",
          foreignField: "_id",
          as: "machine",
        },
      },
      {
        $unwind: {
          path: "$machine",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "gaminglocations",
          localField: "machine.gamingLocation",
          foreignField: "_id",
          as: "location",
        },
      },
      {
        $unwind: {
          path: "$location",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "licencees",
          localField: "location.rel.licencee",
          foreignField: "_id",
          as: "licencee",
        },
      },
      {
        $unwind: {
          path: "$licencee",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Filter by licencee if specified
      ...(licencee && licencee !== "All Licensees"
        ? [
            {
              $match: {
                "licencee.name": licencee,
              },
            },
          ]
        : []),
      {
        $count: "total",
      },
    ];

    const countResult = await MachineSession.aggregate(countPipeline);
    const totalSessions = countResult.length > 0 ? countResult[0].total : 0;

    // console.log("🔍 Sessions API Debug - Total sessions count:", totalSessions);

    // Fetch sessions with pagination and populate machine names
    const sessions = await MachineSession.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "machines",
          localField: "machineId",
          foreignField: "_id",
          as: "machine",
        },
      },
      {
        $unwind: {
          path: "$machine",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "gaminglocations",
          localField: "machine.gamingLocation",
          foreignField: "_id",
          as: "location",
        },
      },
      {
        $unwind: {
          path: "$location",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "licencees",
          localField: "location.rel.licencee",
          foreignField: "_id",
          as: "licencee",
        },
      },
      {
        $unwind: {
          path: "$licencee",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Filter by licencee if specified
      ...(licencee && licencee !== "All Licensees"
        ? [
            {
              $match: {
                "licencee.name": licencee,
              },
            },
          ]
        : []),
      {
        $addFields: {
          machineName: {
            $ifNull: [
              "$machine.custom.name",
              "$machine.serialNumber",
              "Unknown",
            ],
          },
        },
      },
      {
        $sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 },
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
      {
        $project: {
          _id: 1,
          sessionId: "$_id",
          machineId: 1,
          machineName: 1,
          startTime: 1,
          endTime: 1,
          gamesPlayed: 1,
          points: 1,
          handle: { $ifNull: ["$startMeters.drop", 0] },
          cancelledCredits: {
            $ifNull: ["$startMeters.totalCancelledCredits", 0],
          },
          jackpot: { $ifNull: ["$startMeters.jackpot", 0] },
          won: { $ifNull: ["$startMeters.totalWonCredits", 0] },
          bet: { $ifNull: ["$startMeters.coinIn", 0] },
          gamesWon: 1,
          duration: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$startTime", null] },
                  { $ne: ["$endTime", null] },
                ],
              },
              then: {
                $divide: [
                  { $subtract: ["$endTime", "$startTime"] },
                  60000, // Convert to minutes
                ],
              },
              else: null,
            },
          },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        sessions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalSessions / limit),
          totalSessions,
          hasNextPage: page < Math.ceil(totalSessions / limit),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching sessions:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
