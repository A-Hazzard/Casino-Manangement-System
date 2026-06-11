/**
 * Vault Overview Collection Wizard Modal Component
 *
 * A full-screen(ish) wizard for managing machine collections.
 * Coordinates the Session state, Machine Selection, Entry Form, and Session List.
 *
 * @module components/VAULT/overview/modals/VaultOverviewCollectionWizardModal
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
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import { cn } from '@/lib/utils';
import type { GamingMachine } from '@/shared/types/entities';
import type {
  CollectionSessionEntry,
  MachineCollectionActivity,
} from '@/shared/types/vault';
import {
  CheckCheck,
  CheckCircle2,
  Coins,
  History as HistoryIcon,
  LayoutGrid,
  ListChecks,
  Loader2,
  Monitor,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import VaultAuthenticatorModal from '../../shared/VaultAuthenticatorModal';

import VaultOverviewCollectionEntryForm from '@/components/VAULT/overview/modals/wizard/VaultOverviewCollectionEntryForm';
import VaultOverviewCollectionMachineHistory from '@/components/VAULT/overview/modals/wizard/VaultOverviewCollectionMachineHistory';
import VaultOverviewCollectionMachineSelector from '@/components/VAULT/overview/modals/wizard/VaultOverviewCollectionMachineSelector';
import VaultOverviewCollectionSessionList from '@/components/VAULT/overview/modals/wizard/VaultOverviewCollectionSessionList';

type VaultOverviewCollectionWizardModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void; // Triggered after successful session finalize
  machines: GamingMachine[];
  currentVaultShiftId?: string;
  currentLocationId?: string;
}

export default function VaultOverviewCollectionWizardModal({
  open,
  onClose,
  onConfirm,
  machines,
  currentVaultShiftId,
  currentLocationId,
}: VaultOverviewCollectionWizardModalProps) {
  const { user } = useUserStore();
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // State & Hooks
  // ============================================================================
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [entries, setEntries] = useState<CollectionSessionEntry[]>([]);

  // Selection
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState('');

  // Completion State
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalStats, setFinalStats] = useState({ count: 0, total: 0 });

  // Confirmation State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAuthenticator, setShowAuthenticator] = useState(false);

  // History State
  const [viewMode, setViewMode] = useState<'session' | 'history'>('session');
  const [history, setHistory] = useState<MachineCollectionActivity[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [forceShowHistoryOnce, setForceShowHistoryOnce] = useState(false);

  // ============================================================================
  // Computed
  // ============================================================================
  const selectedMachine = machines.find(machine => machine._id === selectedMachineId);
  const collectedMachineIds = entries.map(e => e.machineId);

  // Mobile UI States
  const [activeTabMobile, setActiveTabMobile] = useState<
    'selector' | 'form' | 'summary'
  >('selector');

  // ============================================================================
  // Effects
  // ============================================================================

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
      setViewMode('session');
      setHistory([]);
      setActiveTabMobile('selector');
      setForceShowHistoryOnce(false);
    }
  }, [open, currentLocationId, currentVaultShiftId]);

  // Fetch history when selection changes
  useEffect(() => {
    if (!selectedMachineId) {
      setHistory([]);
      if (viewMode === 'history') setViewMode('session');
      setForceShowHistoryOnce(false);
      return;
    }

    // Auto-switch to form view on mobile when a machine is selected
    setActiveTabMobile('form');

    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await fetch(
          `/api/vault/activity-log?type=machine_collection&machineId=${selectedMachineId}&limit=5`
        );
        const data = await res.json();
        if (data.success) {
          setHistory(data.activities || []);
        }
      } catch (error) {
        console.error('Failed to fetch machine history:', error);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
    // Auto-switch to history if a machine is selected? Option: setViewMode('history');
  }, [selectedMachineId]);

  const loadSession = async () => {
    setSessionLoading(true);
    try {
      // Fetch active session
      const res = await fetch(
        `/api/vault/collection-session?locationId=${currentLocationId}&vaultShiftId=${currentVaultShiftId}`
      );
      const data = await res.json();

      if (data.success && data.session) {
        setSessionId(data.session._id);
        setEntries(data.session.entries || []);
      } else {
        // No session? Start one automatically.
        await startSession();
      }
    } catch (err) {
      console.error('Failed to load session', err);
      toast.error('Failed to recover collection session');
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
          userId: user?._id,
        }),
      });
      const data = await res.json();

      if (data.success && data.session) {
        setSessionId(data.session._id);
        setEntries(data.session.entries || []);
      }
    } catch (err) {
      console.error('Failed to start session', err);
      toast.error('Could not initialize collection session');
    }
  };

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleAddEntry = async (
    entryData: Omit<
      CollectionSessionEntry,
      'machineId' | 'machineName' | 'collectedAt'
    >
  ) => {
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
          machineName:
            selectedMachine.custom?.name ||
            selectedMachine.assetNumber ||
            'Unknown Machine',
          collectedAt: new Date(),
        },
      };

      const res = await fetch('/api/vault/collection-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Collected $${entryData.totalAmount}`);
        setEntries(data.session.entries);
        // Auto-advance? Maybe clear selection
        setSelectedMachineId(null);
        setSearchTerm(''); // Clear search to show full list again

        // Go back to list or summary on mobile
        setActiveTabMobile('selector');
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
          machineId,
        }),
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
    setShowAuthenticator(true);
  };

  const handleAuthVerified = () => {
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
          userId: user?._id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Show success logic instead of closing immediately
        setFinalStats({
          count: entries.length,
          total:
            data.totalCollected ||
            entries.reduce(
              (acc: number, e: CollectionSessionEntry) => acc + e.totalAmount,
              0
            ),
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
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={val => !val && !isCompleted && onClose()}
      >
        <DialogContent
          className="!z-[200] flex h-[100dvh] w-full max-w-full flex-col overflow-hidden border-none bg-white p-0 shadow-2xl md:h-[95vh] md:max-w-[98vw] md:rounded-3xl"
          backdropClassName="bg-black/90 backdrop-blur-md !z-[190]"
        >
          {/* SUCCESS VIEW */}
          {isCompleted ? (
            <div className="flex flex-1 flex-col items-center justify-center bg-gray-50/50 p-6 duration-300 animate-in fade-in zoom-in-95 md:p-10">
              <div className="flex w-full max-w-md flex-col items-center rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-xl md:p-10">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 shadow-sm md:h-24 md:w-24">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 md:h-12 md:w-12" />
                </div>

                <h2 className="mb-2 text-2xl font-black text-gray-900">
                  Collection Complete!
                </h2>
                <p className="mb-8 px-4 text-sm text-gray-500">
                  The collection batch has been successfully committed to the
                  vault.
                </p>

                <div className="mb-8 w-full rounded-xl border border-gray-100 bg-gray-50 p-6">
                  <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
                    <span className="text-xs font-medium text-gray-500">
                      Machines
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {finalStats.count}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-medium text-gray-500">
                      Total Collected
                    </span>
                    <span className="text-2xl font-black text-emerald-600">
                      {formatAmount(finalStats.total)}
                    </span>
                  </div>
                </div>

                <Button
                  size="lg"
                  onClick={handleSuccessClose}
                  className="h-12 w-full bg-violet-600 text-base font-bold text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
                >
                  Success - Continue
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <DialogHeader className="z-20 flex flex-row items-center justify-between space-y-0 border-b border-gray-100 bg-white px-6 py-4 md:px-8 md:py-5">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 shadow-sm md:h-10 md:w-10">
                    <LayoutGrid className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="truncate text-lg font-black leading-none tracking-tight text-gray-900 md:text-xl">
                      Machine Collection
                    </DialogTitle>
                    <p className="mt-1 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-gray-400 md:text-[11px]">
                      <span className="xs:inline hidden">Session:</span>{' '}
                      <span className="font-mono tracking-tighter text-violet-500">
                        {sessionId ? sessionId.substring(0, 8) : '...'}
                      </span>
                      {sessionLoading && (
                        <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-xs font-bold tracking-tight text-gray-400 hover:text-gray-600 md:text-sm"
                  >
                    <X className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="xs:inline hidden">Cancel</span>
                  </Button>
                  <Button
                    onClick={handleFinalizeClick}
                    disabled={loading || entries.length === 0}
                    className="h-9 rounded-lg bg-violet-500 px-3 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-600 active:scale-[0.98] md:h-11 md:rounded-xl md:px-6 md:text-sm"
                  >
                    {loading ? (
                      <Loader2 className="h-3 w-3 animate-spin md:h-4 md:w-4" />
                    ) : (
                      <CheckCheck className="mr-1 h-3 w-3 md:mr-2 md:h-4 md:w-4" />
                    )}
                    <span className="hidden sm:inline">Finish Collection</span>
                    <span className="ml-1 font-black sm:inline">
                      ({entries.length})
                    </span>
                  </Button>
                </div>
              </DialogHeader>

              {/* Responsive Panels Layout */}
              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white lg:flex-row">
                {/* Left: Machine Selector - Hidden on mobile unless active */}
                <div
                  className={cn(
                    'h-full min-w-0 flex-col lg:flex lg:w-1/4',
                    activeTabMobile === 'selector' ? 'flex w-full' : 'hidden'
                  )}
                >
                  {/* Mobile Progress Header */}
                  <div className="flex shrink-0 items-center justify-between bg-violet-600 p-4 text-white lg:hidden">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-4 w-4" />
                      <span className="text-xs font-black uppercase tracking-widest">
                        {entries.length} Machines Collected
                      </span>
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
                    collectedMachineIds={collectedMachineIds}
                    onSelect={id => {
                      setSelectedMachineId(id);
                      setForceShowHistoryOnce(false);
                    }}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onViewHistory={id => {
                      setSelectedMachineId(id);
                      setForceShowHistoryOnce(true);
                      setViewMode('history');
                      setActiveTabMobile('form');
                    }}
                  />
                </div>

                {/* Middle: Entry Form - Hidden on mobile unless active */}
                <div
                  className={cn(
                    'relative h-full min-w-0 flex-1 flex-col bg-white lg:flex',
                    activeTabMobile === 'form' ? 'flex w-full' : 'hidden'
                  )}
                >
                  {selectedMachine ? (
                    <VaultOverviewCollectionEntryForm
                      machine={selectedMachine}
                      onSave={handleAddEntry}
                      loading={loading}
                      history={history}
                      historyLoading={historyLoading}
                      defaultShowHistory={forceShowHistoryOnce}
                    />
                  ) : (
                    <div className="flex h-full flex-1 flex-col items-center justify-center p-10 text-center duration-500 animate-in fade-in slide-in-from-bottom-4">
                      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-gray-100 bg-gray-50 shadow-sm md:h-24 md:w-24">
                        <LayoutGrid className="h-8 w-8 text-gray-200 md:h-10 md:w-10" />
                      </div>
                      <h3 className="mb-2 text-lg font-black tracking-tight text-gray-800 md:text-xl">
                        No Machine Selected
                      </h3>
                      <p className="max-w-[280px] text-xs font-medium leading-relaxed text-gray-400 md:text-sm">
                        Select a machine from the machine list to begin entering
                        collection data.
                      </p>
                      <Button
                        variant="outline"
                        className="mt-6 rounded-xl border-violet-100 font-bold text-violet-600 lg:hidden"
                        onClick={() => setActiveTabMobile('selector')}
                      >
                        Go to Machine List
                      </Button>
                    </div>
                  )}
                </div>

                {/* Right: Session List / Summary - Hidden on mobile unless active */}
                <div
                  className={cn(
                    'z-10 h-full min-w-0 flex-col bg-white lg:flex lg:w-1/4 lg:min-w-[320px] lg:border-l lg:border-gray-100',
                    activeTabMobile === 'summary' ? 'flex w-full' : 'hidden'
                  )}
                >
                  <div className="flex shrink-0 items-center justify-center gap-2 border-b border-gray-100 bg-gray-50/30 p-3">
                    <Button
                      variant={viewMode === 'session' ? 'secondary' : 'ghost'}
                      size="sm"
                      className={cn(
                        'h-9 flex-1 gap-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                        viewMode === 'session'
                          ? 'border border-gray-100 bg-white text-violet-600 shadow-sm'
                          : 'text-gray-400'
                      )}
                      onClick={() => setViewMode('session')}
                    >
                      <ListChecks className="h-3.5 w-3.5" />
                      Batch List
                    </Button>
                    <Button
                      variant={viewMode === 'history' ? 'secondary' : 'ghost'}
                      size="sm"
                      className={cn(
                        'h-9 flex-1 gap-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                        viewMode === 'history'
                          ? 'border border-gray-100 bg-white text-violet-600 shadow-sm'
                          : 'text-gray-400'
                      )}
                      onClick={() => setViewMode('history')}
                    >
                      <HistoryIcon className="h-3.5 w-3.5" />
                      History
                    </Button>
                  </div>

                  <div className="flex-1 overflow-hidden bg-gray-50/20">
                    {viewMode === 'session' ? (
                      <VaultOverviewCollectionSessionList
                        entries={entries}
                        onRemove={handleRemoveEntry}
                        onSelect={setSelectedMachineId}
                        selectedMachineId={selectedMachineId}
                        containerClassName="w-full border-l-0 shadow-none min-w-0"
                      />
                    ) : (
                      <VaultOverviewCollectionMachineHistory
                        history={history}
                        loading={historyLoading}
                        machineName={
                          selectedMachine?.custom?.name ||
                          selectedMachine?.assetNumber ||
                          'Machine'
                        }
                        containerClassName="w-full border-l-0 shadow-none min-w-0"
                      />
                    )}
                  </div>
                </div>

                {/* Mobile Bottom Navigation Bar */}
                <div className="z-30 flex gap-2 border-t border-gray-100 bg-white px-2 py-3 lg:hidden">
                  <Button
                    variant={
                      activeTabMobile === 'selector' ? 'secondary' : 'ghost'
                    }
                    className={cn(
                      'h-auto flex-1 flex-col gap-1 rounded-xl py-2 transition-all',
                      activeTabMobile === 'selector'
                        ? 'border-violet-100 bg-violet-50 text-violet-600'
                        : 'text-gray-400'
                    )}
                    onClick={() => setActiveTabMobile('selector')}
                  >
                    <Monitor className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Machines
                    </span>
                  </Button>
                  <Button
                    variant={activeTabMobile === 'form' ? 'secondary' : 'ghost'}
                    className={cn(
                      'h-auto flex-1 flex-col gap-1 rounded-xl py-2 transition-all',
                      activeTabMobile === 'form'
                        ? 'border-violet-100 bg-violet-50 text-violet-600'
                        : 'text-gray-400'
                    )}
                    onClick={() => setActiveTabMobile('form')}
                  >
                    <Coins className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Counts
                    </span>
                  </Button>
                  <Button
                    variant={
                      activeTabMobile === 'summary' ? 'secondary' : 'ghost'
                    }
                    className={cn(
                      'h-auto flex-1 flex-col gap-1 rounded-xl py-2 transition-all',
                      activeTabMobile === 'summary'
                        ? 'border-violet-100 bg-violet-50 text-violet-600'
                        : 'text-gray-400'
                    )}
                    onClick={() => setActiveTabMobile('summary')}
                  >
                    <ListChecks className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Review
                    </span>
                  </Button>
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
            <AlertDialogTitle>Finish Collection?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to commit counts for {entries.length}{' '}
              machines? This adds the cash to the vault and closes this
              collection batch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeFinalize}
              disabled={loading}
              className="bg-violet-600 hover:bg-violet-700"
            >
              Confirm & Finish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <VaultAuthenticatorModal
        open={showAuthenticator}
        onClose={() => setShowAuthenticator(false)}
        onVerified={handleAuthVerified}
        actionName="Finalize Machine Collection"
      />
    </>
  );
}
