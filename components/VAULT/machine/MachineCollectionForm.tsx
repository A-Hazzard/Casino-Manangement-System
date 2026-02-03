/**
 * Machine Collection Form Component
 *
 * Form for Vault Manager to record cash collections from gaming machines.
 * Creates transaction record for machine collection.
 *
 * @module components/VAULT/machine/MachineCollectionForm
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
import { MachineSearchSelect } from '@/components/shared/ui/machine/MachineSearchSelect';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import type { GamingMachine } from '@/shared/types/entities';
import type { Denomination } from '@/shared/types/vault';
import { Monitor } from 'lucide-react';
import { useState } from 'react';

type MachineCollectionFormProps = {
  onSubmit: (
    machineId: string,
    amount: number,
    denominations: Denomination[]
  ) => Promise<void>;
  loading?: boolean;
  machines?: GamingMachine[];
};

const DEFAULT_DENOMINATIONS: Denomination['denomination'][] = [
  1, 5, 10, 20, 50, 100,
];

export default function MachineCollectionForm({
  onSubmit,
  loading = false,
  machines = [],
}: MachineCollectionFormProps) {
  const { formatAmount } = useCurrencyFormat();
  const [machineId, setMachineId] = useState('');
  const [denominations, setDenominations] = useState<Denomination[]>(
    DEFAULT_DENOMINATIONS.map(denom => ({ denomination: denom, quantity: 0 }))
  );


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
    if (!machineId.trim()) {
      alert('Please select a machine');
      return;
    }
    if (totalAmount === 0) {
      alert('Please specify at least one denomination with quantity > 0');
      return;
    }
    const filteredDenominations = denominations.filter(d => d.quantity > 0);
    try {
      await onSubmit(machineId.trim(), totalAmount, filteredDenominations);
      setMachineId('');
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
          <Monitor className="h-5 w-5" />
          Machine Collection
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label
              htmlFor="machineId"
              className="text-sm font-medium text-gray-700"
            >
              Select Machine *
            </Label>
            <div className="mt-1">
              <MachineSearchSelect
                value={machineId}
                onValueChange={setMachineId}
                machines={machines}
                placeholder="Search by Asset, SMID, Serial, Game..."
                emptyMessage="No machines found"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Denominations Collected
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
                Total Collected:
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

          <Button
            type="submit"
            disabled={loading || !machineId.trim() || totalAmount === 0}
            className="w-full bg-button text-white hover:bg-button/90"
          >
            {loading ? 'Recording...' : 'Record Collection'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
