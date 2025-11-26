/**
 * Collection Creation Helper Functions
 *
 * Provides helper functions for creating collections, including SAS metrics calculation,
 * movement calculations, machine updates, and collection validation. It orchestrates
 * the complete collection creation process with proper time period handling and
 * meter synchronization.
 *
 * Features:
 * - Calculates SAS metrics from meters collection for specific time periods.
 * - Determines SAS time periods from previous collections or machine data.
 * - Retrieves previous collection meters for movement calculations.
 * - Validates collection creation payloads.
 * - Orchestrates complete collection creation with all calculations.
 */

import { connectDB } from "@/app/api/lib/middleware/db";
import { Meters } from "@/app/api/lib/models/meters";
import { Machine } from "@/app/api/lib/models/machines";
import { calculateMovement } from "@/lib/utils/movementCalculation";
import type {
  SasMetricsCalculation,
  PreviousCollectionMeters,
  MovementCalculation,
} from "@/lib/types/collections";

// ============================================================================
// Machine Identifier Operations
// ============================================================================

/**
 * Get machine identifier with priority: serialNumber -> customName -> machineId
 */
export async function getMachineIdentifier(machineId: string): Promise<string> {
  await connectDB();

  // CRITICAL: Use findOne with _id instead of findById (repo rule)
  const machine = await Machine.findOne({ _id: machineId }).lean();
  if (!machine) {
    throw new Error(`Machine not found: ${machineId}`);
  }

  // Safely access machine properties with type assertion
  const machineData = machine as Record<string, unknown>;

  // Priority: serialNumber -> customName -> machineId
  return (
    (machineData.serialNumber as string) ||
    (machineData.customName as string) ||
    machineId
  );
}

// ============================================================================
// SAS Metrics Calculation
// ============================================================================

/**
 * Calculate SAS metrics from meters collection
 * Queries all meters movement objects for the selected machine within the SAS time period
 */
export async function calculateSasMetrics(
  machineId: string,
  sasStartTime: Date,
  sasEndTime: Date
): Promise<SasMetricsCalculation> {
  await connectDB();

  const machineIdentifier = await getMachineIdentifier(machineId);

  // Query all meters within the SAS time period
  const metersInPeriod = await Meters.find({
    machine: machineIdentifier,
    readAt: { $gte: sasStartTime, $lte: sasEndTime },
  })
    .sort({ readAt: 1 })
    .lean();

  if (metersInPeriod.length === 0) {
    // No meters found in period, return zero values
    return {
      drop: 0,
      totalCancelledCredits: 0,
      gross: 0,
      sasStartTime: sasStartTime.toISOString(),
      sasEndTime: sasEndTime.toISOString(),
      gamesPlayed: 0,
      jackpot: 0,
    };
  }

  // Sum all movement fields (daily deltas) within the SAS time period
  // This is the correct approach when machines only have movement data, not cumulative data
  const drop = metersInPeriod.reduce(
    (sum, meter) => sum + (meter.movement?.drop || 0),
    0
  );
  const totalCancelledCredits = metersInPeriod.reduce(
    (sum, meter) => sum + (meter.movement?.totalCancelledCredits || 0),
    0
  );
  const gamesPlayed = metersInPeriod.reduce(
    (sum, meter) => sum + (meter.movement?.gamesPlayed || 0),
    0
  );
  const jackpot = metersInPeriod.reduce(
    (sum, meter) => sum + (meter.movement?.jackpot || 0),
    0
  );

  const gross = drop - totalCancelledCredits;

  console.warn(`🔍 SAS Metrics calculation for machine ${machineIdentifier}:`);
  console.warn(
    `  Time period: ${sasStartTime.toISOString()} to ${sasEndTime.toISOString()}`
  );
  console.warn(`  Meters found: ${metersInPeriod.length}`);
  console.warn(`  Total drop (sum of movement.drop): ${drop}`);
  console.warn(
    `  Total cancelled (sum of movement.totalCancelledCredits): ${totalCancelledCredits}`
  );
  console.warn(`  SAS Gross: ${gross}`);

  return {
    drop,
    totalCancelledCredits,
    gross,
    sasStartTime: sasStartTime.toISOString(),
    sasEndTime: sasEndTime.toISOString(),
    gamesPlayed,
    jackpot,
  };
}

// ============================================================================
// SAS Time Period Operations
// ============================================================================

