import { Button } from '@/components/shared/ui/button';
import {
    Card,
    CardContent
} from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { MachineSearchSelect } from '@/components/shared/ui/machine/MachineSearchSelect';
import { Textarea } from '@/components/shared/ui/textarea';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { GamingMachine } from '@/shared/types/entities';
import { AlertTriangle, Banknote } from 'lucide-react';
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
    <Card className="rounded-lg bg-container shadow-md border-none lg:shadow-none">
      <CardContent className="pt-6 px-0 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Machine Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Select Machine *
            </Label>
            <MachineSearchSelect
              machines={machines}
              value={selectedMachine}
              onValueChange={setSelectedMachine}
              placeholder="Search by Asset #, Serial, or Name"
            />
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                Hand Pay Amount ($) *
              </Label>
              <div className="text-xs text-gray-500 font-semibold">
                Stash: {formatAmount(currentBalance)}
              </div>
            </div>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-12 text-lg font-bold pl-10"
                required
              />
              <Banknote className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Summary Display */}
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-emerald-900">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold opacity-80 uppercase tracking-wider">Total Payout</span>
              <span className={`text-2xl font-black ${isOverBalance ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatAmount(numAmount)}
              </span>
            </div>
            {isOverBalance && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-xs text-red-500 font-bold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Insufficient funds in your cashier stash
                </div>
                <div className="text-xs text-red-600 font-bold uppercase tracking-tight pl-5">
                  Additional Amount Needed: <span className="text-base text-blue-600 font-black tracking-normal ml-1">{formatAmount(numAmount - currentBalance)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Reason Field */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium text-gray-700">
              Reason for Payout
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Jackpot, Machine Lock-up, etc."
              className="resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading || !isFormValid}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-6 font-bold"
            >
              {loading ? 'Processing...' : 'Process Hand Pay'}
            </Button>
            {isOverBalance && (
              <Button
                type="button"
                variant="outline"
                onClick={onRequestCash}
                className="flex-1 border-orangeHighlight text-orangeHighlight hover:bg-orangeHighlight/10 py-6 font-bold"
              >
                Request Cash
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
