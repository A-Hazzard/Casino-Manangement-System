import { SasMeters } from "@/lib/types/mongo";

// SmibConfig type for cabinet details
export type SmibConfig = {
  net?: {
    netMode?: number;
    netStaSSID?: string;
    netStaPwd?: string;
    netStaChan?: number;
  };
  mqtt?: {
    mqttSecure?: number;
    mqttQOS?: number;
    mqttURI?: string;
    mqttSubTopic?: string;
    mqttPubTopic?: string;
    mqttCfgTopic?: string;
    mqttIdleTimeS?: number;
  };
  coms?: {
    comsAddr?: number;
    comsMode?: number;
    comsRateMs?: number;
    comsRTE?: number;
    comsGPC?: number;
  };
};

// Base Cabinet Props - consolidated definition
export type Cabinet = {
  _id: string;
  assetNumber?: string;
  serialNumber?: string;
  smbId?: string; // Alias for smibBoard for UI convenience
  relayId?: string;
  smibBoard?: string;
  lastActivity?: string | Date;
  lastOnline?: string | Date;
  game?: string;
  installedGame?: string; // Alias for game for UI convenience
  cabinetType?: string;
  assetStatus?: string;
  status?: string; // Alias for assetStatus for UI convenience
  gamingLocation?: string | Record<string, unknown>;
  accountingDenomination?: string | number;
  collectionMultiplier?: string;
  gameType?: string;
  isCronosMachine?: boolean;
  moneyIn?: number;
  moneyOut?: number;
  jackpot?: number;
  cancelledCredits?: number;
  gross?: number;
  sasMeters?: SasMeters;
  online?: boolean;
  meterData?: {
    _id?: string;
    machine?: string;
    location?: string;
    locationSession?: string;
    readAt?: string | Date;
    movement?: {
      drop?: number;
      totalCancelledCredits?: number;
      gamesPlayed?: number;
      jackpot?: number;
      coinIn?: number;
      coinOut?: number;
      gamesWon?: number;
    };
    coinIn?: number;
    coinOut?: number;
    totalCancelledCredits?: number;
    totalHandPaidCancelledCredits?: number;
    totalWonCredits?: number;
    drop?: number;
    jackpot?: number;
    currentCredits?: number;
    gamesPlayed?: number;
    gamesWon?: number;
    createdAt?: string | Date;
    updatedAt?: string | Date;
  } | null;
  calculatedMetrics?: {
    moneyIn: number;
    moneyOut: number;
    jackpot: number;
    cancelledCredits: number;
    gamesPlayed: number;
    gamesWon: number;
  };
  gameConfig?: {
    accountingDenomination?: number;
    theoreticalRtp?: number;
    maxBet?: string;
    payTableId?: string;
  };
  smibVersion?: {
    firmware?: string;
    version?: string;
  };
  smibConfig?: SmibConfig;
  collectionMeters?: {
    metersIn?: number;
    metersOut?: number;
  };
  collectionTime?: string | Date;
  collectionMetersHistory?: Array<{
    metersIn?: number;
    metersOut?: number;
    timestamp?: string;
    _id?: string;
  }>;
  deletedAt?: string | Date | null;
  locationId?: string;
  locationName?: string;
};

export type CabinetFormData = {
  id: string;
  location: string;
  assetNumber: string;
  smbId: string;
  installedGame: string;
  accountingDenomination: string;
  collectionMultiplier: string;
  status: string;
};

export type NewCabinetFormData = {
  serialNumber: string;
  game: string;
  gameType: string;
  isCronosMachine: boolean;
  accountingDenomination: string;
  cabinetType: string;
  assetStatus: string;
  gamingLocation: string;
  smibBoard: string;
  collectionSettings: {
    multiplier?: string;
    lastCollectionTime: string;
    lastMetersIn: string;
    lastMetersOut: string;
  };
};

// Type for the cabinet detail page
export type CabinetDetail = Partial<Cabinet> & {
  _id: string;
};

// Type for the edit form
export type CabinetEditFormData = {
  assetNumber?: string;
  relayId?: string;
  serialNumber?: string;
  game?: string;
  cabinetType?: string;
  gamingLocation?: string;
  assetStatus?: string;
  // Add other editable fields here
};

// Type for cabinet table sort options
export type CabinetSortOption =
  | "assetNumber"
  | "locationName"
  | "moneyIn"
  | "moneyOut"
  | "jackpot"
  | "gross"
  | "cancelledCredits"
  | "game"
  | "smbId"
  | "serialNumber"
  | "lastOnline";

// Type for cabinet table props
export type CabinetTableProps = {
  cabinets: CabinetProps[];
  sortOption: CabinetSortOption;
  sortOrder: "asc" | "desc";
  onColumnSort: (_col: CabinetSortOption) => void;
  onEdit: (_cabinet: CabinetProps) => void;
  onDelete: (_cabinet: CabinetProps) => void;
  handleSortToggle?: () => void;
  handleColumnSort?: (_col: CabinetSortOption) => void;
  handleCabinetClick?: (cabinetId: string) => void;
};

// Extended Cabinet Props for operations
export type CabinetProps = Cabinet & {
  onEdit: (cabinet: Cabinet) => void;
  onDelete: (cabinet: Cabinet) => void;
};

// Store types
export type CabinetActionsState = {
  selectedCabinet: Cabinet | null;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  openEditModal: (_cabinet: Cabinet) => void;
  openDeleteModal: (_cabinet: Cabinet) => void;
  closeEditModal: () => void;
  closeDeleteModal: () => void;
};

export type NewCabinetState = {
  isCabinetModalOpen: boolean;
  openCabinetModal: () => void;
  closeCabinetModal: () => void;
};

// API specific types
export type CabinetMatchStage = {
  deletedAt: { $in: (Date | null)[] };
  "rel.licencee"?: string;
  locationName?: string;
  assetNumber?: string;
  smbId?: string;
  _id?: string;
};

// Time periods for metrics
export type TimePeriod =
  | "Today"
  | "Yesterday"
  | "last7days"
  | "7d"
  | "last30days"
  | "30d"
  | "Custom";

/**
 * Represents a cabinet/machine with meter data as returned by /api/locations/[slug]
 */
export type CabinetWithMeters = {
  _id: string;
  locationId: string;
  locationName: string;
  assetNumber: string;
  serialNumber: string;
  game: string;
  lastActivity: string | null;
  lastOnline: string | null;
  cabinetType: string;
  assetStatus: string;
  status: string;
  moneyIn: number;
  moneyOut: number;
  jackpot: number;
  cancelledCredits: number;
  gross: number;
  metersData?: {
    readAt?: string;
    movement?: Record<string, unknown>;
  } | null;
  sasMeters?: Record<string, unknown> | null;
  smbId?: string;
};
