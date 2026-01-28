/**
 * Ticket Redemption Form Component
 *
 * Form for cashier to process ticket redemption payouts.
 * Validates ticket and records payout transaction.
 *
 * @module components/VAULT/cashier/payouts/TicketRedemptionForm
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Ticket } from 'lucide-react';
import { useState } from 'react';

type TicketRedemptionFormProps = {
  onSubmit: (ticketNumber: string, amount: number, barcode?: string) => Promise<void>;
  loading?: boolean;
};

export default function TicketRedemptionForm({
  onSubmit,
  loading = false,
}: TicketRedemptionFormProps) {
  const [ticketNumber, setTicketNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [barcode, setBarcode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketNumber.trim()) {
      alert('Please enter a ticket number');
      return;
    }
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
        alert('Please enter a valid amount');
        return;
    }

    try {
      await onSubmit(ticketNumber.trim(), numAmount, barcode.trim() || undefined);
      setTicketNumber('');
      setAmount('');
      setBarcode('');
    } catch {
      // Error handled by parent
    }
  };

  return (
    <Card className="rounded-lg bg-container shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Ticket className="h-5 w-5" />
          Ticket Redemption
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label
              htmlFor="ticketNumber"
              className="text-sm font-medium text-gray-700"
            >
              Ticket Number *
            </Label>
            <Input
              id="ticketNumber"
              type="text"
              value={ticketNumber}
              onChange={e => setTicketNumber(e.target.value)}
              placeholder="Enter ticket number"
              className="mt-1"
              required
            />
          </div>

          <div>
             <Label htmlFor="amount" className="text-sm font-medium text-gray-700">Amount *</Label>
             <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter ticket amount"
                className="mt-1"
                required
             />
          </div>

          <div>
            <Label
              htmlFor="barcode"
              className="text-sm font-medium text-gray-700"
            >
              Barcode (Optional)
            </Label>
            <Input
              id="barcode"
              type="text"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              placeholder="Scan or enter barcode"
              className="mt-1"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !ticketNumber.trim()}
            className="w-full bg-button text-white hover:bg-button/90"
          >
            {loading ? 'Processing...' : 'Redeem Ticket'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
