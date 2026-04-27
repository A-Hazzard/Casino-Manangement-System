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
  netGross?: number;
  network?: string;
  lastActivity?: string | Date;
  customView?: boolean;
  cancelledCredits?: number;
  lastOnline?: string | Date;
  status?: string;
  online?: boolean;
  custom?: { name?: string };
  onEdit?: (cabinet: CabinetCardProps) => void;
  onDelete?: (cabinet: CabinetCardProps) => void;
  canEditMachines?: boolean;
  canDeleteMachines?: boolean;
  timePeriod?: string;
  offlineTimeLabel?: string;
  actualOfflineTime?: string;
  hideFinancials?: boolean;
  includeJackpot?: boolean;
  deletedAt?: string | Date;
};


