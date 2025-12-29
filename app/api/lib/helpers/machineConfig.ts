/**
 * Machine Configuration Helper Functions
 *
 * This module contains helper functions for machine configuration operations.
 * It handles updating machine SMIB configuration and version information.
 *
 * @module app/api/lib/helpers/machineConfig
 */

import { GamingLocations } from '../models/gaminglocations';
import { Machine } from '../models/machines';

/**
 * Builds update fields for machine configuration
 *
 * @param machine - Machine document
 * @param smibConfig - Optional SMIB config to merge
 * @param smibVersion - Optional SMIB version to merge
 * @returns Update fields object
 */
export function buildMachineConfigUpdateFields(
  machine: { smibConfig?: Record<string, unknown>; smibVersion?: Record<string, unknown> },
  smibConfig?: Record<string, unknown>,
  smibVersion?: Record<string, unknown>
): Record<string, unknown> {
  const updateFields: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (smibConfig !== undefined) {
    updateFields.smibConfig = {
      ...(machine.smibConfig || {}),
      ...smibConfig,
    };
  }

  if (smibVersion !== undefined) {
    updateFields.smibVersion = {
      ...(machine.smibVersion || {}),
      ...smibVersion,
    };
  }

  return updateFields;
}

/**
 * Finds machine by relayId
 *
 * @param relayId - SMIB relay ID
 * @returns Machine document or null
 */
export async function findMachineByRelayId(
  relayId: string
): Promise<Awaited<ReturnType<typeof Machine.findOne>> | null> {
  return await Machine.findOne({
    $or: [{ relayId }, { smibBoard: relayId }],
  });
}

/**
 * Updates machine configuration
 *
 * @param machineId - Machine document ID
 * @param updateFields - Update fields object
 * @returns Updated machine document or null
 */
export async function updateMachineConfiguration(
  machineId: string,
  updateFields: Record<string, unknown>
): Promise<Awaited<ReturnType<typeof Machine.findOneAndUpdate>> | null> {
  return await Machine.findOneAndUpdate(
    { _id: machineId },
    updateFields,
    { new: true, runValidators: true }
  );
}

/**
 * Gets location name for machine
 *
 * @param locationId - Location document ID
 * @returns Location name or null
 */
export async function getLocationName(
  locationId: unknown
): Promise<string | null> {
  if (!locationId) {
    return null;
  }

  const location = await GamingLocations.findOne({ _id: locationId });
  return location?.name || null;
}

