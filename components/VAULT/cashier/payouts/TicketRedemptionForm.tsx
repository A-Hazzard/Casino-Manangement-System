import { Button } from '@/components/shared/ui/button';
import {
  Card,
  CardContent
} from '@/components/shared/ui/card';
import { DatePicker } from '@/components/shared/ui/date-picker';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { AlertTriangle, Ticket } from 'lucide-react';
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
  const [printedAt, setPrintedAt] = useState<Date | undefined>(new Date());

  const numAmount = parseFloat(amount) || 0;
  const isOverBalance = numAmount > currentBalance;
  const isFormValid = ticketNumber.trim() && numAmount > 0 && !isOverBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      await onSubmit(
        ticketNumber.trim(), 
        numAmount, 
        printedAt
      );
      setTicketNumber('');
      setAmount('');
      setPrintedAt(new Date());
    } catch {
      // Error handled by parent
    }
  };

  return (
    <Card className="rounded-lg bg-container shadow-md border-none lg:shadow-none">
      <CardContent className="pt-6 px-0 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Ticket Info */}
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="ticketNumber" className="text-sm font-medium text-gray-700">
                Ticket Number *
              </Label>
              <div className="relative">
                <Input
                  id="ticketNumber"
                  type="text"
                  value={ticketNumber}
                  onChange={e => setTicketNumber(e.target.value)}
                  placeholder="Enter ticket number"
                  className="h-11 pl-10"
                  required
                />
                <Ticket className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Date on Physical Ticket *
              </Label>
              <DatePicker 
                date={printedAt}
                setDate={setPrintedAt}
                disabled={loading}
              />
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                Redemption Amount ($) *
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
                className="h-12 text-lg font-bold"
                required
              />
              <div className="absolute left-3 top-3.5 text-gray-400 font-bold">$</div>
            </div>
          </div>

          {/* Summary Display */}
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-blue-900">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-semibold opacity-70 uppercase tracking-wider">Total Redemption</span>
                <span className="text-sm opacity-80">{ticketNumber || 'No ticket #'}</span>
              </div>
              <span className={`text-2xl font-black ${isOverBalance ? 'text-red-600' : 'text-blue-600'}`}>
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

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading || !isFormValid}
              className="flex-1 bg-blue-600 py-6 text-white hover:bg-blue-700 font-bold"
            >
              {loading ? 'Processing...' : 'Redeem Ticket'}
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
