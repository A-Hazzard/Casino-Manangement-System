/**
 * Soft Count Form Component
 *
 * Form for Vault Manager to record soft count cash removal from machines.
 * Designed to be used within the VaultOverviewSoftCountModal wizard.
 *
 * Features:
 * - Fetches live cabinet data (meters/expected drop) on mount/change
 * - Validates physical count against expected drop (variance)
 * - Records denomination breakdown
 *
 * @module components/VAULT/machine/SoftCountForm
 */

'use client';

import { FormEvent } from 'react';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { fetchCabinetById } from '@/lib/helpers/cabinets';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useVaultLicencee } from '@/lib/hooks/vault/useVaultLicencee';
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
  RefreshCw,
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
    isEndOfDay: boolean;
  }) => Promise<void>;
  loading?: boolean;
  isEndOfDayFixed?: boolean;
};

export default function SoftCountForm({
  machine,
  onSubmit,
  loading = false,
  isEndOfDayFixed,
}: SoftCountFormProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();
  const { licenceeId: selectedLicencee } = useVaultLicencee();

  const [notes, setNotes] = useState('');
  const [isEndOfDay, setIsEndOfDay] = useState(false);
  const [denominations, setDenominations] = useState<Denomination[]>([]);
  const [touchedDenominations, setTouchedDenominations] = useState<Set<number>>(
    new Set()
  );
  const [meters, setMeters] = useState({
    moneyIn: 0,
    moneyOut: 0,
    gross: 0,
    billIn: '',
  });
  const [expectedDrop, setExpectedDrop] = useState<string>('');
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const denomsList = useMemo(
    () => getDenominationValues(selectedLicencee),
    [selectedLicencee]
  );

  // ============================================================================
  // Effects
  // ============================================================================

  // Reset form when machine changes
  useEffect(() => {
    if (machine) {
      setDenominations(
        denomsList.map((denom: string | number) => ({
          denomination: Number(denom) as Denomination['denomination'],
          quantity: 0,
        }))
      );
      setTouchedDenominations(new Set());
      setNotes('');
      setIsEndOfDay(!!isEndOfDayFixed);
      setMeters({ moneyIn: 0, moneyOut: 0, gross: 0, billIn: '' });
      setExpectedDrop('');

      // Fetch live details
      fetchMachineDetails(machine._id);
    }
  }, [machine?._id, denomsList, isEndOfDayFixed]);

  // ============================================================================
  // Handlers
  // ============================================================================
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
          billIn:
            details.billMeters?.totalBills?.toString() ||
            details.collectionMeters?.billIn?.toString() ||
            '',
        });

        if (details.moneyIn !== undefined) {
          setExpectedDrop(details.moneyIn.toString());
        }
      }
    } catch (error) {
      console.error('Failed to fetch machine details', error);
      toast.error('Could not load latest meter data');
    } finally {
      setIsFetchingDetails(false);
    }
  };

  // ============================================================================
  // Computed
  // ============================================================================
  const totalPhysical = denominations.reduce(
    (sum, d) => sum + d.denomination * d.quantity,
    0
  );

  const variance = totalPhysical - (parseFloat(expectedDrop) || 0);

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 0) return;
    const newDenominations = [...denominations];
    const denomVal = newDenominations[index].denomination;
    newDenominations[index] = { ...newDenominations[index], quantity };
    setDenominations(newDenominations as Denomination[]);
    setTouchedDenominations(prev => {
      const next = new Set(prev);
      next.add(Number(denomVal));
      return next;
    });
  };

  const isAllTouched = denomsList.every(d =>
    touchedDenominations.has(Number(d))
  );
  const isValid = totalPhysical > 0 || isAllTouched;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!machine || !isValid) return;

    const filteredDenominations = denominations.filter(denom => denom.quantity > 0);
    try {
      await onSubmit({
        amount: totalPhysical,
        denominations: filteredDenominations,
        notes: notes.trim() || undefined,
        meters: {
          billIn: parseFloat(meters.billIn) || 0,
          ticketIn: 0,
          totalIn: 0,
        },
        expectedDrop: parseFloat(expectedDrop) || 0,
        variance,
        isEndOfDay,
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

  // ============================================================================
  // Render
  // ============================================================================

  // Guard: no machine selected
  if (!machine) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-10 text-center text-gray-400">
        <Info className="mb-4 h-10 w-10 opacity-20" />
        <p className="text-sm font-medium">
          Select a machine to begin counting.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      {/* Machine Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-gray-900">
              {machine.custom?.name ||
                machine.locationName ||
                `Machine ${machine.assetNumber || machine.serialNumber}`}
            </h2>
            <Badge
              variant="outline"
              className="border-gray-200 bg-white text-gray-500"
            >
              {machine.assetNumber || machine.serialNumber}
            </Badge>
          </div>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">
            {machine.locationName || 'Unknown Location'}
          </p>
        </div>
        {isFetchingDetails && (
          <div className="flex animate-pulse items-center gap-2 text-xs font-bold text-violet-500">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Syncing Meters...
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex-1 space-y-6 overflow-y-auto p-6"
      >
        {/* Meter Verification Section */}
        <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <RefreshCw className="h-3.5 w-3.5" />
            Session Metrics (Today)
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-gray-400">
                Money In
              </Label>
              <div className="flex h-9 items-center overflow-hidden truncate rounded-lg border border-gray-100 bg-gray-50 px-3 font-mono text-xs font-bold text-gray-700">
                {formatAmount(meters.moneyIn)}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-gray-400">
                Money Out
              </Label>
              <div className="flex h-9 items-center overflow-hidden truncate rounded-lg border border-gray-100 bg-gray-50 px-3 font-mono text-xs font-bold text-gray-700">
                {formatAmount(meters.moneyOut)}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-gray-400">
                Gross
              </Label>
              <div
                className={cn(
                  'flex h-9 items-center overflow-hidden truncate rounded-lg border px-3 font-mono text-xs font-bold',
                  meters.gross >= 0
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                    : 'border-red-100 bg-red-50 text-red-700'
                )}
              >
                {formatAmount(meters.gross)}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-50 pt-2">
            <div className="flex items-center gap-2">
              <Label className="min-w-[80px] text-[10px] font-bold uppercase text-blue-500">
                Exp. Drop
              </Label>
              <Input
                type="number"
                className="h-8 w-32 border-blue-200 bg-blue-50/50 font-mono text-sm font-bold text-blue-700"
                value={expectedDrop}
                onChange={e => setExpectedDrop(e.target.value)}
              />
              <span className="text-[10px] italic text-gray-400">
                Adjust if needed
              </span>
            </div>
          </div>
        </div>

        {/* Denomination Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <Coins className="h-3.5 w-3.5" />
              Physical Count
            </h4>
            <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-500">
              Bills Only
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {denominations.map((denom, index) => (
              <div
                key={denom.denomination}
                className={cn(
                  'relative flex items-center justify-between rounded-xl border p-3 transition-all duration-200',
                  denom.quantity > 0
                    ? 'border-violet-200 bg-violet-50/50 shadow-sm ring-1 ring-violet-100'
                    : 'border-gray-100 bg-gray-50/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-black shadow-sm',
                      denom.quantity > 0
                        ? 'border border-violet-100 text-violet-600'
                        : 'border border-transparent text-gray-400'
                    )}
                  >
                    ${denom.denomination}
                  </div>
                </div>

                <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100"
                    onClick={() => updateQuantity(index, denom.quantity - 1)}
                    disabled={denom.quantity === 0}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>

                  <Input
                    type="number"
                    min="0"
                    value={denom.quantity || ''}
                    onChange={e =>
                      updateQuantity(index, parseInt(e.target.value) || 0)
                    }
                    className={cn(
                      'h-7 w-12 border-none bg-transparent p-0 text-center text-sm font-black transition-all focus-visible:ring-0',
                      touchedDenominations.has(Number(denom.denomination)) &&
                        'text-violet-600'
                    )}
                    placeholder="0"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100"
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="relative flex min-h-[120px] flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-lg shadow-violet-500/20">
            <div className="relative z-10">
              <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-violet-100/60">
                Physical Total
              </p>
              <span
                className={cn(
                  'block font-black leading-none tracking-tighter transition-all',
                  getDynamicFontSize(totalPhysical),
                  totalPhysical > 0 ? 'text-white' : 'text-white/20'
                )}
              >
                {formatAmount(totalPhysical)}
              </span>
            </div>
            <Coins className="absolute -bottom-4 -right-4 h-24 w-24 rotate-12 text-white/5" />
          </div>

          <div
            className={cn(
              'relative flex min-h-[120px] flex-col justify-center overflow-hidden rounded-2xl border p-5 transition-all',
              !expectedDrop
                ? 'border-gray-100 bg-gray-50'
                : variance === 0
                  ? 'border-emerald-100 bg-emerald-50'
                  : 'border-amber-200 bg-white shadow-sm'
            )}
          >
            <div className="relative z-10 w-full">
              <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-gray-400">
                Difference (Variance)
              </p>

              <div className="flex flex-col gap-1">
                <span
                  className={cn(
                    'font-black leading-none tracking-tighter transition-all',
                    getDynamicFontSize(variance),
                    !expectedDrop
                      ? 'text-gray-300'
                      : variance === 0
                        ? 'text-emerald-600'
                        : variance > 0
                          ? 'text-emerald-600'
                          : 'text-amber-500'
                  )}
                >
                  {expectedDrop
                    ? (variance > 0 ? '+' : '') + formatAmount(variance)
                    : '--'}
                </span>

                {variance !== 0 && expectedDrop && (
                  <div className="mt-1 flex items-center gap-1.5 duration-300 animate-in fade-in slide-in-from-left-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'h-4 border-0 px-1.5 py-0 text-[10px] font-bold',
                        variance > 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      )}
                    >
                      {Math.abs(
                        (variance / parseFloat(expectedDrop)) * 100
                      ).toFixed(1)}
                      %
                    </Badge>
                    <span className="text-[9px] font-bold uppercase tracking-tight text-gray-400">
                      Variance Percent
                    </span>
                  </div>
                )}
              </div>
            </div>
            {variance !== 0 && expectedDrop && (
              <AlertTriangle className="absolute -bottom-2 -right-2 h-20 w-20 rotate-12 text-amber-500/10" />
            )}
            {variance === 0 && expectedDrop && (
              <CheckCircle2 className="absolute -bottom-2 -right-2 h-20 w-20 rotate-12 text-emerald-500/10" />
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label
            htmlFor="notes"
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Collection Notes (Optional)
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Discrepancies, condition notes, etc..."
            className="min-h-[60px] resize-none rounded-xl border-gray-100 bg-gray-50/50 text-xs transition-all focus:bg-white"
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !machine || !isValid}
          className="mt-6 h-14 w-full rounded-xl bg-violet-600 text-base font-black text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-700 active:scale-[0.98]"
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
