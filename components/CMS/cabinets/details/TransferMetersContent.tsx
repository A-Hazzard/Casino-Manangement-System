/**
 * Transfer Meters Content
 *
 * Admin-only accounting tab to backfill meter.location when a cabinet was moved.
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import { Label } from '@/components/shared/ui/label';
import { ModernCalendar } from '@/components/shared/ui/ModernCalendar';
import { TransferMetersSkeleton } from '@/components/shared/ui/skeletons/CabinetDetailSkeletons';
import { useTransferMeters } from '@/lib/hooks/cabinets/useTransferMeters';
import type { GamingMachine } from '@/shared/types/entities';
import { ArrowRightLeft, CheckCircle2 } from 'lucide-react';

type TransferMetersContentProps = {
  cabinet: GamingMachine;
  onRefresh?: () => void;
};

export default function TransferMetersContent({
  cabinet,
  onRefresh,
}: TransferMetersContentProps) {
  const {
    stats,
    loading,
    error,
    fromDate,
    toDate,
    isRangeInvalid,
    isTransferring,
    progress,
    setFromDateTime,
    setToDateTime,
    transferAll,
  } = useTransferMeters({ cabinetId: cabinet._id });

  const handleTransferAll = async () => {
    await transferAll();
    onRefresh?.();
  };

  if (loading && !stats) {
    return <TransferMetersSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const allTransferred = stats.pending === 0 && stats.total > 0;
  const progressPercent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : 0;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <ArrowRightLeft className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Transfer Meters
            </h3>
            <p className="mt-1 text-sm text-grayHighlight">
              Backfill meter location fields to match this cabinet&apos;s current
              gaming location.
            </p>
          </div>
        </div>

        <div
          className={`mb-6 rounded-lg border p-4 ${
            allTransferred
              ? 'border-green-200 bg-green-50'
              : stats.pending > 0
                ? 'border-amber-200 bg-amber-50'
                : 'border-gray-200 bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-grayHighlight">
                Transfer status
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.transferred} / {stats.total} transferred
              </p>
              {stats.pending > 0 && (
                <p className="mt-1 text-sm text-amber-800">
                  {stats.pending} meter{stats.pending !== 1 ? 's' : ''} not yet
                  at the target location
                </p>
              )}
              {allTransferred && (
                <p className="mt-1 flex items-center gap-1 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  All meters are at the correct location
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Target location (machine gaming location)
          </Label>
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="font-medium text-gray-900">
              {stats.targetLocation.name}
            </p>
            <p className="font-mono text-xs text-grayHighlight">
              {stats.targetLocation.id}
            </p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Transfer meters from
            </Label>
            <p className="text-xs text-grayHighlight">
              Start of the readAt range. Defaults to the current date and time.
            </p>
            {fromDate && (
              <ModernCalendar
                date={{ from: fromDate, to: fromDate }}
                onSelect={(range: { from?: Date; to?: Date } | undefined) => {
                  const date = range?.from;
                  if (date) {
                    setFromDateTime(date);
                  }
                }}
                enableTimeInputs={true}
                mode="single"
                disabled={isTransferring}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Transfer meters to
            </Label>
            <p className="text-xs text-grayHighlight">
              End of the readAt range. Defaults to the current date and time.
            </p>
            {toDate && (
              <ModernCalendar
                date={{ from: toDate, to: toDate }}
                onSelect={(range: { from?: Date; to?: Date } | undefined) => {
                  const date = range?.from;
                  if (date) {
                    setToDateTime(date);
                  }
                }}
                enableTimeInputs={true}
                mode="single"
                disabled={isTransferring}
              />
            )}
          </div>
        </div>

        {isRangeInvalid && (
          <p className="mb-4 text-sm text-red-600">
            Transfer from must be before or equal to transfer to.
          </p>
        )}

        <div className="mb-6 rounded-md border border-border bg-gray-50 px-3 py-2 text-sm">
          <span className="text-grayHighlight">Eligible to transfer: </span>
          <span className="font-semibold text-gray-900">
            {stats.eligibleCount}
          </span>
          <span className="text-grayHighlight">
            {' '}
            meter{stats.eligibleCount !== 1 ? 's' : ''} in the selected datetime
            range
          </span>
        </div>

        {isTransferring && progress && (
          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-xs text-grayHighlight">
              <span>Transferring meters…</span>
              <span>
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-buttonActive transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleTransferAll}
            disabled={
              isTransferring ||
              isRangeInvalid ||
              stats.eligibleCount === 0 ||
              !stats.targetLocation.id
            }
            className="bg-button text-white hover:bg-buttonActive"
          >
            {isTransferring ? 'Transferring…' : 'Transfer All'}
          </Button>
        </div>
      </div>
    </div>
  );
}
