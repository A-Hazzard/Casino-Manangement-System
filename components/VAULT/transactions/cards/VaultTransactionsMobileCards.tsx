/**
 * Vault Transactions Mobile Cards Component
 *
 * Mobile-friendly card view for displaying vault transactions.
 * Used on mobile and tablet screens (below lg breakpoint).
 *
 * Features:
 * - Card layout optimized for mobile viewing
 * - Transaction type badges
 * - Amount with color coding (green for positive, orange for negative)
 * - Status indicators
 * - Responsive grid: 1 column on mobile, 2 columns on md
 *
 * @module components/VAULT/transactions/cards/VaultTransactionsMobileCards
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent } from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type {
  ExtendedVaultTransaction,
  VaultTransactionType,
} from '@/shared/types/vault';
import { cn } from '@/lib/utils';

type VaultTransactionsMobileCardsProps = {
  transactions: ExtendedVaultTransaction[];
  getTransactionTypeBadge: (type: VaultTransactionType) => React.ReactNode;
};

/**
 * Vault Transactions Mobile Cards
 * Displays transactions in a card grid layout for mobile/tablet screens
 */
export default function VaultTransactionsMobileCards({
  transactions,
  getTransactionTypeBadge,
}: VaultTransactionsMobileCardsProps) {
  // ============================================================================
  // Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Render
  // ============================================================================
  if (transactions.length === 0) {
    return (
      <div className="rounded-lg bg-container p-8 text-center shadow-md">
        <p className="text-gray-500">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="block lg:hidden">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {transactions.map(tx => {
          const isPositive = tx.amount > 0;

          return (
            <Card
              key={tx._id}
              className="overflow-hidden rounded-lg bg-container shadow-md"
            >
              <CardContent className="p-4">
                {/* Header: Date and Status */}
                <div className="mb-3 flex items-start justify-between border-b pb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(tx.timestamp).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {tx.performedByName || 'System'}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      'px-2 py-1 text-xs',
                      !tx.isVoid
                        ? 'bg-button text-white hover:bg-button/90'
                        : 'bg-orangeHighlight text-white hover:bg-orangeHighlight/90'
                    )}
                  >
                    {!tx.isVoid ? 'Completed' : 'Voided'}
                  </Badge>
                </div>

                {/* Type Badge */}
                <div className="mb-3">{getTransactionTypeBadge(tx.type)}</div>

                {/* Amount */}
                <div className="mb-3">
                  <p className="text-xs text-gray-500">Amount</p>
                  <p
                    className={cn(
                      'text-xl font-bold',
                      isPositive ? 'text-button' : 'text-orangeHighlight'
                    )}
                  >
                    {isPositive ? '+' : ''}
                    {formatAmount(Math.abs(tx.amount))}
                  </p>
                </div>

                {/* Source and Destination */}
                <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Source</p>
                    <p className="font-medium text-gray-900">
                      {tx.fromName || tx.from.type || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Destination</p>
                    <p className="font-medium text-gray-900">
                      {tx.toName || tx.to.type || '-'}
                    </p>
                  </div>
                </div>

                {/* Denominations */}
                {tx.denominations && tx.denominations.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500">Denominations</p>
                    <p className="text-sm font-medium text-gray-900">
                      {tx.denominations
                        .map(d => `$${d.denomination}x${d.quantity}`)
                        .join(', ')}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {tx.notes && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-gray-500">Notes</p>
                    <p className="text-sm text-gray-700">{tx.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
