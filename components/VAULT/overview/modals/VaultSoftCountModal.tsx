/**
 * Vault Soft Count Modal (Wizard Style)
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
import VaultCollectionMachineSelector from '@/components/VAULT/overview/modals/wizard/VaultCollectionMachineSelector';
import VaultCollectionSessionList from '@/components/VAULT/overview/modals/wizard/VaultCollectionSessionList';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import type { GamingMachine } from '@/shared/types/entities';
import { CheckCheck, CheckCircle2, LayoutGrid, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface VaultSoftCountModalProps {
  open: boolean;
  onClose: () => void;
  machines: GamingMachine[];
  onConfirm: () => void;
  currentVaultShiftId?: string;
  currentLocationId?: string;
}

export default function VaultSoftCountModal({
  open,
  onClose,
  machines,
  onConfirm,
  currentVaultShiftId,
  currentLocationId
}: VaultSoftCountModalProps) {
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
     }
  }, [open, currentLocationId, currentVaultShiftId]);

  const loadSession = async () => {
    setSessionLoading(true);
    try {
        const res = await fetch(`/api/vault/collection-session?locationId=${currentLocationId}&vaultShiftId=${currentVaultShiftId}&type=soft_count`);
        const data = await res.json();
        
        if (data.success && data.session) {
            setSessionId(data.session._id);
            setEntries(data.session.entries || []);
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

  const handleFinalizeClick = () => {
    if (!sessionId || entries.length === 0) return;
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
            onConfirm();
        } else {
            toast.error(data.error || 'Failed to finalize session');
        }
    } catch {
        toast.error('Network error finalizing session');
    } finally {
        setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => !val && !isCompleted && onClose()}>
        <DialogContent className="max-w-[98vw] w-full h-[95vh] p-0 overflow-hidden flex flex-col bg-white border-none shadow-2xl rounded-3xl">
            
            {/* SUCCESS VIEW */}
            {isCompleted ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 p-10 animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center max-w-md w-full text-center">
                        <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                        </div>
                        
                        <h2 className="text-2xl font-black text-gray-900 mb-2">Soft Count Finalized!</h2>
                        <p className="text-gray-500 mb-8">
                            All recorded mid-day drops have been processed and removed from the vault balance.
                        </p>
                        
                        <div className="w-full bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100">
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                                <span className="text-gray-500 font-medium">Machines Counted</span>
                                <span className="text-gray-900 font-bold text-lg">{finalStats.count}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 font-medium">Total Removed</span>
                                <span className="text-amber-600 font-black text-2xl">
                                    {formatAmount(finalStats.total)}
                                </span>
                            </div>
                        </div>

                        <Button 
                            size="lg" 
                            onClick={onClose}
                            className="w-full h-12 text-base font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-200"
                        >
                            Done
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Header */}
                    <DialogHeader className="px-8 py-5 border-b border-gray-100 flex flex-row items-center justify-between space-y-0 bg-white z-20">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shadow-sm">
                                <LayoutGrid className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black text-gray-900 tracking-tight leading-none">Soft Count Entry</DialogTitle>
                                <p className="text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-widest flex items-center gap-4">
                                    <span>Mid-Day Cash Drop</span>
                                    {sessionId && (
                                        <span className="text-violet-500 font-mono tracking-tighter">Session: {sessionId.substring(0,8)}</span>
                                    )}
                                    {sessionLoading && <Loader2 className="h-3 w-3 animate-spin text-violet-400" />}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <Button 
                                variant="ghost" 
                                onClick={onClose} 
                                className="text-gray-400 hover:text-gray-600 font-bold text-sm tracking-tight"
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleFinalizeClick} 
                                disabled={loading || entries.length === 0}
                                className="h-11 px-6 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
                                Finalize Session ({entries.length})
                            </Button>
                        </div>
                    </DialogHeader>

                    {/* 3-Column Layout */}
                    <div className="flex-1 flex min-h-0 bg-white">
                        
                        {/* Left: Machine Selector */}
                        <VaultCollectionMachineSelector 
                            machines={machines}
                            selectedMachineId={selectedMachineId}
                            collectedMachineIds={completedMachineIds}
                            onSelect={setSelectedMachineId}
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                        />

                        {/* Middle: Entry Form */}
                        <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                            {selectedMachine ? (
                                <SoftCountForm 
                                    machine={selectedMachine}
                                    onSubmit={handleAddEntry}
                                    loading={loading}
                                />
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="w-24 h-24 bg-gray-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                                        <LayoutGrid className="h-10 w-10 text-gray-200" />
                                    </div>
                                    <h3 className="text-xl font-black text-gray-800 mb-2 tracking-tight">No Machine Selected</h3>
                                    <p className="text-gray-400 text-sm max-w-[320px] font-medium leading-relaxed">
                                    Select a machine from the left list to begin entering soft count data.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="w-1/4 min-w-[320px] border-l border-gray-100 bg-white flex flex-col h-full z-10">
                            <VaultCollectionSessionList 
                                entries={entries}
                                onRemove={handleRemoveEntry}
                                totalLabel="Total Counted"
                                containerClassName="w-full border-l-0 shadow-none min-w-0"
                            />
                        </div>
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
              Are you sure you want to finalize soft count removals for {entries.length} machines? This will record the transactions and update the vault balance.
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
    </>
  );
}
