/**
 * Vault Float Requests Mobile Cards Component
 *
 * Mobile-friendly card view for displaying float requests.
 * Used on mobile and tablet screens (below lg breakpoint).
 *
 * Features:
 * - Card layout optimized for mobile viewing
 * - Request type badges (Increase/Decrease)
 * - Amount and float information
 * - Reason display
 * - Action buttons for pending requests
 * - Responsive grid: 1 column on mobile, 2 columns on md
 *
 * @module components/VAULT/cashier/float-requests/cards/VaultFloatRequestsMobileCards
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { CheckCircle2, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type FloatRequest = {
  id: string;
  cashier: string;
  station: string;
  type: 'Increase' | 'Decrease';
  amount: number;
  currentFloat?: number;
  newFloat?: number;
  reason?: string;
  requested?: string;
  processed?: string;
  processedBy?: string;
  status?: 'completed' | 'pending';
};

type VaultFloatRequestsMobileCardsProps = {
  requests: FloatRequest[];
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
  showActions?: boolean;
};

/**
 * Vault Float Requests Mobile Cards
 * Displays float requests in a card grid layout for mobile/tablet screens
 */
export default function VaultFloatRequestsMobileCards({
  requests,
  onApprove,
  onReject,
  showActions = false,
}: VaultFloatRequestsMobileCardsProps) {
  // ============================================================================
  // Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Render
  // ============================================================================
  if (requests.length === 0) {
    return (
      <div className="block rounded-lg bg-container p-8 text-center shadow-md lg:hidden">
        <p className="text-gray-500">No float requests found</p>
      </div>
    );
  }

  return (
    <div className="block lg:hidden">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {requests.map(request => {
          const isIncrease = request.type === 'Increase';
          const isCompleted = request.status === 'completed';

          return (
            <Card key={request.id} className="overflow-hidden rounded-lg bg-container shadow-md">
              <CardContent className="p-4">
                {/* Header: Cashier and Status */}
                <div className="mb-3 flex items-start justify-between border-b pb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {request.cashier} / {request.station}
                    </p>
                    {request.requested && (
                      <p className="text-xs text-gray-500">Requested: {request.requested}</p>
                    )}
                  </div>
                  {request.status && (
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
                        'Pending'
                      )}
                    </Badge>
                  )}
                </div>

                {/* Type Badge */}
                <div className="mb-3">
                  <Badge
                    className={cn(
                      'px-2 py-1',
                      isIncrease
                        ? 'bg-orangeHighlight text-white hover:bg-orangeHighlight/90'
                        : 'bg-lighterBlueHighlight text-white hover:bg-lighterBlueHighlight/90'
                    )}
                  >
                    {isIncrease ? (
                      <>
                        <Plus className="mr-1 h-3 w-3" />
                        Increase
                      </>
                    ) : (
                      <>
                        <Minus className="mr-1 h-3 w-3" />
                        Decrease
                      </>
                    )}
                  </Badge>
                </div>

                {/* Amount */}
                <div className="mb-3">
                  <p className="text-xs text-gray-500">Amount</p>
                  <p
                    className={cn(
                      'text-xl font-bold',
                      isIncrease ? 'text-button' : 'text-lighterBlueHighlight'
                    )}
                  >
                    {isIncrease ? '+' : ''}
                    {formatAmount(Math.abs(request.amount))}
                  </p>
                </div>

                {/* Current and New Float */}
                {request.currentFloat !== undefined && request.newFloat !== undefined && (
                  <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Current Float</p>
                      <p className="font-medium text-gray-900">
                        {formatAmount(request.currentFloat)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">New Float</p>
                      <p className="font-semibold text-orangeHighlight">
                        {formatAmount(request.newFloat)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Reason */}
                {request.reason && (
                  <div className="mb-3 border-t pt-3">
                    <p className="text-xs text-gray-500">Reason</p>
                    <p className="text-sm text-gray-700">{request.reason}</p>
                  </div>
                )}

                {/* Processed Info */}
                {request.processed && (
                  <div className="mb-3 border-t pt-3">
                    <p className="text-xs text-gray-500">Processed</p>
                    <p className="text-sm text-gray-700">{request.processed}</p>
                    {request.processedBy && (
                      <p className="text-xs text-gray-500">By: {request.processedBy}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                {showActions && !isCompleted && (
                  <div className="mt-3 flex gap-2 border-t pt-3">
                    <Button
                      onClick={() => onApprove?.(request.id)}
                      size="sm"
                      className="flex-1 bg-button text-white hover:bg-button/90"
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => onReject?.(request.id)}
                      size="sm"
                      variant="destructive"
                      className="flex-1"
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
