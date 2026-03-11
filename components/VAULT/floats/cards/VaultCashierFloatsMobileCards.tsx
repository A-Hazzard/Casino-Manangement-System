/**
 * Vault Cashier Floats Mobile Cards Component
 *
 * Mobile-friendly card view for displaying cashier floats.
 * Used on mobile and tablet screens (below lg breakpoint) via VaultFloatTransactionsPageContent.
 * Mirrors the columns of VaultCashierFloatsTable: Cashier, Opening Float, Payouts, Shift Time.
 *
 * @module components/VAULT/floats/cards/VaultCashierFloatsMobileCards
 */
'use client';

import { Card, CardContent } from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { CashierFloat } from '@/shared/types/vault';
import { Clock, User } from 'lucide-react';

type VaultCashierFloatsMobileCardsProps = {
  floats: CashierFloat[];
};

/**
 * Vault Cashier Floats Mobile Cards
 * Displays cashier floats in a card grid layout for mobile/tablet screens.
 * Color scheme matches VaultCashierFloatsTable: payouts use text-orangeHighlight.
 */
export default function VaultCashierFloatsMobileCards({
  floats,
}: VaultCashierFloatsMobileCardsProps) {
  const { formatAmount } = useCurrencyFormat();

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
          <Card key={float._id} className="overflow-hidden border-l-4 border-l-button shadow-sm">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                  <User className="h-5 w-5 text-button" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-900 truncate max-w-[150px]">{float.cashierName}</span>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>
                      {float.openedAt
                        ? new Date(float.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>

            <div className="grid grid-cols-2 gap-2 border-t bg-gray-50/50 px-4 py-3">
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">Opening</span>
                <span className="text-xs font-bold text-gray-600 truncate">
                  {formatAmount(float.openingBalance || 0)}
                </span>
              </div>
              <div className="flex flex-col border-l border-gray-100 pl-3">
                <span className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">Payouts</span>
                <span className="text-xs font-bold text-orangeHighlight truncate">
                  {formatAmount(float.payoutsTotal || 0)}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
