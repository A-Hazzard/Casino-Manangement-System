/**
 * Cabinet Edit Comparison Snapshot Utilities
 *
 * Normalizes cabinet form/cabinet data into a consistent shape for change detection
 * and builds minimal update payloads from detected changes.
 */

import type { ChangeItem } from '@/lib/utils/changeDetection';
import { normalizeGameTypeValue, normalizeStatusValue } from './normalization';

export type CabinetEditFormLike = {
  assetNumber?: string;
  installedGame?: string;
  gameType?: string;
  otherGameType?: string;
  accountingDenomination?: string | number;
  collectionMultiplier?: string | number;
  locationId?: string;
  smbId?: string;
  relayId?: string;
  status?: string;
  assetStatus?: string;
  isCronosMachine?: boolean;
  manufacturer?: string;
  custom?: { name?: string };
  cabinetType?: string;
  collectionTime?: string | Date;
  collectionSettings?: {
    multiplier?: string;
    lastCollectionTime?: string;
    lastMetersIn?: string;
    lastMetersOut?: string;
  };
  collectionMeters?: { metersIn?: number; metersOut?: number };
  sasMeters?: { drop?: number; totalCancelledCredits?: number };
};

export type CabinetEditComparisonSnapshot = {
  assetNumber: string;
  installedGame: string;
  gameType: string;
  accountingDenomination: string;
  collectionMultiplier: string;
  locationId: string;
  smbId: string;
  status: 'functional' | 'non_functional';
  isCronosMachine: boolean;
  manufacturer: string;
  custom: { name: string };
  cabinetType: string;
  collectionSettings: {
    lastCollectionTime: string;
    lastMetersIn: string;
    lastMetersOut: string;
  };
};

export function resolveCabinetMeterStrings(source: CabinetEditFormLike): {
  lastMetersIn: string;
  lastMetersOut: string;
} {
  if (source.collectionSettings?.lastMetersIn !== undefined) {
    return {
      lastMetersIn: String(source.collectionSettings.lastMetersIn),
      lastMetersOut: String(source.collectionSettings.lastMetersOut ?? '0'),
    };
  }

  const sasDrop = source.sasMeters?.drop;
  const sasOut = source.sasMeters?.totalCancelledCredits;

  const lastMetersIn =
    sasDrop != null && sasDrop > 0
      ? String(sasDrop)
      : source.collectionMeters?.metersIn !== undefined
        ? String(source.collectionMeters.metersIn)
        : '0';

  const lastMetersOut =
    sasOut != null && sasOut > 0
      ? String(sasOut)
      : source.collectionMeters?.metersOut !== undefined
        ? String(source.collectionMeters.metersOut)
        : '0';

  return { lastMetersIn, lastMetersOut };
}

export function normalizeComparisonGameType(
  gameType?: string,
  otherGameType?: string
): string {
  const raw =
    gameType === 'other' ? otherGameType || '' : gameType || '';
  const normalized = raw.toLowerCase().trim();
  return normalized || 'slot';
}

export function buildCabinetEditComparisonSnapshot(
  source: CabinetEditFormLike,
  options?: { collectionTimeIso?: string }
): CabinetEditComparisonSnapshot {
  const meters = resolveCabinetMeterStrings(source);
  const collectionTimeIso =
    source.collectionSettings?.lastCollectionTime ||
    options?.collectionTimeIso ||
    (source.collectionTime
      ? new Date(source.collectionTime).toISOString()
      : '');

  return {
    assetNumber: source.assetNumber || '',
    installedGame: source.installedGame || '',
    gameType: normalizeComparisonGameType(
      source.gameType,
      source.otherGameType
    ),
    accountingDenomination: String(source.accountingDenomination ?? '1'),
    collectionMultiplier: String(
      source.collectionSettings?.multiplier ??
        source.collectionMultiplier ??
        '1'
    ),
    locationId: source.locationId || '',
    smbId: source.smbId || source.relayId || '',
    status: normalizeStatusValue(source.assetStatus || source.status),
    isCronosMachine: source.isCronosMachine ?? false,
    manufacturer: source.manufacturer || '',
    custom: { name: source.custom?.name || '' },
    cabinetType: source.cabinetType || 'Standing',
    collectionSettings: {
      lastCollectionTime: collectionTimeIso,
      lastMetersIn: meters.lastMetersIn,
      lastMetersOut: meters.lastMetersOut,
    },
  };
}

export function mergeComparisonBaseline(
  currentBaseline: CabinetEditComparisonSnapshot | null,
  freshSnapshot: CabinetEditComparisonSnapshot,
  modifiedFields: Set<string>
): CabinetEditComparisonSnapshot {
  if (!currentBaseline) {
    return freshSnapshot;
  }

  const merged: CabinetEditComparisonSnapshot = { ...currentBaseline };

  const topLevelKeys = [
    'assetNumber',
    'installedGame',
    'gameType',
    'accountingDenomination',
    'collectionMultiplier',
    'locationId',
    'smbId',
    'status',
    'isCronosMachine',
    'manufacturer',
    'cabinetType',
  ] as const;

  for (const key of topLevelKeys) {
    if (!modifiedFields.has(key)) {
      (merged as Record<string, unknown>)[key] = freshSnapshot[key];
    }
  }

  if (!modifiedFields.has('custom')) {
    merged.custom = freshSnapshot.custom;
  }

  if (!modifiedFields.has('collectionSettings')) {
    merged.collectionSettings = freshSnapshot.collectionSettings;
  }

  return merged;
}

export function buildCabinetEditUpdatePayload(
  meaningfulChanges: ChangeItem[],
  formData: CabinetEditFormLike & { _id?: string }
): Record<string, unknown> {
  const updatePayload: Record<string, unknown> = { _id: formData._id };

  for (const change of meaningfulChanges) {
    const fieldPath = change.path;

    if (fieldPath === 'custom.name') {
      updatePayload.custom = { name: formData.custom?.name || '' };
      continue;
    }

    if (fieldPath === 'collectionSettings.lastMetersIn') {
      const existingMeters = (updatePayload.collectionMeters ||
        {}) as Record<string, number>;
      existingMeters.metersIn =
        Number(formData.collectionSettings?.lastMetersIn) || 0;
      updatePayload.collectionMeters = existingMeters;
      continue;
    }

    if (fieldPath === 'collectionSettings.lastMetersOut') {
      const existingMeters = (updatePayload.collectionMeters ||
        {}) as Record<string, number>;
      existingMeters.metersOut =
        Number(formData.collectionSettings?.lastMetersOut) || 0;
      updatePayload.collectionMeters = existingMeters;
      continue;
    }

    if (fieldPath === 'collectionSettings.lastCollectionTime') {
      updatePayload.collectionTime =
        formData.collectionSettings?.lastCollectionTime ||
        formData.collectionTime;
      continue;
    }

    if (fieldPath === 'gameType') {
      updatePayload.gameType = normalizeComparisonGameType(
        formData.gameType,
        formData.otherGameType
      );
      continue;
    }

    if (!fieldPath.includes('.')) {
      if (fieldPath === 'collectionMultiplier') {
        updatePayload.collectionMultiplier = String(
          formData.collectionSettings?.multiplier ??
            formData.collectionMultiplier ??
            '1'
        );
      } else {
        updatePayload[fieldPath] =
          formData[fieldPath as keyof CabinetEditFormLike];
      }
    }
  }

  return updatePayload;
}

export function resolveOtherGameTypeFromCabinet(gameType?: string): string {
  const normalized = normalizeGameTypeValue(gameType);
  return !['slot', 'roulette', 'pulse'].includes(normalized)
    ? gameType || ''
    : '';
}
