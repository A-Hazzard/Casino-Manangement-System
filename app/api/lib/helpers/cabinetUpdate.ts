/**
 * Cabinet Update Helper Functions
 *
 * This module contains logic for mapping incoming API payloads to machine document updates.
 *
 * @module app/api/lib/helpers/cabinetUpdate
 */

import { calculateChanges } from '@/app/api/lib/helpers/activityLogger';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import type { ActivityLogChange } from '@shared/types/activityLog';

export type CabinetUpdatePayload = {
  assetNumber?: string;
  installedGame?: string;
  gameType?: string;
  manufacturer?: string;
  status?: string;
  machineStatus?: string;
  cabinetType?: string;
  locationId?: string;
  accountingDenomination?: string | number;
  gameConfig?: {
    theoreticalRtp?: string | number;
    maxBet?: string | number;
    payTableId?: string;
    additionalId?: string;
    gameOptions?: string;
    progressiveGroup?: string;
  };
  custom?: { name: string };
  collectionTime?: string | Date;
  collectionMeters?: {
    metersIn?: number;
    metersOut?: number;
  };
  collectionMultiplier?: string | number;
  collectorDenomination?: string | number;
  isCronosMachine?: boolean;
  smbId?: string;
  smibBoard?: string;
  relayId?: string;
  collectionSettings?: {
    lastMetersIn?: string | number;
    lastMetersOut?: string | number;
    lastCollectionTime?: string | Date;
  };
  [key: string]: unknown; // Allow for dynamic fields like 'gameConfig.accountingDenomination'
};

/**
 * Maps an incoming update payload to MongoDB update fields for a machine.
 *
 * @param data - Incoming partial cabinet data
 * @returns Object ready for Mongoose update
 */
export function mapCabinetUpdateFields(data: CabinetUpdatePayload) {
  const updateFields: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  // Basic fields
  if (data.assetNumber) updateFields.serialNumber = data.assetNumber;
  if (data.installedGame) updateFields.game = data.installedGame;
  if (data.gameType) updateFields.gameType = data.gameType;
  if (data.manufacturer) {
    updateFields.manufacturer = data.manufacturer;
    updateFields.manuf = data.manufacturer;
  }
  if (data.status) updateFields.assetStatus = data.status;
  if (data.machineStatus) updateFields.machineStatus = data.machineStatus;
  if (data.cabinetType) updateFields.cabinetType = data.cabinetType;

  // Location
  if (data.locationId) {
    updateFields.gamingLocation = data.locationId;
  }

  // Game Config
  if (data.accountingDenomination !== undefined) {
    updateFields['gameConfig.accountingDenomination'] = Number(
      data.accountingDenomination
    );
  }

  if (data.gameConfig) {
    if (data.gameConfig.theoreticalRtp !== undefined)
      updateFields['gameConfig.theoreticalRtp'] =
        Number(data.gameConfig.theoreticalRtp) || 0;
    if (data.gameConfig.maxBet !== undefined)
      updateFields['gameConfig.maxBet'] = String(data.gameConfig.maxBet);
    if (data.gameConfig.payTableId !== undefined)
      updateFields['gameConfig.payTableId'] = data.gameConfig.payTableId;
    if (data.gameConfig.additionalId !== undefined)
      updateFields['gameConfig.additionalId'] = data.gameConfig.additionalId;
    if (data.gameConfig.gameOptions !== undefined)
      updateFields['gameConfig.gameOptions'] = data.gameConfig.gameOptions;
    if (data.gameConfig.progressiveGroup !== undefined)
      updateFields['gameConfig.progressiveGroup'] =
        data.gameConfig.progressiveGroup;
  }

  // Handle direct dot notation keys if sent (as seen in some components)
  if (data['gameConfig.accountingDenomination'] !== undefined)
    updateFields['gameConfig.accountingDenomination'] = Number(
      data['gameConfig.accountingDenomination']
    );
  if (data['gameConfig.theoreticalRtp'] !== undefined)
    updateFields['gameConfig.theoreticalRtp'] = Number(
      data['gameConfig.theoreticalRtp']
    );
  if (data['gameConfig.maxBet'] !== undefined)
    updateFields['gameConfig.maxBet'] = String(data['gameConfig.maxBet']);

  // Custom fields
  if (data.custom?.name) {
    updateFields['custom.name'] = data.custom.name;
  }
  if (data['custom.name']) {
    updateFields['custom.name'] = data['custom.name'];
  }

  // Collection Settings
  if (data.collectionTime) {
    updateFields.collectionTime = new Date(data.collectionTime);
  }

  if (data.collectionMeters) {
    if (data.collectionMeters.metersIn !== undefined) {
      updateFields['collectionMeters.metersIn'] = Number(
        data.collectionMeters.metersIn
      );
    }
    if (data.collectionMeters.metersOut !== undefined) {
      updateFields['collectionMeters.metersOut'] = Number(
        data.collectionMeters.metersOut
      );
    }
  }

  // Handle alternative collectionSettings format from frontend
  if (data.collectionSettings) {
    if (
      data.collectionSettings.lastMetersIn !== undefined &&
      data.collectionSettings.lastMetersIn !== ''
    ) {
      updateFields['collectionMeters.metersIn'] = Number(
        data.collectionSettings.lastMetersIn
      );
    }
    if (
      data.collectionSettings.lastMetersOut !== undefined &&
      data.collectionSettings.lastMetersOut !== ''
    ) {
      updateFields['collectionMeters.metersOut'] = Number(
        data.collectionSettings.lastMetersOut
      );
    }
    if (data.collectionSettings.lastCollectionTime) {
      updateFields.collectionTime = new Date(
        data.collectionSettings.lastCollectionTime
      );
    }
  }

  const mult = data.collectionMultiplier ?? data.collectorDenomination;
  if (mult !== undefined) {
    updateFields.collectionMultiplier = String(mult);
    updateFields.collectorDenomination = Number(mult);
  }

  // Cronos/SAS
  if (data.isCronosMachine !== undefined)
    updateFields.isSasMachine = !data.isCronosMachine;

  // SMIB identification: all three fields are aliases for the same value.
  // All three are written to the DB for backward compatibility.
  const smib = data.smbId ?? data.smibBoard ?? data.relayId;
  if (smib !== undefined) {
    updateFields.relayId = smib;
    updateFields.smibBoard = smib;
    updateFields.smbId = smib;
  }

  return updateFields;
}

