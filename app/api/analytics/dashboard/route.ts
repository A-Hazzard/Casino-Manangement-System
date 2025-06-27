import { NextResponse } from "next/server";
import { generateMockAnalyticsData } from "@/lib/helpers/reports";

export async function GET() {
  try {
    const mockData = generateMockAnalyticsData();

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return NextResponse.json({
      success: true,
      data: {
        kpiMetrics: mockData.kpiMetrics,
        performanceTrends: mockData.performanceTrends,
        locations: mockData.locations,
        topPerformingMachines: [
          {
            machineId: "M001",
            machineName: "Dragon Link",
            locationName: "Red Dragon Casino",
            metric: 54000,
            metricType: "Win",
          },
          {
            machineId: "M002",
            machineName: "Buffalo Gold",
            locationName: "Ocean's Edge Gaming",
            metric: 48000,
            metricType: "Win",
          },
          {
            machineId: "M003",
            machineName: "Wheel of Fortune",
            locationName: "Red Dragon Casino",
            metric: 45000,
            metricType: "Win",
          },
          {
            machineId: "M004",
            machineName: "Cashman Casino",
            locationName: "Strikey's Funhouse",
            metric: 42000,
            metricType: "Win",
          },
          {
            machineId: "M005",
            machineName: "88 Fortunes",
            locationName: "Ocean's Edge Gaming",
            metric: 39000,
            metricType: "Win",
          },
        ],
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch dashboard data",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
