import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Machine } from "@/app/api/lib/models/machines";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cabinetId: string }> }
) {
  try {
    const { cabinetId } = await params;
    await connectDB();
    const { searchParams } = new URL(request.url);
    const timePeriod = searchParams.get("timePeriod");

    // Find the cabinet to get its location
    const cabinet = await Machine.findById(cabinetId);
    if (!cabinet) {
      return NextResponse.json(
        { success: false, message: "Cabinet not found" },
        { status: 404 }
      );
    }

    // Redirect to the location-specific endpoint
    const locationId = cabinet.gamingLocation;
    if (!locationId) {
      return NextResponse.json(
        { success: false, message: "Cabinet has no associated location" },
        { status: 400 }
      );
    }

    // Forward the request to the location-specific endpoint
    const url = new URL(request.url);
    const newUrl = new URL(`/api/locations/${locationId}/cabinets/${cabinetId}/metrics`, url.origin);
    if (timePeriod) {
      newUrl.searchParams.set("timePeriod", timePeriod);
    }
    
    return NextResponse.redirect(newUrl);
  } catch (error) {
    console.error("Error in cabinet metrics endpoint:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