// The three SMIB alias fields that are always written together.
// When deduplicating changes for the activity log we keep only 'relayId'
// and drop the redundant aliases so the user sees a single row.
const SMIB_ALIAS_FIELDS = new Set(['smibBoard', 'smbId']);

const MANUFACTURER_ALIAS_FIELDS = new Set(['manuf']);

const CABINET_FIELD_DISPLAY_NAMES: Record<string, string> = {
  gamingLocation: 'location',
  serialNumber: 'assetNumber',
  game: 'installedGame',
  assetStatus: 'status',
  isSasMachine: 'isCronosMachine',
  manuf: 'manufacturer',
  collectorDenomination: 'collectionMultiplier',
  'gameConfig.accountingDenomination': 'accountingDenomination',
  'collectionMeters.metersIn': 'collectionSettings.lastMetersIn',
  'collectionMeters.metersOut': 'collectionSettings.lastMetersOut',
  collectionTime: 'collectionSettings.lastCollectionTime',
};

const LOCATION_ACTIVITY_FIELDS = new Set([
  'gamingLocation',
  'location',
  'locationId',
]);

/**
 * Removes redundant alias fields from a cabinet change list so the activity
 * log shows one clean 'Relay Id' row instead of three identical rows.
 */
export function deduplicateCabinetChanges(
  changes: ActivityLogChange[]
): ActivityLogChange[] {
  return changes.filter(
    change =>
      !SMIB_ALIAS_FIELDS.has(change.field) &&
      !MANUFACTURER_ALIAS_FIELDS.has(change.field)
  );
}

function stringifyActivityValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}

function mapCabinetChangeForDisplay(change: ActivityLogChange): ActivityLogChange {
  let { field, oldValue, newValue } = change;

  if (field === 'isSasMachine') {
    field = 'isCronosMachine';
    if (typeof oldValue === 'boolean') {
      oldValue = !oldValue;
    }
    if (typeof newValue === 'boolean') {
      newValue = !newValue;
    }
  } else if (CABINET_FIELD_DISPLAY_NAMES[field]) {
    field = CABINET_FIELD_DISPLAY_NAMES[field];
  }

  return {
    field,
    oldValue: stringifyActivityValue(oldValue),
    newValue: stringifyActivityValue(newValue),
  };
}

async function resolveLocationNamesForChanges(
  changes: ActivityLogChange[]
): Promise<ActivityLogChange[]> {
  const locationIds = new Set<string>();

  for (const change of changes) {
    if (!LOCATION_ACTIVITY_FIELDS.has(change.field)) {
      continue;
    }
    if (typeof change.oldValue === 'string' && change.oldValue.length === 24) {
      locationIds.add(change.oldValue);
    }
    if (typeof change.newValue === 'string' && change.newValue.length === 24) {
      locationIds.add(change.newValue);
    }
  }

  if (locationIds.size === 0) {
    return changes;
  }

  const locationDocs = await GamingLocations.find({
    _id: { $in: Array.from(locationIds) },
  })
    .select('_id name')
    .lean<Array<{ _id: string; name: string }>>();

  const locationNameById = new Map(
    locationDocs.map(location => [String(location._id), location.name])
  );

  return changes.map(change => {
    if (!LOCATION_ACTIVITY_FIELDS.has(change.field)) {
      return change;
    }

    const oldId =
      typeof change.oldValue === 'string' ? change.oldValue : undefined;
    const newId =
      typeof change.newValue === 'string' ? change.newValue : undefined;

    return {
      ...change,
      oldValue:
        oldId && locationNameById.has(oldId)
          ? locationNameById.get(oldId)
          : change.oldValue,
      newValue:
        newId && locationNameById.has(newId)
          ? locationNameById.get(newId)
          : change.newValue,
    };
  });
}

/**
 * Builds user-facing activity log changes for a cabinet update by diffing the
 * original machine document against the mapped update fields from the payload.
 */
export async function buildCabinetActivityChanges(
  originalDoc: Record<string, unknown>,
  incomingPayload: CabinetUpdatePayload
): Promise<ActivityLogChange[]> {
  const updateFields = mapCabinetUpdateFields(incomingPayload);
  delete updateFields.updatedAt;

  const rawChanges = deduplicateCabinetChanges(
    calculateChanges(originalDoc, updateFields)
  );

  const displayChanges = rawChanges.map(mapCabinetChangeForDisplay);
  return resolveLocationNamesForChanges(displayChanges);
}
