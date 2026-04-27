export type Denomination = {
  denomination: 1 | 2 | 5 | 10 | 20 | 50 | 100 | 500 | 1000 | 5000;
  quantity: number;
};

export type MovementEndpoint = {
  type: 'vault' | 'cashier' | 'machine' | 'external';
  id?: string;
};

export type Cashier = {
  _id: string;
  profile?: {
    firstName: string;
    lastName: string;
  };
  username: string;
  emailAddress: string;
  isEnabled: boolean;
  shiftStatus?: 'active' | 'pending_review' | 'pending_start' | 'closed' | 'inactive';
  currentBalance?: number;
  denominations?: Denomination[];
  discrepancy?: number;
  lastLoginAt?: string | Date;
  roles: string[];
  tempPassword?: string;
  tempPasswordChanged?: boolean;
};


export type CashSource = 'Bank' | 'Owner Deposit' | 'Machine';
export type ExpenseCategory =
  | 'Food/Drinks'
  | 'Repairs'
  | 'Bills'
  | 'Worker/Employee'
  | 'Bank Account'
  | 'Other';

export type VaultShiftStatus = 'active' | 'closed';

export type VaultReconciliation = {
  timestamp: Date;
  previousBalance: number;
  newBalance: number;
  denominations: Denomination[];
  reason: string;
  comment: string;
};

export type VaultShift = {
  _id: string;
  locationId: string;
  vaultManagerId: string;
  status: VaultShiftStatus;
  openedAt: Date;
  closedAt?: Date;
  openingBalance: number;
  openingDenominations: Denomination[];
  currentDenominations?: Denomination[];
  closingBalance?: number;
  closingDenominations?: Denomination[];
  reconciliations: VaultReconciliation[];
  canClose: boolean;
  isReconciled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type VaultShiftOverview = Pick<
  VaultShift,
  | '_id'
  | 'locationId'
  | 'closingBalance'
  | 'openingBalance'
  | 'currentDenominations'
  | 'openingDenominations'
>;

export type CashierShiftStatus = 'pending_start' | 'active' | 'closed' | 'pending_review' | 'cancelled';

export type CashierShift = {
  _id: string;
  locationId: string;
  cashierId: string;
  vaultShiftId: string;
  status: CashierShiftStatus;
  openedAt: Date;
  closedAt?: Date;

  openingBalance: number;
  openingDenominations: Denomination[];

  cashierEnteredBalance?: number;
  cashierEnteredDenominations?: Denomination[];
  expectedClosingBalance?: number;
  closingBalance?: number;
  closingDenominations?: Denomination[];

  discrepancy?: number;
  discrepancyResolved: boolean;
  vmReviewNotes?: string;
  vmAdjustedBalance?: number;
  reviewedBy?: string;
  reviewedAt?: Date;

  lastSyncedDenominations?: Denomination[];
  currentBalance: number;

  payoutsTotal: number;
  payoutsCount: number;
  floatAdjustmentsTotal: number;

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  cashierName?: string;
  cashierUsername?: string;
};

export type CashierShiftOverview = Pick<
  CashierShift,
  | '_id'
  | 'locationId'
  | 'cashierId'
  | 'cashierName'
  | 'cashierUsername'
  | 'status'
  | 'currentBalance'
  | 'openingBalance'
  | 'lastSyncedDenominations'
  | 'openingDenominations'
  | 'openedAt'
  | 'createdAt'
  | 'discrepancy'
>;

export type TransactionType =
  | 'vault_open'
  | 'vault_close'
  | 'vault_reconciliation'
  | 'cashier_shift_open'
  | 'cashier_shift_close'
  | 'float_increase'
  | 'float_decrease'
  | 'payout'
  | 'soft_count'
  | 'machine_collection'
  | 'expense'
  | 'add_cash'
  | 'remove_cash';

export type VaultTransaction = {
  _id: string;
  locationId: string;
  timestamp: Date;
  type: TransactionType;

  from: MovementEndpoint;
  to: MovementEndpoint;

  amount: number;
  denominations: Denomination[];

  vaultBalanceBefore?: number;
  vaultBalanceAfter?: number;
  cashierBalanceBefore?: number;
  cashierBalanceAfter?: number;

  vaultShiftId?: string;
  cashierShiftId?: string;
  floatRequestId?: string;
  payoutId?: string;

  performedBy: string;
  notes?: string;
  reason?: string;
  auditComment?: string;

  attachmentId?: string;
  attachmentName?: string;

  isVoid: boolean;
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: Date;

  paymentMethod?: 'cash' | 'bank';
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
    isMachineRepair?: boolean;
    machineIds?: string[];
    billerName?: string;
    billingPeriod?: string;
    referenceNumber?: string;
    description?: string;
    workerName?: string;
  };

  createdAt: Date;
  locationName?: string;
  fromName?: string;
  toName?: string;
};

export type VaultTransactionOverview = Pick<
  VaultTransaction,
  | '_id'
  | 'locationId'
  | 'performedBy'
  | 'from'
  | 'to'
  | 'type'
  | 'amount'
  | 'timestamp'
>;

export type EnrichedVaultTransactionOverview = VaultTransactionOverview & {
  locationName?: string;
  performedByName?: string;
  fromName?: string;
  toName?: string;
};



export type CreateInterLocationTransferRequest = {
  fromLocationId: string;
  toLocationId: string;
  amount: number;
  denominations: Denomination[];
  notes?: string;
};

export type ApproveInterLocationTransferRequest = {
  transferId: string;
  approved: boolean;
  notes?: string;
};

