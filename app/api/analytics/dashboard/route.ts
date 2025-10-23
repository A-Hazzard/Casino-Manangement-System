import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Machine } from "@/app/api/lib/models/machines";
import { shouldApplyCurrencyConversion } from "@/lib/helpers/currencyConversion";
import { convertFromUSD } from "@/lib/helpers/rates";
import type { CurrencyCode } from "@/shared/types/currency";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const licensee = searchParams.get("licensee");
    const displayCurrency = (searchParams.get("currency") as CurrencyCode) || "USD";

    if (!licensee) {
      return NextResponse.json(
        { message: "Licensee is required" },
        { status: 400 }
      );
    }

    const globalStatsPipeline = [
      // Stage 1: Join machines with gaming locations to get location details
      {
        $lookup: {
          from: "gaminglocations",
          localField: "gamingLocation",
          foreignField: "_id",
          as: "locationDetails",
        },
      },
      
      // Stage 2: Flatten the location details array (each machine now has location info)
      {
        $unwind: "$locationDetails",
      },
      
      // Stage 3: Filter machines by licensee to get only relevant machines
      {
        $match: {
          "locationDetails.rel.licencee": licensee,
        },
      },
      
      // Stage 4: Aggregate financial and machine statistics across all machines
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
          totalMachines: { $sum: 1 },
          onlineMachines: {
            $sum: {
              $cond: [{ $eq: ["$assetStatus", "active"] }, 1, 0],
            },
          },
          sasMachines: {
            $sum: {
              $cond: ["$isSasMachine", 1, 0],
            },
          },
        },
      },
      
      // Stage 5: Remove the _id field from final output
      {
        $project: {
          _id: 0,
        },
      },
    ];

    const statsResult = await Machine.aggregate(globalStatsPipeline);
    const globalStats = statsResult[0] || {
      totalDrop: 0,
      totalCancelledCredits: 0,
      totalGross: 0,
      totalMachines: 0,
      onlineMachines: 0,
      sasMachines: 0,
    };

    // Apply currency conversion if needed
    let convertedStats = globalStats;
    
    if (shouldApplyCurrencyConversion(licensee)) {
      console.warn("🔍 ANALYTICS DASHBOARD - Applying currency conversion for All Licensee mode");
      // Convert financial fields from USD to display currency
      const financialFields = ['totalDrop', 'totalCancelledCredits', 'totalGross'];
      convertedStats = { ...globalStats };
      
      financialFields.forEach(field => {
        if (typeof globalStats[field] === 'number') {
          (convertedStats as Record<string, unknown>)[field] = convertFromUSD(globalStats[field], displayCurrency);
        }
      });
    }

    return NextResponse.json({ 
      globalStats: convertedStats,
      currency: displayCurrency,
      converted: shouldApplyCurrencyConversion(licensee)
    });
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch dashboard analytics",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
