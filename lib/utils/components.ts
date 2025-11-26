/**
 * Component Utility Functions
 *
 * Utility functions for component layouts and data formatting.
 *
 * Features:
 * - Metric number formatting
 * - Pie chart label positioning
 * - Cabinet data mapping
 * - Component prop transformations
 */

import { GamingMachine as Cabinet } from '@/shared/types/entities';
type CabinetProps = Cabinet;

// ============================================================================
// Formatting Functions
// ============================================================================
/**
 * Formats metric numbers for display
 */
export const formatMetricNumber = (
  value: number | undefined | null
): string => {
  if (value === undefined || value === null) return '--';
  return new Intl.NumberFormat().format(value);
};

// ============================================================================
// Chart Utilities
// ============================================================================
/**
 * Pie chart rendering helper - calculates coordinates for labels
 */
export const calculatePieChartLabelPosition = (
  cx: number,
  cy: number,
  midAngle: number,
  innerRadius: number,
  outerRadius: number
) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return { x, y, textAnchor: x > cx ? 'start' : 'end' };
};

// ============================================================================
// Cabinet Mapping Functions
// ============================================================================
/**
 * Converts a Cabinet object to CabinetProps for rendering
 */
export const mapToCabinetProps = (cabinet: Cabinet): CabinetProps => {
  return {
    _id: cabinet._id,
    serialNumber: cabinet.serialNumber || '',
    relayId: cabinet.relayId || '',
    game: cabinet.game || cabinet.installedGame || '',
    assetStatus: cabinet.assetStatus || cabinet.status || '',
    gamingLocation: cabinet.gamingLocation || cabinet.locationId || '',
    accountingDenomination:
      cabinet.accountingDenomination ||
      cabinet.gameConfig?.accountingDenomination ||
      '',
    createdAt: cabinet.createdAt || new Date(),
    updatedAt: cabinet.updatedAt || new Date(),
    // Optional fields with defaults
    locationId: cabinet.locationId || '',
    locationName: cabinet.locationName || '',
    assetNumber: cabinet.assetNumber || '',
    smbId: cabinet.smbId || cabinet.smibBoard || cabinet.relayId || '',
    moneyIn: cabinet.moneyIn || cabinet.sasMeters?.drop || 0,
    moneyOut: cabinet.moneyOut || cabinet.sasMeters?.totalCancelledCredits || 0,
    gross:
      cabinet.gross ||
      (cabinet.moneyIn || cabinet.sasMeters?.drop || 0) -
        (cabinet.moneyOut || cabinet.sasMeters?.totalCancelledCredits || 0),
    jackpot: cabinet.jackpot || cabinet.sasMeters?.jackpot || 0,
    lastOnline: cabinet.lastOnline
      ? cabinet.lastOnline.toString()
      : cabinet.lastActivity
        ? cabinet.lastActivity.toString()
        : '',
    installedGame: cabinet.installedGame || cabinet.game || '',
    collectionMultiplier: cabinet.collectionMultiplier || '',
    status: cabinet.status || cabinet.assetStatus || '',
    gameType: cabinet.gameType || '',
    isCronosMachine: cabinet.isCronosMachine || false,
    cabinetType: cabinet.cabinetType || '',
    custom: { name: cabinet.serialNumber || cabinet._id || 'Unknown' },
  };
};
