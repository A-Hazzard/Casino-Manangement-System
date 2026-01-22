/**
 * VAULT Mock Data
 *
 * Static mock data for VAULT application components.
 * All data is prop-driven and can be easily replaced with API calls.
 */

import type {
  CashDesk,
  CashierFloat,
  ExtendedVaultTransaction,
  FloatTransaction,
  VaultBalance,
  VaultMetrics,
  VaultTransfer,
  VaultTransaction,
} from '@/shared/types/vault';

// ============================================================================
// Mock Data Exports
// ============================================================================
/**
 * Mock vault balance data
 * Used for development and testing before API integration
 */
export const mockVaultBalance: VaultBalance = {
  balance: 125000,
  lastAudit: 'Today, 8:00 AM',
  managerOnDuty: 'Jake Johnson',
};

/**
 * Mock vault metrics data
 * Contains vault balance, machine cash, desk float, and total on premises
 */
export const mockVaultMetrics: VaultMetrics = {
  vaultBalance: 125000,
  machineCash: 45000,
  deskFloat: 8500,
  totalOnPremises: 178500,
};

/**
 * Mock cash desks data
 * Contains cash desk information including name, cashier, float, and status
 */
export const mockCashDesks: CashDesk[] = [
  {
    id: '1',
    name: 'Main Floor',
    cashier: 'Penny H.',
    float: 5000,
    status: 'open',
  },
  {
    id: '2',
    name: 'VIP Area',
    cashier: 'Jake J.',
    float: 8000,
    status: 'closed',
  },
];

/**
 * Mock vault transactions data
 * Contains recent transaction history with date, type, user, amount, and status
 */
export const mockTransactions: VaultTransaction[] = [
  {
    id: '1',
    date: '10:05 AM',
    type: 'Drop',
    user: 'Kento M.',
    amount: 10000,
    status: 'completed',
    notes: 'Machine collection from floor',
  },
  {
    id: '2',
    date: '09:30 AM',
    type: 'Float Increase',
    user: 'Penny H.',
    amount: -500,
    status: 'pending',
    notes: 'Increase Main Floor float',
  },
  {
    id: '3',
    date: '08:15 AM',
    type: 'Expense',
    user: 'Kento M.',
    amount: -120,
    status: 'completed',
    notes: 'Printer paper purchase',
  },
  {
    id: '4',
    date: '10:45 AM',
    type: 'Float Increase',
    user: 'System',
    amount: -2500,
    status: 'completed',
    notes: 'VIP Area float increase',
  },
  {
    id: '5',
    date: '9:30 AM',
    type: 'Bank Transfer',
    user: 'Jake J.',
    amount: -15000,
    status: 'completed',
    notes: 'Daily bank deposit',
  },
  {
    id: '6',
    date: '8:15 AM',
    type: 'Treasury Deposit',
    user: 'Kento M.',
    amount: 25000,
    status: 'pending',
    notes: 'Treasury deposit pending verification',
  },
];

/**
 * Extended mock transactions for transaction history page
 * Contains additional fields: source, destination, denominations, and notes
 */
export const mockExtendedTransactions: ExtendedVaultTransaction[] = [
  {
    id: '1',
    date: '2024-01-20 10:45 AM',
    type: 'Treasury Deposit',
    user: 'Kento M.',
    amount: 25000,
    status: 'completed',
    source: 'Treasury Deposit',
    destination: 'Vault',
    denominations: '$1x50, $5x50, $10x50, $20x75, $50x100, $100x200',
    notes: 'Weekly treasury dep',
  },
  {
    id: '2',
    date: '2024-01-20 09:30 AM',
    type: 'Bank Transfer',
    user: 'Jake J.',
    amount: -15000,
    status: 'completed',
    source: 'Vault',
    destination: 'Bank Transfer',
    denominations: '$100x150',
    notes: 'Daily bank deposit',
  },
  {
    id: '3',
    date: '2024-01-20 08:15 AM',
    type: 'Machine Drop',
    user: 'Kento M.',
    amount: 12500,
    status: 'pending',
    source: 'Machine Soft Count',
    destination: 'Vault',
    denominations: '$1x100, $5x100, $10x100, $20x125, $50x100, $100x75',
    notes: 'Overnight machine',
  },
  {
    id: '4',
    date: '2024-01-19 11:20 PM',
    type: 'Expense',
    user: 'Kento M.',
    amount: -850,
    status: 'completed',
    source: 'Vault',
    destination: 'Maintenance',
    denominations: '-',
    notes: 'Emergency slot mac',
  },
];

/**
 * Mock cashier floats data
 * Contains cashier information with station, current float, and status
 */
export const mockCashierFloats: CashierFloat[] = [
  {
    id: '1',
    cashier: 'Sarah Johnson',
    station: 'Desk 1',
    currentFloat: 8500,
    status: 'active',
  },
  {
    id: '2',
    cashier: 'Mike Chen',
    station: 'Desk 2',
    currentFloat: 7200,
    status: 'active',
  },
  {
    id: '3',
    cashier: 'Emma Wilson',
    station: 'Desk 3',
    currentFloat: 9100,
    status: 'active',
  },
  {
    id: '4',
    cashier: 'David Brown',
    station: 'Desk 4',
    currentFloat: 0,
    status: 'inactive',
  },
];

/**
 * Mock float transactions data
 * Contains float increase/decrease transactions with cashier, station, and reason
 */
export const mockFloatTransactions: FloatTransaction[] = [
  {
    id: '1',
    dateTime: '20/01/2024 10:30:00 am',
    cashier: 'Sarah Johnson',
    station: 'Desk 1',
    type: 'Increase',
    amount: 2500,
    reason: 'High volume expected for weekend',
    status: 'pending',
  },
  {
    id: '2',
    dateTime: '20/01/2024 9:45:00 am',
    cashier: 'Mike Chen',
    station: 'Desk 2',
    type: 'Decrease',
    amount: -1000,
    reason: 'End of shift return',
    status: 'completed',
  },
];

/**
 * Mock vault transfers data
 * Contains transfer records between vault locations with initiation and approval info
 */
export const mockVaultTransfers: VaultTransfer[] = [
  {
    id: '1',
    dateTime: '20/01/2024 6:30:00 am',
    from: 'Main Vault',
    to: 'Cashier Desk 1',
    amount: 5000,
    initiatedBy: 'Vault Manager',
    approvedBy: 'Floor Supervisor',
    status: 'completed',
    notes: 'Float replenishm...',
  },
  {
    id: '2',
    dateTime: '20/01/2024 12:15:00 pm',
    from: 'Cashier Desk 2',
    to: 'Main Vault',
    amount: 3000,
    initiatedBy: 'Mike Chen',
    status: 'pending',
    notes: 'End of shift return',
  },
];
