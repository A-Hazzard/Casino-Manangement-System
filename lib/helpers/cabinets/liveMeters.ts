import type { GamingMachine } from '@shared/types/entities';

type CabinetLiveMeterField =
  | 'drop'
  | 'jackpot'
  | 'totalCancelledCredits'
  | 'totalWonCredits'
  | 'coinIn'
  | 'coinOut'
  | 'currentCredits'
  | 'gamesPlayed'
  | 'gamesWon';

export type CabinetLiveMeterValues = {
  drop: number;
  jackpot: number;
  totalCancelledCredits: number;
  totalWonCredits: number;
  coinIn: number;
  coinOut: number;
  currentCredits: number;
  gamesPlayed: number;
  gamesWon: number;
};

function readMeterField(
  cabinet: GamingMachine,
  field: CabinetLiveMeterField
): number | undefined {
  const sasValue = cabinet.sasMeters?.[field];
  if (typeof sasValue === 'number') {
    return sasValue;
  }

  const meterData = cabinet.meterData;
  if (!meterData) {
    return undefined;
  }

  const flatValue = meterData[field];
  if (typeof flatValue === 'number') {
    return flatValue;
  }

  const movementValue = meterData.movement?.[field];
  if (typeof movementValue === 'number') {
    return movementValue;
  }

  return undefined;
}

function resolveNumber(
  value: number | undefined,
  fallback: number | undefined = 0
): number {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  return fallback ?? 0;
}

export function getCabinetLiveMeterValues(
  cabinet: GamingMachine
): CabinetLiveMeterValues {
  return {
    drop: resolveNumber(readMeterField(cabinet, 'drop')),
    jackpot: resolveNumber(
      readMeterField(cabinet, 'jackpot'),
      cabinet.jackpot
    ),
    totalCancelledCredits: resolveNumber(
      readMeterField(cabinet, 'totalCancelledCredits'),
      cabinet.cancelledCredits
    ),
    totalWonCredits: resolveNumber(readMeterField(cabinet, 'totalWonCredits')),
    coinIn: resolveNumber(readMeterField(cabinet, 'coinIn'), cabinet.coinIn),
    coinOut: resolveNumber(readMeterField(cabinet, 'coinOut'), cabinet.coinOut),
    currentCredits: resolveNumber(readMeterField(cabinet, 'currentCredits')),
    gamesPlayed: resolveNumber(
      readMeterField(cabinet, 'gamesPlayed'),
      cabinet.gamesPlayed
    ),
    gamesWon: resolveNumber(
      readMeterField(cabinet, 'gamesWon'),
      cabinet.gamesWon
    ),
  };
}
