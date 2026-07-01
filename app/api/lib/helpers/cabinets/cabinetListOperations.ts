/**
 * Cabinet List Operations
 *
 * Extracted business logic for the cabinets list route (GET/POST /api/cabinets).
 * Handles availability checks, cabinet queries, creation with deduplication,
 * sorting, and activity logging.
 *
 * @module app/api/lib/helpers/cabinets/cabinetListOperations
 */

import { Machine } from '@/app/api/lib/models/machines';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { generateMongoId } from '@/lib/utils/id/generation';
import type { GamingMachine } from '@/shared/types';
import type { MachinePayload } from '@/shared/types/machines';

// ============================================================================
// Soft Delete Filter
// ============================================================================

/**
 * Returns the standard soft-delete filter for non-archived documents.
 *
 * @returns {Record<string, unknown>} MongoDB filter excluding recently deleted documents
 */
export function getActiveFilter(): Record<string, unknown> {
  return {
    $or: [
      { deletedAt: null },
      { deletedAt: { $lt: new Date('2025-01-01') } },
    ],
  };
}

// ============================================================================
// Normalization Helpers
// ============================================================================

function normalizeSerialNumber(value: string): string {
  return value.toUpperCase();
}

function normalizeSmibBoard(value: string | undefined): string | undefined {
  if (!value) return value;
  return value.toLowerCase();
}

// ============================================================================
// GET: Availability Check
// ============================================================================

/**
 * Checks if a cabinet serial number, SMIB board, or custom name is available.
 * Excludes a specific cabinet ID when checking during edit.
 *
 * @param {string | null} serialNumberToCheck - Serial number to check
 * @param {string | null} smibToCheck - SMIB board ID to check
 * @param {string | null} customNameToCheck - Custom name to check
 * @param {string | null} excludeId - Cabinet ID to exclude from check
 * @returns {Promise<boolean>} True if the cabinet is available
 */
export async function checkCabinetAvailability(
  serialNumberToCheck: string | null,
  smibToCheck: string | null,
  customNameToCheck: string | null,
  excludeId: string | null
): Promise<boolean> {
  const query: Record<string, unknown> = getActiveFilter();

  if (serialNumberToCheck) {
    query.serialNumber = normalizeSerialNumber(serialNumberToCheck);
  } else if (smibToCheck) {
    query.relayId = normalizeSmibBoard(smibToCheck) || '';
  } else if (customNameToCheck) {
    query['custom.name'] = customNameToCheck.trim();
  }

  if (excludeId) query._id = { $ne: excludeId };

  const existing = await Machine.findOne(query).lean<GamingMachine | null>();
  return !existing;
}

// ============================================================================
// GET: Single Cabinet
// ============================================================================

/**
 * Fetches a single cabinet by ID.
 *
 * @param {string} id - Cabinet ID
 * @returns {Promise<GamingMachine | null>} Cabinet document or null
 */
export async function getCabinetById(id: string): Promise<GamingMachine | null> {
  return Machine.findOne({ _id: id }).lean<GamingMachine | null>();
}

// ============================================================================
// GET: Cabinets by Location
// ============================================================================

/**
 * Fetches cabinets for a location, sorted by online status then gross descending.
 *
 * @param {string} locationId - Gaming location ID
 * @param {boolean} showArchived - Whether to include archived cabinets
 * @returns {Promise<GamingMachine[]>} Array of cabinet documents
 */

export async function getCabinetsByLocation(
  locationId: string,
  showArchived: boolean
): Promise<GamingMachine[]> {
  const query: Record<string, unknown> = { gamingLocation: locationId };

  if (showArchived) {
    query.deletedAt = { $gte: new Date('2025-01-01') };
  } else {
    query.$or = [
      { deletedAt: null },
      { deletedAt: { $lt: new Date('2025-01-01') } },
    ];
  }

  const cabinets = await Machine.find(query).lean<GamingMachine[]>();
  return sortCabinetsByOnlineStatus(cabinets);
}

// ============================================================================
// GET: Cabinet Sorting (Online First, then Gross Descending)
// ============================================================================

