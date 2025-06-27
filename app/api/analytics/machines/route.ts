import { NextResponse } from "next/server";
import { generateMockAnalyticsData } from "@/lib/helpers/reports";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const machineIds = searchParams.get("machineIds")?.split(",");

    const mockData = generateMockAnalyticsData();
    const machines = mockData.machines;

    let responseData = machines;

    if (locationId) {
      responseData = machines.filter((m) => m.locationId === locationId);
    } else if (machineIds && machineIds.length > 0) {
      responseData = machines.filter((m) => machineIds.includes(m.id));
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 400));

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch machine data",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