/**
 * Get SAS time period from machine collectionTime and custom times
 */
export async function getSasTimePeriod(
  machineId: string,
  customStartTime?: Date,
  customEndTime?: Date
): Promise<{ sasStartTime: Date; sasEndTime: Date }> {
  await connectDB();

  // If custom times are provided, use them
  if (customStartTime && customEndTime) {
    return { sasStartTime: customStartTime, sasEndTime: customEndTime };
  }

  // Require explicit end time: must be provided by caller (collection timestamp)
  // This prevents accidental use of current time which caused inverted/misaligned windows
  if (!customEndTime) {
    throw new Error(
      "SAS end time is required. Ensure the collection timestamp is passed to getSasTimePeriod."
    );
  }
  let sasEndTime = customEndTime;

  // Try to find the actual previous collection time from the collections database
  let sasStartTime: Date;

  try {
    // Import Collections model
    const { Collections } = await import("@/app/api/lib/models/collections");

    // Find the most recent collection for this machine before the current collection time
    // Try multiple identifiers: machineId, machineCustomName, then machineName
    let previousCollection = null;

    // Get machine data once to avoid multiple queries
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
  const machine = await Machine.findOne({ _id: machineId }).lean();
    const machineData = machine as Record<string, unknown> | null;
    const machineCustomName = machineData?.customName as string;
    const machineName = machineData?.name as string;

    // CRITICAL FIX: Use a more restrictive time filter to avoid race conditions
    // Only look for collections that are at least 1 minute before the current collection time
    // This prevents finding collections that might be created simultaneously
    const minTimeBuffer = new Date(sasEndTime.getTime() - 60 * 1000); // 1 minute buffer

    // First try: machineId (if it exists and has a value)
    if (machineId && machineId.trim() !== "") {
      previousCollection = await Collections.findOne({
        machineId: machineId,
        timestamp: { $lt: minTimeBuffer }, // Use buffer instead of sasEndTime
      })
        .sort({ timestamp: -1 })
        .lean();
    }

    // Second try: machineCustomName (if machineId didn't work)
    if (
      !previousCollection &&
      machineCustomName &&
      machineCustomName.trim() !== ""
    ) {
      previousCollection = await Collections.findOne({
        machineCustomName: machineCustomName,
        timestamp: { $lt: minTimeBuffer }, // Use buffer instead of sasEndTime
      })
        .sort({ timestamp: -1 })
        .lean();
    }

    // Third try: machineName (if machineCustomName didn't work)
    if (!previousCollection && machineName && machineName.trim() !== "") {
      previousCollection = await Collections.findOne({
        machineName: machineName,
        timestamp: { $lt: minTimeBuffer }, // Use buffer instead of sasEndTime
      })
        .sort({ timestamp: -1 })
        .lean();
    }

    if (previousCollection) {
      // Use the previous collection's timestamp as the SAS start time
      sasStartTime = new Date(previousCollection.timestamp);

      // CRITICAL VALIDATION: Ensure sasStartTime is before sasEndTime
      if (sasStartTime >= sasEndTime) {
        console.error(
          ` SAS TIME VALIDATION FAILED: Previous collection timestamp (${sasStartTime.toISOString()}) is not before sasEndTime (${sasEndTime.toISOString()})`
        );
        console.error(` DETAILED DEBUG INFO:`, {
          machineId: machineId,
          previousCollectionId: previousCollection._id,
          previousTimestamp: sasStartTime.toISOString(),
          currentTimestamp: sasEndTime.toISOString(),
          minTimeBuffer: minTimeBuffer.toISOString(),
          timeDifference: sasEndTime.getTime() - sasStartTime.getTime(),
          foundBy:
            previousCollection.machineId === machineId
              ? "machineId"
              : previousCollection.machineCustomName
              ? "machineCustomName"
              : "machineName",
        });
        // Use 24-hour fallback instead
        sasStartTime = new Date(sasEndTime.getTime() - 24 * 60 * 60 * 1000);
        console.warn(
          `⚠️ Using 24h fallback due to invalid previous collection timestamp for machine ${machineId}:`,
          {
            fallbackTime: sasStartTime.toISOString(),
            currentTimestamp: sasEndTime.toISOString(),
          }
        );
      } else {
        // Determine which identifier was used to find the collection
        let foundBy = "unknown";
        if (previousCollection.machineId === machineId) {
          foundBy = "machineId";
        } else if (previousCollection.machineCustomName) {
          foundBy = "machineCustomName";
        } else if (previousCollection.machineName) {
          foundBy = "machineName";
        }

        console.warn(
          `🔍 Found previous collection for machine ${machineId} (found by ${foundBy}):`,
          {
            previousTimestamp: sasStartTime.toISOString(),
            currentTimestamp: sasEndTime.toISOString(),
            timeDiff:
              Math.round(
                (sasEndTime.getTime() - sasStartTime.getTime()) /
                  (1000 * 60 * 60)
              ) + " hours",
            foundBy: foundBy,
            previousCollectionId: previousCollection._id,
            minTimeBuffer: minTimeBuffer.toISOString(),
          }
        );
      }
    } else {
      // No previous collection found, try machine's collectionTime as fallback
      // (machine data already fetched above)

      console.warn(
        `⚠️ No previous collection found for machine ${machineId} using any identifier (machineId, machineCustomName, machineName)`
      );

      if (machineData?.collectionTime) {
        const machineCollectionTime = new Date(
          machineData.collectionTime as Date
        );
        // Only use machine collectionTime if it's before the current collection time
        if (machineCollectionTime < sasEndTime) {
          sasStartTime = machineCollectionTime;
          console.warn(
            `⚠️ Using machine collectionTime as fallback for machine ${machineId}:`,
            {
              machineCollectionTime: sasStartTime.toISOString(),
              currentTimestamp: sasEndTime.toISOString(),
            }
          );
        } else {
          // Machine collectionTime is in the future, use 24 hours before current collection
          sasStartTime = new Date(sasEndTime.getTime() - 24 * 60 * 60 * 1000);
          console.warn(
            `⚠️ Machine collectionTime is in future, using 24h before current for machine ${machineId}:`,
            {
              fallbackTime: sasStartTime.toISOString(),
              currentTimestamp: sasEndTime.toISOString(),
            }
          );
        }
      } else {
        // No machine collectionTime, use 24 hours before current collection
        sasStartTime = new Date(sasEndTime.getTime() - 24 * 60 * 60 * 1000);
        console.warn(
          `⚠️ No machine collectionTime found for machine ${machineId}, using 24h before current:`,
          {
            fallbackTime: sasStartTime.toISOString(),
            currentTimestamp: sasEndTime.toISOString(),
          }
        );
      }
    }

    // FINAL VALIDATION: Ensure sasStartTime is strictly before sasEndTime
    if (sasStartTime >= sasEndTime) {
      throw new Error(
        `SAS Time Validation Failed: sasStartTime (${sasStartTime.toISOString()}) cannot be after or equal to sasEndTime (${sasEndTime.toISOString()}). This would create an invalid time range.`
      );
    }
  } catch (error) {
    console.error(
      ` Error finding previous collection for machine ${machineId}:`,
      error
    );
    // Final fallback: 24 hours before current collection time
    sasStartTime = new Date(sasEndTime.getTime() - 24 * 60 * 60 * 1000);
    console.warn(`🆘 Using emergency fallback for machine ${machineId}:`, {
      emergencyFallback: sasStartTime.toISOString(),
      currentTimestamp: sasEndTime.toISOString(),
    });
  }

  // Guard: ensure start <= end. If not, swap to prevent inversions
  if (sasStartTime > sasEndTime) {
    console.warn(
      `⚠️ SAS time inversion detected for machine ${machineId}, swapping start/end`
    );
    const tmp = sasStartTime;
    sasStartTime = new Date(sasEndTime.getTime());
    sasEndTime = new Date(tmp.getTime());
  }

  return { sasStartTime, sasEndTime };
}

