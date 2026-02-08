import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { MachineSearchSelect } from '@/components/shared/ui/machine/MachineSearchSelect';
import { Textarea } from '@/components/shared/ui/textarea';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import type { GamingMachine } from '@/shared/types/entities';
import { AlertTriangle, Landmark, RefreshCw } from 'lucide-react';
import { useState } from 'react';

type HandPayFormProps = {
  machines: GamingMachine[];
  currentBalance: number;
  onSubmit: (
    amount: number,
    machineId: string,
    reason?: string
  ) => Promise<void>;
  onRequestCash: () => void;
  loading?: boolean;
};

export default function HandPayForm({
  machines,
  currentBalance,
  onSubmit,
  onRequestCash,
  loading = false,
}: HandPayFormProps) {
  const { formatAmount } = useCurrencyFormat();
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState('');

  const numAmount = parseFloat(amount) || 0;
  const isOverBalance = numAmount > currentBalance;
  const isFormValid = numAmount > 0 && !isOverBalance && selectedMachine;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      await onSubmit(
        numAmount,
        selectedMachine,
        reason.trim() || undefined
      );
      setSelectedMachine('');
      setAmount('');
      setReason('');
    } catch {
      // Error handled by parent
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Machine Selection Section */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 ml-1">
            Source Machine
          </Label>
          <div className="relative group">
            <MachineSearchSelect
              machines={machines}
              value={selectedMachine}
              onValueChange={setSelectedMachine}
              placeholder="Search by Asset #, Serial, or Name"
            />
          </div>
        </div>

        {/* Amount Input Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <Label htmlFor="amount" className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Hand Pay Payout
            </Label>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">
                <span className="text-[9px] font-black text-gray-400 uppercase">Stash</span>
                <span className="text-[11px] font-bold text-gray-700">{formatAmount(currentBalance)}</span>
            </div>
          </div>
          <div className="relative group">
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-14 text-2xl font-black pl-10 bg-white border-2 border-gray-100 focus:border-emerald-500 focus:ring-0 transition-all text-emerald-600"
              required
            />
            <div className="absolute left-3 top-4 text-gray-400 font-black text-xl group-focus-within:text-emerald-500 transition-colors">$</div>
          </div>
        </div>

        {/* Reason Section */}
        <div className="space-y-1.5">
          <Label htmlFor="reason" className="text-[11px] font-bold uppercase tracking-wider text-gray-500 ml-1">
            Reason for Payout
          </Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Jackpot, Machine Lock-up, etc."
            className="resize-none h-20 bg-gray-50/50 border-gray-200 focus:bg-white transition-all text-sm"
          />
        </div>

        {/* Visual Summary Card */}
        <div className={cn(
          "rounded-2xl p-4 transition-all border shadow-sm",
          isOverBalance 
            ? "bg-red-50 border-red-100 text-red-900" 
            : "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100 text-emerald-900"
        )}>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Payout Value</span>
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 opacity-40 shrink-0" />
                <span className="text-sm font-bold truncate max-w-[120px]">Hand Pay Payout</span>
              </div>
            </div>
            <span className={cn(
               "text-3xl font-black tracking-tight",
               isOverBalance ? "text-red-600" : "text-emerald-700"
            )}>
              {formatAmount(numAmount)}
            </span>
          </div>

          {isOverBalance && (
            <div className="mt-3 pt-3 border-t border-red-200/50 space-y-1">
              <div className="flex items-center gap-2 text-xs text-red-600 font-bold">
                <AlertTriangle className="h-3.5 w-3.5" />
                Insufficient cashier stash balance
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight text-red-500 pl-5">
                <span>Shortfall:</span>
                <span className="text-sm text-blue-600 bg-white px-2 py-0.5 rounded border border-red-100 shadow-sm">{formatAmount(numAmount - currentBalance)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            type="submit"
            disabled={loading || !isFormValid}
            className="flex-1 bg-emerald-600 h-14 text-white hover:bg-emerald-700 font-black text-base shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Processing...
              </div>
            ) : 'Process Hand Pay'}
          </Button>
          
          {isOverBalance && (
            <Button
              type="button"
              variant="outline"
              onClick={onRequestCash}
              className="flex-1 border-gray-200 bg-white text-orangeHighlight hover:bg-orangeHighlight/5 h-14 font-bold border-2"
            >
              Request From Vault
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
