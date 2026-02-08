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
import { cn } from '@/lib/utils';
import type { Denomination } from '@/shared/types/vault';
import { Minus, RefreshCw, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';

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

const INITIAL_DENOMINATIONS: Denomination[] = [
  { denomination: 100, quantity: 0 },
  { denomination: 50, quantity: 0 },
  { denomination: 20, quantity: 0 },
  { denomination: 10, quantity: 0 },
  { denomination: 5, quantity: 0 },
  { denomination: 1, quantity: 0 },
];

export default function FloatRequestModal({
  open,
  onClose,
  onSubmit,
  type,
  loading = false,
}: FloatRequestModalProps) {
  const { formatAmount } = useCurrencyFormat();
  const [reason, setReason] = useState('');
  const [denominations, setDenominations] = useState<Denomination[]>(INITIAL_DENOMINATIONS);

  const totalAmount = useMemo(() => {
    return denominations.reduce((sum, d) => sum + (d.denomination * d.quantity), 0);
  }, [denominations]);

  const isFormValid = totalAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      await onSubmit({
        type,
        amount: totalAmount,
        reason: reason.trim() || (type === 'increase' ? 'Float Increase Request' : 'Float Return Request'),
        denominations: denominations.filter(d => d.quantity > 0),
      });
      // Reset form
      setReason('');
      setDenominations(INITIAL_DENOMINATIONS);
      onClose();
    } catch {
      // Error handled by parent
    }
  };

  const Icon = type === 'increase' ? TrendingUp : Minus;
  const accentColor = type === 'increase' ? 'emerald' : 'orange';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] gap-0 p-0 overflow-hidden">
        <DialogHeader className={`p-6 bg-${accentColor}-50 border-b border-${accentColor}-100`}>
          <DialogTitle className={`flex items-center gap-2 text-${accentColor}-900`}>
            <Icon className="h-5 w-5" />
            {type === 'increase'
              ? 'Request Float Increase'
              : 'Request Float Decrease'}
          </DialogTitle>
          <DialogDescription className={`text-${accentColor}-700/80`}>
            {type === 'increase'
              ? 'Request additional float for your stash.'
              : 'Return excess float from your stash back to the vault.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-0 overflow-hidden">
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* Denomination Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="space-y-0.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                    Denomination Breakdown
                  </Label>
                  <p className="text-[10px] text-gray-500">Specify exactly which bills you are {type === 'increase' ? 'receiving' : 'returning'}</p>
                </div>
                <div className={cn(
                  "px-3 py-1.5 rounded-2xl flex flex-col items-end shadow-sm border",
                  type === 'increase' ? "bg-emerald-50 border-emerald-100" : "bg-orange-50 border-orange-100"
                )}>
                  <span className="text-[9px] font-black uppercase opacity-60 tracking-wider">Total Amount</span>
                  <span className={cn(
                    "text-lg font-black tracking-tight",
                    type === 'increase' ? "text-emerald-700" : "text-orange-700"
                  )}>{formatAmount(totalAmount)}</span>
                </div>
              </div>
              
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 shadow-inner">
                <DenominationInputGrid
                  denominations={denominations}
                  onChange={setDenominations}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Reason Field */}
            <div className="space-y-2 group">
              <Label htmlFor="reason" className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">
                Request Notes
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={type === 'increase' 
                  ? "e.g. Busy weekend replenishment..." 
                  : "e.g. End of shift return..."
                }
                className="resize-none border-2 border-gray-100 focus:border-blue-500/50 bg-white min-h-[100px] transition-all rounded-xl text-sm"
              />
            </div>
          </div>

          <DialogFooter className="p-4 bg-gray-50 border-t flex flex-col sm:flex-row gap-3">
            <Button 
                type="button" 
                variant="ghost" 
                onClick={onClose}
                className="order-2 sm:order-1 text-gray-500 hover:text-gray-900 font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !isFormValid}
              className={cn(
                "order-1 sm:order-2 flex-1 h-12 font-black text-white shadow-lg active:scale-[0.98] transition-all rounded-xl",
                type === 'increase'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20'
              )}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Submitting Request...
                </div>
              ) : `Submit ${type === 'increase' ? 'Increase' : 'Return'}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
