/**
 * Location CRUD Operations Helpers
 *
 * Business logic for creating, updating, deleting, and restoring gaming locations.
 * Extracted from the locations route to keep handlers lean and focused on HTTP concerns.
 *
 * @module app/api/lib/helpers/locations/locationOperations
 */

import {
  calculateChanges,
  logActivity,
  mapDeletedFieldsToChanges,
} from '@/app/api/lib/helpers/activityLogger';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Countries } from '@/app/api/lib/models/countries';
import type { CountryDocument, GamingMachine, LicenceeDocument } from '@/shared/types';
import type { UpdateLocationData } from '@/shared/types/entities';
import type { LocationDocument } from '@/shared/types/models';
import { generateMongoId } from '@/lib/utils/id';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Types
// ============================================================================

export type LocationRequestBody = {
  name?: string;
  country?: string;
  profitShare?: number;
  gameDayOffset?: number;
  rel?: { licencee?: string[] };
  isLocalServer?: boolean;
  geoCoords?: { latitude?: number; longitude?: number };
  billValidatorOptions?: Record<string, boolean>;
  membershipEnabled?: boolean;
  aceEnabled?: boolean;
  locationMembershipSettings?: Record<string, unknown>;
  googleMapsLink?: string;
  googleMapsIframe?: string;
  previousCollectionTime?: string;
  address?: { street?: string; city?: string };
};

type UserForLogging = {
  _id: string;
  emailAddress: string;
};

type LocationWithJackpot = LocationDocument & {
  licenceeId: string | null;
  includeJackpot: boolean;
};

type ChangeEntry = {
  field: string;
  oldValue: string | null;
  newValue: string;
};

// ============================================================================
// Constants
// ============================================================================

const FIELDS_EXCLUDED_FROM_CHANGES = [
  '_id',
  '__v',
  'createdAt',
  'updatedAt',
  'deletedAt',
];

const DEFAULT_BILL_VALIDATOR_OPTIONS: Record<string, boolean> = {
  denom1: true,
  denom2: true,
  denom5: true,
  denom10: true,
  denom20: true,
  denom50: true,
  denom100: true,
  denom200: true,
  denom500: true,
  denom1000: false,
  denom2000: false,
  denom5000: false,
  denom10000: false,
};

const DEFAULT_MEMBERSHIP_SETTINGS: Record<string, unknown> = {
  enableFreePlays: false,
  pointsRatioMethod: '',
  gamesPlayedRatio: 0,
  pointMethodValue: 0,
  enablePoints: false,
  freePlayCreditsTimeout: 0,
  locationLimit: 0,
  freePlayAmount: 0,
  pointsMethodGameTypes: [],
  freePlayGameTypes: [],
};

// ============================================================================
// GET Helpers
// ============================================================================

/**
 * Enriches location documents with licencee ID and includeJackpot flag.
 * Fetches licencee documents in batch to build a lookup map, then maps
 * each location to include the resolved licenceeId and jackpot setting.
 *
 * @param {LocationDocument[]} locations - Raw location documents from the database.
 * @returns {Promise<LocationWithJackpot[]>} Locations enriched with licenceeId and includeJackpot.
 */
export async function enrichLocationsWithJackpotFlag(
  locations: LocationDocument[]
): Promise<LocationWithJackpot[]> {
  const allLicenceeIds = Array.from(
    new Set(
      locations
        .map(location => {
          const licenceeRef = location.rel?.licencee;
          return Array.isArray(licenceeRef) ? licenceeRef[0] : licenceeRef;
        })
        .filter(Boolean)
    )
  );

  const licenceeDocs = await Licencee.find(
    { _id: { $in: allLicenceeIds } },
    { includeJackpot: 1 }
  ).lean<LicenceeDocument[]>();

  const jackpotMap = new Map(
    licenceeDocs.map(licenceeDoc => [
      String(licenceeDoc._id),
      !!licenceeDoc.includeJackpot,
    ])
  );

  return locations.map(location => {
    const licenceeRef = location.rel?.licencee;
    const licenceeId = Array.isArray(licenceeRef)
      ? licenceeRef[0]
        ? String(licenceeRef[0])
        : null
      : licenceeRef
        ? String(licenceeRef)
        : null;
    return {
      ...location,
      licenceeId,
      includeJackpot: licenceeId
        ? jackpotMap.get(licenceeId) || false
        : false,
    };
  });
}

// ============================================================================
// POST Helpers
// ============================================================================

