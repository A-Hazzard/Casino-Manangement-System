'use client';

import { AlertTriangle, Info, Landmark, MessageSquare, RefreshCw, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import DenominationInputGrid from '@/components/shared/ui/DenominationInputGrid';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/shared/ui/tooltip';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { cn } from '@/lib/utils';
import { getDenominationValues, getInitialDenominationRecord } from '@/lib/utils/vault/denominations';
import type { Denomination, UnbalancedShiftInfo } from '@/shared/types/vault';

interface VaultShiftReviewModalProps {
  open: boolean;
  onClose: () => void;
  shift: UnbalancedShiftInfo | null;
  vaultInventory?: Denomination[];
  onSuccess?: () => void;
}

export default function VaultShiftReviewModal({
  open,
  onClose,
  shift,
  vaultInventory = [],
  onSuccess
}: VaultShiftReviewModalProps) {
  const { formatAmount } = useCurrencyFormat();
  const { selectedLicencee } = useDashBoardStore();
  
  const [isRejecting, setIsRejecting] = useState(false);
  const [finalBalance, setFinalBalance] = useState<string>('');
  const [auditComment, setAuditComment] = useState<string>('');
  const [isEditingBreakdown, setIsEditingBreakdown] = useState(false);
  const [shiftDenominations, setShiftDenominations] = useState<Record<string, number>>({});
  const [touchedDenominations, setTouchedDenominations] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

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

  if (!shift) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent 
        className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto !z-[200]"
        backdropClassName="bg-black/90 backdrop-blur-md !z-[190]"
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <AlertTriangle className="h-5 w-5 text-orangeHighlight" />
              Review Shift: {shift.cashierName}
            </DialogTitle>
            <Badge className="bg-orangeHighlight text-white font-bold px-3">
              Review Required
            </Badge>
          </div>
          <DialogDescription>
            Verify the shift counts and resolve discrepancies or return to cashier.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <TooltipProvider>
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-4 bg-orange-50 border border-orange-100 rounded-lg p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-gray-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Expected</span>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 opacity-50 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>The balance the system expects.</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm font-black text-gray-900">{formatAmount(shift.expectedBalance)}</p>
              </div>

              <div className="space-y-1 border-x border-orange-200 px-4">
                <div className="flex items-center gap-1 text-gray-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Entered</span>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 opacity-50 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>The actual physical count submitted by cashier.</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm font-black text-gray-900">{formatAmount(shift.enteredBalance)}</p>
              </div>

              <div className="space-y-1 pl-4">
                <div className="flex items-center gap-1 text-gray-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Discrepancy</span>
                </div>
                <p className={cn(
                  "text-sm font-black",
                  shift.discrepancy > 0 ? "text-red-600" : shift.discrepancy < 0 ? "text-green-600" : "text-gray-600"
                )}>
                  {shift.discrepancy > 0 ? '+' : ''}{formatAmount(shift.discrepancy)}
                </p>
              </div>
            </div>

            {/* Cashier Count Breakdown */}
            {shift.enteredDenominations && shift.enteredDenominations.length > 0 && !isEditingBreakdown && (
              <div className="bg-white rounded-md p-4 border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Cashier Count Breakdown</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {shift.enteredDenominations
                    .filter(d => d.quantity > 0)
                    .sort((a, b) => b.denomination - a.denomination)
                    .map((d, i) => (
                      <div key={i} className="flex flex-col items-center bg-gray-50 rounded border border-gray-100 py-1.5 shadow-sm">
                        <span className="text-[10px] text-gray-500 font-bold">${d.denomination}</span>
                        <span className="text-sm font-black text-gray-900">{d.quantity}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Reconciliation UI */}
            <div className="space-y-4 border-t pt-4">
              {!isRejecting ? (
                <>
                  <div className="flex items-end justify-between gap-4">
                    <div className="flex-1">
                      <Label className="text-sm font-medium text-gray-700">Final Balance</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={isEditingBreakdown ? shiftTotal : finalBalance}
                        onChange={e => !isEditingBreakdown && setFinalBalance(e.target.value)}
                        disabled={isEditingBreakdown}
                        className="mt-1"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!isEditingBreakdown) {
                          if (!finalBalance) setFinalBalance(shiftTotal.toString());
                        }
                        setIsEditingBreakdown(!isEditingBreakdown);
                      }}
                      className={cn(isEditingBreakdown && "bg-orange-100 border-orange-300 text-orange-900")}
                    >
                      {isEditingBreakdown ? "Cancel Edit Breakdown" : "Edit Breakdown"}
                    </Button>
                  </div>

                  {isEditingBreakdown && (
                    <div className="bg-white p-4 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                          Adjust Breakdown
                        </Label>
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-bold text-gray-400 uppercase">Calculated Total</span>
                          <span className="text-base font-black text-orange-600">{formatAmount(shiftTotal)}</span>
                        </div>
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
                      
                      <div className="mt-4 p-3 bg-orange-50 rounded border border-orange-100 text-[11px] text-orange-700 leading-relaxed font-medium">
                         <strong>Vault Manager Override:</strong> Adjusting the denominations here will update the physical count that will be received into the vault. Use this to correct obvious cashier errors.
                      </div>
                    </div>
                  )}

                  {hasShortage && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-md flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-red-800 uppercase tracking-tight">Insufficient Stock</p>
                        <p className="text-[11px] text-red-700">Adjusted breakdown exceeds vault inventory. Verify counts before resolving.</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                   <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase mb-1">
                      <RotateCcw className="h-4 w-4" />
                      Returning to Cashier
                   </div>
                   <p className="text-xs text-red-600 leading-relaxed">
                      This will revert the shift to <strong>Active</strong>. The cashier must re-count and resubmit based on your comments.
                   </p>
                </div>
              )}

              <div>
                <Label className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4" />
                  {isRejecting ? 'Reason for Rejection' : 'Audit Comment (Optional)'}
                </Label>
                
                {isRejecting ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: 'Miscount', icon: RefreshCw, color: 'text-amber-500', bg: 'hover:bg-amber-50' },
                        { label: 'Variance', icon: Landmark, color: 'text-blue-500', bg: 'hover:bg-blue-50' },
                        { label: 'Denoms', icon: Landmark, color: 'text-purple-500', bg: 'hover:bg-purple-50' },
                        { label: 'Other', icon: MessageSquare, color: 'text-gray-500', bg: 'hover:bg-gray-50' }
                      ].map(item => {
                        const isSelected = auditComment.includes(item.label) || (item.label === 'Other' && auditComment.length > 0 && !['Miscount', 'Variance', 'Denoms'].some(r => auditComment.includes(r)));
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              if (item.label === 'Other') setAuditComment('');
                              else {
                                const suggested = getSuggestedRejectionReason(shift);
                                setAuditComment(`[${item.label.toUpperCase()}] ${suggested}`);
                              }
                            }}
                            className={cn(
                              "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5",
                              auditComment.includes(item.label) 
                                ? "bg-red-600 border-red-600 text-white shadow-md shadow-red-200" 
                                : "bg-white border-gray-100 text-gray-600",
                                !isSelected && item.bg
                            )}
                          >
                            <Icon className={cn("h-4 w-4", auditComment.includes(item.label) ? "text-white" : item.color)} />
                            <span className="text-[10px] font-black uppercase tracking-tight leading-tight">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <Textarea
                      value={auditComment}
                      onChange={e => setAuditComment(e.target.value)}
                      placeholder="Provide specific details for the cashier..."
                      className="mt-3 border-2 border-gray-100 focus:border-red-500/50 min-h-[100px] rounded-xl text-sm"
                      rows={3}
                    />
                  </div>
                ) : (
                  <Textarea
                    value={auditComment}
                    onChange={e => setAuditComment(e.target.value)}
                    placeholder="Explain resolution (optional)..."
                    className="mt-1 border-2 border-gray-100 focus:border-orangeHighlight/50 rounded-xl text-sm"
                    rows={3}
                  />
                )}
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                {!isRejecting ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleResolve}
                      disabled={loading || hasShortage || !isValidResolution}
                      className="flex-1 h-12 bg-button text-white hover:bg-button/90 font-black text-sm shadow-lg shadow-button/20 active:scale-[0.98] transition-all rounded-xl"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                           <RefreshCw className="h-4 w-4 animate-spin" />
                           Processing...
                        </div>
                      ) : hasShortage ? "Insufficient Stock" : !isValidResolution ? "Enter Count" : "Confirm & Resolve Shift"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={startRejection}
                      disabled={loading}
                      className="h-12 text-red-600 hover:text-red-700 hover:bg-red-50 font-black text-sm rounded-xl"
                    >
                      Reject for Correction
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleReject}
                    disabled={loading || auditComment.length < 5}
                    className="w-full h-12 bg-red-600 text-white hover:bg-red-700 font-black text-sm shadow-lg shadow-red-600/20 active:scale-[0.98] transition-all rounded-xl"
                  >
                    {loading ? (
                       <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Processing...
                       </div>
                    ) : "Return to Cashier"}
                  </Button>
                )}
                <Button variant="ghost" onClick={onClose} disabled={loading} className="w-full text-gray-400 font-black hover:text-gray-600">
                  Cancel
                </Button>
              </div>
            </div>
          </TooltipProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}
