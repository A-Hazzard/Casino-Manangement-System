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
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { cn } from '@/lib/utils';
import { getDenominationValues } from '@/lib/utils/vault/denominations';
import type { Denomination } from '@/shared/types/vault';
import { AlertTriangle, CheckCircle2, Landmark, Minus, Plus, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type VaultCloseShiftModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (balance: number, denominations: Denomination[]) => Promise<void>;
  currentBalance: number;
  canClose: boolean;
  blockReason?: string;
  loading?: boolean;
};

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
  const { selectedLicencee } = useDashBoardStore();
  const [denominations, setDenominations] = useState<Denomination[]>([]);

  const denomsList = useMemo(() => getDenominationValues(selectedLicencee), [selectedLicencee]);

  useEffect(() => {
    if (open) {
      setDenominations(denomsList.map(d => ({ denomination: d as any, quantity: 0 })));
    }
  }, [open, denomsList]);

  const totalAmount = useMemo(() => {
    return denominations.reduce((sum, d) => sum + (d.denomination * d.quantity), 0);
  }, [denominations]);

  const matchesExpected = totalAmount === currentBalance;

  const handleSubmit = async () => {
    await onConfirm(totalAmount, denominations.filter(d => d.quantity > 0));
    setDenominations(denomsList.map(d => ({ denomination: d as any, quantity: 0 })));
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-violet-50 border-b border-violet-100">
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            <Landmark className="h-5 w-5 text-violet-600" />
            End of Day / Close Vault
          </DialogTitle>
          <DialogDescription className="text-violet-700/80">
            Complete the final physical count to close today's vault session.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {!canClose && (
            <div className="flex items-start gap-4 rounded-2xl bg-red-50 p-5 border-2 border-red-100/50 shadow-sm">
               <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                 <XCircle className="h-5 w-5 text-red-600" />
               </div>
               <div className="space-y-1">
                 <p className="text-sm font-black text-red-900 uppercase tracking-tight">Closing Blocked</p>
                 <p className="text-xs text-red-800/80 leading-relaxed font-medium">
                   {blockReason || "Active cashier shifts must be closed before the vault can be finalized."}
                 </p>
               </div>
            </div>
          )}

          {canClose && (
            <>
              {/* Dual Balance Display - Comparison Style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm relative overflow-hidden group hover:border-violet-200 transition-colors">
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Expected System Balance</p>
                   <p className="text-3xl font-black text-gray-800 tracking-tight">{formatAmount(currentBalance)}</p>
                   <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-gray-400 truncate">
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                      Calculated from daily activity
                   </div>
                   <Landmark className="absolute -right-4 -bottom-4 h-24 w-24 text-gray-50 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity" />
                </div>

                <div className={cn(
                  "rounded-2xl p-5 border shadow-sm relative overflow-hidden transition-all duration-300",
                  matchesExpected 
                    ? "bg-emerald-50/60 border-emerald-200 text-emerald-900 shadow-emerald-50" 
                    : "bg-orange-50/60 border-orange-200 text-orange-900 shadow-orange-50"
                )}>
                   <div className="flex items-center justify-between mb-1">
                      <p className={cn("text-[10px] font-black uppercase tracking-widest", matchesExpected ? "text-emerald-400" : "text-orange-400")}>Physical Count</p>
                      {matchesExpected ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-orange-500" />}
                   </div>
                   <p className={cn("text-3xl font-black tracking-tight", matchesExpected ? "text-emerald-700" : "text-orange-700")}>{formatAmount(totalAmount)}</p>
                   
                   {!matchesExpected && totalAmount > 0 && (
                     <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-tight text-orange-600/80">
                        Discrepancy: {formatAmount(totalAmount - currentBalance)}
                     </div>
                   )}
                   {matchesExpected && totalAmount > 0 && (
                     <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-tight text-emerald-600/80">
                        Balance fully reconciled
                     </div>
                   )}
                </div>
              </div>

              {/* Denomination Input - Row System */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                    Physical Denomination Breakdown
                  </Label>
                  {totalAmount > 0 && (
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                      matchesExpected ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                    )}>
                      {matchesExpected ? "Balanced" : "Discrepant"}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {denominations.map((denom, index) => (
                    <div 
                      key={denom.denomination} 
                      className={cn(
                        "relative flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                        denom.quantity > 0 
                          ? "bg-violet-50/50 border-violet-200 ring-1 ring-violet-100 shadow-sm" 
                          : "bg-gray-50/30 border-gray-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm font-black text-xs",
                          denom.quantity > 0 ? "text-violet-600 border border-violet-100" : "text-gray-400 border border-transparent"
                        )}>
                          ${denom.denomination}
                        </div>
                        <span className="text-xs font-bold text-gray-700">Bills</span>
                      </div>

                      <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5 shadow-sm">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-gray-100 text-gray-500 rounded-md"
                          onClick={() => {
                            const newDenoms = [...denominations];
                            newDenoms[index].quantity = Math.max(0, newDenoms[index].quantity - 1);
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
                            const newDenoms = [...denominations];
                            newDenoms[index].quantity = parseInt(e.target.value) || 0;
                            setDenominations(newDenoms);
                          }}
                          className="w-10 h-7 border-none bg-transparent text-center font-black p-0 focus-visible:ring-0 text-sm"
                          placeholder="0"
                        />
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-gray-100 text-gray-500 rounded-md"
                          onClick={() => {
                            const newDenoms = [...denominations];
                            newDenoms[index].quantity = (newDenoms[index].quantity || 0) + 1;
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

        <DialogFooter className="p-4 bg-gray-50 border-t flex flex-col sm:flex-row gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="order-2 sm:order-1 font-bold text-gray-500">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !canClose || (totalAmount <= 0 && currentBalance !== 0)}
            className="order-1 sm:order-2 flex-1 h-12 bg-violet-600 text-white hover:bg-violet-700 font-black text-base shadow-lg shadow-violet-600/20 active:scale-[0.98] transition-all rounded-xl"
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
  );
}
