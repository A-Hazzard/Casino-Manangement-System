import { NextRequest, NextResponse } from "next/server";
import { getLocationsWithMetrics } from "@/app/api/lib/helpers/locationAggregation";
import { TimePeriod } from "@/app/api/lib/types";
import { getDatesForTimePeriod } from "../lib/utils/dates";
import { connectDB } from "@/app/api/lib/middleware/db";
import { LocationFilter } from "@/lib/types/location";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timePeriod = (searchParams.get("timePeriod") as TimePeriod) || "7d";
    const licencee = searchParams.get("licencee") || undefined;
    const machineTypeFilter =
      (searchParams.get("machineTypeFilter") as LocationFilter) || null;

    let startDate: Date, endDate: Date;

    if (timePeriod === "Custom") {
      const customStart = searchParams.get("startDate");
      const customEnd = searchParams.get("endDate");
      if (!customStart || !customEnd) {
        return NextResponse.json(
          { error: "Missing startDate or endDate" },
          { status: 400 }
        );
      }
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
    } else {
      const { startDate: s, endDate: e } = getDatesForTimePeriod(timePeriod);
      startDate = s;
      endDate = e;
    }

    const db = await connectDB();
    if (!db)
      return NextResponse.json(
        { error: "DB connection failed" },
        { status: 500 }
      );

    const data = await getLocationsWithMetrics(
      db,
      { startDate, endDate },
      true,
      licencee,
      machineTypeFilter
    );

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("Error in locationAggregation route:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server Error" },
      { status: 500 }
    );
  }
}
