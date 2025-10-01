import { NextRequest, NextResponse } from "next/server";
import { LogisticsEntry } from "@/lib/types/reports";
import { MovementRequest } from "@/app/api/lib/models/movementrequests";
import { MovementRequestStatus } from "@/lib/types/movementRequests";
import { connectDB } from "@/app/api/lib/middleware/db";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get("searchTerm")?.toLowerCase() || "";
    const statusFilter = searchParams.get("statusFilter");

    // Build query filters
    const filters: Record<string, unknown> = {};

    if (searchTerm) {
      filters.$or = [
        { cabinetIn: { $regex: searchTerm, $options: "i" } },
        { locationFrom: { $regex: searchTerm, $options: "i" } },
        { locationTo: { $regex: searchTerm, $options: "i" } },
        { movedBy: { $regex: searchTerm, $options: "i" } },
      ];
    }

    if (statusFilter && statusFilter !== "all") {
      filters.status = statusFilter;
    }

    // Query actual data using MovementRequest model
    const logisticsData = await MovementRequest.find(filters)
      .sort({ createdAt: -1 })
      .limit(100) // Limit results for performance
      .lean();

    // Transform data to match LogisticsEntry interface
    const responseData: LogisticsEntry[] = logisticsData.map((item) => ({
      id: item._id,
      machineId: item.cabinetIn || item._id, // Use cabinetIn as machineId or fallback to _id
      machineName: item.cabinetIn || "Unknown Machine",
      fromLocationName: item.locationFrom,
      toLocationName: item.locationTo,
      moveDate: item.createdAt?.toISOString() || new Date().toISOString(),
      status: mapMovementStatusToLogisticsStatus(item.status),
      movedBy: item.createdBy || "Unknown",
      reason: item.reason || "Movement request",
    }));

    // Helper function to map MovementRequestStatus to LogisticsEntry status
    function mapMovementStatusToLogisticsStatus(
      status: MovementRequestStatus
    ): "pending" | "completed" | "in-progress" | "cancelled" {
      switch (status) {
        case "approved":
          return "completed";
        case "rejected":
          return "cancelled";
        case "in progress":
          return "in-progress";
        case "pending":
        default:
          return "pending";
      }
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: "Logistics data fetched successfully",
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
