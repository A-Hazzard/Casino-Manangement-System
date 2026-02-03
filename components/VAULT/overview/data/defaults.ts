/**
 * Default Values for Vault Components
 *
 * Provides safe empty/initial states for UI components to use before data is fetched.
 * Replaces usage of mock data for initialization.
 */

import type { CashierFloat, VaultBalance, VaultMetrics } from '@/shared/types/vault';

export const DEFAULT_VAULT_BALANCE: VaultBalance = {
  balance: 0,
  denominations: [],
  lastReconciliation: undefined,
  activeShiftId: undefined,
  lastAudit: 'Never',
  managerOnDuty: 'Loading...',
  canClose: false,
};

export const DEFAULT_VAULT_METRICS: VaultMetrics = {
  totalCashIn: 0,
  totalCashOut: 0,
  netCashFlow: 0,
  payouts: 0,
  drops: 0,
  fills: 0,
};

export const DEFAULT_REPORT_DENOMINATIONS = [
  { denomination: '$100', count: 0, totalValue: 0 },
  { denomination: '$50', count: 0, totalValue: 0 },
  { denomination: '$20', count: 0, totalValue: 0 },
  { denomination: '$10', count: 0, totalValue: 0 },
  { denomination: '$5', count: 0, totalValue: 0 },
  { denomination: '$1', count: 0, totalValue: 0 },
];

export const DEFAULT_REPORT_SLOTS = [
  { machineId: 'Loading...', location: 'Loading...', closingCount: 0 },
];

export const DEFAULT_CASHIER_FLOATS: CashierFloat[] = [];
