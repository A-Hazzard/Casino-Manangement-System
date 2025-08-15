import { NextResponse, NextRequest } from "next/server";
import { GamingLocations } from "@/app/api/lib/models/gaminglocations";
import { Machine } from "@/app/api/lib/models/machines";
import { Meters } from "@/app/api/lib/models/meters";
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
    let allMeters = await Meters.find({
      machine: { $in: idVariations },
    })
      .sort({ readAt: -1 })
      .limit(10)
      .lean();

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

      allMeters = await Meters.find(objectIdQuery)
        .sort({ readAt: -1 })
        .limit(10)
        .lean();
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

    // Connect to the database
    await connectDB();

    // Get query parameters for filtering
    const licencee = url.searchParams.get("licencee");
    const searchTerm = url.searchParams.get("search");

    // Find the location by ID - try both string ID and ObjectId forms
    const locationIdObj = safeObjectId(locationId);

    const result = await GamingLocations.findOne({
      _id: { $in: [locationId, locationIdObj] },
    });

    // If location doesn't exist, return 404
    if (!result) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // CRITICAL SECURITY CHECK: Verify the location belongs to the selected licensee
    if (licencee && result.rel?.licencee !== licencee) {
      console.error(
        `Access denied: Location ${locationId} does not belong to licensee ${licencee}`
      );
      return NextResponse.json(
        { error: "Access denied: Location not found for selected licensee" },
        { status: 403 }
      );
    }

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

    // CRITICAL: Add licencee filter to ensure machines belong to the correct licensee
    if (licencee) {
      // Don't add licensee filter to machine query since machines don't have rel.licencee field
      // The licensee filtering is already handled by verifying the location belongs to the licensee
    } else {
    }

    const exactMatches = await Machine.find(exactStringQuery).lean();

    if (exactMatches.length > 0) {
      // Log a sample machine to see its structure
      if (exactMatches.length > 0) {
        // Check what licensee-related fields exist
        const sampleMachine = exactMatches[0];
      }
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

      // CRITICAL: Add licencee filter to fallback queries as well
      if (licencee) {
        // Don't add licensee filter to machine query since machines don't have rel.licencee field
        // The licensee filtering is already handled by verifying the location belongs to the licensee
      }

      const noDeletedMatches = await Machine.find(noDeletedAtQuery).lean();

      if (noDeletedMatches.length > 0) {
        // Log a sample machine from fallback query

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
          // According to financial-metrics-guide.md: use movement.drop for Money In
          moneyIn:
            machineMeters?.movement?.drop ??
            (machine.sasMeters ? (machine.sasMeters as SasMeters).drop : 0) ??
            0,
          // According to financial-metrics-guide.md: use movement.totalCancelledCredits for Money Out
          moneyOut:
            machineMeters?.movement?.totalCancelledCredits ??
            (machine.sasMeters
              ? (machine.sasMeters as SasMeters).totalCancelledCredits
              : 0) ??
            0,
          jackpot:
            machineMeters?.movement?.jackpot ??
            (machine.sasMeters
              ? (machine.sasMeters as SasMeters).jackpot
              : 0) ??
            0,
          cancelledCredits:
            machineMeters?.movement?.totalCancelledCredits ??
            (machine.sasMeters
              ? (machine.sasMeters as SasMeters).totalCancelledCredits
              : 0) ??
            0,
          // Calculate gross as drop - totalCancelledCredits (per financial-metrics-guide.md)
          gross:
            (machineMeters?.movement?.drop ??
              (machine.sasMeters ? (machine.sasMeters as SasMeters).drop : 0) ??
              0) -
            (machineMeters?.movement?.totalCancelledCredits ??
              (machine.sasMeters
                ? (machine.sasMeters as SasMeters).totalCancelledCredits
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
          // Add online status based on lastActivity
          online:
            machine.lastActivity &&
            (new Date().getTime() - new Date(machine.lastActivity).getTime()) /
              60000 <=
              3,
        };
      })
    );

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

    // Parse the request body if needed
    let requestBody: Record<string, unknown> | null = null;
    try {
      requestBody = await request.json();
    } catch (error) {}

    // Connect to the database

    await connectDB();

    // Verify the location exists first - use both string and ObjectId formats

    const locationIdObj = safeObjectId(locationId);
    const location = await GamingLocations.findOne({
      _id: { $in: [locationId, locationIdObj] },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // CRITICAL SECURITY CHECK: Verify the location belongs to the selected licensee
    const licencee = url.searchParams.get("licencee");
    if (licencee && location.rel?.licencee !== licencee) {
      console.error(
        `Access denied: Location ${locationId} does not belong to licensee ${licencee}`
      );
      return NextResponse.json(
        { error: "Access denied: Location not found for selected licensee" },
        { status: 403 }
      );
    }

    // Define a properly typed query object
    const query: CabinetsQuery = {
      $or: [
        { gamingLocation: locationId },
        { gamingLocation: locationIdObj },
        { "Custom.gamingLocation": locationId },
        { "Custom.gamingLocation": locationIdObj },
      ],
    };

    // CRITICAL: Add licencee filter to ensure machines belong to the correct licensee
    if (licencee) {
      query["rel.licencee"] = licencee;
    }

    // Find machines for this location
    let machines: CabinetQueryResult[] = (await Machine.find(
      query
    ).lean()) as CabinetQueryResult[];

    // If no machines found, try alternative approaches
    if (machines.length === 0) {
      // Try with ObjectId conversion
      try {
        if (mongoose.Types.ObjectId.isValid(locationId)) {
          const objectIdQuery: MongoQuery = {
            ...query,
            gamingLocation: new mongoose.Types.ObjectId(locationId),
          };
          const objIdResults = await Machine.find(objectIdQuery).lean();
          if (objIdResults.length > 0) {
            machines = objIdResults as CabinetQueryResult[];
          }
        }
      } catch (error) {
        console.error(`❌ Error with ObjectId query:`, error);
      }

      // If still no results, try a partial string match
      if (machines.length === 0) {
        const partialMatchQuery: MongoQuery = {
          $or: [
            { gamingLocation: { $regex: locationId, $options: "i" } },
            { "Custom.location": { $regex: locationId, $options: "i" } },
          ],
        };

        // CRITICAL: Add licencee filter to partial match query as well
        if (licencee) {
          partialMatchQuery["rel.licencee"] = licencee;
        }

        const partialResults = await Machine.find(partialMatchQuery).lean();
        if (partialResults.length > 0) {
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
          // Check if ID is in valid ObjectId format
          const isValidObjectId = mongoose.Types.ObjectId.isValid(machineId);
          if (!isValidObjectId) {
          }

          // Use our helper function to get meter data (pass locationId too)
          machineMeters = await fetchAllMetersForMachine(machineId, locationId);

          // If no specific meter data found, try the old approach
          if (!machineMeters) {
            // Try multiple approaches to find meters
            const meterResult = await Meters.findOne({
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
            } else {
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
          // According to financial-metrics-guide.md: use movement.drop for Money In
          moneyIn:
            machineMeters?.movement?.drop ??
            (sasMeters ? (sasMeters as SasMeters).drop : 0) ??
            0,
          // According to financial-metrics-guide.md: use movement.totalCancelledCredits for Money Out
          moneyOut:
            machineMeters?.movement?.totalCancelledCredits ??
            (sasMeters ? (sasMeters as SasMeters).totalCancelledCredits : 0) ??
            0,
          jackpot:
            machineMeters?.movement?.jackpot ??
            (sasMeters ? (sasMeters as SasMeters).jackpot : 0) ??
            0,
          cancelledCredits:
            machineMeters?.movement?.totalCancelledCredits ??
            (sasMeters ? (sasMeters as SasMeters).totalCancelledCredits : 0) ??
            0,
          // Calculate gross as drop - totalCancelledCredits (per financial-metrics-guide.md)
          gross:
            (machineMeters?.movement?.drop ??
              (sasMeters ? (sasMeters as SasMeters).drop : 0) ??
              0) -
            (machineMeters?.movement?.totalCancelledCredits ??
              (sasMeters
                ? (sasMeters as SasMeters).totalCancelledCredits
                : 0) ??
              0),
          // Include raw data for debugging
          metersData: machineMeters
            ? {
                readAt: machineMeters.readAt || null,
                movement: machineMeters.movement || null,
              }
            : null,
          sasMeters: sasMeters,
          // Add online status based on lastActivity
          online:
            machine.lastActivity &&
            (new Date().getTime() - new Date(machine.lastActivity).getTime()) /
              60000 <=
              3,
        };
      })
    );

    return NextResponse.json(cabinetsWithMeters);
  } catch (error) {
    console.error("Error processing location request:", error);
    return NextResponse.json(
      { error: "Failed to fetch location data" },
      { status: 500 }
    );
  }
}
