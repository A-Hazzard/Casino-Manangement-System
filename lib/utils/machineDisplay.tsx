/**
 * Utility functions for displaying machine information
 */

import React from 'react';

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
  const customName = machine.custom?.name;
  const game = machine.game || machine.installedGame;

  // Build the bracket content
  const bracketParts: string[] = [];

  if (customName && customName.trim() !== '') {
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
  const customName = machine.custom?.name;
  const game = machine.game || machine.installedGame;

  // Build the bracket content
  const bracketParts: string[] = [];

  if (customName && customName.trim() !== '') {
    bracketParts.push(customName);
  }

  if (game && game.trim() !== '') {
    bracketParts.push(game);
  }

  // Return formatted JSX
  if (bracketParts.length === 0) {
    return <>{serialNumber}</>;
  } else {
    return (
      <>
        {serialNumber}{' '}
        <span className="break-words font-semibold">
          ({bracketParts.join(', ')})
        </span>
      </>
    );
  }
}
