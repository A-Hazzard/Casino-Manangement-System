import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/api/lib/middleware/db";
import { shouldApplyCurrencyConversion } from "@/lib/helpers/currencyConversion";
import { convertFromUSD } from "@/lib/helpers/rates";
import type { CurrencyCode } from "@/shared/types/currency";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const locations = searchParams.get("locations");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const licencee = searchParams.get("licencee");
    const displayCurrency =
      (searchParams.get("currency") as CurrencyCode) || "USD";

    if (!locations) {
      return NextResponse.json(
        { error: "Locations parameter is required" },
        { status: 400 }
      );
    }

    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: "DB connection failed" },
        { status: 500 }
      );
    }

    // Parse locations (comma-separated)
    const locationList = locations.split(",").map((loc) => loc.trim());

    // Parse date range
    let start: Date, end: Date;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default to today if no dates provided
      const today = new Date();
      start = new Date(today.setHours(0, 0, 0, 0));
      end = new Date(today.setHours(23, 59, 59, 999));
    }

    // Build query filter for machines
    const machineMatchStage: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date("2020-01-01") } },
      ],
    };

    // Add location filter if specific locations are selected
    if (locationList.length > 0 && !locationList.includes("all")) {
      machineMatchStage.gamingLocation = { $in: locationList };
    }

    // Get machines data for the selected locations
    let machinesData = await db
      .collection("machines")
      .find(machineMatchStage)
      .project({
        _id: 1,
        serialNumber: 1,
        "Custom.name": 1,
        gamingLocation: 1,
        sasMeters: 1,
        lastActivity: 1,
      })
      .sort({ lastActivity: -1 })
      .toArray();

    // Filter by licensee if provided
    if (licencee && licencee !== "all") {
      const licenseeLocations = await db
        .collection("gaminglocations")
        .find({ "rel.licencee": licencee })
        .project({ _id: 1 })
        .toArray();

      const licenseeLocationIds = licenseeLocations.map((loc) =>
        loc._id.toString()
      );

      machinesData = machinesData.filter((machine) =>
        licenseeLocationIds.includes(
          (machine as unknown as { gamingLocation: string }).gamingLocation
        )
      );
    }

    // Get all gaming locations for name resolution and gaming day offset
    const locationsData = await db
      .collection("gaminglocations")
      .find({
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date("2020-01-01") } },
        ],
      })
      .project({ _id: 1, name: 1, gameDayOffset: 1 })
      .toArray();

    // Create maps for quick location name lookup and gaming day offset
    const locationMap = new Map();
    const locationOffsetMap = new Map();
    locationsData.forEach((loc: Record<string, unknown>) => {
      locationMap.set((loc._id as string).toString(), loc.name as string);
      locationOffsetMap.set(
        (loc._id as string).toString(),
        loc.gameDayOffset || 0
      );
    });

    // Calculate gaming day range for custom date (Trinidad UTC-4 timezone)
    function getGamingDayRange(
      selectedDate: Date,
      gameDayStartHour: number = 0
    ) {
      // For custom date: get meter reading from the selected gaming day
      // Gaming day runs from gameDayStartHour to gameDayStartHour next day

      // Gaming day start on the selected date (e.g., Aug 23rd at 11:00 AM Trinidad time)
      const rangeStart = new Date(selectedDate);
      rangeStart.setUTCHours(gameDayStartHour + 4, 0, 0, 0); // Convert Trinidad time to UTC

      // Gaming day end on the selected date (e.g., Aug 21st at 11:00 AM Trinidad time)
      const rangeEnd = new Date(selectedDate);
      rangeEnd.setDate(rangeEnd.getDate() + 1); // Move to next day for gaming day end
      rangeEnd.setUTCHours(gameDayStartHour + 4, 0, 0, 0); // Convert Trinidad time to UTC

      return { rangeStart, rangeEnd };
    }

    // Helper functions to check if date range is today or yesterday (using standard calendar days for sasMeters)
    function isToday(startDate: Date, endDate: Date): boolean {
      const today = new Date();
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const todayEnd = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
        999
      );
      return (
        startDate.getTime() >= todayStart.getTime() &&
        endDate.getTime() <= todayEnd.getTime()
      );
    }

    function isYesterday(startDate: Date, endDate: Date): boolean {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStart = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate()
      );
      const yesterdayEnd = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
        23,
        59,
        59,
        999
      );
      return (
        startDate.getTime() >= yesterdayStart.getTime() &&
        endDate.getTime() <= yesterdayEnd.getTime()
      );
    }

    function isCustomDate(startDate: Date, endDate: Date): boolean {
      // Custom date is when start and end dates are the same (single date selection)
      return startDate.toDateString() === endDate.toDateString();
    }

    // Determine data source based on date range
    const isRecentData = isToday(start, end) || isYesterday(start, end);
    const isCustomData = isCustomDate(start, end);

    const metersMap = new Map();

    if (isCustomData) {
      // For custom date selection, get meter readings from the selected gaming day
      // Account for gaming day offset for each location

      // Group machines by location to apply appropriate gaming day offset
      const machinesByLocation = new Map();
      machinesData.forEach((machine: Record<string, unknown>) => {
        const locationId =
          (machine.gamingLocation as string)?.toString() || "unknown";
        if (!machinesByLocation.has(locationId)) {
          machinesByLocation.set(locationId, []);
        }
        machinesByLocation
          .get(locationId)
          .push((machine._id as string).toString());
      });

      const allMeterResults: Record<string, unknown>[] = [];

      // Process each location with its specific gaming day start hour
      for (const [
        locationId,
        locationMachineIds,
      ] of machinesByLocation.entries()) {
        const gameDayStartHour = locationOffsetMap.get(locationId) || 0;

        // Calculate the gaming day range for the selected date
        // For example: Aug 23rd with gameDayOffset: 11
        // Range: Aug 23rd 11:00 AM to Aug 21st 11:00 AM (Trinidad time)
        const { rangeStart, rangeEnd } = getGamingDayRange(
          start,
          gameDayStartHour
        );

        // Query pattern: createdAt >= rangeStart AND createdAt < rangeEnd + sort desc + limit 1
        // This gives us the latest meter reading within the selected gaming day
        for (const machineId of locationMachineIds) {
          const query = {
            machine: machineId,
            createdAt: {
              $gte: rangeStart,
              $lt: rangeEnd,
            },
          };

          const latestMeter = await db.collection("meters").findOne(query, {
            sort: { createdAt: -1 }, // Most recent first
            projection: {
              machine: 1,
              coinIn: 1,
              coinOut: 1,
              totalWonCredits: 1,
              totalCancelledCredits: 1,
              totalHandPaidCancelledCredits: 1,
              drop: 1,
              jackpot: 1,
              gamesPlayed: 1,
              readAt: 1,
              createdAt: 1,
            },
          });

          if (latestMeter) {
            allMeterResults.push(latestMeter);
          }
        }
      }

      // Create a map for meter data lookup using machine document ID
      allMeterResults.forEach((meter: Record<string, unknown>) => {
        metersMap.set(meter.machine, meter);
      });
    }

    // Transform data for the table with enhanced validation
    let transformedData = machinesData.map(
      (machine: Record<string, unknown>) => {
        const locationName = machine.gamingLocation
          ? locationMap.get(machine.gamingLocation.toString()) ||
            "Unknown Location"
          : "Unknown Location";

        // Machine ID display per specification: prefer serialNumber, fallback to custom.name
        const serialNumber = machine.serialNumber?.toString().trim() || "";
        const customName =
          (machine.Custom as Record<string, unknown>)?.name
            ?.toString()
            .trim() || "";

        // Display logic per specification
        let machineId = "";

        if (serialNumber) {
          // Prefer serialNumber (primary)
          machineId = serialNumber;
        } else if (customName) {
          // Fallback to custom.name if serialNumber is missing
          machineId = customName;
        } else {
          // Final fallback if both are missing
          machineId = `Machine ${(machine._id as string).toString().slice(-6)}`;
        }

        // Machine document ID for meters lookup
        const machineDocumentId = (machine._id as string).toString();

        // Validate meter values are reasonable (non-negative numbers)
        const validateMeter = (value: unknown): number => {
          const num = Number(value) || 0;
          return num >= 0 ? num : 0;
        };

        let metersIn,
          metersOut,
          jackpot,
          billIn,
          totalCancelledCredits,
          handPaidCredits,
          gamesPlayed;

        if (isRecentData) {
          // For today/yesterday, use machine.sasMeters (real-time data)
          const sasMeters =
            (machine.sasMeters as Record<string, unknown>) || {};
          metersIn = validateMeter(sasMeters.coinIn);
          metersOut = validateMeter(sasMeters.totalWonCredits); // Use totalWonCredits for money won
          jackpot = validateMeter(sasMeters.jackpot);
          billIn = validateMeter(sasMeters.drop);
          totalCancelledCredits = validateMeter(
            sasMeters.totalCancelledCredits
          );
          handPaidCredits = validateMeter(
            sasMeters.totalHandPaidCancelledCredits
          );
          gamesPlayed = validateMeter(sasMeters.gamesPlayed);
        } else if (isCustomData) {
          // For custom date, use latest meter reading from the selected gaming day
          const meterData = metersMap.get(machineDocumentId) || {};
          const sasMeters =
            (machine.sasMeters as Record<string, unknown>) || {};

          // Use latest meter data if available, else fall back to sasMeters
          metersIn =
            meterData.coinIn !== undefined
              ? validateMeter(meterData.coinIn)
              : validateMeter(sasMeters.coinIn);

          metersOut =
            meterData.totalWonCredits !== undefined
              ? validateMeter(meterData.totalWonCredits)
              : validateMeter(sasMeters.totalWonCredits);

          jackpot =
            meterData.jackpot !== undefined
              ? validateMeter(meterData.jackpot)
              : validateMeter(sasMeters.jackpot);

          billIn =
            meterData.drop !== undefined
              ? validateMeter(meterData.drop)
              : validateMeter(sasMeters.drop);

          totalCancelledCredits =
            meterData.totalCancelledCredits !== undefined
              ? validateMeter(meterData.totalCancelledCredits)
              : validateMeter(sasMeters.totalCancelledCredits);

          handPaidCredits =
            meterData.totalHandPaidCancelledCredits !== undefined
              ? validateMeter(meterData.totalHandPaidCancelledCredits)
              : validateMeter(sasMeters.totalHandPaidCancelledCredits);

          gamesPlayed =
            meterData.gamesPlayed !== undefined
              ? validateMeter(meterData.gamesPlayed)
              : validateMeter(sasMeters.gamesPlayed);
        } else {
          // Fallback to sasMeters for any other case
          const sasMeters =
            (machine.sasMeters as Record<string, unknown>) || {};
          metersIn = validateMeter(sasMeters.coinIn);
          metersOut = validateMeter(sasMeters.totalWonCredits);
          jackpot = validateMeter(sasMeters.jackpot);
          billIn = validateMeter(sasMeters.drop);
          totalCancelledCredits = validateMeter(
            sasMeters.totalCancelledCredits
          );
          handPaidCredits = validateMeter(
            sasMeters.totalHandPaidCancelledCredits
          );
          gamesPlayed = validateMeter(sasMeters.gamesPlayed);
        }

        // Calculate voucher out (net cancelled credits)
        const voucherOut = validateMeter(
          totalCancelledCredits - handPaidCredits
        );

        return {
          machineId: machineId,
          metersIn: metersIn,
          metersOut: metersOut,
          jackpot: jackpot,
          billIn: billIn,
          voucherOut: voucherOut,
          attPaidCredits: handPaidCredits,
          gamesPlayed: gamesPlayed,
          location: locationName,
          locationId: machine.gamingLocation?.toString() || "",
          createdAt: machine.lastActivity,
          machineDocumentId: machineDocumentId, // Include for search functionality
        };
      }
    );

    // Apply search filter if provided - search by machineId, location, serialNumber, and custom.name
    if (search) {
      const searchLower = search.toLowerCase();
      transformedData = transformedData.filter(
        (item: Record<string, unknown>) => {
          // Get the original machine data for additional search fields
          const machineData = machinesData.find(
            (m: Record<string, unknown>) =>
              (m._id as string).toString() ===
              (item as Record<string, unknown>).machineDocumentId
          );

          const serialNumber = machineData?.serialNumber || "";
          const customName =
            (machineData?.Custom as Record<string, unknown>)?.name || "";

          return (
            (item.machineId as string).toLowerCase().includes(searchLower) ||
            (item.location as string).toLowerCase().includes(searchLower) ||
            serialNumber.toLowerCase().includes(searchLower) ||
            (customName as string).toLowerCase().includes(searchLower)
          );
        }
      );
    }

    // Calculate pagination
    const totalCount = transformedData.length;
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Apply pagination
    const paginatedData = transformedData.slice(skip, skip + limit);

    const duration = Date.now() - startTime;
    console.warn(
      `Meters report completed successfully in ${duration}ms - ${totalCount} machines`
    );

    // Apply currency conversion if needed
    let convertedData = paginatedData;

    if (shouldApplyCurrencyConversion(licencee)) {
      console.warn(
        "🔍 REPORTS METERS - Applying currency conversion for All Licensee mode"
      );
      // Convert financial fields from USD to display currency
      convertedData = paginatedData.map((item) => {
        const itemAsRecord = item as unknown as Record<string, unknown>;
        const convertedItem = { ...item };
        const convertedAsRecord = convertedItem as unknown as Record<
          string,
          unknown
        >;

        // Convert top-level financial fields
        [
          "drop",
          "totalCancelledCredits",
          "gross",
          "coinIn",
          "coinOut",
          "jackpot",
          "currentCredits",
        ].forEach((field) => {
          if (typeof itemAsRecord[field] === "number") {
            convertedAsRecord[field] = convertFromUSD(
              itemAsRecord[field] as number,
              displayCurrency
            );
          }
        });

        // Handle nested movement object
        if (
          itemAsRecord.movement &&
          typeof itemAsRecord.movement === "object"
        ) {
          const movement = itemAsRecord.movement as Record<string, unknown>;
          const convertedMovement = { ...movement };
          [
            "drop",
            "totalCancelledCredits",
            "gross",
            "coinIn",
            "coinOut",
            "jackpot",
            "currentCredits",
          ].forEach((field) => {
            if (typeof movement[field] === "number") {
              convertedMovement[field] = convertFromUSD(
                movement[field] as number,
                displayCurrency
              );
            }
          });
          convertedAsRecord.movement = convertedMovement;
        }

        return convertedItem;
      });
    }

    return NextResponse.json({
      data: convertedData,
      totalCount,
      totalPages,
      currentPage: page,
      limit,
      locations: locationList,
      dateRange: { start, end },
      currency: displayCurrency,
      converted: shouldApplyCurrencyConversion(licencee),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(
      ` Meters report failed after ${duration}ms:`,
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server Error" },
      { status: 500 }
    );
  }
}
