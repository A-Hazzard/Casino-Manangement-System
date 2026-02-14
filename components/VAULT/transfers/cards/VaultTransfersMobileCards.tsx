/**
 * Vault Transfers Mobile Cards Component
 *
 * Mobile-friendly card view for displaying vault transfers.
 * Used on mobile and tablet screens (below lg breakpoint).
 *
 * Features:
 * - Card layout optimized for mobile viewing
 * - Transfer from/to information
 * - Amount display
 * - Status indicators
 * - Action buttons (approve/reject for pending)
 * - Responsive grid: 1 column on mobile, 2 columns on md
 *
 * @module components/VAULT/transfers/cards/VaultTransfersMobileCards
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import type { VaultTransfer } from '@/shared/types/vault';
import { ArrowLeftRight, CheckCircle2 } from 'lucide-react';

type VaultTransfersMobileCardsProps = {
  transfers: VaultTransfer[];
  onApprove?: (transferId: string) => void;
  onReject?: (transferId: string) => void;
  showActions?: boolean;
};

/**
 * Vault Transfers Mobile Cards
 * Displays transfers in a card grid layout for mobile/tablet screens
 */
export default function VaultTransfersMobileCards({
  transfers,
  onApprove,
  onReject,
  showActions = false,
}: VaultTransfersMobileCardsProps) {
  // ============================================================================
  // Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Render
  // ============================================================================
  if (transfers.length === 0) {
    return (
      <div className="block rounded-lg bg-container p-8 text-center shadow-md lg:hidden">
        <p className="text-gray-500">No transfers found</p>
      </div>
    );
  }

  return (
    <div className="block lg:hidden">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {transfers.map(transfer => {
          const isCompleted = transfer.status === 'completed';

          return (
            <Card
              key={transfer._id}
              className="overflow-hidden rounded-lg bg-container shadow-md"
            >
              <CardContent className="p-4">
                {/* Header: Date and Status */}
                <div className="mb-3 flex items-start justify-between border-b pb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {transfer.date ||
                        (transfer.createdAt
                          ? new Date(transfer.createdAt).toLocaleDateString()
                          : '-')}
                    </p>
                    <p className="text-xs text-gray-500">
                      Initiated by: {transfer.initiatedBy}
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
                    {transfer.status === 'completed' ? 'Completed' : 'Pending'}
                  </Badge>
                </div>

                {/* Transfer Flow */}
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center gap-2 rounded border border-gray-200 bg-gray-50 p-2">
                      <ArrowLeftRight className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {transfer.from}
                      </span>
                    </div>
                    <ArrowLeftRight className="h-4 w-4 text-gray-400" />
                    <div className="flex flex-1 items-center gap-2 rounded border border-gray-200 bg-gray-50 p-2">
                      <ArrowLeftRight className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {transfer.to}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="mb-3 min-w-0">
                  <p className="text-xs text-gray-500">Amount</p>
                  <p className={cn(
                      "font-bold text-orangeHighlight leading-none transition-all truncate",
                      formatAmount(transfer.amount).length > 12 ? 'text-lg' : 'text-xl'
                  )}>
                    {formatAmount(transfer.amount)}
                  </p>
                </div>

                {/* Approved By */}
                {transfer.approvedBy && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500">Approved By</p>
                    <p className="text-sm font-medium text-gray-900">
                      {transfer.approvedBy}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {transfer.notes && (
                  <div className="mb-3 border-t pt-3">
                    <p className="text-xs text-gray-500">Notes</p>
                    <p className="text-sm text-gray-700">{transfer.notes}</p>
                  </div>
                )}

                {/* Actions */}
                {showActions && !isCompleted && (
                  <div className="mt-3 flex gap-2 border-t pt-3">
                    <Button
                      onClick={() => onApprove?.(transfer._id)}
                      size="sm"
                      className="flex-1 bg-button text-white hover:bg-button/90"
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => onReject?.(transfer._id)}
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                    >
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
