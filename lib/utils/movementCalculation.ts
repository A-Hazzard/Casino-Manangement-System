import type {
  MovementCalculation,
  PreviousCollectionMeters,
} from '@/lib/types/collections';

/**
 * Calculates movement values based on current and previous meters.
 * Handles both standard and RAM Clear scenarios.
 *
 * @param currentMetersIn - Current meters in value
 * @param currentMetersOut - Current meters out value
 * @param previousMeters - Previous collection meters
 * @param ramClear - Whether this is a RAM Clear scenario
 * @param ramClearCoinIn - RAM Clear coin in value (optional)
 * @param ramClearCoinOut - RAM Clear coin out value (optional)
 * @returns MovementCalculation object with calculated values
 */
export function calculateMovement(
  currentMetersIn: number,
  currentMetersOut: number,
  previousMeters: PreviousCollectionMeters,
  ramClear?: boolean,
  ramClearCoinIn?: number,
  ramClearCoinOut?: number,
  ramClearMetersIn?: number,
  ramClearMetersOut?: number
): MovementCalculation {
  let metersIn: number;
  let metersOut: number;

  if (ramClear) {
    // RAM Clear calculation
    if (ramClearMetersIn !== undefined && ramClearMetersOut !== undefined) {
      // Use RAM Clear meters for calculation
      // Formula: (ramClearMeters - prevMeters) + (currentMeters - 0)
      metersIn =
        ramClearMetersIn - previousMeters.metersIn + (currentMetersIn - 0);
      metersOut =
        ramClearMetersOut - previousMeters.metersOut + (currentMetersOut - 0);
    } else if (ramClearCoinIn !== undefined && ramClearCoinOut !== undefined) {
      // Use RAM Clear coin values for calculation (legacy)
      // Formula: (ramClearCoin - prevMeters) + (currentMeters - 0)
      metersIn =
        ramClearCoinIn - previousMeters.metersIn + (currentMetersIn - 0);
      metersOut =
        ramClearCoinOut - previousMeters.metersOut + (currentMetersOut - 0);
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
    metersIn,
    metersOut,
    gross,
  };
}
