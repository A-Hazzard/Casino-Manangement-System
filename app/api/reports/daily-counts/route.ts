import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { getUserFromServer } from "@/lib/utils/user";
import type { DailyCountsReport } from "@/lib/types/reports";

/**
 * GET /api/reports/daily-counts
 * 
 * Retrieves daily counts and voucher reports with role-based access control.
 * Requires admin, manager, or collector role.
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get current user from JWT token
    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user has required roles
    const userRoles = user.roles as string[] || [];
    const hasAccess = userRoles.some(role => 
      ["admin", "manager", "collector"].includes(role)
    );

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get query parameters
    const url = new URL(request.url);
    const locationId = url.searchParams.get("locationId");


    // Apply location-based filtering if user has resource permissions
    const userPermissions = user.resourcePermissions as Record<string, unknown>;
    const allowedLocationIds = (userPermissions?.["gaming-locations"] as Record<string, unknown>)?.resources as string[] || [];
    
    // Filter by user's allowed locations if not admin
    let locationFilter = {};
    if (!userRoles.includes("admin") && allowedLocationIds.length > 0) {
      locationFilter = { locationId: { $in: allowedLocationIds } };
    }

    // Add specific location filter if requested
    if (locationId) {
      if (!userRoles.includes("admin") && !allowedLocationIds.includes(locationId)) {
        return NextResponse.json(
          { success: false, message: "Access denied to this location" },
          { status: 403 }
        );
      }
      // TODO: Use locationFilter in actual data fetching implementation
      locationFilter = { ...locationFilter, locationId };
    }

    // TODO: Implement actual data fetching logic using locationFilter
    // This is a placeholder implementation
    console.warn("Location filter for future implementation:", locationFilter);
    const sampleData: DailyCountsReport[] = [
      {
        locationId: "LOC001",
        locationName: "Main Casino Floor",
        date: new Date().toISOString().split('T')[0],
        meterReadings: [
          {
            machineId: "MAC001",
            machineName: "Lucky Stars Deluxe",
            openingReading: 125000,
            closingReading: 128500,
            netRevenue: 3500,
            variance: 0,
          },
        ],
        voucherData: {
          issued: 1250,
          redeemed: 1180,
          outstanding: 70,
        },
        physicalCounts: {
          expectedCash: 15000,
          actualCash: 14950,
          variance: -50,
        },
      },
    ];

    return NextResponse.json({
      success: true,
      data: sampleData,
      message: "Daily counts retrieved successfully",
    });

  } catch (error) {
    console.error("Error fetching daily counts:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch daily counts" },
      { status: 500 }
    );
  }
} 