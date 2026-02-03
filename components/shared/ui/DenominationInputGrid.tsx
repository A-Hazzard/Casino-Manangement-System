/**
 * Denomination Input Grid Component
 *
 * Reusable grid of inputs for entering bill quantities.
 * Automatically calculates total amount.
 *
 * @module components/shared/ui/DenominationInputGrid
 */
'use client';

import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import type { Denomination } from '@/shared/types/vault';

type DenominationInputGridProps = {
  denominations: Denomination[];
  onChange: (newDenominations: Denomination[]) => void;
  disabled?: boolean;
};

export default function DenominationInputGrid({
  denominations,
  onChange,
  disabled = false,
}: DenominationInputGridProps) {
  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 0) return;
    const newDenominations = [...denominations];
    newDenominations[index] = { ...newDenominations[index], quantity };
    onChange(newDenominations);
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {denominations.map((denom, index) => (
        <div key={denom.denomination} className="space-y-1">
          <Label className="text-xs text-gray-500">
            ${denom.denomination}
          </Label>
          <Input
            type="number"
            min="0"
            value={denom.quantity === 0 ? '' : denom.quantity}
            onChange={e => {
              const val = e.target.value === '' ? 0 : parseInt(e.target.value);
              updateQuantity(index, isNaN(val) ? 0 : val);
            }}
            placeholder="0"
            className="h-8 text-center"
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}
