/**
 * Hand Pay Form Component
 *
 * Form for cashier to process hand pay payouts for machine jackpots/lock-ups.
 * Records payout transaction with machine details.
 *
 * @module components/VAULT/cashier/payouts/HandPayForm
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
import { Coins } from 'lucide-react';

type HandPayFormProps = {
  onSubmit: (
    amount: number,
    machineId?: string,
    machineName?: string,
    jackpotType?: string
  ) => Promise<void>;
  loading?: boolean;
};

export default function HandPayForm({
  onSubmit,
  loading = false,
}: HandPayFormProps) {
  const [amount, setAmount] = useState<string>('');
  const [machineId, setMachineId] = useState('');
  const [machineName, setMachineName] = useState('');
  const [jackpotType, setJackpotType] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    try {
      await onSubmit(
        numAmount,
        machineId.trim() || undefined,
        machineName.trim() || undefined,
        jackpotType.trim() || undefined
      );
      setAmount('');
      setMachineId('');
      setMachineName('');
      setJackpotType('');
    } catch {
      // Error handled by parent
    }
  };

  return (
    <Card className="rounded-lg bg-container shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Coins className="h-5 w-5" />
          Hand Pay
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label
              htmlFor="amount"
              className="text-sm font-medium text-gray-700"
            >
              Amount *
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Enter payout amount"
              className="mt-1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="machineId"
                className="text-sm font-medium text-gray-700"
              >
                Machine ID
              </Label>
              <Input
                id="machineId"
                type="text"
                value={machineId}
                onChange={e => setMachineId(e.target.value)}
                placeholder="Machine ID"
                className="mt-1"
              />
            </div>

            <div>
              <Label
                htmlFor="machineName"
                className="text-sm font-medium text-gray-700"
              >
                Machine Name
              </Label>
              <Input
                id="machineName"
                type="text"
                value={machineName}
                onChange={e => setMachineName(e.target.value)}
                placeholder="Machine name"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="jackpotType"
              className="text-sm font-medium text-gray-700"
            >
              Jackpot Type
            </Label>
            <Input
              id="jackpotType"
              type="text"
              value={jackpotType}
              onChange={e => setJackpotType(e.target.value)}
              placeholder="e.g., Progressive, Mystery, Lock-up"
              className="mt-1"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !amount || parseFloat(amount) <= 0}
            className="w-full bg-button text-white hover:bg-button/90"
          >
            {loading ? 'Processing...' : 'Process Hand Pay'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
