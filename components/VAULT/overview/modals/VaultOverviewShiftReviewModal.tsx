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
  RotateCcw
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
import { useVaultLicensee } from '@/lib/hooks/vault/useVaultLicensee';
import { cn } from '@/lib/utils';
import { getDenominationValues, getInitialDenominationRecord } from '@/lib/utils/vault/denominations';
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
  onSuccess
}: VaultOverviewShiftReviewModalProps) {
  const { formatAmount } = useCurrencyFormat();
  const { licenseeId: selectedLicencee } = useVaultLicensee();
  
  const [isRejecting, setIsRejecting] = useState(false);
  const [finalBalance, setFinalBalance] = useState<string>('');
  const [auditComment, setAuditComment] = useState<string>('');
  const [isEditingBreakdown, setIsEditingBreakdown] = useState(false);
  const [shiftDenominations, setShiftDenominations] = useState<Record<string, number>>({});
  const [touchedDenominations, setTouchedDenominations] = useState<Set<string>>(new Set());
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
    if (!shift || !isEditingBreakdown) return { hasShortage: false, shortages: [] };

    const shortages = Object.entries(shiftDenominations)
      .filter(([_, qty]) => qty > 0)
      .map(([denom, qty]) => ({ denomination: Number(denom), quantity: qty }))
      .filter(req => {
        const stock = vaultInventory.find(v => Number(v.denomination) === Number(req.denomination))?.quantity || 0;
        return Number(req.quantity) > Number(stock);
      });

    return { hasShortage: shortages.length > 0, shortages };
  }, [shift, isEditingBreakdown, shiftDenominations, vaultInventory]);

  const { hasShortage } = currentShortageCheck;

  const handleResolve = async () => {
    if (!shift) return;
    const balance = parseFloat(isEditingBreakdown ? shiftTotal.toString() : finalBalance);
    if (isNaN(balance) || balance < 0) {
      toast.error('Please enter a valid final balance');
      return;
    }

    setLoading(true);
    try {
      const denoms = isEditingBreakdown 
        ? Object.entries(shiftDenominations)
            .filter(([_, qty]) => qty > 0)
            .map(([val, qty]) => ({ denomination: Number(val) as Denomination['denomination'], quantity: qty }))
        : undefined;

      const res = await fetch('/api/cashier/shift/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId: shift.shiftId, finalBalance: balance, auditComment: auditComment.trim(), denominations: denoms })
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
  const allTouched = denomValues.every(d => touchedDenominations.has(d.toString()));
  const isValidResolution = !isEditingBreakdown || (shiftTotal > 0 || allTouched);

  const handleReject = async () => {
    if (!shift) return;
    setLoading(true);
    try {
      const res = await fetch('/api/cashier/shift/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId: shift.shiftId, reason: auditComment.trim() })
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
    if (absDisc === 0) return 'Carefully re-count your physical cash and please resubmit.';
    const direction = discrepancy > 0 ? 'over' : 'short';
    let message = `Your count is $${absDisc.toFixed(2)} ${direction}. `;
    const commonDenoms = getDenominationValues(selectedLicencee);
    const matchingDenom = commonDenoms.find(d => Math.abs(absDisc - d) < 0.01);
    if (matchingDenom) message += `It looks like you might have miscounted a $${matchingDenom} bill. `;
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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent 
        className={cn(
          "w-full h-[100dvh] md:h-auto md:max-w-[650px] flex flex-col p-0 overflow-hidden rounded-none md:rounded-2xl border-none shadow-2xl transition-all duration-300",
          isOverlayOpen && "blur-sm brightness-50 pointer-events-none scale-[0.98]"
        )}
        backdropClassName="bg-black/90 backdrop-blur-md !z-[190]"
      >
        {/* Premium Header */}
        <DialogHeader className="p-6 bg-gradient-to-r from-orange-600 to-amber-600 shrink-0 text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
             <AlertTriangle className="h-24 w-24 text-white" />
          </div>
          <div className="relative z-10 space-y-1">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Landmark className="h-4 w-4 text-white" />
                    </div>
                    <DialogTitle className="text-xl font-black text-white tracking-tight">
                        Shift Review
                    </DialogTitle>
                </div>
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 backdrop-blur-md">
                    Action Required
                </Badge>
            </div>
            <DialogDescription className="text-orange-50/90 font-bold text-sm">
                Resolving discrepancy for <span className="text-white underline decoration-white/30 underline-offset-4">{shift.cashierName}</span>
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 bg-[#fcfcfd] custom-scrollbar md:max-h-[70vh]">
            {/* Discrepancy Hero Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Financial Variance</h3>
                    <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
                        shift.discrepancy > 0 ? "bg-red-50 text-red-600" : shift.discrepancy < 0 ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-600"
                    )}>
                        {shift.discrepancy > 0 ? 'Shortage Identified' : shift.discrepancy < 0 ? 'Overage Identified' : 'Balanced'}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Expected Balance</span>
                        <p className="text-2xl font-black text-gray-900 tracking-tighter">{formatAmount(shift.expectedBalance)}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Cashier Submission</span>
                        <p className="text-2xl font-black text-gray-900 tracking-tighter">{formatAmount(shift.enteredBalance)}</p>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">Calculated Discrepancy:</span>
                    <span className={cn(
                        "text-3xl font-black tracking-tighter",
                        shift.discrepancy > 0 ? "text-red-600" : shift.discrepancy < 0 ? "text-green-600" : "text-gray-900"
                    )}>
                        {shift.discrepancy > 0 ? '-' : shift.discrepancy < 0 ? '+' : ''}{formatAmount(Math.abs(shift.discrepancy))}
                    </span>
                </div>
            </div>

            {/* Verification Tools */}
            <div className="space-y-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400 px-1">Verification Tools</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-orange-200 transition-all text-left group"
                    >
                        <div className="h-10 w-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                            <BarChart3 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-900 uppercase tracking-tight">Shift History</p>
                            <p className="text-[10px] text-gray-400 font-bold">Past performances</p>
                        </div>
                    </button>
                    <button
                        onClick={() => setIsActivityModalOpen(true)}
                        className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-orange-200 transition-all text-left group"
                    >
                        <div className="h-10 w-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                            <HistoryIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-900 uppercase tracking-tight">Audit Logs</p>
                            <p className="text-[10px] text-gray-400 font-bold">Trace transactions</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Resolution Form */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Resolution Strategy</h3>
                    {!isRejecting && (
                        <button 
                            onClick={() => setIsEditingBreakdown(!isEditingBreakdown)}
                            className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border transition-all",
                                isEditingBreakdown ? "bg-orange-600 border-orange-600 text-white" : "border-gray-200 text-gray-400 hover:border-orange-400 hover:text-orange-600"
                            )}
                        >
                            {isEditingBreakdown ? 'Disable Breakdown Edit' : 'Adjust Breakdown'}
                        </button>
                    )}
                </div>

                {!isRejecting ? (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                            {!isEditingBreakdown ? (
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Final Agreed Balance</Label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xl">$</div>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={finalBalance}
                                            onChange={e => setFinalBalance(e.target.value)}
                                            className="h-14 pl-10 text-2xl font-black text-gray-900 border-2 border-gray-50 focus:border-orange-500/30 rounded-xl bg-gray-50/30"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="bg-orange-50 p-4 rounded-xl flex items-center justify-between border border-orange-100">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-700">Calculated Adjustment</span>
                                        </div>
                                        <span className="text-xl font-black text-orange-600">{formatAmount(shiftTotal)}</span>
                                    </div>

                                    <DenominationInputGrid
                                        denominations={Object.entries(shiftDenominations).map(([d, q]) => ({ denomination: Number(d) as any, quantity: q }))}
                                        onChange={(newDenoms: Denomination[]) => {
                                            const newRecord: Record<string, number> = {};
                                            newDenoms.forEach((d: Denomination) => {
                                                newRecord[d.denomination.toString()] = d.quantity;
                                            });
                                            setShiftDenominations(newRecord);
                                        }}
                                        stock={vaultInventory}
                                        touchedDenominations={new Set(Array.from(touchedDenominations).map(Number))}
                                        onTouchedChange={(newTouched: Set<number>) => {
                                            setTouchedDenominations(new Set(Array.from(newTouched).map(String)));
                                        }}
                                    />

                                    {hasShortage && (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                                            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-red-700 font-bold leading-relaxed">
                                                INVENTORY ALERT: The selected denominations exceed current vault stock.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Resolution Audit Note</Label>
                                <Textarea
                                    value={auditComment}
                                    onChange={e => setAuditComment(e.target.value)}
                                    placeholder="Briefly explain the cause of discrepancy..."
                                    className="min-h-[100px] border-2 border-gray-50 focus:border-orange-500/30 rounded-xl bg-gray-50/30 text-sm font-medium"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-start gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
                            <RotateCcw className="h-5 w-5 text-red-600 shrink-0 mt-1" />
                            <div>
                                <h4 className="font-black text-red-900 text-xs uppercase tracking-widest mb-1">Returning to Cashier</h4>
                                <p className="text-[11px] text-red-700 font-medium leading-relaxed">
                                    The shift will be sent back to the cashier's dashboard as "Active". They will be forced to re-count and resubmit based on your instructions.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Rejection Primary Reason</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {['Miscount', 'Variance', 'Denoms', 'Other'].map(r => (
                                    <button
                                        key={r}
                                        onClick={() => {
                                            if (r === 'Other') setAuditComment('');
                                            else setAuditComment(`[${r.toUpperCase()}] ${getSuggestedRejectionReason(shift)}`);
                                        }}
                                        className={cn(
                                            "p-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-tighter transition-all",
                                            auditComment.includes(r.toUpperCase()) 
                                                ? "bg-red-600 border-red-600 text-white shadow-xl shadow-red-200" 
                                                : "bg-gray-50 border-transparent text-gray-400 hover:border-red-200 hover:text-red-600"
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
                                className="min-h-[120px] border-2 border-red-50 focus:border-red-500/30 rounded-xl bg-red-50/20 text-sm font-medium"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 md:p-6 bg-gray-50 border-t shrink-0 flex-col gap-3">
             {!isRejecting ? (
                 <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <Button
                        onClick={handleResolve}
                        disabled={loading || hasShortage || !isValidResolution}
                        className="flex-[2] h-12 bg-orange-600 text-white hover:bg-orange-700 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-orange-200 transition-all active:scale-[0.98] rounded-xl"
                    >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Confirm Resolution"}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={startRejection}
                        disabled={loading}
                        className="flex-1 h-12 text-red-600 hover:text-red-700 hover:bg-red-50 font-black uppercase text-[10px] tracking-widest rounded-xl"
                    >
                        Return to Start
                    </Button>
                 </div>
             ) : (
                 <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <Button
                        onClick={handleReject}
                        disabled={loading || auditComment.length < 5}
                        className="flex-[2] h-12 bg-red-600 text-white hover:bg-red-700 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-200 transition-all active:scale-[0.98] rounded-xl"
                    >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Execute Return"}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setIsRejecting(false);
                            setAuditComment('');
                        }}
                        disabled={loading}
                        className="flex-1 h-12 text-gray-400 font-black uppercase text-[10px] tracking-widest rounded-xl"
                    >
                        Cancel Rejection
                    </Button>
                 </div>
             )}
             <Button variant="ghost" onClick={onClose} disabled={loading} className="w-full text-gray-300 font-black uppercase text-[10px] tracking-widest hover:text-gray-500">
                Close
             </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* History & Activity Modals */}
      <CashierShiftHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onBack={() => setIsHistoryModalOpen(false)}
        cashier={shift ? { _id: shift.cashierId, username: shift.cashierName } : null}
      />
      <CashierActivityLogModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onBack={() => setIsActivityModalOpen(false)}
        cashier={shift ? { _id: shift.cashierId, username: shift.cashierName } : null}
        shiftId={shift?.shiftId}
      />
    </Dialog>
  );
}
