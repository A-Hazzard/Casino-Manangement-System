import { Button } from '@/components/shared/ui/button';
import { DatePicker } from '@/components/shared/ui/date-picker';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import { AlertTriangle, RefreshCw, Ticket } from 'lucide-react';
import { useState } from 'react';

type TicketRedemptionFormProps = {
  currentBalance: number;
  onSubmit: (ticketNumber: string, amount: number, printedAt?: Date) => Promise<void>;
  onRequestCash: () => void;
  loading?: boolean;
};

export default function TicketRedemptionForm({
  currentBalance,
  onSubmit,
  onRequestCash,
  loading = false,
}: TicketRedemptionFormProps) {
  const { formatAmount } = useCurrencyFormat();
  
  const [ticketNumber, setTicketNumber] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [printedAt, setPrintedAt] = useState<Date | undefined>(undefined);

  const numAmount = parseFloat(amount) || 0;
  const isOverBalance = numAmount > currentBalance;
  const isFormValid = ticketNumber.trim().length > 0 && numAmount > 0 && !isOverBalance && printedAt !== undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      await onSubmit(
        ticketNumber.trim(), 
        numAmount, 
        printedAt || new Date()
      );
      setTicketNumber('');
      setAmount('');
      setPrintedAt(new Date());
    } catch {
      // Error handled by parent
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Ticket Info Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ticketNumber" className="text-[11px] font-bold uppercase tracking-wider text-gray-500 ml-1">
              Ticket Number
            </Label>
            <div className="relative group">
              <Input
                id="ticketNumber"
                type="text"
                value={ticketNumber}
                onChange={e => setTicketNumber(e.target.value)}
                placeholder="Enter #..."
                className="h-11 pl-10 bg-gray-50/50 border-gray-200 focus:bg-white transition-all font-mono"
                required
              />
              <Ticket className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 ml-1">
              Issue Date
            </Label>
            <DatePicker 
              date={printedAt}
              setDate={setPrintedAt}
              disabled={loading}
            />
          </div>
        </div>

        {/* Amount Input Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <Label htmlFor="amount" className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Redemption Amount
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
              className="h-14 text-2xl font-black pl-10 bg-white border-2 border-gray-100 focus:border-blue-500 focus:ring-0 transition-all text-blue-600"
              required
            />
            <div className="absolute left-3 top-4 text-gray-400 font-black text-xl group-focus-within:text-blue-500 transition-colors">$</div>
          </div>
        </div>

        {/* Visual Summary Card */}
        <div className={cn(
          "rounded-2xl p-4 transition-all border shadow-sm",
          isOverBalance 
            ? "bg-red-50 border-red-100 text-red-900" 
            : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 text-blue-900"
        )}>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Payout Value</span>
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 opacity-40 shrink-0" />
                <span className="text-sm font-bold truncate max-w-[120px]">{ticketNumber || 'Waiting for #...'}</span>
              </div>
            </div>
            <span className={cn(
               "text-3xl font-black tracking-tight",
               isOverBalance ? "text-red-600" : "text-blue-700"
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
            className="flex-1 bg-blue-600 h-14 text-white hover:bg-blue-700 font-black text-base shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Processing...
              </div>
            ) : 'Redeem Ticket'}
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
