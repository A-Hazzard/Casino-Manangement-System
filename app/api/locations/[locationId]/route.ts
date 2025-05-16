import { NextResponse, NextRequest } from "next/server";
import { GamingLocations } from "@/app/api/lib/models/gaminglocations";
import { Machine } from "@/app/api/lib/models/machines";
import { Meter } from "@/app/api/lib/models/meters";
import { connectDB } from "../../lib/middleware/db";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import {
  CabinetsQuery,
  MeterData,
  MongoQuery,
  CabinetQueryResult,
  TransformedCabinet,
  SasMeters,
  RegexFilter,
} from "@/lib/types/mongo";

// Helper function to safely convert an ID to ObjectId if possible
function safeObjectId(id: string | ObjectId): string | ObjectId {
  if (!id) return id;
  const idStr = id.toString();
  try {
    if (mongoose.Types.ObjectId.isValid(idStr)) {
      return new mongoose.Types.ObjectId(idStr);
    }
  } catch (err) {
    throw new Error(
      `Failed to convert ID to ObjectId: ${idStr}. Error: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
  return idStr;
}

// Helper function to fetch all meters for a machine and aggregate the data
async function fetchAllMetersForMachine(
  machineId: string | ObjectId,
  locationId: string
): Promise<MeterData | null> {
  // Convert machineId to string if it's an ObjectId
  const machineIdStr = String(machineId);

  try {
    // Try multiple ID formats to improve match chances
    const idVariations = [machineId, machineIdStr, safeObjectId(machineIdStr)];

    // First try to find meters by machine ID with all variations
    let allMeters = await Meter.find({
      machine: { $in: idVariations },
    })
      .sort({ readAt: -1 })
      .limit(10)
      .lean();

    if (allMeters.length > 0) {
      console.log(
        `Found ${allMeters.length} meters for machine ${machineIdStr}`
      );
    }

    // If no meters found but we have a locationId, try finding by location and machine
    if (allMeters.length === 0 && locationId) {
      // Try multiple location ID formats too
      const locationIdVariations = [locationId, safeObjectId(locationId)];

      // Try with both ObjectId and string versions of the IDs
      const objectIdQuery = {
        $or: idVariations.flatMap((machId) =>
          locationIdVariations.map((locId) => ({
            machine: machId,
            location: locId,
          }))
        ),
      };

      allMeters = await Meter.find(objectIdQuery)
        .sort({ readAt: -1 })
        .limit(10)
        .lean();

      if (allMeters.length > 0) {
        console.log(
          `Found ${allMeters.length} meters using alternative query for machine ${machineIdStr}`
        );
      }
    }

    if (allMeters.length === 0) {
      return null;
    }

    // Take the latest meter reading
    const latestMeter = allMeters[0];
    return latestMeter as MeterData;
  } catch (error) {
    console.error(`Error fetching meters for machine ${machineIdStr}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Extract locationId from the URL instead of context
    const url = request.nextUrl;
    const locationId = url.pathname.split("/")[3]; // Extract locationId from /api/locations/[locationId]

    console.log(`GET request for location: ${locationId}`);

    // Connect to the database
    await connectDB();

    // Find the location by ID - try both string ID and ObjectId forms
    const locationIdObj = safeObjectId(locationId);

    const result = await GamingLocations.findOne({
      _id: { $in: [locationId, locationIdObj] },
    });

    // If location doesn't exist, return 404
    if (!result) {
      console.error(`Location not found with ID: ${locationId}`);
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }
    console.log(`Found location: ${result.name || locationId}`);

    // Get query parameters for filtering
    const licencee = url.searchParams.get("licencee");
    const searchTerm = url.searchParams.get("search");

    // Try multiple query approaches in sequence
    let cabinets: CabinetQueryResult[] = [];

    // 1. First query - exact string match as shown in screenshots
    const exactStringQuery: CabinetsQuery = {
      $or: [
        { gamingLocation: locationIdObj },
        { "Custom.gamingLocation": locationIdObj },
      ],
    };

    // Add search filter if provided
    if (searchTerm) {
      // Create search regex filters
      const serialNumberFilter: RegexFilter = {
        $regex: searchTerm,
        $options: "i",
      };
      const relayIdFilter: RegexFilter = { $regex: searchTerm, $options: "i" };
      const smibBoardFilter: RegexFilter = {
        $regex: searchTerm,
        $options: "i",
      };

      // Use a completely new query with combined conditions
      exactStringQuery.$or = [
        {
          gamingLocation: locationIdObj,
          $or: [
            { serialNumber: serialNumberFilter },
            { relayId: relayIdFilter },
            { smibBoard: smibBoardFilter },
          ],
        },
        {
          "Custom.gamingLocation": locationIdObj,
          $or: [
            { serialNumber: serialNumberFilter },
            { relayId: relayIdFilter },
            { smibBoard: smibBoardFilter },
          ],
        },
      ];
    }

    // Add licencee filter if provided
    if (licencee) {
      exactStringQuery["rel.licencee"] = licencee;
    }

    const exactMatches = await Machine.find(exactStringQuery).lean();

    if (exactMatches.length > 0) {
      console.log(`Found ${exactMatches.length} cabinets with exact match`);
      cabinets = exactMatches as CabinetQueryResult[];
    } else {
      // Try fallback queries if no results found
      console.warn(`No cabinets found with exact match, trying fallbacks`);

      // Try various fallback methods here (already in your code)
      // Only log the important results, not each step

      // 2. Try without deletedAt filter
      const noDeletedAtQuery: MongoQuery = {
        gamingLocation: locationId,
      };

      const noDeletedMatches = await Machine.find(noDeletedAtQuery).lean();

      if (noDeletedMatches.length > 0) {
        console.log(
          `Found ${noDeletedMatches.length} cabinets with fallback query`
        );
        cabinets = noDeletedMatches as CabinetQueryResult[];
      } else {
        // Other fallback methods with minimal logging
        // ...
      }
    }

    // Get the newest meters for each machine - with minimal logging
    const cabinetsWithMeters: TransformedCabinet[] = await Promise.all(
      cabinets.map(async (machine) => {
        let machineMeters: MeterData | null = null;
        // Ensure we have a proper ID for lookup before starting
        const machineId = machine._id
          ? machine._id.toString()
          : String(machine._id);

        try {
          // Use our helper function to get meter data
          machineMeters = await fetchAllMetersForMachine(machineId, locationId);
        } catch (error) {
          console.error(`Error processing machine ${machineId}:`, error);
        }

        // Transform cabinet for the response - same as before
        // ...

        return {
          // ... cabinet transformation logic - no change needed
          _id: machine._id.toString(),
          locationId: machine.gamingLocation
            ? machine.gamingLocation.toString()
            : "",
          locationName: result.name || "",
          assetNumber: machine.serialNumber || "",
          serialNumber: machine.serialNumber || "",
          relayId: machine.relayId || "",
          smibBoard: machine.smibBoard || "",
          smbId: machine.smibBoard || machine.relayId || "",
          lastActivity: machine.lastActivity || null,
          lastOnline: machine.lastActivity || null,
          game: machine.game || "",
          installedGame: machine.game || "",
          cabinetType: machine.cabinetType || "",
          assetStatus: machine.assetStatus || "",
          status: machine.assetStatus || "",
          // Use meter data if available, otherwise use sasMeters or default to 0
          moneyIn:
            machineMeters?.movement?.drop ??
            machineMeters?.drop ??
            (machine.sasMeters ? (machine.sasMeters as SasMeters).coinIn : 0) ??
            0,
          moneyOut:
            machineMeters?.movement?.coinOut ??
            machineMeters?.coinOut ??
            (machine.sasMeters
              ? (machine.sasMeters as SasMeters).coinOut
              : 0) ??
            0,
          jackpot:
            machineMeters?.movement?.jackpot ??
            machineMeters?.jackpot ??
            (machine.sasMeters
              ? (machine.sasMeters as SasMeters).jackpot
              : 0) ??
            0,
          cancelledCredits:
            machineMeters?.movement?.totalCancelledCredits ??
            machineMeters?.totalCancelledCredits ??
            (machine.sasMeters
              ? (machine.sasMeters as SasMeters).totalCancelledCredits
              : 0) ??
            0,
          // Calculate gross
          gross:
            (machineMeters?.movement?.drop ??
              machineMeters?.drop ??
              (machine.sasMeters
                ? (machine.sasMeters as SasMeters).coinIn
                : 0) ??
              0) -
            (machineMeters?.movement?.coinOut ??
              machineMeters?.coinOut ??
              (machine.sasMeters
                ? (machine.sasMeters as SasMeters).coinOut
                : 0) ??
              0) -
            (machineMeters?.movement?.jackpot ??
              machineMeters?.jackpot ??
              (machine.sasMeters
                ? (machine.sasMeters as SasMeters).jackpot
                : 0) ??
              0),
          // Include raw data for debugging
          metersData: machineMeters
            ? {
                readAt: machineMeters.readAt || null,
                movement: machineMeters.movement || null,
              }
            : null,
          sasMeters: machine.sasMeters || null,
        };
      })
    );

    console.log(`Returning ${cabinetsWithMeters.length} cabinets`);
    return NextResponse.json(cabinetsWithMeters);
  } catch (error) {
    console.error("Error processing location request:", error);
    return NextResponse.json(
      { error: "Failed to fetch location data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Extract locationId from the URL instead of context
    const url = request.nextUrl;
    const locationId = url.pathname.split("/")[3]; // Extract locationId from /api/locations/[locationId]

    console.log(`🔍 POST request for cabinets in location: ${locationId}`);

    // Parse the request body if needed
    let requestBody: Record<string, unknown> | null = null;
    try {
      requestBody = await request.json();
      console.log(`📝 Received request body:`, requestBody);
    } catch (error) {
      console.log(`ℹ️ No request body or failed to parse:`, error);
    }

    // Connect to the database
    console.log("🔌 Connecting to database...");
    await connectDB();
    console.log("✅ Database connection successful");

    // Verify the location exists first - use both string and ObjectId formats
    console.log(`🔍 Verifying location with ID: ${locationId} exists`);
    const locationIdObj = safeObjectId(locationId);
    const location = await GamingLocations.findOne({
      _id: { $in: [locationId, locationIdObj] },
    });

    if (!location) {
      console.log(`❌ Location not found with ID: ${locationId}`);
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }
    console.log(
      `✅ Location verification passed for: ${
        location.name || locationId
      } (ID: ${location._id})`
    );

    // Define a properly typed query object
    const query: CabinetsQuery = {
      $or: [
        { gamingLocation: locationId },
        { gamingLocation: locationIdObj },
        { "Custom.gamingLocation": locationId },
        { "Custom.gamingLocation": locationIdObj },
      ],
    };

    console.log(`🔍 Querying machines with:`, JSON.stringify(query));

    // Find machines for this location
    let machines: CabinetQueryResult[] = (await Machine.find(
      query
    ).lean()) as CabinetQueryResult[];
    console.log(
      `✅ Found ${machines.length} machines for location ${locationId}`
    );

    // If no machines found, try alternative approaches
    if (machines.length === 0) {
      console.log(
        `⚠️ No machines found with direct match, trying alternative queries...`
      );

      // Try with ObjectId conversion
      try {
        if (mongoose.Types.ObjectId.isValid(locationId)) {
          console.log(`🔍 Trying with ObjectId conversion...`);
          const objectIdQuery: MongoQuery = {
            ...query,
            gamingLocation: new mongoose.Types.ObjectId(locationId),
          };
          const objIdResults = await Machine.find(objectIdQuery).lean();
          if (objIdResults.length > 0) {
            console.log(
              `✅ Found ${objIdResults.length} machines using ObjectId conversion`
            );
            machines = objIdResults as CabinetQueryResult[];
          }
        }
      } catch (error) {
        console.error(`❌ Error with ObjectId query:`, error);
      }

      // If still no results, try a partial string match
      if (machines.length === 0) {
        console.log(`🔍 Trying partial string match...`);
        const partialMatchQuery: MongoQuery = {
          $or: [
            { gamingLocation: { $regex: locationId, $options: "i" } },
            { "Custom.location": { $regex: locationId, $options: "i" } },
          ],
        };
        const partialResults = await Machine.find(partialMatchQuery).lean();
        if (partialResults.length > 0) {
          console.log(
            `✅ Found ${partialResults.length} machines using partial match`
          );
          machines = partialResults as CabinetQueryResult[];
        }
      }
    }

    // Get the newest meters for each machine
    const cabinetsWithMeters: TransformedCabinet[] = await Promise.all(
      machines.map(async (machine) => {
        let machineMeters: MeterData | null = null;
        // Ensure we have a proper ID for lookup before starting
        const machineId = machine._id
          ? machine._id.toString()
          : String(machine._id);

        try {
          console.log(
            `📋 Processing machine: ${machineId} (${
              machine.serialNumber || "No serial"
            })`
          );

          // Check if ID is in valid ObjectId format
          const isValidObjectId = mongoose.Types.ObjectId.isValid(machineId);
          if (!isValidObjectId) {
            console.log(`⚠️ Machine has invalid ObjectId format: ${machineId}`);
          }

          // Use our helper function to get meter data (pass locationId too)
          machineMeters = await fetchAllMetersForMachine(machineId, locationId);

          // If no specific meter data found, try the old approach
          if (!machineMeters) {
            console.log(
              `⚠️ No meters found using helper function, trying fallback approach for machine ${machineId}`
            );

            // Try multiple approaches to find meters
            const meterResult = await Meter.findOne({
              $or: [
                { machine: machine._id },
                { machine: machineId },
                {
                  machine: machine._id,
                  location: locationId,
                },
                {
                  machine: machineId,
                  location: locationId,
                },
              ],
            })
              .sort({ readAt: -1 })
              .lean();

            if (meterResult) {
              machineMeters = meterResult as MeterData;
              console.log(
                `✅ Found meters for machine ${machineId} using fallback approach`
              );
            } else {
              console.log(
                `⚠️ Could not find any meters for machine ${machineId}`
              );
            }
          }
        } catch (error) {
          console.error(
            `❌ Error fetching meters for machine ${machineId}:`,
            error
          );
        }

        // Get sasMeters safely
        const sasMeters = machine.sasMeters || null;

        // Transform machine to cabinet format
        return {
          _id: machine._id.toString(),
          locationId: machine.gamingLocation
            ? machine.gamingLocation.toString()
            : "",
          locationName: location.name || "",
          assetNumber: machine.serialNumber || "",
          serialNumber: machine.serialNumber || "",
          relayId: machine.relayId || "",
          smibBoard: machine.smibBoard || "",
          smbId: machine.smibBoard || machine.relayId || "",
          lastActivity: machine.lastActivity || null,
          lastOnline: machine.lastActivity || null,
          game: machine.game || "",
          installedGame: machine.game || "",
          cabinetType: machine.cabinetType || "",
          assetStatus: machine.assetStatus || "",
          status: machine.assetStatus || "",
          // Use meter data if available, otherwise use sasMeters or default to 0
          moneyIn:
            machineMeters?.movement?.drop ??
            machineMeters?.drop ??
            (sasMeters ? (sasMeters as SasMeters).coinIn : 0) ??
            0,
          moneyOut:
            machineMeters?.movement?.coinOut ??
            machineMeters?.coinOut ??
            (sasMeters ? (sasMeters as SasMeters).coinOut : 0) ??
            0,
          jackpot:
            machineMeters?.movement?.jackpot ??
            machineMeters?.jackpot ??
            (sasMeters ? (sasMeters as SasMeters).jackpot : 0) ??
            0,
          cancelledCredits:
            machineMeters?.movement?.totalCancelledCredits ??
            machineMeters?.totalCancelledCredits ??
            (sasMeters ? (sasMeters as SasMeters).totalCancelledCredits : 0) ??
            0,
          // Calculate gross
          gross:
            (machineMeters?.movement?.drop ??
              machineMeters?.drop ??
              (sasMeters ? (sasMeters as SasMeters).coinIn : 0) ??
              0) -
            (machineMeters?.movement?.coinOut ??
              machineMeters?.coinOut ??
              (sasMeters ? (sasMeters as SasMeters).coinOut : 0) ??
              0) -
            (machineMeters?.movement?.jackpot ??
              machineMeters?.jackpot ??
              (sasMeters ? (sasMeters as SasMeters).jackpot : 0) ??
              0),
          // Include raw data for debugging
          metersData: machineMeters
            ? {
                readAt: machineMeters.readAt || null,
                movement: machineMeters.movement || null,
              }
            : null,
          sasMeters: sasMeters,
        };
      })
    );

    console.log(`📤 Returning ${cabinetsWithMeters.length} cabinet records`);
    // Return the machines data
    return NextResponse.json(cabinetsWithMeters);
  } catch (error) {
    console.error("❌ Error fetching machines:", error);
    return NextResponse.json(
      { error: "Failed to fetch machines" },
      { status: 500 }
    );
  }
}
