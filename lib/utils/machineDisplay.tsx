/**
 * Machine Display Utilities
 *
 * Utility functions for formatting and displaying machine information.
 *
 * Features:
 * - Machine display name formatting
 * - Serial number and custom name handling
 * - Game information display
 */

import React from 'react';

// ============================================================================
// Type Definitions
// ============================================================================
/**
 * Generic machine type that covers different machine objects
 */
type MachineLike = {
  serialNumber?: string;
  assetNumber?: string;
  custom?: { name?: string };
  game?: string;
  installedGame?: string;
  name?: string;
  machineName?: string;
  machineCustomName?: string;
};

// ============================================================================
// Machine Display Formatting Functions
// ============================================================================
/**
 * Formats machine display name with serial number and game information
 * Format: serialNumber || custom.name (custom.name if different, game)
 * - Main part: serialNumber if exists and not blank, otherwise custom.name
 * - Brackets: custom.name (only if provided and different from main), then game
 * - If game missing: shows "(game name not provided)" in red
 *
 * @param machine - The machine object
 * @returns Formatted string for display
 */
export function formatMachineDisplayName(machine: MachineLike): string {
  // Get raw values
  const serialNumberRaw = machine.serialNumber?.trim() || '';
  const customName = machine.custom?.name?.trim() || '';
  const game = machine.game || machine.installedGame;

  // Main identifier: serialNumber if exists and not blank, otherwise custom.name
  const mainIdentifier = serialNumberRaw || customName || 'N/A';

  // Build the bracket content
  const bracketParts: string[] = [];

  // Only add customName if it's provided AND different from main identifier
  if (customName && customName !== mainIdentifier) {
    bracketParts.push(customName);
  }

  // Always include game - show "(game name not provided)" if blank
  const gameDisplay = game?.trim() || '(game name not provided)';
  bracketParts.push(gameDisplay);

  // Return formatted string
  return `${mainIdentifier} (${bracketParts.join(', ')})`;
}

/**
 * Formats machine display name with bold styling for bracket content
 * Format: serialNumber || custom.name (custom.name if different, game)
 * - Main part: serialNumber if exists and not blank, otherwise custom.name
 * - Brackets: custom.name (only if provided and different from main), then game
 * - If game missing: shows "(game name not provided)" in red
 *
 * @param machine - The machine object
 * @returns JSX element with formatted display
 */
export function formatMachineDisplayNameWithBold(
  machine: MachineLike
): React.JSX.Element {
  // Get raw values
  const serialNumberRaw = machine.serialNumber?.trim() || '';
  const customName = machine.custom?.name?.trim() || '';
  const game = machine.game || machine.installedGame;

  // Main identifier: serialNumber if exists and not blank, otherwise custom.name
  const mainIdentifier = serialNumberRaw || customName || 'N/A';

  // Build the bracket content
  const bracketParts: string[] = [];

  // Only add customName if it's provided AND different from main identifier
  if (customName && customName !== mainIdentifier) {
    bracketParts.push(customName);
  }

  // Always include game - show "(game name not provided)" in red if blank
  const gameDisplay = game?.trim() || '';
  if (gameDisplay) {
    bracketParts.push(gameDisplay);
  } else {
    bracketParts.push('(game name not provided)');
  }

  // Return formatted JSX
  return (
    <span className="whitespace-normal break-words">
      {mainIdentifier}{' '}
      <span className="break-words font-semibold">
        (
        {bracketParts.map((part, idx) => {
          const isGameNotProvided = part === '(game name not provided)';
          return (
            <span key={idx}>
              {isGameNotProvided ? (
                <span className="text-red-600">{part}</span>
              ) : (
                part
              )}
              {idx < bracketParts.length - 1 && ', '}
            </span>
          );
        })}
        )
      </span>
    </span>
  );
}
