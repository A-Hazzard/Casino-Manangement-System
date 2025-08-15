import { connectDB } from "@/app/api/lib/middleware/db";
import { NextRequest, NextResponse } from "next/server";
import { getDatesForTimePeriod } from "@/app/api/lib/utils/dates";
import { getMetricsForLocations } from "@/app/api/lib/helpers/meters/aggregations";
import type { ApiParamsType } from "@shared/types";

/**
 * Retrieves **meter trend data** for gaming locations based on a specified **time period** or a **Custom date range**.
 *
 * **Request Parameters**
 * - `timePeriod` (optional) - **"today"**, **"yesterday"**, **"7d"**, **"30d"**, or `"all"`.
 * - `startDate` (optional) - A **Custom start date** (`YYYY-MM-DD` format). Must be used with `endDate`.
 * - `endDate` (optional) - A **Custom end date** (`YYYY-MM-DD` format). Must be used with `startDate`.
 * - `licencee` (optional) - A **licencee ID** to filter gaming locations.
 *
 * **Response Format**
 *
 * For a licencee-filtered query, the response will be in the form:
 * ```json
 * {
 *    "result": [
 *      {
 *         "location": "240614a7ad184038a6ef0347",
 *         "drop": 477,
 *         "totalCancelledCredits": 100,
 *         "gross": 377
 *      },
 *      ...
 *    ]
 * }
 * ```
 *
 * @param req - The incoming HTTP request object
 * @returns JSON response containing the requested **meter trend data** or an error message
 */
export async function GET(req: NextRequest) {
  try {
    const db = await connectDB();
    if (!db) {
      console.error("Database connection not established");
      return NextResponse.json(
        { error: "Database connection not established" },
        { status: 500 }
      );
    }
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());

    let { startDate, endDate } = params;
    const timePeriod = params.timePeriod;
    const licencee = params.licencee;
    // Ensure type safety for timePeriod and licencee
    const apiParams: ApiParamsType = {
      timePeriod: (timePeriod as ApiParamsType["timePeriod"]) || "Today",
      licencee: licencee || "",
    };
    if (startDate && endDate) {
      startDate = new Date(startDate).toISOString();
      endDate = new Date(endDate).toISOString();
    } else {
      const dates = getDatesForTimePeriod(apiParams.timePeriod);
      startDate = dates.startDate?.toISOString() || "All Time";
      endDate = dates.endDate?.toISOString() || "All Time";
    }

    if (!startDate || !endDate) {
      console.error("Invalid date range provided.");
      return NextResponse.json(
        { error: "Invalid date range." },
        { status: 400 }
      );
    }

    // console.log(`Fetching meters for ${apiParams.timePeriod}...`);

    const metrics = await getMetricsForLocations(
      db,
      { startDate: new Date(startDate), endDate: new Date(endDate) },
      false,
      apiParams.licencee // pass the licencee value (if provided)
    );

    if (apiParams.licencee) {
      if (metrics.length > 0) {
        // console.log("Metrics successfully retrieved for licencee");
      } else {
        console.error(
          `No metrics data found for licencee ${apiParams.licencee}`
        );
      }
    } else {
      // console.log("Metrics successfully retrieved");
    }

    // console.log(`Successfully retrieved metrics for: ${apiParams.timePeriod}`);

    // If a licencee filter is used, wrap the result in an object with key "result"
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error in metrics API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
