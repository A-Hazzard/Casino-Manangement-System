/**
 * Vault Overview Close Shift Modal
 *
 * Allows the Vault Manager to enter the final vault count and close the daily shift.
 * Implements BR-01: Cannot close if any cashier shifts are active or pending review.
 *
 * @module components/VAULT/overview/modals/VaultOverviewCloseShiftModal
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
import { Label } from '@/components/shared/ui/label';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useVaultLicencee } from '@/lib/hooks/vault/useVaultLicencee';
import { cn } from '@/lib/utils';
import { getDenominationValues } from '@/lib/utils/vault/denominations';
import type { Denomination } from '@/shared/types/vault';
import {
  AlertTriangle,
  CheckCircle2,
  Landmark,
  Minus,
  Plus,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import VaultAuthenticatorModal from '../../shared/VaultAuthenticatorModal';
import VaultOverviewCollectionTallyList from '../sections/VaultOverviewCollectionTallyList';

type VaultOverviewCloseShiftModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (balance: number, denominations: Denomination[]) => Promise<void>;
  currentBalance: number;
  canClose: boolean;
  blockReason?: string;
  loading?: boolean;
  locationId?: string;
};

export default function VaultOverviewCloseShiftModal({
  open,
  onClose,
  onConfirm,
  currentBalance,
  canClose,
  blockReason,
  loading = false,
  locationId,
}: VaultOverviewCloseShiftModalProps) {
  const { formatAmount } = useCurrencyFormat();
  const { licenceeId: selectedLicencee } = useVaultLicencee();
  const [denominations, setDenominations] = useState<Denomination[]>([]);
  const [touchedDenominations, setTouchedDenominations] = useState<Set<number>>(
    new Set()
  );

  const denomsList = useMemo(
    () => getDenominationValues(selectedLicencee),
    [selectedLicencee]
  );

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

  const totalAmount = useMemo(() => {
    return denominations.reduce(
      (sum, d) => sum + d.denomination * d.quantity,
      0
    );
  }, [denominations]);

  const matchesExpected = totalAmount === currentBalance;
  const isAllTouched = useMemo(
    () => denomsList.every(d => touchedDenominations.has(Number(d))),
    [denomsList, touchedDenominations]
  );
  const isValid = totalAmount > 0 || isAllTouched;
  const [showAuthenticator, setShowAuthenticator] = useState(false);

  const handleSubmit = async () => {
    if (!isValid) return;
    setShowAuthenticator(true);
  };

  const handleAuthVerified = async () => {
    await onConfirm(
      totalAmount,
      denominations.filter(d => d.quantity > 0)
    );
    setDenominations(
      denomsList.map(d => ({
        denomination: d as Denomination['denomination'],
        quantity: 0,
      }))
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={val => !val && onClose()}>
        <DialogContent className="flex flex-col overflow-hidden p-0 md:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-violet-100 bg-violet-50 p-6">
            <DialogTitle className="flex items-center gap-2 text-violet-900">
              <Landmark className="h-5 w-5 text-violet-600" />
              End of Day / Close Vault
            </DialogTitle>
            <DialogDescription className="text-violet-700/80">
              Complete the final physical count to close today's vault session.
            </DialogDescription>
          </DialogHeader>

          <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto p-6 md:max-h-[75vh]">
            {!canClose && (
              <div className="flex items-start gap-4 rounded-2xl border-2 border-red-100/50 bg-red-50 p-5 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black uppercase tracking-tight text-red-900">
                    Closing Blocked
                  </p>
                  <p className="text-xs font-medium leading-relaxed text-red-800/80">
                    {blockReason ||
                      'Active cashier shifts must be closed before the vault can be finalized.'}
                  </p>
                </div>
              </div>
            )}

            {canClose && (
              <>
                {/* Dual Balance Display - Comparison Style */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-colors hover:border-violet-200">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Expected System Balance
                    </p>
                    <p className="text-3xl font-black tracking-tight text-gray-800">
                      {formatAmount(currentBalance)}
                    </p>
                    <div className="mt-3 flex items-center gap-2 truncate text-[10px] font-bold text-gray-400">
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                      Calculated from daily activity
                    </div>
                    <Landmark className="absolute -bottom-4 -right-4 h-24 w-24 text-gray-50 opacity-[0.05] transition-opacity group-hover:opacity-[0.08]" />
                  </div>

                  <div
                    className={cn(
                      'relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-300',
                      matchesExpected
                        ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900 shadow-emerald-50'
                        : 'border-orange-200 bg-orange-50/60 text-orange-900 shadow-orange-50'
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <p
                        className={cn(
                          'text-[10px] font-black uppercase tracking-widest',
                          matchesExpected
                            ? 'text-emerald-400'
                            : 'text-orange-400'
                        )}
                      >
                        Physical Count
                      </p>
                      {matchesExpected ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                    <p
                      className={cn(
                        'text-3xl font-black tracking-tight',
                        matchesExpected ? 'text-emerald-700' : 'text-orange-700'
                      )}
                    >
                      {formatAmount(totalAmount)}
                    </p>

                    {!matchesExpected && totalAmount > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-tight text-orange-600/80">
                        Discrepancy:{' '}
                        {formatAmount(totalAmount - currentBalance)}
                      </div>
                    )}
                    {matchesExpected && totalAmount > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-tight text-emerald-600/80">
                        Balance fully reconciled
                      </div>
                    )}
                  </div>
                </div>

                {/* End of Day Machine Tally */}
                {locationId && (
                  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <VaultOverviewCollectionTallyList locationId={locationId} />
                  </div>
                )}

                {/* Denomination Input - Row System */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                      Physical Denomination Breakdown
                    </Label>
                    {totalAmount > 0 && (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                          matchesExpected
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-orange-100 text-orange-700'
                        )}
                      >
                        {matchesExpected ? 'Balanced' : 'Discrepant'}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                              'flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-black shadow-sm',
                              denom.quantity > 0
                                ? 'border border-violet-100 text-violet-600'
                                : 'border border-transparent text-gray-400'
                            )}
                          >
                            ${denom.denomination}
                          </div>
                          <span className="text-xs font-bold text-gray-700">
                            Bills
                          </span>
                        </div>

                        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100"
                            onClick={() => {
                              const newDenoms = [...denominations];
                              newDenoms[index].quantity = Math.max(
                                0,
                                newDenoms[index].quantity - 1
                              );
                              setDenominations(newDenoms);
                            }}
                            disabled={denom.quantity === 0}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>

                          <Input
                            type="number"
                            min="0"
                            value={denom.quantity || ''}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              const newDenoms = [...denominations];
                              newDenoms[index].quantity = val;
                              setDenominations(newDenoms);
                              setTouchedDenominations(prev => {
                                const next = new Set(prev);
                                next.add(denom.denomination as number);
                                return next;
                              });
                            }}
                            className={cn(
                              'h-7 w-10 border-none bg-transparent p-0 text-center text-sm font-black transition-all focus-visible:ring-0',
                              touchedDenominations.has(
                                denom.denomination as number
                              ) && 'text-violet-600'
                            )}
                            placeholder="0"
                          />

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100"
                            onClick={() => {
                              const newDenoms = [...denominations];
                              newDenoms[index].quantity =
                                (newDenoms[index].quantity || 0) + 1;
                              setDenominations(newDenoms);
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex flex-col gap-3 border-t bg-gray-50 p-4 sm:flex-row">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="order-2 font-bold text-gray-500 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !canClose || !isValid}
              className="order-1 h-12 flex-1 rounded-xl bg-violet-600 text-base font-black text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-700 active:scale-[0.98] sm:order-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Closing Session...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Confirm & Close Vault</span>
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <VaultAuthenticatorModal
        open={showAuthenticator}
        onClose={() => setShowAuthenticator(false)}
        onVerified={handleAuthVerified}
        actionName="Close Vault Shift"
      />
    </>
  );
}
