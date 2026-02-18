/**
 * Vault Collection Entry Form
 *
 * Middle panel for entering meter readings and physical counts.
 * Includes variance tracking and integrated history view.
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { fetchCabinetById } from '@/lib/helpers/cabinets';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { cn } from '@/lib/utils';
import { getDenominationValues } from '@/lib/utils/vault/denominations';
import type { GamingMachine } from '@/shared/types/entities';
import type { Denomination } from '@/shared/types/vault';
import { AlertCircle, Coins, History as HistoryIcon, Loader2, Minus, Plus, RefreshCw, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

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
    expectedDrop: number;
    notes: string;
  }) => void;
  loading: boolean;
  history?: any[];
  historyLoading?: boolean;
  defaultShowHistory?: boolean;
}

export default function VaultCollectionEntryForm({
  machine,
  onSave,
  loading,
  history = [],
  historyLoading = false,
  defaultShowHistory = false
}: VaultCollectionEntryFormProps) {
  const { formatAmount } = useCurrencyFormat();
  const { selectedLicencee } = useDashBoardStore();
  
  // States
  const [meters, setMeters] = useState({
    billIn: '',
    ticketIn: '',
    totalIn: '',
    moneyIn: 0,
    moneyOut: 0,
    gross: 0
  });
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [denominations, setDenominations] = useState<Denomination[]>([]);
  const [touchedDenominations, setTouchedDenominations] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState('');
  const [expectedDrop, setExpectedDrop] = useState<string>('');
  const [showHistory, setShowHistory] = useState(defaultShowHistory);

  const denomsList = useMemo(() => getDenominationValues(selectedLicencee), [selectedLicencee]);

  // Effects
  useEffect(() => {
    setDenominations(denomsList.map((d: string | number) => ({ denomination: d as any, quantity: 0 })));
  }, [denomsList]);

  useEffect(() => {
    // Reset form when machine changes
    setMeters({ billIn: '', ticketIn: '', totalIn: '', moneyIn: 0, moneyOut: 0, gross: 0 });
    setDenominations(denomsList.map((d: string | number) => ({ denomination: d as any, quantity: 0 })));
    setTouchedDenominations(new Set());
    setNotes('');
    setExpectedDrop('');
    setShowHistory(defaultShowHistory);
    
    if (machine?._id) {
        fetchMachineDetails(machine._id);
    }
  }, [machine?._id, denomsList, defaultShowHistory]);

  // Calculations
  const totalPhysical = denominations.reduce((acc: number, curr: Denomination) => acc + (curr.denomination * curr.quantity), 0);
  const variance = totalPhysical - (parseFloat(expectedDrop) || 0);
  const totalPhysicalStr = formatAmount(totalPhysical);
  const varianceStr = expectedDrop ? (variance > 0 ? '+' : '') + formatAmount(variance) : '--';

  // Handlers
  const fetchMachineDetails = async (id: string) => {
    setFetchingDetails(true);
    try {
        const details = await fetchCabinetById(id, 'Today');
        if (details) {
            setMeters({
                moneyIn: details.moneyIn || 0,
                moneyOut: details.moneyOut || 0,
                gross: details.gross || 0,
                billIn: (details.billMeters?.totalBills ?? details.collectionMeters?.billIn ?? '').toString(),
                ticketIn: (details.collectionMeters?.ticketIn ?? '').toString(),
                totalIn: (details.collectionMeters?.totalIn ?? '').toString()
            });

            if (details.moneyIn !== undefined) {
                 setExpectedDrop(details.moneyIn.toString());
            }
        }
    } catch (error) {
        console.error("Failed to fetch machine details", error);
        toast.error("Could not load latest meter data");
    } finally {
        setFetchingDetails(false);
    }
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 0) return;
    const newDenoms = [...denominations];
    const denomVal = newDenoms[index].denomination;
    newDenoms[index].quantity = quantity;
    setDenominations(newDenoms);
    setTouchedDenominations(prev => {
        const next = new Set(prev);
        next.add(Number(denomVal));
        return next;
    });
  };

  const isAllTouched = denomsList.every((d: any) => touchedDenominations.has(Number(d)));
  const isValidCount = totalPhysical > 0 || isAllTouched;

  const getDynamicFontSize = (text: string, base: string, med: string, small: string) => {
    if (text.length > 15) return small;
    if (text.length > 12) return med;
    return base;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="p-5 md:p-8 pb-4 md:pb-6 border-b border-gray-100">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-10 w-10 md:h-12 md:w-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 shadow-sm border border-gray-100 shrink-0">
              <Coins className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg md:text-xl font-black text-gray-900 tracking-tight leading-none mb-1 md:mb-2 truncate">
                  {machine.custom?.name || machine.assetNumber || 'Unknown Machine'}
              </h2>
              <div className="flex items-center gap-2">
                  <span className="text-[9px] md:text-[10px] font-black font-mono text-gray-400 uppercase tracking-tighter bg-gray-100 px-1.5 py-0.5 rounded truncate">
                    {machine.assetNumber || machine.serialNumber}
                  </span>
                  <span className="text-[9px] md:text-[10px] font-black text-gray-300 uppercase tracking-widest truncate">
                    • {machine.locationName || 'Forest View'}
                  </span>
              </div>
            </div>
          </div>
          
          <Button 
            variant={showHistory ? 'secondary' : 'outline'} 
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              "h-9 px-3 whitespace-nowrap gap-2 rounded-xl border-gray-100 font-bold transition-all",
              showHistory ? "bg-violet-50 text-violet-600 border-violet-100" : "text-gray-500 hover:text-violet-600 hover:border-violet-100"
            )}
          >
            {showHistory ? <Coins className="h-3.5 w-3.5" /> : <HistoryIcon className="h-3.5 w-3.5" />}
            <span className="text-xs">{showHistory ? 'Back to Form' : 'View History'}</span>
          </Button>
        </div>
      </div>

       <div className="flex-1 overflow-y-auto">
          {showHistory ? (
            <div className="p-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black text-amber-900 uppercase tracking-tight mb-1">Why check history?</h4>
                    <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                      Comparing current counts with past records helps spot anomalies like bill acceptor failures or cash discrepancies before final submission.
                    </p>
                  </div>
               </div>
               
               <div className="space-y-4">
                  {historyLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin text-violet-500 mb-2" />
                      <p className="text-xs font-bold text-gray-400 uppercase">Fetching records...</p>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                      <HistoryIcon className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-xs font-bold text-gray-400">No previous collections found</p>
                      <p className="text-[10px] text-gray-300 mt-1">History will appear after the first collection.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {history.map((record: any) => (
                        <div key={record._id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight mb-0.5">
                              {new Date(record.timestamp || record.collectedAt).toLocaleDateString()}
                            </p>
                            <p className="text-sm font-black text-gray-900">{formatAmount(record.amount || record.totalAmount)}</p>
                          </div>
                          <div className="text-right">
                             {record.variance !== undefined && (
                               <p className={cn(
                                 "text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter whitespace-nowrap",
                                 record.variance === 0 ? "bg-emerald-50 text-emerald-600" :
                                 record.variance > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                               )}>
                                 Var: {formatAmount(record.variance)}
                               </p>
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
            </div>
          ) : (
            <div className="p-6 space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
              {/* Section 1: Session Metrics (Verification) */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                 <div className="flex items-center justify-between">
                     <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                       <RefreshCw className={cn("h-4 w-4 text-blue-500", fetchingDetails && "animate-spin")} />
                       Session Metrics (Today)
                     </h3>
                     <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => fetchMachineDetails(machine._id)}>
                        Refresh
                     </Button>
                 </div>
                 <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Money In</div>
                      <div className="h-10 px-3 flex items-center bg-gray-50 border border-gray-100 rounded-lg text-xs font-mono font-bold text-gray-700 truncate">
                          {formatAmount(meters.moneyIn || 0)}
                      </div>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Money Out</div>
                      <div className="h-10 px-3 flex items-center bg-gray-50 border border-gray-100 rounded-lg text-xs font-mono font-bold text-gray-700 truncate">
                          {formatAmount(meters.moneyOut || 0)}
                      </div>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Gross</div>
                      <div className={cn(
                          "h-10 px-3 flex items-center border rounded-lg text-xs font-mono font-bold truncate",
                          (meters.gross || 0) >= 0 ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700"
                      )}>
                          {formatAmount(meters.gross || 0)}
                      </div>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                     <div className="min-w-0">
                       <div className="flex items-center gap-1.5 mb-1.5">
                         <label className="text-xs font-medium text-gray-500">Bill In Meter</label>
                       </div>
                       <Input 
                         type="number" 
                         className="bg-gray-50 border-gray-200 font-mono text-sm"
                         placeholder="0.00"
                         value={meters.billIn}
                         onChange={e => setMeters({...meters, billIn: e.target.value})}
                       />
                     </div>
                     <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <label className="text-xs font-medium text-gray-500">Expected Drop</label>
                        </div>
                        <Input 
                          type="number" 
                          className="bg-blue-50/50 border-blue-100 font-mono text-sm text-blue-700"
                          placeholder="0.00"
                          value={expectedDrop}
                          onChange={e => setExpectedDrop(e.target.value)}
                        />
                     </div>
                 </div>
              </div>

              {/* Section 2: Physical Count */}
              <div className="bg-gray-50/30 md:p-8 p-5 rounded-3xl border border-gray-100 space-y-6">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                     <Coins className="h-4 w-4 text-emerald-500" />
                     Physical Count
                   </h3>
                   <div className="sm:text-right min-w-0">
                       <span className={cn(
                           "font-black text-gray-900 tracking-tighter leading-none block transition-all",
                           getDynamicFontSize(totalPhysicalStr, "text-4xl", "text-3xl", "text-2xl")
                       )}>
                         {totalPhysicalStr}
                       </span>
                       <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Physical total</p>
                   </div>
                 </div>
 
                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {denominations.map((denom, idx) => (
                      <div 
                        key={denom.denomination}
                        className={cn(
                          "p-3 md:p-4 rounded-2xl border transition-all relative group",
                          denom.quantity > 0 
                            ? "bg-white border-emerald-200 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-100" 
                            : "bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200"
                        )}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest leading-none",
                            denom.quantity > 0 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                              : "bg-gray-50 text-gray-400 border-gray-100"
                          )}>
                            ${denom.denomination}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5 border border-gray-100 shadow-inner">
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-8 w-8 rounded-md hover:bg-white hover:text-red-500 text-gray-400 transition-all"
                             onClick={() => updateQuantity(idx, (denom.quantity || 0) - 1)}
                             disabled={!denom.quantity}
                           >
                             <Minus className="h-3.5 w-3.5" />
                           </Button>
                           <Input
                             className={cn(
                               "h-8 text-center font-black text-sm bg-transparent border-none focus-visible:ring-0 p-0 text-gray-900 transition-all",
                               touchedDenominations.has(Number(denom.denomination)) && "text-emerald-600"
                             )}
                             value={denom.quantity || ''}
                             placeholder="0"
                             onChange={e => updateQuantity(idx, parseInt(e.target.value) || 0)}
                           />
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-8 w-8 rounded-md hover:bg-white hover:text-emerald-500 text-gray-400 transition-all"
                             onClick={() => updateQuantity(idx, (denom.quantity || 0) + 1)}
                           >
                             <Plus className="h-3.5 w-3.5" />
                           </Button>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>

              {/* Section 3: Variance & Notes */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Variance Card */}
                 <div className={cn(
                   "p-6 rounded-3xl border flex flex-col justify-center items-center gap-1 transition-all",
                   !expectedDrop ? "bg-gray-50 border-gray-100" :
                   variance === 0 ? "bg-emerald-50 border-emerald-100" :
                   "bg-amber-50 border-amber-100"
                 )}>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Variance</p>
                    <div className={cn(
                      "font-black tracking-tighter transition-all leading-none w-full text-center whitespace-nowrap",
                      !expectedDrop ? "text-gray-200" :
                      variance === 0 ? "text-emerald-600" :
                      variance > 0 ? "text-emerald-600" : "text-red-500",
                      getDynamicFontSize(varianceStr, "text-3xl", "text-2xl", "text-xl")
                    )}>
                      {varianceStr}
                    </div>
                    
                    {expectedDrop && variance !== 0 && (
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-amber-600 bg-white border border-amber-100 px-2 py-1 rounded-lg mt-3 shadow-sm whitespace-nowrap">
                        <AlertCircle className="h-3 w-3" />
                        {variance > 0 ? 'Surplus' : 'Shortage'}
                      </div>
                    )}
                 </div>

                 {/* Notes */}
                 <div className="lg:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Collection Notes (Optional)</label>
                    <textarea 
                      className="w-full h-[100px] rounded-3xl border-gray-100 focus:border-violet-500 focus:ring-violet-500 text-[13px] font-medium p-4 resize-none bg-gray-50/50 transition-all placeholder:text-gray-300 shadow-inner"
                      placeholder="Add comments about variance or machine state..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                 </div>
              </div>
            </div>
          )}
       </div>

      {/* Footer Actions */}
      <div className="px-5 md:px-8 py-4 md:py-6 bg-white border-t border-gray-100 flex justify-between items-center">
         <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest hidden xs:block">
           {totalPhysical > 0 ? 'Review & add to session' : 'Entry pending counts'}
         </div>
         <Button 
           onClick={() => onSave({
             totalAmount: totalPhysical,
             denominations: denominations.filter(d => d.quantity > 0),
             meters: {
                billIn: parseFloat(meters.billIn) || 0,
                ticketIn: parseFloat(meters.ticketIn) || 0,
                totalIn: parseFloat(meters.totalIn) || 0
             },
             variance,
             expectedDrop: parseFloat(expectedDrop) || 0,
             notes: notes.trim()
           })}
           disabled={loading || !isValidCount || showHistory}
           className="h-11 md:h-12 flex-1 md:flex-none md:px-10 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-violet-600/20 transition-all active:scale-[0.98]"
         >
           {loading ? (
             <RefreshCw className="h-4 w-4 animate-spin" />
           ) : (
             <div className="flex items-center justify-center gap-2">
               <Save className="h-4 w-4" />
               <span>Add to Session</span>
             </div>
           )}
         </Button>
      </div>
    </div>
  );
}
