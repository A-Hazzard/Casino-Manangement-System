/**
 * Blind Close Modal Component
 *
 * CRITICAL SECURITY COMPONENT (C-4)
 * Allows cashier to enter physical cash count by denomination to close their shift.
 *
 * SECURITY RULE:
 * This component MUST NOT calculate or display any "Expected Balance" or "Difference".
 * It strictly captures the physical count for blind verification by the backend.
 *
 * @module components/VAULT/cashier/shifts/BlindCloseModal
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Input } from '@/components/shared/ui/input';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useVaultLicencee } from '@/lib/hooks/vault/useVaultLicencee';
import { cn } from '@/lib/utils';
import { getDenominationValues } from '@/lib/utils/vault/denominations';
import type { Denomination } from '@/shared/types/vault';
import { AlertTriangle, Minus, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import VaultAuthenticatorModal from '../../shared/VaultAuthenticatorModal';

type BlindCloseModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    physicalCount: number,
    denominations: Denomination[]
  ) => Promise<void>;
  loading?: boolean;
};

export default function BlindCloseModal({
  open,
  onClose,
  onSubmit,
  loading = false,
}: BlindCloseModalProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();
  const { licenceeId: effectiveLicenceeId } = useVaultLicencee();

  const denomsList = useMemo(
    () => getDenominationValues(effectiveLicenceeId),
    [effectiveLicenceeId]
  );

  const [denominations, setDenominations] = useState<Denomination[]>([]);
  const [touchedDenominations, setTouchedDenominations] = useState<Set<number>>(
    new Set()
  );
  const [showAuthenticator, setShowAuthenticator] = useState(false);

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    if (open) {
      setDenominations(
        denomsList.map(d => ({
          denomination: d as Denomination['denomination'],
          quantity: 0,
        }))
      );
      setTouchedDenominations(new Set());
    }
  }, [open, denomsList]);

  // ============================================================================
  // Computed
  // ============================================================================
  const totalAmount = denominations.reduce(
    (sum, d) => sum + d.denomination * d.quantity,
    0
  );

  // ============================================================================
  // Handlers
  // ============================================================================
  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 0) return;
    const newDenominations = [...denominations];
    const denomVal = newDenominations[index].denomination;
    newDenominations[index] = { ...newDenominations[index], quantity };
    setDenominations(newDenominations as Denomination[]);

    setTouchedDenominations(prev => {
      const next = new Set(prev);
      next.add(denomVal);
      return next;
    });
  };

  const isAllTouched = denomsList.every(d =>
    touchedDenominations.has(Number(d))
  );
  const isValid = totalAmount > 0 || isAllTouched;

  const handleSubmit = async () => {
    if (!isValid) return;
    setShowAuthenticator(true);
  };

  const handleAuthVerified = async () => {
    const filteredDenominations = denominations.filter(d => d.quantity > 0);
    try {
      await onSubmit(totalAmount, filteredDenominations);
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
        <DialogContent className="!z-[200] flex flex-col overflow-hidden p-0 md:max-w-md">
          <DialogHeader className="shrink-0 border-b border-violet-100 bg-violet-50 p-6">
            <DialogTitle className="flex items-center gap-2 text-violet-900">
              <AlertTriangle className="h-5 w-5 text-violet-600" />
              End Shift / Blind Close
            </DialogTitle>
            <DialogDescription className="text-violet-700/80">
              Enter your final physical cash count for manager review and shift
              closure.
            </DialogDescription>
          </DialogHeader>

          <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6 md:max-h-[75vh]">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-black uppercase tracking-widest text-amber-700">
                  Security Protocol
                </p>
                <p className="text-sm font-medium leading-tight text-amber-600">
                  For security, the expected balance is hidden. Please count
                  carefully.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {denominations.map((denom, index) => (
                <div
                  key={denom.denomination}
                  className={cn(
                    'relative flex items-center justify-between rounded-xl border p-3 transition-all duration-200',
                    denom.quantity > 0
                      ? 'border-violet-200 bg-violet-50/50 shadow-sm ring-1 ring-violet-100'
                      : 'border-gray-100 bg-gray-50/30'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-black shadow-sm',
                        denom.quantity > 0
                          ? 'border border-violet-100 text-violet-600'
                          : 'border border-transparent text-gray-400'
                      )}
                    >
                      ${denom.denomination}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Bills
                      </span>
                      <span className="text-xs font-bold text-gray-700">
                        Physical Count
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-gray-500 hover:bg-gray-100"
                      onClick={() => updateQuantity(index, denom.quantity - 1)}
                      disabled={denom.quantity === 0}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>

                    <Input
                      type="number"
                      min="0"
                      value={denom.quantity || ''}
                      onChange={e =>
                        updateQuantity(index, parseInt(e.target.value) || 0)
                      }
                      className={cn(
                        'h-8 w-12 border-none bg-transparent p-0 text-center text-sm font-black transition-all focus-visible:ring-0',
                        touchedDenominations.has(denom.denomination) &&
                          'text-green-600'
                      )}
                      placeholder="0"
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-gray-500 hover:bg-gray-100"
                      onClick={() => updateQuantity(index, denom.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-xl shadow-violet-500/20">
              <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-violet-100/60">
                    Session physical count
                  </span>
                  <span className="block text-sm font-bold">
                    Total Cash Recorded
                  </span>
                </div>
                <span className="text-3xl font-black tracking-tight text-white">
                  {formatAmount(totalAmount)}
                </span>
              </div>
              <div className="absolute -bottom-4 -right-4 h-24 w-24 rotate-12 rounded-full bg-white/10 text-white/5 blur-2xl" />
            </div>
          </div>

          <DialogFooter className="border-t border-gray-100 bg-gray-50 p-6">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="font-black text-gray-500 hover:bg-gray-100/50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !isValid}
              className="bg-violet-600 px-8 font-black text-white shadow-lg shadow-violet-600/20 hover:bg-violet-700"
            >
              {loading ? 'Submitting count...' : 'Finalize & Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <VaultAuthenticatorModal
        open={showAuthenticator}
        onClose={() => setShowAuthenticator(false)}
        onVerified={handleAuthVerified}
        actionName="Close Shift (Blind Close)"
      />
    </>
  );
}
