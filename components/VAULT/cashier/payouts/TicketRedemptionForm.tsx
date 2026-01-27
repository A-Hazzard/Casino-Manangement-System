/**
 * Ticket Redemption Form Component
 *
 * Form for cashier to process ticket redemption payouts.
 * Validates ticket and records payout transaction.
 *
 * @module components/VAULT/cashier/payouts/TicketRedemptionForm
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { Ticket } from 'lucide-react';

type TicketRedemptionFormProps = {
  onSubmit: (ticketNumber: string, barcode?: string) => Promise<void>;
  loading?: boolean;
};

export default function TicketRedemptionForm({
  onSubmit,
  loading = false,
}: TicketRedemptionFormProps) {
  const [ticketNumber, setTicketNumber] = useState('');
  const [barcode, setBarcode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketNumber.trim()) {
      alert('Please enter a ticket number');
      return;
    }
    try {
      await onSubmit(ticketNumber.trim(), barcode.trim() || undefined);
      setTicketNumber('');
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
