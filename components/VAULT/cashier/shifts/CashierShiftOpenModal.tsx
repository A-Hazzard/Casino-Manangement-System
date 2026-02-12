/**
 * Cashier Shift Open Modal Component
 *
 * Modal for opening a new cashier shift by requesting initial float.
 * Allows cashier to specify requested float denominations.
 *
 * @module components/VAULT/cashier/shifts/CashierShiftOpenModal
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
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { getDenominationValues } from '@/lib/utils/vault/denominations';
import type { Denomination } from '@/shared/types/vault';
import { AlertTriangle, Coins } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type CashierShiftOpenModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (denominations: Denomination[]) => Promise<void>;
  hasActiveVaultShift: boolean;
  isVaultReconciled: boolean;
  loading?: boolean;
};



export default function CashierShiftOpenModal({
  open,
  onClose,
  onSubmit,
  hasActiveVaultShift,
  isVaultReconciled,
  loading = false,
}: CashierShiftOpenModalProps) {
  const { formatAmount } = useCurrencyFormat();
  const { selectedLicencee } = useDashBoardStore();
  const { user } = useUserStore();
  const [step, setStep] = useState<'input' | 'review'>('input');

  // Use user's assigned licensee if available (Cashier context), otherwise dashboard selection (Admin context)
  const effectiveLicenseeId = useMemo(() => {
    return user?.assignedLicensees?.[0] || selectedLicencee;
  }, [user?.assignedLicensees, selectedLicencee]);

  const denomsList = useMemo(() => getDenominationValues(effectiveLicenseeId), [effectiveLicenseeId]);

  const [denominations, setDenominations] = useState<Denomination[]>([]);

  // Update denominations when licensee changes or modal opens
  useEffect(() => {
    if (open && step === 'input') {
      setDenominations(denomsList.map(denom => ({ 
        denomination: denom as Denomination['denomination'], 
        quantity: 0 
      })));
    }
  }, [denomsList, open, step]);

  const totalAmount = denominations.reduce(
    (sum, d) => sum + d.denomination * d.quantity,
    0
  );



  const handleClose = () => {
    setStep('input');
    onClose();
  };

  const handleReview = () => {
    if (!hasActiveVaultShift || !isVaultReconciled) return;
    
    const filteredDenominations = denominations.filter(d => d.quantity > 0);
    if (filteredDenominations.length === 0) {
      alert('Please specify at least one denomination with quantity > 0');
      return;
    }
    setStep('review');
  };

  const handleSubmit = async () => {
    const filteredDenominations = denominations.filter(d => d.quantity > 0);
    try {
      await onSubmit(filteredDenominations);
      handleClose();
      // Reset form
      setDenominations(
        denomsList.map(denom => ({
          denomination: denom as Denomination['denomination'],
          quantity: 0,
        }))
      );
    } catch {
      // Error handled by parent
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-violet-50 border-b border-violet-100">
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            <Coins className="h-5 w-5 text-violet-600" />
            {step === 'input' ? 'Start New Shift' : 'Review Float Request'}
          </DialogTitle>
          <DialogDescription className="text-violet-700/80">
            {step === 'input' 
              ? 'Request your opening float by specifying the denominations you need.'
              : 'Please verify your float request breakdown before submitting.'}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {!hasActiveVaultShift && (
            <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-xs text-red-700 border border-red-100 mb-2 shadow-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
              <p className="leading-tight">
                <strong className="block uppercase tracking-widest text-[10px] mb-0.5">Cannot Start Shift</strong> No active Vault Manager shift found at this location.
              </p>
            </div>
          )}

          {hasActiveVaultShift && !isVaultReconciled && (
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4 text-xs text-amber-700 border border-amber-100 mb-2 shadow-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              <p className="leading-tight">
                <strong className="block uppercase tracking-widest text-[10px] mb-0.5">Reconciliation Pending</strong> The vault manager must reconcile the vault before you can start your shift.
              </p>
            </div>
          )}

          {step === 'input' ? (
            <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
                <DenominationInputGrid 
                    denominations={denominations}
                    onChange={setDenominations}
                    disabled={loading}
                />
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-widest text-[10px]">Denomination</th>
                            <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-widest text-[10px]">Count</th>
                            <th className="px-4 py-3 text-right font-bold text-gray-500 uppercase tracking-widest text-[10px]">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {denominations.filter(d => d.quantity > 0).map(d => (
                            <tr key={d.denomination} className="bg-white">
                                <td className="px-4 py-3 font-semibold text-gray-700">${d.denomination}</td>
                                <td className="px-4 py-3 text-center font-mono font-medium text-gray-600">{d.quantity}</td>
                                <td className="px-4 py-3 text-right font-bold text-gray-900">${d.denomination * d.quantity}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-violet-50/50 border-t border-violet-100">
                        <tr>
                            <td colSpan={2} className="px-4 py-3 font-black text-violet-900 text-right uppercase tracking-wide text-xs">Total Request</td>
                            <td className="px-4 py-3 text-right font-black text-violet-700">{formatAmount(totalAmount)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
          )}

          {step === 'input' && (
            <div className="rounded-2xl p-5 bg-gradient-to-br from-violet-600 to-purple-700 shadow-xl shadow-violet-500/20 text-white relative overflow-hidden">
                <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-violet-100/60">Total Opening request</span>
                    <p className="text-white/60 text-[10px] font-medium italic">Sum of specified denominations</p>
                </div>
                <span className="text-3xl font-black text-white tracking-tight">
                    {formatAmount(totalAmount)}
                </span>
                </div>
                <Coins className="absolute -right-4 -bottom-4 h-24 w-24 text-white/5 rotate-12" />
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-gray-50 border-t border-gray-100 flex gap-2">
          {step === 'input' ? (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={loading}
                className="font-black text-gray-500 hover:bg-gray-100/50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleReview}
                disabled={loading || totalAmount === 0 || !hasActiveVaultShift || !isVaultReconciled}
                className="bg-violet-600 text-white hover:bg-violet-700 font-black shadow-lg shadow-violet-600/20 px-8 ml-auto"
              >
                Review Request
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep('input')}
                disabled={loading}
                className="font-black text-gray-500 hover:bg-gray-100/50"
              >
                Back to Edit
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="bg-green-600 text-white hover:bg-green-700 font-black shadow-lg shadow-green-600/20 px-8 ml-auto"
              >
                {loading ? 'Confirming...' : 'Confirm & Request'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