function sortCabinetsByOnlineStatus(cabinets: GamingMachine[]): GamingMachine[] {
  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

  return [...cabinets].sort((a, b) => {
    const aOnline =
      a.lastActivity && new Date(a.lastActivity) >= threeMinutesAgo;
    const bOnline =
      b.lastActivity && new Date(b.lastActivity) >= threeMinutesAgo;

    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;

    const aGross =
      (a.sasMeters?.drop || 0) - (a.sasMeters?.totalCancelledCredits || 0);
    const bGross =
      (b.sasMeters?.drop || 0) - (b.sasMeters?.totalCancelledCredits || 0);

    return bGross - aGross;
  });
}

// ============================================================================
// POST: Cabinet Deduplication Check
// ============================================================================

/**
 * Checks for an existing cabinet by serial number or SMIB board.
 *
 * @param {string} serialNumber - Cabinet serial number
 * @param {string} smibBoard - SMIB board ID
 * @returns {Promise<GamingMachine | null>} Existing cabinet or null
 */
export async function findExistingCabinet(
  serialNumber: string,
  smibBoard: string
): Promise<GamingMachine | null> {
  const normalizedSerial = normalizeSerialNumber(serialNumber);
  const normalizedSmib = normalizeSmibBoard(smibBoard) ?? '';

  return Machine.findOne({
    $and: [
      {
        $or: [
          { serialNumber: normalizedSerial },
          ...(normalizedSmib ? [{ relayId: normalizedSmib }] : []),
        ],
      },
      getActiveFilter(),
    ],
  }).lean<GamingMachine | null>();
}

// ============================================================================
// POST: Build New Cabinet Document
// ============================================================================

