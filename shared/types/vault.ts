/**
 * Vault System Type Definitions
 *
 * Shared types for vault management, cashier operations, and transactions.
 * These types align with the Mongoose models and FRD requirements.
 */

// ============================================================================
// Common Types
// ============================================================================

export type Denomination = {
  denomination: 1 | 2 | 5 | 10 | 20 | 50 | 100 | 500 | 1000 | 5000;
  quantity: number;
};

export type MovementEndpoint = {
  type: 'vault' | 'cashier' | 'machine' | 'external';
  id?: string;
};

export type DenominationBreakdown = {
  hundred: number;
  fifty: number;
  twenty: number;
  ten: number;
  five: number;
  two: number;
  one: number;
};

export type CashSource = 'Bank Withdrawal' | 'Owner Injection' | 'Machine Drop';
export type CashDestination = 'Bank Deposit' | 'Owner Drawing' | 'ATM Fill';
export type ExpenseCategory =
  | 'Supplies'
  | 'Repairs'
  | 'Bills'
  | 'Licenses'
  | 'Other';

// ============================================================================
// Vault Shift Types (VM-1)
// ============================================================================

export type VaultShiftStatus = 'active' | 'closed';

export type VaultReconciliation = {
  timestamp: Date;
  previousBalance: number;
  newBalance: number;
  denominations: Denomination[];
  reason: string;
  comment: string; // Mandatory for audit
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
  currentDenominations?: Denomination[]; // Tracks live inventory
  closingBalance?: number;
  closingDenominations?: Denomination[];
  reconciliations: VaultReconciliation[];
  canClose: boolean; // BR-01
  isReconciled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// Cashier Shift Types (C-1, C-4)
// ============================================================================

export type CashierShiftStatus = 'pending_start' | 'active' | 'closed' | 'pending_review' | 'cancelled';

export type CashierShift = {
  _id: string;
  locationId: string;
  cashierId: string;
  vaultShiftId: string;
  status: CashierShiftStatus;
  openedAt: Date;
  closedAt?: Date;

  // Opening
  openingBalance: number;
  openingDenominations: Denomination[];

  // Closing - Blind Close (C-4)
  cashierEnteredBalance?: number;
  cashierEnteredDenominations?: Denomination[];
  expectedClosingBalance?: number;
  closingBalance?: number;
  closingDenominations?: Denomination[];

  // Discrepancy
  discrepancy?: number;
  discrepancyResolved: boolean;
  vmReviewNotes?: string;
  vmAdjustedBalance?: number;
  reviewedBy?: string;
  reviewedAt?: Date;

  // Denomination tracking (Synced only on float movements)
  lastSyncedDenominations?: Denomination[];
  currentBalance: number;

  // Metrics (Synced from model)
  payoutsTotal: number;
  payoutsCount: number;
  floatAdjustmentsTotal: number;

  notes?: string; // Additional notes for shift resolution or denial
  createdAt: Date;
  updatedAt: Date;
  cashierName?: string;
  cashierUsername?: string;
};

// ============================================================================
// Transaction Types (BR-03)
// ============================================================================

export type TransactionType =
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
  | 'expense';

export type VaultTransaction = {
  _id: string;
  locationId: string;
  timestamp: Date;
  type: TransactionType;

  // Movement
  from: MovementEndpoint;
  to: MovementEndpoint;

  amount: number;
  denominations: Denomination[];

  // Balance tracking
  vaultBalanceBefore?: number;
  vaultBalanceAfter?: number;
  cashierBalanceBefore?: number;
  cashierBalanceAfter?: number;

  // References
  vaultShiftId?: string;
  cashierShiftId?: string;
  floatRequestId?: string;
  payoutId?: string;

  // Audit
  performedBy: string;
  notes?: string;
  auditComment?: string;

  // Attachments
  attachmentId?: string;
  attachmentName?: string;

  // Immutability
  isVoid: boolean;
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: Date;

  createdAt: Date;

};

// Machine collection creation
export type CreateMachineCollectionRequest = {
  machineId: string;
  machineName?: string;
  amount: number;
  denominations: Denomination[];
  notes?: string;
};

export type CreateMachineCollectionResponse = {
  success: boolean;
  collection: MachineCollection;
  transaction: VaultTransaction;
};

// Soft count creation
export type CreateSoftCountRequest = {
  amount: number;
  denominations: Denomination[];
  notes?: string;
};

export type CreateSoftCountResponse = {
  success: boolean;
  softCount: SoftCount;
  transaction: VaultTransaction;
};

// Inter-location transfer creation
export type CreateInterLocationTransferRequest = {
  fromLocationId: string;
  toLocationId: string;
  amount: number;
  denominations: Denomination[];
  notes?: string;
};

export type CreateInterLocationTransferResponse = {
  success: boolean;
  transfer: InterLocationTransfer;
};

// Transfer approval
export type ApproveInterLocationTransferRequest = {
  transferId: string;
  approved: boolean;
  notes?: string;
};

export type ApproveInterLocationTransferResponse = {
  success: boolean;
  transfer: InterLocationTransfer;
  transaction?: VaultTransaction;
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

  // Request
  requestedAmount: number;
  requestedDenominations: Denomination[];
  requestNotes?: string;
  requestedAt: Date;

  // Approval
  status: FloatRequestStatus;
  approvedAmount?: number;
  approvedDenominations?: Denomination[];
  processedBy?: string;
  processedAt?: Date;
  vmNotes?: string;

  // Transaction reference
  transactionId?: string;

  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// Payout Types (C-2)
// ============================================================================

export type PayoutType = 'ticket' | 'hand_pay';

export type Payout = {
  _id: string;
  locationId: string;
  cashierId: string;
  cashierShiftId: string;

  type: PayoutType;
  amount: number;

  ticketNumber?: string;
  ticketBarcode?: string;
  printedAt?: Date; // Date on the physical ticket

  // Hand pay
  machineId?: string;
  reason?: string;

  // Validation
  validated: boolean;
  validationMethod?: string;

  // Audit
  timestamp: Date;
  cashierFloatBefore: number;
  cashierFloatAfter: number;

  // Transaction reference
  transactionId: string;

  notes?: string;
  createdAt: Date;
};

// ============================================================================
// Machine Collections & Soft Counts Types (VM-4)
// ============================================================================

export type MachineCollection = {
  _id: string;
  locationId: string;
  machineId: string;
  machineName?: string;
  collectedAt: Date;
  amount: number;
  denominations: Denomination[];
  collectedBy: string;
  transactionId: string;
  notes?: string;
  createdAt: Date;
};

export type SoftCount = {
  _id: string;
  locationId: string;
  countedAt: Date;
  amount: number;
  denominations: Denomination[];
  countedBy: string;
  transactionId: string;
  notes?: string;
  createdAt: Date;
};

// ============================================================================
// Inter-Location Transfers Types
// ============================================================================

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

// Vault initialization
export type InitializeVaultRequest = {
  locationId: string;
  openingBalance: number;
  denominations: Denomination[];
  notes?: string;
};

export type InitializeVaultResponse = {
  success: boolean;
  vaultShift: VaultShift;
  transaction: VaultTransaction;
  logId?: string;
};

// Vault shift open
export type OpenVaultShiftRequest = {
  locationId: string;
  openingBalance: number;
  denominations: Denomination[];
};

// Vault shift close
export type CloseVaultShiftRequest = {
  vaultShiftId: string;
  closingBalance: number;
  denominations: Denomination[];
};

// Vault reconciliation
export type ReconcileVaultRequest = {
  vaultShiftId: string;
  newBalance: number;
  denominations: Denomination[];
  reason: string;
  comment: string; // Mandatory
};

// Cashier shift open
export type OpenCashierShiftRequest = {
  locationId: string;
  requestedFloat: number;
  denominations: Denomination[];
};

// Cashier shift close (Blind Close - C-4)
export type CloseCashierShiftRequest = {
  shiftId: string;
  physicalCount: number;
  denominations: Denomination[];
};

export type CloseCashierShiftResponse = 
  | { success: true; status: 'closed' | 'pending_review'; message: string; }
  | { success: false; error: string; };

// Float request approval
export type ApproveFloatRequest = {
  floatRequestId: string;
  status: 'approved' | 'denied' | 'edited';
  approvedAmount?: number;
  approvedDenominations?: Denomination[];
  vmNotes?: string;
};

// Payout creation
export type CreatePayoutRequest = {
  cashierShiftId: string;
  type: PayoutType;
  amount: number;
  ticketNumber?: string;
  printedAt?: string; // ISO date string
  machineId?: string;
  reason?: string;
  notes?: string;
};

// ============================================================================
// Dashboard/UI Types
// ============================================================================

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
};

export type CashDesk = {
  _id: string;
  locationId: string;
  name: string;
  cashierName?: string;
  balance: number;
  denominations?: Denomination[];
  lastAudit: string;
  managerOnDuty?: string;
  status: 'active' | 'inactive';
};

export type CashierFloat = {
  _id: string;
  cashierId: string;
  cashierName: string;
  balance: number;
  lastActivity: string;
  shiftStartTime: string;
  status: 'active' | 'inactive';
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
  drops: number;
  fills: number;
};

// This seems to be a more detailed version of VaultTransaction
export type ExtendedVaultTransaction = VaultTransaction & {
  fromName?: string;
  toName?: string;
  performedByName?: string;
};

// This seems to be the same as ExtendedVaultTransaction but with a different name
export type FloatTransaction = ExtendedVaultTransaction;

// This seems to be a more detailed version of VaultTransaction
export type VaultTransactionType = TransactionType;

export type ActiveCashierInfo = {
  cashierId: string;
  cashierName: string;
  shiftId: string;
  currentFloat: number;
  shiftStartTime: Date;
  payoutsCount: number;
  payoutsTotal: number;
};

export type PendingFloatRequestInfo = {
  requestId: string;
  cashierId: string;
  cashierName: string;
  type: FloatRequestType;
  requestedAmount: number;
  requestedDenominations: Denomination[];
  requestedAt: Date;
  requestNotes?: string;
};

export type UnbalancedShiftInfo = {
  shiftId: string;
  cashierId: string;
  cashierName: string;
  expectedBalance: number;
  enteredBalance: number;
  enteredDenominations: Denomination[];
  discrepancy: number;
  closedAt: Date;
};
