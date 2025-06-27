import { NextResponse } from "next/server";
import { LogisticsEntry } from "@/lib/types/reports";

const mockLogisticsData: LogisticsEntry[] = [
  {
    id: "L001",
    machineId: "M001",
    machineName: "Dragon Link",
    fromLocationId: "2",
    fromLocationName: "Strikey's Funhouse",
    toLocationId: "1",
    toLocationName: "Red Dragon Casino",
    moveDate: "2023-08-15",
    reason: "Performance Optimization",
    status: "completed",
    movedBy: "John Doe",
  },
  {
    id: "L002",
    machineId: "M003",
    machineName: "88 Fortunes",
    fromLocationId: null,
    fromLocationName: "Warehouse",
    toLocationId: "2",
    toLocationName: "Strikey's Funhouse",
    moveDate: "2023-09-01",
    reason: "New Installation",
    status: "completed",
    movedBy: "Jane Smith",
  },
  {
    id: "L003",
    machineId: "M005",
    machineName: "Cleopatra",
    fromLocationId: "3",
    fromLocationName: "Ocean's Edge Gaming",
    toLocationId: "1",
    toLocationName: "Red Dragon Casino",
    moveDate: "2023-09-20",
    reason: "Player Request",
    status: "pending",
    movedBy: "Alex Johnson",
  },
  {
    id: "L004",
    machineId: "M006",
    machineName: "China Shores",
    fromLocationId: "3",
    fromLocationName: "Ocean's Edge Gaming",
    toLocationId: "2",
    toLocationName: "Strikey's Funhouse",
    moveDate: "2023-09-22",
    reason: "Maintenance Swap",
    status: "cancelled",
    movedBy: "John Doe",
    notes: "Original machine repaired on-site.",
  },
  {
    id: "L005",
    machineId: "M002",
    machineName: "Wheel of Fortune",
    fromLocationId: "1",
    fromLocationName: "Red Dragon Casino",
    toLocationId: "3",
    toLocationName: "Ocean's Edge Gaming",
    moveDate: "2023-10-05",
    reason: "Balancing Floor",
    status: "completed",
    movedBy: "Jane Smith",
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get("searchTerm")?.toLowerCase() || "";
    const statusFilter = searchParams.get("statusFilter");

    let responseData = mockLogisticsData;

    if (searchTerm) {
      responseData = responseData.filter(
        (entry) =>
          entry.machineName?.toLowerCase().includes(searchTerm) ||
          entry.fromLocationName?.toLowerCase().includes(searchTerm) ||
          entry.toLocationName.toLowerCase().includes(searchTerm) ||
          entry.movedBy?.toLowerCase().includes(searchTerm)
      );
    }

    if (statusFilter && statusFilter !== "all") {
      responseData = responseData.filter(
        (entry) => entry.status === statusFilter
      );
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 250));

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch logistics data",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
