/**
 * Soft Count Form Component
 *
 * Form for Vault Manager to record soft count cash removal from machines during operation.
 * Allows replenishing vault float without ending the day.
 *
 * @module components/VAULT/machine/SoftCountForm
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { MachineSearchSelect } from '@/components/shared/ui/machine/MachineSearchSelect';
import { Textarea } from '@/components/shared/ui/textarea';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import type { GamingMachine } from '@/shared/types/entities';
import type { Denomination } from '@/shared/types/vault';
import { ArrowRightCircle, Coins, MessageSquare, Minus, Monitor, Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';

type SoftCountFormProps = {
  onSubmit: (
    machineId: string,
    amount: number,
    denominations: Denomination[],
    notes?: string
  ) => Promise<void>;
  loading?: boolean;
  machines?: GamingMachine[];
};

const DEFAULT_DENOMINATIONS: Denomination['denomination'][] = [
  1, 5, 10, 20, 50, 100,
];

export default function SoftCountForm({
  onSubmit,
  loading = false,
  machines = [],
}: SoftCountFormProps) {
  const { formatAmount } = useCurrencyFormat();
  const [machineId, setMachineId] = useState('');
  const [notes, setNotes] = useState('');
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
      await onSubmit(
        machineId.trim(),
        totalAmount,
        filteredDenominations,
        notes.trim() || undefined
      );
      setMachineId('');
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
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Machine Selection Section */}
        <div className="space-y-3">
          <Label
            htmlFor="machineId"
            className="text-[11px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"
          >
            <Monitor className="h-3 w-3" />
            Gaming Machine
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
            Mid-day Cash Removal
          </Label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
            {denominations.map((denom, index) => (
              <div 
                key={denom.denomination} 
                className={cn(
                  "relative flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                  denom.quantity > 0 
                    ? "bg-orange-50/50 border-orange-200 ring-1 ring-orange-100 shadow-sm" 
                    : "bg-gray-50/30 border-gray-100"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm font-black text-xs",
                    denom.quantity > 0 ? "text-orange-600 border border-orange-100" : "text-gray-400 border border-transparent"
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

        {/* Notes Area */}
        <div className="space-y-3">
          <Label htmlFor="notes" className="text-[11px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
             <MessageSquare className="h-3 w-3" />
             Collection Notes
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Reason for mid-day removal (optional)..."
            className="bg-gray-50/50 border-gray-100 rounded-xl focus:bg-white transition-all text-sm resize-none"
            rows={2}
          />
        </div>

        {/* Summary Card */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-5 text-white shadow-xl">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-0.5">Total Soft Count Value</p>
              <span className={cn(
                "text-3xl font-black tracking-tight transition-all",
                totalAmount > 0 ? "text-orange-400" : "text-white/20"
              )}>
                {formatAmount(totalAmount)}
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <RefreshCw className="h-6 w-6 text-white/20" />
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-orange-500/10 blur-2xl rounded-full" />
        </div>

        <Button
          type="submit"
          disabled={loading || !machineId.trim() || totalAmount === 0}
          className="w-full h-14 bg-orange-600 text-white hover:bg-orange-700 font-black text-base shadow-lg shadow-orange-600/20 active:scale-[0.98] transition-all rounded-xl"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Recording...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>Finalize Soft Count</span>
              <ArrowRightCircle className="h-5 w-5" />
            </div>
          )}
        </Button>
      </form>
    </div>
  );
}
