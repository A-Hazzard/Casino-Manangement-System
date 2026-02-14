/**
 * Soft Count Form Component
 *
 * Form for Vault Manager to record soft count cash removal from machines.
 * Designed to be used within the VaultSoftCountModal wizard.
 *
 * Features:
 * - Fetches live cabinet data (meters/expected drop) on mount/change
 * - Validates physical count against expected drop (variance)
 * - Records denomination breakdown
 *
 * @module components/VAULT/machine/SoftCountForm
 */

'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { fetchCabinetById } from '@/lib/helpers/cabinets';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { cn } from '@/lib/utils';
import { getDenominationValues } from '@/lib/utils/vault/denominations';
import type { GamingMachine } from '@/shared/types/entities';
import type { Denomination } from '@/shared/types/vault';
import {
    AlertTriangle,
    ArrowRightCircle,
    CheckCircle2,
    Coins,
    Info,
    MessageSquare,
    Minus,
    Plus,
    RefreshCw
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type SoftCountFormProps = {
  machine?: GamingMachine;
  onSubmit: (data: {
    amount: number;
    denominations: Denomination[];
    notes?: string;
    meters?: { billIn: number; ticketIn: number; totalIn: number };
    expectedDrop: number;
    variance: number;
  }) => Promise<void>;
  loading?: boolean;
};

export default function SoftCountForm({
  machine,
  onSubmit,
  loading = false,
}: SoftCountFormProps) {
  const { formatAmount } = useCurrencyFormat();
  const { selectedLicencee } = useDashBoardStore();
  
  // Form State
  const [notes, setNotes] = useState('');
  const [denominations, setDenominations] = useState<Denomination[]>([]);
  const [meters, setMeters] = useState({
    moneyIn: 0,
    moneyOut: 0,
    gross: 0,
    billIn: ''
  });
  const [expectedDrop, setExpectedDrop] = useState<string>('');
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const denomsList = useMemo(() => getDenominationValues(selectedLicencee), [selectedLicencee]);

  // Reset form when machine changes
  useEffect(() => {
    if (machine) {
        setDenominations(denomsList.map((denom: string | number) => ({ 
            denomination: denom as any, 
            quantity: 0 
        })));
        setNotes('');
        setMeters({ moneyIn: 0, moneyOut: 0, gross: 0, billIn: '' });
        setExpectedDrop('');
        
        // Fetch live details
        fetchMachineDetails(machine._id);
    }
  }, [machine?._id, denomsList]);

  const fetchMachineDetails = async (id: string) => {
      setIsFetchingDetails(true);
      try {
          // Fetch detailed data including meters
          const details = await fetchCabinetById(id, 'Today');
          if (details) {
              setMeters({
                  moneyIn: details.moneyIn || 0,
                  moneyOut: details.moneyOut || 0,
                  gross: details.gross || 0,
                  billIn: details.billMeters?.totalBills?.toString() || details.collectionMeters?.billIn?.toString() || ''
              });

              if (details.moneyIn !== undefined) {
                   setExpectedDrop(details.moneyIn.toString());
              }
          }
      } catch (error) {
          console.error("Failed to fetch machine details", error);
          toast.error("Could not load latest meter data");
      } finally {
          setIsFetchingDetails(false);
      }
  };

  const totalPhysical = denominations.reduce(
    (sum, d) => sum + d.denomination * d.quantity,
    0
  );

  const variance = totalPhysical - (parseFloat(expectedDrop) || 0);

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 0) return;
    const newDenominations = [...denominations];
    newDenominations[index] = { ...newDenominations[index], quantity };
    setDenominations(newDenominations as Denomination[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machine) return;
    if (totalPhysical === 0) {
        toast.error("Cannot submit a zero count");
        return;
    }
    
    const filteredDenominations = denominations.filter(d => d.quantity > 0);
    try {
      await onSubmit({
        amount: totalPhysical,
        denominations: filteredDenominations,
        notes: notes.trim() || undefined,
        meters: {
            billIn: parseFloat(meters.billIn) || 0,
            ticketIn: 0, 
            totalIn: 0   
        },
        expectedDrop: parseFloat(expectedDrop) || 0,
        variance
      });
    } catch {
      // Error handled by parent
    }
  };

  // Helper to determine font size based on amount length
  const getDynamicFontSize = (amount: number) => {
    const length = formatAmount(amount).length;
    if (length > 15) return 'text-xl';
    if (length > 12) return 'text-2xl';
    return 'text-4xl';
  };

  if (!machine) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-gray-400">
            <Info className="h-10 w-10 mb-4 opacity-20" />
            <p className="text-sm font-medium">Select a machine to begin counting.</p>
        </div>
      );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white relative overflow-hidden">
      {/* Machine Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
         <div>
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-gray-900">{machine.custom?.name || 'Unknown Machine'}</h2>
                <Badge variant="outline" className="bg-white text-gray-500 border-gray-200">
                    {machine.assetNumber || machine.serialNumber}
                </Badge>
            </div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                {machine.locationName || 'Unknown Location'}
            </p>
         </div>
         {isFetchingDetails && (
             <div className="flex items-center gap-2 text-xs text-violet-500 font-bold animate-pulse">
                 <RefreshCw className="h-3 w-3 animate-spin" />
                 Syncing Meters...
             </div>
         )}
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Meter Verification Section */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                 <RefreshCw className="h-3.5 w-3.5" />
                 Session Metrics (Today)
               </h4>
               <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-gray-400 uppercase">Money In</Label>
                    <div className="h-9 px-3 flex items-center bg-gray-50 border border-gray-100 rounded-lg text-xs font-mono font-bold text-gray-700 overflow-hidden truncate">
                        {formatAmount(meters.moneyIn)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-gray-400 uppercase">Money Out</Label>
                    <div className="h-9 px-3 flex items-center bg-gray-50 border border-gray-100 rounded-lg text-xs font-mono font-bold text-gray-700 overflow-hidden truncate">
                        {formatAmount(meters.moneyOut)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-gray-400 uppercase">Gross</Label>
                    <div className={cn(
                        "h-9 px-3 flex items-center border rounded-lg text-xs font-mono font-bold overflow-hidden truncate",
                        meters.gross >= 0 ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700"
                    )}>
                        {formatAmount(meters.gross)}
                    </div>
                  </div>
               </div>
               <div className="pt-2 border-t border-gray-50">
                   <div className="flex items-center gap-2">
                       <Label className="text-[10px] font-bold text-blue-500 uppercase min-w-[80px]">Exp. Drop</Label>
                       <Input 
                         type="number" 
                         className="h-8 text-sm font-mono bg-blue-50/50 border-blue-200 text-blue-700 font-bold w-32"
                         value={expectedDrop}
                         onChange={e => setExpectedDrop(e.target.value)}
                       />
                       <span className="text-[10px] text-gray-400 italic">Adjust if needed</span>
                   </div>
               </div>
            </div>

            {/* Denomination Grid */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                        <Coins className="h-3.5 w-3.5" />
                        Physical Count
                    </h4>
                    <span className="text-[10px] font-bold text-violet-500 bg-violet-50 px-2 py-0.5 rounded-md">
                        Bills Only
                    </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        "flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm font-black text-xs",
                        denom.quantity > 0 ? "text-violet-600 border border-violet-100" : "text-gray-400 border border-transparent"
                        )}>
                        ${denom.denomination}
                        </div>
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
                        className="w-12 h-7 border-none bg-transparent text-center font-black p-0 focus-visible:ring-0 text-sm"
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

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-lg shadow-violet-500/20 flex flex-col justify-center min-h-[120px]">
                <div className="relative z-10">
                  <p className="text-[9px] font-black uppercase tracking-widest text-violet-100/60 mb-2">Physical Total</p>
                  <span className={cn(
                    "font-black tracking-tighter transition-all block leading-none",
                    getDynamicFontSize(totalPhysical),
                    totalPhysical > 0 ? "text-white" : "text-white/20"
                  )}>
                    {formatAmount(totalPhysical)}
                  </span>
                </div>
                <Coins className="absolute -right-4 -bottom-4 h-24 w-24 text-white/5 rotate-12" />
              </div>

              <div className={cn(
                "rounded-2xl p-5 border flex flex-col justify-center transition-all relative overflow-hidden min-h-[120px]",
                !expectedDrop ? "bg-gray-50 border-gray-100" :
                variance === 0 ? "bg-emerald-50 border-emerald-100" :
                "bg-white border-amber-200 shadow-sm"
              )}>
                <div className="relative z-10 w-full">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Difference (Variance)</p>
                    
                    <div className="flex flex-col gap-1">
                        <span className={cn(
                        "font-black tracking-tighter transition-all leading-none",
                        getDynamicFontSize(variance),
                        !expectedDrop ? "text-gray-300" :
                        variance === 0 ? "text-emerald-600" :
                        variance > 0 ? "text-emerald-600" : "text-amber-500"
                        )}>
                        {expectedDrop ? (variance > 0 ? '+' : '') + formatAmount(variance) : '--'}
                        </span>

                        {(variance !== 0 && expectedDrop) && (
                            <div className="flex items-center gap-1.5 mt-1 animate-in fade-in slide-in-from-left-2 duration-300">
                                <Badge variant="outline" className={cn(
                                    "border-0 font-bold px-1.5 py-0 h-4 text-[10px]",
                                    variance > 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                )}>
                                    {Math.abs((variance / parseFloat(expectedDrop)) * 100).toFixed(1)}%
                                </Badge>
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Variance Percent</span>
                            </div>
                        )}
                    </div>
                </div>
                {variance !== 0 && expectedDrop && (
                    <AlertTriangle className="absolute -right-2 -bottom-2 h-20 w-20 text-amber-500/10 rotate-12" />
                )}
                {variance === 0 && expectedDrop && (
                    <CheckCircle2 className="absolute -right-2 -bottom-2 h-20 w-20 text-emerald-500/10 rotate-12" />
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" />
                Collection Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Discrepancies, condition notes, etc..."
                className="bg-gray-50/50 border-gray-100 rounded-xl focus:bg-white transition-all text-xs resize-none min-h-[60px]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !machine || totalPhysical === 0}
              className="w-full h-14 bg-violet-600 text-white hover:bg-violet-700 font-black text-base shadow-lg shadow-violet-600/20 active:scale-[0.98] transition-all rounded-xl"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Adding...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Add to Soft Count Session</span>
                  <ArrowRightCircle className="h-5 w-5" />
                </div>
              )}
            </Button>
      </form>
    </div>
  );
}
