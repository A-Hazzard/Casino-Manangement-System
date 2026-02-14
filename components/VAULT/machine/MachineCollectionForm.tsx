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
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { MachineSearchSelect } from '@/components/shared/ui/machine/MachineSearchSelect';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import type { GamingMachine } from '@/shared/types/entities';
import type { Denomination } from '@/shared/types/vault';
import { ArrowRightCircle, Coins, Minus, Monitor, Plus, RefreshCw } from 'lucide-react';
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
  1, 2, 5, 10, 20, 50, 100,
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
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Machine Selection Section */}
        <div className="space-y-3">
          <Label
            htmlFor="machineId"
            className="text-[11px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"
          >
            <Monitor className="h-3 w-3" />
            Target Machine
          </Label>
          <div className="relative group transition-all">
            <MachineSearchSelect
              value={machineId}
              onValueChange={setMachineId}
              machines={machines}
              placeholder="Search by Asset, SMID, Serial..."
              emptyMessage="No machines found"
            />
          </div>
        </div>

        {/* Denominations Grid */}
        <div className="space-y-4">
          <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Coins className="h-3 w-3" />
            Currencies Collected
          </Label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {denominations.map((denom, index) => (
              <div 
                key={denom.denomination} 
                className={cn(
                  "relative flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                  denom.quantity > 0 
                    ? "bg-violet-50/50 border-violet-200 ring-1 ring-violet-100 shadow-sm" 
                    : "bg-gray-50/30 border-gray-100"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm font-black text-xs",
                    denom.quantity > 0 ? "text-violet-600 border border-violet-100" : "text-gray-400 border border-transparent"
                  )}>
                    ${denom.denomination}
                  </div>
                  <span className="text-xs font-bold text-gray-700">Bills</span>
                </div>

                <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5 shadow-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-gray-100 text-gray-500 rounded-md"
                    onClick={() => updateQuantity(index, denom.quantity - 1)}
                    disabled={denom.quantity === 0}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  
                  <Input
                    type="number"
                    min="0"
                    value={denom.quantity || ''}
                    onChange={e => updateQuantity(index, parseInt(e.target.value) || 0)}
                    className="w-10 h-7 border-none bg-transparent text-center font-black p-0 focus-visible:ring-0 text-sm"
                    placeholder="0"
                  />
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-gray-100 text-gray-500 rounded-md"
                    onClick={() => updateQuantity(index, denom.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-xl shadow-violet-500/20 min-h-[110px] flex flex-col justify-center">
          <div className="relative z-10 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-100/60 mb-1">Total Machine Collection</p>
              <span className={cn(
                "font-black tracking-tighter transition-all leading-none block truncate",
                totalAmount > 0 ? "text-white" : "text-white/20",
                formatAmount(totalAmount).length > 15 ? 'text-xl' :
                formatAmount(totalAmount).length > 12 ? 'text-2xl' : 'text-4xl'
              )}>
                {formatAmount(totalAmount)}
              </span>
            </div>
            <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 ml-4">
              <Monitor className="h-6 w-6 text-white/20" />
            </div>
          </div>
          <Coins className="absolute -right-4 -bottom-4 h-24 w-24 text-white/5 rotate-12" />
        </div>

        <Button
          type="submit"
          disabled={loading || !machineId.trim() || totalAmount === 0}
          className="w-full h-14 bg-violet-600 text-white hover:bg-violet-700 font-black text-base shadow-lg shadow-violet-600/20 active:scale-[0.98] transition-all rounded-xl"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Recording...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>Record Collection</span>
              <ArrowRightCircle className="h-5 w-5" />
            </div>
          )}
        </Button>
      </form>
    </div>
  );
}
