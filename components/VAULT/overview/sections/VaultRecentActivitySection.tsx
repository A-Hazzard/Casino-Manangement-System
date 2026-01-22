/**
 * Vault Recent Activity Section Component
 *
 * Section wrapper for the recent transactions table.
 *
 * Features:
 * - Section header
 * - Transactions table
 * - Empty state handling
 *
 * @module components/VAULT/sections/VaultRecentActivitySection
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import VaultTransactionsTable from '@/components/VAULT/transactions/tables/VaultTransactionsTable';
import type { VaultTransaction, VaultTransactionType } from '@/shared/types/vault';
import { ArrowDown, ArrowUp, Receipt } from 'lucide-react';

type VaultRecentActivitySectionProps = {
  transactions: VaultTransaction[];
};

/**
 * Get badge component for transaction type
 * Returns appropriate badge with icon and color based on transaction type
 *
 * @param type - Transaction type
 * @returns Badge component with appropriate styling
 */
function getTransactionTypeBadge(type: VaultTransactionType) {
  if (type === 'Treasury Deposit' || type === 'Machine Drop' || type === 'Drop') {
    return (
      <Badge className="bg-button text-white hover:bg-button/90">
        <ArrowUp className="mr-1 h-3 w-3" />
        Inflow
      </Badge>
    );
  }
  if (type === 'Bank Transfer' || type === 'Float Increase' || type === 'Float Decrease') {
    return (
      <Badge className="bg-orangeHighlight text-white hover:bg-orangeHighlight/90">
        <ArrowDown className="mr-1 h-3 w-3" />
        Outflow
      </Badge>
    );
  }
  if (type === 'Expense') {
    return (
      <Badge className="bg-red-600 text-white hover:bg-red-600/90">
        <Receipt className="mr-1 h-3 w-3" />
        Expense
      </Badge>
    );
  }
  return <Badge>{type}</Badge>;
}

export default function VaultRecentActivitySection({
  transactions,
}: VaultRecentActivitySectionProps) {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
      </div>

      <VaultTransactionsTable
        transactions={transactions}
        getTransactionTypeBadge={getTransactionTypeBadge}
      />
    </div>
  );
}
