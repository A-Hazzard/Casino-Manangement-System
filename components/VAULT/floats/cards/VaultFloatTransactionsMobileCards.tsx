/**
 * Vault Float Transactions Mobile Cards Component
 *
 * Mobile-friendly card view for displaying float transactions.
 * Used on mobile and tablet screens (below lg breakpoint).
 *
 * Features:
 * - Card layout optimized for mobile viewing
 * - Transaction type badges (Increase/Decrease)
 * - Amount with color coding
 * - Status indicators
 * - Action buttons for pending transactions
 * - Responsive grid: 1 column on mobile, 2 columns on md
 *
 * @module components/VAULT/floats/cards/VaultFloatTransactionsMobileCards
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import type { FloatTransaction } from '@/shared/types/vault';
import { CheckCircle2, Clock, Minus, Plus } from 'lucide-react';

type VaultFloatTransactionsMobileCardsProps = {
  transactions: FloatTransaction[];
  onApprove?: (transactionId: string) => void;
  onReject?: (transactionId: string) => void;
  showActions?: boolean;
  disabled?: boolean;
};

/**
 * Vault Float Transactions Mobile Cards
 * Displays float transactions in a card grid layout for mobile/tablet screens
 */
export default function VaultFloatTransactionsMobileCards({
  transactions,
  onApprove,
  onReject,
  showActions = false,
  disabled = false,
}: VaultFloatTransactionsMobileCardsProps) {
  // ============================================================================
  // Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Render
  // ============================================================================
  if (transactions.length === 0) {
    return (
      <div className="block rounded-lg bg-container p-8 text-center shadow-md lg:hidden">
        <p className="text-gray-500">No float transactions found</p>
      </div>
    );
  }

  return (
    <div className="block lg:hidden">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {transactions.map(tx => {
          const isInflow = tx.type === 'float_increase' || tx.type === 'cashier_shift_open';
          const isCompleted = !tx.isVoid;

          const getLabel = (type: string) => {
            switch (type) {
              case 'float_increase': return 'Increase';
              case 'float_decrease': return 'Decrease';
              case 'cashier_shift_open': return 'Shift Open';
              case 'payout': return 'Payout';
              default: return type.replace(/_/g, ' ');
            }
          };

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
                      {new Date(tx.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {tx.performedByName || (isInflow ? tx.toName : tx.fromName)}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      'px-2 py-1 text-xs',
                      isCompleted
                        ? 'bg-button text-white hover:bg-button/90'
                        : 'bg-orangeHighlight text-white hover:bg-orangeHighlight/90'
                    )}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Approved
                      </>
                    ) : (
                      <>
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </>
                    )}
                  </Badge>
                </div>

                {/* Type Badge */}
                <div className="mb-3">
                  <Badge
                    className={cn(
                      'px-2 py-1 capitalize',
                      isInflow
                        ? 'bg-button text-white hover:bg-button/90'
                        : 'bg-lighterBlueHighlight text-white hover:bg-lighterBlueHighlight/90'
                    )}
                  >
                    {isInflow ? (
                      <Plus className="mr-1 h-3 w-3" />
                    ) : (
                      <Minus className="mr-1 h-3 w-3" />
                    )}
                    {getLabel(tx.type)}
                  </Badge>
                </div>

                {/* Amount */}
                <div className="mb-3">
                  <p className="text-xs text-gray-500">Amount</p>
                  <p
                    className={cn(
                      'text-xl font-bold',
                      isInflow ? 'text-button' : 'text-lighterBlueHighlight'
                    )}
                  >
                    {isInflow ? '+' : '-'}
                    {formatAmount(Math.abs(tx.amount))}
                  </p>
                </div>

                {/* Reason */}
                <div className="mb-3 border-t pt-3">
                  <p className="text-xs text-gray-500">Reason</p>
                  <p className="text-sm text-gray-700">{tx.notes}</p>
                </div>

                {/* Actions */}
                {showActions && !isCompleted && (
                  <div className="mt-3 flex gap-2 border-t pt-3">
                    <Button
                      onClick={() => !disabled && onApprove?.(tx._id)}
                      disabled={disabled}
                      size="sm"
                      className={cn("flex-1 bg-button text-white hover:bg-button/90", disabled && "opacity-40 cursor-not-allowed")}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => !disabled && onReject?.(tx._id)}
                      disabled={disabled}
                      size="sm"
                      variant="destructive"
                      className={cn("flex-1", disabled && "opacity-40 cursor-not-allowed")}
                    >
                      <Minus className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
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