// ============================================================================
// Previous Collection Meters Operations
// ============================================================================

/**
 * Get previous collection meters from the actual previous collection.
 * This ensures we get the correct baseline values for movement calculations
 */
export async function getPreviousCollectionMeters(
  machineId: string
): Promise<PreviousCollectionMeters> {
  await connectDB();

  // CRITICAL: Use findOne with _id instead of findById (repo rule)
  const machine = await Machine.findOne({ _id: machineId }).lean();
  if (!machine) {
    throw new Error(`Machine not found: ${machineId}`);
  }

  // Safely access machine properties with type assertion
  const machineData = machine as Record<string, unknown>;

  // CRITICAL: Look for the actual previous collection to get correct prevIn/prevOut
  // This is more reliable than using machine.collectionMeters which might be outdated
  const { Collections } = await import("@/app/api/lib/models/collections");
  
  // Find the most recent completed collection for this machine
  const previousCollection = await Collections.findOne({
    machineId: machineId,
    isCompleted: true,
    locationReportId: { $exists: true, $ne: "" }, // Ensure it's from a completed report
    $or: [
      { deletedAt: { $exists: false } },
      { deletedAt: null }
    ]
  })
    .sort({ timestamp: -1 })
    .lean();

  let prevMetersIn = 0;
  let prevMetersOut = 0;
  let collectionTime: Date | undefined;

  if (previousCollection) {
    // Use the actual previous collection's metersIn/metersOut as the baseline
    prevMetersIn = previousCollection.metersIn || 0;
    prevMetersOut = previousCollection.metersOut || 0;
    collectionTime = previousCollection.timestamp ? new Date(previousCollection.timestamp) : undefined;
    
    console.warn("🔍 Found previous collection for prev meters:", {
      machineId,
      previousCollectionId: previousCollection._id,
      previousTimestamp: collectionTime?.toISOString(),
      prevMetersIn,
      prevMetersOut,
    });
  } else {
    // No previous collection found, check machine.collectionMeters as fallback
    const collectionMeters = (machineData.collectionMeters as Record<
      string,
      unknown
    >) || {
      metersIn: 0,
      metersOut: 0,
    };

    prevMetersIn = (collectionMeters.metersIn as number) || 0;
    prevMetersOut = (collectionMeters.metersOut as number) || 0;

    console.warn("⚠️ No previous collection found, using machine.collectionMeters:", {
      machineId,
      prevMetersIn,
      prevMetersOut,
    });

    // Get previousCollectionTime from gaming location, not machine
    const gamingLocationId = machineData.gamingLocation as string;
    if (gamingLocationId) {
      const GamingLocations = (
        await import("@/app/api/lib/models/gaminglocations")
      ).GamingLocations;
      // CRITICAL: Use findOne with _id instead of findById (repo rule)
      const gamingLocation = await GamingLocations.findOne({
        _id: gamingLocationId,
      }).lean();
      if (gamingLocation) {
        const locationData = gamingLocation as Record<string, unknown>;
        const previousCollectionTime = locationData.previousCollectionTime;
        collectionTime = previousCollectionTime
          ? new Date(previousCollectionTime as string)
          : undefined;
      }
    }
  }

  return {
    metersIn: prevMetersIn,
    metersOut: prevMetersOut,
    collectionTime,
  };
}

