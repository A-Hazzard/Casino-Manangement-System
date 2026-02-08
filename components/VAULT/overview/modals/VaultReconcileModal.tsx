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
import type { Denomination } from '@/shared/types/vault';
import { Info } from 'lucide-react';
import { useMemo, useState } from 'react';

type VaultReconcileModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    newBalance: number;
    denominations: Denomination[];
    reason: string;
    comment: string;
  }) => Promise<void>;
  currentBalance: number;
  systemDenominations: Denomination[];
};

const DENOMINATIONS = [100, 50, 20, 10, 5, 1] as const;

export default function VaultReconcileModal({
  open,
  onClose,
  onConfirm,
  currentBalance,
  systemDenominations = []
}: VaultReconcileModalProps) {
  const { formatAmount } = useCurrencyFormat();
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<Record<number, number>>({
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    1: 0,
  });
  const [reason, setReason] = useState('');

  const totalAmount = useMemo(() => {
    return Object.entries(breakdown).reduce(
      (sum, [denom, count]) => sum + Number(denom) * count,
      0
    );
  }, [breakdown]);

  const variance = totalAmount - currentBalance;

  const handleQuantityChange = (denom: number, value: string) => {
    const quantity = parseInt(value) || 0;
    if (quantity < 0) return;
    setBreakdown(prev => ({ ...prev, [denom]: quantity }));
  };

  const getSystemQuantity = (denom: number) => {
    return systemDenominations.find(d => d.denomination === denom)?.quantity || 0;
  };

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      alert('Reason must be at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      const denominations: Denomination[] = Object.entries(breakdown).map(
        ([denom, quantity]) => ({
          denomination: Number(denom) as Denomination['denomination'],
          quantity,
        })
      );

      await onConfirm({
        newBalance: totalAmount,
        denominations,
        reason: reason.trim() || 'Periodic reconciliation',
        comment: reason.trim(), // Both fields get the same value
      });
      onClose();
      // Reset form
      setBreakdown({ 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 });
      setReason('');
    } catch (error) {
      console.error('Reconciliation failed', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Vault Reconciliation Audit</DialogTitle>
          <DialogDescription>
            Compare your physical cash count against system records. Any adjustments will be strictly audited.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-8 py-4 lg:grid-cols-5">
          {/* Left: Denomination Grid */}
          <div className="lg:col-span-3 space-y-4">
             <div className="hidden sm:grid grid-cols-5 gap-2 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
               <div className="col-span-1">Bill</div>
               <div className="col-span-2 text-center">System Count</div>
               <div className="col-span-2 text-center">Physical Count</div>
             </div>

             <div className="space-y-3 sm:space-y-2">
               {DENOMINATIONS.map(denom => {
                 const systemQty = getSystemQuantity(denom);
                 const physicalQty = breakdown[denom];
                 const isDifferent = systemQty !== physicalQty;

                 return (
                   <div key={denom} className={`flex flex-col sm:grid sm:grid-cols-5 sm:items-center gap-3 sm:gap-2 rounded-lg border p-3 sm:p-2 ${isDifferent ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'}`}>
                     {/* Mobile Header */}
                     <div className="flex items-center justify-between sm:block">
                        <div className="text-sm font-bold text-gray-900 sm:text-gray-700">${denom} Bill</div>
                        <div className="sm:hidden flex items-center gap-2">
                           <span className="text-[10px] font-bold text-gray-400 uppercase">System:</span>
                           <span className="text-sm font-mono font-bold text-gray-600">{systemQty}</span>
                        </div>
                     </div>
                     
                     {/* System Count (Desktop) */}
                     <div className="hidden sm:flex col-span-2 justify-center">
                        <div className="w-full rounded bg-gray-100 px-3 py-2 text-center text-sm font-mono font-medium text-gray-600">
                          {systemQty}
                        </div>
                     </div>

                     {/* Physical Input */}
                     <div className="sm:col-span-2 flex flex-col sm:flex-row items-center gap-2">
                        <span className="sm:hidden text-[10px] font-bold text-gray-400 uppercase self-start">Physical Count:</span>
                        <Input
                          type="number"
                          min="0"
                          value={breakdown[denom] || ''}
                          onChange={e => handleQuantityChange(denom, e.target.value)}
                          className={`text-center font-mono font-bold h-11 sm:h-9 ${isDifferent ? 'border-amber-400 focus-visible:ring-amber-400' : ''}`}
                          placeholder="0"
                        />
                     </div>
                   </div>
                 );
               })}
             </div>

             <div className="flex items-center justify-between rounded-xl bg-gray-900 p-4 text-white shadow-lg">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Physical Count</p>
                  <p className="text-2xl font-black">{formatAmount(totalAmount)}</p>
                </div>
                <div className="h-10 w-10 shrink-0 rounded-full bg-white/10 flex items-center justify-center">
                   <Landmark className="h-5 w-5 text-gray-300" />
                </div>
             </div>
          </div>

          {/* Right: Summary & Audit */}
          <div className="lg:col-span-2 space-y-5">
             <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500 font-medium">System Ledger:</span>
                   <span className="font-mono font-bold text-gray-900">{formatAmount(currentBalance)}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200">
                   <span className="text-gray-500 font-bold">Variance:</span>
                   <span className={`font-mono font-black text-lg ${variance === 0 ? 'text-green-600' : variance > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {variance > 0 ? '+' : ''}{formatAmount(variance)}
                   </span>
                </div>
             </div>

             <div className="space-y-4">
               <div className="space-y-2">
                 <Label htmlFor="reason" className="text-xs font-bold uppercase text-gray-500">Adjustment Reason (10 char min)</Label>
                 <Textarea
                   id="reason"
                   placeholder="Detailed explanation for this audit event..."
                   value={reason}
                   onChange={e => setReason(e.target.value)}
                   rows={6}
                   className={`bg-white resize-none ${reason.length > 0 && reason.length < 10 ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                 />
               </div>
             </div>

             <div className="flex items-start gap-2 rounded-lg bg-blue-50/50 p-3 text-[11px] text-blue-700 border border-blue-100">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Reconciliation updates the system "Source of Truth" to match your physical count. This is a non-reversible audit event.</p>
             </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || reason.length < 10}
            className="bg-orangeHighlight text-white hover:bg-orangeHighlight/90 px-8 h-11 font-bold shadow-md shadow-orangeHighlight/20"
          >
            {loading ? 'Reconciling...' : 'Confirm Audit Adjustment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Landmark } from 'lucide-react';

