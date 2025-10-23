 import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { getGamingDayRangesForLocations } from "@/lib/utils/gamingDayRange";
import { TimePeriod } from "@/app/api/lib/types";
import { shouldApplyCurrencyConversion } from "@/lib/helpers/currencyConversion";
import type { CurrencyCode } from "@/shared/types/currency";

// Removed auto-index creation to avoid conflicts and extra latency

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timePeriod = (searchParams.get("timePeriod") as TimePeriod) || "7d";
    const licencee = searchParams.get("licencee") || undefined;
    const displayCurrency = (searchParams.get("currency") as CurrencyCode) || "USD";
    const searchTerm = searchParams.get("search")?.trim() || "";

    const showAllLocations = searchParams.get("showAllLocations") === "true";

    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const requestedLimit = parseInt(searchParams.get("limit") || "10");

    // When showAllLocations is true, return all locations for client-side pagination
    // Otherwise, use server-side pagination with limit
    const limit = showAllLocations ? 10000 : Math.min(requestedLimit, 50); // Cap at 50 for performance
    const skip = showAllLocations ? 0 : (page - 1) * limit;

    // Parse custom dates for Custom time period
    let customStartDate: Date | undefined, customEndDate: Date | undefined;
    if (timePeriod === "Custom") {
      const customStart = searchParams.get("startDate");
      const customEnd = searchParams.get("endDate");
      if (!customStart || !customEnd) {
        return NextResponse.json(
          { error: "Missing startDate or endDate" },
          { status: 400 }
        );
      }
      customStartDate = new Date(customStart);
      customEndDate = new Date(customEnd);
    }

    // Debug logging removed to reduce spam

    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: "DB connection failed" },
        { status: 500 }
      );
    }

    // Ensure indexes are created for optimal performance
    // Do not auto-create indexes on every request

    // Build location filter
    const locationMatchStage: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date("2020-01-01") } },
      ],
    };

    if (licencee && licencee !== "all") {
      locationMatchStage["rel.licencee"] = licencee;
    }

    // Add search filter for location name or _id
    if (searchTerm) {
      locationMatchStage["$and"] = [
        {
          $or: [
            { name: { $regex: searchTerm, $options: "i" } },
            { _id: searchTerm }, // Exact match for _id
          ],
        },
      ];
    }

    // Fetch all locations with their gameDayOffset
    const locations = await db
      .collection("gaminglocations")
      .find(locationMatchStage, {
        projection: { _id: 1, name: 1, gameDayOffset: 1, isLocalServer: 1 }
      })
      .toArray();

    // Calculate gaming day ranges for all locations
    const gamingDayRanges = getGamingDayRangesForLocations(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locations.map((loc: any) => ({
        _id: loc._id.toString(),
        gameDayOffset: loc.gameDayOffset || 0,
      })),
      timePeriod,
      customStartDate,
      customEndDate
    );

    // Gaming day ranges calculated for all locations

    // Process each location individually with its gaming day range
    const locationResults = [];
    
    for (const location of locations) {
      const locationId = location._id.toString();
      const gamingDayRange = gamingDayRanges.get(locationId);
      
      if (!gamingDayRange) continue;

      // Processing location with its gaming day range

      // Get machines for this location
      const machines = await db
        .collection("machines")
        .find({
          gamingLocation: locationId,
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date("2020-01-01") } }
          ]
        })
        .toArray();


      // Calculate financial metrics for this location using its gaming day range
      const metrics = await db
        .collection("meters")
        .aggregate([
          {
            $match: {
              location: locationId,
              readAt: {
                $gte: gamingDayRange.rangeStart,
                $lte: gamingDayRange.rangeEnd
              }
            }
          },
          {
            $group: {
              _id: null,
              moneyIn: { $sum: "$movement.drop" },
              moneyOut: { $sum: "$movement.totalCancelledCredits" }
            }
          }
        ])
        .toArray();

      const locationMetrics = metrics[0] || { moneyIn: 0, moneyOut: 0 };
      const gross = locationMetrics.moneyIn - locationMetrics.moneyOut;

      // Calculate machine status metrics
      const totalMachines = machines.length;
      const onlineMachines = machines.filter(m => {
        if (!m.lastActivity) return false;
        const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
        return m.lastActivity > threeMinutesAgo;
      }).length;
      
      const sasMachines = machines.filter(m => m.isSasMachine === true).length;
      const nonSasMachines = totalMachines - sasMachines;

      // Apply showAllLocations filter
      // If showAllLocations is false, skip locations with no data
      if (!showAllLocations && totalMachines === 0 && locationMetrics.moneyIn === 0 && locationMetrics.moneyOut === 0) {
        continue;
      }

      locationResults.push({
        _id: locationId,
        location: locationId,
        locationName: location.name,
        isLocalServer: location.isLocalServer || false,
        moneyIn: locationMetrics.moneyIn,
        moneyOut: locationMetrics.moneyOut,
        gross: gross,
        totalMachines: totalMachines,
        onlineMachines: onlineMachines,
        sasMachines: sasMachines,
        nonSasMachines: nonSasMachines,
        hasSasMachines: sasMachines > 0,
        hasNonSasMachines: nonSasMachines > 0,
        machines: machines.map(m => ({
          _id: m._id.toString(),
          assetNumber: m.assetNumber,
          serialNumber: m.serialNumber,
          isSasMachine: m.isSasMachine,
          lastActivity: m.lastActivity
        }))
      });
    }

    // Sort by gross revenue (highest first)
    locationResults.sort((a, b) => b.gross - a.gross);

    // Apply pagination to the filtered and sorted results
    const totalCount = locationResults.length;
    const paginatedResults = locationResults.slice(skip, skip + limit);

    // Processed all locations with pagination

    const result = [{
      metadata: [{ totalCount }],
      data: paginatedResults
    }];

    // Extract results
    const paginatedData = result[0]?.data || [];
    const totalPages = Math.ceil(totalCount / limit);

    // Data processed successfully
    
    // Data ready for response

    // Request completed

    // Apply currency conversion if needed
    let convertedData = paginatedData;
    
    if (shouldApplyCurrencyConversion(licencee)) {
      // Applying currency conversion for All Licensee mode
      // For "All Licensee" mode, we need to implement the same logic as dashboard totals
      // This is a simplified version - in production, you'd want to refactor this into a shared function
      // Import convertFromUSD properly
      const { convertFromUSD } = await import('@/lib/helpers/rates');
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      convertedData = paginatedData.map((location: any) => {
        // Convert financial fields from USD to display currency
        const convertedLocation = { ...location };
        
        // Convert the financial fields that exist in our new structure
        if (typeof location.moneyIn === 'number') {
          convertedLocation.moneyIn = convertFromUSD(location.moneyIn, displayCurrency);
        }
        if (typeof location.moneyOut === 'number') {
          convertedLocation.moneyOut = convertFromUSD(location.moneyOut, displayCurrency);
        }
        if (typeof location.gross === 'number') {
          convertedLocation.gross = convertFromUSD(location.gross, displayCurrency);
        }
        
        return convertedLocation;
      });
    }

    const response = {
      data: convertedData,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      currency: displayCurrency,
      converted: shouldApplyCurrencyConversion(licencee)
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error("Error in reports locations route:", err);
    
    // Handle specific MongoDB connection errors
    if (err instanceof Error) {
      const errorMessage = err.message.toLowerCase();
      
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
