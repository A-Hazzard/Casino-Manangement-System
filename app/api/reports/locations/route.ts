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
      
      // Parse custom dates and apply timezone handling
      // The frontend sends dates that represent the start and end of the day in Trinidad time, already converted to UTC
      const customStartDate = new Date(customStart);
      let customEndDate = new Date(customEnd);
      
      // The end date from frontend represents the start of the end day in Trinidad time
      // We need to extend it to the end of that day (23:59:59 Trinidad time = 03:59:59 UTC next day)
      customEndDate = new Date(customEndDate.getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000);
      
      // Use the dates as-is since they're already in the correct UTC format
      startDate = customStartDate;
      endDate = customEndDate;
      
      console.warn("🔍 API - Custom date range timezone conversion:");
      console.warn("🔍 API - Original start date:", customStart);
      console.warn("🔍 API - Original end date:", customEnd);
      console.warn("🔍 API - Extended end date (UTC):", endDate.toISOString());
      console.warn("🔍 API - Parsed start date (UTC):", startDate.toISOString());
    } else {
      const { startDate: s, endDate: e } = getDatesForTimePeriod(timePeriod);
      startDate = s;
      endDate = e;
    }

    console.warn("🔍 API - timePeriod:", timePeriod);
    console.warn("🔍 API - startDate:", startDate?.toISOString() || "All Time");
    console.warn("🔍 API - endDate:", endDate?.toISOString() || "All Time");
    console.warn("🔍 API - current system time:", new Date().toISOString());
    console.warn("🔍 API - licencee:", licencee);
    console.warn("🔍 API - showAllLocations:", showAllLocations);
    
    // Debug logging for custom date ranges
    if (timePeriod === "Custom") {
      const customStart = searchParams.get("startDate");
      const customEnd = searchParams.get("endDate");
      console.warn("🔍 API - Custom date range debug:");
      console.warn("🔍 API - Original customStart:", customStart);
      console.warn("🔍 API - Original customEnd:", customEnd);
      console.warn("🔍 API - Parsed startDate:", startDate?.toISOString());
      console.warn("🔍 API - Parsed endDate:", endDate?.toISOString());
      console.warn("🔍 API - Timezone offset applied: +4 hours (Trinidad to UTC)");
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

    // Build location filter for the aggregation
    const locationMatchStage: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date("2020-01-01") } },
      ],
    };

    if (licencee && licencee !== "all") {
      locationMatchStage["rel.licencee"] = licencee;
    }

    // console.log("🔍 API - Using optimized aggregation pipeline");

    // Use MongoDB aggregation pipeline matching the working shell queries
    const aggregationPipeline = [
      // Stage 1: Filter locations by deletion status and licencee
      {
        $match: locationMatchStage,
      },
      // Stage 2: Lookup all machines for each location
      {
        $lookup: {
          from: "machines",
          localField: "_id",
          foreignField: "gamingLocation",
          as: "machines"
        }
      },
      // Stage 3: Unwind machines array (preserve locations with no machines)
      { 
        $unwind: { 
          path: "$machines", 
          preserveNullAndEmptyArrays: true 
        } 
      },
      // Stage 4: Lookup meters for each machine (filtered by date range if specified)
      {
        $lookup: {
          from: "meters",
          let: { machineId: "$machines._id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$machine", "$$machineId"] },
                // Apply date filter if specified
                ...(startDate && endDate ? { readAt: { $gte: startDate, $lte: endDate } } : {}),
              }
            }
          ],
          as: "meters"
        }
      },
      // Stage 5: Unwind meters array (preserve machines with no meters)
      { 
        $unwind: { 
          path: "$meters", 
          preserveNullAndEmptyArrays: true 
        } 
      },
      // Stage 6: Group by location and calculate financial metrics
      {
        $group: {
          _id: "$_id",
          locationName: { $first: "$name" },
          isLocalServer: { $first: { $ifNull: ["$isLocalServer", false] } },
          machines: { $addToSet: "$machines" },
          moneyIn: { $sum: { $ifNull: ["$meters.movement.drop", 0] } },
          moneyOut: { $sum: { $ifNull: ["$meters.movement.totalCancelledCredits", 0] } }
        }
      },
      // Stage 7: Calculate gross revenue (money in minus money out)
      {
        $addFields: {
          gross: { $subtract: ["$moneyIn", "$moneyOut"] }
        }
      },
      // Stage 8: Calculate machine counts and status metrics
      {
        $addFields: {
          location: { $toString: "$_id" },
          totalMachines: { $size: { $filter: { input: "$machines", cond: { $ne: ["$$this", null] } } } },
          onlineMachines: {
            $size: {
              $filter: {
                input: "$machines",
                cond: {
                  $and: [
                    { $ne: ["$$this", null] },
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
                cond: { 
                  $and: [
                    { $ne: ["$$this", null] },
                    { $eq: ["$$this.isSasMachine", true] }
                  ]
                },
              },
            },
          },
          nonSasMachines: {
            $size: {
              $filter: {
                input: "$machines",
                cond: { 
                  $and: [
                    { $ne: ["$$this", null] },
                    { $ne: ["$$this.isSasMachine", true] }
                  ]
                },
              },
            },
          },
          hasSasMachines: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$machines",
                    cond: { 
                      $and: [
                        { $ne: ["$$this", null] },
                        { $eq: ["$$this.isSasMachine", true] }
                      ]
                    },
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
                    cond: { 
                      $and: [
                        { $ne: ["$$this", null] },
                        { $ne: ["$$this.isSasMachine", true] }
                      ]
                    },
                  },
                },
              },
              0,
            ],
          },
        },
      },
      // Stage 9: Filter locations based on showAllLocations parameter
      // When showAllLocations is true, show all locations regardless of data
      ...(showAllLocations ? [] : [{ 
        $match: { 
          $or: [
            { $gt: ["$totalMachines", 0] },
            { $gt: ["$moneyIn", 0] },
            { $gt: ["$moneyOut", 0] }
          ]
        } 
      }]),
      // Stage 10: Sort by gross revenue (highest first)
      {
        $sort: { gross: -1 },
      },
      // Stage 11: Apply pagination with metadata
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

    // Debug: Log some sample data to understand the structure
    console.warn("🔍 API - Total locations found:", totalCount);
    console.warn("🔍 API - Paginated data length:", paginatedData.length);
    
    // Log locations with SAS machines
    const locationsWithSas = paginatedData.filter((loc: Record<string, unknown>) => (loc.sasMachines as number) > 0);
    console.warn("🔍 API - Locations with SAS machines:", locationsWithSas.length);
    
    if (paginatedData.length > 0) {
      console.warn("🔍 API - Sample location data:", JSON.stringify({
        location: paginatedData[0].location,
        locationName: paginatedData[0].locationName,
        sasMachines: paginatedData[0].sasMachines,
        hasSasMachines: paginatedData[0].hasSasMachines,
        totalMachines: paginatedData[0].totalMachines,
        hasData: paginatedData[0].hasData,
        machines: paginatedData[0].machines?.slice(0, 2) // First 2 machines for debugging
      }, null, 2));
      
      // Log first few locations to see the pattern
      console.warn("🔍 API - First 5 locations SAS info:", paginatedData.slice(0, 5).map((loc: Record<string, unknown>) => ({
        location: loc.location,
        locationName: loc.locationName,
        sasMachines: loc.sasMachines,
        hasSasMachines: loc.hasSasMachines,
        totalMachines: loc.totalMachines
      })));
      
      // Debug: Check if machines have isSasMachine field
      const locationsWithMachines = paginatedData.filter((loc: Record<string, unknown>) => loc.machines && (loc.machines as unknown[]).length > 0);
      if (locationsWithMachines.length > 0) {
        const machines = locationsWithMachines[0].machines as Record<string, unknown>[];
        console.warn("🔍 API - Sample machines with isSasMachine field:", machines.slice(0, 3).map((machine: Record<string, unknown>) => ({
          _id: machine._id,
          serialNumber: machine.serialNumber,
          isSasMachine: machine.isSasMachine
        })));
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.warn("🔍 API - Request completed in", duration, "ms");

    const response = {
      data: paginatedData,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error("Error in reports locations route:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server Error" },
      { status: 500 }
    );
  }
}
