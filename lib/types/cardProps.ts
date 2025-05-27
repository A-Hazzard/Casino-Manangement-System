/**
 * Type definition for Cabinet Card Props used in the CabinetCard component
 */
export type CabinetCardProps = {
  _id: string;
  assetNumber?: string;
  serialNumber?: string;
  smbId?: string;
  locationId?: string;
  locationName?: string;
  game?: string;
  installedGame?: string;
  moneyIn?: number;
  moneyOut?: number;
  jackpot?: number;
  gross?: number;
  lastActivity?: string | Date;
  customView?: boolean;
  cancelledCredits?: number;
  lastOnline?: string | Date;
  status?: string;
  online?: boolean;
  onEdit?: (cabinet: CabinetCardProps) => void;
  onDelete?: (cabinet: CabinetCardProps) => void;
};

/**
 * Type definition for Location Card Props used in the LocationCard component
 */
export type LocationCardProps = {
  _id: string;
  name: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  totalMachines: number;
  onlineMachines: number;
  hasSmib: boolean;
  onEdit: (_locationId: string) => void;
  onDelete: (_locationId: string) => void;
  online?: boolean;
};
