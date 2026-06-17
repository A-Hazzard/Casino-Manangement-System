/**
 * Vault Calculation Helpers
 *
 * Pure utility functions for vault calculations and formatting extracted
 * from lib/helpers/vaultHelpers.ts to reduce its size.
 *
 * @module lib/helpers/vault/vaultCalculationHelpers
 */

import type {
  CashierFloat,
  DenominationBreakdown,
  FloatRequest,
  SoftCount,
  VaultBalance,
  VaultMetrics,
  VaultTransfer,
} from '@/shared/types/vault';
import type { NotificationItem } from '@/components/shared/ui/NotificationBell';

// ============================================================================
// Password Generation
// ============================================================================

/**
 * Generate a temporary password for new cashiers
 */
export function generateTempPassword(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let charIndex = 0; charIndex < 12; charIndex++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ============================================================================
// End-of-Day Metrics
// ============================================================================

/**
 * Calculate end-of-day report metrics from raw report data
 */
export function calculateEndOfDayMetrics(reportData: {
  denominationBreakdown: DenominationBreakdown;
  midDaySoftCounts: SoftCount[];
  endOfDaySoftCounts: SoftCount[];
  cashierFloats: CashierFloat[];
  vaultBalance: VaultBalance;
  floatRequests: FloatRequest[];
  metrics?: VaultMetrics | null;
}) {
  const {
    denominationBreakdown,
    midDaySoftCounts,
    endOfDaySoftCounts,
    cashierFloats,
    vaultBalance,
    floatRequests,
    metrics: apiMetrics,
  } = reportData;

  const totalDenominationValue = Object.entries(denominationBreakdown).reduce(
    (sum, [denom, count]) => sum + Number(denom) * count,
    0
  );

  const totalDenominationCount = Object.values(denominationBreakdown).reduce(
    (sum, countItem) => sum + countItem,
    0
  );

  const midDaySum = midDaySoftCounts.reduce(
    (sum, softCountItem) => sum + (softCountItem.amount || 0),
    0
  );
  const endOfDaySum = endOfDaySoftCounts.reduce(
    (sum, softCountItem) => sum + (softCountItem.amount || 0),
    0
  );
  const totalMachineBalance = midDaySum + endOfDaySum;

  const totalCashierFloat = cashierFloats.reduce(
    (sum, floatItem) => sum + (floatItem.balance || 0),
    0
  );

  const totalFloatRequests = floatRequests.reduce(
    (sum, requestItem) => sum + (requestItem.requestedAmount || 0),
    0
  );

  const totalInflows = apiMetrics?.totalCashIn || 0;
  const totalOutflows = apiMetrics?.totalCashOut || 0;
  const totalExpenses =
    (apiMetrics as (VaultMetrics & { expenses?: number }) | null | undefined)
      ?.expenses || 0;
  const totalPayouts = apiMetrics?.payouts || 0;

  return {
    totalDenominationValue,
    totalDenominationCount,
    totalMachineBalance,
    totalCashierFloat,
    totalCashDeskFloat: totalCashierFloat,
    totalFloatRequests,
    vaultBalance: vaultBalance?.balance || 0,
    totalOnPremises:
      (vaultBalance?.balance || 0) + totalMachineBalance + totalCashierFloat,
    systemBalance: vaultBalance?.balance || 0,
    totalInflows,
    totalOutflows,
    totalExpenses,
    totalPayouts,
    physicalCount: vaultBalance?.physicalCount ?? (vaultBalance?.balance || 0),
    variance: vaultBalance?.variance || 0,
    floatRequestsCount: floatRequests.length,
  };
}

// ============================================================================
// Transfer Sorting
// ============================================================================

/**
 * Sort vault transfers by a given field and direction
 */
export function sortTransfers(
  transfers: VaultTransfer[],
  sortOption: string,
  sortOrder: 'asc' | 'desc'
) {
  return [...transfers].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortOption) {
      case 'date':
        aValue = new Date(a.date || a.createdAt || '').getTime();
        bValue = new Date(b.date || b.createdAt || '').getTime();
        break;
      case 'from':
        aValue = (a.from || '').toLowerCase();
        bValue = (b.from || '').toLowerCase();
        break;
      case 'to':
        aValue = (a.to || '').toLowerCase();
        bValue = (b.to || '').toLowerCase();
        break;
      case 'amount':
        aValue = a.amount;
        bValue = b.amount;
        break;
      case 'initiatedBy':
        aValue = (a.initiatedBy || '').toLowerCase();
        bValue = (b.initiatedBy || '').toLowerCase();
        break;
      case 'approvedBy':
        aValue = (a.approvedBy || '').toLowerCase();
        bValue = (b.approvedBy || '').toLowerCase();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
}

// ============================================================================
// Transaction Type Badge
// ============================================================================

/**
 * Get badge configuration for a transaction type.
 * Used by transaction history and audit trail components.
 *
 * @param type - Transaction type string
 * @returns Object with label, icon, and className for Badge component
 */
export function getTransactionTypeBadge(type: string): {
  label: string;
  icon: 'arrow-up' | 'arrow-down' | 'receipt' | 'none';
  className: string;
} {
  switch (type) {
    case 'vault_open':
      return {
        label: 'Vault Open',
        icon: 'none',
        className:
          'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50',
      };
    case 'vault_close':
      return {
        label: 'Outflow',
        icon: 'arrow-up',
        className: 'bg-red-600 text-white hover:bg-red-600/90',
      };
    case 'cashier_shift_open':
      return {
        label: 'Outflow',
        icon: 'arrow-up',
        className: 'bg-red-600 text-white hover:bg-red-600/90',
      };
    case 'cashier_shift_close':
      return {
        label: 'Cashier Shift Close',
        icon: 'none',
        className:
          'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-50',
      };
    case 'float_increase':
      return {
        label: 'Outflow',
        icon: 'arrow-up',
        className: 'bg-red-600 text-white hover:bg-red-600/90',
      };
    case 'float_decrease':
      return {
        label: 'Inflow',
        icon: 'arrow-down',
        className: 'bg-button text-white hover:bg-button/90',
      };
    case 'payout':
      return {
        label: 'Outflow',
        icon: 'arrow-up',
        className: 'bg-red-600 text-white hover:bg-red-600/90',
      };
    case 'machine_collection':
      return {
        label: 'Inflow',
        icon: 'arrow-down',
        className: 'bg-button text-white hover:bg-button/90',
      };
    case 'soft_count':
      return {
        label: 'Inflow',
        icon: 'arrow-down',
        className: 'bg-button text-white hover:bg-button/90',
      };
    case 'expense':
      return {
        label: 'Expense',
        icon: 'receipt',
        className: 'bg-red-600 text-white hover:bg-red-600/90',
      };
    case 'vault_reconciliation':
      return {
        label: 'Vault Reconciliation',
        icon: 'none',
        className:
          'bg-violet-50 text-violet-700 border-violet-100 hover:bg-violet-50',
      };
    case 'add_cash':
      return {
        label: 'Inflow',
        icon: 'arrow-down',
        className: 'bg-button text-white hover:bg-button/90',
      };
    case 'remove_cash':
      return {
        label: 'Outflow',
        icon: 'arrow-up',
        className: 'bg-red-600 text-white hover:bg-red-600/90',
      };
    default:
      return {
        label: type
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        icon: 'none',
        className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-50',
      };
  }
}

// ============================================================================
// Notification & Export Helpers
// ============================================================================

/**
 * Handle notification click actions for different notification types
 */
export function handleNotificationClick(notification: NotificationItem) {
  switch (notification.type) {
    case 'shift_review':
      console.log('Navigate to shift review:', notification);
      break;
    case 'float_request':
      console.log('Navigate to float requests:', notification);
      break;
    default:
      console.log('Unknown notification type:', notification);
  }
}

/**
 * Handle PDF export (placeholder)
 */
export function handleExportPDF() {
  console.log('PDF export will be implemented');
}

/**
 * Handle CSV export (placeholder)
 */
export function handleExportCSV() {
  console.log('CSV export will be implemented');
}

/**
 * Handle print (placeholder)
 */
export function handlePrint() {
  console.log('Print functionality will be implemented');
}