// ============================================================================
// Machine Update Operations
// ============================================================================

/**
 * Update machine collection meters and collection time
 */
export async function updateMachineCollectionMeters(
  machineId: string,
  metersIn: number,
  metersOut: number,
  collectionTime: Date = new Date(),
  updateCollectionTime: boolean = false,
  locationReportId?: string,
  updateMachineMeters: boolean = false
): Promise<string> {
  await connectDB();

  // Get current machine data to access previous meters for history
  // CRITICAL: Use findOne with _id instead of findById (repo rule)
  const currentMachine = await Machine.findOne({ _id: machineId }).lean();
  if (!currentMachine) {
    throw new Error(`Machine with ID ${machineId} not found`);
  }

  // currentMachineData removed - no longer needed since we don't create history entries

  // Prepare update object
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  // CRITICAL: Only update machine collectionMeters when explicitly requested
  // This prevents premature meter updates when creating collections
  if (updateMachineMeters) {
    updateData["collectionMeters.metersIn"] = metersIn;
    updateData["collectionMeters.metersOut"] = metersOut;
  }

  // Only update collectionTime if explicitly requested (when report is finalized)
  if (updateCollectionTime) {
    updateData.collectionTime = collectionTime;
  }

  // CRITICAL: Do NOT generate locationReportId when adding machines to the list
  // locationReportId should only be set when the collection report is actually created
  // This prevents orphaned collections and ensures proper timing
  let finalLocationReportId = locationReportId;
  if (!finalLocationReportId || finalLocationReportId.trim() === "") {
    // Keep it empty - will be set when report is created
    finalLocationReportId = "";
    console.warn("🔧 Collection created without locationReportId - will be set when report is created");
  }

  // CRITICAL: Do NOT create history entries when adding machines to the list
  // History entries should only be created when the collection report is finalized
  // This prevents duplicate history entries and ensures proper timing

  // Update machine without creating history entries
  // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
  await Machine.findOneAndUpdate({ _id: machineId }, {
    $set: updateData,
  });

  // Machine collection meters updated successfully
  return finalLocationReportId;
}

