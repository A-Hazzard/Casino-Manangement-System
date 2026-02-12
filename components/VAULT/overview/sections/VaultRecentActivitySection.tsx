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

import DebugSection from '@/components/shared/debug/DebugSection';
import { Badge } from '@/components/shared/ui/badge';
import VaultTransactionsTable from '@/components/VAULT/transactions/tables/VaultTransactionsTable';
import { formatActivityType } from '@/lib/utils/formatters';
import type {
    VaultTransaction,
    VaultTransactionType,
} from '@/shared/types/vault';
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
  if (type === 'soft_count' || type === 'machine_collection') {
    return (
      <Badge className="bg-button text-white hover:bg-button/90">
        <ArrowUp className="mr-1 h-3 w-3" />
        Inflow
      </Badge>
    );
  }
  if (
    type === 'vault_close' ||
    type === 'float_increase' ||
    type === 'float_decrease'
  ) {
    return (
      <Badge className="bg-orangeHighlight text-white hover:bg-orangeHighlight/90">
        <ArrowDown className="mr-1 h-3 w-3" />
        Outflow
      </Badge>
    );
  }
  if (type === 'expense') {
    return (
      <Badge className="bg-red-600 text-white hover:bg-red-600/90">
        <Receipt className="mr-1 h-3 w-3" />
        Expense
      </Badge>
    );
  }
  return <Badge>{formatActivityType(type)}</Badge>;
}

export default function VaultRecentActivitySection({
  transactions,
}: VaultRecentActivitySectionProps) {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <DebugSection title="Recent Activity Data" data={transactions} />
      </div>

      <VaultTransactionsTable
        transactions={transactions}
        getTransactionTypeBadge={getTransactionTypeBadge}
      />
    </div>
  );
}