/**
 * Builds the Mongoose document payload for a new gaming location.
 * Applies defaults for bill validator options, membership settings, geo coordinates,
 * and profit share when not provided in the request body.
 *
 * @param {LocationRequestBody} body - The parsed request body from the POST handler.
 * @returns {Promise<Record<string, unknown>>} Document fields ready for Mongoose construction.
 */
export async function buildNewLocationDocument(
  body: LocationRequestBody
): Promise<Record<string, unknown>> {
  const locationId = await generateMongoId();
  return {
    _id: locationId,
    name: body.name,
    country: body.country,
    address: {
      street: body.address?.street || '',
      city: body.address?.city || '',
    },
    rel: { licencee: (body.rel?.licencee || []) as string[] },
    profitShare: body.profitShare || 50,
    gameDayOffset: body.gameDayOffset ?? 8,
    isLocalServer: body.isLocalServer || false,
    previousCollectionTime: body.previousCollectionTime
      ? new Date(body.previousCollectionTime)
      : undefined,
    geoCoords: {
      latitude: body.geoCoords?.latitude || 0,
      longitude: body.geoCoords?.longitude || 0,
      longtitude: body.geoCoords?.longitude || 0,
    },
    billValidatorOptions:
      body.billValidatorOptions || DEFAULT_BILL_VALIDATOR_OPTIONS,
    membershipEnabled: body.membershipEnabled || false,
    aceEnabled: body.aceEnabled || false,
    locationMembershipSettings:
      body.locationMembershipSettings || DEFAULT_MEMBERSHIP_SETTINGS,
    googleMapsLink: body.googleMapsLink || '',
    googleMapsIframe: body.googleMapsIframe || '',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: new Date(-1),
  };
}

/**
 * Logs the creation of a new location as an activity entry.
 * Converts all document fields (excluding internal fields) into change entries
 * with null old values since this is a new record.
 *
 * @param {UserForLogging | null} user - The authenticated user performing the action.
 * @param {NextRequest} request - The incoming request for IP and user-agent extraction.
 * @param {string} locationId - The generated _id of the new location.
 * @param {string} locationName - Display name of the new location.
 * @param {{ toObject: () => Record<string, unknown> }} savedLocation - The saved Mongoose document.
 * @returns {Promise<void>}
 */
export async function logLocationCreationActivity(
  user: UserForLogging | null,
  request: NextRequest,
  locationId: string,
  locationName: string,
  savedLocation: { toObject: () => Record<string, unknown> }
): Promise<void> {
  if (!user?.emailAddress) return;

  const changes: ChangeEntry[] = Object.entries(savedLocation.toObject())
    .filter(([key]) => !FIELDS_EXCLUDED_FROM_CHANGES.includes(key))
    .map(([key, val]) => {
      let stringVal = String(val);
      if (val instanceof Date) {
        stringVal = val.toISOString();
      } else if (typeof val === 'object' && val !== null) {
        stringVal = JSON.stringify(val);
      }
      return { field: key, oldValue: null, newValue: stringVal };
    });

  await logActivity({
    action: 'CREATE',
    details: `Created location "${locationName}"`,
    ipAddress: getClientIP(request) || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    userId: user._id,
    username: user.emailAddress,
    metadata: {
      resource: 'location',
      resourceId: locationId,
      resourceName: locationName,
      changes,
    },
  });
}

// ============================================================================
// PUT Helpers
// ============================================================================

/**
 * Builds the update data object from the PUT request body.
 * Only includes fields that are present in the body, preserving existing values
 * for omitted fields. Handles legacy `longtitude` field for backward compatibility.
 *
 * @param {LocationRequestBody} body - The parsed request body from the PUT handler.
 * @returns {UpdateLocationData} The update data object for Mongoose $set operation.
 */
