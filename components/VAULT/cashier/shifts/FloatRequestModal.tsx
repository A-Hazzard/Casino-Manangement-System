/**
 * Float Request Modal Component
 *
 * Two-step modal for cashiers to request a float increase or decrease.
 * Step 1: Denomination input. Step 2: Review before TOTP confirmation.
 *
 * @module components/VAULT/cashier/shifts/FloatRequestModal
 */
'use client';

import { FormEvent } from 'react';
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
import { useVaultLicencee } from '@/lib/hooks/vault/useVaultLicencee';
import { getDenominationValues } from '@/lib/utils/vault/denominations';
import type { Denomination } from '@/shared/types/vault';
import { AlertTriangle, Coins, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import VaultAuthenticatorModal from '../../shared/VaultAuthenticatorModal';

type FloatRequestModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (request: FloatRequestData) => Promise<void>;
  type: 'increase' | 'decrease';
  loading?: boolean;
};

export type FloatRequestData = {
  type: 'increase' | 'decrease';
  amount: number;
  denominations?: Denomination[];
};

export default function FloatRequestModal({
  open,
  onClose,
  onSubmit,
  type,
  loading = false,
}: FloatRequestModalProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();
  const { licenceeId: effectiveLicenceeId } = useVaultLicencee();
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [denominations, setDenominations] = useState<Denomination[]>([]);
  const [touchedDenominations, setTouchedDenominations] = useState<Set<number>>(
    new Set()
  );
  const [showAuthenticator, setShowAuthenticator] = useState(false);

  const denomsList = useMemo(
    () => getDenominationValues(effectiveLicenceeId),
    [effectiveLicenceeId]
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
  const totalAmount = useMemo(() => {
    return denominations.reduce(
      (sum, denom) => sum + denom.denomination * denom.quantity,
      0
    );
  }, [denominations]);

  const isAllTouched = useMemo(
    () => denomsList.every(denomValue => touchedDenominations.has(Number(denomValue))),
    [denomsList, touchedDenominations]
  );
  const isFormValid = totalAmount > 0 || isAllTouched;

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    if (step === 'input') {
      setStep('review');
      return;
    }

    // On confirm step, show TOTP before actual submission
    setShowAuthenticator(true);
  };

  const handleAuthVerified = async () => {
    try {
      await onSubmit({
        type,
        amount: totalAmount,
        denominations: denominations.filter(denom => denom.quantity > 0),
      });
      // Reset form
      setStep('input');
      setTouchedDenominations(new Set());
      onClose();
    } catch {
      // Error handled by parent
    }
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="flex flex-col overflow-hidden p-0 md:max-w-[600px]">
          <DialogHeader className="shrink-0 border-b border-violet-100 bg-violet-50 p-6">
            <DialogTitle className="flex items-center gap-2 text-violet-900">
              <Coins className="h-5 w-5 text-violet-600" />
              {step === 'review'
                ? 'Confirm Request'
                : type === 'increase'
                  ? 'Request Float Increase'
                  : 'Request Float Decrease'}
            </DialogTitle>
            <DialogDescription className="text-violet-700/80">
              {step === 'review'
                ? 'Please review your request details before submitting.'
                : type === 'increase'
                  ? 'Request additional float for your stash.'
                  : 'Return excess float from your stash back to the vault.'}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col overflow-hidden p-0"
          >
            <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6 md:max-h-[75vh]">
              {step === 'input' ? (
                <>
                  {/* Denomination Breakdown */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <div className="space-y-0.5">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                          Denomination Breakdown
                        </Label>
                        <p className="text-[10px] text-gray-500">
                          Specify exactly which bills you are{' '}
                          {type === 'increase' ? 'receiving' : 'returning'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end rounded-2xl border border-violet-100 bg-violet-50 px-3 py-1.5 shadow-sm">
                        <span className="text-[9px] font-black uppercase tracking-wider text-violet-400 opacity-60">
                          Total Amount
                        </span>
                        <span className="text-lg font-black tracking-tight text-violet-700">
                          {formatAmount(totalAmount)}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
                      <DenominationInputGrid
                        denominations={denominations}
                        onChange={setDenominations}
                        disabled={loading}
                        touchedDenominations={touchedDenominations}
                        onTouchedChange={setTouchedDenominations}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-4 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                    <div className="flex items-center justify-between border-b border-violet-200/50 pb-3">
                      <span className="text-sm font-medium text-violet-900">
                        Total Amount
                      </span>
                      <span className="text-2xl font-black text-violet-700">
                        {formatAmount(totalAmount)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                        Breakdown
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {denominations
                          .filter(denom => denom.quantity > 0)
                          .map(denom => (
                            <div
                              key={denom.denomination}
                              className="flex justify-between rounded-lg border border-violet-100 bg-white px-3 py-2 shadow-sm"
                            >
                              <span className="text-sm font-medium text-gray-600">
                                ${denom.denomination}
                              </span>
                              <span className="text-sm font-bold text-gray-900">
                                x{denom.quantity}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4">
                    <div className="mt-0.5">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-orange-800">
                        Please Confirm Count
                      </p>
                      <p className="text-xs leading-relaxed text-orange-700">
                        Carefully re-count your physical cash and please
                        resubmit. Ensure the denominations match exactly what
                        you are holding.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col gap-3 border-t bg-gray-50 p-6 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  step === 'review' ? setStep('input') : onClose()
                }
                className="order-2 font-black text-gray-500 hover:text-gray-900 sm:order-1"
              >
                {step === 'review' ? 'Back to Edit' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={loading || !isFormValid}
                className="order-1 h-12 flex-1 rounded-xl bg-violet-600 font-black text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-700 active:scale-[0.98] sm:order-2"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Processing...
                  </div>
                ) : step === 'review' ? (
                  'Confirm & Submit'
                ) : (
                  'Review Request'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <VaultAuthenticatorModal
        open={showAuthenticator}
        onClose={() => setShowAuthenticator(false)}
        onVerified={handleAuthVerified}
        actionName={`Float ${type === 'increase' ? 'Increase' : 'Decrease'} Request`}
      />
    </>
  );
}
