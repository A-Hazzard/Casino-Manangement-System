/**
 * Frontend Movement Calculation Utility
 *
 * This utility provides the same movement calculation logic as the backend
 * to ensure consistency between frontend validation and backend creation.
 *
 * Features:
 * - Movement calculation matching backend logic
 * - RAM clear handling
 * - Previous collection meter tracking
 * - Gross calculation
 *
 * Uses the same logic as lib/utils/movementCalculation.ts
 */

// ============================================================================
// Type Definitions
// ============================================================================
export interface MovementCalculation {
  metersIn: number;
  metersOut: number;
  gross: number;
}

export interface PreviousCollectionMeters {
  metersIn: number;
  metersOut: number;
}

// ============================================================================
// Movement Calculation Functions
// ============================================================================
/**
 * Calculate movement values using the same logic as the backend calculateMovement function
 * This ensures frontend validation matches backend creation
 */
function calculateMovementFrontend(
  currentMetersIn: number,
  currentMetersOut: number,
  previousMeters: PreviousCollectionMeters,
  ramClear: boolean = false,
  ramClearCoinIn?: number,
  ramClearCoinOut?: number,
  ramClearMetersIn?: number,
  ramClearMetersOut?: number
): MovementCalculation {
  let metersIn: number;
  let metersOut: number;

  if (ramClear) {
    if (ramClearMetersIn !== undefined && ramClearMetersOut !== undefined) {
      // Formula: (ramClearMeters - prevMeters) + (currentMeters - 0)
      metersIn =
        ramClearMetersIn - previousMeters.metersIn + (currentMetersIn - 0);
      metersOut =
        ramClearMetersOut - previousMeters.metersOut + (currentMetersOut - 0);
    } else if (ramClearCoinIn !== undefined && ramClearCoinOut !== undefined) {
      // Alternative RAM Clear calculation using coin values
      metersIn = ramClearCoinIn + (currentMetersIn - 0);
      metersOut = ramClearCoinOut + (currentMetersOut - 0);
    } else {
      // Use current values directly (meters reset to 0)
      metersIn = currentMetersIn;
      metersOut = currentMetersOut;
    }
  } else {
    // Standard calculation: current - previous
    metersIn = currentMetersIn - previousMeters.metersIn;
    metersOut = currentMetersOut - previousMeters.metersOut;
  }

  const gross = metersIn - metersOut;

  return {
    metersIn: Number(metersIn.toFixed(2)),
    metersOut: Number(metersOut.toFixed(2)),
    gross: Number(gross.toFixed(2)),
  };
}

/**
 * Calculate movement for a single machine entry
 * Used in collection report modals for validation
 */
export function calculateMachineMovement(
  metersIn: number,
  metersOut: number,
  prevIn: number,
  prevOut: number,
  ramClear: boolean = false,
  ramClearCoinIn?: number,
  ramClearCoinOut?: number,
  ramClearMetersIn?: number,
  ramClearMetersOut?: number
): MovementCalculation {
  const previousMeters: PreviousCollectionMeters = {
    metersIn: prevIn,
    metersOut: prevOut,
  };

  return calculateMovementFrontend(
    metersIn,
    metersOut,
    previousMeters,
    ramClear,
    ramClearCoinIn,
    ramClearCoinOut,
    ramClearMetersIn,
    ramClearMetersOut
  );
}
