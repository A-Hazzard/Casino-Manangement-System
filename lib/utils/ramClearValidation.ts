/**
 * RAM Clear (Rollover) Validation Utilities
 *
 * Handles validation logic for machine meter rollover scenarios
 * where meters reset to zero after reaching maximum value.
 *
 * Features:
 * - Validates meter values for RAM Clear and normal scenarios
 * - Produces warnings and errors for suspicious values
 * - Supports both coin and meter based RAM Clear inputs
 *
 * Author: Aaron Hazzard - Senior Software Engineer
 * Last Updated: October 23rd, 2025
 */

// ============================================================================
// Types
// ============================================================================
export type RamClearValidationResult = {
  isValid: boolean;
  warnings: string[];
  errors: string[];
};

export type RamClearValidationParams = {
  currentMetersIn: number;
  currentMetersOut: number;
  prevIn: number;
  prevOut: number;
  ramClear: boolean;
  ramClearCoinIn?: number;
  ramClearCoinOut?: number;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
};

// ============================================================================
// Validation Functions
// ============================================================================
/**
 * Validates meter values based on RAM Clear status.
 *
 * @param params - Validation parameters.
 * @returns Validation result with warnings and errors.
 */
export function validateRamClearMeters(
  params: RamClearValidationParams
): RamClearValidationResult {
  const {
    currentMetersIn,
    currentMetersOut,
    prevIn,
    prevOut,
    ramClear,
    ramClearCoinIn,
    ramClearCoinOut,
    ramClearMetersIn,
    ramClearMetersOut,
  } = params;

  const warnings: string[] = [];
  const errors: string[] = [];

  // Basic input validation
  if (isNaN(currentMetersIn) || isNaN(currentMetersOut)) {
    errors.push('Meter values must be valid numbers');
    return { isValid: false, warnings, errors };
  }

  if (isNaN(prevIn) || isNaN(prevOut)) {
    errors.push('Previous meter values must be valid numbers');
    return { isValid: false, warnings, errors };
  }

  // RAM Clear = FALSE (Normal Operation)
  if (!ramClear) {
    // Current meters should be HIGHER than previous meters
    if (currentMetersIn <= prevIn) {
      warnings.push(
        'Meters In should be higher than previous reading when RAM Clear is unchecked. ' +
          `Current: ${currentMetersIn.toLocaleString()}, Previous: ${prevIn.toLocaleString()}`
      );
    }

    if (currentMetersOut <= prevOut) {
      warnings.push(
        'Meters Out should be higher than previous reading when RAM Clear is unchecked. ' +
          `Current: ${currentMetersOut.toLocaleString()}, Previous: ${prevOut.toLocaleString()}`
      );
    }
  }

  // RAM Clear = TRUE (Rollover Occurred)
  if (ramClear) {
    // Current meters should be LOWER than previous meters (indicating rollover)
    // This is a WARNING, not an error - allows submission but warns user
    if (currentMetersIn >= prevIn) {
      warnings.push(
        'Meters In should be lower than previous reading when RAM Clear is checked. ' +
          `Current: ${currentMetersIn.toLocaleString()}, Previous: ${prevIn.toLocaleString()}`
      );
    }

    if (currentMetersOut >= prevOut) {
      warnings.push(
        'Meters Out should be lower than previous reading when RAM Clear is checked. ' +
          `Current: ${currentMetersOut.toLocaleString()}, Previous: ${prevOut.toLocaleString()}`
      );
    }

    // RAM Clear Coin validation (if provided)
    if (ramClearCoinIn !== undefined && ramClearCoinOut !== undefined) {
      // RAM Clear coin values are usually HIGHER than or equal to previous values
      if (ramClearCoinIn < prevIn) {
        warnings.push(
          'RAM Clear Coin In is usually higher than previous reading. ' +
            `RAM Clear Coin: ${ramClearCoinIn.toLocaleString()}, Previous: ${prevIn.toLocaleString()}`
        );
      }

      if (ramClearCoinOut < prevOut) {
        warnings.push(
          'RAM Clear Coin Out is usually higher than previous reading. ' +
            `RAM Clear Coin: ${ramClearCoinOut.toLocaleString()}, Previous: ${prevOut.toLocaleString()}`
        );
      }
    }

    // RAM Clear Meters validation (if provided)
    if (ramClearMetersIn !== undefined && ramClearMetersOut !== undefined) {
      // RAM Clear meters should be higher than or equal to previous values
      if (ramClearMetersIn < prevIn) {
        warnings.push(
          'RAM Clear Meters In should be higher than or equal to previous reading. ' +
            `RAM Clear Meters: ${ramClearMetersIn.toLocaleString()}, Previous: ${prevIn.toLocaleString()}`
        );
      }

      if (ramClearMetersOut < prevOut) {
        warnings.push(
          'RAM Clear Meters Out should be higher than or equal to previous reading. ' +
            `RAM Clear Meters: ${ramClearMetersOut.toLocaleString()}, Previous: ${prevOut.toLocaleString()}`
        );
      }

      // RAM Clear meters should be higher than current meters
      if (ramClearMetersIn < currentMetersIn) {
        warnings.push(
          'RAM Clear Meters In should be higher than current meters. ' +
            `RAM Clear Meters: ${ramClearMetersIn.toLocaleString()}, Current: ${currentMetersIn.toLocaleString()}`
        );
      }

      if (ramClearMetersOut < currentMetersOut) {
        warnings.push(
          'RAM Clear Meters Out should be higher than current meters. ' +
            `RAM Clear Meters: ${ramClearMetersOut.toLocaleString()}, Current: ${currentMetersOut.toLocaleString()}`
        );
      }
    }
  }

  // Additional validation for negative values
  if (currentMetersIn < 0) {
    errors.push('Meters In cannot be negative');
  }

  if (currentMetersOut < 0) {
    errors.push('Meters Out cannot be negative');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

