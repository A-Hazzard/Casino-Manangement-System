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
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { cn } from '@/lib/utils';
import { getDenominationValues } from '@/lib/utils/vault/denominations';
import type { Denomination } from '@/shared/types/vault';
import {
    AlertTriangle,
    ArrowDownCircle,
    ArrowUpCircle,
    Clock,
    Coins,
    MessageSquare,
    RefreshCw,
    ShieldCheck,
    Zap
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type FloatRequestModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (request: FloatRequestData) => Promise<void>;
  type: 'increase' | 'decrease';
  loading?: boolean;
};

export type FloatRequestData = {
  type: 'increase' | 'decrease';
  amount: number;
  reason: string;
  denominations?: Denomination[];
};



export default function FloatRequestModal({
  open,
  onClose,
  onSubmit,
  type,
  loading = false,
}: FloatRequestModalProps) {
  const { formatAmount } = useCurrencyFormat();
  const { selectedLicencee } = useDashBoardStore();
  const { user } = useUserStore();
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [reason, setReason] = useState('');
  const [denominations, setDenominations] = useState<Denomination[]>([]);
  const [touchedDenominations, setTouchedDenominations] = useState<Set<number>>(new Set());

  // Use user's assigned licensee if available (Cashier context), otherwise dashboard selection (Admin context)
  const effectiveLicenseeId = useMemo(() => {
    return user?.assignedLicensees?.[0] || selectedLicencee;
  }, [user?.assignedLicensees, selectedLicencee]);

  const denomsList = useMemo(() => getDenominationValues(effectiveLicenseeId), [effectiveLicenseeId]);

  // Update denominations when licensee changes or modal opens
  useEffect(() => {
    if (open && step === 'input') {
      setDenominations(denomsList.map(denom => ({ 
        denomination: denom as Denomination['denomination'], 
        quantity: 0 
      })));
      setTouchedDenominations(new Set());
    }
  }, [denomsList, open, step]);

  const totalAmount = useMemo(() => {
    return denominations.reduce((sum, d) => sum + (d.denomination * d.quantity), 0);
  }, [denominations]);

  const isAllTouched = useMemo(() => denomsList.every(d => touchedDenominations.has(Number(d))), [denomsList, touchedDenominations]);
  const isFormValid = totalAmount > 0 || isAllTouched;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    if (step === 'input') {
      setStep('review');
      return;
    }

    try {
      await onSubmit({
        type,
        amount: totalAmount,
        reason: reason.trim() || (type === 'increase' ? 'Float Increase Request' : 'Float Return Request'),
        denominations: denominations.filter(d => d.quantity > 0),
      });
      // Reset form
      setReason('');
      setStep('input');
      setTouchedDenominations(new Set());
      onClose();
    } catch {
      // Error handled by parent
    }
  };



  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px] p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-violet-50 border-b border-violet-100">
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            <Coins className="h-5 w-5 text-violet-600" />
            {step === 'review' ? 'Confirm Request' : (type === 'increase'
              ? 'Request Float Increase'
              : 'Request Float Decrease')}
          </DialogTitle>
          <DialogDescription className="text-violet-700/80">
            {step === 'review' 
              ? 'Please review your request details before submitting.' 
              : (type === 'increase'
                  ? 'Request additional float for your stash.'
                  : 'Return excess float from your stash back to the vault.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-0 overflow-hidden">
          <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {step === 'input' ? (
              <>
                {/* Denomination Breakdown */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="space-y-0.5">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                        Denomination Breakdown
                      </Label>
                      <p className="text-[10px] text-gray-500">Specify exactly which bills you are {type === 'increase' ? 'receiving' : 'returning'}</p>
                    </div>
                    <div className="px-3 py-1.5 rounded-2xl flex flex-col items-end shadow-sm border bg-violet-50 border-violet-100">
                      <span className="text-[9px] font-black uppercase opacity-60 tracking-wider text-violet-400">Total Amount</span>
                      <span className="text-lg font-black tracking-tight text-violet-700">{formatAmount(totalAmount)}</span>
                    </div>
                  </div>
                  
                  <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
                    <DenominationInputGrid
                      denominations={denominations}
                      onChange={setDenominations}
                      disabled={loading}
                      touchedDenominations={touchedDenominations}
                      onTouchedChange={setTouchedDenominations}
                    />
                  </div>
                </div>

                {/* Reason Selection */}
                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">
                    Request Reason
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(type === 'increase' ? [
                      { label: 'Busy Shift', icon: Zap, color: 'text-amber-500', bg: 'hover:bg-amber-50' },
                      { label: 'Low Stash', icon: ArrowDownCircle, color: 'text-red-500', bg: 'hover:bg-red-50' },
                      { label: 'Denoms', icon: RefreshCw, color: 'text-blue-500', bg: 'hover:bg-blue-50' },
                      { label: 'Other', icon: MessageSquare, color: 'text-gray-500', bg: 'hover:bg-gray-50' }
                    ] : [
                      { label: 'Shift End', icon: Clock, color: 'text-violet-500', bg: 'hover:bg-violet-50' },
                      { label: 'Excess', icon: ArrowUpCircle, color: 'text-emerald-500', bg: 'hover:bg-emerald-50' },
                      { label: 'Closing', icon: ShieldCheck, color: 'text-blue-500', bg: 'hover:bg-blue-50' },
                      { label: 'Other', icon: MessageSquare, color: 'text-gray-500', bg: 'hover:bg-gray-50' }
                    ]).map(item => {
                      const isSelected = reason === item.label || (item.label === 'Other' && reason.length > 0 && !['Busy Shift', 'Low Stash', 'Denoms', 'Shift End', 'Excess', 'Closing'].includes(reason));
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => setReason(item.label === 'Other' ? '' : item.label)}
                          className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5",
                            reason === item.label 
                              ? "bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-200" 
                              : "bg-white border-gray-100 text-gray-600",
                            !isSelected && item.bg
                          )}
                        >
                          <Icon className={cn("h-4 w-4", reason === item.label ? "text-white" : item.color)} />
                          <span className="text-[10px] font-black uppercase tracking-tight leading-tight">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  
                  {(reason === 'Other' || (reason.length > 0 && !['Busy Shift', 'Low Stash', 'Denoms', 'Shift End', 'Excess', 'Closing'].includes(reason))) && (
                    <Textarea
                      id="reason-details"
                      value={reason === 'Other' ? '' : reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Add more details about this request..."
                      className="resize-none border-2 border-gray-100 focus:border-violet-500/50 bg-white min-h-[80px] transition-all rounded-xl text-sm"
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <div className="bg-violet-50/50 rounded-xl p-4 border border-violet-100 space-y-4">
                  <div className="flex justify-between items-center border-b border-violet-200/50 pb-3">
                    <span className="text-sm font-medium text-violet-900">Total Amount</span>
                    <span className="text-2xl font-black text-violet-700">{formatAmount(totalAmount)}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Breakdown</p>
                    <div className="grid grid-cols-2 gap-2">
                      {denominations.filter(d => d.quantity > 0).map((d) => (
                        <div key={d.denomination} className="flex justify-between bg-white px-3 py-2 rounded-lg border border-violet-100 shadow-sm">
                          <span className="text-sm font-medium text-gray-600">${d.denomination}</span>
                          <span className="text-sm font-bold text-gray-900">x{d.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {reason && (
                    <div className="pt-2 border-t border-violet-200/50">
                      <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">Notes</p>
                      <p className="text-sm text-gray-600 italic bg-white p-2 rounded-lg border border-violet-100">{reason}</p>
                    </div>
                  )}
                </div>

                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-3">
                  <div className="mt-0.5">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-orange-800">Please Confirm Count</p>
                    <p className="text-xs text-orange-700 leading-relaxed">
                      Carefully re-count your physical cash and please resubmit. Ensure the denominations match exactly what you are holding.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 bg-gray-50 border-t flex flex-col sm:flex-row gap-3">
            <Button 
                type="button" 
                variant="ghost" 
                onClick={() => step === 'review' ? setStep('input') : onClose()}
                className="order-2 sm:order-1 text-gray-500 hover:text-gray-900 font-black"
            >
              {step === 'review' ? 'Back to Edit' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={loading || !isFormValid}
              className="order-1 sm:order-2 flex-1 h-12 font-black text-white shadow-lg shadow-violet-600/20 bg-violet-600 hover:bg-violet-700 active:scale-[0.98] transition-all rounded-xl"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Processing...
                </div>
              ) : (step === 'review' ? 'Confirm & Submit' : 'Review Request')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
