/**
 * Vault Overview Remove Cash Modal Component
 *
 * Modal for removing cash from the vault with denomination breakdown.
 *
 * Features:
 * - Destination selection dropdown
 * - Denomination breakdown (6 inputs: $100, $50, $20, $10, $5, $1)
 * - Auto-calculated total amount
 * - Optional notes field
 * - Form validation
 * - Loading state on submit
 *
 * @module components/VAULT/overview/modals/VaultOverviewRemoveCashModal
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
import { Textarea } from '@/components/shared/ui/textarea';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useVaultLicencee } from '@/lib/hooks/vault/useVaultLicencee';
import { cn } from '@/lib/utils';
import { getDenominationValues } from '@/lib/utils/vault/denominations';
import type { Denomination } from '@/shared/types/vault';
import { ArrowDownRight, Info, MessageSquare, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import VaultAuthenticatorModal from '../../shared/VaultAuthenticatorModal';

type VaultOverviewRemoveCashModalProps = {
  open: boolean;
  onClose: () => void;
  vaultDenominations?: Denomination[];
  onConfirm: (data: {
    reason: string;
    denominations: Denomination[];
    totalAmount: number;
    notes?: string;
  }) => Promise<void>;
};

export default function VaultOverviewRemoveCashModal({
  open,
  onClose,
  vaultDenominations = [],
  onConfirm,
}: VaultOverviewRemoveCashModalProps) {
  const { formatAmount } = useCurrencyFormat();
  const { licenceeId: selectedLicencee } = useVaultLicencee();
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const [reason, setReason] = useState('');
  const [denominations, setDenominations] = useState<Denomination[]>([]);
  const [touchedDenominations, setTouchedDenominations] = useState<Set<number>>(
    new Set()
  );

  const denomsList = useMemo(
    () => getDenominationValues(selectedLicencee),
    [selectedLicencee]
  );

  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
  /**
   * Calculate total amount from denomination breakdown
   * Multiplies each denomination count by its value and sums them
   */
  const totalAmount = useMemo(() => {
    return denominations.reduce(
      (acc, curr) => acc + curr.denomination * curr.quantity,
      0
    );
  }, [denominations]);

  /**
   * Check if form is valid for submission
   * Requires destination selection and total amount > 0
   */
  const isAllTouched = useMemo(
    () => denomsList.every(d => touchedDenominations.has(Number(d))),
    [denomsList, touchedDenominations]
  );
  const isValid = reason.trim() !== '' && (totalAmount > 0 || isAllTouched);

  // ============================================================================
  // Handlers
  // ============================================================================
  /**
   * Handle denomination input change
   * Updates breakdown state and clears field-specific errors
   *
   * @param key - Denomination key (hundred, fifty, twenty, etc.)
   * @param value - Input value as string
   */
  const handleDenominationChange = (denomination: number, value: string) => {
    const numValue = parseInt(value, 10) || 0;
    if (numValue < 0) return;

    setDenominations(prev =>
      prev.map(d =>
        d.denomination === denomination ? { ...d, quantity: numValue } : d
      )
    );
    setTouchedDenominations(prev => {
      const next = new Set(prev);
      next.add(denomination);
      return next;
    });
  };

  /**
   * Handle form submission
   * Validates form data, calls onConfirm callback, and resets form on success
   */
  const handleSubmit = async () => {
    // Validation
    const newErrors: Record<string, string> = {};
    if (!reason.trim()) {
      newErrors.reason = 'Please provide a reason for removal';
    }
    if (totalAmount <= 0) {
      newErrors.total = 'Total amount must be greater than 0';
    }

    // Real-time stock check
    const overages = denominations.some(requested => {
      if (requested.quantity <= 0) return false;
      const available =
        vaultDenominations.find(d => d.denomination === requested.denomination)
          ?.quantity || 0;
      return requested.quantity > available;
    });

    if (overages) {
      toast.error('Insufficient Stock', {
        description:
          'One or more denominations exceed the available vault inventory.',
      });
      return;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Trigger TOTP verification
    setShowAuthenticator(true);
  };

  const handleAuthVerified = async () => {
    setLoading(true);
    try {
      await onConfirm({
        reason: reason.trim(),
        denominations,
        totalAmount,
        notes: notes.trim() || undefined,
      });
      // Reset form on success
      setReason('');
      setDenominations(
        denomsList.map(d => ({
          denomination: d as Denomination['denomination'],
          quantity: 0,
        }))
      );
      setTouchedDenominations(new Set());
      setNotes('');
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error removing cash:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle modal close
   * Resets form state and calls onClose callback
   * Prevents closing while submission is in progress
   */
  const handleClose = () => {
    if (loading) return;
    setReason('');
    setDenominations(
      denomsList.map(d => ({
        denomination: d as Denomination['denomination'],
        quantity: 0,
      }))
    );
    setTouchedDenominations(new Set());
    setNotes('');
    setErrors({});
    onClose();
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="flex flex-col overflow-hidden p-0 md:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-violet-100 bg-violet-50 p-6">
            <DialogTitle className="flex items-center gap-2 text-violet-900">
              <ArrowDownRight className="h-5 w-5 text-violet-600" />
              Remove Cash from Vault
            </DialogTitle>
            <DialogDescription className="text-violet-700/80">
              Record cash leaving the vault for deposits or replenishment.
            </DialogDescription>
          </DialogHeader>

          <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto p-6 md:max-h-[75vh]">
            {/* Denomination Grid */}
            <div className="space-y-4">
              <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-gray-400">
                Denomination Breakdown & Stock
              </Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {denominations.map(denom => {
                  const available =
                    vaultDenominations.find(
                      d => d.denomination === denom.denomination
                    )?.quantity || 0;
                  const requested = denom.quantity;
                  const isOver = requested > available;

                  return (
                    <div
                      key={denom.denomination}
                      className={cn(
                        'flex items-center justify-between rounded-xl border p-3 transition-all duration-200',
                        requested > 0
                          ? isOver
                            ? 'border-red-200 bg-red-50 ring-1 ring-red-100'
                            : 'border-violet-200 bg-violet-50/50 ring-1 ring-violet-100'
                          : 'border-gray-100 bg-gray-50/30'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-black shadow-sm',
                            requested > 0
                              ? isOver
                                ? 'border border-red-100 text-red-600'
                                : 'border border-violet-100 text-violet-600'
                              : 'border border-transparent text-gray-400'
                          )}
                        >
                          ${denom.denomination}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black uppercase tracking-tighter text-gray-400">
                            Vault Stock
                          </span>
                          <span
                            className={cn(
                              'text-xs font-bold',
                              available > 0 ? 'text-gray-900' : 'text-gray-300'
                            )}
                          >
                            {available}
                          </span>
                        </div>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        value={requested === 0 ? '' : requested}
                        onChange={e =>
                          handleDenominationChange(
                            denom.denomination,
                            e.target.value
                          )
                        }
                        placeholder="0"
                        className={cn(
                          'h-9 w-16 rounded-lg border-gray-200 bg-white text-center font-black transition-all focus-visible:ring-violet-500/30',
                          isOver && 'border-red-500 text-red-600',
                          touchedDenominations.has(denom.denomination) &&
                            !isOver &&
                            'text-violet-600'
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reason & Summary */}
            <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <Label
                      htmlFor="reason"
                      className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-gray-400"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Removal Reason
                    </Label>
                    {errors.reason && (
                      <span className="text-[10px] font-bold uppercase text-red-500">
                        Required
                      </span>
                    )}
                  </div>
                  <Textarea
                    id="reason"
                    placeholder="Why is this cash being removed?"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={2}
                    className={cn(
                      'resize-none rounded-xl border-gray-100 bg-gray-50/50 text-sm transition-all focus:bg-white',
                      errors.reason && 'border-red-500 focus:border-red-500'
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="notes"
                    className="ml-1 flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-gray-400"
                  >
                    <MessageSquare className="h-3 w-3" />
                    Additional Notes (Optional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Optional details..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    className="resize-none rounded-xl border-gray-100 bg-gray-50/50 text-sm transition-all focus:bg-white"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50 p-5 text-violet-900 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">
                    Total Value
                  </span>
                  <ArrowDownRight className="h-4 w-4 text-violet-500" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-3xl font-black tracking-tight text-violet-700">
                    {formatAmount(totalAmount)}
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-tight text-violet-600/60">
                    Outbound Cash Value
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-violet-200/50 pt-4 text-[10px] font-bold text-violet-400">
                  <Info className="h-3 w-3" />
                  Stock deducted immediately
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-3 border-t bg-gray-50 p-4 sm:flex-row">
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={loading}
              className="order-2 font-bold text-gray-500 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || loading}
              className="order-1 h-12 flex-1 rounded-xl bg-violet-600 text-base font-black text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-700 active:scale-[0.98] sm:order-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Processing...
                </div>
              ) : (
                'Confirm Removal'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <VaultAuthenticatorModal
        open={showAuthenticator}
        onClose={() => setShowAuthenticator(false)}
        onVerified={handleAuthVerified}
        actionName="Remove Cash from Vault"
      />
    </>
  );
}
