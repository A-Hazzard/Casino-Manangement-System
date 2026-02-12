/**
 * Vault Collection Wizard Modal
 *
 * A full-screen(ish) wizard for managing machine collections.
 * Coordinates the Session state, Machine Selection, Entry Form, and Session List.
 */
'use client';

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
import { useUserStore } from '@/lib/store/userStore';
import type { GamingMachine } from '@/shared/types/entities';
import { CheckCheck, LayoutGrid, Loader2 } from 'lucide-react';
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
  
  // -- State --
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  
  // Selection
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleFinalize = async () => {
    if (!sessionId || entries.length === 0) return;
    
    if (!confirm(`Are you sure you want to commit counts for ${entries.length} machines? This adds the cash to the vault and closes this collection batch.`)) {
        return;
    }

    setLoading(true);
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
            toast.success('Collection finalized successfully');
            onConfirm(); // Parent callback (e.g., triggers Close Shift)
            onClose();
        } else {
            toast.error(data.error || 'Failed to finalize batch');
        }
    } catch {
        toast.error('Network error finalizing batch');
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden flex flex-col bg-white">
        
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
                   onClick={handleFinalize} 
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
      </DialogContent>
    </Dialog>
  );
}
