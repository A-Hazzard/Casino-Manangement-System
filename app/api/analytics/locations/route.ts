import { NextResponse } from "next/server";
import { generateMockAnalyticsData } from "@/lib/helpers/reports";
import { CasinoLocation } from "@/lib/types/reports";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationIds = searchParams.get("locationIds")?.split(",");

    const { locations } = generateMockAnalyticsData();

    let responseData: CasinoLocation[] | CasinoLocation;

    // If specific location IDs are requested, filter the data
    if (locationIds && locationIds.length > 0) {
      const filteredLocations = locations.filter((loc) =>
        locationIds.includes(loc.id)
      );
      // For simplicity, if one ID is passed, return object, else array
      responseData =
        filteredLocations.length === 1
          ? filteredLocations[0]
          : filteredLocations;
    } else {
      // Otherwise, return all locations
      responseData = locations;
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch location data",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
