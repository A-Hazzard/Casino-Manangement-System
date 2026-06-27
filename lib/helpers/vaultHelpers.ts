/**
 * Vault Helpers - Barrel Export
 *
 * Re-exports all vault helper functions from domain-specific modules.
 * This file maintains backward compatibility for existing imports.
 *
 * @module lib/helpers/vaultHelpers
 */

// Calculation helpers (from vaultCalculationHelpers.ts)
export {
  calculateEndOfDayMetrics,
  generateTempPassword,
  getTransactionTypeBadge,
  handleExportCSV,
  handleExportPDF,
  handleNotificationClick,
  handlePrint,
  sortTransfers,
} from './vault/vaultCalculationHelpers';

// Data fetching helpers (from vaultDataFetching.ts)
export {
  fetchAdvancedDashboardMetrics,
  fetchAuditTrail,
  fetchCashiersData,
  fetchEndOfDayReportData,
  fetchFloatTransactionsData,
  fetchGlobalVaultOverviewData,
  fetchLocationDetails,
  fetchVaultBalance,
  fetchVaultOverviewData,
  fetchVaultTransactions,
  fetchVaultTransfers,
  handleInitializeVault,
} from './vault/vaultDataFetching';

// Cashier operations helpers (from vaultCashierOps.ts)
export {
  handleCreateCashier,
  handleDeleteCashier,
  handleDirectOpenShift,
  handleIssueFloat,
  handleReceiveFloat,
  handleResetCashierPassword,
  handleUpdateCashierStatus,
} from './vault/vaultCashierOps';

// Transfer operations helpers (from vaultTransfers.ts)
export {
  handleApproveTransfer,
  handleRejectTransfer,
  handleTransferSubmit,
} from './vault/vaultTransfers';

// Event handlers helpers (from vaultEventHandlers.ts)
export {
  handleAddCash,
  handleApproveFloatTransaction,
  handleFloatAction,
  handleFloatConfirm,
  handleRecordExpense,
  handleReconcile,
  handleRejectFloatTransaction,
  handleRemoveCash,
  handleShiftResolve,
} from './vault/vaultEventHandlers';