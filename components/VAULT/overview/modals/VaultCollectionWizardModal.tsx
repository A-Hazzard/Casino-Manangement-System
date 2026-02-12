/**
 * Vault Collection Wizard Modal
 *
 * A full-screen(ish) wizard for managing machine collections.
 * Coordinates the Session state, Machine Selection, Entry Form, and Session List.
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
import VaultCollectionEntryForm from '@/components/VAULT/overview/modals/wizard/VaultCollectionEntryForm';
import VaultCollectionMachineSelector from '@/components/VAULT/overview/modals/wizard/VaultCollectionMachineSelector';
import VaultCollectionSessionList from '@/components/VAULT/overview/modals/wizard/VaultCollectionSessionList';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import type { GamingMachine } from '@/shared/types/entities';
import { CheckCheck, CheckCircle2, LayoutGrid, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface VaultCollectionWizardModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void; // Triggered after successful session finalize
  machines: GamingMachine[];
  currentVaultShiftId?: string;
  currentLocationId?: string;
}

export default function VaultCollectionWizardModal({
  open,
  onClose,
  onConfirm,
  machines,
  currentVaultShiftId,
  currentLocationId
}: VaultCollectionWizardModalProps) {
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
  const collectedMachineIds = entries.map(e => e.machineId);

  // -- Effects --
  
  // 1. Load or Start Session on Open
  useEffect(() => {
    if (open && currentLocationId && currentVaultShiftId) {
      loadSession();
    } else {
        // Reset if closed
        setSessionId(null);
        setEntries([]);
        setSelectedMachineId(null);
        setIsCompleted(false);
        setFinalStats({ count: 0, total: 0 });
        setShowConfirmModal(false);
    }
  }, [open, currentLocationId, currentVaultShiftId]);

  const loadSession = async () => {
    setSessionLoading(true);
    try {
        // Fetch active session
        const res = await fetch(`/api/vault/collection-session?locationId=${currentLocationId}&vaultShiftId=${currentVaultShiftId}`);
        const data = await res.json();
        
        if (data.success && data.session) {
            setSessionId(data.session._id);
            setEntries(data.session.entries || []);
        } else {
            // No session? Start one automatically.
            await startSession();
        }
    } catch (err) {
        console.error("Failed to load session", err);
        toast.error("Failed to recover collection session");
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
                userId: user?._id
            })
        });
        const data = await res.json();
        
        if (data.success && data.session) {
            setSessionId(data.session._id);
            setEntries(data.session.entries || []);
        }
    } catch (err) {
        console.error("Failed to start session", err);
        toast.error("Could not initialize collection session");
    }
  };

  // -- Handlers --

  const handleAddEntry = async (entryData: any) => {
    if (!sessionId || !selectedMachine) return;
    
    setLoading(true);
    try {
        const payload = {
            action: 'addEntry',
            sessionId,
            locationId: currentLocationId,
            vaultShiftId: currentVaultShiftId, 
            machineId: selectedMachineId, // Add this
            entryData: {
                ...entryData,
                machineId: selectedMachine._id,
                machineName: selectedMachine.custom?.name || selectedMachine.assetNumber || 'Unknown Machine',
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
            toast.success(`Collected $${entryData.totalAmount}`);
            setEntries(data.session.entries);
            // Auto-advance? Maybe clear selection
            setSelectedMachineId(null); 
            setSearchTerm(''); // Clear search to show full list again
        } else {
            toast.error(data.error || 'Failed to save entry');
        }
    } catch (err) {
        console.error(err);
        toast.error('Network error during save');
    } finally {
        setLoading(false);
    }
  };

  const handleRemoveEntry = async (machineId: string) => {
    if (!sessionId) return;
    
    // Optimistic update? No, let's differ for safety
    try {
        const res = await fetch('/api/vault/collection-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'removeEntry',
                sessionId,
                machineId
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
    // Optimistically close the confirm modal immediately or wait? 
    // Standard is to keep it or transition. Since we are moving to a success view, let's just close confirm.
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
            // Show success logic instead of closing immediately
            setFinalStats({
                count: entries.length,
                total: data.totalCollected || entries.reduce((acc: any, e: any) => acc + e.totalAmount, 0)
            });
            setIsCompleted(true);
            toast.success('Collection finalized successfully');
        } else {
            toast.error(data.error || 'Failed to finalize batch');
        }
    } catch {
        toast.error('Network error finalizing batch');
    } finally {
        setLoading(false);
    }
  };

  const handleSuccessClose = () => {
      onConfirm(); // Trigger parent refresh/next step
      onClose();   // Close modal
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => !val && !isCompleted && onClose()}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden flex flex-col bg-white">
          
          {/* SUCCESS VIEW */}
          {isCompleted ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 p-10 animate-in fade-in zoom-in-95 duration-300">
                  <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center max-w-md w-full text-center">
                      <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                      </div>
                      
                      <h2 className="text-2xl font-black text-gray-900 mb-2">Collection Complete!</h2>
                      <p className="text-gray-500 mb-8">
                          The collection batch has been successfully committed to the vault.
                      </p>
                      
                      <div className="w-full bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100">
                          <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                              <span className="text-gray-500 font-medium">Machines Processed</span>
                              <span className="text-gray-900 font-bold text-lg">{finalStats.count}</span>
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="text-gray-500 font-medium">Total Cash Collected</span>
                              <span className="text-emerald-600 font-black text-2xl">
                                  {formatAmount(finalStats.total)}
                              </span>
                          </div>
                      </div>

                      <Button 
                          size="lg" 
                          onClick={handleSuccessClose}
                          className="w-full h-12 text-base font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-200"
                      >
                          Success - Continue
                      </Button>
                  </div>
              </div>
          ) : (
              <>
                  {/* Header */}
                  <DialogHeader className="px-6 py-4 border-b border-gray-100 flex flex-row items-center justify-between space-y-0 bg-white z-20">
                      <div className="flex items-center gap-3">
                          <div className="bg-violet-100 p-2 rounded-lg text-violet-600">
                              <LayoutGrid className="h-5 w-5" />
                          </div>
                          <div>
                          <DialogTitle className="text-lg font-bold text-gray-900">Machine Collection</DialogTitle>
                          <p className="text-xs text-gray-500 font-medium mt-0.5">
                              Session ID: <span className="font-mono">{sessionId ? sessionId.substring(0,8) : '...'}</span>
                              {sessionLoading && <span className="ml-2 animate-pulse text-violet-500">Syncing...</span>}
                          </p>
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                          <Button variant="ghost" onClick={onClose} disabled={loading} className="text-gray-500">
                              Cancel
                          </Button>
                          <Button 
                          onClick={handleFinalizeClick} 
                          disabled={loading || entries.length === 0}
                          className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-200"
                          >
                              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
                              Finish Collection ({entries.length})
                          </Button>
                      </div>
                  </DialogHeader>

                  {/* 3-Column Layout */}
                  <div className="flex-1 flex min-h-0 bg-gray-50/50">
                      
                      {/* Left: Machine Selector */}
                      <VaultCollectionMachineSelector 
                          machines={machines}
                          selectedMachineId={selectedMachineId}
                          collectedMachineIds={collectedMachineIds}
                          onSelect={setSelectedMachineId}
                          searchTerm={searchTerm}
                          onSearchChange={setSearchTerm}
                      />

                      {/* Middle: Entry Form */}
                      <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200 bg-white relative">
                          {selectedMachine ? (
                              <VaultCollectionEntryForm 
                                  machine={selectedMachine}
                                  onSave={handleAddEntry}
                                  loading={loading}
                              />
                          ) : (
                              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-10 text-center">
                                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                      <LayoutGrid className="h-10 w-10 opacity-30" />
                                  </div>
                                  <h3 className="text-lg font-semibold text-gray-600 mb-1">No Machine Selected</h3>
                                  <p className="text-sm max-w-[280px]">
                                  Select a machine from the left list to begin entering collection data.
                                  </p>
                              </div>
                          )}
                      </div>

                      {/* Right: Session List */}
                      <VaultCollectionSessionList 
                          entries={entries}
                          onRemove={handleRemoveEntry}
                          // onEdit={(id) => setSelectedMachineId(id)} // Optional: Support editing
                      />

                  </div>
              </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish Collection?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to commit counts for {entries.length} machines? This adds the cash to the vault and closes this collection batch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeFinalize} disabled={loading} className="bg-violet-600 hover:bg-violet-700">
              Confirm & Finish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
