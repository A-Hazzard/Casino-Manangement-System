/**
 * RAM Clear (Rollover) Validation Utilities
 * 
 * Handles validation logic for machine meter rollover scenarios
 * where meters reset to zero after reaching maximum value.
 * 
 * @author Aaron Hazzard - Senior Software Engineer
 * @lastUpdated August 29th, 2025
 */

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

/**
 * Validates meter values based on RAM Clear status
 * 
 * @param params - Validation parameters
 * @returns Validation result with warnings and errors
 */
export function validateRamClearMeters(params: RamClearValidationParams): RamClearValidationResult {
  const {
    currentMetersIn,
    currentMetersOut,
    prevIn,
    prevOut,
    ramClear,
    ramClearCoinIn,
    ramClearCoinOut,
    ramClearMetersIn,
    ramClearMetersOut
  } = params;

  const warnings: string[] = [];
  const errors: string[] = [];

  // Basic input validation
  if (isNaN(currentMetersIn) || isNaN(currentMetersOut)) {
    errors.push("Meter values must be valid numbers");
    return { isValid: false, warnings, errors };
  }

  if (isNaN(prevIn) || isNaN(prevOut)) {
    errors.push("Previous meter values must be valid numbers");
    return { isValid: false, warnings, errors };
  }

  // RAM Clear = FALSE (Normal Operation)
  if (!ramClear) {
    // Current meters should be HIGHER than previous meters
    if (currentMetersIn <= prevIn) {
      warnings.push(
        "Meters In should be higher than previous reading when RAM Clear is unchecked. " +
        `Current: ${currentMetersIn.toLocaleString()}, Previous: ${prevIn.toLocaleString()}`
      );
    }

    if (currentMetersOut <= prevOut) {
      warnings.push(
        "Meters Out should be higher than previous reading when RAM Clear is unchecked. " +
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
        "Meters In should be lower than previous reading when RAM Clear is checked. " +
        `Current: ${currentMetersIn.toLocaleString()}, Previous: ${prevIn.toLocaleString()}`
      );
    }

    if (currentMetersOut >= prevOut) {
      warnings.push(
        "Meters Out should be lower than previous reading when RAM Clear is checked. " +
        `Current: ${currentMetersOut.toLocaleString()}, Previous: ${prevOut.toLocaleString()}`
      );
    }

    // RAM Clear Coin validation (if provided)
    if (ramClearCoinIn !== undefined && ramClearCoinOut !== undefined) {
      // RAM Clear coin values are usually HIGHER than or equal to previous values
      if (ramClearCoinIn < prevIn) {
        warnings.push(
          "RAM Clear Coin In is usually higher than previous reading. " +
          `RAM Clear Coin: ${ramClearCoinIn.toLocaleString()}, Previous: ${prevIn.toLocaleString()}`
        );
      }

      if (ramClearCoinOut < prevOut) {
        warnings.push(
          "RAM Clear Coin Out is usually higher than previous reading. " +
          `RAM Clear Coin: ${ramClearCoinOut.toLocaleString()}, Previous: ${prevOut.toLocaleString()}`
        );
      }
    }

    // RAM Clear Meters validation (if provided)
    if (ramClearMetersIn !== undefined && ramClearMetersOut !== undefined) {
      // RAM Clear meters should be higher than or equal to previous values
      if (ramClearMetersIn < prevIn) {
        warnings.push(
          "RAM Clear Meters In should be higher than or equal to previous reading. " +
          `RAM Clear Meters: ${ramClearMetersIn.toLocaleString()}, Previous: ${prevIn.toLocaleString()}`
        );
      }

      if (ramClearMetersOut < prevOut) {
        warnings.push(
          "RAM Clear Meters Out should be higher than or equal to previous reading. " +
          `RAM Clear Meters: ${ramClearMetersOut.toLocaleString()}, Previous: ${prevOut.toLocaleString()}`
        );
      }

      // RAM Clear meters should be higher than current meters
      if (ramClearMetersIn < currentMetersIn) {
        warnings.push(
          "RAM Clear Meters In should be higher than current meters. " +
          `RAM Clear Meters: ${ramClearMetersIn.toLocaleString()}, Current: ${currentMetersIn.toLocaleString()}`
        );
      }

      if (ramClearMetersOut < currentMetersOut) {
        warnings.push(
          "RAM Clear Meters Out should be higher than current meters. " +
          `RAM Clear Meters: ${ramClearMetersOut.toLocaleString()}, Current: ${currentMetersOut.toLocaleString()}`
        );
      }
    }
  }

  // Additional validation for negative values
  if (currentMetersIn < 0) {
    errors.push("Meters In cannot be negative");
  }

  if (currentMetersOut < 0) {
    errors.push("Meters Out cannot be negative");
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Calculates movement values based on RAM Clear status
 * 
 * @param params - Calculation parameters
 * @returns Movement calculation result
 */
export function calculateRamClearMovement(params: RamClearValidationParams): {
  movementIn: number;
  movementOut: number;
  gross: number;
  calculationMethod: 'standard' | 'ramClear';
} {
  const {
    currentMetersIn,
    currentMetersOut,
    prevIn,
    prevOut,
    ramClear,
    ramClearCoinIn,
    ramClearCoinOut
  } = params;

  let movementIn: number;
  let movementOut: number;
  let calculationMethod: 'standard' | 'ramClear';

  if (!ramClear) {
    // Standard calculation: current - previous
    movementIn = currentMetersIn - prevIn;
    movementOut = currentMetersOut - prevOut;
    calculationMethod = 'standard';
  } else {
    // RAM Clear calculation
    if (ramClearCoinIn !== undefined && ramClearCoinOut !== undefined) {
      // Use RAM Clear coin values for calculation
      movementIn = (ramClearCoinIn - prevIn) + (currentMetersIn - 0);
      movementOut = (ramClearCoinOut - prevOut) + (currentMetersOut - 0);
    } else {
      // Use current values directly (meters reset to 0)
      movementIn = currentMetersIn;
      movementOut = currentMetersOut;
    }
    calculationMethod = 'ramClear';
  }

  const gross = movementOut - movementIn;

  return {
    movementIn,
    movementOut,
    gross,
    calculationMethod
  };
}

/**
 * Gets validation message for display in UI
 * 
 * @param result - Validation result
 * @returns Formatted message for user display
 */
export function getRamClearValidationMessage(result: RamClearValidationResult): string {
  if (result.errors.length > 0) {
    return result.errors.join('\n');
  }
  
  if (result.warnings.length > 0) {
    return result.warnings.join('\n');
  }
  
  return '';
}

/**
 * Determines if RAM Clear should be automatically detected
 * 
 * @param currentMetersIn - Current meters in value
 * @param currentMetersOut - Current meters out value
 * @param prevIn - Previous meters in value
 * @param prevOut - Previous meters out value
 * @returns Suggested RAM Clear status
 */
export function detectRamClear(
  currentMetersIn: number,
  currentMetersOut: number,
  prevIn: number,
  prevOut: number
): boolean {
  // RAM Clear is likely if current meters are significantly lower than previous
  // This is a heuristic - actual detection may need more sophisticated logic
  const significantDropThreshold = 0.5; // 50% drop suggests rollover
  
  const inDropRatio = currentMetersIn / prevIn;
  const outDropRatio = currentMetersOut / prevOut;
  
  return inDropRatio < significantDropThreshold || outDropRatio < significantDropThreshold;
}
