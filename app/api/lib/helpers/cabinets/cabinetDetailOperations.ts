/**
 * Cabinet Detail Operations
 *
 * Extracted business logic for the cabinet detail route.
 * Handles metrics aggregation, currency conversion,
 * cabinet CRUD with cascade updates, and activity logging.
 *
 * @module app/api/lib/helpers/cabinets/cabinetDetailOperations
 */

import { Machine } from '@/app/api/lib/models/machines';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Meters } from '@/app/api/lib/models/meters';
import { Collections } from '@/app/api/lib/models/collections';
import {
  getMoneyInScale,
  getMoneyOutAndJackpotScale,
} from '@/app/api/lib/utils/reviewerScale';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import {
  mapCabinetUpdateFields,
  buildCabinetActivityChanges,
  type CabinetUpdatePayload,
} from '@/app/api/lib/helpers/cabinetUpdate';
import {
  logActivity,
  mapDeletedFieldsToChanges,
} from '@/app/api/lib/helpers/activityLogger';
import { getClientIP } from '@/lib/utils/ipAddress';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
  getLicenceeCurrency,
} from '@/lib/helpers/rates';
import type { LocationDocument, MachineDocument } from '@/lib/types/common';
import type { CurrencyCode } from '@/shared/types/currency';
import type { TimePeriod } from '@/shared/types/common';
import type { LicenceeDocument } from '@/shared/types';
import { NextRequest } from 'next/server';

// ============================================================================
// Types
// ============================================================================

export type CabinetMetrics = {
  moneyIn: number;
  moneyOut: number;
  jackpot: number;
  gross: number;
  netGross: number;
  coinIn: number;
  coinOut: number;
  gamesPlayed: number;
  gamesWon: number;
  handPaidCancelledCredits: number;
};

type UserForScale = {
  moneyInMultiplier?: number | null;
  moneyOutAndJackpotMultiplier?: number | null;
  roles?: string[];
  reviewerMultiplierStartTime?: Date | string | null;
};

type UserForLogging = {
  _id: string;
  emailAddress?: string;
};

export type MutationResult = {
  success: boolean;
  data?: unknown;
  error?: string;
  status?: number;
  message?: string;
};

// ============================================================================
// GET Helpers: Location & Licencee Settings
// ============================================================================

export async function fetchLocationSettings(
  locationId: string
): Promise<{
  location: LocationDocument | null;
  gameDayOffset: number;
  aceEnabled: boolean;
  licenceeId: string | undefined;
  includeJackpot: boolean;
}> {
  const location = await GamingLocations.findOne({ _id: locationId })
    .select('name gameDayOffset rel aceEnabled country')
    .lean<LocationDocument>();

  const gameDayOffset = location?.gameDayOffset ?? 8;
  const aceEnabled = location?.aceEnabled === true;

  let includeJackpot = false;
  let licenceeId: string | undefined;
  const rawLicenceeId = location?.rel?.licencee;
  if (rawLicenceeId) {
    licenceeId = Array.isArray(rawLicenceeId) ? rawLicenceeId[0] : rawLicenceeId;
    const licDoc = await Licencee.findOne(
      { _id: licenceeId },
      { includeJackpot: 1 }
    ).lean<LicenceeDocument>();
    includeJackpot = Boolean(licDoc?.includeJackpot);
  }

  return { location, gameDayOffset, aceEnabled, licenceeId, includeJackpot };
}

// ============================================================================
// GET Helpers: Metrics Aggregation
// ============================================================================

