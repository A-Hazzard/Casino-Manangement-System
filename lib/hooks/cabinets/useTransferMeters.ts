/**
 * useTransferMeters Hook
 *
 * Loads transfer meter stats and runs batched location backfill with progress.
 */

import {
  fetchTransferMetersStats,
  transferMetersBatch,
} from '@/lib/helpers/cabinets/transferMeters';
import type { TransferMetersStats } from '@shared/types/meters';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type TransferProgress = {
  current: number;
  total: number;
};

type UseTransferMetersOptions = {
  cabinetId: string;
  enabled?: boolean;
};

export function useTransferMeters({
  cabinetId,
  enabled = true,
}: UseTransferMetersOptions) {
  const [stats, setStats] = useState<TransferMetersStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromDateTime, setFromDateTime] = useState<string>('');
  const [toDateTime, setToDateTime] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  const loadStats = useCallback(
    async (range?: { fromDateTime?: string; toDateTime?: string }) => {
      if (!cabinetId || !enabled) return;

      setLoading(true);
      setError(null);

      try {
        const data = await fetchTransferMetersStats(cabinetId, range);
        setStats(data);

        if (!initializedRef.current) {
          setFromDateTime(range?.fromDateTime ?? data.defaultFromDateTime);
          setToDateTime(range?.toDateTime ?? data.defaultToDateTime);
          initializedRef.current = true;
        }
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load transfer meters stats';

        setError(message);
        console.error('[useTransferMeters] Error:', message);
      } finally {
        setLoading(false);
      }
    },
    [cabinetId, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    initializedRef.current = false;
    void loadStats();
  }, [cabinetId, enabled, loadStats]);

  useEffect(() => {
    if (!enabled || !fromDateTime || !toDateTime || !initializedRef.current) {
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void loadStats({ fromDateTime, toDateTime });
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fromDateTime, toDateTime, enabled, loadStats]);

  const isRangeInvalid =
    Boolean(fromDateTime) &&
    Boolean(toDateTime) &&
    new Date(fromDateTime).getTime() > new Date(toDateTime).getTime();

  const transferAll = useCallback(async () => {
    if (!cabinetId || !fromDateTime || !toDateTime) return;

    if (isRangeInvalid) {
      toast.error('Transfer from must be before or equal to transfer to');
      return;
    }

    setIsTransferring(true);
    const initialTotal = stats?.eligibleCount ?? 0;
    setProgress({ current: 0, total: initialTotal });

    let cursor: string | undefined;
    let transferred = 0;
    const concurrency = stats?.defaultConcurrency;
    const batchSize = stats?.defaultBatchSize;

    try {
      while (true) {
        const batch = await transferMetersBatch(cabinetId, {
          fromDateTime,
          toDateTime,
          cursor,
          concurrency,
          batchSize,
          activityTotal: transferred,
        });

        transferred += batch.updated;
        setProgress({ current: transferred, total: initialTotal });

        if (batch.remaining === 0 || batch.updated === 0) {
          break;
        }

        cursor = batch.nextCursor;
        if (!cursor) {
          break;
        }
      }

      toast.success(`Transferred ${transferred} meter(s) successfully`);
      await loadStats({ fromDateTime, toDateTime });
    } catch (transferError) {
      const message =
        transferError instanceof Error
          ? transferError.message
          : 'Failed to transfer meters';

      toast.error(message);
      console.error('[useTransferMeters] transferAll Error:', message);
    } finally {
      setIsTransferring(false);
      setProgress(null);
    }
  }, [
    cabinetId,
    fromDateTime,
    toDateTime,
    isRangeInvalid,
    loadStats,
    stats?.eligibleCount,
    stats?.defaultConcurrency,
    stats?.defaultBatchSize,
  ]);

  const handleFromDateTimeChange = useCallback((next: Date) => {
    setFromDateTime(next.toISOString());
  }, []);

  const handleToDateTimeChange = useCallback((next: Date) => {
    setToDateTime(next.toISOString());
  }, []);

  return {
    stats,
    loading,
    error,
    fromDateTime,
    toDateTime,
    fromDate: fromDateTime ? new Date(fromDateTime) : undefined,
    toDate: toDateTime ? new Date(toDateTime) : undefined,
    isRangeInvalid,
    isTransferring,
    progress,
    setFromDateTime: handleFromDateTimeChange,
    setToDateTime: handleToDateTimeChange,
    refresh: () =>
      loadStats(
        fromDateTime && toDateTime
          ? { fromDateTime, toDateTime }
          : undefined
      ),
    transferAll,
  };
}
