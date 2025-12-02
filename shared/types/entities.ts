// Shared entity types used across frontend and backend
import { Types } from 'mongoose';
import type { SasMeters } from './common';
import type {
  BillValidatorData,
  CollectionMetersHistoryEntry,
  MeterData,
} from './database';

// Location types
export type Location = {
  _id: string;
  locationName: string;
  name?: string;
  country: string;
  address?: Address;
  rel?: RelationshipInfo;
  profitShare: number;
  isLocalServer?: boolean;
  geoCoords?: GeoCoordinates;
  billValidatorOptions?: number[];
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  moneyIn?: number;
  moneyOut?: number;
  gross?: number;
  totalMachines?: number;
  onlineMachines?: number;
  hasSmib?: boolean;
  noSMIBLocation?: boolean;
};

export type Address = {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  [key: string]: string | undefined;
};

export type RelationshipInfo = {
  licencee?: string[];
  [key: string]: string | string[] | undefined;
};

export type GeoCoordinates = {
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  [key: string]: number | undefined;
};

export type AggregatedLocation = {
  location: string;
  locationName: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  coinIn: number;
  coinOut: number;
  jackpot: number;
  totalMachines: number;
  onlineMachines: number;
  sasMachines: number;
  nonSasMachines: number;
  hasSasMachines: boolean;
  hasNonSasMachines: boolean;
  isLocalServer: boolean;
  noSMIBLocation: boolean;
  hasSmib: boolean;
  gamesPlayed: number;
  rel?: { licencee?: string | null }; // For currency conversion
  country?: string; // For currency conversion
  totalDrop?: number; // Alias for moneyIn in some contexts
};

// Location metrics for reports and analytics
export type LocationMetrics = {
  totalGross: number;
  totalDrop: number;
  totalCancelledCredits: number;
  onlineMachines: number;
  totalMachines: number;
};

// Top location for dashboard and reports
export type TopLocation = {
  locationId: string;
  locationName: string;
  gross: number;
  drop: number;
  cancelledCredits: number;
  onlineMachines: number;
  totalMachines: number;
  performance: 'excellent' | 'good' | 'average' | 'poor';
  sasEnabled: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
  // Additional fields for the new card design
  holdPercentage: number;
};

