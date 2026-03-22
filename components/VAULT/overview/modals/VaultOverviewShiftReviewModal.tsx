/**
 * Vault Overview Shift Review Modal Component
 *
 * Verify the shift counts and resolve discrepancies or return to cashier.
 *
 * @module components/VAULT/overview/modals/VaultOverviewShiftReviewModal
 */
'use client';

import {
  AlertTriangle,
  BarChart3,
  History as HistoryIcon,
  Landmark,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/shared/ui/badge';
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
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useVaultLicencee } from '@/lib/hooks/vault/useVaultLicencee';
import { cn } from '@/lib/utils';
import {
  getDenominationValues,
  getInitialDenominationRecord,
} from '@/lib/utils/vault/denominations';
import type { Denomination, UnbalancedShiftInfo } from '@/shared/types/vault';
import CashierActivityLogModal from '../../admin/modals/CashierActivityLogModal';
import CashierShiftHistoryModal from '../../admin/modals/CashierShiftHistoryModal';

interface VaultOverviewShiftReviewModalProps {
  open: boolean;
  onClose: () => void;
  shift: UnbalancedShiftInfo | null;
  vaultInventory?: Denomination[];
  onSuccess?: () => void;
}

export default function VaultOverviewShiftReviewModal({
  open,
  onClose,
  shift,
  vaultInventory = [],
  onSuccess,
}: VaultOverviewShiftReviewModalProps) {
  const { formatAmount } = useCurrencyFormat();
  const { licenceeId: selectedLicencee } = useVaultLicencee();

  const [isRejecting, setIsRejecting] = useState(false);
  const [finalBalance, setFinalBalance] = useState<string>('');
  const [auditComment, setAuditComment] = useState<string>('');
  const [isEditingBreakdown, setIsEditingBreakdown] = useState(false);
  const [shiftDenominations, setShiftDenominations] = useState<
    Record<string, number>
  >({});
  const [touchedDenominations, setTouchedDenominations] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);

  // Modals for Logs
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  // Initialize state when shift changes
  useMemo(() => {
    if (shift) {
      setFinalBalance(shift.expectedBalance.toString());
      setAuditComment('');
      setIsRejecting(false);
      setIsEditingBreakdown(false);
      setTouchedDenominations(new Set());

      const denoms = getInitialDenominationRecord(selectedLicencee);
      if (shift.enteredDenominations) {
        shift.enteredDenominations.forEach(d => {
          if (denoms[d.denomination.toString()] !== undefined) {
            denoms[d.denomination.toString()] = d.quantity;
          }
        });
      }
      setShiftDenominations(denoms);
    }
  }, [shift, selectedLicencee]);

  const shiftTotal = Object.entries(shiftDenominations).reduce(
    (sum, [denom, qty]) => sum + Number(denom) * qty,
    0
  );

  const currentShortageCheck = useMemo(() => {
    if (!shift || !isEditingBreakdown)
      return { hasShortage: false, shortages: [] };

    const shortages = Object.entries(shiftDenominations)
      .filter(([, qty]) => qty > 0)
      .map(([denom, qty]) => ({ denomination: Number(denom), quantity: qty }))
      .filter(req => {
        const stock =
          vaultInventory.find(
            v => Number(v.denomination) === Number(req.denomination)
          )?.quantity || 0;
        return Number(req.quantity) > Number(stock);
      });

    return { hasShortage: shortages.length > 0, shortages };
  }, [shift, isEditingBreakdown, shiftDenominations, vaultInventory]);

  const { hasShortage } = currentShortageCheck;

  const handleResolve = async () => {
    if (!shift) return;
    const balance = parseFloat(
      isEditingBreakdown ? shiftTotal.toString() : finalBalance
    );
    if (isNaN(balance) || balance < 0) {
      toast.error('Please enter a valid final balance');
      return;
    }

    setLoading(true);
    try {
      const denoms = isEditingBreakdown
        ? Object.entries(shiftDenominations)
            .filter(([, qty]) => qty > 0)
            .map(([val, qty]) => ({
              denomination: Number(val) as Denomination['denomination'],
              quantity: qty,
            }))
        : undefined;

      const res = await fetch('/api/cashier/shift/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: shift.shiftId,
          finalBalance: balance,
          auditComment: auditComment.trim(),
          denominations: denoms,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Shift discrepancy resolved');
        onSuccess?.();
        onClose();
      } else {
        toast.error(data.error || 'Failed to resolve shift');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const denomValues = getDenominationValues(selectedLicencee);
  const allTouched = denomValues.every(d =>
    touchedDenominations.has(d.toString())
  );
  const isValidResolution = !isEditingBreakdown || shiftTotal > 0 || allTouched;

  const handleReject = async () => {
    if (!shift) return;
    setLoading(true);
    try {
      const res = await fetch('/api/cashier/shift/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: shift.shiftId,
          reason: auditComment.trim(),
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Shift closure rejected and returned to cashier');
        onSuccess?.();
        onClose();
      } else {
        toast.error(data.error || 'Failed to reject shift');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const getSuggestedRejectionReason = (s: UnbalancedShiftInfo) => {
    const { discrepancy } = s;
    const absDisc = Math.abs(discrepancy);
    if (absDisc === 0)
      return 'Carefully re-count your physical cash and please resubmit.';
    const direction = discrepancy > 0 ? 'over' : 'short';
    let message = `Your count is $${absDisc.toFixed(2)} ${direction}. `;
    const commonDenoms = getDenominationValues(selectedLicencee);
    const matchingDenom = commonDenoms.find(d => Math.abs(absDisc - d) < 0.01);
    if (matchingDenom)
      message += `It looks like you might have miscounted a $${matchingDenom} bill. `;
    message += 'Carefully re-count your physical cash and please resubmit.';
    return message;
  };

  const startRejection = () => {
    if (!shift) return;
    setIsRejecting(true);
    setAuditComment(getSuggestedRejectionReason(shift));
  };

  const isOverlayOpen = isHistoryModalOpen || isActivityModalOpen;

  if (!shift) return null;

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className={cn(
          '!z-[200] flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border-none p-0 shadow-2xl transition-all duration-300 md:h-auto md:max-w-[650px] md:rounded-2xl',
          isOverlayOpen &&
            'pointer-events-none scale-[0.98] blur-sm brightness-50'
        )}
        backdropClassName="bg-black/60 backdrop-blur-md !z-[190]"
      >
        {/* Premium Header */}
        <DialogHeader className="relative shrink-0 overflow-hidden bg-gradient-to-r from-orange-600 to-amber-600 p-6 text-left">
          <div className="absolute right-0 top-0 rotate-12 p-8 opacity-10">
            <AlertTriangle className="h-24 w-24 text-white" />
          </div>
          <div className="relative z-10 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                  <Landmark className="h-4 w-4 text-white" />
                </div>
                <DialogTitle className="text-xl font-black tracking-tight text-white">
                  Shift Review
                </DialogTitle>
              </div>
              <Badge className="border-none bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md hover:bg-white/30">
                Action Required
              </Badge>
            </div>
            <DialogDescription className="text-sm font-bold text-orange-50/90">
              Resolving discrepancy for{' '}
              <span className="text-white underline decoration-white/30 underline-offset-4">
                {shift.cashierName}
              </span>
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto bg-[#fcfcfd] p-4 md:max-h-[70vh] md:p-6">
          {/* Discrepancy Hero Card */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                Financial Variance
              </h3>
              <div
                className={cn(
                  'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-tighter',
                  shift.discrepancy > 0
                    ? 'bg-red-50 text-red-600'
                    : shift.discrepancy < 0
                      ? 'bg-green-50 text-green-600'
                      : 'bg-gray-50 text-gray-600'
                )}
              >
                {shift.discrepancy > 0
                  ? 'Shortage Identified'
                  : shift.discrepancy < 0
                    ? 'Overage Identified'
                    : 'Balanced'}
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                  Expected Balance
                </span>
                <p className="text-2xl font-black tracking-tighter text-gray-900">
                  {formatAmount(shift.expectedBalance)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                  Cashier Submission
                </span>
                <p className="text-2xl font-black tracking-tighter text-gray-900">
                  {formatAmount(shift.enteredBalance)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-gray-50 pt-6">
              <span className="text-xs font-bold text-gray-500">
                Calculated Discrepancy:
              </span>
              <span
                className={cn(
                  'text-3xl font-black tracking-tighter',
                  shift.discrepancy > 0
                    ? 'text-red-600'
                    : shift.discrepancy < 0
                      ? 'text-green-600'
                      : 'text-gray-900'
                )}
              >
                {shift.discrepancy > 0 ? '-' : shift.discrepancy < 0 ? '+' : ''}
                {formatAmount(Math.abs(shift.discrepancy))}
              </span>
            </div>
          </div>

          {/* Verification Tools */}
          <div className="space-y-4">
            <h3 className="px-1 text-[11px] font-black uppercase tracking-widest text-gray-400">
              Verification Tools
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsHistoryModalOpen(true)}
                className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:border-orange-200"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600 transition-transform group-hover:scale-110">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-tight text-gray-900">
                    Shift History
                  </p>
                  <p className="text-[10px] font-bold text-gray-400">
                    Past performances
                  </p>
                </div>
              </button>
              <button
                onClick={() => setIsActivityModalOpen(true)}
                className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:border-orange-200"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600 transition-transform group-hover:scale-110">
                  <HistoryIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-tight text-gray-900">
                    Audit Logs
                  </p>
                  <p className="text-[10px] font-bold text-gray-400">
                    Trace transactions
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Resolution Form */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                Resolution Strategy
              </h3>
              {!isRejecting && (
                <button
                  onClick={() => setIsEditingBreakdown(!isEditingBreakdown)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all',
                    isEditingBreakdown
                      ? 'border-orange-600 bg-orange-600 text-white'
                      : 'border-gray-200 text-gray-400 hover:border-orange-400 hover:text-orange-600'
                  )}
                >
                  {isEditingBreakdown
                    ? 'Disable Breakdown Edit'
                    : 'Adjust Breakdown'}
                </button>
              )}
            </div>

            {!isRejecting ? (
              <div className="space-y-6">
                <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  {!isEditingBreakdown ? (
                    <div className="space-y-2">
                      <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Final Agreed Balance
                      </Label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-gray-400">
                          $
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={finalBalance}
                          onChange={e => setFinalBalance(e.target.value)}
                          className="h-14 rounded-xl border-2 border-gray-50 bg-gray-50/30 pl-10 text-2xl font-black text-gray-900 focus:border-orange-500/30"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 duration-300 animate-in fade-in slide-in-from-top-4">
                      <div className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50 p-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-orange-700">
                            Calculated Adjustment
                          </span>
                        </div>
                        <span className="text-xl font-black text-orange-600">
                          {formatAmount(shiftTotal)}
                        </span>
                      </div>

                      <DenominationInputGrid
                        denominations={Object.entries(shiftDenominations).map(
                          ([d, q]) => ({
                            denomination: Number(
                              d
                            ) as Denomination['denomination'],
                            quantity: q,
                          })
                        )}
                        onChange={(newDenoms: Denomination[]) => {
                          const newRecord: Record<string, number> = {};
                          newDenoms.forEach((d: Denomination) => {
                            newRecord[d.denomination.toString()] = d.quantity;
                          });
                          setShiftDenominations(newRecord);
                        }}
                        stock={vaultInventory}
                        touchedDenominations={
                          new Set(Array.from(touchedDenominations).map(Number))
                        }
                        onTouchedChange={(newTouched: Set<number>) => {
                          setTouchedDenominations(
                            new Set(Array.from(newTouched).map(String))
                          );
                        }}
                      />

                      {hasShortage && (
                        <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-3">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                          <p className="text-[10px] font-bold leading-relaxed text-red-700">
                            INVENTORY ALERT: The selected denominations exceed
                            current vault stock.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Resolution Audit Note
                    </Label>
                    <Textarea
                      value={auditComment}
                      onChange={e => setAuditComment(e.target.value)}
                      placeholder="Briefly explain the cause of discrepancy..."
                      className="min-h-[100px] rounded-xl border-2 border-gray-50 bg-gray-50/30 text-sm font-medium focus:border-orange-500/30"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 rounded-2xl border border-red-100 bg-white p-6 shadow-sm duration-300 animate-in fade-in">
                <div className="flex items-start gap-4 rounded-xl border border-red-100 bg-red-50 p-4">
                  <RotateCcw className="mt-1 h-5 w-5 shrink-0 text-red-600" />
                  <div>
                    <h4 className="mb-1 text-xs font-black uppercase tracking-widest text-red-900">
                      Returning to Cashier
                    </h4>
                    <p className="text-[11px] font-medium leading-relaxed text-red-700">
                      The shift will be sent back to the cashier's dashboard as
                      "Active". They will be forced to re-count and resubmit
                      based on your instructions.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Rejection Primary Reason
                  </h4>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {['Miscount', 'Variance', 'Denoms', 'Other'].map(r => (
                      <button
                        key={r}
                        onClick={() => {
                          if (r === 'Other') setAuditComment('');
                          else
                            setAuditComment(
                              `[${r.toUpperCase()}] ${getSuggestedRejectionReason(shift)}`
                            );
                        }}
                        className={cn(
                          'rounded-xl border-2 p-3 text-[10px] font-black uppercase tracking-tighter transition-all',
                          auditComment.includes(r.toUpperCase())
                            ? 'border-red-600 bg-red-600 text-white shadow-xl shadow-red-200'
                            : 'border-transparent bg-gray-50 text-gray-400 hover:border-red-200 hover:text-red-600'
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <Textarea
                    value={auditComment}
                    onChange={e => setAuditComment(e.target.value)}
                    placeholder="Instructions for the cashier..."
                    className="min-h-[120px] rounded-xl border-2 border-red-50 bg-red-50/20 text-sm font-medium focus:border-red-500/30"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 flex-col gap-3 border-t bg-gray-50 p-4 md:p-6">
          {!isRejecting ? (
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <Button
                onClick={handleResolve}
                disabled={loading || hasShortage || !isValidResolution}
                className="h-12 flex-[2] rounded-xl bg-orange-600 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-orange-200 transition-all hover:bg-orange-700 active:scale-[0.98]"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Confirm Resolution'
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={startRejection}
                disabled={loading}
                className="h-12 flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                Return to Start
              </Button>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <Button
                onClick={handleReject}
                disabled={loading || auditComment.length < 5}
                className="h-12 flex-[2] rounded-xl bg-red-600 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-red-200 transition-all hover:bg-red-700 active:scale-[0.98]"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Execute Return'
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsRejecting(false);
                  setAuditComment('');
                }}
                disabled={loading}
                className="h-12 flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                Cancel Rejection
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="w-full text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-gray-500"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* History & Activity Modals */}
      <CashierShiftHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onBack={() => setIsHistoryModalOpen(false)}
        cashier={
          shift ? { _id: shift.cashierId, username: shift.cashierName } : null
        }
      />
      <CashierActivityLogModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onBack={() => setIsActivityModalOpen(false)}
        cashier={
          shift ? { _id: shift.cashierId, username: shift.cashierName } : null
        }
        shiftId={shift?.shiftId}
      />
    </Dialog>
  );
}
