import { NextResponse, NextRequest } from "next/server";
import { GamingLocations } from "@/app/api/lib/models/gaminglocations";
import { connectDB } from "../../lib/middleware/db";
import { TransformedCabinet } from "@/lib/types/mongo";
import { getDatesForTimePeriod } from "../../lib/utils/dates";
import { TimePeriod } from "../../lib/types";
import mongoose from "mongoose";

// Helper function to safely convert an ID to ObjectId if possible
function safeObjectId(id: string): string | mongoose.Types.ObjectId {
  if (!id) return id;
  try {
    if (mongoose.Types.ObjectId.isValid(id)) {
      return new mongoose.Types.ObjectId(id);
    }
  } catch (err) {
    console.error(`Failed to convert ID to ObjectId: ${id}`, err);
  }
  return id;
}

export async function GET(request: NextRequest) {
  try {
    // Extract locationId from the URL
    const url = request.nextUrl;
    const locationId = url.pathname.split("/")[3];

    // Connect to the database
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    // Get query parameters
    const licencee = url.searchParams.get("licencee");
    const searchTerm = url.searchParams.get("search");
    const timePeriod =
      (url.searchParams.get("timePeriod") as TimePeriod) || "Today";
    const customStartDate = url.searchParams.get("startDate");
    const customEndDate = url.searchParams.get("endDate");

    // Calculate date range for filtering meters
    let startDate: Date | undefined, endDate: Date | undefined;

    if (timePeriod === "Custom" && customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
    } else {
      const dateRange = getDatesForTimePeriod(timePeriod);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    }

    // Convert locationId to ObjectId for proper matching
    const locationIdObj = safeObjectId(locationId);

    // First verify the location exists and check licensee access
    const locationCheck = await GamingLocations.findOne({
      _id: { $in: [locationId, locationIdObj] },
    });

    if (!locationCheck) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // CRITICAL SECURITY CHECK: Verify the location belongs to the selected licensee
    if (licencee && locationCheck.rel?.licencee !== licencee) {
      console.error(
        `Access denied: Location ${locationId} does not belong to licensee ${licencee}`
      );
      return NextResponse.json(
        { error: "Access denied: Location not found for selected licensee" },
        { status: 403 }
      );
    }

    // Build aggregation pipeline based on your MongoDB compass query
    const aggregationPipeline: any[] = [
      // Match the specific location (similar to your $match: { name: "Big Shot" })
      {
        $match: { _id: { $in: [locationId, locationIdObj] } },
      },
      // Lookup machines for this location
      {
        $lookup: {
          from: "machines",
          localField: "_id",
          foreignField: "gamingLocation",
          as: "machines",
        },
      },
      // Unwind machines to get individual machine documents
      {
        $unwind: {
          path: "$machines",
          preserveNullAndEmptyArrays: false, // Only return locations that have machines
        },
      },
    ];

    // Add search filter if provided (similar to your $match: { "machines.serialNumber": "GMID3" })
    if (searchTerm) {
      aggregationPipeline.push({
        $match: {
          $or: [
            { "machines.serialNumber": { $regex: searchTerm, $options: "i" } },
            { "machines.relayId": { $regex: searchTerm, $options: "i" } },
            { "machines.smibBoard": { $regex: searchTerm, $options: "i" } },
          ],
        },
      });
    }

    // Add meter data lookup using your exact pattern
    aggregationPipeline.push({
      $lookup: {
        from: "meters",
        let: { machineId: "$machines._id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$machine", "$$machineId"] },
              // Add date filtering based on timePeriod
              ...(startDate && endDate
                ? {
                    createdAt: {
                      $gte: startDate,
                      $lte: endDate,
                    },
                  }
                : {}),
            },
          },
          {
            $group: {
              _id: null,
              moneyIn: { $sum: "$movement.drop" },
              moneyOut: { $sum: "$movement.totalCancelledCredits" },
              jackpot: { $sum: "$movement.jackpot" },
              gamesPlayed: { $sum: "$movement.gamesPlayed" },
              gamesWon: { $sum: "$movement.gamesWon" },
            },
          },
          {
            $addFields: {
              gross: { $subtract: ["$moneyIn", "$moneyOut"] },
            },
          },
        ],
        as: "metersData",
      },
    });

    // Project the final structure (similar to your $project)
    aggregationPipeline.push({
      $project: {
        _id: "$machines._id",
        locationId: "$_id",
        locationName: "$name",
        assetNumber: "$machines.serialNumber",
        serialNumber: "$machines.serialNumber",
        relayId: "$machines.relayId",
        smibBoard: "$machines.smibBoard",
        smbId: {
          $ifNull: [
            "$machines.smibBoard",
            { $ifNull: ["$machines.relayId", ""] },
          ],
        },
        lastActivity: "$machines.lastActivity",
        lastOnline: "$machines.lastActivity",
        game: "$machines.game",
        installedGame: "$machines.game",
        cabinetType: "$machines.cabinetType",
        assetStatus: "$machines.assetStatus",
        status: "$machines.assetStatus",
        gameType: "$machines.gameType",
        isCronosMachine: "$machines.isCronosMachine",
        // Use aggregated meter data with proper fallbacks (exactly like your query)
        moneyIn: { $ifNull: [{ $arrayElemAt: ["$metersData.moneyIn", 0] }, 0] },
        moneyOut: {
          $ifNull: [{ $arrayElemAt: ["$metersData.moneyOut", 0] }, 0],
        },
        jackpot: { $ifNull: [{ $arrayElemAt: ["$metersData.jackpot", 0] }, 0] },
        gross: { $ifNull: [{ $arrayElemAt: ["$metersData.gross", 0] }, 0] },
        gamesPlayed: {
          $ifNull: [{ $arrayElemAt: ["$metersData.gamesPlayed", 0] }, 0],
        },
        gamesWon: {
          $ifNull: [{ $arrayElemAt: ["$metersData.gamesWon", 0] }, 0],
        },
        cancelledCredits: {
          $ifNull: [{ $arrayElemAt: ["$metersData.moneyOut", 0] }, 0],
        },
        sasMeters: "$machines.sasMeters",
        // Calculate online status (3 minutes threshold)
        online: {
          $cond: [
            {
              $and: [
                { $ne: ["$machines.lastActivity", null] },
                {
                  $gte: [
                    "$machines.lastActivity",
                    { $subtract: [new Date(), 3 * 60 * 1000] },
                  ],
                },
              ],
            },
            true,
            false,
          ],
        },
      },
    });

    // Execute the aggregation
    const cabinetsWithMeters = await db
      .collection("gaminglocations")
      .aggregate(aggregationPipeline, {
        allowDiskUse: true,
        maxTimeMS: 30000,
      })
      .toArray();

    // Transform the results to ensure proper data types
    const transformedCabinets: TransformedCabinet[] = cabinetsWithMeters.map(
      (cabinet: any) => ({
        _id: cabinet._id?.toString() || "",
        locationId: cabinet.locationId?.toString() || "",
        locationName: cabinet.locationName || "",
        assetNumber: cabinet.assetNumber || "",
        serialNumber: cabinet.serialNumber || "",
        relayId: cabinet.relayId || "",
        smibBoard: cabinet.smibBoard || "",
        smbId: cabinet.smbId || "",
        lastActivity: cabinet.lastActivity || null,
        lastOnline: cabinet.lastOnline || null,
        game: cabinet.game || "",
        installedGame: cabinet.installedGame || "",
        cabinetType: cabinet.cabinetType || "",
        assetStatus: cabinet.assetStatus || "",
        status: cabinet.status || "",
        gameType: cabinet.gameType || "",
        isCronosMachine: cabinet.isCronosMachine || false,
        // Ensure all numeric fields are properly typed
        moneyIn: Number(cabinet.moneyIn) || 0,
        moneyOut: Number(cabinet.moneyOut) || 0,
        jackpot: Number(cabinet.jackpot) || 0,
        gross: Number(cabinet.gross) || 0,
        gamesPlayed: Number(cabinet.gamesPlayed) || 0,
        gamesWon: Number(cabinet.gamesWon) || 0,
        cancelledCredits: Number(cabinet.cancelledCredits) || 0,
        sasMeters: cabinet.sasMeters || null,
        online: Boolean(cabinet.online),
        // Add any missing fields that might be expected
        metersData: null, // This was in the original structure
      })
    );

    return NextResponse.json(transformedCabinets);
  } catch (error) {
    console.error("Error processing location cabinets request:", error);
    return NextResponse.json(
      { error: "Failed to fetch location cabinets data" },
      { status: 500 }
    );
  }
}

// Keep the existing POST method from the original file (if needed)
export async function POST(request: NextRequest) {
  // This would be copied from the original file if POST functionality is needed
  return NextResponse.json(
    { error: "POST method not implemented in new version" },
    { status: 501 }
  );
}
