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
import type {
  CollectionSessionEntry,
  Denomination,
} from '@/shared/types/vault';
import {
  CheckCheck,
  CheckCircle2,
  Coins,
  LayoutGrid,
  ListChecks,
  Loader2,
  Monitor,
  X,
} from 'lucide-react';
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
  isEndOfDay = false,
}: VaultOverviewSoftCountModalProps) {
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

  // Mobile UI States
  const [activeTabMobile, setActiveTabMobile] = useState<
    'selector' | 'form' | 'summary'
  >('selector');

  // ============================================================================
  // Computed
  // ============================================================================
  const selectedMachine = machines.find(m => m._id === selectedMachineId);
  const completedMachineIds = entries.map(e => e.machineId);

  // ============================================================================
  // Effects
  // ============================================================================
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
      const res = await fetch(
        `/api/vault/collection-session?locationId=${currentLocationId}&vaultShiftId=${currentVaultShiftId}&type=soft_count&isEndOfDay=${isEndOfDay}`
      );
      const data = await res.json();

      if (data.success && data.session) {
        setSessionId(data.session._id);
        setEntries(data.session.entries || []);

        // If already completed, show success view
        if (data.session.status === 'completed') {
          setFinalStats({
            count: data.session.entries?.length || 0,
            total: data.session.totalCollected || 0,
          });
          setIsCompleted(true);
        }
      } else {
        await startSession();
      }
    } catch (err) {
      console.error('Failed to load soft count session', err);
      toast.error('Failed to recover session');
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
          userId: user?._id,
        }),
      });
      const data = await res.json();

      if (data.success && data.session) {
        setSessionId(data.session._id);
        setEntries(data.session.entries || []);
      }
    } catch (err) {
      console.error('Failed to start soft count session', err);
    }
  };

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleAddEntry = async (formData: {
    amount: number;
    denominations: Denomination[];
    notes?: string;
    meters?: { billIn: number; ticketIn: number; totalIn: number };
    expectedDrop: number;
    variance: number;
    isEndOfDay: boolean;
  }) => {
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
          machineName:
            selectedMachine.custom?.name ||
            selectedMachine.assetNumber ||
            'Unknown Machine',
          totalAmount: formData.amount,
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
          type: 'soft_count',
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
          userId: user?._id,
        }),
      });

      const data = await res.json();
      if (data.success) {
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
          className={cn(
            '!z-[200] flex h-[100dvh] w-full max-w-full flex-col overflow-hidden border-none p-0 shadow-2xl transition-colors duration-500 md:h-[95vh] md:max-w-[98vw] md:rounded-3xl',
            isCompleted ? 'bg-black/40 backdrop-blur-sm' : 'bg-white'
          )}
          backdropClassName="bg-black/90 backdrop-blur-md !z-[190]"
        >
          {/* SUCCESS VIEW */}
          {isCompleted ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 duration-500 animate-in fade-in zoom-in-95 md:p-10">
              <div className="flex w-full max-w-sm flex-col items-center rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-2xl md:p-10">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 shadow-sm md:h-24 md:w-24">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 md:h-12 md:w-12" />
                </div>

                <h2 className="mb-2 text-2xl font-black text-gray-900">
                  {isEndOfDay
                    ? 'Soft Count Finalized For Today!'
                    : 'Soft Count Complete!'}
                </h2>
                <p className="mb-8 px-4 text-xs leading-relaxed text-gray-500">
                  {isEndOfDay
                    ? "All machines for today's closure have been processed and added to the vault."
                    : 'The mid-day collection has been successfully processed and added to the vault balance.'}
                </p>

                <div className="mb-8 w-full rounded-xl border border-gray-100 bg-gray-50 p-6">
                  <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
                    <span className="text-xs font-medium text-gray-500">
                      Machines Counted
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {finalStats.count}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-medium text-gray-500">
                      Total Removed
                    </span>
                    <span className="text-2xl font-black text-amber-600">
                      {formatAmount(finalStats.total)}
                    </span>
                  </div>
                </div>

                <Button
                  size="lg"
                  onClick={handleSuccessClose}
                  className="h-12 w-full bg-violet-600 text-base font-bold text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <DialogHeader className="z-20 flex flex-row items-center justify-between space-y-0 border-b border-gray-100 bg-white px-6 py-4 md:px-8 md:py-5">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shadow-sm md:h-10 md:w-10">
                    <LayoutGrid className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="truncate text-lg font-black leading-none tracking-tight text-gray-900 md:text-xl">
                      Soft Count Entry
                    </DialogTitle>
                    <p className="mt-1 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-gray-400 md:text-[11px]">
                      <span className="xs:inline hidden">
                        Mid-Day Cash Drop
                      </span>
                      {sessionId && (
                        <span className="truncate font-mono tracking-tighter text-violet-500">
                          Session: {sessionId.substring(0, 8)}
                        </span>
                      )}
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
                    className="flex items-center gap-1.5 text-xs font-bold tracking-tight text-gray-400 hover:text-gray-600 md:text-sm"
                  >
                    <X className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="xs:inline hidden">Cancel</span>
                  </Button>
                  <Button
                    onClick={handleFinalizeClick}
                    disabled={
                      loading || (entries.length === 0 && !hasNoMachines)
                    }
                    className="h-9 rounded-lg bg-amber-500 px-3 text-xs font-bold text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600 active:scale-[0.98] md:h-11 md:rounded-xl md:px-6 md:text-sm"
                  >
                    {loading ? (
                      <Loader2 className="h-3 w-3 animate-spin md:h-4 md:w-4" />
                    ) : (
                      <CheckCheck className="mr-1 h-3 w-3 md:mr-2 md:h-4 md:w-4" />
                    )}
                    <span className="hidden sm:inline">Finalize Session</span>
                    <span className="ml-1 font-black sm:inline">
                      ({entries.length})
                    </span>
                  </Button>
                </div>
              </DialogHeader>

              {/* Responsive Panels Layout */}
              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white lg:flex-row">
                {/* No Machines Empty State */}
                {hasNoMachines ? (
                  <div className="flex flex-1 flex-col items-center justify-center p-10 text-center duration-500 animate-in fade-in slide-in-from-bottom-4">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-100 bg-amber-50 shadow-sm md:h-24 md:w-24">
                      <Monitor className="h-8 w-8 text-amber-300 md:h-10 md:w-10" />
                    </div>
                    <h3 className="mb-2 text-lg font-black tracking-tight text-gray-800 md:text-xl">
                      No Machines at This Location
                    </h3>
                    <p className="mb-6 max-w-[320px] text-xs font-medium leading-relaxed text-gray-400 md:text-sm">
                      This location has no machines to count. You can finalize
                      the session immediately to proceed with closing the vault.
                    </p>
                    <Button
                      onClick={handleFinalizeClick}
                      disabled={loading || !sessionId}
                      className="h-12 rounded-xl bg-amber-500 px-8 text-sm font-bold text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600 active:scale-[0.98]"
                    >
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCheck className="mr-2 h-4 w-4" />
                      )}
                      Finalize Session
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Left: Machine Selector - Hidden on mobile unless active */}
                    <div
                      className={cn(
                        'h-full min-w-0 flex-col lg:flex lg:w-1/4',
                        activeTabMobile === 'selector'
                          ? 'flex w-full'
                          : 'hidden'
                      )}
                    >
                      {/* Mobile Progress Header */}
                      <div className="flex shrink-0 items-center justify-between bg-amber-600 p-4 text-white lg:hidden">
                        <div className="flex items-center gap-2">
                          <ListChecks className="h-4 w-4" />
                          <span className="text-xs font-black uppercase tracking-widest">
                            {entries.length} Machines Counted
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
                        collectedMachineIds={completedMachineIds}
                        onSelect={setSelectedMachineId}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
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
                        <SoftCountForm
                          machine={selectedMachine}
                          onSubmit={handleAddEntry}
                          loading={loading}
                          isEndOfDayFixed={isEndOfDay}
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
                            Select a machine from the machine list to begin
                            entering soft count data.
                          </p>
                          <Button
                            variant="outline"
                            className="mt-6 rounded-xl border-amber-100 font-bold text-amber-600 lg:hidden"
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
                      <div className="flex shrink-0 items-center justify-center border-b border-gray-100 bg-gray-50/30 p-3">
                        <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-1.5 shadow-sm">
                          <ListChecks className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">
                            Drop Summary
                          </span>
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
                    <div className="z-30 flex gap-2 border-t border-gray-100 bg-white px-2 py-3 lg:hidden">
                      <Button
                        variant={
                          activeTabMobile === 'selector' ? 'secondary' : 'ghost'
                        }
                        className={cn(
                          'h-auto flex-1 flex-col gap-1 rounded-xl py-2 transition-all',
                          activeTabMobile === 'selector'
                            ? 'border-amber-100 bg-amber-50 text-amber-600'
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
                        variant={
                          activeTabMobile === 'form' ? 'secondary' : 'ghost'
                        }
                        className={cn(
                          'h-auto flex-1 flex-col gap-1 rounded-xl py-2 transition-all',
                          activeTabMobile === 'form'
                            ? 'border-amber-100 bg-amber-50 text-amber-600'
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
                            ? 'border-amber-100 bg-amber-50 text-amber-600'
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
                : `Are you sure you want to finalize soft count removals for ${entries.length} machines? This will record the transactions and update the vault balance.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeFinalize}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700"
            >
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
