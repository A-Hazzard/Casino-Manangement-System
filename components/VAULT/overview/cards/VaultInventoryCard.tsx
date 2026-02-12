/**
 * Vault Inventory Card Component
 *
 * Displays a detailed breakdown of bills/denominations in the vault.
 * Alerts users when specific denominations are running low.
 *
 * Features:
 * - Grid display of bills (100, 50, 20, 10, 5, 1)
 * - Quantity and Value for each count
 * - Visual warning for low stock
 *
 * @module components/VAULT/overview/cards/VaultInventoryCard
 */
'use client';

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { getDenominationValues } from '@/lib/utils/vault/denominations';
import type { Denomination } from '@/shared/types/vault';
import { AlertTriangle, Layers } from 'lucide-react';
import { useMemo } from 'react';

type VaultInventoryCardProps = {
  denominations: Denomination[];
  isLoading?: boolean;
};

// Thresholds for "Low Stock" warning (customizable)
const LOW_STOCK_THRESHOLD = 20; // Warn if fewer than 20 bills

export default function VaultInventoryCard({
  denominations,
  isLoading = false,
}: VaultInventoryCardProps) {
  const { formatAmount } = useCurrencyFormat();
  const { selectedLicencee } = useDashBoardStore();

  // Normalize denominations to ensure all slots exist even if 0
  const normalizedDenoms = useMemo(() => {
    const map = new Map<number, number>();
    const denomsList = getDenominationValues(selectedLicencee);
    (denominations || []).forEach(d => map.set(d.denomination, d.quantity));

    const result = denomsList.map(val => ({
      value: val,
      quantity: map.get(val) || 0,
      total: val * (map.get(val) || 0),
      isLow: (map.get(val) || 0) < LOW_STOCK_THRESHOLD,
    }));

    return result;
  }, [denominations, selectedLicencee]);

  const totalBills = normalizedDenoms.reduce(
    (acc, curr) => acc + curr.quantity,
    0
  );

  return (
    <Card className="w-full rounded-lg bg-container shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg text-gray-700 sm:text-xl">
            Vault Inventory
          </CardTitle>
          <Layers className="h-4 w-4 text-gray-400" />
        </div>
        <div className="text-xs text-gray-500">
          Total Notes: <span className="font-medium text-gray-900">{totalBills}</span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
            {normalizedDenoms.map(item => (
              <div
                key={item.value}
                className={`group relative flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-colors ${
                  item.isLow
                    ? 'border-red-200 bg-red-50/50'
                    : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50'
                }`}
              >
                {item.isLow && item.quantity > 0 && (
                  <div className="absolute right-1 top-1">
                    <AlertTriangle className="h-3 w-3 text-red-400" />
                  </div>
                )}
                
                <span className="text-xs font-medium text-gray-400 uppercase tracking-tighter">
                  ${item.value} Bills
                </span>
                
                <span className={`text-2xl font-bold ${
                    item.isLow ? 'text-red-700' : 'text-gray-900'
                }`}>
                  {item.quantity}
                </span>
                
                <span className="text-xs font-medium text-gray-500">
                  {formatAmount(item.total)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
