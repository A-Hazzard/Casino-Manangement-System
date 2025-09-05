 import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { getDatesForTimePeriod } from "@/app/api/lib/utils/dates";
import { TimePeriod } from "@/app/api/lib/types";
import { getExchangeRates } from "@/lib/helpers/rates";
import {
  processResponseWithCurrency,
  extractCurrencyParams,
} from "@/lib/helpers/currencyConversion";

// Removed auto-index creation to avoid conflicts and extra latency

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const timePeriod = (searchParams.get("timePeriod") as TimePeriod) || "7d";
    const licencee = searchParams.get("licencee") || undefined;

    // Extract currency conversion parameters
    const { displayCurrency, licenseeName } =
      extractCurrencyParams(searchParams);

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

    console.warn("🔍 API - timePeriod:", timePeriod);
    console.warn("🔍 API - startDate:", startDate?.toISOString() || "All Time");
    console.warn("🔍 API - endDate:", endDate?.toISOString() || "All Time");
    console.warn("🔍 API - current system time:", new Date().toISOString());
    console.warn("🔍 API - licencee:", licencee);
    console.warn("🔍 API - showAllLocations:", showAllLocations);

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
                $or: [
                  { deletedAt: null },
                  { deletedAt: { $lt: new Date("2020-01-01") } },
                ],
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
      // Stage 3: Lookup meters for each location
      // When showAllLocations is true, get all meters; otherwise filter by date
      {
        $lookup: {
          from: "meters",
          let: { locationId: { $toString: "$_id" } },
          pipeline: [
            {
              $match: showAllLocations 
                ? { $expr: { $eq: ["$location", "$$locationId"] } }
                : {
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
      // When showAllLocations is true, show all locations regardless of data
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

    // Get exchange rates for currency conversion
    const exchangeRates = await getExchangeRates();

    // Process response with currency conversion
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

    const convertedResponse = processResponseWithCurrency(
      response,
      displayCurrency,
      exchangeRates,
      licenseeName
    );

    return NextResponse.json(convertedResponse);
  } catch (err: unknown) {
    console.error("Error in reports locations route:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server Error" },
      { status: 500 }
    );
  }
}
