import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Machine } from "@/app/api/lib/models/machines";
import type { MachineAnalytics } from "@/lib/types/reports";
import { PipelineStage } from "mongoose";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    
    const query: Record<string, string | number> = {};
    const limit = Number(searchParams.get("limit")) || 5;
    
    if (searchParams.has("location")) {
      query.locationId = searchParams.get("location") as string;
    }
    
    if (searchParams.has("licensee")) {
      query.licenseeId = searchParams.get("licensee") as string;
    }
    
    const machinesPipeline: PipelineStage[] = [
      { $match: query },
      {
        $lookup: {
          from: "locations",
          localField: "locationId",
          foreignField: "_id",
          as: "locationDetails"
        }
      },
      {
        $unwind: "$locationDetails"
      },
      {
        $match: {
          "locationDetails.rel.licencee": query.licenseeId,
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          locationName: "$locationDetails.name",
          totalDrop: 1,
          gross: 1,
          isOnline: 1,
          hasSas: 1
        }
      },
      {
        $sort: {
          totalDrop: -1
        }
      }
    ];

    if (limit) {
      machinesPipeline.push({ $limit: limit });
    }

    const machines: MachineAnalytics[] = await Machine.aggregate(machinesPipeline);
    return NextResponse.json({ machines });
    
  } catch (error: unknown) {
    console.error("Error fetching machines:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
