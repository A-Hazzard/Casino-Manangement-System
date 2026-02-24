/**
 * Vault Overview Soft Count Modal (Wizard Style)
 *
 * Full-screen wizard for managing soft counts (mid-day cash drops).
 * Uses a 3-column layout: Machine Selector, Entry Form, Session Summary.
 */
'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/shared/ui/alert-dialog';
import { Button } from '@/components/shared/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import SoftCountForm from '@/components/VAULT/machine/SoftCountForm';
import VaultOverviewCollectionMachineSelector from '@/components/VAULT/overview/modals/wizard/VaultOverviewCollectionMachineSelector';
import VaultOverviewCollectionSessionList from '@/components/VAULT/overview/modals/wizard/VaultOverviewCollectionSessionList';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import { cn } from '@/lib/utils';
import type { GamingMachine } from '@/shared/types/entities';
import { CheckCheck, CheckCircle2, Coins, LayoutGrid, ListChecks, Loader2, Monitor, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import VaultAuthenticatorModal from '../../shared/VaultAuthenticatorModal';

interface VaultOverviewSoftCountModalProps {
  open: boolean;
  onClose: () => void;
  machines: GamingMachine[];
  onConfirm: () => void;
  currentVaultShiftId?: string;
  currentLocationId?: string;
  isEndOfDay?: boolean;
}

export default function VaultOverviewSoftCountModal({
  open,
  onClose,
  machines,
  onConfirm,
  currentVaultShiftId,
  currentLocationId,
  isEndOfDay = false
}: VaultOverviewSoftCountModalProps) {
  const { user } = useUserStore();
  const { formatAmount } = useCurrencyFormat();
  
  // -- State --
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  
  // Selection
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Completion State
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalStats, setFinalStats] = useState({ count: 0, total: 0 });

  // Confirmation State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAuthenticator, setShowAuthenticator] = useState(false);

  // Mobile UI States
  const [activeTabMobile, setActiveTabMobile] = useState<'selector' | 'form' | 'summary'>('selector');

  // -- Derivations --
  const selectedMachine = machines.find(m => m._id === selectedMachineId);
  const completedMachineIds = entries.map(e => e.machineId);

  // -- Effects --
  useEffect(() => {
     if (open && currentLocationId && currentVaultShiftId) {
         loadSession();
     } else {
         // Reset state on close
         setSessionId(null);
         setEntries([]);
         setSelectedMachineId(null);
         setSearchTerm('');
         setIsCompleted(false);
         setFinalStats({ count: 0, total: 0 });
         setShowConfirmModal(false);
         setActiveTabMobile('selector');
     }
  }, [open, currentLocationId, currentVaultShiftId]);

  // Handle mobile tab switching on machine selection
  useEffect(() => {
    if (selectedMachineId && activeTabMobile === 'selector') {
      setActiveTabMobile('form');
    }
  }, [selectedMachineId]);

  const loadSession = async () => {
    setSessionLoading(true);
    try {
        const res = await fetch(`/api/vault/collection-session?locationId=${currentLocationId}&vaultShiftId=${currentVaultShiftId}&type=soft_count&isEndOfDay=${isEndOfDay}`);
        const data = await res.json();
        
        if (data.success && data.session) {
            setSessionId(data.session._id);
            setEntries(data.session.entries || []);
            
            // If already completed, show success view
            if (data.session.status === 'completed') {
                setFinalStats({
                    count: data.session.entries?.length || 0,
                    total: data.session.totalCollected || 0
                });
                setIsCompleted(true);
            }
        } else {
            await startSession();
        }
    } catch (err) {
        console.error("Failed to load soft count session", err);
        toast.error("Failed to recover session");
    } finally {
        setSessionLoading(false);
    }
  };

  const startSession = async () => {
    try {
        const res = await fetch('/api/vault/collection-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'start',
                locationId: currentLocationId,
                vaultShiftId: currentVaultShiftId,
                type: 'soft_count',
                isEndOfDay,
                userId: user?._id
            })
        });
        const data = await res.json();
        
        if (data.success && data.session) {
            setSessionId(data.session._id);
            setEntries(data.session.entries || []);
        }
    } catch (err) {
        console.error("Failed to start soft count session", err);
    }
  };

  // -- Handlers --
  const handleAddEntry = async (formData: any) => {
    if (!sessionId || !selectedMachine) return;
    
    setLoading(true);
    try {
        const payload = {
            action: 'addEntry',
            sessionId,
            locationId: currentLocationId,
            vaultShiftId: currentVaultShiftId, 
            type: 'soft_count',
            machineId: selectedMachine._id,
            entryData: {
                ...formData,
                machineId: selectedMachine._id,
                machineName: selectedMachine.custom?.name || selectedMachine.assetNumber || 'Unknown Machine',
                totalAmount: formData.amount, 
                collectedAt: new Date()
            }
        };

        const res = await fetch('/api/vault/collection-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (data.success) {
            toast.success(`Add ${selectedMachine.assetNumber} to session`);
            setEntries(data.session.entries);
            setSelectedMachineId(null); 
            setSearchTerm('');
            
            // Go back to selector on mobile
            setActiveTabMobile('selector');
        } else {
            toast.error(data.error || 'Failed to save entry');
        }
    } catch (err) {
        console.error(err);
        toast.error('Network error occurred');
    } finally {
        setLoading(false);
    }
  };

  const handleRemoveEntry = async (machineId: string) => {
    if (!sessionId) return;
    try {
        const res = await fetch('/api/vault/collection-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'removeEntry',
                sessionId,
                machineId,
                type: 'soft_count'
            })
        });
        const data = await res.json();
        if (data.success) {
            setEntries(data.session.entries);
            toast.success('Entry removed');
        }
    } catch {
        toast.error('Failed to remove entry');
    }
  };

  const hasNoMachines = machines.length === 0;

  const handleFinalizeClick = () => {
    if (!sessionId) return;
    // Allow finalize with 0 entries only if the location has no machines
    if (entries.length === 0 && !hasNoMachines) return;
    setShowAuthenticator(true);
  };

  const handleAuthVerified = () => {
    setShowConfirmModal(true);
  };

  const executeFinalize = async () => {
    setLoading(true);
    setShowConfirmModal(false); 
    
    try {
        const res = await fetch('/api/vault/collection-session/finalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                locationId: currentLocationId,
                vaultShiftId: currentVaultShiftId,
                userId: user?._id
            })
        });
        
        const data = await res.json();
        if (data.success) {
            setFinalStats({
                count: entries.length,
                total: data.totalCollected || entries.reduce((acc: any, e: any) => acc + e.totalAmount, 0)
            });
            setIsCompleted(true);
            toast.success('Soft count finalized successfully');
        } else {
            toast.error(data.error || 'Failed to finalize session');
        }
    } catch {
        toast.error('Network error finalizing session');
    } finally {
        setLoading(false);
    }
  };

  const handleSuccessClose = () => {
      onConfirm();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => !val && !isCompleted && onClose()}>
        <DialogContent 
          className={cn(
            "max-w-full md:max-w-[98vw] w-full h-[100dvh] md:h-[95vh] p-0 overflow-hidden flex flex-col border-none shadow-2xl md:rounded-3xl !z-[200] transition-colors duration-500",
            isCompleted ? "bg-black/40 backdrop-blur-sm" : "bg-white"
          )}
          backdropClassName="bg-black/90 backdrop-blur-md !z-[190]"
        >
            
            {/* SUCCESS VIEW */}
            {isCompleted ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 animate-in fade-in zoom-in-95 duration-500">
                    <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl border border-gray-100 flex flex-col items-center max-w-sm w-full text-center">
                        <div className="h-20 w-20 md:h-24 md:w-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                            <CheckCircle2 className="h-10 w-10 md:h-12 md:w-12 text-emerald-600" />
                        </div>
                        
                        <h2 className="text-2xl font-black text-gray-900 mb-2">
                            {isEndOfDay ? "Soft Count Finalized For Today!" : "Soft Count Complete!"}
                        </h2>
                        <p className="text-xs text-gray-500 mb-8 px-4 leading-relaxed">
                            {isEndOfDay 
                                ? "All machines for today's closure have been processed and added to the vault."
                                : "The mid-day collection has been successfully processed and added to the vault balance."
                            }
                        </p>
                        
                        <div className="w-full bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100">
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                                <span className="text-xs text-gray-500 font-medium">Machines Counted</span>
                                <span className="text-gray-900 font-bold text-lg">{finalStats.count}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500 font-medium font-bold">Total Removed</span>
                                <span className="text-amber-600 font-black text-2xl">
                                    {formatAmount(finalStats.total)}
                                </span>
                            </div>
                        </div>

                        <Button 
                            size="lg" 
                            onClick={handleSuccessClose}
                            className="w-full h-12 text-base font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-200"
                        >
                            Done
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Header */}
                    <DialogHeader className="px-6 py-4 md:px-8 md:py-5 border-b border-gray-100 flex flex-row items-center justify-between space-y-0 bg-white z-20">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="h-9 w-9 md:h-10 md:w-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shadow-sm shrink-0">
                                <LayoutGrid className="h-4 w-4 md:h-5 md:w-5" />
                            </div>
                            <div className="min-w-0">
                                <DialogTitle className="text-lg md:text-xl font-black text-gray-900 tracking-tight leading-none truncate">Soft Count Entry</DialogTitle>
                                <p className="text-[9px] md:text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                                    <span className="hidden xs:inline">Mid-Day Cash Drop</span>
                                    {sessionId && (
                                        <span className="text-violet-500 font-mono tracking-tighter truncate">Session: {sessionId.substring(0,8)}</span>
                                    )}
                                    {sessionLoading && <Loader2 className="h-3 w-3 animate-spin text-violet-400" />}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 md:gap-4">
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={onClose} 
                                className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 font-bold text-xs md:text-sm tracking-tight"
                            >
                                <X className="h-4 w-4 md:h-5 md:w-5" />
                                <span className="hidden xs:inline">Cancel</span>
                            </Button>
                            <Button 
                                onClick={handleFinalizeClick} 
                                disabled={loading || (entries.length === 0 && !hasNoMachines)}
                                className="h-9 md:h-11 px-3 md:px-6 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs md:text-sm rounded-lg md:rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" /> : <CheckCheck className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />}
                                <span className="hidden sm:inline">Finalize Session</span>
                                <span className="sm:inline font-black ml-1">({entries.length})</span>
                            </Button>
                        </div>
                    </DialogHeader>

                    {/* Responsive Panels Layout */}
                    <div className="flex-1 flex flex-col lg:flex-row min-h-0 bg-white overflow-hidden relative">
                        
                        {/* No Machines Empty State */}
                        {hasNoMachines ? (
                          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                              <div className="w-20 h-20 md:w-24 md:h-24 bg-amber-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-amber-100">
                                  <Monitor className="h-8 w-8 md:h-10 md:w-10 text-amber-300" />
                              </div>
                              <h3 className="text-lg md:text-xl font-black text-gray-800 mb-2 tracking-tight">No Machines at This Location</h3>
                              <p className="text-gray-400 text-xs md:text-sm max-w-[320px] font-medium leading-relaxed mb-6">
                                  This location has no machines to count. You can finalize the session immediately to proceed with closing the vault.
                              </p>
                              <Button
                                onClick={handleFinalizeClick}
                                disabled={loading || !sessionId}
                                className="h-12 px-8 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
                              >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCheck className="mr-2 h-4 w-4" />}
                                Finalize Session
                              </Button>
                          </div>
                        ) : (
                        <>
                        {/* Left: Machine Selector - Hidden on mobile unless active */}
                        <div className={cn(
                          "flex-col lg:flex h-full lg:w-1/4 min-w-0", 
                          activeTabMobile === 'selector' ? "flex w-full" : "hidden"
                        )}>
                            {/* Mobile Progress Header */}
                            <div className="lg:hidden p-4 bg-amber-600 text-white flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <ListChecks className="h-4 w-4" />
                                    <span className="text-xs font-black uppercase tracking-widest">{entries.length} Machines Counted</span>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10"
                                    onClick={() => setActiveTabMobile('summary')}
                                >
                                    View Review
                                </Button>
                            </div>

                            <VaultOverviewCollectionMachineSelector 
                                machines={machines}
                                selectedMachineId={selectedMachineId}
                                collectedMachineIds={completedMachineIds}
                                onSelect={setSelectedMachineId}
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                            />
                        </div>

                        {/* Middle: Entry Form - Hidden on mobile unless active */}
                        <div className={cn(
                          "flex-1 lg:flex flex-col min-w-0 bg-white relative h-full",
                          activeTabMobile === 'form' ? "flex w-full" : "hidden"
                        )}>
                            {selectedMachine ? (
                                <SoftCountForm 
                                    machine={selectedMachine}
                                    onSubmit={handleAddEntry}
                                    loading={loading}
                                    isEndOfDayFixed={isEndOfDay}
                                />
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                                    <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                                        <LayoutGrid className="h-8 w-8 md:h-10 md:w-10 text-gray-200" />
                                    </div>
                                    <h3 className="text-lg md:text-xl font-black text-gray-800 mb-2 tracking-tight">No Machine Selected</h3>
                                    <p className="text-gray-400 text-xs md:text-sm max-w-[280px] font-medium leading-relaxed">
                                    Select a machine from the machine list to begin entering soft count data.
                                    </p>
                                    <Button 
                                      variant="outline" 
                                      className="mt-6 lg:hidden font-bold rounded-xl border-amber-100 text-amber-600"
                                      onClick={() => setActiveTabMobile('selector')}
                                    >
                                      Go to Machine List
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Right: Session List / Summary - Hidden on mobile unless active */}
                        <div className={cn(
                          "lg:w-1/4 lg:min-w-[320px] lg:border-l lg:border-gray-100 bg-white lg:flex flex-col h-full z-10 min-w-0",
                          activeTabMobile === 'summary' ? "flex w-full" : "hidden"
                        )}>
                            <div className="p-3 border-b border-gray-100 flex items-center justify-center bg-gray-50/30 shrink-0">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-100 shadow-sm">
                                    <ListChecks className="h-3.5 w-3.5 text-amber-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">Drop Summary</span>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-hidden bg-gray-50/20">
                                <VaultOverviewCollectionSessionList 
                                    entries={entries}
                                    onRemove={handleRemoveEntry}
                                    totalLabel="Total Counted"
                                    onSelect={setSelectedMachineId}
                                    selectedMachineId={selectedMachineId}
                                    containerClassName="w-full border-l-0 shadow-none min-w-0"
                                />
                            </div>
                        </div>

                        {/* Mobile Bottom Navigation Bar */}
                        <div className="lg:hidden flex border-t border-gray-100 bg-white px-2 py-3 gap-2 z-30">
                          <Button 
                            variant={activeTabMobile === 'selector' ? 'secondary' : 'ghost'}
                            className={cn(
                              "flex-1 flex-col h-auto py-2 gap-1 rounded-xl transition-all",
                              activeTabMobile === 'selector' ? "bg-amber-50 text-amber-600 border-amber-100" : "text-gray-400"
                            )}
                            onClick={() => setActiveTabMobile('selector')}
                          >
                            <Monitor className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Machines</span>
                          </Button>
                          <Button 
                            variant={activeTabMobile === 'form' ? 'secondary' : 'ghost'}
                            className={cn(
                              "flex-1 flex-col h-auto py-2 gap-1 rounded-xl transition-all",
                              activeTabMobile === 'form' ? "bg-amber-50 text-amber-600 border-amber-100" : "text-gray-400"
                            )}
                            onClick={() => setActiveTabMobile('form')}
                          >
                            <Coins className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Counts</span>
                          </Button>
                          <Button 
                            variant={activeTabMobile === 'summary' ? 'secondary' : 'ghost'}
                            className={cn(
                              "flex-1 flex-col h-auto py-2 gap-1 rounded-xl transition-all",
                              activeTabMobile === 'summary' ? "bg-amber-50 text-amber-600 border-amber-100" : "text-gray-400"
                            )}
                            onClick={() => setActiveTabMobile('summary')}
                          >
                            <ListChecks className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Review</span>
                          </Button>
                        </div>
                        </>
                        )}
                    </div>
                </>
            )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Soft Count?</AlertDialogTitle>
            <AlertDialogDescription>
              {hasNoMachines 
                ? 'This location has no machines. Finalizing will mark the soft count as complete so you can proceed with closing the vault.'
                : `Are you sure you want to finalize soft count removals for ${entries.length} machines? This will record the transactions and update the vault balance.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeFinalize} disabled={loading} className="bg-amber-600 hover:bg-amber-700">
              Confirm & Finalize
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <VaultAuthenticatorModal
        open={showAuthenticator}
        onClose={() => setShowAuthenticator(false)}
        onVerified={handleAuthVerified}
        actionName="Finalize Soft Count"
      />
    </>
  );
}
