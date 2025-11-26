/**
 * SMIB Discovery Helper Functions
 *
 * This module contains helper functions for SMIB discovery operations.
 * It handles finding SMIB devices, determining online status, and formatting results.
 *
 * @module app/api/lib/helpers/smibDiscovery
 */

import { GamingLocations } from '../models/gaminglocations';
import { Machine } from '../models/machines';
import { differenceInMinutes } from 'date-fns';

/**
 * Lean machine type for SMIB discovery
 */
type LeanMachine = {
  _id: unknown;
  relayId?: string | null;
  smibBoard?: string | null;
  serialNumber?: string | null;
  game?: string | null;
  gamingLocation?: unknown;
  lastActivity?: Date | string | null;
  updatedAt?: Date | string | null;
};

/**
 * SMIB device information
 */
export type SMIBDevice = {
  relayId: string;
  machineId: string;
  serialNumber?: string;
  game?: string;
  locationName: string;
  locationId: string;
  online: boolean;
  lastSeen: string | null;
};

/**
 * SMIB discovery result
 */
export type SMIBDiscoveryResult = {
  success: boolean;
  smibs: SMIBDevice[];
  count: number;
};

/**
 * Determines if a machine is online based on last activity
 *
 * @param lastActivity - Last activity date
 * @param updatedAt - Updated at date
 * @returns True if machine is online (activity within last 3 minutes)
 */
function isMachineOnline(
  lastActivity?: Date | string | null,
  updatedAt?: Date | string | null
): { isOnline: boolean; lastSeen: string | null } {
  const lastActivityValue = lastActivity ?? updatedAt ?? null;
  const lastActivityDate =
    lastActivityValue instanceof Date
      ? lastActivityValue
      : typeof lastActivityValue === 'string'
        ? new Date(lastActivityValue)
        : null;
  const hasValidLastActivity =
    !!lastActivityDate && !Number.isNaN(lastActivityDate.getTime());
  const isOnline =
    hasValidLastActivity &&
    differenceInMinutes(new Date(), lastActivityDate) <= 3;

  return {
    isOnline,
    lastSeen:
      hasValidLastActivity && lastActivityDate
        ? lastActivityDate.toISOString()
        : null,
  };
}

/**
 * Discovers all SMIB devices from database
 *
 * @returns SMIB discovery result with device list
 */
export async function discoverSMIBDevices(): Promise<SMIBDiscoveryResult> {
  // Find all machines that have a relayId (SMIB devices)
  const machines = await Machine.find({
    $or: [
      { relayId: { $exists: true, $nin: [null, ''] } },
      { smibBoard: { $exists: true, $nin: [null, ''] } },
    ],
  })
    .select(
      '_id relayId smibBoard serialNumber game gamingLocation lastActivity updatedAt'
    )
    .lean<LeanMachine[]>();

  // Get location data for each machine
  const locationIds = [
    ...new Set(machines.map(m => m.gamingLocation).filter(Boolean)),
  ];
  const locations = await GamingLocations.find({
    _id: { $in: locationIds },
  })
    .select('_id name')
    .lean();

  const locationMap = new Map(
    locations.map(loc => [
      (loc._id as unknown as { toString: () => string }).toString(),
      loc.name as string,
    ])
  );

  // Build SMIB device list
  const smibs: SMIBDevice[] = machines
    .map(machine => {
      const locationIdStr = machine.gamingLocation
        ? (
            machine.gamingLocation as unknown as { toString: () => string }
          ).toString()
        : null;

      const { isOnline, lastSeen } = isMachineOnline(
        machine.lastActivity,
        machine.updatedAt
      );

      return {
        relayId: machine.relayId || machine.smibBoard || '',
        machineId: (
          machine._id as unknown as { toString: () => string }
        ).toString(),
        serialNumber: machine.serialNumber || undefined,
        game: machine.game || undefined,
        locationName: locationIdStr
          ? locationMap.get(locationIdStr) || 'Unknown Location'
          : 'No Location Assigned',
        locationId: locationIdStr || 'unassigned',
        online: isOnline,
        lastSeen,
      };
    })
    .filter(smib => smib.relayId); // Only include machines with valid relayId

  return {
    success: true,
    smibs,
    count: smibs.length,
  };
}

