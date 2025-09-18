import mongoose from "mongoose";
import { connectDB } from "@/app/api/lib/middleware/db";
import { Meters } from "@/app/api/lib/models/meters";
import { Machine } from "@/app/api/lib/models/machines";
import { MachineSession } from "@/app/api/lib/models/machineSessions";
import { calculateMovement } from "@/lib/utils/movementCalculation";
import type {
  SasMetricsCalculation,
  PreviousCollectionMeters,
  MovementCalculation,
} from "@/lib/types/collections";

/**
 * Collection Creation Helper Functions
 * Implements the collection creation logic as specified in the cursor prompt
 */

/**
 * Get machine identifier with priority: serialNumber -> customName -> machineId
 */
export async function getMachineIdentifier(machineId: string): Promise<string> {
  await connectDB();

  const machine = await Machine.findById(machineId).lean();
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

  // Calculate movement (first → last meter)
  const firstMeter = metersInPeriod[0];
  const lastMeter = metersInPeriod[metersInPeriod.length - 1];

  const drop =
    (lastMeter.movement?.drop || 0) - (firstMeter.movement?.drop || 0);
  const totalCancelledCredits =
    (lastMeter.movement?.totalCancelledCredits || 0) -
    (firstMeter.movement?.totalCancelledCredits || 0);
  const gamesPlayed =
    (lastMeter.movement?.gamesPlayed || 0) -
    (firstMeter.movement?.gamesPlayed || 0);
  const jackpot =
    (lastMeter.movement?.jackpot || 0) - (firstMeter.movement?.jackpot || 0);

  const gross = drop - totalCancelledCredits;

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

/**
 * Get SAS time period from machineSessions collectionTime
 */
export async function getSasTimePeriod(
  machineId: string
): Promise<{ sasStartTime: Date; sasEndTime: Date }> {
  await connectDB();

  // Get the most recent machine session to find collectionTime
  const machineSession = await MachineSession.findOne({
    machineId,
  })
    .sort({ startTime: -1 })
    .lean();

  // Safely access machine session properties with type assertion
  const sessionData = machineSession as Record<string, unknown> | null;

  // Use collectionTime as sasStartTime, or default to 24 hours ago
  const sasStartTime =
    (sessionData?.collectionTime as Date) ||
    new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sasEndTime = new Date();

  return { sasStartTime, sasEndTime };
}

/**
 * Get previous collection meters from machine and gaming location
 */
export async function getPreviousCollectionMeters(
  machineId: string
): Promise<PreviousCollectionMeters> {
  await connectDB();

  const machine = await Machine.findById(machineId).lean();
  if (!machine) {
    throw new Error(`Machine not found: ${machineId}`);
  }

  // Safely access machine properties with type assertion
  const machineData = machine as Record<string, unknown>;

  // Get previous collection meters from machine.collectionMeters
  const collectionMeters = (machineData.collectionMeters as Record<
    string,
    unknown
  >) || {
    metersIn: 0,
    metersOut: 0,
  };

  // Get previousCollectionTime from gaming location, not machine
  const gamingLocationId = machineData.gamingLocation as string;
  let collectionTime: Date | undefined;
  
  if (gamingLocationId) {
    const GamingLocations = (await import("@/app/api/lib/models/gaminglocations")).GamingLocations;
    const gamingLocation = await GamingLocations.findById(gamingLocationId).lean();
    if (gamingLocation) {
      const locationData = gamingLocation as Record<string, unknown>;
      const previousCollectionTime = locationData.previousCollectionTime;
      collectionTime = previousCollectionTime ? new Date(previousCollectionTime as string) : undefined;
    }
  }

  return {
    metersIn: (collectionMeters.metersIn as number) || 0,
    metersOut: (collectionMeters.metersOut as number) || 0,
    collectionTime,
  };
}


/**
 * Update machine collection meters and collection time
 */
export async function updateMachineCollectionMeters(
  machineId: string,
  metersIn: number,
  metersOut: number,
  collectionTime: Date = new Date(),
  updateCollectionTime: boolean = false,
  locationReportId?: string
): Promise<void> {
  await connectDB();

  // Get current machine data to access previous meters for history
  const currentMachine = await Machine.findById(machineId).lean();
  if (!currentMachine) {
    throw new Error(`Machine with ID ${machineId} not found`);
  }

  const currentMachineData = currentMachine as Record<string, unknown>;
  const currentCollectionMeters = currentMachineData.collectionMeters as { metersIn: number; metersOut: number } | undefined;

  // Prepare update object
  const updateData: Record<string, unknown> = {
    "collectionMeters.metersIn": metersIn,
    "collectionMeters.metersOut": metersOut,
    updatedAt: new Date(),
  };

  // Only update collectionTime if explicitly requested (when report is finalized)
  if (updateCollectionTime) {
    updateData.collectionTime = collectionTime;
  }

  // Prepare history entry if locationReportId is provided
  if (locationReportId) {
    const historyEntry = {
      _id: new mongoose.Types.ObjectId(), // Use mongoose ObjectId for proper type
      metersIn: metersIn,
      metersOut: metersOut,
      prevMetersIn: currentCollectionMeters?.metersIn || 0,
      prevMetersOut: currentCollectionMeters?.metersOut || 0,
      timestamp: collectionTime,
      locationReportId: locationReportId,
    };

    // Update machine with new collection meters and add to history
    await Machine.findByIdAndUpdate(machineId, {
      $set: updateData,
      $push: {
        collectionMetersHistory: historyEntry,
      },
    });
  } else {
    // Update machine with new collection meters only (no history entry)
    await Machine.findByIdAndUpdate(machineId, {
      $set: updateData,
    });
  }

  // Machine collection meters updated successfully
}

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

/**
 * Complete collection creation process
 * Orchestrates all the steps: SAS metrics, movement calculation, and machine updates
 */
export async function createCollectionWithCalculations(
  payload: Record<string, unknown>
): Promise<{
  sasMeters: SasMetricsCalculation;
  movement: MovementCalculation;
  previousMeters: PreviousCollectionMeters;
}> {
  // Validate payload
  const validation = validateCollectionPayload(payload);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
  }

  // Get SAS time period
  const { sasStartTime, sasEndTime } = await getSasTimePeriod(
    payload.machineId as string
  );

  // Use custom times if provided
  const finalSasStartTime = (payload.sasStartTime as Date) || sasStartTime;
  const finalSasEndTime = (payload.sasEndTime as Date) || sasEndTime;

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

  // Update machine collection meters with calculated movement values
  // Never update collectionTime here - it's managed at gaming location level
  await updateMachineCollectionMeters(
    payload.machineId as string,
    movement.metersIn,
    movement.metersOut,
    finalSasEndTime,
    false, // Never update collectionTime at machine level
    payload.locationReportId as string // Pass locationReportId for history tracking
  );

  return {
    sasMeters,
    movement,
    previousMeters,
  };
}
