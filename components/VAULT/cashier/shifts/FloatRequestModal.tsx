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
import type { Denomination } from '@/shared/types/vault';
import { Minus, TrendingUp } from 'lucide-react';
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Denomination Breakdown */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-gray-900">
                Breakdown *
              </Label>
              <div className="text-sm font-medium text-gray-500">
                Total: <span className={`text-${accentColor}-600 font-bold`}>{formatAmount(totalAmount)}</span>
              </div>
            </div>
            
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <DenominationInputGrid
                denominations={denominations}
                onChange={setDenominations}
                disabled={loading}
              />
            </div>
          </div>

          {/* Reason Field */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-semibold text-gray-900">
              Reason (Optional)
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={type === 'increase' 
                ? "Why do you need more float? (e.g., Busy weekend, machine drop scheduled)" 
                : "Why are you returning float? (e.g., Shift end, excess cash)"
              }
              className="resize-none focus-visible:ring-offset-0 min-h-[80px]"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button 
                type="button" 
                variant="ghost" 
                onClick={onClose}
                className="text-gray-500 hover:text-gray-900"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !isFormValid}
              className={`px-8 ${
                type === 'increase'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-orange-600 hover:bg-orange-700'
              } text-white`}
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
