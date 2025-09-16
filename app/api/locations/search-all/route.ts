import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const licencee = searchParams.get("licencee") || "";
    const search = searchParams.get("search")?.trim() || "";

    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { success: false, message: "DB connection failed" },
        { status: 500 }
      );
    }

    // Build location matching - show ALL locations for the licensee
    const locationMatch: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date("2020-01-01") } },
      ],
    };

    if (search) {
      locationMatch.name = { $regex: search, $options: "i" };
    }
    if (licencee) {
      locationMatch["rel.licencee"] = licencee;
    }

    // Get all locations that match the criteria with financial data
    const locations = await db
      .collection("gaminglocations")
      .aggregate([
        { $match: locationMatch },
        {
          $lookup: {
            from: "machines",
            let: { id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$gamingLocation", "$$id"] },
                  $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date("2020-01-01") } },
      ],
                },
              },
              {
                $group: {
                  _id: null,
                  totalMachines: { $sum: 1 },
                  onlineMachines: {
                    $sum: {
                      $cond: [
                        {
                          $gt: [
                            "$lastActivity",
                            new Date(Date.now() - 3 * 60 * 1000),
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],
            as: "machineStats",
          },
        },
        // Add lookup for financial data (last 30 days by default)
        {
          $lookup: {
            from: "meters",
            let: { locationId: { $toString: "$_id" } },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$location", "$$locationId"] },
                  createdAt: { 
                    $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
                    $lte: new Date() 
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  totalMoneyIn: { $sum: { $ifNull: ["$movement.drop", 0] } },
                  totalMoneyOut: {
                    $sum: { $ifNull: ["$movement.totalCancelledCredits", 0] },
                  },
                },
              },
            ],
            as: "financialData",
          },
        },
        {
          $addFields: {
            totalMachines: {
              $ifNull: [
                { $arrayElemAt: ["$machineStats.totalMachines", 0] },
                0,
              ],
            },
            onlineMachines: {
              $ifNull: [
                { $arrayElemAt: ["$machineStats.onlineMachines", 0] },
                0,
              ],
            },
            moneyIn: {
              $ifNull: [
                { $arrayElemAt: ["$financialData.totalMoneyIn", 0] },
                0,
              ],
            },
            moneyOut: {
              $ifNull: [
                { $arrayElemAt: ["$financialData.totalMoneyOut", 0] },
                0,
              ],
            },
            isLocalServer: { $ifNull: ["$isLocalServer", false] },
            hasSmib: { $ifNull: ["$hasSmib", false] },
            noSMIBLocation: { $not: ["$hasSmib"] },
          },
        },
        {
          $addFields: {
            gross: { $subtract: ["$moneyIn", "$moneyOut"] },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            address: 1,
            country: 1,
            rel: 1,
            profitShare: 1,
            geoCoords: 1,
            totalMachines: 1,
            onlineMachines: 1,
            moneyIn: 1,
            moneyOut: 1,
            gross: 1,
            isLocalServer: 1,
            hasSmib: 1,
            noSMIBLocation: 1,
          },
        },
      ])
      .toArray();

    // Transform the data to match the expected format
    const response = locations.map((loc) => ({
      location: loc._id.toString(),
      locationName: loc.name || "Unknown Location",
      country: loc.country,
      address: loc.address,
      rel: loc.rel,
      profitShare: loc.profitShare,
      geoCoords: loc.geoCoords,
      totalMachines: loc.totalMachines || 0,
      onlineMachines: loc.onlineMachines || 0,
      moneyIn: loc.moneyIn || 0,
      moneyOut: loc.moneyOut || 0,
      gross: loc.gross || 0,
      isLocalServer: loc.isLocalServer || false,
      hasSmib: loc.hasSmib || false,
      noSMIBLocation: loc.noSMIBLocation || false,
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error("🔥 Search All Locations API Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
} 