// Unified Gaming Machine type - consolidates Machine and Cabinet types
export type GamingMachine = {
  _id: string;
  // Core identification fields
  serialNumber: string;
  origSerialNumber?: string; // Original serial number from system
  assetNumber?: string;
  machineId?: string;
  relayId: string;
  smbId?: string; // Alias for smibBoard for UI convenience
  smibBoard?: string;
  custom: { name: string }; // Custom name for machines - required field

  // Game information
  game: string;
  installedGame?: string; // Alias for game for UI convenience
  gameType: string;
  isCronosMachine: boolean;
  gameNumber?: string;

  // Physical characteristics
  cabinetType: string;
  assetStatus: string;
  status?: string; // Alias for assetStatus for UI convenience
  manufacturer?: string;
  manuf?: string; // Alternative manufacturer field

  // Location and configuration
  gamingLocation: string;
  gamingBoard?: string;
  accountingDenomination: number | string;
  collectionMultiplier?: string;

  // Activity and status
  lastActivity?: Date | string;
  lastOnline?: string | Date;
  loggedIn?: boolean;
  online?: boolean;

  // Financial metrics (from aggregation)
  moneyIn?: number;
  moneyOut?: number;
  jackpot?: number;
  cancelledCredits?: number;
  gross?: number;
  coinIn?: number;
  coinOut?: number;
  gamesPlayed?: number;
  gamesWon?: number;
  handle?: number; // Same as coinIn for betting activity

  // SAS and meter data
  sasMeters?: SasMeters;
  meterData?: MeterData | null;
  calculatedMetrics?: {
    moneyIn: number;
    moneyOut: number;
    jackpot: number;
    cancelledCredits: number;
    gamesPlayed: number;
    gamesWon: number;
  };

  // Configuration objects
  gameConfig?: {
    accountingDenomination?: number;
    theoreticalRtp?: number;
    maxBet?: string;
    payTableId?: string;
    additionalId?: string;
    gameOptions?: string;
    progressiveGroup?: string;
  };

  smibVersion?: {
    firmware?: string;
    version?: string;
  };

  smibConfig?: SmibConfig;

  // Collection and bill validator data
  collectionMeters?: {
    metersIn: number;
    metersOut: number;
  };
  collectionTime?: string | Date;
  previousCollectionTime?: Date;
  collectorDenomination?: number;
  collectionMetersHistory?: CollectionMetersHistoryEntry[];

  billValidator?: BillValidatorData;
  billMeters?: {
    dollar1?: number;
    dollar2?: number;
    dollar5?: number;
    dollar10?: number;
    dollar20?: number;
    dollar50?: number;
    dollar100?: number;
    dollar500?: number;
    dollar1000?: number;
    dollar2000?: number;
    dollar5000?: number;
    dollarTotal?: number;
    dollarTotalUnknown?: number;
  };

  // Machine settings and features
  machineMembershipSettings?: {
    isPointsAllowed: boolean;
    isFreePlayAllowed: boolean;
    pointsAwardMethod: string;
    freePlayAmount: number;
    freePlayCreditsTimeout: number;
  };

  // Credits and balances
  nonRestricted?: number;
  restricted?: number;
  uaccount?: number; // User account balance
  playableBalance?: number;

  // SAS protocol and protocols
  sasVersion?: string;
  isSasMachine?: boolean;
  protocols?: Array<{ protocol: string; version: string }>;

  // Game management
  numberOfEnabledGames?: number;
  enabledGameNumbers?: string[];
  noOfGames?: number;

  // Maintenance and history
  machineType?: string;
  machineStatus?: string;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  maintenanceHistory?: Array<{
    date: Date;
    description: string;
    performedBy: string;
  }>;

  sessionHistory?: Array<{
    gamingLocation: string;
    date: Date;
    reason: string;
    performedBy: string;
    _id: string;
  }>;
  currentSession?: string;

  // Viewing account denomination
  viewingAccountDenomination?: Array<{
    asOf: Date;
    denomination: number;
    meters: string[];
    user: { role: string };
  }>;
  viewingAccountDenominationHistory?: Array<{
    asOf: Date;
    denomination: number;
    meters: string[];
    user: { role: string };
  }>;
  selectedDenomination?: {
    drop: number;
    totalCancelledCredits: number;
  };

  // Additional fields
  isSunBoxDevice?: boolean;
  lastBillMeterAt?: Date;
  lastSasMeterAt?: Date;
  operationsWhileIdle?: { extendedMeters: Date };

  // Timestamps
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;

  // Frontend-specific fields
  locationId?: string;
  locationName?: string;
  gameDayOffset?: number;
};

// Legacy type aliases for backward compatibility
export type Machine = GamingMachine;
export type Cabinet = GamingMachine;
export type MachineDocument = GamingMachine;

export type SmibConfig = {
  net?: {
    netMode?: number;
    netStaSSID?: string;
    netStaPwd?: string;
    netStaChan?: number;
    updatedAt?: Date;
  };
  mqtt?: {
    mqttSecure?: number;
    mqttQOS?: number;
    mqttURI?: string;
    mqttSubTopic?: string;
    mqttPubTopic?: string;
    mqttCfgTopic?: string;
    mqttIdleTimeS?: number;
    mqttUsername?: string;
    mqttPassword?: string;
    updatedAt?: Date;
  };
  coms?: {
    comsAddr?: number;
    comsMode?: number;
    comsRateMs?: number;
    comsRTE?: number;
    comsGPC?: number;
    updatedAt?: Date;
  };
  ota?: {
    otaURL?: string;
    updatedAt?: Date;
    firmwareUpdatedAt?: Date;
  };
};

// SMIB Discovery and Status types
export type SmibDevice = {
  relayId: string;
  machineId: string;
  serialNumber?: string;
  game?: string;
  locationName?: string;
  locationId?: string;
  online?: boolean;
  lastSeen?: Date | string | null;
};

export type SmibOnlineStatus = {
  online: boolean;
  lastSeen?: Date;
  heartbeat?: Date;
};

