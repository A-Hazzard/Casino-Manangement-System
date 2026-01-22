/**
 * Vault Payouts Mobile Cards Component
 *
 * Mobile-friendly card view for displaying player payouts.
 * Used on mobile and tablet screens (below lg breakpoint).
 *
 * Features:
 * - Card layout optimized for mobile viewing
 * - Ticket number and amount display
 * - Player and cashier information
 * - Station badge
 * - Processed timestamp
 * - Notes
 * - Responsive grid: 1 column on mobile, 2 columns on md
 *
 * @module components/VAULT/cashier/payouts/cards/VaultPayoutsMobileCards
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent } from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { Users } from 'lucide-react';

type Payout = {
  id: string;
  ticketNumber: string;
  amount: number;
  player: string;
  cashier: string;
  station: string;
  processed: string;
  notes: string;
};

type VaultPayoutsMobileCardsProps = {
  payouts: Payout[];
};

/**
 * Vault Payouts Mobile Cards
 * Displays payouts in a card grid layout for mobile/tablet screens
 */
export default function VaultPayoutsMobileCards({
  payouts,
}: VaultPayoutsMobileCardsProps) {
  // ============================================================================
  // Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Render
  // ============================================================================
  if (payouts.length === 0) {
    return (
      <div className="block rounded-lg bg-container p-8 text-center shadow-md lg:hidden">
        <p className="text-gray-500">No payouts found</p>
      </div>
    );
  }

  return (
    <div className="block lg:hidden">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {payouts.map(payout => (
          <Card key={payout.id} className="overflow-hidden rounded-lg bg-container shadow-md">
            <CardContent className="p-4">
              {/* Header: Ticket Number */}
              <div className="mb-3 border-b pb-3">
                <p className="text-xs text-gray-500">Ticket Number</p>
                <p className="text-sm font-medium text-gray-900">{payout.ticketNumber}</p>
              </div>

              {/* Amount */}
              <div className="mb-3">
                <p className="text-xs text-gray-500">Amount</p>
                <p className="text-xl font-bold text-button">{formatAmount(payout.amount)}</p>
              </div>

              {/* Player */}
              <div className="mb-3">
                <p className="text-xs text-gray-500">Player</p>
                <p className="text-sm font-medium text-gray-900">{payout.player}</p>
              </div>

              {/* Cashier and Station */}
              <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Cashier</p>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-gray-400" />
                    <p className="font-medium text-gray-900">{payout.cashier}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Station</p>
                  <Badge className="bg-button text-white hover:bg-button/90">
                    {payout.station}
                  </Badge>
                </div>
              </div>

              {/* Processed */}
              <div className="mb-3 border-t pt-3">
                <p className="text-xs text-gray-500">Processed</p>
                <p className="text-sm text-gray-700">{payout.processed}</p>
              </div>

              {/* Notes */}
              {payout.notes && (
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-500">Notes</p>
                  <p className="text-sm text-gray-700">{payout.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
