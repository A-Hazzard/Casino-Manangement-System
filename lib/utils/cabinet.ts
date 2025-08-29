/**
 * Cabinet utility functions for data transformation and mapping
 */

import type { Cabinet, CabinetProps } from "@/lib/types/cabinets";

/**
 * Maps a Cabinet object to CabinetProps for component consumption
 * @param cabinet - Raw cabinet data from API
 * @param handlers - Optional event handlers for edit/delete actions
 * @returns Transformed cabinet props for UI components
 */
export function mapToCabinetProps(
  cabinet: Cabinet,
  handlers?: {
    onEdit?: (cabinet: Cabinet) => void;
    onDelete?: (cabinet: Cabinet) => void;
  }
): CabinetProps {
  return {
    _id: cabinet._id,
    locationId: cabinet.locationId || "",
    locationName: cabinet.locationName || "",
    assetNumber: cabinet.assetNumber || "",
    smbId: cabinet.smbId || cabinet.smibBoard || cabinet.relayId || "",
    moneyIn: cabinet.moneyIn || cabinet.sasMeters?.drop || 0,
    moneyOut: cabinet.moneyOut || 0,
    gross:
      cabinet.gross ||
      (cabinet.moneyIn || cabinet.sasMeters?.drop || 0) -
        (cabinet.moneyOut || 0),
    jackpot: cabinet.jackpot || cabinet.sasMeters?.jackpot || 0,
    lastOnline: cabinet.lastOnline
      ? cabinet.lastOnline.toString()
      : cabinet.lastActivity
      ? cabinet.lastActivity.toString()
      : "",
    installedGame: cabinet.installedGame || cabinet.game || "",
    accountingDenomination:
      cabinet.accountingDenomination ||
      cabinet.gameConfig?.accountingDenomination?.toString() ||
      "",
    collectionMultiplier: cabinet.collectionMultiplier || "",
    status: cabinet.status || cabinet.assetStatus || "",
    gameType: cabinet.gameType,
    isCronosMachine: cabinet.isCronosMachine,
    cabinetType: cabinet.cabinetType,
    onEdit: handlers?.onEdit ? () => handlers.onEdit!(cabinet) : () => {},
    onDelete: handlers?.onDelete ? () => handlers.onDelete!(cabinet) : () => {},
  };
}

/**
 * Transforms an array of cabinets to cabinet props
 * @param cabinets - Array of cabinet objects
 * @param handlers - Optional event handlers for edit/delete actions
 * @returns Array of transformed cabinet props
 */
export function transformCabinetsToProps(
  cabinets: Cabinet[],
  handlers?: {
    onEdit?: (cabinet: Cabinet) => void;
    onDelete?: (cabinet: Cabinet) => void;
  }
): CabinetProps[] {
  return cabinets.map(cabinet => mapToCabinetProps(cabinet, handlers));
}