export async function aggregateCabinetMetrics(
  cabinetId: string,
  timePeriod: string | null,
  startDateParam: string | null,
  endDateParam: string | null,
  gameDayOffset: number,
  includeJackpot: boolean,
  userPayload: UserForScale,
  dateField: string = 'readAt'
): Promise<CabinetMetrics> {
  const metrics: CabinetMetrics = {
    moneyIn: 0,
    moneyOut: 0,
    jackpot: 0,
    gross: 0,
    netGross: 0,
    coinIn: 0,
    coinOut: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    handPaidCancelledCredits: 0,
  };

  if (!timePeriod && !(startDateParam && endDateParam)) return metrics;

  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (timePeriod === 'Custom' && startDateParam && endDateParam) {
    const customStart = new Date(
      startDateParam.includes('T')
        ? startDateParam
        : startDateParam + 'T00:00:00.000Z'
    );
    const customEnd = new Date(
      endDateParam.includes('T')
        ? endDateParam
        : endDateParam + 'T00:00:00.000Z'
    );
    const range = getGamingDayRangeForPeriod(
      'Custom',
      gameDayOffset,
      customStart,
      customEnd
    );
    startDate = range.rangeStart;
    endDate = range.rangeEnd;
  } else if (timePeriod !== 'All Time') {
    const range = getGamingDayRangeForPeriod(
      (timePeriod || 'Today') as TimePeriod,
      gameDayOffset
    );
    startDate = range.rangeStart;
    endDate = range.rangeEnd;
  }

  const matchQuery: Record<string, unknown> = { machine: cabinetId };
  if (startDate && endDate) {
    matchQuery[dateField] = { $gte: startDate, $lte: endDate };
  }

  const aggregation = await Meters.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        moneyIn: { $sum: '$movement.drop' },
        moneyOut: { $sum: '$movement.totalCancelledCredits' },
        jackpot: { $sum: '$movement.jackpot' },
        coinIn: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
        coinOut: { $sum: { $ifNull: ['$movement.coinOut', 0] } },
        gamesPlayed: { $sum: { $ifNull: ['$movement.gamesPlayed', 0] } },
        gamesWon: { $sum: { $ifNull: ['$movement.gamesWon', 0] } },
        handPaidCancelledCredits: {
          $sum: { $ifNull: ['$movement.handPaidCancelledCredits', 0] },
        },
      },
    },
  ]);

  if (aggregation[0]) {
    const raw = aggregation[0];
    const moneyInScale = getMoneyInScale(userPayload, endDate);
    const moneyOutScale = getMoneyOutAndJackpotScale(userPayload, endDate);

    metrics.moneyIn = raw.moneyIn * moneyInScale;
    metrics.jackpot = raw.jackpot * moneyOutScale;
    const rawCancelled = raw.moneyOut * moneyOutScale;
    metrics.moneyOut = rawCancelled + (includeJackpot ? metrics.jackpot : 0);
    metrics.gross = metrics.moneyIn - metrics.moneyOut;
    metrics.netGross = metrics.gross - metrics.jackpot;
    metrics.coinIn = raw.coinIn;
    metrics.coinOut = raw.coinOut;
    metrics.gamesPlayed = raw.gamesPlayed;
    metrics.gamesWon = raw.gamesWon;
    metrics.handPaidCancelledCredits = raw.handPaidCancelledCredits;
  }

  return metrics;
}

// ============================================================================
// GET Helpers: Currency Conversion
// ============================================================================

export async function convertCabinetCurrency(
  metrics: CabinetMetrics,
  displayCurrency: CurrencyCode,
  userRoles: string[],
  licenceeId: string | undefined,
  location: LocationDocument | null
): Promise<CabinetMetrics> {
  const isStaff = userRoles.some(r =>
    ['cashier', 'vault-manager'].includes(r.toLowerCase())
  );

  if (
    !displayCurrency ||
    isStaff ||
    (metrics.moneyIn === 0 && metrics.moneyOut === 0)
  ) {
    return { ...metrics };
  }

  let nativeCurrency: CurrencyCode = 'USD';
  if (licenceeId) {
    const lic = await Licencee.findOne(
      { _id: licenceeId },
      { name: 1 }
    ).lean<LicenceeDocument>();
    if (lic?.name) nativeCurrency = getLicenceeCurrency(lic.name);
  } else if (location?.country) {
    nativeCurrency = getCountryCurrency(location.country);
  }

  if (nativeCurrency === displayCurrency) return { ...metrics };

  const converted: CabinetMetrics = {
    ...metrics,
    moneyIn: convertFromUSD(
      convertToUSD(metrics.moneyIn, nativeCurrency),
      displayCurrency
    ),
    moneyOut: convertFromUSD(
      convertToUSD(metrics.moneyOut, nativeCurrency),
      displayCurrency
    ),
    jackpot: convertFromUSD(
      convertToUSD(metrics.jackpot, nativeCurrency),
      displayCurrency
    ),
    coinIn: convertFromUSD(
      convertToUSD(metrics.coinIn, nativeCurrency),
      displayCurrency
    ),
    coinOut: convertFromUSD(
      convertToUSD(metrics.coinOut, nativeCurrency),
      displayCurrency
    ),
    gamesPlayed: metrics.gamesPlayed,
    gamesWon: metrics.gamesWon,
    handPaidCancelledCredits: metrics.handPaidCancelledCredits,
  };
  converted.gross = converted.moneyIn - converted.moneyOut;
  converted.netGross = converted.gross - converted.jackpot;

  return converted;
}

