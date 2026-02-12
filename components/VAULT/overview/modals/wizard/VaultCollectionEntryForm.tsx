/**
 * Vault Collection Entry Form
 *
 * Middle panel for entering meter readings and physical counts.
 * Includes variance tracking.
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/shared/ui/tooltip';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { cn } from '@/lib/utils';
import { getDenominationValues } from '@/lib/utils/vault/denominations';
import type { GamingMachine } from '@/shared/types/entities';
import type { Denomination } from '@/shared/types/vault';
import { AlertCircle, Coins, Info, Minus, Plus, RefreshCw, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface VaultCollectionEntryFormProps {
  machine: GamingMachine;
  onSave: (data: {
    totalAmount: number;
    denominations: Denomination[];
    meters: {
      billIn: number;
      ticketIn: number;
      totalIn: number;
    };
    variance: number;
    notes: string;
  }) => void;
  loading: boolean;
}

export default function VaultCollectionEntryForm({
  machine,
  onSave,
  loading
}: VaultCollectionEntryFormProps) {
  const { formatAmount } = useCurrencyFormat();
  const { selectedLicencee } = useDashBoardStore();
  
  // Meter Inputs
  const [meters, setMeters] = useState({
    billIn: '',
    ticketIn: '',
    totalIn: '' // Calculated or Manual? Let's assume calculated for verification
  });

  const denomsList = useMemo(() => getDenominationValues(selectedLicencee), [selectedLicencee]);

  // Physical Count
  const [denominations, setDenominations] = useState<Denomination[]>([]);

  useEffect(() => {
    setDenominations(denomsList.map(d => ({ denomination: d as any, quantity: 0 })));
  }, [denomsList]);
  
  // Notes
  const [notes, setNotes] = useState('');

  // Calculations
  const totalPhysical = denominations.reduce((acc, curr) => acc + (curr.denomination * curr.quantity), 0);
  
  // Simple variance check: Physical - (Bill In - Previous Bill In?). 
  // For now, let's assume 'Expected' comes from the Meter difference since last collection.
  // BUT we don't have last collection handy in this scope without an API call.
  // So let's keep it simple: Compare Physical vs Bill In Meter (if user inputs it as 'Current DROP meter').
  // A better approach: User enters 'Current Bill In Meter'. System calculates (Current - Previous) = Drop.
  // Limitation: We need Previous Meter. 
  
  // Proposal: Just capture the Meter Reading for record keeping. Variance calculation can happen server-side or be purely informational if we fetch previous.
  // Let's stick to Physical Count entry as primary. Meter is optional data point.
  
  // Let's add 'Expected Drop' field manually for now if they want to check variance against a slip?
  const [expectedDrop, setExpectedDrop] = useState<string>('');
  
  const variance = totalPhysical - (parseFloat(expectedDrop) || 0);

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 0) return;
    const newDenoms = [...denominations];
    newDenoms[index].quantity = quantity;
    setDenominations(newDenoms);
  };

  // Reset form when machine changes
  useEffect(() => {
    setMeters({ billIn: '', ticketIn: '', totalIn: '' });
    setDenominations(denomsList.map(d => ({ denomination: d as any, quantity: 0 })));
    setNotes('');
    setExpectedDrop('');
  }, [machine._id, denomsList]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-white border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
           <span className="bg-violet-100 p-2 rounded-lg text-violet-600">
             <Coins className="h-6 w-6" />
           </span>
           {machine.custom?.name || machine.assetNumber || 'Unknown Machine'}
           <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-md border">
             {machine.assetNumber || 'No Asset #'}
           </span>
        </h2>
      </div>

       <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Section 1: Meters (Verification) */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
             <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
               <RefreshCw className="h-4 w-4 text-blue-500" />
               Meter Verification (Optional)
             </h3>
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="text-xs font-medium text-gray-500">Bill In Meter</label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">
                            The current reading from the machine's bill acceptor meter. 
                            Used for verification and audit purposes.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input 
                    type="number" 
                    className="bg-gray-50 border-gray-200 font-mono text-sm"
                    placeholder="0.00"
                    value={meters.billIn}
                    onChange={e => setMeters({...meters, billIn: e.target.value})}
                  />
                </div>
                <div>
                   <div className="flex items-center gap-1.5 mb-1.5">
                     <label className="text-xs font-medium text-gray-500">Expected Drop Amount</label>
                     <TooltipProvider>
                       <Tooltip>
                         <TooltipTrigger asChild>
                           <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                         </TooltipTrigger>
                         <TooltipContent className="max-w-xs">
                           <p className="text-xs">
                             The amount you expect to collect based on system calculations 
                             or printed drop tickets. Used to calculate variance and detect 
                             discrepancies before finalizing.
                           </p>
                         </TooltipContent>
                       </Tooltip>
                     </TooltipProvider>
                   </div>
                   <Input 
                     type="number" 
                     className="bg-blue-50/50 border-blue-100 font-mono text-sm text-blue-700"
                     placeholder="0.00"
                     value={expectedDrop}
                     onChange={e => setExpectedDrop(e.target.value)}
                   />
                   <p className="text-[10px] text-gray-400 mt-1">
                     Enter amount from ticket/system for variance check
                   </p>
                </div>
             </div>
          </div>

          {/* Section 2: Physical Count */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
             <div className="flex items-center justify-between">
               <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                 <Coins className="h-4 w-4 text-emerald-500" />
                 Physical Count
               </h3>
               <div className="text-right">
                  <span className="text-2xl font-black text-gray-900 tracking-tight">
                    {formatAmount(totalPhysical)}
                  </span>
                  <p className="text-xs text-gray-400 font-medium">Total Collected</p>
               </div>
             </div>

             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
               {denominations.map((denom, idx) => (
                 <div 
                   key={denom.denomination}
                   className={cn(
                     "p-3 rounded-lg border transition-all relative group",
                     denom.quantity > 0 
                       ? "bg-emerald-50/30 border-emerald-100 ring-1 ring-emerald-100" 
                       : "bg-gray-50 border-gray-100 hover:border-gray-200"
                   )}
                 >
                   <div className="flex justify-between items-start mb-2">
                     <span className={cn(
                       "text-xs font-bold px-2 py-0.5 rounded-full border",
                       denom.quantity > 0 
                         ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                         : "bg-white text-gray-500 border-gray-200"
                     )}>
                       ${denom.denomination}
                     </span>
                   </div>
                   
                   <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded hover:bg-black/5 text-gray-400"
                        onClick={() => updateQuantity(idx, denom.quantity - 1)}
                        disabled={denom.quantity === 0}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        className="h-7 text-center font-mono font-bold text-sm bg-transparent border-transparent focus:bg-white focus:border-emerald-500 p-0"
                        value={denom.quantity || ''}
                        placeholder="0"
                        onChange={e => updateQuantity(idx, parseInt(e.target.value) || 0)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded hover:bg-black/5 text-gray-600"
                        onClick={() => updateQuantity(idx, denom.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                   </div>
                 </div>
               ))}
             </div>
          </div>

          {/* Section 3: Variance & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Variance Card */}
             <div className={cn(
               "p-4 rounded-xl border flex flex-col justify-center items-center gap-1 transition-colors",
               !expectedDrop ? "bg-gray-50 border-gray-200" :
               variance === 0 ? "bg-emerald-50 border-emerald-200" :
               "bg-amber-50 border-amber-200"
             )}>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Variance</p>
                <div className={cn(
                  "text-2xl font-black",
                  !expectedDrop ? "text-gray-400" :
                  variance === 0 ? "text-emerald-600" :
                  variance > 0 ? "text-emerald-600" : "text-red-500"
                )}>
                  {expectedDrop ? (variance > 0 ? '+' : '') + formatAmount(variance) : '--'}
                </div>
                
                {expectedDrop && variance !== 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-100/50 px-2 py-1 rounded mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {variance > 0 ? 'Surplus' : 'Shortage'} detected
                  </div>
                )}
             </div>

             {/* Notes */}
             <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Collection Notes</label>
                <textarea 
                  className="w-full h-[88px] rounded-xl border-gray-300 focus:border-violet-500 focus:ring-violet-500 text-sm p-3 resize-none bg-white"
                  placeholder="Add comments about variance or machine state..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
             </div>
          </div>
       </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-between items-center">
         <div className="text-sm text-gray-500">
           {totalPhysical > 0 ? 'Ready to add' : 'Enter counts to proceed'}
         </div>
         <Button 
           size="lg"
           className="bg-violet-600 hover:bg-violet-700 text-white min-w-[200px] shadow-lg shadow-violet-200"
           disabled={loading || totalPhysical === 0}
           onClick={() => onSave({
             totalAmount: totalPhysical,
             denominations: denominations.filter(d => d.quantity > 0),
             meters: {
                billIn: parseFloat(meters.billIn) || 0,
                ticketIn: parseFloat(meters.ticketIn) || 0,
                totalIn: parseFloat(meters.totalIn) || 0
             },
             variance,
             notes
           })}
         >
           {loading ? (
             <>
               <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
               Saving...
             </>
           ) : (
             <>
               <Save className="h-4 w-4 mr-2" />
               Add to Session
             </>
           )}
         </Button>
      </div>
    </div>
  );
}
