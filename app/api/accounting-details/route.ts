import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { getAccountingDetails } from "@/lib/helpers/accountingDetails";
import type { BillValidatorTimePeriod } from "@/shared/types/billValidator";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const machineId = searchParams.get("machineId");
    const timePeriod =
      (searchParams.get("timePeriod") as BillValidatorTimePeriod) || "today";

    if (!machineId) {
      return NextResponse.json(
        { success: false, error: "Machine ID is required" },
        { status: 400 }
      );
    }

    // Fetch accounting details including accepted bills
    const accountingDetails = await getAccountingDetails(machineId, timePeriod);

    return NextResponse.json({
      success: true,
      data: accountingDetails,
    });
  } catch (error) {
    console.error(" Accounting Details API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch accounting details",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
