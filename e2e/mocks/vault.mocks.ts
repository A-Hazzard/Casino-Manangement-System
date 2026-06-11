/**
 * Mock payloads for VAULT-mode API routes.
 *
 * Shared foundation for the vault e2e specs. Endpoints + response shapes were
 * derived from lib/helpers/vaultHelpers.ts and the VAULT page hooks.
 *
 * Key endpoints:
 *   GET /api/vault/balance?locationId=        → { success, data: VaultBalance }
 *   GET /api/vault/metrics?locationId=        → { success, metrics }
 *   GET /api/vault/transactions?locationId=   → { success, items|transactions, total, totalPages }
 *   GET /api/vault/float-request?status=      → { success, floatRequests | data }
 *   GET /api/vault/transfers?locationId=      → { success, transfers, total, totalPages }
 *   GET /api/vault/overview/global            → { success, data: {...} }
 *   GET /api/cashier/shifts?status=           → { success, shifts }
 *   GET /api/vault/expenses?locationId=       → { success, expenses | items }
 *   GET /api/vault/cash-desks?locationId=     → { success, cashDesks | data }
 *
 * NOTE: A vault-manager resolves its active licencee via useVaultLicencee
 * (assignedLicencees[0]); the page passes that id through as the locationId
 * query param. A broad api/vault catch-all returning success is the simplest
 * safety net — register specific routes AFTER it for LIFO priority.
 */

// ─── Vault balance ──────────────────────────────────────────────────────────

export const MOCK_VAULT_BALANCE = {
  success: true,
  data: {
    locationId: 'loc_001',
    totalBalance: 250_000,
    availableBalance: 180_000,
    floatAllocated: 70_000,
    currency: 'TTD',
    canClose: false,
    blockReason: null,
    managerOnDuty: 'E2E VaultManager',
    lastReconciliation: new Date('2026-01-01T08:00:00.000Z').toISOString(),
    isInitialized: true,
    denominations: [
      { denomination: 100, count: 1_500, total: 150_000 },
      { denomination: 50, count: 1_000, total: 50_000 },
      { denomination: 20, count: 2_500, total: 50_000 },
    ],
  },
  timestamp: new Date().toISOString(),
};

// ─── Vault metrics ────────────────────────────────────────────────────────────

export const MOCK_VAULT_METRICS = {
  success: true,
  metrics: {
    totalInflow: 320_000,
    totalOutflow: 140_000,
    totalExpenses: 12_000,
    netChange: 180_000,
    transactionCount: 42,
    activeCashiers: 3,
    pendingFloatRequests: 1,
    pendingShiftReviews: 0,
  },
  timestamp: new Date().toISOString(),
};

// ─── Vault transactions ───────────────────────────────────────────────────────

export const MOCK_VAULT_TRANSACTION_1 = {
  _id: 'vtx_001',
  type: 'add_cash',
  amount: 50_000,
  status: 'completed',
  timestamp: new Date('2026-01-01T09:00:00.000Z').toISOString(),
  performedByName: 'E2E VaultManager',
  fromName: 'External',
  toName: 'Vault',
  notes: 'Opening top-up',
  currency: 'TTD',
};

export const MOCK_VAULT_TRANSACTION_2 = {
  _id: 'vtx_002',
  type: 'float_issue',
  amount: 20_000,
  status: 'completed',
  timestamp: new Date('2026-01-01T10:00:00.000Z').toISOString(),
  performedByName: 'E2E VaultManager',
  fromName: 'Vault',
  toName: 'Cashier',
  notes: 'Morning float',
  currency: 'TTD',
};

export const MOCK_VAULT_TRANSACTIONS = {
  success: true,
  items: [MOCK_VAULT_TRANSACTION_1, MOCK_VAULT_TRANSACTION_2],
  transactions: [MOCK_VAULT_TRANSACTION_1, MOCK_VAULT_TRANSACTION_2],
  total: 2,
  totalPages: 1,
  timestamp: new Date().toISOString(),
};

