/**
 * Vault Close Shift Modal
 * 
 * Allows the Vault Manager to enter the final vault count and close the daily shift.
 * Implements BR-01: Cannot close if any cashier shifts are active or pending review.
 * 
 * @module components/VAULT/overview/modals/VaultCloseShiftModal
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import DenominationInputGrid from '@/components/shared/ui/DenominationInputGrid';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import { Label } from '@/components/shared/ui/label';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { Denomination } from '@/shared/types/vault';
import { AlertCircle, Landmark } from 'lucide-react';
import { useMemo, useState } from 'react';

type VaultCloseShiftModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (balance: number, denominations: Denomination[]) => Promise<void>;
  currentBalance: number;
  canClose: boolean;
  blockReason?: string;
  loading?: boolean;
};

const INITIAL_DENOMINATIONS: Denomination[] = [
  { denomination: 100, quantity: 0 },
  { denomination: 50, quantity: 0 },
  { denomination: 20, quantity: 0 },
  { denomination: 10, quantity: 0 },
  { denomination: 5, quantity: 0 },
  { denomination: 1, quantity: 0 },
];

export default function VaultCloseShiftModal({
  open,
  onClose,
  onConfirm,
  currentBalance,
  canClose,
  blockReason,
  loading = false,
}: VaultCloseShiftModalProps) {
  const { formatAmount } = useCurrencyFormat();
  const [denominations, setDenominations] = useState<Denomination[]>(INITIAL_DENOMINATIONS);

  const totalAmount = useMemo(() => {
    return denominations.reduce((sum, d) => sum + (d.denomination * d.quantity), 0);
  }, [denominations]);

  const matchesExpected = totalAmount === currentBalance;

  const handleSubmit = async () => {
    await onConfirm(totalAmount, denominations.filter(d => d.quantity > 0));
    setDenominations(INITIAL_DENOMINATIONS);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Landmark className="h-5 w-5 text-orange-600" />
            End of Day / Close Vault
          </DialogTitle>
          <DialogDescription>
            Perform final vault count and close the session. This will reconcile all transactions for the day.
          </DialogDescription>
        </DialogHeader>

        {!canClose ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertCircle className="h-4 w-4" />
              Closing Blocked
            </div>
            {blockReason || "Cannot close vault while cashier shifts are still Active or Pending Review."}
          </div>
        ) : (
          <div className="space-y-6 py-4">
             {/* Expected Balance Info */}
             <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 border border-gray-100">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Expected Closing Balance</p>
                  <p className="text-2xl font-black text-gray-900">{formatAmount(currentBalance)}</p>
                </div>
                <div className="text-right">
                   <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Physical Count</p>
                   <p className={`text-2xl font-black ${matchesExpected ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {formatAmount(totalAmount)}
                   </p>
                </div>
             </div>

             {/* Discrepancy Alert */}
             {!matchesExpected && totalAmount > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs text-orange-700 flex items-center gap-2">
                   <AlertCircle className="h-4 w-4" />
                   Discrepancy of {formatAmount(totalAmount - currentBalance)} detected.
                </div>
             )}

             {/* Denomination Grid */}
             <div className="space-y-2">
               <Label className="text-sm font-semibold text-gray-700">Enter Physical Count by Denominations</Label>
               <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <DenominationInputGrid
                    denominations={denominations}
                    onChange={setDenominations}
                    disabled={loading}
                  />
               </div>
             </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !canClose || totalAmount <= 0}
            className="bg-orangeHighlight hover:bg-orangeHighlight/90 text-white"
          >
            {loading ? 'Processing...' : 'Confirm & Close Vault'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
