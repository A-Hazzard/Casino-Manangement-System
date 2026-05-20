import type { Denomination } from './vault';

export type AcceptedBillDocument = {
  _id: string;
  value: number;
  machine: string;
  location: string;
  member: string;
  movement: Record<string, unknown>;
  readAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ActivityLogDocument = {
  _id: string;
  timestamp: Date;
  userId: string;
  username: string;
  action:
    | 'create'
    | 'update'
    | 'delete'
    | 'restore'
    | 'archive'
    | 'view'
    | 'download'
    | 'login_success'
    | 'login_failed'
    | 'login_blocked'
    | 'login_error'
    | 'logout'
    | 'password_reset'
    | 'account_locked'
    | 'account_unlocked'
    | 'cancel'
    | 'sms_success'
    | 'sms_failed';
  resource:
    | 'user'
    | 'licencee'
    | 'member'
    | 'location'
    | 'machine'
    | 'session'
    | 'collection'
    | 'firmware'
    | 'auth'
    | 'feedback'
    | 'collection-report'
    | 'report'
    | 'system'
    | 'vault'
    | 'cashier_shift'
    | 'smib'
    | 'movement_request'
    | 'sms';
  resourceId: string;
  resourceName?: string;
  membershipLog?: boolean;
  details?: string;
  previousData?: unknown;
  newData?: unknown;
  ipAddress?: string;
  userAgent?: string;
  actor?: {
    id?: string;
    email?: string;
    role?: string;
  };
  actionType?: string;
  entity?: {
    id?: string;
    name?: string;
  };
  entityType?: string; // Entity type for backward compatibility
  changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  description?: string;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CashDeskPayoutDocument = {
  _id: string;
  amount: number;
  type: 'Ticket' | 'Hand-Pay' | 'Cash-Desk';
  machineSerialNumber?: string;
  memberName?: string;
  cashierId: string;
  cashierName: string;
  locationId: string;
  location: string;
  shiftId: string;
  ticketNumber?: string;
  imageUrl?: string;
  verified: boolean;
  verifiedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type CashierShiftDocument = {
  _id: string;
  locationId: string;
  cashierId: string;
  vaultShiftId: string;
  status:
    | 'pending_start'
    | 'active'
    | 'closed'
    | 'pending_review'
    | 'cancelled';
  openedAt: Date;
  closedAt?: Date;
  openingBalance: number;
  openingDenominations?: Array<{ denomination: number; quantity: number }>;
  closingBalance?: number;
  closingDenominations?: Array<{ denomination: number; quantity: number }>;
  lastSyncedDenominations?: Array<{ denomination: number; quantity: number }>;
  cashierEnteredBalance?: number;
  cashierEnteredDenominations?: Array<{
    denomination: number;
    quantity: number;
  }>;
  expectedClosingBalance?: number;
  discrepancy?: number;
  discrepancyResolved?: boolean;
  vmReviewNotes?: string;
  vmAdjustedBalance?: number;
  reviewedBy?: string;
  reviewedAt?: Date;
  currentBalance: number;
  payoutsTotal?: number;
  payoutsCount?: number;
  floatAdjustmentsTotal?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CollectionReportDocument = {
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
  collector?: string;
  collectorName?: string;
  location: string;
  locationName: string;
  locationReportId: string;
  totalDrop: number;
  totalCancelled: number;
  totalGross: number;
  totalSasGross: number;
  timestamp: Date;
  includeJackpot?: boolean;
  reasonShortagePayment?: string;
  balanceCorrection?: number;
  balanceCorrectionReas?: string;
  varianceReason?: string;
  previousCollectionTime?: Date;
  locationProfitPerc?: number;
  machinesCollected?: string;
  totalVariation?: number;
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
};

export type CollectionDocument = {
  _id: string;
  ramClearMeterId?: string;
  meterId?: string;
  isCompleted?: boolean;
  metersIn?: number;
  metersOut?: number;
  prevIn?: number;
  prevOut?: number;
  softMetersIn?: number;
  softMetersOut?: number;
  notes?: string;
  locationReportId?: string;
  sasMeters?: {
    machine?: string;
    drop?: number;
    totalCancelledCredits?: number;
    gross?: number;
    gamesPlayed?: number;
    jackpot?: number;
    sasStartTime?: Date;
    sasEndTime?: Date;
  };
  movement?: {
    metersIn?: number;
    metersOut?: number;
    gross?: number;
  };
  machineId?: string;
  machineName?: string;
  machineCustomName?: string;
  custom?: { name?: string };
  game?: string;
  location?: string;
  collector?: string;
  timestamp?: Date;
  collectionTime?: Date;
  ramClear?: boolean;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
  serialNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
};

export type CountryDocument = {
  _id: string;
  name: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type DenominationDocument = {
  _id: string;
  value: number;
  amount: number;
  locationId: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type FeedbackDocument = {
  _id: string;
  email: string;
  category:
    | 'bug'
    | 'suggestion'
    | 'general-review'
    | 'feature-request'
    | 'performance'
    | 'ui-ux'
    | 'other';
  description: string;
  submittedAt: Date;
  status: 'pending' | 'reviewed' | 'resolved';
  archived?: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
  username?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  locationId?: string;
  locationName?: string;
  licenceeId?: string;
  licenceeName?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type FirmwareDocument = {
  _id: string;
  product: string;
  version: string;
  versionDetails?: string;
  fileId?: unknown;
  fileName?: string;
  fileSize?: number;
  releaseDate?: Date;
  description?: string;
  downloadUrl?: string;
  checksum?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type FloatRequestDocument = {
  _id: string;
  locationId: string;
  cashierId: string;
  cashierName?: string;
  cashierShiftId?: string;
  vaultShiftId?: string;
  type: 'increase' | 'decrease';
  requestedAmount: number;
  requestedDenominations?: Denomination[];
  requestedDenom?: Denomination[];
  requestNotes?: string;
  requestedAt: Date;
  requestedFloatAt?: Date;
  shiftId?: string;
  status:
    | 'pending'
    | 'approved'
    | 'approved_vm'
    | 'denied'
    | 'edited'
    | 'cancelled';
  requestedTotalAmount?: number;
  totalAmount?: number;
  location?: string;
  approvedAmount?: number;
  approvedDenominations?: Denomination[];
  approvedDenom?: Denomination[];
  approvedTotalAmount?: number;
  approvedFloatAt?: Date;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  processedBy?: string;
  processedAt?: Date;
  vmNotes?: string;
  transactionId?: string;
  notificationSent?: boolean;
  notificationSentAt?: Date;
  notificationReadAt?: Date;
  notificationDismissedAt?: Date;
  acknowledgedByCashier?: boolean;
  acknowledgedByManager?: boolean;
  acknowledgedAt?: Date;
  auditLog?: Array<{
    action: string;
    performedBy: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
};

export type FloatRequestsDocument = {
  _id: string;
  type: 'FLOAT_INCREASE' | 'FLOAT_DECREASE';
  cashierId: string;
  cashierName?: string;
  requestedDenom?: unknown;
  requestedTotalAmount: number;
  requestedFloatAt?: Date;
  shiftId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONFIRMED' | 'ACKNOWLEDGED';
  totalAmount?: number;
  locationId: string;
  location?: string;
  approvedDenom?: unknown;
  approvedTotalAmount?: number;
  approvedFloatAt?: Date;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  acknowledgedByCashier?: boolean;
  acknowledgedByManager?: boolean;
  acknowledgedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
};

export type GamingLocationDocument = {
  _id: string;
  name: string;
  country?: string;
  address?: {
    street?: string;
    city?: string;
  };
  rel?: {
    licencee?: string;
    [key: string]: unknown;
  };
  profitShare?: number;
  collectionBalance?: number;
  previousCollectionTime?: Date;
  gameDayOffset?: number;
  isLocalServer?: boolean;
  geoCoords?: {
    latitude?: number;
    longitude?: number;
    longtitude?: number;
  };
  membershipEnabled?: boolean;
  aceEnabled?: boolean;
  enableMembership?: boolean;
  locationMembershipSettings?: Record<string, unknown>;
  billValidatorOptions?: Record<string, unknown>;
  status?: string;
  statusHistory?: Array<{
    status: string;
    changedAt: Date;
    changedBy?: string;
  }>;
  noSMIBLocation?: boolean;
  fullSMIBs?: boolean;
  semiSMIBs?: boolean;
  googleMapsLink?: string;
  googleMapsIframe?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

export type LocationDocument = GamingLocationDocument;

export type InterLocationTransferDocument = {
  _id: string;
  fromLocationId: string;
  toLocationId: string;
  fromLocationName: string;
  toLocationName: string;
  amount: number;
  denominations?: Array<{ denomination: number; quantity: number }>;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  completedAt?: Date;
  transactionId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LicenceeDocument = {
  _id: string;
  name: string;
  country?: string;
  description?: string;
  currency?: string;
  startDate?: Date;
  expiryDate?: Date;
  prevStartDate?: Date;
  prevExpiryDate?: Date;
  isPaid?: boolean;
  licenceKey: string;
  status?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  geoCoords?: {
    latitude?: number;
    longitude?: number;
    zoomRatio?: number;
  };
  includeJackpot?: boolean;
  gameDayOffset?: number;
};

export type MachineDocument = {
  _id: string;
  machineId?: string;
  serialNumber?: string;
  relayId?: string;
  smibBoard?: string;
  game?: string;
  gameType?: string;
  manufacturer?: string;
  gamingLocation?: string;
  cabinetType?: string;
  assetStatus?: string;
  lastActivity?: Date;
  [key: string]: unknown;
  sasMeters?: {
    coinIn?: number;
    coinOut?: number;
    jackpot?: number;
    drop?: number;
    gamesPlayed?: number;
    totalCancelledCredits?: number;
    totalHandPaidCancelledCredits?: number;
    moneyOut?: number;
    slotDoorOpened?: number;
    powerReset?: number;
    totalWonCredits?: number;
    currentCredits?: number;
    gamesWon?: number;
  };
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
  collectionMeters?: {
    metersIn?: number;
    metersOut?: number;
  };
  collectionTime?: Date;
  previousCollectionTime?: Date;
  currentSession?: string;
  custom?: { name?: string };
  balances?: { cashable?: number };
  config?: {
    enableRte?: boolean;
    lockMachine?: boolean;
    lockBvOnLogOut?: boolean;
  };
  smibConfig?: {
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
    net?: {
      netMode?: number;
      netStaSSID?: string;
      netStaPwd?: string;
      netStaChan?: number;
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
  smibVersion?: {
    firmware?: string;
    version?: string;
  };
  gameConfig?: {
    accountingDenomination?: number;
    theoreticalRtp?: number | string;
    maxBet?: string;
    payTableId?: string;
    additionalId?: string;
    gameOptions?: string;
    progressiveGroup?: string;
  };
  collectorDenomination?: number;
  sessionHistory?: Array<{
    location: string;
    date: Date;
    reason?: string;
    performedBy?: string;
    _id?: string;
  }>;
  maintenanceHistory?: Array<{
    date: Date;
    description: string;
    performedBy?: string;
  }>;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  restricted?: number;
  sasVersion?: string;
  uaccount?: number;
  isSasMachine?: boolean;
  playableBalance?: number;
  protocols?: Array<{ protocol: string; version: string }>;
  gameNumber?: string;
  numberOfEnabledGames?: number;
  enabledGameNumbers?: string[];
  noOfGames?: number;
  viewingAccountDenomination?: Array<{
    asOf?: Date;
    denomination?: number;
    meters?: string[];
    user?: { role?: string };
  }>;
  viewingAccountDenominationHistory?: Array<{
    asOf?: Date;
    denomination?: number;
    meters?: string[];
    user?: { role?: string };
  }>;
  lastBillMeterAt?: Date;
  lastSasMeterAt?: Date;
  origSerialNumber?: string;
  orig?: {
    meters?: {
      coinIn?: string;
      coinOut?: string;
      drop?: string;
      jackpot?: string;
      gamesPlayed?: string;
      moneyOut?: string;
      slotDoorOpened?: string;
      powerReset?: string;
    };
    deletedAt?: number;
  };
  curProcess?: { name?: string; next?: string };
  tasks?: {
    pendingHandpay?: {
      name?: string;
      steps?: Array<{ name?: string }>;
      currentStepIndex?: number;
      retryAttempts?: number;
    };
  };
  collectionMetersHistory?: Array<{
    _id: string;
    timestamp: string | Date;
    metersIn: number;
    metersOut: number;
    prevMetersIn: number;
    prevMetersOut: number;
    locationReportId: string;
  }>;
  billValidator?: {
    balance?: number;
    notes?: Array<{ _id?: string; denomination?: number; quantity?: number }>;
  };
  operationsWhileIdle?: { extendedMeters?: Date };
  isSunBoxDevice?: boolean;
  gamingBoard?: string;
  machineMembershipSettings?: {
    isPointsAllowed?: boolean;
    isFreePlayAllowed?: boolean;
    pointsAwardMethod?: string;
    freePlayAmount?: number;
    freePlayCreditsTimeout?: number;
  };
  machineType?: string;
  machineStatus?: string;
  selectedDenomination?: { drop?: number; totalCancelledCredits?: number };
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  __v?: number;
};

export type MachineEventDocument = {
  _id: string;
  machine: string;
  location?: string;
  stateId?: string;
  relay?: string;
  currentSession?: string;
  description?: string;
  command?: string;
  commandType?: string;
  date?: Date;
  eventType?: string;
  eventLogLevel?: string;
  eventSuccess?: boolean;
  message?: {
    incomingMessage?: {
      typ?: string;
      rly?: string;
      mac?: string;
      pyd?: string;
    };
    serialNumber?: string;
    game?: string;
    gamingLocation?: string;
  };
  sequence?: Array<{
    message?: {
      typ?: string;
      rly?: string;
      mac?: string;
      tkn?: string;
      pyd?: string;
    };
    description?: string;
    logLevel?: string;
    success?: boolean;
    createdAt?: Date;
  }>;
  cabinetId?: string;
  gameName?: string;
  __v?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type MachineSessionDocument = {
  _id: string;
  memberId: string;
  machineId: string;
  machineSerialNumber?: string;
  status?: string;
  startTime?: Date;
  endTime?: Date;
  startMeters?: {
    movement?: Record<string, unknown>;
    coinIn?: number;
    coinOut?: number;
    jackpot?: number;
  };
  endMeters?: {
    movement?: Record<string, unknown>;
    coinIn?: number;
    coinOut?: number;
    jackpot?: number;
  };
  startBillMeters?: Record<string, number>;
  endBillMeters?: Record<string, number>;
  gamesPlayed?: number;
  gamesWon?: number;
  avgBet?: number;
  billsIn?: number;
  points?: number;
  nonRestricted?: number;
  restricted?: number;
  uaccount?: number;
  ucardId?: string;
  relayId?: string;
  locationMembershipSettings?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export type MemberDocument = {
  _id: string;
  username: string;
  pin?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    gender?: string;
    dob?: string;
    email?: string;
    address?: string;
    occupation?: string;
    identification?: {
      number?: string;
      type?: string;
    };
  };
  phoneNumber?: string;
  gamingLocation: string;
  machineId?: string;
  machineSerialNumber?: string;
  currentSession?: string;
  loggedIn?: boolean;
  lastLogin?: Date;
  accountLocked?: boolean;
  uaccount?: number;
  points?: number;
  nonRestricted?: number;
  restricted?: number;
  gamesPlayed?: number;
  gamesWon?: number;
  avgBet?: number;
  billsIn?: number;
  startMeters?: {
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
    readAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  };
  endMeters?: {
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
    readAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  };
  startBillMeters?: {
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
      dollarTotalUnknown?: number;
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
    dollarTotalUnknown?: number;
    readAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  };
  endBillMeters?: {
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
      dollarTotalUnknown?: number;
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
    dollarTotalUnknown?: number;
    readAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  };
  intermediateMeters?: {
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
    readAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  };
  locationMembershipSettings?: {
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
  smsCode?: number;
  smsCodeTime?: Date;
  areaCode?: string;
  authType?: number;
  lastPwUpdatedAt?: Date;
  lastfplAwardAt?: Date;
  memberId?: string;
  numFailedLoginAttempts?: number;
  relayId?: string;
  status?: string;
  ucardId?: string;
  ulock?: number;
  upassFull?: number;
  user?: string;
  utype?: number;
  uvalid?: number;
  freePlayAwardId?: number;
  gameName?: string;
  endTime?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type MeterDocument = {
  _id: string;
  machine: string;
  location: string;
  locationSession?: string;
  movement?: {
    coinIn?: number;
    coinOut?: number;
    jackpot?: number;
    drop?: number;
    gamesPlayed?: number;
    gamesWon?: number;
    totalCancelledCredits?: number;
    handPaidCancelledCredits?: number;
  };
  coinIn?: number;
  coinOut?: number;
  jackpot?: number;
  drop?: number;
  totalCancelledCredits?: number;
  totalHandPaidCancelledCredits?: number;
  gamesPlayed?: number;
  gamesWon?: number;
  currentCredits?: number;
  totalWonCredits?: number;
  readAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export type MovementRequestDocument = {
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
  locationFromId?: string;
  locationToId?: string;
  createdBy: string;
  requestTo: string;
  movementType: string;
  installationType: string;
  reason?: string;
  selectedMachines?: string[];
  cabinetIn?: string;
  status: 'pending' | 'completed' | 'cancelled';
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string;
  approvedBySecond?: string;
  deletedAt?: Date;
};

export type PayoutDocument = {
  _id: string;
  locationId: string;
  cashierId: string;
  cashierShiftId: string;
  cashierName?: string;
  type: 'ticket' | 'hand_pay';
  amount: number;
  ticketNumber?: string;
  ticketBarcode?: string;
  printedAt?: Date;
  machineId?: string;
  machineSerialNumber?: string;
  reason?: string;
  validated?: boolean;
  validationMethod?: string;
  timestamp: Date;
  cashierFloatBefore: number;
  cashierFloatAfter: number;
  transactionId: string;
  notes?: string;
  status?: string;
  createdAt: Date;
  updatedAt?: Date;
};

export type SchedulerDocument = {
  _id: string;
  creator: string;
  collector: string;
  location: string;
  startTime: Date;
  endTime: Date;
  status: 'pending' | 'completed' | 'canceled';
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ShiftDocument = {
  _id: string;
  role: 'cashier' | 'vault-manager';
  userId: string;
  userName?: string;
  startDenom?: unknown;
  endDenom?: unknown;
  startedShiftAt: Date;
  closedShiftAt?: Date;
  locationId: string;
  location?: string;
  status: 'Open' | 'Close';
  notes?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type SoftCountDocument = {
  _id: string;
  locationId: string;
  countedAt: Date;
  amount: number;
  denominations?: Array<{ denomination: number; quantity: number }>;
  countedBy: string;
  machineId?: string;
  transactionId: string;
  notes?: string;
  isEndOfDay?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UserDocument = {
  _id: string;
  isEnabled?: boolean;
  roles: string[];
  username: string;
  emailAddress: string;
  password?: string;
  tempPassword?: string;
  previousPassword?: string;
  previousPasswords?: string[];
  profile?: {
    firstName?: string;
    lastName?: string;
    gender?: string;
    address?: {
      street?: string;
      town?: string;
      region?: string;
      postalCode?: string;
      country?: string;
    };
    identification?: {
      dateOfBirth?: Date;
      idType?: string;
      idNumber?: string;
      notes?: string;
    };
    phoneNumber?: string;
    notes?: string;
  };
  profilePicture?: string;
  assignedLocations?: string[];
  assignedLicencees?: string[];
  moneyInMultiplier?: number;
  moneyOutAndJackpotMultiplier?: number;
  reviewerMultiplierStartTime?: Date;
  totpSecret?: string;
  totpEnabled?: boolean;
  totpRecoveryToken?: string;
  totpRecoveryExpires?: Date;
  totpTempSecret?: string;
  sessionVersion?: number;
  loginCount?: number;
  lastLoginAt?: Date;
  tempPasswordChanged?: boolean;
  requiresPasswordUpdate?: boolean;
  passwordUpdatedAt?: Date;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserOverview = Pick<UserDocument, '_id' | 'profile' | 'username'>;

export type VaultCollectionSessionDocument = {
  _id: string;
  locationId: string;
  vaultShiftId: string;
  type: 'machine_collection' | 'soft_count';
  status: 'active' | 'completed' | 'cancelled';
  isEndOfDay?: boolean;
  startedBy?: string;
  entries?: Array<{
    machineId: string;
    machineName?: string;
    source?: 'manual' | 'meter';
    totalAmount: number;
    expectedDrop?: number;
    denominations?: Array<{ denomination: number; quantity: number }>;
    meters?: {
      billIn?: number;
      ticketIn?: number;
      totalIn?: number;
    };
    variance?: number;
    notes?: string;
    isEndOfDay?: boolean;
    collectedAt?: Date;
  }>;
  totalCollected?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type VaultNotificationDocument = {
  _id: string;
  locationId: string;
  type:
    | 'float_request'
    | 'shift_review'
    | 'system_alert'
    | 'low_balance'
    | '2fa_recovery_request';
  recipientId: string;
  recipientRole: string;
  title: string;
  message: string;
  urgent?: boolean;
  relatedEntityType: string;
  relatedEntityId: string;
  metadata?: unknown;
  status: 'unread' | 'read' | 'actioned' | 'dismissed' | 'cancelled';
  readAt?: Date;
  actionedAt?: Date;
  dismissedAt?: Date;
  dismissedByUsers?: string[];
  actionUrl?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type VaultShiftDocument = {
  _id: string;
  locationId: string;
  vaultManagerId: string;
  status: 'active' | 'closed';
  openedAt: Date;
  closedAt?: Date;
  openingBalance: number;
  openingDenominations?: Array<{ denomination: number; quantity: number }>;
  currentDenominations?: Array<{ denomination: number; quantity: number }>;
  closingBalance?: number;
  closingDenominations?: Array<{ denomination: number; quantity: number }>;
  reconciliations?: Array<{
    timestamp: Date;
    previousBalance: number;
    newBalance: number;
    denominations?: Array<{ denomination: number; quantity: number }>;
    reason: string;
    comment: string;
  }>;
  canClose?: boolean;
  isReconciled?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type VaultTransactionDocument = {
  _id: string;
  locationId: string;
  timestamp: Date;
  type:
    | 'vault_open'
    | 'vault_close'
    | 'vault_reconciliation'
    | 'cashier_shift_open'
    | 'cashier_shift_close'
    | 'float_increase'
    | 'float_decrease'
    | 'payout'
    | 'machine_collection'
    | 'soft_count'
    | 'expense'
    | 'add_cash'
    | 'remove_cash';
  from: { type: string; id?: string };
  to: { type: string; id?: string };
  fromName?: string;
  toName?: string;
  amount: number;
  denominations?: Array<{ denomination: number; quantity: number }>;
  vaultBalanceBefore?: number;
  vaultBalanceAfter?: number;
  cashierBalanceBefore?: number;
  cashierBalanceAfter?: number;
  vaultShiftId?: string;
  cashierShiftId?: string;
  floatRequestId?: string;
  payoutId?: string;
  performedBy: string;
  performedByName?: string;
  notes?: string;
  reason?: string;
  auditComment?: string;
  attachmentId?: unknown;
  attachmentName?: string;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    accountType?: string;
    transit?: string;
    branch?: string;
    nameOnAccount?: string;
  };
  expenseDetails?: {
    vendor?: string;
    invoiceNumber?: string;
    serviceProvider?: string;
    machineDetails?: Array<{
      identifier?: string;
      game?: string;
      gameType?: string;
    }>;
    machineIds?: string[];
    isMachineRepair?: boolean;
    billerName?: string;
    billingPeriod?: string;
    referenceNumber?: string;
    description?: string;
  };
  isVoid?: boolean;
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: Date;
  createdAt: Date;
};

export type LeanLicencee = Pick<LicenceeDocument, '_id' | 'name'>;

export type LeanLocation = Pick<
  GamingLocationDocument,
  '_id' | 'gameDayOffset' | 'rel'
> & { licencee?: string };

export type LeanMachine = Pick<MachineDocument, '_id' | 'gamingLocation'>;
