import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { GamingLocations } from "@/app/api/lib/models/gaminglocations";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const licensee = searchParams.get("licensee");

    const query: Record<string, unknown> = { deletedAt: { $exists: false } };

    // If licensee is provided, filter by licensee
    if (licensee) {
      query["rel.licencee"] = licensee;
    }

    const locations = await GamingLocations.find(query, {
      _id: 1,
      name: 1,
    }).lean();

    const formattedLocations = locations.map((loc) => ({
      _id: loc._id,
      name: loc.name,
    }));

    return NextResponse.json({
      success: true,
      data: formattedLocations,
    });
  } catch (error) {
    console.error("Error fetching gaming locations:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch gaming locations",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