// ============================================================================
// Collection Validation
// ============================================================================

/**
 * Validate collection creation payload
 */
export function validateCollectionPayload(payload: unknown): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Type guard to ensure payload is an object
  if (!payload || typeof payload !== "object") {
    errors.push("Payload must be a valid object");
    return { isValid: false, errors };
  }

  const p = payload as Record<string, unknown>;

  if (!p.machineId) {
    errors.push("Machine ID is required");
  }

  if (!p.location) {
    errors.push("Location is required");
  }

  if (!p.collector) {
    errors.push("Collector is required");
  }

  if (typeof p.metersIn !== "number" || p.metersIn < 0) {
    errors.push("Meters In must be a valid non-negative number");
  }

  if (typeof p.metersOut !== "number" || p.metersOut < 0) {
    errors.push("Meters Out must be a valid non-negative number");
  }

  if (p.sasStartTime && !(p.sasStartTime instanceof Date)) {
    errors.push("SAS Start Time must be a valid Date object");
  }

  if (p.sasEndTime && !(p.sasEndTime instanceof Date)) {
    errors.push("SAS End Time must be a valid Date object");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Collection Creation Orchestration
// ============================================================================

/**
 * Complete collection creation process.
 * Orchestrates all the steps: SAS metrics, movement calculation, and machine updates
 */
export async function createCollectionWithCalculations(
  payload: Record<string, unknown>
): Promise<{
  sasMeters: SasMetricsCalculation;
  movement: MovementCalculation;
  previousMeters: PreviousCollectionMeters;
  locationReportId: string;
}> {
  // Validate payload
  const validation = validateCollectionPayload(payload);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
  }

  // Get SAS time period with custom times if provided
  const { sasStartTime, sasEndTime } = await getSasTimePeriod(
    payload.machineId as string,
    payload.sasStartTime as Date,
    payload.sasEndTime as Date
  );

  // CRITICAL VALIDATION: Ensure SAS times are valid before proceeding
  if (sasStartTime >= sasEndTime) {
    throw new Error(
      `SAS Time Validation Failed: sasStartTime (${sasStartTime.toISOString()}) cannot be after or equal to sasEndTime (${sasEndTime.toISOString()}). This would create an invalid time range for machine ${
        payload.machineId
      }.`
    );
  }

  // Use the returned times directly
  const finalSasStartTime = sasStartTime;
  const finalSasEndTime = sasEndTime;

  // Calculate SAS metrics
  const sasMeters = await calculateSasMetrics(
    payload.machineId as string,
    finalSasStartTime,
    finalSasEndTime
  );

  // Get previous collection meters
  const previousMeters = await getPreviousCollectionMeters(
    payload.machineId as string
  );

  // Calculate movement
  const movement = calculateMovement(
    payload.metersIn as number,
    payload.metersOut as number,
    previousMeters,
    payload.ramClear as boolean,
    payload.ramClearCoinIn as number,
    payload.ramClearCoinOut as number,
    payload.ramClearMetersIn as number,
    payload.ramClearMetersOut as number
  );

  // Round movement values to 2 decimal places
  const roundedMovement: MovementCalculation = {
    metersIn: Number(movement.metersIn.toFixed(2)),
    metersOut: Number(movement.metersOut.toFixed(2)),
    gross: Number(movement.gross.toFixed(2)),
  };

  // Update machine collection meters with actual meter readings (not movement values)
  // Never update collectionTime here - it's managed at gaming location level
  // Never update machine collectionMeters here - they should only be updated when report is created
  const finalLocationReportId = await updateMachineCollectionMeters(
    payload.machineId as string,
    payload.metersIn as number,
    payload.metersOut as number,
    finalSasEndTime,
    false, // Never update collectionTime at machine level
    payload.locationReportId as string, // Pass locationReportId for history tracking
    false // Never update machine collectionMeters when creating collections
  );

  return {
    sasMeters,
    movement: roundedMovement,
    previousMeters,
    locationReportId: finalLocationReportId,
  };
}
