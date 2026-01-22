/**
 * Vault Cashier Floats Mobile Cards Component
 *
 * Mobile-friendly card view for displaying cashier floats.
 * Used on mobile and tablet screens (below lg breakpoint).
 *
 * Features:
 * - Card layout optimized for mobile viewing
 * - Cashier and station information
 * - Current float amount
 * - Status indicators
 * - Responsive grid: 1 column on mobile, 2 columns on md
 *
 * @module components/VAULT/floats/cards/VaultCashierFloatsMobileCards
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent } from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { CashierFloat } from '@/shared/types/vault';
import { cn } from '@/lib/utils';

type VaultCashierFloatsMobileCardsProps = {
  floats: CashierFloat[];
};

/**
 * Vault Cashier Floats Mobile Cards
 * Displays cashier floats in a card grid layout for mobile/tablet screens
 */
export default function VaultCashierFloatsMobileCards({
  floats,
}: VaultCashierFloatsMobileCardsProps) {
  // ============================================================================
  // Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Render
  // ============================================================================
  if (floats.length === 0) {
    return (
      <div className="block rounded-lg bg-container p-8 text-center shadow-md lg:hidden">
        <p className="text-gray-500">No cashier floats found</p>
      </div>
    );
  }

  return (
    <div className="block lg:hidden">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {floats.map(float => (
          <Card key={float.id} className="overflow-hidden rounded-lg bg-container shadow-md">
            <CardContent className="p-4">
              {/* Header: Cashier and Status */}
              <div className="mb-3 flex items-start justify-between border-b pb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{float.cashier}</p>
                  <p className="text-xs text-gray-500">Station: {float.station}</p>
                </div>
                <Badge
                  className={cn(
                    'px-2 py-1 text-xs',
                    float.status === 'active'
                      ? 'bg-orangeHighlight text-white hover:bg-orangeHighlight/90'
                      : 'bg-button text-white hover:bg-button/90'
                  )}
                >
                  {float.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {/* Current Float */}
              <div>
                <p className="text-xs text-gray-500">Current Float</p>
                <p className="text-xl font-bold text-orangeHighlight">
                  {formatAmount(float.currentFloat)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