export type FloatRequestType = 'increase' | 'decrease';
export type FloatRequestStatus = 'pending' | 'approved' | 'approved_vm' | 'denied' | 'edited' | 'cancelled';

export type FloatRequest = {
  _id: string;
  locationId: string;
  cashierId: string;
  cashierShiftId: string;
  vaultShiftId: string;

  type: FloatRequestType;

  requestedAmount: number;
  requestedDenominations: Denomination[];
  requestNotes?: string;
  requestedAt: Date;

  status: FloatRequestStatus;
  approvedAmount?: number;
  approvedDenominations?: Denomination[];
  processedBy?: string;
  processedAt?: Date;
  vmNotes?: string;

  transactionId?: string;

  createdAt: Date;
  updatedAt: Date;
  locationName?: string;
  cashierName?: string;
};

export type PayoutType = 'ticket' | 'hand_pay';

export type SoftCount = {
  _id: string;
  locationId: string;
  machineId?: string;
  countedAt: Date;
  amount: number;
  denominations: Denomination[];
  countedBy: string;
  transactionId: string;
  notes?: string;
  isEndOfDay?: boolean;
  createdAt: Date;
};

export type InterLocationTransfer = {
  _id: string;
  fromLocationId: string;
  toLocationId: string;
  fromLocationName: string;
  toLocationName: string;
  amount: number;
  denominations: Denomination[];
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



export type OpenCashierShiftRequest = {
  locationId: string;
  requestedFloat: number;
  denominations: Denomination[];
};

export type CloseCashierShiftRequest = {
  shiftId: string;
  physicalCount: number;
  denominations: Denomination[];
};

export type CloseCashierShiftResponse =
  | { success: true; status: 'closed' | 'pending_review'; message: string; }
  | { success: false; error: string; };

export type CreatePayoutRequest = {
  cashierShiftId: string;
  type: PayoutType;
  amount: number;
  ticketNumber?: string;
  printedAt?: string;
  machineId?: string;
  reason?: string;
  notes?: string;
};

export type VaultBalance = {
  balance: number;
  denominations: Denomination[];
  lastReconciliation?: Date;
  activeShiftId?: string;
  lastAudit?: string;
  managerOnDuty?: string;
  canClose: boolean;
  blockReason?: string;
  totalCashOnPremises?: number;
  machineMoneyIn?: number;
  cashierFloats?: number;
  isInitial?: boolean;
  openingBalance?: number;
  isReconciled?: boolean;
  isCollectionDone?: boolean;
  openedAt?: Date;
  isStale?: boolean;
  physicalCount?: number;
  variance?: number;
};

export type CashDesk = {
  _id: string;
  cashierId?: string;
  locationId: string;
  name: string;
  cashierName?: string;
  balance: number;
  denominations?: Denomination[];
  lastAudit: string;
  managerOnDuty?: string;
  status: CashierShiftStatus;
  locationName?: string;
  openedAt?: string | Date;
  openingBalance?: number;
  payoutsTotal?: number;
};

export type CashierFloat = {
  _id: string;
  cashierId: string;
  cashierName: string;
  balance: number;
  lastActivity: string;
  shiftStartTime: string;
  status: 'active' | 'inactive';
  openedAt?: string | Date;
  closedAt?: string | Date;
  openingBalance?: number;
  payoutsTotal?: number;
};

export type VaultTransfer = {
  _id: string;
  date: string;
  createdAt?: string;
  from: string;
  to: string;
  amount: number;
  status: 'completed' | 'pending' | 'approved' | 'rejected' | 'cancelled';
  initiatedBy: string;
  approvedBy?: string;
  notes?: string;
};

export type VaultMetrics = {
  totalCashIn: number;
  totalCashOut: number;
  netCashFlow: number;
  payouts: number;
  payoutsCount?: number;
  drops: number;
  fills: number;
};

export type ExtendedVaultTransaction = VaultTransaction & {
  fromName?: string;
  toName?: string;
  performedByName?: string;
  locationName?: string;
  machineDetails?: Array<{
    identifier: string;
    game: string;
    gameType: string;
  }>;
};

export type FloatTransaction = ExtendedVaultTransaction;

export type VaultTransactionType = TransactionType;

export type UnbalancedShiftInfo = {
  shiftId: string;
  cashierId: string;
  cashierName: string;
  expectedBalance: number;
  enteredBalance: number;
  enteredDenominations: Denomination[];
  discrepancy: number;
  closedAt: Date;
  locationName?: string;
};

export type CollectionSessionEntry = {
  machineId: string;
  machineName: string;
  totalAmount: number;
  denominations: Denomination[];
  variance: number;
  expectedDrop: number;
  collectedAt: Date | string;
  notes?: string;
  meters?: {
    billIn: number;
    ticketIn: number;
    totalIn: number;
  };
};



export type MachineCollectionActivity = {
  _id: string;
  machineId: string;
  amount: number;
  timestamp: string | Date;
  performedBy: string | { username: string; _id: string };
  notes?: string;
  variance?: number;
};

export type DenominationBreakdown = Record<string, number>;

export type CreateFloatRequestRequest = {
  type: 'FLOAT_INCREASE' | 'FLOAT_DECREASE';
  requestedDenom: Denomination[];
  shiftId: string;
  locationId: string;
};

export type FloatRequestQueryParams = {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  cashierId?: string;
  locationId?: string;
  shiftId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type UpdatePayoutRequest = {
  amount?: number;
  notes?: string;
  status?: string;
};

