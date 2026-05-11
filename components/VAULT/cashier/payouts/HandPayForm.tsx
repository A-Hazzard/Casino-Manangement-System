import { FormEvent } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { MachineSearchSelect } from '@/components/shared/ui/machine/MachineSearchSelect';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import type { GamingMachine } from '@/shared/types/entities';
import { AlertTriangle, Landmark, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import VaultAuthenticatorModal from '../../shared/VaultAuthenticatorModal';

type HandPayFormProps = {
  machines: GamingMachine[];
  currentBalance: number;
  onSubmit: (amount: number, machineId: string) => Promise<void>;
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

  const numAmount = parseFloat(amount) || 0;
  const isOverBalance = numAmount > currentBalance;
  const isFormValid = numAmount > 0 && !isOverBalance && selectedMachine;
  const [showAuthenticator, setShowAuthenticator] = useState(false);
  const [pendingData, setPendingData] = useState<{
    amount: number;
    machineId: string;
  } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    // Cache data and trigger TOTP
    setPendingData({ amount: numAmount, machineId: selectedMachine });
    setShowAuthenticator(true);
  };

  const handleAuthVerified = async () => {
    if (!pendingData) return;
    try {
      await onSubmit(pendingData.amount, pendingData.machineId);
      setSelectedMachine('');
      setAmount('');
      setPendingData(null);
    } catch {
      // Error handled by parent
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Machine Selection Section */}
        <div className="space-y-1.5">
          <Label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Source Machine
          </Label>
          <div className="group relative">
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
            <Label
              htmlFor="amount"
              className="text-[11px] font-bold uppercase tracking-wider text-gray-500"
            >
              Hand Pay Payout
            </Label>
            <div className="flex items-center gap-2">
              {selectedMachine && (
                <div className="flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5">
                  <span className="text-[9px] font-black uppercase text-blue-400">
                    Money In
                  </span>
                  <span className="text-[11px] font-bold text-blue-700">
                    {formatAmount(
                      (() => {
                        const m = machines.find(m => m._id === selectedMachine);
                        // Use collection meter or SAS coinIn
                        return (
                          m?.collectionMeters?.metersIn ||
                          m?.sasMeters?.coinIn ||
                          0
                        );
                      })()
                    )}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5">
                <span className="text-[9px] font-black uppercase text-gray-400">
                  Cashier Register
                </span>
                <span className="text-[11px] font-bold text-gray-700">
                  {formatAmount(currentBalance)}
                </span>
              </div>
            </div>
          </div>
          <div className="group relative">
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-14 border-2 border-gray-100 bg-white pl-10 text-2xl font-black text-emerald-600 transition-all focus:border-emerald-500 focus:ring-0"
              required
            />
            <div className="absolute left-3 top-4 text-xl font-black text-gray-400 transition-colors group-focus-within:text-emerald-500">
              $
            </div>
          </div>
        </div>

        {/* Visual Summary Card */}
        <div
          className={cn(
            'rounded-2xl border p-4 shadow-sm transition-all',
            isOverBalance
              ? 'border-red-100 bg-red-50 text-red-900'
              : 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-900'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                Payout Value
              </span>
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 shrink-0 opacity-40" />
                <span className="max-w-[120px] truncate text-sm font-bold">
                  Hand Pay Payout
                </span>
              </div>
            </div>
            <span
              className={cn(
                'text-3xl font-black tracking-tight',
                isOverBalance ? 'text-red-600' : 'text-emerald-700'
              )}
            >
              {formatAmount(numAmount)}
            </span>
          </div>

          {isOverBalance && (
            <div className="mt-3 space-y-1 border-t border-red-200/50 pt-3">
              <div className="flex items-center gap-2 text-xs font-bold text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                Insufficient cashier stash balance
              </div>
              <div className="flex items-center justify-between pl-5 text-[10px] font-black uppercase tracking-tight text-red-500">
                <span>Shortfall:</span>
                <span className="rounded border border-red-100 bg-white px-2 py-0.5 text-sm text-blue-600 shadow-sm">
                  {formatAmount(numAmount - currentBalance)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button
            type="submit"
            disabled={loading || !isFormValid}
            className="h-14 flex-1 bg-emerald-600 text-base font-black text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.98]"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Processing...
              </div>
            ) : (
              'Process Hand Pay'
            )}
          </Button>

          {isOverBalance && (
            <Button
              type="button"
              variant="outline"
              onClick={onRequestCash}
              className="h-14 flex-1 border-2 border-gray-200 bg-white font-bold text-orangeHighlight hover:bg-orangeHighlight/5"
            >
              Request From Vault
            </Button>
          )}
        </div>
      </form>
      <VaultAuthenticatorModal
        open={showAuthenticator}
        onClose={() => setShowAuthenticator(false)}
        onVerified={handleAuthVerified}
        actionName="Process Hand Pay"
      />
    </div>
  );
}
