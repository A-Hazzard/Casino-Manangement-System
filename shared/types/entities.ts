import { Types } from 'mongoose';
import type {
  BillValidatorData,
  CollectionMetersHistoryEntry,
  MeterData,
  SasMeters,
} from './common';

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
  membershipEnabled?: boolean;
  locationMembershipSettings?: LocationMembershipSettings;
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
  _id?: string;
  location: string;
  locationName: string;
  name?: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  netGross?: number;
  coinIn?: number;
  coinOut?: number;
  jackpot: number;
  totalMachines: number;
  onlineMachines: number;
  sasMachines?: number;
  nonSasMachines?: number;
  hasSasMachines?: boolean;
  hasNonSasMachines?: boolean;
  isLocalServer: boolean;
  noSMIBLocation: boolean;
  hasSmib: boolean;
  gamesPlayed?: number;
  rel?: { licencee?: string | null; [key: string]: unknown };
  country?: string;
  address?: string;
  profitShare?: number;
  totalDrop?: number;
  enableMembership?: boolean;
  membershipEnabled?: boolean;
  aceEnabled?: boolean;
  memberCount?: number;
  hasNoRecentCollectionReport?: boolean;
  geoCoords?: GeoCoordinates;
  includeJackpot?: boolean;
  latestActivity?: number;
  isNeverOnline?: boolean;
  machines?: Array<{
    _id: string;
    assetNumber?: string;
    serialNumber?: string;
    isSasMachine?: boolean;
    lastActivity?: Date | null;
  }>;
  deletedAt?: string | Date | null;
};

export type LocationMetrics = {
  totalGross: number;
  totalDrop: number;
  totalCancelledCredits: number;
  onlineMachines: number;
  totalMachines: number;
};

export type UpdateLocationData = {
  name?: string;
  country?: string;
  address?: Partial<Address>;
  rel?: Partial<RelationshipInfo>;
  profitShare?: number;
  gameDayOffset?: number;
  geoCoords?: Partial<GeoCoordinates>;
  isLocalServer?: boolean;
  billValidatorOptions?: Record<string, boolean>;
  membershipEnabled?: boolean;
  aceEnabled?: boolean;
  locationMembershipSettings?: Record<string, unknown>;
  updatedAt?: Date;
  [key: string]: unknown;
};

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
  holdPercentage: number;
};

export type GamingMachine = {
  _id: string;
  serialNumber: string;
  origSerialNumber?: string;
  assetNumber?: string;
  machineId?: string;
  relayId?: string;
  smbId?: string;
  smibBoard?: string;
  custom: { name: string };

  game: string;
  installedGame?: string;
  gameType: string;
  otherGameType?: string;
  isCronosMachine: boolean;
  gameNumber?: string;

  cabinetType: string;
  assetStatus: string;
  status?: string;
  manufacturer?: string;
  manuf?: string;

  gamingLocation: string;
  gamingBoard?: string;
  accountingDenomination: number | string;
  collectionMultiplier?: string;

  lastActivity?: Date | string;
  lastOnline?: string | Date;
  loggedIn?: boolean;
  online?: boolean;

  moneyIn?: number;
  moneyOut?: number;
  jackpot?: number;
  cancelledCredits?: number;
  gross?: number;
  netGross?: number;
  coinIn?: number;
  coinOut?: number;
  gamesPlayed?: number;
  gamesWon?: number;
  handle?: number;
  includeJackpot?: boolean;

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

  machineMembershipSettings?: {
    isPointsAllowed: boolean;
    isFreePlayAllowed: boolean;
    pointsAwardMethod: string;
    freePlayAmount: number;
    freePlayCreditsTimeout: number;
  };

  nonRestricted?: number;
  restricted?: number;
  uaccount?: number;
  playableBalance?: number;

  sasVersion?: string;
  isSasMachine?: boolean;
  protocols?: Array<{ protocol: string; version: string }>;

  numberOfEnabledGames?: number;
  enabledGameNumbers?: string[];
  noOfGames?: number;

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

  isSunBoxDevice?: boolean;
  lastBillMeterAt?: Date;
  lastSasMeterAt?: Date;
  operationsWhileIdle?: { extendedMeters: Date };

  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;

  locationId?: string;
  locationName?: string;
  gameDayOffset?: number;
  timePeriod?: string;
  offlineTimeLabel?: string;
  actualOfflineTime?: string;
  network?: string;
};

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

export type CasinoMember = {
  _id: string;
  memberId: string;
  username: string;
  user: string;
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
  uaccount: number;
  ucardId: string;
  ulock: number;
  upassFull: number;
  updatedAt: Date | string;
  utype: number;
  uvalid: number;
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

export type MachineDocument = GamingMachine;

export type MetersData = {
  _id?: string;
  machine?: string;
  location?: string;
  locationSession?: string;
  viewingAccountDenomination?: {
    drop?: number;
    totalCancelledCredits?: number;
  };
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
  isSasCreated?: boolean;
  isRamClear?: boolean;
  readAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  deletedAt?: Date | string | null;
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
  moneyIn?: number;
  moneyOut?: number;
  cancelledCredits?: number;
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

export type MembersView = 'members' | 'summary-report' | 'activity-log';

export type MembersTab = {
  id: MembersView;
  label: string;
  icon: string;
  description: string;
  available?: boolean;
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
  relayId?: string;
  smibBoard?: string;
  smbId?: string;
  manufacturer: string;
  otherGameType?: string;
  custom: { name: string };
  collectionSettings: {
    multiplier: string;
    lastCollectionTime: string;
    lastMetersIn: string;
    lastMetersOut: string;
  };
};

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
    current: Record<string, unknown> | null;
    expected: Record<string, unknown> | null;
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

export type TransformedCabinet = {
  _id: string;
  locationId: string;
  locationName: string;
  assetNumber: string;
  serialNumber: string;
  custom?: Record<string, unknown>;
  relayId: string;
  smibBoard: string;
  smbId: string;
  lastActivity: Date | null;
  lastOnline: Date | null;
  game: string;
  installedGame: string;
  cabinetType: string;
  manufacturer?: string;
  assetStatus: string;
  status: string;
  gameType?: string;
  isCronosMachine?: boolean;
  moneyIn: number;
  moneyOut: number;
  jackpot: number;
  cancelledCredits: number;
  gross: number;
  netGross?: number;
  gamesPlayed?: number;
  gamesWon?: number;
  metersData: {
    readAt: Date | null;
    movement: Record<string, unknown> | null;
  } | null;
  sasMeters: Record<string, unknown> | null;
  online?: boolean;
  includeJackpot?: boolean;
};

