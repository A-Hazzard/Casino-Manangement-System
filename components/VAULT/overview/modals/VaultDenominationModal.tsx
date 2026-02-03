/**
 * Vault Denomination Modal Component
 *
 * A view-only modal to show the breakdown of currency for a specific shift or desk.
 *
 * @module components/VAULT/overview/modals/VaultDenominationModal
 */
'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { Denomination } from '@/shared/types/vault';
import { Banknote } from 'lucide-react';

type VaultDenominationModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  denominations: Denomination[];
  totalAmount: number;
};

export default function VaultDenominationModal({
  open,
  onClose,
  title,
  denominations,
  totalAmount,
}: VaultDenominationModalProps) {
  const { formatAmount } = useCurrencyFormat();

  // Filter out zero quantities for cleaner view
  const activeDenoms = denominations.filter((d) => d.quantity > 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-green-600" />
            <DialogTitle>{title} - Denominations</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Balance</p>
              <p className="text-2xl font-bold text-gray-900">{formatAmount(totalAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Status</p>
              <p className="text-sm font-semibold text-green-600">Active Float</p>
            </div>
          </div>

          <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden">
            {activeDenoms.length > 0 ? (
              activeDenoms.map((d) => (
                <div key={d.denomination} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold">
                      ${d.denomination}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {d.quantity} units
                      </p>
                      <p className="text-xs text-gray-500">
                        Bills/Coins
                      </p>
                    </div>
                  </div>
                  <p className="font-mono text-base font-semibold text-gray-900">
                    {formatAmount(d.denomination * d.quantity)}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-500 italic">No denominations recorded</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
