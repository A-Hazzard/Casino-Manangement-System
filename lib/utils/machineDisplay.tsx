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
 * Format: SerialNumber (custom.name, game) or variations based on available data
 *
 * @param machine - The machine object
 * @returns Formatted string for display
 */
export function formatMachineDisplayName(machine: MachineLike): string {
  // Use serialNumber if not blank/whitespace, otherwise fall back to custom.name, then assetNumber
  const serialNumber = (machine.serialNumber?.trim() || machine.custom?.name?.trim() || machine.assetNumber?.trim() || 'N/A');
  const customName = machine.custom?.name?.trim() || '';
  const game = machine.game || machine.installedGame;

  // Check if custom.name and serialNumber are the same
  const serialNumberTrimmed = machine.serialNumber?.trim() || '';
  const isCustomNameSameAsSerial = serialNumberTrimmed !== '' && customName !== '' && serialNumberTrimmed === customName;

  // Build the bracket content
  const bracketParts: string[] = [];

  // Only add customName if it's different from serialNumber
  if (customName && !isCustomNameSameAsSerial) {
    bracketParts.push(customName);
  }

  if (game && game.trim() !== '') {
    bracketParts.push(game);
  }

  // Return formatted string
  if (bracketParts.length === 0) {
    return serialNumber;
  } else {
    return `${serialNumber} (${bracketParts.join(', ')})`;
  }
}

/**
 * Formats machine display name with bold styling for bracket content
 * Format: SerialNumber (custom.name, game) where bracket content is bold
 *
 * @param machine - The machine object
 * @returns JSX element with formatted display
 */
export function formatMachineDisplayNameWithBold(
  machine: MachineLike
): React.JSX.Element {
  // Use serialNumber if not blank/whitespace, otherwise fall back to custom.name, then assetNumber
  const serialNumber = (machine.serialNumber?.trim() || machine.custom?.name?.trim() || machine.assetNumber?.trim() || 'N/A');
  const customName = machine.custom?.name?.trim() || '';
  const game = machine.game || machine.installedGame;

  // Check if custom.name and serialNumber are the same
  const serialNumberTrimmed = machine.serialNumber?.trim() || '';
  const isCustomNameSameAsSerial = serialNumberTrimmed !== '' && customName !== '' && serialNumberTrimmed === customName;

  // Build the bracket content
  const bracketParts: string[] = [];

  // Only add customName if it's different from serialNumber
  if (customName && !isCustomNameSameAsSerial) {
    bracketParts.push(customName);
  }

  if (game && game.trim() !== '') {
    bracketParts.push(game);
  }

  // Return formatted JSX
  if (bracketParts.length === 0) {
    return <span className="break-words whitespace-normal">{serialNumber}</span>;
  } else {
    return (
      <span className="break-words whitespace-normal">
        {serialNumber}{' '}
        <span className="break-words font-semibold">
          ({bracketParts.join(', ')})
        </span>
      </span>
    );
  }
}