function buildNewCabinetDocument(
  data: MachinePayload,
  machineId: string,
  normalizedSerial: string,
  normalizedSmib: string
) {
  const smibValue = normalizedSmib;

  return new Machine({
    _id: machineId,
    serialNumber: normalizedSerial,
    game: data.game || data.installedGame || '',
    gameType: data.gameType || 'slot',
    isSasMachine: data.isCronosMachine ? false : true,
    gamingLocation: data.gamingLocation,
    assetStatus: data.assetStatus || data.status || 'Active',
    cabinetType: data.cabinetType || '',
    relayId: smibValue,
    smibBoard: smibValue,
    smbId: smibValue,
    collectorDenomination: Number(
      data.collectorDenomination || data.collectionMultiplier || 1
    ),
    gameConfig: {
      accountingDenomination: Number(data.accountingDenomination || 0),
      theoreticalRtp: Number(data.gameConfig?.theoreticalRtp || 0),
      maxBet: String(data.gameConfig?.maxBet || ''),
      payTableId: String(data.gameConfig?.payTableId || ''),
      additionalId: String(data.gameConfig?.additionalId || ''),
      gameOptions: String(data.gameConfig?.gameOptions || ''),
      progressiveGroup: String(data.gameConfig?.progressiveGroup || ''),
    },
    collectionTime:
      data.collectionSettings?.lastCollectionTime || data.collectionTime,
    collectionMeters: {
      metersIn: Number(
        data.collectionSettings?.lastMetersIn ||
          data.collectionMeters?.metersIn ||
          0
      ),
      metersOut: Number(
        data.collectionSettings?.lastMetersOut ||
          data.collectionMeters?.metersOut ||
          0
      ),
    },
    custom: { name: data.custom?.name || normalizedSerial },
    manuf: data.manufacturer || data.manuf || '',
    manufacturer: data.manufacturer || data.manuf || '',
    sasVersion: String(data.sasVersion || data.sas_version || ''),
    currentSession: String(
      data.currentSession || data.current_session || ''
    ),
    loggedIn: Boolean(data.loggedIn || data.logged_in || false),
    lastActivity:
      data.lastActivity || data.last_activity
        ? new Date((data.lastActivity || data.last_activity) as string)
        : new Date(),
    lastSasMeterAt:
      data.lastSasMeterAt || data.last_sas_meter_at
        ? new Date(
            (data.lastSasMeterAt || data.last_sas_meter_at) as string
          )
        : new Date(),
    lastBillMeterAt:
      data.lastBillMeterAt || data.last_bill_meter_at
        ? new Date(
            (data.lastBillMeterAt || data.last_bill_meter_at) as string
          )
        : new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: new Date(-1),
    gamingBoard: String(data.gamingBoard || ''),
    machineStatus: String(data.assetStatus || data.status || 'Active'),
    machineType: String(data.cabinetType || ''),
    smibVersion: {
      firmware: String(data.smibVersion?.firmware || ''),
      version: String(data.smibVersion?.version || ''),
    },
    machineMembershipSettings: {
      isPointsAllowed: Boolean(
        data.machineMembershipSettings?.isPointsAllowed ||
          data.machineMembershipSettings?.is_points_allowed ||
          false
      ),
      isFreePlayAllowed: Boolean(
        data.machineMembershipSettings?.isFreePlayAllowed ||
          data.machineMembershipSettings?.is_free_play_allowed ||
          false
      ),
      pointsAwardMethod: String(
        data.machineMembershipSettings?.pointsAwardMethod ||
          data.machineMembershipSettings?.points_award_method ||
          ''
      ),
      freePlayAmount: Number(
        data.machineMembershipSettings?.freePlayAmount ||
          data.machineMembershipSettings?.free_play_amount ||
          0
      ),
      freePlayCreditsTimeout: Number(
        data.machineMembershipSettings?.freePlayCreditsTimeout ||
          data.machineMembershipSettings?.free_play_credits_timeout ||
          0
      ),
    },
    billMeters: {
      dollar1: Number(
        data.billMeters?.dollar1 || data.billMeters?.dollar_1 || 0
      ),
      dollar2: Number(
        data.billMeters?.dollar2 || data.billMeters?.dollar_2 || 0
      ),
      dollar5: Number(
        data.billMeters?.dollar5 || data.billMeters?.dollar_5 || 0
      ),
      dollar10: Number(
        data.billMeters?.dollar10 || data.billMeters?.dollar_10 || 0
      ),
      dollar20: Number(
        data.billMeters?.dollar20 || data.billMeters?.dollar_20 || 0
      ),
      dollar50: Number(
        data.billMeters?.dollar50 || data.billMeters?.dollar_50 || 0
      ),
      dollar100: Number(
        data.billMeters?.dollar100 || data.billMeters?.dollar_100 || 0
      ),
      dollar500: Number(
        data.billMeters?.dollar500 || data.billMeters?.dollar_500 || 0
      ),
      dollar1000: Number(
        data.billMeters?.dollar1000 || data.billMeters?.dollar_1000 || 0
      ),
      dollar2000: Number(
        data.billMeters?.dollar2000 || data.billMeters?.dollar_2000 || 0
      ),
      dollar5000: Number(
        data.billMeters?.dollar5000 || data.billMeters?.dollar_5000 || 0
      ),
      dollarTotal: Number(
        data.billMeters?.dollarTotal || data.billMeters?.dollar_total || 0
      ),
      dollarTotalUnknown: Number(
        data.billMeters?.dollarTotalUnknown ||
          data.billMeters?.dollar_total_unknown ||
          0
      ),
    },
    sasMeters: {
      drop: Number(
        data.collectionSettings?.lastMetersIn || data.sasMeters?.drop || 0
      ),
      totalCancelledCredits: Number(
        data.collectionSettings?.lastMetersOut ||
          data.sasMeters?.totalCancelledCredits ||
          data.sasMeters?.total_cancelled_credits ||
          0
      ),
      gamesPlayed: Number(
        data.sasMeters?.gamesPlayed || data.sasMeters?.games_played || 0
      ),
      moneyOut: Number(
        data.sasMeters?.moneyOut || data.sasMeters?.money_out || 0
      ),
      slotDoorOpened: Number(
        data.sasMeters?.slotDoorOpened ||
          data.sasMeters?.slot_door_opened ||
          0
      ),
      powerReset: Number(
        data.sasMeters?.powerReset || data.sasMeters?.power_reset || 0
      ),
      totalHandPaidCancelledCredits: Number(
        data.sasMeters?.totalHandPaidCancelledCredits ||
          data.sasMeters?.total_hand_paid_cancelled_credits ||
          0
      ),
      coinIn: Number(
        data.sasMeters?.coinIn || data.sasMeters?.coin_in || 0
      ),
      coinOut: Number(
        data.sasMeters?.coinOut || data.sasMeters?.coin_out || 0
      ),
      totalWonCredits: Number(
        data.sasMeters?.totalWonCredits ||
          data.sasMeters?.total_won_credits ||
          0
      ),
      jackpot: Number(data.sasMeters?.jackpot || 0),
      currentCredits: Number(
        data.sasMeters?.currentCredits ||
          data.sasMeters?.current_credits ||
          0
      ),
      gamesWon: Number(
        data.sasMeters?.gamesWon || data.sasMeters?.games_won || 0
      ),
    },
  });
}

