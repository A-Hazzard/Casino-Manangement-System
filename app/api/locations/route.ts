import { NextResponse } from "next/server";
import { GamingLocations } from "@/app/api/lib/models/gaminglocations";
import path from "path";
import fs from "fs";
import { connectDB } from "@/app/api/lib/middleware/db";
import { UpdateLocationData } from "@/lib/types/location";
import { apiLogger } from "@/app/api/lib/utils/logger";
import { NextRequest } from "next/server";

export async function GET(request: Request) {
  const context = apiLogger.createContext(request as NextRequest, "/api/locations");
  apiLogger.startLogging();

  try {
    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const licencee = searchParams.get("licencee");
    const minimal = searchParams.get("minimal") === "1";

    // Build query filter
    const queryFilter: Record<string, string> = {};
    if (licencee && licencee !== "all") {
      queryFilter["rel.licencee"] = licencee;
    }

    // Fetch locations. If minimal is requested, project minimal fields only.
    const projection = minimal ? { _id: 1, name: 1, geoCoords: 1 } : undefined;
    const locations = await GamingLocations.find(queryFilter, projection)
      .sort({ name: 1 })
      .lean();

    const missingGeoCoords: string[] = [];
    const zeroGeoCoords: string[] = [];
    const validLocations: Record<string, unknown>[] = [];

    // Process all locations
    locations.forEach((location) => {
      if (!location.geoCoords && location._id) {
        // Case: Missing geoCoords
        missingGeoCoords.push(`${location._id.toString()} (${location.name})`);
      } else if (location.geoCoords) {
        const { latitude, longitude, longtitude } = location.geoCoords;

        // Use longitude if available, otherwise fallback to longtitude
        const validLongitude = longitude !== undefined ? longitude : longtitude;

        if ((latitude === 0 || validLongitude === 0) && location._id) {
          // Case: Zero-valued geoCoords
          zeroGeoCoords.push(`${location._id.toString()} (${location.name})`);
        } else {
          // Case: Valid coordinates
          validLocations.push(location);
        }
      }
    });

    // Return minimal or full set based on query
    const locationsToReturn = minimal ? locations : locations;

    // Prepare log directory
    const logDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

    const logFile = path.join(logDir, "missing_geoCoords.log");
    const logData = [
      `[${new Date().toISOString()}] - Missing/Invalid GeoCoords Report`,
      `Missing geoCoords:\n ${
        missingGeoCoords.length ? missingGeoCoords.join(", \n") : "None"
      }`,
      `Zero-valued geoCoords:\n ${
        zeroGeoCoords.length ? zeroGeoCoords.join(", \n") : "None"
      }`,
      "---------------------------------------------\n",
    ].join("\n");

    // Append log entry
    fs.appendFileSync(logFile, logData);

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
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { success: false, message: "Location name is required" },
        { status: 400 }
      );
    }

    // Create new location
    const newLocation = new GamingLocations({
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
      createdAt: new Date(),
      updatedAt: new Date(),
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
      locationName,
      name,
      address,
      country,
      profitShare,
      rel,
      isLocalServer,
      geoCoords,
    } = body;

    if (!locationName) {
      return NextResponse.json(
        { success: false, message: "Location name is required" },
        { status: 400 }
      );
    }

    try {
      // Find the location by name - use exact match with the locationName
      const location = await GamingLocations.findOne({ name: locationName });

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
        if (address.street) updateData.address.street = address.street;
        if (address.city) updateData.address.city = address.city;
      }

      if (rel) {
        updateData.rel = {};
        if (rel.licencee) updateData.rel.licencee = rel.licencee;
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
    console.error("API Error in PUT /api/locations:", errorMessage);
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