// ============================================================================
// GET Helpers: Response Building
// ============================================================================

export function buildCabinetResponse(
  machine: MachineDocument,
  metrics: CabinetMetrics,
  locationName: string,
  aceEnabled: boolean,
  includeJackpot: boolean
): Record<string, unknown> {
  const machineRecord = machine as Record<string, unknown>;

  return {
    ...machine,
    locationName: locationName || 'Unknown Location',
    aceEnabled,
    includeJackpot,
    ...metrics,
    assetNumber: machine.serialNumber,
    locationId: String(machine.gamingLocation),
    installedGame: machine.game,
    isCronosMachine: !machine.isSasMachine,
    accountingDenomination:
      machine.gameConfig?.accountingDenomination ??
      machine.accountingDenomination ??
      '1',
    collectionMultiplier: String(
      machine.collectorDenomination ||
        (machineRecord.collectionMultiplier as string) ||
        '1'
    ),
    smbId:
      machine.relayId ||
      machine.smibBoard ||
      (machineRecord.smbId as string) ||
      '',
    status: machine.assetStatus,
    assetStatus: machine.assetStatus,
  };
}

// ============================================================================
// PUT: Full Cabinet Update
// ============================================================================

export async function performCabinetUpdate(
  cabinetId: string,
  data: Record<string, unknown>,
  request: NextRequest
): Promise<MutationResult> {
  const originalCabinet = await Machine.findOne({ _id: cabinetId });
  if (!originalCabinet) {
    console.error(`[performCabinetUpdate] Not found: ${cabinetId}`);
    return { success: false, error: 'Cabinet not found', status: 404 };
  }

  console.log(
    `[PUT /api/cabinets/${cabinetId}] Incoming data:`,
    JSON.stringify(data, null, 2)
  );
  console.log(
    `[PUT /api/cabinets/${cabinetId}] Original cabinet status fields:`,
    {
      assetStatus: originalCabinet.assetStatus,
      machineStatus: originalCabinet.machineStatus,
    }
  );

  const updateFields = mapCabinetUpdateFields(data);

  const updatedMachine = await Machine.findOneAndUpdate(
    { _id: cabinetId },
    { $set: updateFields },
    { new: true }
  );

  console.log(
    `[PUT /api/cabinets/${cabinetId}] Updated machine status fields:`,
    {
      assetStatus: updatedMachine?.assetStatus,
      machineStatus: updatedMachine?.machineStatus,
    }
  );

  if (
    data.assetNumber &&
    data.assetNumber !== String(originalCabinet.serialNumber || '')
  ) {
    const serialUpdateResult = await Collections.updateMany(
      { machineId: cabinetId },
      { $set: { serialNumber: data.assetNumber } }
    );
    if (serialUpdateResult.modifiedCount === 0) {
      console.warn(
        `[PUT /cabinets/${cabinetId}] No collections updated for serialNumber cascade`
      );
    }
  }

  if (
    data.installedGame &&
    data.installedGame !== String(originalCabinet.game || '')
  ) {
    const gameUpdateResult = await Collections.updateMany(
      { machineId: cabinetId },
      { $set: { machineName: data.installedGame } }
    );
    if (gameUpdateResult.modifiedCount === 0) {
      console.warn(
        `[PUT /cabinets/${cabinetId}] No collections updated for machineName cascade`
      );
    }
  }

  const currentUser = await getUserFromServer();
  if (currentUser && currentUser.emailAddress && updatedMachine) {
    try {
      const changes = await buildCabinetActivityChanges(
        originalCabinet.toObject() as Record<string, unknown>,
        data as CabinetUpdatePayload
      );
      await logActivity({
        action: 'UPDATE',
        details: `Updated cabinet "${updatedMachine.serialNumber || cabinetId}"`,
        ipAddress: getClientIP(request) || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        userId: currentUser._id as string,
        username: currentUser.emailAddress as string,
        metadata: {
          resource: 'cabinet',
          resourceId: cabinetId,
          resourceName: updatedMachine.serialNumber || cabinetId,
          changes,
        },
      });
    } catch (logError) {
      console.error(
        '[PUT /cabinets/[cabinetId]] Failed to log activity:',
        logError
      );
    }
  }

  return { success: true, data: updatedMachine };
}

// ============================================================================
// PATCH: Restore Cabinet
// ============================================================================