// ============================================================================
// POST: Activity Logging
// ============================================================================

async function logCabinetCreationActivity(
  data: MachinePayload,
  normalizedSerial: string,
  gamingLocation: string,
  machineId: string
): Promise<void> {
  const locDoc = await GamingLocations.findOne(
    { _id: gamingLocation },
    'name'
  ).lean<{ name: string }>();
  const locName = locDoc?.name || gamingLocation;

  const currentUser = await getUserFromServer();
  if (!currentUser) return;

  const changes: Array<{
    field: string;
    oldValue: null;
    newValue: unknown;
  }> = [];

  const addChange = (field: string, value: unknown) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    changes.push({ field, oldValue: null, newValue: value });
  };

  addChange('assetNumber', normalizedSerial);
  addChange('installedGame', data.game || data.installedGame);
  addChange('gameType', data.gameType);
  addChange('location', locName);
  addChange('manufacturer', data.manufacturer || data.manuf);
  addChange('cabinetType', data.cabinetType);
  addChange('status', data.assetStatus || data.status);
  addChange(
    'accountingDenomination',
    data.accountingDenomination ?? data.gameConfig?.accountingDenomination
  );
  addChange(
    'collectionMultiplier',
    data.collectionMultiplier ?? data.collectorDenomination
  );
  addChange('relayId', data.relayId || data.smibBoard || data.smbId);
  if (data.isCronosMachine !== undefined) {
    addChange('isCronosMachine', data.isCronosMachine);
  }
  if (data.custom?.name) {
    addChange('custom.name', data.custom.name);
  }
  if (data.collectionSettings?.lastCollectionTime || data.collectionTime) {
    addChange(
      'collectionSettings.lastCollectionTime',
      data.collectionSettings?.lastCollectionTime || data.collectionTime
    );
  }
  if (
    data.collectionSettings?.lastMetersIn !== undefined ||
    data.collectionMeters?.metersIn !== undefined
  ) {
    addChange(
      'collectionSettings.lastMetersIn',
      data.collectionSettings?.lastMetersIn ?? data.collectionMeters?.metersIn
    );
  }
  if (
    data.collectionSettings?.lastMetersOut !== undefined ||
    data.collectionMeters?.metersOut !== undefined
  ) {
    addChange(
      'collectionSettings.lastMetersOut',
      data.collectionSettings?.lastMetersOut ?? data.collectionMeters?.metersOut
    );
  }

  await logActivity({
    action: 'CREATE',
    details: `Created cabinet "${normalizedSerial}" at "${locName}"`,
    userId: currentUser._id as string,
    username: currentUser.emailAddress as string,
    metadata: {
      resource: 'cabinet',
      resourceId: machineId,
      resourceName: normalizedSerial,
      changes,
    },
  }).catch((err: unknown) => console.error('Failed to log create:', err));
}

// ============================================================================
// POST: Full Cabinet Creation
// ============================================================================

export type CreateCabinetResult =
  | { success: true; cabinet: ReturnType<typeof buildNewCabinetDocument>; machineId: string }
  | { success: false; error: string };

/**
 * Creates a new cabinet with deduplication check, activity logging, and full document building.
 *
 * @param {MachinePayload} data - Cabinet creation payload
 * @returns {Promise<CreateCabinetResult>} Result with success status and cabinet or error
 */
export async function createCabinet(
  data: MachinePayload
): Promise<CreateCabinetResult> {
  const normalizedSerial = normalizeSerialNumber(data.serialNumber);
  const normalizedSmib =
    normalizeSmibBoard(data.smibBoard || data.relayId) ?? '';

  const existing = await findExistingCabinet(normalizedSerial, normalizedSmib);
  if (existing) {
    return {
      success: false,
      error: 'Cabinet already exists (Serial or SMIB duplicate)',
    };
  }

  const machineId = await generateMongoId();
  const cabinet = buildNewCabinetDocument(
    data,
    machineId,
    normalizedSerial,
    normalizedSmib
  );
  await cabinet.save();

  await logCabinetCreationActivity(
    data,
    normalizedSerial,
    data.gamingLocation || '',
    machineId
  );

  return { success: true, cabinet, machineId };
}
