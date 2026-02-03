/**
 * View Denominations Modal
 * 
 * Displays the denomination breakdown for a specific cash desk or vault.
 * 
 * @module components/VAULT/overview/modals/ViewDenominationsModal
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
import { Coins } from 'lucide-react';

type ViewDenominationsModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  denominations: Denomination[];
  totalAmount: number;
};

export default function ViewDenominationsModal({
  open,
  onClose,
  title,
  denominations = [],
  totalAmount,
}: ViewDenominationsModalProps) {
  const { formatAmount } = useCurrencyFormat();

  // Ensure all denominations are present even if quantity is 0
  const standardDenoms = [100, 50, 20, 10, 5, 1];
  const displayDenoms = standardDenoms.map(val => {
    const found = denominations.find(d => d.denomination === val);
    return {
      denomination: val,
      quantity: found ? found.quantity : 0
    };
  });

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Coins className="h-5 w-5 text-emerald-600" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-4">
            {displayDenoms.map((d) => (
              <div 
                key={d.denomination} 
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
              >
                <span className="text-sm font-medium text-gray-500">${d.denomination}</span>
                <span className="text-lg font-bold text-gray-900">x {d.quantity}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-emerald-900">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold opacity-80">Total Balance</span>
              <span className="text-xl font-black text-emerald-600">
                {formatAmount(totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
