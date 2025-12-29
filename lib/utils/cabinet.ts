/**
 * Cabinet Utility Functions
 *
 * Utility functions for cabinet data transformation and mapping.
 *
 * Features:
 * - Cabinet data transformation
 * - Mapping cabinet objects to component props
 * - Default value handling
 * - Data normalization
 */

import type { GamingMachine as Cabinet } from '@/shared/types/entities';
type CabinetProps = Cabinet;

// ============================================================================
// Cabinet Mapping Functions
// ============================================================================
/**
 * Maps a Cabinet object to CabinetProps for component consumption
 * @param cabinet - Raw cabinet data from API
 * @returns Transformed cabinet props for UI components
 */
export function mapToCabinetProps(cabinet: Cabinet): CabinetProps {
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
    moneyOut: cabinet.moneyOut || 0,
    cancelledCredits: cabinet.cancelledCredits || cabinet.moneyOut || 0,
    gross:
      cabinet.gross ||
      (cabinet.moneyIn || cabinet.sasMeters?.drop || 0) -
        (cabinet.moneyOut || 0),
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
}

