/**
 * Vault Overview Collection Entry Form Component
 *
 * Middle panel for entering meter readings and physical counts.
 * Includes variance tracking and integrated history view.
 *
 * @module components/VAULT/overview/modals/wizard/VaultOverviewCollectionEntryForm
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { fetchCabinetById } from '@/lib/helpers/cabinets';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useVaultLicencee } from '@/lib/hooks/vault/useVaultLicencee';
import { cn } from '@/lib/utils';
import { getDenominationValues } from '@/lib/utils/vault/denominations';
import type { GamingMachine } from '@/shared/types/entities';
import type {
  Denomination,
  MachineCollectionActivity,
} from '@/shared/types/vault';
import {
  AlertCircle,
  Coins,
  History as HistoryIcon,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Save,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type VaultOverviewCollectionEntryFormProps = {
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
  history?: MachineCollectionActivity[];
  historyLoading?: boolean;
  defaultShowHistory?: boolean;
}

export default function VaultOverviewCollectionEntryForm({
  machine,
  onSave,
  loading,
  history = [],
  historyLoading = false,
  defaultShowHistory = false,
}: VaultOverviewCollectionEntryFormProps) {
  const { formatAmount } = useCurrencyFormat();
  const { licenceeId: selectedLicencee } = useVaultLicencee();

  // ============================================================================
  // State & Hooks
  // ============================================================================
  const [meters, setMeters] = useState({
    billIn: '',
    ticketIn: '',
    totalIn: '',
    moneyIn: 0,
    moneyOut: 0,
    gross: 0,
  });
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [denominations, setDenominations] = useState<Denomination[]>([]);
  const [touchedDenominations, setTouchedDenominations] = useState<Set<number>>(
    new Set()
  );
  const [notes, setNotes] = useState('');
  const [expectedDrop, setExpectedDrop] = useState<string>('');
  const [showHistory, setShowHistory] = useState(defaultShowHistory);

  const denomsList = useMemo(
    () => getDenominationValues(selectedLicencee),
    [selectedLicencee]
  );

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    setDenominations(
      denomsList.map((value: string | number) => ({
        denomination: Number(value) as Denomination['denomination'],
        quantity: 0,
      }))
    );
  }, [denomsList]);

  useEffect(() => {
    // Reset form when machine changes
    setMeters({
      billIn: '',
      ticketIn: '',
      totalIn: '',
      moneyIn: 0,
      moneyOut: 0,
      gross: 0,
    });
    setDenominations(
      denomsList.map((value: string | number) => ({
        denomination: Number(value) as Denomination['denomination'],
        quantity: 0,
      }))
    );
    setTouchedDenominations(new Set());
    setNotes('');
    setExpectedDrop('');
    setShowHistory(defaultShowHistory);

    if (machine?._id) {
      fetchMachineDetails(machine._id);
    }
  }, [machine?._id, denomsList, defaultShowHistory]);

  // ============================================================================
  // Computed
  // ============================================================================
  const totalPhysical = denominations.reduce(
    (acc: number, curr: Denomination) =>
      acc + curr.denomination * curr.quantity,
    0
  );
  const variance = totalPhysical - (parseFloat(expectedDrop) || 0);
  const totalPhysicalStr = formatAmount(totalPhysical);
  const varianceStr = expectedDrop
    ? (variance > 0 ? '+' : '') + formatAmount(variance)
    : '--';

  // ============================================================================
  // Handlers
  // ============================================================================
  const fetchMachineDetails = async (id: string) => {
    setFetchingDetails(true);
    try {
      const details = await fetchCabinetById(id, 'Today');
      if (details) {
        setMeters({
          moneyIn: details.moneyIn || 0,
          moneyOut: details.moneyOut || 0,
          gross: details.gross || 0,
          billIn: (
            details.billMeters?.totalBills ??
            details.collectionMeters?.billIn ??
            ''
          ).toString(),
          ticketIn: (details.collectionMeters?.ticketIn ?? '').toString(),
          totalIn: (details.collectionMeters?.totalIn ?? '').toString(),
        });

        if (details.moneyIn !== undefined) {
          setExpectedDrop(details.moneyIn.toString());
        }
      }
    } catch (error) {
      console.error('Failed to fetch machine details', error);
      toast.error('Could not load latest meter data');
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

  const isAllTouched = denomsList.every((value: string | number) =>
    touchedDenominations.has(Number(value))
  );
  const isValidCount = totalPhysical > 0 || isAllTouched;

  const getDynamicFontSize = (
    text: string,
    base: string,
    med: string,
    small: string
  ) => {
    if (text.length > 15) return small;
    if (text.length > 12) return med;
    return base;
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 p-5 pb-4 md:p-8 md:pb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 text-gray-400 shadow-sm md:h-12 md:w-12">
              <Coins className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="mb-1 truncate text-lg font-black leading-none tracking-tight text-gray-900 md:mb-2 md:text-xl">
                {machine.custom?.name ||
                  machine.assetNumber ||
                  'Unknown Machine'}
              </h2>
              <div className="flex items-center gap-2">
                <span className="truncate rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-tighter text-gray-400 md:text-[10px]">
                  {machine.assetNumber || machine.serialNumber}
                </span>
                <span className="truncate text-[9px] font-black uppercase tracking-widest text-gray-300 md:text-[10px]">
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
              'h-9 gap-2 whitespace-nowrap rounded-xl border-gray-100 px-3 font-bold transition-all',
              showHistory
                ? 'border-violet-100 bg-violet-50 text-violet-600'
                : 'text-gray-500 hover:border-violet-100 hover:text-violet-600'
            )}
          >
            {showHistory ? (
              <Coins className="h-3.5 w-3.5" />
            ) : (
              <HistoryIcon className="h-3.5 w-3.5" />
            )}
            <span className="text-xs">
              {showHistory ? 'Back to Form' : 'View History'}
            </span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {showHistory ? (
          <div className="p-6 duration-300 animate-in fade-in slide-in-from-right-4">
            <div className="mb-6 flex gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <h4 className="mb-1 text-xs font-black uppercase tracking-tight text-amber-900">
                  Why check history?
                </h4>
                <p className="text-[11px] font-medium leading-relaxed text-amber-700">
                  Comparing current counts with past records helps spot
                  anomalies like bill acceptor failures or cash discrepancies
                  before final submission.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="mb-2 h-8 w-8 animate-spin text-violet-500" />
                  <p className="text-xs font-bold uppercase text-gray-400">
                    Fetching records...
                  </p>
                </div>
              ) : history.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50/50 py-20 text-center">
                  <HistoryIcon className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                  <p className="text-xs font-bold text-gray-400">
                    No previous collections found
                  </p>
                  <p className="mt-1 text-[10px] text-gray-300">
                    History will appear after the first collection.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {history.map((record: MachineCollectionActivity) => (
                    <div
                      key={record._id}
                      className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                    >
                      <div>
                        <p className="mb-0.5 text-[10px] font-black uppercase tracking-tight text-gray-400">
                          {new Date(record.timestamp).toLocaleDateString()}
                        </p>
                        <p className="text-sm font-black text-gray-900">
                          {formatAmount(record.amount)}
                        </p>
                      </div>
                      <div className="text-right">
                        {record.variance !== undefined && (
                          <p
                            className={cn(
                              'whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-tighter',
                              record.variance === 0
                                ? 'bg-emerald-50 text-emerald-600'
                                : record.variance > 0
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-red-50 text-red-600'
                            )}
                          >
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
          <div className="space-y-8 p-6 duration-300 animate-in fade-in slide-in-from-left-4">
            {/* Section 1: Session Metrics (Verification) */}
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-900">
                  <RefreshCw
                    className={cn(
                      'h-4 w-4 text-blue-500',
                      fetchingDetails && 'animate-spin'
                    )}
                  />
                  Session Metrics (Today)
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => fetchMachineDetails(machine._id)}
                >
                  Refresh
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="min-w-0 space-y-1">
                  <div className="text-[10px] font-bold uppercase text-gray-400">
                    Money In
                  </div>
                  <div className="flex h-10 items-center truncate rounded-lg border border-gray-100 bg-gray-50 px-3 font-mono text-xs font-bold text-gray-700">
                    {formatAmount(meters.moneyIn || 0)}
                  </div>
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="text-[10px] font-bold uppercase text-gray-400">
                    Money Out
                  </div>
                  <div className="flex h-10 items-center truncate rounded-lg border border-gray-100 bg-gray-50 px-3 font-mono text-xs font-bold text-gray-700">
                    {formatAmount(meters.moneyOut || 0)}
                  </div>
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="text-[10px] font-bold uppercase text-gray-400">
                    Gross
                  </div>
                  <div
                    className={cn(
                      'flex h-10 items-center truncate rounded-lg border px-3 font-mono text-xs font-bold',
                      (meters.gross || 0) >= 0
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                        : 'border-red-100 bg-red-50 text-red-700'
                    )}
                  >
                    {formatAmount(meters.gross || 0)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-2">
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <label className="text-xs font-medium text-gray-500">
                      Bill In Meter
                    </label>
                  </div>
                  <Input
                    type="number"
                    className="border-gray-200 bg-gray-50 font-mono text-sm"
                    placeholder="0.00"
                    value={meters.billIn}
                    onChange={e =>
                      setMeters({ ...meters, billIn: e.target.value })
                    }
                  />
                </div>
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <label className="text-xs font-medium text-gray-500">
                      Expected Drop
                    </label>
                  </div>
                  <Input
                    type="number"
                    className="border-blue-100 bg-blue-50/50 font-mono text-sm text-blue-700"
                    placeholder="0.00"
                    value={expectedDrop}
                    onChange={e => setExpectedDrop(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Physical Count */}
            <div className="space-y-6 rounded-3xl border border-gray-100 bg-gray-50/30 p-5 md:p-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  <Coins className="h-4 w-4 text-emerald-500" />
                  Physical Count
                </h3>
                <div className="min-w-0 sm:text-right">
                  <span
                    className={cn(
                      'block font-black leading-none tracking-tighter text-gray-900 transition-all',
                      getDynamicFontSize(
                        totalPhysicalStr,
                        'text-4xl',
                        'text-3xl',
                        'text-2xl'
                      )
                    )}
                  >
                    {totalPhysicalStr}
                  </span>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Physical total
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
                {denominations.map((denom, index) => (
                  <div
                    key={denom.denomination}
                    className={cn(
                      'group relative rounded-2xl border p-3 transition-all md:p-4',
                      denom.quantity > 0
                        ? 'border-emerald-200 bg-white shadow-md shadow-emerald-500/5 ring-1 ring-emerald-100'
                        : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <span
                        className={cn(
                          'rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase leading-none tracking-widest',
                          denom.quantity > 0
                            ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                            : 'border-gray-100 bg-gray-50 text-gray-400'
                        )}
                      >
                        ${denom.denomination}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 rounded-lg border border-gray-100 bg-gray-50 p-0.5 shadow-inner">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md text-gray-400 transition-all hover:bg-white hover:text-red-500"
                        onClick={() =>
                          updateQuantity(index, (denom.quantity || 0) - 1)
                        }
                        disabled={!denom.quantity}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <Input
                        className={cn(
                          'h-8 border-none bg-transparent p-0 text-center text-sm font-black text-gray-900 transition-all focus-visible:ring-0',
                          touchedDenominations.has(
                            Number(denom.denomination)
                          ) && 'text-emerald-600'
                        )}
                        value={denom.quantity || ''}
                        placeholder="0"
                        onChange={e =>
                          updateQuantity(index, parseInt(e.target.value) || 0)
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md text-gray-400 transition-all hover:bg-white hover:text-emerald-500"
                        onClick={() =>
                          updateQuantity(index, (denom.quantity || 0) + 1)
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Variance & Notes */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Variance Card */}
              <div
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-3xl border p-6 transition-all',
                  !expectedDrop
                    ? 'border-gray-100 bg-gray-50'
                    : variance === 0
                      ? 'border-emerald-100 bg-emerald-50'
                      : 'border-amber-100 bg-amber-50'
                )}
              >
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Variance
                </p>
                <div
                  className={cn(
                    'w-full whitespace-nowrap text-center font-black leading-none tracking-tighter transition-all',
                    !expectedDrop
                      ? 'text-gray-200'
                      : variance === 0
                        ? 'text-emerald-600'
                        : variance > 0
                          ? 'text-emerald-600'
                          : 'text-red-500',
                    getDynamicFontSize(
                      varianceStr,
                      'text-3xl',
                      'text-2xl',
                      'text-xl'
                    )
                  )}
                >
                  {varianceStr}
                </div>

                {expectedDrop && variance !== 0 && (
                  <div className="mt-3 flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-100 bg-white px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-600 shadow-sm">
                    <AlertCircle className="h-3 w-3" />
                    {variance > 0 ? 'Surplus' : 'Shortage'}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="lg:col-span-2">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Collection Notes (Optional)
                </label>
                <textarea
                  className="h-[100px] w-full resize-none rounded-3xl border-gray-100 bg-gray-50/50 p-4 text-[13px] font-medium shadow-inner transition-all placeholder:text-gray-300 focus:border-violet-500 focus:ring-violet-500"
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
      <div className="flex items-center justify-between border-t border-gray-100 bg-white px-5 py-4 md:px-8 md:py-6">
        <div className="xs:block hidden text-[10px] font-black uppercase tracking-widest text-gray-300">
          {totalPhysical > 0
            ? 'Review & add to session'
            : 'Entry pending counts'}
        </div>
        <Button
          onClick={() =>
            onSave({
              totalAmount: totalPhysical,
              denominations: denominations.filter(denom => denom.quantity > 0),
              meters: {
                billIn: parseFloat(meters.billIn) || 0,
                ticketIn: parseFloat(meters.ticketIn) || 0,
                totalIn: parseFloat(meters.totalIn) || 0,
              },
              variance,
              expectedDrop: parseFloat(expectedDrop) || 0,
              notes: notes.trim(),
            })
          }
          disabled={loading || !isValidCount || showHistory}
          className="h-11 flex-1 rounded-xl bg-violet-600 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-700 active:scale-[0.98] md:h-12 md:flex-none md:px-10"
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
