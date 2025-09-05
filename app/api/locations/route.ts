import { NextRequest, NextResponse } from "next/server";
import { GamingLocations } from "@/app/api/lib/models/gaminglocations";

import { connectDB } from "@/app/api/lib/middleware/db";
import { UpdateLocationData } from "@/lib/types/location";
import { apiLogger } from "@/app/api/lib/utils/logger";
import {
  analyzeLocationGeoCoords,
  logGeoCoordIssues,
} from "@/app/api/lib/helpers/locationFileLogging";
import { generateMongoId } from "@/lib/utils/id";

export async function GET(request: Request) {
  const context = apiLogger.createContext(
    request as NextRequest,
    "/api/locations"
  );
  apiLogger.startLogging();

  try {
    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const licencee = searchParams.get("licencee");
    const minimal = searchParams.get("minimal") === "1";

    // Build query filter
    const queryFilter: Record<string, unknown> = {};
    if (licencee && licencee !== "all") {
      queryFilter["rel.licencee"] = licencee;
    }

    // Exclude deleted locations
    queryFilter.$or = [
      { deletedAt: null },
      { deletedAt: { $lt: new Date("2020-01-01") } },
    ];

    // Fetch locations. If minimal is requested, project minimal fields only.
    const projection = minimal ? { _id: 1, name: 1, geoCoords: 1 } : undefined;
    const locations = await GamingLocations.find(queryFilter, projection)
      .sort({ name: 1 })
      .lean();

    // Analyze location geoCoords and log issues
    const { missingGeoCoords, zeroGeoCoords } =
      analyzeLocationGeoCoords(locations);
    logGeoCoordIssues(missingGeoCoords, zeroGeoCoords);

    // Return minimal or full set based on query
    const locationsToReturn = minimal ? locations : locations;

    apiLogger.logSuccess(
      context,
      `Successfully fetched ${locationsToReturn.length} locations (minimal: ${minimal})`
    );
    return NextResponse.json({ locations: locationsToReturn }, { status: 200 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    apiLogger.logError(context, "Failed to fetch locations", errorMessage);
    return NextResponse.json({ success: false, message: errorMessage });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const {
      name,
      address,
      country,
      profitShare,
      rel,
      isLocalServer,
      geoCoords,
      billValidatorOptions,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { success: false, message: "Location name is required" },
        { status: 400 }
      );
    }

    // Create new location with proper MongoDB ObjectId-style hex string
    const locationId = await generateMongoId();
    const newLocation = new GamingLocations({
      _id: locationId,
      name,
      country,
      address: {
        street: address?.street || "",
        city: address?.city || "",
      },
      rel: {
        licencee: rel?.licencee || "",
      },
      profitShare: profitShare || 50,
      isLocalServer: isLocalServer || false,
      geoCoords: {
        latitude: geoCoords?.latitude || 0,
        longitude: geoCoords?.longitude || 0,
      },
      billValidatorOptions: billValidatorOptions || {
        denom1: true,
        denom2: true,
        denom5: true,
        denom10: true,
        denom20: true,
        denom50: true,
        denom100: true,
        denom200: true,
        denom500: true,
        denom1000: false,
        denom2000: false,
        denom5000: false,
        denom10000: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(-1), // SMIB boards require all fields to be present
    });

    // Save the new location
    await newLocation.save();

    return NextResponse.json(
      { success: true, location: newLocation },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    console.error("API Error in POST /api/locations:", errorMessage);
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    const {
      locationName, // This should be the location ID
      name,
      address,
      country,
      profitShare,
      rel,
      isLocalServer,
      geoCoords,
      billValidatorOptions,
    } = body;

    if (!locationName) {
      return NextResponse.json(
        { success: false, message: "Location ID is required" },
        { status: 400 }
      );
    }

    try {
      // Find the location by ID (not by name) and ensure it's not deleted
      const location = await GamingLocations.findOne({
        _id: locationName,
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date("2020-01-01") } },
        ],
      });

      if (!location) {
        return NextResponse.json(
          { success: false, message: "Location not found" },
          { status: 404 }
        );
      }

      const locationId = location._id.toString();

      // Create update data object with only the fields that are present in the request
      const updateData: UpdateLocationData = {};

      // Only include fields that are present in the request
      if (name) updateData.name = name;
      if (country) updateData.country = country;

      // Handle nested objects
      if (address) {
        updateData.address = {};
        if (address.street !== undefined)
          updateData.address.street = address.street;
        if (address.city !== undefined) updateData.address.city = address.city;
      }

      if (rel) {
        updateData.rel = {};
        if (rel.licencee !== undefined) updateData.rel.licencee = rel.licencee;
      }

      // Handle primitive types with explicit checks to handle zero values
      if (typeof profitShare === "number") updateData.profitShare = profitShare;
      if (typeof isLocalServer === "boolean")
        updateData.isLocalServer = isLocalServer;

      // Handle nested geoCoords object
      if (geoCoords) {
        updateData.geoCoords = {};
        if (typeof geoCoords.latitude === "number")
          updateData.geoCoords.latitude = geoCoords.latitude;
        if (typeof geoCoords.longitude === "number")
          updateData.geoCoords.longitude = geoCoords.longitude;
      }

      // Handle billValidatorOptions
      if (billValidatorOptions) {
        updateData.billValidatorOptions = billValidatorOptions;
      }

      // Always update the updatedAt timestamp
      updateData.updatedAt = new Date();

      // Update the location
      const result = await GamingLocations.updateOne(
        { _id: locationId },
        { $set: updateData }
      );

      if (result.modifiedCount === 0) {
        return NextResponse.json(
          { success: false, message: "No changes were made to the location" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Location updated successfully",
          locationId,
        },
        { status: 200 }
      );
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { success: false, message: "Database operation failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Location ID is required" },
        { status: 400 }
      );
    }

    // Soft delete by setting deletedAt
    const deletedLocation = await GamingLocations.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    );

    if (!deletedLocation) {
      return NextResponse.json(
        { success: false, message: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Location deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    console.error("API Error in DELETE /api/locations:", errorMessage);
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