export const MOCK_VAULT_TRANSACTIONS_EMPTY = {
  success: true,
  items: [],
  transactions: [],
  total: 0,
  totalPages: 0,
  timestamp: new Date().toISOString(),
};

// ─── Cashier shifts ───────────────────────────────────────────────────────────

export const MOCK_CASHIER_SHIFT_1 = {
  _id: 'shift_001',
  cashierId: 'cash_001',
  cashierName: 'E2E Cashier',
  cashierUsername: 'cashier',
  locationId: 'loc_001',
  status: 'active',
  openingBalance: 20_000,
  expectedClosingBalance: 22_500,
  startedAt: new Date('2026-01-01T08:00:00.000Z').toISOString(),
};

export const MOCK_CASHIER_SHIFTS = {
  success: true,
  shifts: [MOCK_CASHIER_SHIFT_1],
  timestamp: new Date().toISOString(),
};

export const MOCK_CASHIER_SHIFTS_EMPTY = {
  success: true,
  shifts: [],
  timestamp: new Date().toISOString(),
};

// ─── Float requests ───────────────────────────────────────────────────────────

export const MOCK_FLOAT_REQUEST_1 = {
  _id: 'float_001',
  cashierId: 'cash_001',
  cashierName: 'E2E Cashier',
  locationId: 'loc_001',
  amount: 15_000,
  status: 'pending',
  requestedAt: new Date('2026-01-01T08:30:00.000Z').toISOString(),
  currency: 'TTD',
};

export const MOCK_FLOAT_REQUESTS = {
  success: true,
  floatRequests: [MOCK_FLOAT_REQUEST_1],
  data: [MOCK_FLOAT_REQUEST_1],
  total: 1,
  totalPages: 1,
  timestamp: new Date().toISOString(),
};

export const MOCK_FLOAT_REQUESTS_EMPTY = {
  success: true,
  floatRequests: [],
  data: [],
  total: 0,
  totalPages: 0,
  timestamp: new Date().toISOString(),
};

// ─── Transfers ────────────────────────────────────────────────────────────────

export const MOCK_VAULT_TRANSFERS = {
  success: true,
  transfers: [
    {
      _id: 'xfer_001',
      fromLocationName: 'Grand Casino North',
      toLocationName: 'South Bay Gaming',
      amount: 30_000,
      status: 'completed',
      createdAt: new Date('2026-01-01T11:00:00.000Z').toISOString(),
      currency: 'TTD',
    },
  ],
  total: 1,
  totalPages: 1,
  timestamp: new Date().toISOString(),
};

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const MOCK_VAULT_EXPENSES = {
  success: true,
  expenses: [
    {
      _id: 'exp_001',
      category: 'Maintenance',
      amount: 5_000,
      description: 'SMIB repairs',
      status: 'approved',
      date: new Date('2026-01-01T12:00:00.000Z').toISOString(),
      currency: 'TTD',
    },
  ],
  items: [],
  total: 1,
  totalPages: 1,
  timestamp: new Date().toISOString(),
};

// ─── Cash desks ───────────────────────────────────────────────────────────────

export const MOCK_CASH_DESKS = {
  success: true,
  cashDesks: [
    {
      _id: 'desk_001',
      name: 'Cash Desk 1',
      locationId: 'loc_001',
      status: 'active',
      assignedCashier: 'E2E Cashier',
      balance: 20_000,
      currency: 'TTD',
    },
  ],
  data: [],
  timestamp: new Date().toISOString(),
};

// ─── Global overview (multi-location vault managers / admins) ──────────────────

export const MOCK_VAULT_OVERVIEW_GLOBAL = {
  success: true,
  data: {
    totalBalance: 250_000,
    locations: [
      {
        locationId: 'loc_001',
        locationName: 'Grand Casino North',
        balance: 250_000,
        currency: 'TTD',
      },
    ],
    metrics: MOCK_VAULT_METRICS.metrics,
  },
  timestamp: new Date().toISOString(),
};