// Unified User types - consolidates User from models and UserDocument from API types
export type User = {
  _id: string;
  name: string;
  username: string;
  email: string;
  emailAddress: string; // Added for API compatibility
  enabled: boolean;
  isEnabled: boolean; // Added for API compatibility
  roles: string[];
  profilePicture: string | null;
  assignedLocations?: string[]; // Array of location IDs user has access to
  assignedLicensees?: string[]; // Array of licensee IDs user has access to
  password?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    otherName?: string;
    gender?: string;
    address?: {
      street?: string;
      town?: string;
      region?: string;
      country?: string;
      postalCode?: string;
    };
    identification?: {
      dateOfBirth?: string;
      idType?: string;
      idNumber?: string;
      notes?: string;
    };
  };
  // Additional fields from UserDocument
  isLocked?: boolean;
  lockedUntil?: Date | string;
  failedLoginAttempts?: number;
  lastLoginAt?: Date | string;
  loginCount?: number;
  sessionVersion?: number;
  deletedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

// Casino Member type - extends User for casino-specific functionality
export type CasinoMember = {
  _id: string;
  memberId: string;
  username: string;
  user: string; // Reference to User _id
  gamingLocation: string;
  locationName?: string;
  accountLocked: boolean;
  areaCode?: string;
  authType: number;
  createdAt: Date | string;
  currentSession: string;
  deletedAt: Date | string | null;
  endBillMeters?: BillMetersData;
  endMeters?: MetersData;
  endTime?: Date | string | null;
  freePlayAwardId: number;
  gameName: string;
  gamesPlayed: number;
  gamesWon: number;
  intermediateMeters?: MetersData;
  lastLogin?: Date | string;
  lastPwUpdatedAt?: Date | string | null;
  lastfplAwardAt?: Date | string;
  locationMembershipSettings?: LocationMembershipSettings;
  loggedIn: boolean;
  machineId: string;
  machineSerialNumber: string;
  nonRestricted: number;
  numFailedLoginAttempts: number;
  phoneNumber?: string;
  pin: string;
  points: number;
  profile: {
    indentification: {
      number: string;
      type: string;
    };
    firstName: string;
    lastName: string;
    gender: string;
    dob: string;
    email?: string;
    address: string;
    occupation: string;
  };
  relayId: string;
  restricted: number;
  smsCode?: number;
  smsCodeTime?: Date | string | null;
  startBillMeters?: BillMetersData;
  startMeters?: MetersData;
  startTime?: Date | string | null;
  status: string;
  uaccount: number; // Account balance
  ucardId: string;
  ulock: number;
  upassFull: number;
  updatedAt: Date | string;
  utype: number;
  uvalid: number;
  // Calculated fields for frontend
  winLoss?: number;
  totalMoneyIn?: number;
  totalMoneyOut?: number;
  sessions?: MemberSession[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalSessions: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

// Licensee types
export type Licensee = {
  _id: string;
  name: string;
  description?: string;
  country: string;
  countryName?: string;
  startDate?: Date | string;
  expiryDate?: Date | string;
  prevStartDate?: Date | string;
  prevExpiryDate?: Date | string;
  isPaid?: boolean;
  lastEdited?: Date | string;
  deletedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  geoCoords?: {
    latitude?: number;
    longitude?: number;
    zoomRatio?: number;
  };
};

// Country types
export type Country = {
  _id: string;
  name: string;
  alpha2: string;
  alpha3: string;
  isoNumeric: string;
  createdAt: string;
  updatedAt: string;
};

// Firmware types
export type Firmware = {
  _id: string;
  product: string;
  version: string;
  versionDetails: string;
  fileId: Types.ObjectId;
  fileName: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

// Movement request types
export type MovementRequest = {
  _id: string;
  variance: number;
  previousBalance: number;
  currentBalance: number;
  amountToCollect: number;
  amountCollected: number;
  amountUncollected: number;
  partnerProfit: number;
  taxes: number;
  advance: number;
  locationName: string;
  locationFrom: string;
  locationTo: string;
  locationId: string;
  createdBy: string;
  movementType: string;
  installationType: string;
  reason: string;
  requestTo: string;
  cabinetIn: string;
  status: MovementRequestStatus;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
  approvedBy?: string;
  approvedBySecond?: string;
};

export type MovementRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'in progress';

// Supporting types for CasinoMember and GamingMachine
export type MetersData = {
  _id?: string;
  machine?: string;
  location?: string;
  movement?: {
    coinIn?: number;
    coinOut?: number;
    jackpot?: number;
    totalHandPaidCancelledCredits?: number;
    totalCancelledCredits?: number;
    gamesPlayed?: number;
    gamesWon?: number;
    currentCredits?: number;
    totalWonCredits?: number;
    drop?: number;
  };
  coinIn?: number;
  coinOut?: number;
  jackpot?: number;
  totalHandPaidCancelledCredits?: number;
  totalCancelledCredits?: number;
  gamesPlayed?: number;
  gamesWon?: number;
  currentCredits?: number;
  totalWonCredits?: number;
  drop?: number;
  readAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type BillMetersData = {
  _id?: string;
  machineSession?: string;
  machine?: string;
  location?: string;
  movement?: {
    dollar1?: number;
    dollar2?: number;
    dollar5?: number;
    dollar10?: number;
    dollar20?: number;
    dollar50?: number;
    dollar100?: number;
    dollar500?: number;
    dollar1000?: number;
    dollar2000?: number;
    dollar5000?: number;
    dollarTotal?: number;
  };
  dollar1?: number;
  dollar2?: number;
  dollar5?: number;
  dollar10?: number;
  dollar20?: number;
  dollar50?: number;
  dollar100?: number;
  dollar500?: number;
  dollar1000?: number;
  dollar2000?: number;
  dollar5000?: number;
  dollarTotal?: number;
  readAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type LocationMembershipSettings = {
  locationLimit?: number;
  freePlayAmount?: number;
  enablePoints?: boolean;
  enableFreePlays?: boolean;
  pointsRatioMethod?: string;
  pointMethodValue?: number;
  gamesPlayedRatio?: number;
  pointsMethodGameTypes?: string[];
  freePlayGameTypes?: string[];
  freePlayCreditsTimeout?: number;
};

export type MemberSession = {
  _id: string;
  sessionId?: string;
  machineId?: string;
  time?: string;
  sessionLength?: string;
  handle?: number;
  moneyIn?: number; // Physical cash inserted (movement.drop)
  moneyOut?: number; // Manual payouts (movement.totalCancelledCredits)
  cancelledCredits?: number; // Legacy field - use moneyOut instead
  jackpot?: number;
  won?: number;
  bet?: number;
  wonLess?: number;
  points?: number;
  gamesPlayed?: number;
  gamesWon?: number;
  coinIn?: number;
  coinOut?: number;
  duration?: number;
};

// Members UI types
export type MembersView = 'members' | 'summary-report';

export type MembersTab = {
  id: MembersView;
  label: string;
  icon: string;
  description: string;
};

export type MemberSummary = {
  _id: string;
  fullName: string;
  address?: string;
  phoneNumber: string;
  lastLogin: string;
  createdAt: string;
  locationName: string;
  winLoss?: number;
};

export type SummaryStats = {
  totalMembers: number;
  totalLocations: number;
  activeMembers: number;
  totalSessions?: number;
  averageSessionDuration?: number;
  topPerformers?: unknown[];
};

export type SmibLocation = {
  id: string;
  name: string;
};

// Form data types for cabinet creation/editing
export type NewCabinetFormData = {
  serialNumber: string;
  game: string;
  gameType: string;
  isCronosMachine: boolean;
  accountingDenomination: string;
  cabinetType: string;
  assetStatus: string;
  gamingLocation: string;
  relayId: string;
  manufacturer: string;
  collectionSettings: {
    multiplier: string;
    lastCollectionTime: string;
    lastMetersIn: string;
    lastMetersOut: string;
  };
};

// Collection Issue types for enhanced Fix SAS Times system
export type CollectionIssue = {
  collectionId: string;
  machineName: string;
  issueType:
    | 'inverted_times'
    | 'prev_meters_mismatch'
    | 'sas_time_wrong'
    | 'wrong_sas_start_time'
    | 'wrong_sas_end_time'
    | 'missing_sas_times'
    | 'history_mismatch'
    | 'machine_time_mismatch';
  details: {
    current: any;
    expected: any;
    explanation: string;
  };
};

export type CollectionIssueDetails = {
  issues: CollectionIssue[];
  summary: {
    totalIssues: number;
    affectedMachines: number;
    affectedReports: number;
  };
};