export function buildLocationUpdateData(
  body: LocationRequestBody
): UpdateLocationData {
  const updateData: UpdateLocationData = { updatedAt: new Date() };

  if (body.name) updateData.name = body.name;
  if (body.country) updateData.country = body.country;
  if (body.address)
    updateData.address = {
      street: body.address.street,
      city: body.address.city,
    };
  if (body.rel) updateData.rel = { licencee: body.rel.licencee };
  if (typeof body.profitShare === 'number')
    updateData.profitShare = body.profitShare;
  if (typeof body.gameDayOffset === 'number')
    updateData.gameDayOffset = body.gameDayOffset;
  if (typeof body.isLocalServer === 'boolean')
    updateData.isLocalServer = body.isLocalServer;

  if (body.geoCoords && body.geoCoords.latitude && body.geoCoords.longitude) {
    updateData.geoCoords = {
      latitude: body.geoCoords.latitude,
      longitude: body.geoCoords.longitude,
      longtitude: body.geoCoords.longitude,
    };
  }

  if (body.billValidatorOptions) {
    updateData.billValidatorOptions = Object.fromEntries(
      Object.entries(body.billValidatorOptions).map(([key, val]) => [
        key,
        Boolean(val),
      ])
    ) as Record<string, boolean>;
  }

  if (body.membershipEnabled !== undefined)
    updateData.membershipEnabled = Boolean(body.membershipEnabled);
  if (body.aceEnabled !== undefined)
    updateData.aceEnabled = Boolean(body.aceEnabled);
  if (body.locationMembershipSettings)
    updateData.locationMembershipSettings = body.locationMembershipSettings;
  if (body.googleMapsLink !== undefined)
    updateData.googleMapsLink = body.googleMapsLink;
  if (body.googleMapsIframe !== undefined)
    updateData.googleMapsIframe = body.googleMapsIframe;

  return updateData;
}

/**
 * Logs the update of an existing location as an activity entry.
 * Calculates field-level changes between the previous document state and the update data.
 *
 * @param {UserForLogging | null} user - The authenticated user performing the action.
 * @param {NextRequest} request - The incoming request for IP and user-agent extraction.
 * @param {LocationDocument} location - The existing location document (pre-update).
 * @param {UpdateLocationData} updateData - The update data that was applied.
 * @returns {Promise<void>}
 */
export async function logLocationUpdateActivity(
  user: UserForLogging | null,
  request: NextRequest,
  location: LocationDocument,
  updateData: UpdateLocationData
): Promise<void> {
  if (!user?.emailAddress) return;

  await logActivity({
    action: 'UPDATE',
    details: `Updated location "${location.name}"`,
    ipAddress: getClientIP(request) || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    userId: user._id,
    username: user.emailAddress,
    metadata: {
      resource: 'location',
      resourceId: String(location._id),
      resourceName: location.name,
      changes: calculateChanges(
        location as unknown as Record<string, unknown>,
        updateData as Record<string, unknown>
      ),
      previousData: location,
      newData: updateData,
    },
  });
}

// ============================================================================
// DELETE Helpers
// ============================================================================

/**
 * Permanently deletes a location and all its machines from the database.
 * Returns an error response if the location is not found during deletion.
 *
 * @param {string} locationId - The _id of the location to hard-delete.
 * @returns {Promise<NextResponse | null>} Error response if deletion fails, null on success.
 */
export async function executeHardDelete(
  locationId: string
): Promise<NextResponse | null> {
  const deleteLocationResult = await GamingLocations.deleteOne({
    _id: locationId,
  });
  if (deleteLocationResult.deletedCount === 0) {
    return NextResponse.json(
      { success: false, message: 'Location not found' },
      { status: 404 }
    );
  }

  const deleteMachinesResult = await Machine.deleteMany({
    gamingLocation: locationId,
  });
  if (deleteMachinesResult.deletedCount === 0) {
    console.warn(
      `[Locations DELETE] No machines found for location ${locationId}`
    );
  }

  return null;
}

/**
 * Soft-deletes (archives) a location and all its machines by setting deletedAt.
 * Returns an error response if the location is not found during archival.
 *
 * @param {string} locationId - The _id of the location to archive.
 * @param {Date} archiveTimestamp - The timestamp to set as deletedAt.
 * @returns {Promise<NextResponse | null>} Error response if archival fails, null on success.
 */
export async function executeSoftDelete(
  locationId: string,
  archiveTimestamp: Date
): Promise<NextResponse | null> {
  const archiveLocationResult = await GamingLocations.findOneAndUpdate(
    { _id: locationId },
    { deletedAt: archiveTimestamp },
    { new: true }
  );
  if (!archiveLocationResult) {
    return NextResponse.json(
      { success: false, message: 'Location not found' },
      { status: 404 }
    );
  }

  const archiveMachinesResult = await Machine.updateMany(
    { gamingLocation: locationId },
    { deletedAt: archiveTimestamp }
  );
  if (archiveMachinesResult.modifiedCount === 0) {
    console.warn(
      `[Locations DELETE] No machines archived for location ${locationId}`
    );
  }

  return null;
}

