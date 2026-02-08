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
import { cn } from '@/lib/utils';
import type { Denomination } from '@/shared/types/vault';
import { AlertTriangle, CheckCircle2, Landmark, Minus, Plus, RefreshCw, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

type VaultCloseShiftModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (balance: number, denominations: Denomination[]) => Promise<void>;
  currentBalance: number;
  canClose: boolean;
  blockReason?: string;
  loading?: boolean;
};

const INITIAL_DENOMINATIONS: Denomination[] = [
  { denomination: 100, quantity: 0 },
  { denomination: 50, quantity: 0 },
  { denomination: 20, quantity: 0 },
  { denomination: 10, quantity: 0 },
  { denomination: 5, quantity: 0 },
  { denomination: 1, quantity: 0 },
];

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
  const [denominations, setDenominations] = useState<Denomination[]>(INITIAL_DENOMINATIONS);

  const totalAmount = useMemo(() => {
    return denominations.reduce((sum, d) => sum + (d.denomination * d.quantity), 0);
  }, [denominations]);

  const matchesExpected = totalAmount === currentBalance;

  const handleSubmit = async () => {
    await onConfirm(totalAmount, denominations.filter(d => d.quantity > 0));
    setDenominations(INITIAL_DENOMINATIONS);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-orange-50 border-b border-orange-100">
          <DialogTitle className="flex items-center gap-2 text-orange-900">
            <Landmark className="h-5 w-5 text-orange-600" />
            End of Day / Close Vault
          </DialogTitle>
          <DialogDescription className="text-orange-700/80">
            Complete the final physical count to close today's vault session.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-8 custom-scrollbar">
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
                <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-lg overflow-hidden relative border border-white/5">
                   <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Expected System Balance</p>
                   <p className="text-3xl font-black">{formatAmount(currentBalance)}</p>
                   <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-white/30 truncate">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      Calculated from daily activity
                   </div>
                   <Landmark className="absolute -right-4 -bottom-4 h-24 w-24 text-white/5" />
                </div>

                <div className={cn(
                  "rounded-2xl p-5 shadow-lg overflow-hidden relative border-2 transition-all duration-300",
                  matchesExpected 
                    ? "bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20" 
                    : "bg-orange-600 border-orange-500 text-white shadow-orange-500/20"
                )}>
                   <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Physical Count</p>
                      {matchesExpected ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <AlertTriangle className="h-4 w-4 text-orange-300" />}
                   </div>
                   <p className="text-3xl font-black">{formatAmount(totalAmount)}</p>
                   
                   {!matchesExpected && totalAmount > 0 && (
                     <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-tight text-white/60">
                        Discrepancy: {formatAmount(totalAmount - currentBalance)}
                     </div>
                   )}
                   {matchesExpected && totalAmount > 0 && (
                     <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-tight text-emerald-100">
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
                          ? "bg-orange-50/50 border-orange-200 ring-1 ring-orange-100 shadow-sm" 
                          : "bg-gray-50/30 border-gray-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm font-black text-xs",
                          denom.quantity > 0 ? "text-orange-600 border border-orange-100" : "text-gray-400 border border-transparent"
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
            disabled={loading || !canClose || totalAmount <= 0}
            className="order-1 sm:order-2 flex-1 h-12 bg-orange-600 text-white hover:bg-orange-700 font-black text-base shadow-lg shadow-orange-600/20 active:scale-[0.98] transition-all rounded-xl"
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
