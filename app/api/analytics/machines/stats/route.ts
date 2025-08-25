import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";


export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const licensee = searchParams.get("licensee");

    // Make licensee optional - if not provided or "all", we'll get stats for all machines
    const effectiveLicensee =
      licensee && licensee.toLowerCase() !== "all" ? licensee : null;

    const onlineThreshold = new Date(Date.now() - 3 * 60 * 1000);

    // Build match stage for machines
    const machineMatchStage: Record<string, unknown> = {
      deletedAt: { $in: [null, new Date(-1)] },
    };

    // If licensee is specified, we need to filter machines by their location's licensee
    if (effectiveLicensee) {
      // First, get all location IDs for this licensee
      const db = await connectDB();
      if (!db) {
        return NextResponse.json(
          { error: "DB connection failed" },
          { status: 500 }
        );
      }

      const locationIds = await db
        .collection("gaminglocations")
        .find(
          {
            "rel.licencee": effectiveLicensee,
            deletedAt: { $in: [null, new Date(-1)] },
          },
          { projection: { _id: 1 } }
        )
        .toArray();

      const locationIdStrings = locationIds.map((loc) => loc._id.toString());
      machineMatchStage.gamingLocation = { $in: locationIdStrings };
    }

    // Use a simpler approach - count machines directly
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: "DB connection failed" },
        { status: 500 }
      );
    }

    // Count totals and online in parallel - only count machines with lastActivity
    const [totalMachines, onlineMachines] = await Promise.all([
      db.collection("machines").countDocuments({
        ...machineMatchStage,
        lastActivity: { $exists: true }, // Only count machines with lastActivity field
      }),
      db.collection("machines").countDocuments({
        ...machineMatchStage,
        lastActivity: { $gte: onlineThreshold }, // This already filters for existing lastActivity
      }),
    ]);

    // Count SAS machines
    const sasMachines = await db.collection("machines").countDocuments({
      ...machineMatchStage,
      isSasMachine: true,
    });

    // Get financial totals (this might be empty if no financial data exists)
    const financialTotals = await db
      .collection("machines")
      .aggregate([
        { $match: machineMatchStage },
        {
          $group: {
            _id: null,
            totalDrop: { $sum: { $ifNull: ["$sasMeters.drop", 0] } },
            totalCancelledCredits: {
              $sum: { $ifNull: ["$sasMeters.totalCancelledCredits", 0] },
            },
            totalGross: {
              $sum: {
                $subtract: [
                  { $ifNull: ["$sasMeters.drop", 0] },
                  { $ifNull: ["$sasMeters.totalCancelledCredits", 0] },
                ],
              },
            },
          },
        },
      ])
      .toArray();

    const financials = financialTotals[0] || {
      totalDrop: 0,
      totalCancelledCredits: 0,
      totalGross: 0,
    };

    const stats = {
      totalDrop: financials.totalDrop,
      totalCancelledCredits: financials.totalCancelledCredits,
      totalGross: financials.totalGross,
      totalMachines,
      onlineMachines,
      sasMachines,
    };

    // console.log("🔍 Machine stats API - Licensee:", effectiveLicensee);
    // console.log("🔍 Machine stats API - Total machines:", totalMachines);
    // console.log("🔍 Machine stats API - Online machines:", onlineMachines);
    // console.log("🔍 Machine stats API - SAS machines:", sasMachines);

    return NextResponse.json({
      stats,
      totalMachines: stats.totalMachines,
      onlineMachines: stats.onlineMachines,
      offlineMachines: stats.totalMachines - stats.onlineMachines,
    });
  } catch (error) {
    console.error("Error fetching machine stats:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch machine stats",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
