import { connectDB } from "@/app/api/lib/middleware/db";
import { NextRequest, NextResponse } from "next/server";
import { getDatesForTimePeriod } from "@/app/api/lib/utils/dates";
import { getMetricsForLocations } from "@/app/api/lib/helpers/meters/aggregations";
import type { ParamsType } from "@shared/types";

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
    
    // Only proceed if timePeriod is provided - no fallback
    if (!timePeriod) {
      return NextResponse.json(
        { error: "timePeriod parameter is required" },
        { status: 400 }
      );
    }
    
    // Ensure type safety for timePeriod and licencee
    const apiParams: ParamsType = {
      timePeriod: timePeriod as ParamsType["timePeriod"],
      licencee: licencee || "",
    };
    if (startDate && endDate) {
      // For custom date ranges, the frontend sends dates that already represent Trinidad time
      // We need to convert them to UTC for database queries by adding 4 hours
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Convert Trinidad time to UTC by adding 4 hours
      startDate = new Date(start.getTime() + (4 * 60 * 60 * 1000)).toISOString();
      endDate = new Date(end.getTime() + (4 * 60 * 60 * 1000)).toISOString();
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

    // Handle "All Time" case - pass undefined dates for "All Time" periods
    let dateFilter: { startDate: Date | undefined; endDate: Date | undefined };
    if (startDate !== "All Time" && endDate !== "All Time") {
      dateFilter = { startDate: new Date(startDate), endDate: new Date(endDate) };
    } else {
      dateFilter = { startDate: undefined, endDate: undefined };
    }

    const metrics = await getMetricsForLocations(
      db,
      dateFilter,
      false,
      apiParams.licencee, // pass the licencee value (if provided)
      apiParams.timePeriod // pass the time period to determine aggregation type
    );

    // If no metrics found, return a default entry with 0 values
    // This ensures the dashboard always gets data to calculate totals
    if (metrics.length === 0) {
      const defaultMetrics = [{
        day: startDate !== "All Time" ? new Date(startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
        time: "00:00",
        drop: 0,
        totalCancelledCredits: 0,
        gross: 0,
        gamesPlayed: 0,
        jackpot: 0,
        location: "",
        machine: "",
        geoCoords: null
      }];
      return NextResponse.json(defaultMetrics);
    }

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

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error in metrics API:", error);
    
    // Handle specific MongoDB connection errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // MongoDB connection timeout
      if (errorMessage.includes("mongonetworktimeouterror") || 
          (errorMessage.includes("connection") && errorMessage.includes("timed out"))) {
        return NextResponse.json(
          { 
            error: "Database connection timeout",
            message: "The database is currently experiencing high load. Please try again in a few moments.",
            type: "CONNECTION_TIMEOUT",
            retryable: true
          },
          { status: 503 }
        );
      }
      
      // MongoDB server selection error
      if (errorMessage.includes("mongoserverselectionerror") || 
          errorMessage.includes("server selection")) {
        return NextResponse.json(
          { 
            error: "Database server unavailable",
            message: "Unable to connect to the database server. Please try again later.",
            type: "SERVER_UNAVAILABLE",
            retryable: true
          },
          { status: 503 }
        );
      }
      
      // Generic MongoDB connection error
      if (errorMessage.includes("mongodb") || errorMessage.includes("connection")) {
        return NextResponse.json(
          { 
            error: "Database connection failed",
            message: "Unable to establish connection to the database. Please try again.",
            type: "CONNECTION_ERROR",
            retryable: true
          },
          { status: 503 }
        );
      }
    }
    
    // Generic server error
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "An unexpected error occurred while processing your request.",
        type: "INTERNAL_ERROR",
        retryable: false
      },
      { status: 500 }
    );
  }
}
