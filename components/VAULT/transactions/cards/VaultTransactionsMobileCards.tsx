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
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';
import ViewDenominationsModal from '@/components/VAULT/transactions/modals/ViewDenominationsModal';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import { safeFormatDate } from '@/lib/utils/date/formatting';
import type {
    Denomination,
    ExtendedVaultTransaction,
    VaultTransactionType,
} from '@/shared/types/vault';
import { Eye } from 'lucide-react';
import { useState } from 'react';

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
  const [selectedTxDenominations, setSelectedTxDenominations] = useState<{
    denominations: Denomination[];
    amount: number;
  } | null>(null);

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
                      {safeFormatDate(tx.timestamp)}
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
                <div className="mb-3 min-w-0">
                  <p className="text-xs text-gray-500">Amount</p>
                  <p
                    className={cn(
                      'font-bold leading-none transition-all truncate',
                      isPositive ? 'text-button' : 'text-orangeHighlight',
                      formatAmount(Math.abs(tx.amount)).length > 12 ? 'text-lg' : 'text-xl'
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
                    <p className="text-xs text-gray-500 mb-1">Denominations</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs w-full justify-center"
                      onClick={() =>
                        setSelectedTxDenominations({
                          denominations: tx.denominations,
                          amount: Math.abs(tx.amount),
                        })
                      }
                    >
                      <Eye className="mr-2 h-3 w-3" />
                      View Denominations
                    </Button>
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


      <ViewDenominationsModal
        open={!!selectedTxDenominations}
        onClose={() => setSelectedTxDenominations(null)}
        denominations={selectedTxDenominations?.denominations || []}
        totalAmount={selectedTxDenominations?.amount || 0}
      />
    </div>
  );
}
