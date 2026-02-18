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
import { cn } from '@/lib/utils';
import type { Denomination } from '@/shared/types/vault';

type DenominationInputGridProps = {
  denominations: Denomination[];
  onChange: (newDenominations: Denomination[]) => void;
  disabled?: boolean;
  stock?: Denomination[]; // Optional stock inventory to validate against
  touchedDenominations?: Set<number>;
  onTouchedChange?: (touched: Set<number>) => void;
};

export default function DenominationInputGrid({
  denominations,
  onChange,
  disabled = false,
  stock,
  touchedDenominations,
  onTouchedChange,
}: DenominationInputGridProps) {
  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 0) return;
    const newDenominations = [...denominations];
    const denomVal = newDenominations[index].denomination;
    newDenominations[index] = { ...newDenominations[index], quantity };
    onChange(newDenominations);
    
    if (onTouchedChange && touchedDenominations) {
        const next = new Set(touchedDenominations);
        next.add(Number(denomVal));
        onTouchedChange(next);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {denominations.map((denom, index) => {
        const availableCount = stock?.find(s => Number(s.denomination) === Number(denom.denomination))?.quantity;
        const isOverStock = availableCount !== undefined && Number(denom.quantity) > Number(availableCount);

        return (
          <div key={denom.denomination} className="space-y-1">
            <div className="flex items-center justify-between px-0.5">
              <Label className="text-[10px] font-bold text-gray-400 uppercase">
                ${denom.denomination}
              </Label>
              {availableCount !== undefined && (
                <span className={cn(
                    "text-[9px] font-bold px-1 rounded",
                    Number(availableCount) > 0 ? "text-gray-500 bg-gray-100" : "text-gray-300"
                )}>
                  {availableCount}
                </span>
              )}
            </div>
            <Input
              type="number"
              min="0"
              value={denom.quantity === 0 ? '' : denom.quantity}
              onChange={e => {
                const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                updateQuantity(index, isNaN(val) ? 0 : val);
              }}
              placeholder="0"
              className={cn(
                "h-9 text-center font-semibold transition-all",
                isOverStock && "border-red-500 bg-red-50 text-red-900",
                touchedDenominations?.has(Number(denom.denomination)) && !isOverStock && "text-violet-600"
              )}
              disabled={disabled}
            />
          </div>
        );
      })}
    </div>
  );
}
