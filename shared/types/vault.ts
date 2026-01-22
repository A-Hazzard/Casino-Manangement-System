/**
 * VAULT Application Types
 *
 * Type definitions for Vault Management application components and data structures.
 */

/**
 * Vault transaction types
 */
export type VaultTransactionType =
  | 'Drop'
  | 'Machine Drop'
  | 'Float Increase'
  | 'Float Decrease'
  | 'Expense'
  | 'Bank Transfer'
  | 'Treasury Deposit';

/**
 * Transaction status
 */
export type TransactionStatus = 'completed' | 'pending';

/**
 * Cash desk status
 */
export type CashDeskStatus = 'open' | 'closed';

/**
 * Vault transaction data structure
 */
export type VaultTransaction = {
  id: string;
  date: string;
  type: VaultTransactionType;
  user: string;
  amount: number;
  status: TransactionStatus;
  notes?: string;
};

/**
 * Cash desk data structure
 */
export type CashDesk = {
  id: string;
  name: string;
  cashier: string;
  float: number;
  status: CashDeskStatus;
};

/**
 * Denomination breakdown for cash movements
 */
export type DenominationBreakdown = {
  hundred: number;
  fifty: number;
  twenty: number;
  ten: number;
  five: number;
  one: number;
};

/**
 * Cash movement source types
 */
export type CashSource =
  | 'Bank Withdrawal'
  | 'Owner Injection'
  | 'Machine Drop';

/**
 * Cash movement destination types
 */
export type CashDestination =
  | 'Bank Deposit'
  | 'Owner Draw'
  | 'Float Increase';

/**
 * Expense category types
 */
export type ExpenseCategory =
  | 'Stationery'
  | 'Cleaning'
  | 'Maintenance'
  | 'F&B';

/**
 * Vault balance information
 */
export type VaultBalance = {
  balance: number;
  lastAudit: string;
  managerOnDuty: string;
};

/**
 * Vault metrics data
 */
export type VaultMetrics = {
  vaultBalance: number;
  machineCash: number;
  deskFloat: number;
  totalOnPremises: number;
};

/**
 * Extended transaction type for transaction history page
 */
export type ExtendedVaultTransaction = VaultTransaction & {
  source?: string;
  destination?: string;
  denominations?: string;
};

/**
 * Float transaction type
 */
export type FloatTransactionType = 'Increase' | 'Decrease';

/**
 * Float transaction data structure
 */
export type FloatTransaction = {
  id: string;
  dateTime: string;
  cashier: string;
  station: string;
  type: FloatTransactionType;
  amount: number;
  reason: string;
  status: TransactionStatus;
};

/**
 * Cashier float data structure
 */
export type CashierFloat = {
  id: string;
  cashier: string;
  station: string;
  currentFloat: number;
  status: 'active' | 'inactive';
};

/**
 * Transfer data structure
 */
export type VaultTransfer = {
  id: string;
  dateTime: string;
  from: string;
  to: string;
  amount: number;
  initiatedBy: string;
  approvedBy?: string;
  status: TransactionStatus;
  notes?: string;
};