/**
 * Logs the deletion or archival of a location and all its associated machines.
 * For hard deletes, logs DELETE actions with full field snapshots.
 * For soft deletes, logs ARCHIVE actions with deletedAt change entries.
 *
 * @param {UserForLogging | null} user - The authenticated user performing the action.
 * @param {NextRequest} request - The incoming request for IP and user-agent extraction.
 * @param {LocationDocument} location - The location document being deleted/archived.
 * @param {GamingMachine[]} associatedMachines - Machines belonging to the location.
 * @param {boolean} isHardDelete - Whether this is a permanent deletion vs archival.
 * @param {Date} archiveTimestamp - The timestamp used for soft-delete.
 * @returns {Promise<void>}
 */
export async function logDeleteActivity(
  user: UserForLogging | null,
  request: NextRequest,
  location: LocationDocument,
  associatedMachines: GamingMachine[],
  isHardDelete: boolean,
  archiveTimestamp: Date
): Promise<void> {
  if (!user?.emailAddress) return;

  const locationId = String(location._id);
  const changes = mapDeletedFieldsToChanges(
    location as unknown as Record<string, unknown>
  );

  await logActivity({
    action: isHardDelete ? 'DELETE' : 'ARCHIVE',
    details: `${isHardDelete ? 'Permanently deleted' : 'Archived'} location "${location.name}"`,
    ipAddress: getClientIP(request) || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    userId: user._id,
    username: user.emailAddress,
    metadata: {
      resource: 'location',
      resourceId: locationId,
      resourceName: location.name,
      isHardDelete,
      changes,
      previousData: location,
      newData: null,
    },
  });

  for (const machine of associatedMachines) {
    await logMachineDeleteActivity(
      user,
      request,
      machine,
      isHardDelete,
      archiveTimestamp
    );
  }
}

// ============================================================================
// PATCH Helpers
// ============================================================================

/**
 * Restores a soft-deleted location and all its machines by unsetting deletedAt.
 * Returns an error response if the location cannot be found during restoration.
 *
 * @param {string} locationId - The _id of the location to restore.
 * @returns {Promise<{ error: NextResponse } | { machines: GamingMachine[] }>} Either an error or the associated machines.
 */
export async function executeLocationRestore(
  locationId: string
): Promise<{ error: NextResponse } | { machines: GamingMachine[] }> {
  const restoreLocationResult = await GamingLocations.findOneAndUpdate(
    { _id: locationId },
    { $unset: { deletedAt: 1 } },
    { new: true }
  );
  if (!restoreLocationResult) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Location not found' },
        { status: 404 }
      ),
    };
  }

  const associatedMachines = await Machine.find({
    gamingLocation: locationId,
  }).lean<GamingMachine[]>();

  const restoreMachinesResult = await Machine.updateMany(
    { gamingLocation: locationId },
    { $unset: { deletedAt: 1 } }
  );
  if (restoreMachinesResult.modifiedCount === 0) {
    console.warn(
      `[Locations PATCH] No machines restored for location ${locationId}`
    );
  }

  return { machines: associatedMachines };
}

/**
 * Logs the restoration of a location and all its associated machines.
 * Each machine gets an individual restore activity entry tracking the deletedAt change.
 *
 * @param {UserForLogging | null} user - The authenticated user performing the action.
 * @param {NextRequest} request - The incoming request for IP and user-agent extraction.
 * @param {LocationDocument} location - The location document being restored.
 * @param {GamingMachine[]} associatedMachines - Machines belonging to the location.
 * @returns {Promise<void>}
 */
export async function logRestoreActivity(
  user: UserForLogging | null,
  request: NextRequest,
  location: LocationDocument,
  associatedMachines: GamingMachine[]
): Promise<void> {
  if (!user?.emailAddress) return;

  const locationId = String(location._id);

  await logActivity({
    action: 'restore',
    details: `Restored location "${location.name}"`,
    ipAddress: getClientIP(request) || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    userId: user._id,
    username: user.emailAddress,
    metadata: {
      resource: 'location',
      resourceId: locationId,
      resourceName: location.name,
      previousData: location,
      newData: { ...location, deletedAt: undefined },
    },
  });

  for (const machine of associatedMachines) {
    await logMachineRestoreActivity(user, request, machine);
  }
}

// ============================================================================
// General Utilities
// ============================================================================

/**
 * Finds a gaming location by its _id, optionally including soft-deleted records.
 * When includeDeleted is false (default), applies the standard soft-delete filter.
 *
 * @param {string} id - The _id of the location to find.
 * @param {boolean} [includeDeleted] - When true, fetches regardless of deletedAt status.
 * @returns {Promise<LocationDocument | null>} The location document or null if not found.
 */
