// Component utility functions for layouts
import { Cabinet, CabinetProps } from "@/lib/types/cabinets";

/**
 * Formats metric numbers for display
 */
export const formatMetricNumber = (
  value: number | undefined | null
): string => {
  if (value === undefined || value === null) return "--";
  return new Intl.NumberFormat().format(value);
};

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

  return { x, y, textAnchor: x > cx ? "start" : "end" };
};

/**
 * Converts a Cabinet object to CabinetProps for rendering
 */
export const mapToCabinetProps = (
  cabinet: Cabinet,
  onEditHandler: (cabinet: Cabinet) => void,
  onDeleteHandler: (cabinet: Cabinet) => void
): CabinetProps => {
  return {
    _id: cabinet._id,
    locationId: cabinet.locationId || "",
    locationName: cabinet.locationName || "",
    assetNumber: cabinet.assetNumber || "",
    smbId: cabinet.smbId || cabinet.smibBoard || cabinet.relayId || "",
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
    onEdit: () => onEditHandler(cabinet),
    onDelete: () => onDeleteHandler(cabinet),
  };
};
