import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { GamingLocations } from "@/app/api/lib/models/gaminglocations";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const licensee = searchParams.get("licensee");

    if (!licensee) {
      return NextResponse.json(
        { message: "Licensee is required" },
        { status: 400 }
      );
    }

    const locations = await GamingLocations.find(
      { "rel.licencee": licensee },
      { _id: 1, name: 1 }
    ).lean();

    const formattedLocations = locations.map((loc) => ({
      id: loc._id,
      name: loc.name,
    }));

    return NextResponse.json({ locations: formattedLocations });
  } catch (error) {
    console.error("Error fetching gaming locations:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch gaming locations",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