export async function findLocationById(
  id: string,
  includeDeleted?: boolean
): Promise<LocationDocument | null> {
  const filter: Record<string, unknown> = { _id: id };
  if (!includeDeleted) {
    filter.$or = [
      { deletedAt: null },
      { deletedAt: { $lt: new Date('2026-01-01') } },
    ];
  }
  return GamingLocations.findOne(filter).lean<LocationDocument>();
}

/**
 * Fetches all machines (including soft-deleted) associated with a location.
 *
 * @param {string} locationId - The _id of the location.
 * @returns {Promise<GamingMachine[]>} Array of associated machine documents.
 */
export async function findMachinesByLocation(
  locationId: string
): Promise<GamingMachine[]> {
  return Machine.find({
    gamingLocation: locationId,
  }).lean<GamingMachine[]>();
}

/**
 * Validates that a country ID references an existing country document.
 *
 * @param {string} countryId - The _id of the country to validate.
 * @returns {Promise<boolean>} True if the country exists, false otherwise.
 */
export async function validateCountryReference(
  countryId: string
): Promise<boolean> {
  const countryDoc = await Countries.findOne({
    _id: countryId,
  }).lean<CountryDocument>();
  return !!countryDoc;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Logs a single machine deletion or archival activity entry.
 *
 * @param {UserForLogging} user - The authenticated user.
 * @param {{ headers: { get: (key: string) => string | null } }} request - Request for IP/UA extraction.
 * @param {GamingMachine} machine - The machine being deleted/archived.
 * @param {boolean} isHardDelete - Whether this is a permanent deletion vs archival.
 * @param {Date} archiveTimestamp - The timestamp used for soft-delete.
 * @returns {Promise<void>}
 */
async function logMachineDeleteActivity(
  user: UserForLogging,
  request: NextRequest,
  machine: GamingMachine,
  isHardDelete: boolean,
  archiveTimestamp: Date
): Promise<void> {
  const machineId = String(machine._id);
  const resourceName =
    machine.custom?.name || machine.serialNumber || machine.machineId || machineId;

  if (isHardDelete) {
    const machineChanges = mapDeletedFieldsToChanges(
      machine as unknown as Record<string, unknown>
    );
    await logActivity({
      action: 'DELETE',
      details: `Permanently deleted machine "${resourceName}" as part of location permanent deletion`,
      ipAddress: getClientIP(request) || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      userId: user._id,
      username: user.emailAddress,
      metadata: {
        resource: 'machine',
        resourceId: machineId,
        resourceName,
        changes: machineChanges,
        previousData: machine,
        newData: null,
      },
    });
  } else {
    const machineChanges = [
      {
        field: 'deletedAt',
        oldValue: machine.deletedAt
          ? new Date(machine.deletedAt).toISOString()
          : null,
        newValue: archiveTimestamp.toISOString(),
      },
    ];
    await logActivity({
      action: 'ARCHIVE',
      details: `Archived machine "${resourceName}" as part of location archiving`,
      ipAddress: getClientIP(request) || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      userId: user._id,
      username: user.emailAddress,
      metadata: {
        resource: 'machine',
        resourceId: machineId,
        resourceName,
        changes: machineChanges,
        previousData: machine,
        newData: { ...machine, deletedAt: archiveTimestamp },
      },
    });
  }
}

/**
 * Logs a single machine restoration activity entry.
 *
 * @param {UserForLogging} user - The authenticated user.
 * @param {{ headers: { get: (key: string) => string | null } }} request - Request for IP/UA extraction.
 * @param {GamingMachine} machine - The machine being restored.
 * @returns {Promise<void>}
 */
async function logMachineRestoreActivity(
  user: UserForLogging,
  request: NextRequest,
  machine: GamingMachine
): Promise<void> {
  const machineId = String(machine._id);
  const resourceName =
    machine.custom?.name || machine.serialNumber || machine.machineId || machineId;

  const machineChanges = [
    {
      field: 'deletedAt',
      oldValue: machine.deletedAt
        ? new Date(machine.deletedAt).toISOString()
        : null,
      newValue: null,
    },
  ];

  await logActivity({
    action: 'restore',
    details: `Restored machine "${resourceName}" as part of location restoration`,
    ipAddress: getClientIP(request) || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    userId: user._id,
    username: user.emailAddress,
    metadata: {
      resource: 'machine',
      resourceId: machineId,
      resourceName,
      changes: machineChanges,
      previousData: machine,
      newData: { ...machine, deletedAt: undefined },
    },
  });
}
