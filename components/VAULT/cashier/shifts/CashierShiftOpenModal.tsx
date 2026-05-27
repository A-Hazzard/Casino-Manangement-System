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
import { useVaultLicencee } from '@/lib/hooks/vault/useVaultLicencee';
import { getDenominationValues } from '@/lib/utils/vault/denominations';
import type { Denomination } from '@/shared/types/vault';
import { AlertTriangle, Coins } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import VaultAuthenticatorModal from '../../shared/VaultAuthenticatorModal';

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
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();
  const { licenceeId: effectiveLicenceeId } = useVaultLicencee();
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [showAuthenticator, setShowAuthenticator] = useState(false);

  const denomsList = useMemo(
    () => getDenominationValues(effectiveLicenceeId),
    [effectiveLicenceeId]
  );

  const [denominations, setDenominations] = useState<Denomination[]>([]);
  const [touchedDenominations, setTouchedDenominations] = useState<Set<number>>(
    new Set()
  );

  // ============================================================================
  // Effects
  // ============================================================================

  // Update denominations when licencee changes or modal opens
  useEffect(() => {
    if (open && step === 'input') {
      setDenominations(
        denomsList.map(denom => ({
          denomination: denom as Denomination['denomination'],
          quantity: 0,
        }))
      );
      setTouchedDenominations(new Set());
    }
  }, [denomsList, open, step]);

  // ============================================================================
  // Computed
  // ============================================================================
  const totalAmount = denominations.reduce(
    (sum, d) => sum + d.denomination * d.quantity,
    0
  );

  const isAllTouched = useMemo(
    () => denomsList.every(d => touchedDenominations.has(Number(d))),
    [denomsList, touchedDenominations]
  );
  const isValidCount = totalAmount > 0 || isAllTouched;

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleClose = () => {
    setStep('input');
    setTouchedDenominations(new Set());
    onClose();
  };

  const handleReview = () => {
    if (!hasActiveVaultShift || !isVaultReconciled) return;

    if (!isValidCount) {
      alert('Please specify at least one denomination with quantity > 0');
      return;
    }
    setStep('review');
  };

  const handleSubmit = async () => {
    // Show TOTP before final submission
    setShowAuthenticator(true);
  };

  const handleAuthVerified = async () => {
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
      setTouchedDenominations(new Set());
    } catch {
      // Error handled by parent
    }
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="flex flex-col overflow-hidden p-0 md:max-w-md">
          <DialogHeader className="shrink-0 border-b border-violet-100 bg-violet-50 p-6">
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

          <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6 md:max-h-[75vh]">
            {!hasActiveVaultShift && (
              <div className="mb-2 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-xs text-red-700 shadow-sm">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                <p className="leading-tight">
                  <strong className="mb-0.5 block text-[10px] uppercase tracking-widest">
                    Cannot Start Shift
                  </strong>{' '}
                  No active Vault Manager shift found at this location.
                </p>
              </div>
            )}

            {hasActiveVaultShift && !isVaultReconciled && (
              <div className="mb-2 flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-700 shadow-sm">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                <p className="leading-tight">
                  <strong className="mb-0.5 block text-[10px] uppercase tracking-widest">
                    Reconciliation Pending
                  </strong>{' '}
                  The vault manager must reconcile the vault before you can
                  start your shift.
                </p>
              </div>
            )}

            {step === 'input' ? (
              <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
                <DenominationInputGrid
                  denominations={denominations}
                  onChange={setDenominations}
                  disabled={loading}
                  touchedDenominations={touchedDenominations}
                  onTouchedChange={setTouchedDenominations}
                />
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        Denomination
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        Count
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {denominations
                      .filter(d => d.quantity > 0)
                      .map(d => (
                        <tr key={d.denomination} className="bg-white">
                          <td className="px-4 py-3 font-semibold text-gray-700">
                            ${d.denomination}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-medium text-gray-600">
                            {d.quantity}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">
                            ${d.denomination * d.quantity}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot className="border-t border-violet-100 bg-violet-50/50">
                    <tr>
                      <td
                        colSpan={2}
                        className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-violet-900"
                      >
                        Total Request
                      </td>
                      <td className="px-4 py-3 text-right font-black text-violet-700">
                        {formatAmount(totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {step === 'input' && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-xl shadow-violet-500/20">
                <div className="relative z-10 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-violet-100/60">
                      Total Opening request
                    </span>
                    <p className="text-[10px] font-medium italic text-white/60">
                      Sum of specified denominations
                    </p>
                  </div>
                  <span className="text-3xl font-black tracking-tight text-white">
                    {formatAmount(totalAmount)}
                  </span>
                </div>
                <Coins className="absolute -bottom-4 -right-4 h-24 w-24 rotate-12 text-white/5" />
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 border-t border-gray-100 bg-gray-50 p-6">
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
                  disabled={
                    loading ||
                    !isValidCount ||
                    !hasActiveVaultShift ||
                    !isVaultReconciled
                  }
                  className="ml-auto bg-violet-600 px-8 font-black text-white shadow-lg shadow-violet-600/20 hover:bg-violet-700"
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
                  className="ml-auto bg-green-600 px-8 font-black text-white shadow-lg shadow-green-600/20 hover:bg-green-700"
                >
                  {loading ? 'Confirming...' : 'Confirm & Request'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <VaultAuthenticatorModal
        open={showAuthenticator}
        onClose={() => setShowAuthenticator(false)}
        onVerified={handleAuthVerified}
        actionName="Open Cashier Shift"
      />
    </>
  );
}