export async function performCabinetRestore(
  cabinetId: string,
  currentUser: UserForLogging,
  request: NextRequest
): Promise<MutationResult> {
  const restored = await Machine.findOneAndUpdate(
    { _id: cabinetId },
    { $unset: { deletedAt: 1 }, $set: { updatedAt: new Date() } },
    { new: true }
  );

  if (!restored) {
    return { success: false, error: 'Cabinet not found for restore', status: 404 };
  }

  await logActivity({
    action: 'restore',
    details: `Restored machine "${restored.assetNumber || restored.serialNumber || cabinetId}"`,
    ipAddress: request.headers.get('x-forwarded-for') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    userId: currentUser._id,
    username: currentUser.emailAddress || '',
    metadata: {
      resource: 'machine',
      resourceId: cabinetId,
      resourceName:
        restored.assetNumber || restored.serialNumber || 'Unknown Machine',
    },
  });

  return { success: true, data: restored };
}

// ============================================================================
// PATCH: Standard Cabinet Update
// ============================================================================

export async function performCabinetPatch(
  cabinetId: string,
  data: Record<string, unknown>,
  currentUser: UserForLogging,
  request: NextRequest
): Promise<MutationResult> {
  const originalCabinet = await Machine.findOne({ _id: cabinetId });
  const updateFields = mapCabinetUpdateFields(data);

  console.log(
    `[PATCH /api/cabinets/${cabinetId}] Updating fields:`,
    updateFields
  );

  const patched = await Machine.findOneAndUpdate(
    { _id: cabinetId },
    { $set: updateFields },
    { new: true }
  );

  if (originalCabinet && currentUser.emailAddress) {
    try {
      const changes = await buildCabinetActivityChanges(
        originalCabinet.toObject() as Record<string, unknown>,
        data as CabinetUpdatePayload
      );
      await logActivity({
        action: 'UPDATE',
        details: `Updated cabinet "${patched?.serialNumber || cabinetId}"`,
        ipAddress: getClientIP(request) || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        userId: currentUser._id,
        username: currentUser.emailAddress,
        metadata: {
          resource: 'cabinet',
          resourceId: cabinetId,
          resourceName: patched?.serialNumber || cabinetId,
          changes,
        },
      });
    } catch (logError) {
      console.error(
        '[PATCH /cabinets/[cabinetId]] Failed to log activity:',
        logError
      );
    }
  }

  return { success: true, data: patched };
}

// ============================================================================
// DELETE: Hard & Soft Delete
// ============================================================================

export async function performCabinetDelete(
  cabinetId: string,
  hardDelete: boolean,
  canHardDelete: boolean,
  currentUser: UserForLogging | null,
  request: NextRequest
): Promise<MutationResult> {
  const machineToDelete = await Machine.findOne({ _id: cabinetId });
  if (!machineToDelete) {
    return { success: false, error: 'Cabinet not found', status: 404 };
  }

  if (hardDelete && canHardDelete) {
    const deleteResult = await Machine.deleteOne({ _id: cabinetId });
    if (deleteResult.deletedCount === 0) {
      return {
        success: false,
        error: 'Cabinet not found or already deleted',
        status: 404,
      };
    }
  } else {
    const softDeleted = await Machine.findOneAndUpdate(
      { _id: cabinetId },
      { $set: { deletedAt: new Date(), updatedAt: new Date() } }
    );
    if (!softDeleted) {
      return { success: false, error: 'Cabinet not found', status: 404 };
    }
  }

  if (currentUser && currentUser.emailAddress) {
    const changes = mapDeletedFieldsToChanges(
      machineToDelete.toObject
        ? machineToDelete.toObject()
        : machineToDelete
    );
    await logActivity({
      action: hardDelete && canHardDelete ? 'DELETE' : 'ARCHIVE',
      details: `${
        hardDelete && canHardDelete ? 'Permanently deleted' : 'Archived'
      } cabinet "${machineToDelete.serialNumber || machineToDelete.assetNumber || cabinetId}"`,
      ipAddress: getClientIP(request) || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      userId: currentUser._id,
      username: currentUser.emailAddress,
      metadata: {
        resource: 'cabinet',
        resourceId: cabinetId,
        resourceName:
          machineToDelete.serialNumber || machineToDelete.assetNumber,
        isHardDelete: hardDelete && canHardDelete,
        changes,
      },
    });
  }

  return { success: true, message: 'Deleted' };
}
