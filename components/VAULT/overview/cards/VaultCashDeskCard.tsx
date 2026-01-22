/**
 * Vault Cash Desk Card Component
 *
 * Card component for displaying cash desk status with open/closed indicators.
 *
 * Features:
 * - Cash desk name
 * - Cashier name
 * - Float amount
 * - Status indicator (open/closed)
 * - Color-coded status badges
 *
 * @module components/VAULT/cards/VaultCashDeskCard
 */
'use client';

import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { CashDesk } from '@/shared/types/vault';
import { cn } from '@/lib/utils';

type VaultCashDeskCardProps = {
  cashDesk: CashDesk;
};

export default function VaultCashDeskCard({
  cashDesk,
}: VaultCashDeskCardProps) {
  // ============================================================================
  // Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Computed Values
  // ============================================================================
  /**
   * Check if cash desk is currently open
   */
  const isOpen = cashDesk.status === 'open';

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <Card className="w-full rounded-lg bg-container shadow-md transition-shadow hover:shadow-md">
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-4">
          {/* Header with Name and Status */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="min-w-0 break-words text-lg font-semibold text-gray-900">
              {cashDesk.name}
            </h3>
            <Badge
              className={cn(
                'flex-shrink-0 px-3 py-1',
                isOpen
                  ? 'bg-green-100 text-green-800 hover:bg-green-100'
                  : 'bg-red-100 text-red-800 hover:bg-red-100'
              )}
            >
              {isOpen ? 'OPEN' : 'CLOSED'}
            </Badge>
          </div>

          {/* Cashier */}
          <div>
            <p className="text-sm font-medium text-gray-600">Cashier</p>
            <p className="break-words text-base text-gray-900">{cashDesk.cashier}</p>
          </div>

          {/* Float */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-600">Float</p>
            <p className="break-words text-xl font-bold text-gray-900">
              {formatAmount(cashDesk.float)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
