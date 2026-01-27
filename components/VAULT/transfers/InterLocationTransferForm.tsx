/**
 * Inter-Location Transfer Form Component
 *
 * Form for Vault Manager to initiate cash transfers between locations.
 * Creates transfer request for approval.
 *
 * @module components/VAULT/transfers/InterLocationTransferForm
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { Denomination } from '@/shared/types/vault';
import { cn } from '@/lib/utils';
import { ArrowRightLeft } from 'lucide-react';

type InterLocationTransferFormProps = {
  onSubmit: (
    fromLocation: string,
    toLocation: string,
    amount: number,
    denominations: Denomination[],
    notes?: string
  ) => Promise<void>;
  loading?: boolean;
};

const DEFAULT_DENOMINATIONS: Denomination['denomination'][] = [
  1, 5, 10, 20, 50, 100,
];

// Mock locations - in real app, fetch from API
const MOCK_LOCATIONS = [
  'Main Casino',
  'Downtown Branch',
  'Airport Terminal',
  'Sports Bar',
];

export default function InterLocationTransferForm({
  onSubmit,
  loading = false,
}: InterLocationTransferFormProps) {
  const { formatAmount } = useCurrencyFormat();
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [denominations, setDenominations] = useState<Denomination[]>(
    DEFAULT_DENOMINATIONS.map(denom => ({ denomination: denom, quantity: 0 }))
  );
  const [notes, setNotes] = useState('');

  const totalAmount = denominations.reduce(
    (sum, d) => sum + d.denomination * d.quantity,
    0
  );

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 0) return;
    const newDenominations = [...denominations];
    newDenominations[index] = { ...newDenominations[index], quantity };
    setDenominations(newDenominations as Denomination[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromLocation.trim()) {
      alert('Please select a source location');
      return;
    }
    if (!toLocation.trim()) {
      alert('Please select a destination location');
      return;
    }
    if (fromLocation === toLocation) {
      alert('Source and destination locations must be different');
      return;
    }
    if (totalAmount === 0) {
      alert('Please specify at least one denomination with quantity > 0');
      return;
    }
    const filteredDenominations = denominations.filter(d => d.quantity > 0);
    try {
      await onSubmit(
        fromLocation.trim(),
        toLocation.trim(),
        totalAmount,
        filteredDenominations,
        notes.trim() || undefined
      );
      // Reset form
      setFromLocation('');
      setToLocation('');
      setNotes('');
      setDenominations(
        DEFAULT_DENOMINATIONS.map(denom => ({
          denomination: denom,
          quantity: 0,
        }))
      );
    } catch {
      // Error handled by parent
    }
  };

  return (
    <Card className="rounded-lg bg-container shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <ArrowRightLeft className="h-5 w-5" />
          Inter-Location Transfer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label
                htmlFor="fromLocation"
                className="text-sm font-medium text-gray-700"
              >
                From Location *
              </Label>
              <select
                id="fromLocation"
                value={fromLocation}
                onChange={e => setFromLocation(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-button focus:outline-none focus:ring-1 focus:ring-button"
                required
              >
                <option value="">Select source location</option>
                {MOCK_LOCATIONS.map(location => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label
                htmlFor="toLocation"
                className="text-sm font-medium text-gray-700"
              >
                To Location *
              </Label>
              <select
                id="toLocation"
                value={toLocation}
                onChange={e => setToLocation(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-button focus:outline-none focus:ring-1 focus:ring-button"
                required
              >
                <option value="">Select destination location</option>
                {MOCK_LOCATIONS.map(location => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Transfer Denominations
            </Label>
            <div className="grid grid-cols-2 gap-4">
              {denominations.map((denom, index) => (
                <div key={denom.denomination} className="space-y-2">
                  <Label className="text-xs text-gray-600">
                    ${denom.denomination} Bills
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={denom.quantity}
                    onChange={e =>
                      updateQuantity(index, parseInt(e.target.value) || 0)
                    }
                    className="text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Total Transfer Amount:
              </span>
              <span
                className={cn(
                  'text-lg font-bold',
                  totalAmount > 0 ? 'text-button' : 'text-gray-500'
                )}
              >
                {formatAmount(totalAmount)}
              </span>
            </div>
          </div>

          <div>
            <Label
              htmlFor="notes"
              className="text-sm font-medium text-gray-700"
            >
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional notes for the transfer..."
              className="mt-1"
              rows={3}
            />
          </div>

          <Button
            type="submit"
            disabled={
              loading ||
              !fromLocation.trim() ||
              !toLocation.trim() ||
              fromLocation === toLocation ||
              totalAmount === 0
            }
            className="w-full bg-button text-white hover:bg-button/90"
          >
            {loading ? 'Submitting...' : 'Submit Transfer Request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
