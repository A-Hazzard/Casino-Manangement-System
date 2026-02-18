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
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { cn } from '@/lib/utils';
import { getDenominationValues, getInitialDenominationRecord } from '@/lib/utils/vault/denominations';
import type { Denomination } from '@/shared/types/vault';
import { Briefcase, FileText, Info, Landmark, RefreshCw, ShieldCheck, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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



export default function VaultReconcileModal({
  open,
  onClose,
  onConfirm,
  currentBalance,
  systemDenominations = []
}: VaultReconcileModalProps) {
  const { formatAmount } = useCurrencyFormat();
  const { selectedLicencee } = useDashBoardStore();
  const [loading, setLoading] = useState(false);
  
  const denominationsList = useMemo(() => getDenominationValues(selectedLicencee), [selectedLicencee]);
  
  const [breakdown, setBreakdown] = useState<Record<number, number>>({});
  const [touchedDenominations, setTouchedDenominations] = useState<Set<number>>(new Set());
  const [reason, setReason] = useState('');
  const [source, setSource] = useState<string>('Periodic');

  // Update breakdown when licensee changes or modal opens
  useEffect(() => {
    if (open) {
      setBreakdown(getInitialDenominationRecord(selectedLicencee) as Record<any, number>);
      setTouchedDenominations(new Set());
      setSource('Periodic');
      setReason('');
    }
  }, [selectedLicencee, open]);

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
    setTouchedDenominations(prev => {
        const next = new Set(prev);
        next.add(Number(denom));
        return next;
    });
  };

  const isAllTouched = denominationsList.every(d => touchedDenominations.has(Number(d)));
  const isValidCount = totalAmount > 0 || isAllTouched;

  const getSystemQuantity = (denom: number) => {
    return systemDenominations.find(d => d.denomination === denom)?.quantity || 0;
  };

  const RECON_SOURCES = [
    { label: 'Periodic', icon: FileText },
    { label: 'Shift', icon: RefreshCw },
    { label: 'Audit', icon: ShieldCheck },
    { label: 'Error', icon: Wrench },
    { label: 'Other', icon: Briefcase }
  ];

  const handleSubmit = async () => {
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
        reason: `${source ? `[${source}] ` : ''}${reason.trim()}` || 'Periodic reconciliation',
        comment: reason.trim(), // Both fields get the same value
      });
      onClose();
      // Reset form
      setBreakdown(getInitialDenominationRecord(selectedLicencee) as Record<any, number>);
      setTouchedDenominations(new Set());
      setReason('');
      setSource('Periodic');
    } catch (error) {
      console.error('Reconciliation failed', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-violet-50 border-b border-violet-100">
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            <Landmark className="h-5 w-5 text-violet-600" />
            Vault Reconciliation
          </DialogTitle>
          <DialogDescription className="text-violet-700/80">
            Compare your physical cash count against system records. Any adjustments will be strictly audited.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            {/* Left: Denomination Grid */}
            <div className="lg:col-span-3 space-y-4">
               <div className="hidden sm:grid grid-cols-5 gap-2 px-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                 <div className="col-span-1">Bill</div>
                 <div className="col-span-2 text-center">System Count</div>
                 <div className="col-span-2 text-center">Physical Count</div>
               </div>

               <div className="space-y-3 sm:space-y-2">
                 {denominationsList.map(denom => {
                   const systemQty = getSystemQuantity(denom);
                   const physicalQty = breakdown[denom];
                   const isDifferent = systemQty !== physicalQty;

                   return (
                     <div key={denom} className={cn(
                        "flex flex-col sm:grid sm:grid-cols-5 sm:items-center gap-3 sm:gap-2 rounded-xl border p-3 transition-all duration-200",
                        isDifferent ? 'border-amber-200 bg-amber-50/30 ring-1 ring-amber-100' : 'border-gray-100 bg-gray-50/10'
                     )}>
                       {/* Mobile Header */}
                       <div className="flex items-center justify-between sm:block">
                          <div className="text-sm font-black text-gray-900 uppercase tracking-tight sm:text-gray-700">${denom} Bill</div>
                          <div className="sm:hidden flex items-center gap-2">
                             <span className="text-[10px] font-black text-gray-400 uppercase">System:</span>
                             <span className="text-sm font-bold text-gray-600">{systemQty}</span>
                          </div>
                       </div>
                       
                       {/* System Count (Desktop) */}
                       <div className="hidden sm:flex col-span-2 justify-center">
                          <div className="w-full rounded-lg bg-white border border-gray-100 px-3 py-2 text-center text-sm font-bold text-gray-500 shadow-sm">
                            {systemQty}
                          </div>
                       </div>

                       {/* Physical Input */}
                       <div className="sm:col-span-2 flex flex-col sm:flex-row items-center gap-2">
                          <span className="sm:hidden text-[10px] font-black text-gray-400 uppercase self-start">Physical Count:</span>
                          <Input
                            type="number"
                            min="0"
                            value={breakdown[denom] || ''}
                            onChange={e => handleQuantityChange(denom, e.target.value)}
                            className={cn(
                                "text-center font-black h-11 sm:h-9 rounded-lg bg-white border-2 transition-all",
                                isDifferent ? 'border-amber-400 focus-visible:ring-amber-400/30' : 'border-gray-100 focus-visible:ring-violet-500/30',
                                touchedDenominations.has(Number(denom)) && "text-violet-600"
                            )}
                            placeholder="0"
                          />
                       </div>
                     </div>
                   );
                 })}
               </div>

               <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-xl shadow-violet-500/20 relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-violet-100/60 mb-1">Total Physical Count</p>
                    <p className="text-3xl font-black tracking-tight">{formatAmount(totalAmount)}</p>
                  </div>
                  <div className="relative z-10 h-12 w-12 shrink-0 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                     <Landmark className="h-6 w-6 text-violet-100" />
                  </div>
                  <Landmark className="absolute -right-4 -bottom-4 h-24 w-24 text-white/5 rotate-12" />
               </div>
            </div>

            {/* Right: Summary & Audit */}
            <div className="lg:col-span-2 space-y-6">
               <div className="rounded-2xl border border-violet-100 bg-violet-50/30 p-5 space-y-4">
                  <div className="flex justify-between items-center text-xs uppercase tracking-wider font-black text-gray-400">
                     <span>System Ledger:</span>
                     <span className="text-gray-900">{formatAmount(currentBalance)}</span>
                  </div>
                  <div className="pt-4 border-t border-violet-100 flex justify-between items-center">
                     <span className="text-[11px] font-black uppercase tracking-widest text-violet-400">Variance:</span>
                     <span className={cn(
                        "text-xl font-black tracking-tight",
                        variance === 0 ? "text-emerald-600" : variance > 0 ? "text-violet-600" : "text-red-600"
                     )}>
                        {variance > 0 ? '+' : ''}{formatAmount(variance)}
                     </span>
                  </div>
               </div>

               <div className="space-y-4">
                 <div className="space-y-1.5">
                   <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Reconciliation Source</Label>
                   <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                     {RECON_SOURCES.map(cat => {
                       const isSelected = source === cat.label;
                       const Icon = cat.icon;
                       return (
                         <button
                           key={cat.label}
                           type="button"
                           onClick={() => setSource(cat.label)}
                           className={cn(
                             "flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all gap-1.5",
                             isSelected 
                               ? "bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-200" 
                               : "bg-white border-gray-100 text-gray-600 hover:border-violet-200 hover:bg-violet-50/30"
                           )}
                         >
                           <Icon className={cn("h-4 w-4", isSelected ? "text-white" : "text-violet-500")} />
                           <span className="text-[9px] font-black uppercase tracking-tight leading-tight">{cat.label}</span>
                         </button>
                       );
                     })}
                   </div>
                 </div>

                 <div className="space-y-1.5">
                   <Label htmlFor="reason" className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Adjustment Notes (Optional)</Label>
                   <Textarea
                     id="reason"
                     placeholder="Detailed explanation for this audit event..."
                     value={reason}
                     onChange={e => setReason(e.target.value)}
                     rows={4}
                     className="bg-gray-50/50 border-gray-100 rounded-2xl resize-none focus:bg-white transition-all text-sm border-2"
                   />
                 </div>
               </div>

               <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-[11px] text-amber-800 border border-amber-100/50">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <p className="font-medium leading-relaxed">Reconciliation updates the system "Source of Truth" to match your physical cash count. This is a non-reversible adjustment.</p>
               </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-gray-50 border-t flex flex-col sm:flex-row gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="order-2 sm:order-1 font-bold text-gray-500">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !isValidCount}
            className="order-1 sm:order-2 flex-1 h-12 bg-violet-600 text-white hover:bg-violet-700 font-black text-base shadow-lg shadow-violet-600/20 active:scale-[0.98] transition-all rounded-xl"
          >
            {loading ? (
                <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Reconciling...
                </div>
            ) : 'Confirm Reconciliation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


