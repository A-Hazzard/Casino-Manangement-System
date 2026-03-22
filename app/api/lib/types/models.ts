/**
 * MongoDB Model Types
 * Type definitions for all Mongoose models in the application.
 * Use Pick<> to select only the fields you need when querying.
 */

export interface AcceptedBillDocument {
  _id: string;
  value: number;
  machine: string;
  location: string;
  member: string;
  movement: Record<string, unknown>;
  readAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityLogDocument {
  _id: string;
  timestamp: Date;
  userId: string;
  username: string;
  action:
    | 'create'
    | 'update'
    | 'delete'
    | 'view'
    | 'login_success'
    | 'login_failed'
    | 'logout'
    | 'password_change'
    | 'permission_change'
    | string;
  resource:
    | 'user'
    | 'member'
    | 'machine'
    | 'vault'
    | 'location'
    | 'licencee'
    | 'shift'
    | 'report'
    | 'collection'
    | string;
  resourceId?: string;
  resourceName?: string;
  details?: string;
  previousData?: unknown;
  newData?: unknown;
  ipAddress?: string;
  userAgent?: string;
  changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CashDeskPayoutDocument {
  _id: string;
  amount: number;
  type: 'Ticket' | 'Hand-Pay' | 'Cash-Desk';
  machineSerialNumber: string;
  memberName?: string;
  cashierId: string;
  cashierName: string;
  locationId: string;
  location: string;
  shiftId?: string;
  ticketNumber?: string;
  verified: boolean;
  verifiedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CashierShiftDocument {
  _id: string;
  locationId: string;
  cashierId: string;
  vaultShiftId?: string;
  status:
    | 'pending_start'
    | 'active'
    | 'closed'
    | 'pending_review'
    | 'cancelled';
  openedAt?: Date;
  closedAt?: Date;
  openingBalance?: number;
  closingBalance?: number;
  openingDenominations?: Array<{ value: number; count: number }>;
  closingDenominations?: Array<{ value: number; count: number }>;
  cashierEnteredBalance?: number;
  expectedClosingBalance?: number;
  discrepancy?: number;
  currentBalance?: number;
  payoutsTotal?: number;
  payoutsCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionReportDocument {
  _id: string;
  variance?: number;
  previousBalance?: number;
  currentBalance?: number;
  amountToCollect?: number;
  amountCollected?: number;
  amountUncollected?: number;
  partnerProfit?: number;
  taxes?: number;
  advance?: number;
  collector?: string;
  collectorName?: string;
  location: string;
  locationName?: string;
  locationReportId?: string;
  totalDrop?: number;
  totalCancelled?: number;
  totalGross?: number;
  totalSasGross?: number;
  timestamp: Date;
  isEditing?: boolean;
  includeJackpot?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionDocument {
  _id: string;
  isCompleted?: boolean;
  metersIn?: number;
  metersOut?: number;
  softMetersIn?: number;
  softMetersOut?: number;
  sasMeters?: {
    drop?: number;
    gross?: number;
    jackpot?: number;
    games?: number;
    coinIn?: number;
    coinOut?: number;
  };
  movement?: Record<string, unknown>;
  machineId?: string;
  machineName?: string;
  machineCustomName?: string;
  location?: string;
  collector?: string;
  timestamp?: Date;
  collectionTime?: Date;
  ramClear?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CountryDocument {
  _id: string;
  name: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DenominationDocument {
  _id: string;
  value: number;
  amount: number;
  locationId: string;
  date?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackDocument {
  _id: string;
  email: string;
  category: 'bug' | 'suggestion' | 'feature-request' | 'question' | 'other';
  description: string;
  submittedAt?: Date;
  status: 'pending' | 'reviewed' | 'resolved';
  reviewedBy?: string;
  reviewedAt?: Date;
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
}

export interface FirmwareDocument {
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
}

export interface FloatRequestDocument {
  _id: string;
  locationId: string;
  cashierId: string;
  cashierShiftId?: string;
  vaultShiftId?: string;
  type: 'increase' | 'decrease';
  requestedAmount: number;
  requestedDenominations?: Array<{ value: number; count: number }>;
  status: 'pending' | 'approved' | 'denied' | 'cancelled' | 'completed';
  approvedAmount?: number;
  approvedDenominations?: Array<{ value: number; count: number }>;
  transactionId?: string;
  notificationSent?: boolean;
  notificationSentAt?: Date;
  auditLog?: Array<{
    action: string;
    performedBy: string;
    timestamp: Date;
    details?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface FloatRequestsDocument {
  _id: string;
  type: 'FLOAT_INCREASE' | 'FLOAT_DECREASE';
  cashierId: string;
  cashierName: string;
  requestedDenom?: unknown;
  requestedTotalAmount: number;
  shiftId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  locationId: string;
  location?: string;
  approvedDenom?: unknown;
  approvedTotalAmount?: number;
  approvedBy?: string;
  rejectedBy?: string;
  acknowledgedByCashier?: boolean;
  acknowledgedByManager?: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GamingLocationDocument {
  _id: string;
  name: string;
  country?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
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
  enableMembership?: boolean;
  locationMembershipSettings?: Record<string, unknown>;
  status?: string;
  noSMIBLocation?: boolean;
  billValidatorOptions?: Record<string, unknown>;
  statusHistory?: Array<{
    status: string;
    changedAt: Date;
    changedBy?: string;
  }>;
  [key: string]: unknown;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface InterLocationTransferDocument {
  _id: string;
  fromLocationId: string;
  toLocationId: string;
  fromLocationName?: string;
  toLocationName?: string;
  amount: number;
  denominations?: Array<{ value: number; count: number }>;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  requestedBy?: string;
  approvedBy?: string;
  approvedAt?: Date;
  completedAt?: Date;
  transactionId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LicenceeDocument {
  _id: string;
  name: string;
  country?: string;
  startDate?: Date;
  expiryDate?: Date;
  isPaid?: boolean;
  licenceKey?: string;
  status?: string;
  geoCoords?: {
    latitude?: number;
    longitude?: number;
    zoom?: number;
  };
  includeJackpot?: boolean;
  gameDayOffset?: number;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MachineDocument {
  _id: string;
  machineId?: string;
  serialNumber?: string;
  relayId?: string;
  smibBoard?: string;
  game?: string;
  gameType?: string;
  manufacturer?: string;
  manuf?: string;
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
    games?: number;
    billIn?: Record<string, number>;
  };
  billMeters?: Record<string, number>;
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
  smibConfig?: Record<string, unknown>;
  smibVersion?: {
    firmware?: string;
    version?: string;
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
  collectorDenomination?: number;
  sessionHistory?: Array<{
    location: string;
    movedAt: Date;
    movedBy?: string;
  }>;
  maintenanceHistory?: Array<{
    date: Date;
    type: string;
    description: string;
    performedBy?: string;
  }>;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  restricted?: number;
  sasVersion?: string;
  uaccount?: number;
  isCronosMachine?: boolean;
  isSasMachine?: boolean;
  playableBalance?: number;
  protocols?: string[];
  gameNumber?: string;
  numberOfEnabledGames?: number;
  enabledGameNumbers?: string[];
  noOfGames?: number;
  viewingAccountDenomination?: Array<number>;
  viewingAccountDenominationHistory?: Array<{
    denomination: number;
    changedAt: Date;
  }>;
  lastBillMeterAt?: Date;
  lastSasMeterAt?: Date;
  validationId?: string;
  sequenceNumber?: string;
  origSerialNumber?: string;
  orig?: Record<string, unknown>;
  curProcess?: { name?: string; next?: string };
  tasks?: {
    pendingHandpay?: { amount?: number; at?: Date };
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
    notes?: Array<unknown>;
  };
  operationsWhileIdle?: Record<string, unknown>;
  isSunBoxDevice?: boolean;
  gamingBoard?: string;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MachineEventDocument {
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
  message?: { text?: string; timestamp?: Date };
  sequence?: Array<{
    timestamp?: Date;
    level?: string;
    message?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MachineSessionDocument {
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
}

export interface MemberDocument {
  _id: string;
  username: string;
  pin?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    dob?: string;
    gender?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
  phoneNumber?: string;
  gamingLocation?: string;
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
  startMeters?: Record<string, unknown>;
  endMeters?: Record<string, unknown>;
  startBillMeters?: Record<string, number>;
  endBillMeters?: Record<string, number>;
  locationMembershipSettings?: Record<string, unknown>;
  smsCode?: string;
  smsCodeTime?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeterDocument {
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
}

export interface MovementRequestDocument {
  _id: string;
  variance?: number;
  previousBalance?: number;
  currentBalance?: number;
  amountToCollect?: number;
  amountCollected?: number;
  amountUncollected?: number;
  partnerProfit?: number;
  taxes?: number;
  advance?: number;
  locationName?: string;
  locationFrom?: string;
  locationTo?: string;
  locationId?: string;
  locationFromId?: string;
  locationToId?: string;
  createdBy?: string;
  movementType?: string;
  installationType?: string;
  reason?: string;
  selectedMachines?: string[];
  status?: 'pending' | 'completed' | 'cancelled';
  timestamp?: Date;
  approvedBy?: string;
  approvedBySecond?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayoutDocument {
  _id: string;
  locationId: string;
  cashierId: string;
  cashierShiftId?: string;
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
  timestamp?: Date;
  cashierFloatBefore?: number;
  cashierFloatAfter?: number;
  transactionId: string;
  notes?: string;
  createdAt: Date;
}

export interface SchedulerDocument {
  _id: string;
  creator: string;
  collector?: string;
  location: string;
  startTime?: Date;
  endTime?: Date;
  status?: 'pending' | 'completed' | 'canceled';
  createdAt: Date;
  updatedAt: Date;
}

export interface ShiftDocument {
  _id: string;
  role?: 'cashier' | 'vault-manager';
  userId?: string;
  userName?: string;
  startDenom?: unknown;
  endDenom?: unknown;
  startedShiftAt?: Date;
  closedShiftAt?: Date;
  locationId?: string;
  location?: string;
  status?: 'Open' | 'Close';
  notes?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftCountDocument {
  _id: string;
  locationId: string;
  countedAt?: Date;
  amount: number;
  denominations?: Array<{ value: number; count: number }>;
  countedBy?: string;
  machineId?: string;
  transactionId: string;
  notes?: string;
  isEndOfDay?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDocument {
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
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    identification?: {
      type?: string;
      number?: string;
    };
    phone?: string;
  };
  profilePicture?: string;
  assignedLocations?: string[];
  assignedLicencees?: string[];
  multiplier?: number;
  totpSecret?: string;
  totpEnabled?: boolean;
  totpRecoveryToken?: string;
  totpRecoveryExpires?: Date;
  sessionVersion?: number;
  loginCount?: number;
  lastLoginAt?: Date;
  tempPasswordChanged?: boolean;
  requiresPasswordUpdate?: boolean;
  passwordUpdatedAt?: Date;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VaultCollectionSessionDocument {
  _id: string;
  locationId: string;
  vaultShiftId?: string;
  type: 'machine_collection' | 'soft_count';
  status: 'active' | 'completed' | 'cancelled';
  isEndOfDay?: boolean;
  startedBy?: string;
  entries?: Array<{
    machineId?: string;
    source?: 'manual' | 'meter';
    totalAmount?: number;
    denominations?: Array<{ value: number; count: number }>;
    meters?: {
      billIn?: number;
      ticketIn?: number;
      totalIn?: number;
    };
    variance?: number;
    collectedAt?: Date;
  }>;
  totalCollected?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface VaultNotificationDocument {
  _id: string;
  locationId: string;
  type:
    | 'float_request'
    | 'system_alert'
    | 'low_balance'
    | '2fa_recovery_request';
  recipientId?: string;
  recipientRole?: string;
  title: string;
  message: string;
  urgent?: boolean;
  relatedEntityType?: string;
  relatedEntityId?: string;
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
}

export interface VaultShiftDocument {
  _id: string;
  locationId: string;
  vaultManagerId: string;
  status: 'active' | 'closed';
  openedAt?: Date;
  closedAt?: Date;
  openingBalance?: number;
  openingDenominations?: Array<{ value: number; count: number }>;
  currentDenominations?: Array<{ value: number; count: number }>;
  closingBalance?: number;
  closingDenominations?: Array<{ value: number; count: number }>;
  reconciliations?: Array<{
    timestamp?: Date;
    previousBalance: number;
    newBalance: number;
    reason: string;
    comment?: string;
    commentedBy?: string;
    commentedAt?: Date;
  }>;
  canClose?: boolean;
  isReconciled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VaultTransactionDocument {
  _id: string;
  locationId: string;
  timestamp: Date;
  type:
    | 'vault_open'
    | 'payout'
    | 'float_increase'
    | 'machine_collection'
    | 'expense'
    | 'float_decrease'
    | 'cash_in'
    | 'cash_out'
    | 'transfer_in'
    | 'transfer_out'
    | 'inter_location_transfer'
    | 'reconciliation';
  from?: { type: string; id: string };
  to?: { type: string; id: string };
  fromName?: string;
  toName?: string;
  amount: number;
  denominations?: Array<{ value: number; count: number }>;
  vaultBalanceBefore?: number;
  vaultBalanceAfter?: number;
  cashierBalanceBefore?: number;
  cashierBalanceAfter?: number;
  vaultShiftId?: string;
  cashierShiftId?: string;
  floatRequestId?: string;
  payoutId?: string;
  performedBy?: string;
  performedByName?: string;
  notes?: string;
  reason?: string;
  auditComment?: string;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
  };
  expenseDetails?: {
    vendor?: string;
    invoiceNumber?: string;
    machineDetails?: string;
    machineIds?: string[];
    isMachineRepair?: boolean;
    description?: string;
  };
  attachmentId?: unknown;
  attachmentName?: string | unknown;
  isVoid?: boolean;
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: Date;
  createdAt: Date;
  [key: string]: unknown;
}
